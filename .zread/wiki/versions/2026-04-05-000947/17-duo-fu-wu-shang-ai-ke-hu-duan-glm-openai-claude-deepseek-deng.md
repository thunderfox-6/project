本系统内置了一套**多服务商 AI 客户端抽象层**，以统一接口对接智谱 GLM、OpenAI、Claude（Anthropic）、DeepSeek、MiniMax、Kimi（月之暗面）六家主流 AI 服务商以及任意自定义 OpenAI 兼容端点。核心设计原则是"**一个入口、两条路径**"——除 Claude 因 API 协议差异需要专用适配器外，其余服务商全部走 OpenAI 兼容的 `/chat/completions` 标准接口，实现最大程度的代码复用和最小接入成本。本文档聚焦于客户端的**架构设计、服务商适配策略、类型契约与配置持久化**机制。

Sources: [ai-client.ts](src/lib/ai-client.ts#L1-L147), [bridge.ts](src/types/bridge.ts#L118-L128)

## 架构总览：策略路由 + 适配器分离

整个 AI 客户端分为四个层次：**类型定义层**（`AIConfig` / `ChatMessage` 接口）、**服务适配层**（`callOpenAICompatible` / `callClaudeAPI` 两个底层函数）、**路由分发层**（`chatCompletion` 统一入口函数根据 `provider` 字段分发）、以及**服务端 API 路由层**（三个 Next.js Route Handler 分别负责对话、分析、模型发现）。前端通过 `useAIAssistant` Hook 管理全部状态和交互逻辑，配置通过 `localStorage` 持久化，无需后端存储。

```mermaid
graph TD
    subgraph "前端层"
        A[AIConfigDialog<br/>服务商/模型/密钥配置] --> B[useAIAssistant Hook<br/>状态管理 + localStorage 持久化]
        B -->|authFetch| C1[/api/ai/chat]
        B -->|authFetch| C2[/api/ai/analyze]
        B -->|authFetch| C3[/api/ai/models]
    end

    subgraph "服务端路由层 (requireAuth: ai:use)"
        C1 --> D[chatCompletion<br/>统一入口]
        C2 --> D
        C3 --> E[模型列表发现<br/>各厂商 /models 端点]
    end

    subgraph "适配器层 (ai-client.ts)"
        D -->|provider=claude| F[callClaudeAPI<br/>Anthropic Messages API]
        D -->|其他所有服务商| G[callOpenAICompatible<br/>OpenAI /chat/completions]
    end

    subgraph "外部 AI 服务商"
        F --> H[api.anthropic.com]
        G --> I[open.bigmodel.cn<br/>api.openai.com<br/>api.deepseek.com<br/>api.minimax.chat<br/>api.moonshot.cn<br/>自定义端点]
    end

    style F fill:#e67e22,color:#fff
    style G fill:#27ae60,color:#fff
    style D fill:#3498db,color:#fff
```

上图展示了从用户配置到外部 API 调用的完整数据流。关键的分叉点在 `chatCompletion` 函数：当 `provider === 'claude'` 时走左侧专用路径，其余走右侧 OpenAI 兼容路径。

Sources: [ai-client.ts](src/lib/ai-client.ts#L122-L146), [useAIAssistant.ts](src/hooks/useAIAssistant.ts#L46-L66), [AIConfigDialog.tsx](src/components/bridge/AIConfigDialog.tsx#L34-L78)

## 类型契约：AIConfig 与消息格式

类型定义同时在两个位置声明：`ai-client.ts` 中的运行时接口和 `types/bridge.ts` 中的前端共享类型。两者保持结构一致，前端通过 `types/bridge.ts` 导入以实现跨组件类型安全。

```typescript
// 服务商枚举 — 7 种选择
export interface AIConfig {
  provider: 'glm' | 'openai' | 'claude' | 'deepseek' | 'minimax' | 'kimi' | 'custom'
  model: string      // 模型标识，如 'glm-4', 'gpt-4o', 'claude-3-sonnet'
  apiKey: string      // API 密钥，用户自行填入
  baseUrl: string     // 可选自定义端点，为空时使用内置默认值
}

// 消息格式 — system / user / assistant 三角色
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}
```

Sources: [ai-client.ts](src/lib/ai-client.ts#L6-L21), [bridge.ts](src/types/bridge.ts#L118-L128)

## 服务商适配策略详解

系统对七种服务商采用**两种适配器**加一个**URL 映射表**的策略。下表列出了每种服务商的完整适配参数：

| 服务商 | `provider` 值 | 默认 Base URL | 适配路径 | 默认模型 | 认证方式 |
|--------|-------------|-------------|---------|---------|---------|
| 智谱 AI (GLM) | `glm` | `https://open.bigmodel.cn/api/paas/v4` | OpenAI 兼容 | `glm-4` | `Bearer {key}` |
| OpenAI | `openai` | `https://api.openai.com/v1` | OpenAI 兼容 | `gpt-4o` | `Bearer {key}` |
| Claude (Anthropic) | `claude` | `https://api.anthropic.com/v1` | **专用适配器** | `claude-3-sonnet` | `x-api-key` + `anthropic-version` |
| DeepSeek | `deepseek` | `https://api.deepseek.com/v1` | OpenAI 兼容 | `deepseek-chat` | `Bearer {key}` |
| MiniMax (海螺AI) | `minimax` | `https://api.minimax.chat/v1` | OpenAI 兼容 | `abab6.5-chat` | `Bearer {key}` |
| Kimi (月之暗面) | `kimi` | `https://api.moonshot.cn/v1` | OpenAI 兼容 | `moonshot-v1-8k` | `Bearer {key}` |
| 自定义 | `custom` | 用户自行填写 | OpenAI 兼容 | 用户自行填写 | `Bearer {key}` |

Sources: [ai-client.ts](src/lib/ai-client.ts#L23-L34), [AIConfigDialog.tsx](src/components/bridge/AIConfigDialog.tsx#L52-L63)

### OpenAI 兼容路径

`callOpenAICompatible` 函数是覆盖六种服务商的通用调用器。它构造标准的 `/chat/completions` 请求，使用 `Authorization: Bearer {apiKey}` 认证头，解析 `response.choices[0].message.content` 作为回复内容。超时设置为 **120 秒**（`AbortSignal.timeout(120000)`），以应对大模型的慢速生成场景。URL 拼接时通过 `replace(/\/$/, '')` 去除尾部斜杠，确保路径不会出现双斜杠。

Sources: [ai-client.ts](src/lib/ai-client.ts#L39-L73)

### Claude 专用适配器

Claude（Anthropic）是唯一不走 OpenAI 兼容路径的服务商，原因在于其 **Messages API** 在三个维度上与 OpenAI 标准不兼容：

1. **认证方式**：使用 `x-api-key` 请求头而非 `Authorization: Bearer`
2. **系统提示传递**：通过独立的 `system` 参数传递，而非在 messages 数组中使用 `role: 'system'`
3. **响应格式**：返回 `content: [{ type: "text", text: "..." }]` 的数组结构，而非 `choices: [{ message: { content: "..." } }]`

适配器内部先将 `messages` 数组中 `role === 'system'` 的消息提取到 `system` 参数中，过滤后的消息作为对话历史传入。同时固定设置 `max_tokens: 4096`，因为 Claude API 要求此参数为必填。

Sources: [ai-client.ts](src/lib/ai-client.ts#L78-L117)

### 统一入口 chatCompletion

`chatCompletion` 是整个客户端的唯一对外出口。它执行两步前置校验（apiKey 和 model 非空检查），然后根据 `provider === 'claude'` 做路由分发。这种**条件分支而非策略模式**的实现选择是有意为之——当前仅有一个异常路径（Claude），引入策略模式会增加不必要的抽象复杂度。若未来异常路径增多（如 Google Gemini），可重构为策略注册表。

Sources: [ai-client.ts](src/lib/ai-client.ts#L122-L146)

## 三个服务端 API 路由

所有 AI 请求都经过服务端 Route Handler 中转，而非前端直接调用外部 API。这一设计带来三个好处：**避免 API 密钥在前端网络请求中暴露**（密钥从前端传入服务端，由服务端发起对 AI 服务商的调用）、**统一鉴权拦截**（所有路由均使用 `requireAuth(request, 'ai:use')`）、以及**服务端注入桥梁上下文**（对话和分析都需要从数据库加载完整的桥梁/桥孔/步行板数据作为 AI 提示词的一部分）。

### /api/ai/chat — 对话路由

对话路由是系统的核心交互入口。它接收用户消息、对话历史（最近 10 条）和 AI 配置，执行以下流程：

1. **鉴权校验**：验证用户具有 `ai:use` 权限
2. **上下文构建**：若指定了 `bridgeId`，从数据库加载桥梁及其所有桥孔和步行板的完整数据；若同时指定了 `currentSpanId`，额外构建当前孔的步行板状态详情（截取前 20 块板的摘要信息）
3. **系统提示注入**：将桥梁元信息、步行板状态枚举说明、当前孔详情、以及**操作指令格式规范**（JSON 格式的 update action）组装为 system prompt
4. **AI 调用**：通过 `chatCompletion` 统一入口调用选定服务商
5. **操作指令解析**：用正则 `/\`\`\`json\s*(\{[\s\S]*?"action"[\s\S]*?\})\s*\`\`\`` 从 AI 回复中提取可能的步行板状态修改指令，解析后在桥梁数据中定位目标步行板的 `id`
6. **回复清洗**：将回复中的 JSON 代码块去除后返回给前端，保持对话体验的整洁

Sources: [chat/route.ts](src/app/api/ai/chat/route.ts#L1-L165)

### /api/ai/analyze — 分析路由

分析路由执行**结构化的桥梁安全评估**。与对话路由不同，它不需要对话历史，而是收集全桥统计数据（各状态数量、百分比、各孔风险/损坏汇总），将完整的桥梁信息格式化为分析提示词，要求 AI 以"安全等级评估 → 主要风险点 → 各孔建议 → 优先整改 → 作业注意事项"的五段式结构生成 Markdown 格式的安全分析报告。

Sources: [analyze/route.ts](src/app/api/ai/analyze/route.ts#L1-L181)

### /api/ai/models — 模型发现路由

模型发现路由通过调用各服务商的 `/models` 端点，**动态获取可用模型列表**。由于各厂商返回格式存在差异，该路由实现了三层容错解析：优先尝试 `data.data` 数组（OpenAI 标准格式），回退到 `data.models` 数组，最后兜底尝试从响应对象的任意数组字段中提取模型标识。对 Claude 服务商使用 `x-api-key` 认证头，其余使用 `Bearer` 方式。超时设置为 **15 秒**。

Sources: [models/route.ts](src/app/api/ai/models/route.ts#L1-L96)

## 前端状态管理：useAIAssistant Hook

`useAIAssistant` 是一个高度聚合的自定义 Hook，封装了 AI 功能的全部前端状态和交互逻辑。它管理七个核心状态：对话消息列表（`aiMessages`）、输入框内容（`aiInput`）、对话加载状态（`aiLoading`）、分析进行中状态（`aiAnalyzing`）、分析结果（`aiAnalysis`）、右侧面板标签页（`rightPanelTab`）、以及完整的 AI 配置对象（`aiConfig`）。

### 配置持久化机制

AI 配置通过 `localStorage` 以 `ai-config` 为 key 进行持久化。组件挂载时从 `localStorage` 读取并恢复配置（`useEffect` 在首次渲染时执行），用户保存配置时同步写入 `localStorage` 并通过 `toast` 反馈。这种设计意味着 **API 密钥存储在浏览器本地**，不会上传到服务端数据库，密钥仅在每次 AI 请求时由前端传入服务端作为中转。

Sources: [useAIAssistant.ts](src/hooks/useAIAssistant.ts#L57-L92)

### 模型列表获取流程

当用户在配置弹窗中点击"获取可用模型"时，`fetchModels` 函数将当前的 `provider`、`apiKey`、`baseUrl` 发送到 `/api/ai/models` 路由。获取成功后，如果当前选中的模型不在新列表中，自动切换到列表中的第一个模型。获取到的模型列表会替换预设的静态模型选项，为用户提供其 API 密钥下真实可用的模型。

Sources: [useAIAssistant.ts](src/hooks/useAIAssistant.ts#L95-L131)

### 对话发送与操作执行

`handleAISend` 函数在发送对话时携带四个参数：用户消息、当前桥梁 ID（可选）、当前桥孔 ID（可选）、最近 10 条对话历史（将 `role === 'user'` 以外的角色统一映射为 `assistant`）、以及完整的 AI 配置。当 AI 回复中包含 `updateAction`（步行板状态修改指令）时，Hook 会自动调用 `PUT /api/boards` API 执行实际的数据库更新操作，以 `'AI助手'` 作为操作人，并以 `AI标注: {status}` 作为损坏描述，更新成功后调用 `refreshBridgeData()` 刷新界面数据。

Sources: [useAIAssistant.ts](src/hooks/useAIAssistant.ts#L176-L241)

## UI 配置组件：AIConfigDialog

`AIConfigDialog` 组件提供了服务商选择、模型选择、API 密钥输入、自定义 Base URL 输入的四步配置界面。它在服务商切换时**自动填充推荐默认模型**（如选择 GLM 时自动设置为 `glm-4`，选择 OpenAI 时自动设置为 `gpt-4o`）。模型选择区域具有**双模式**：当用户尚未获取在线模型列表时，显示各服务商的预设静态模型选项；获取成功后切换为动态模型列表。Base URL 输入框仅在 DeepSeek、MiniMax、Kimi 和自定义模式下显示，GLM 和 OpenAI 因内置了确定的端点地址而隐藏此选项。

Sources: [AIConfigDialog.tsx](src/components/bridge/AIConfigDialog.tsx#L1-L224)

## 权限控制

所有三个 AI 路由均在处理逻辑前调用 `requireAuth(request, 'ai:use')`。在 RBAC 权限体系中，`ai:use` 权限仅分配给 **admin**（通过通配符 `*` 隐式拥有）和 **manager** 角色。普通用户（`user`）和只读用户（`viewer`）无权使用 AI 功能，调用时将收到 `403 Forbidden` 响应。

Sources: [auth/index.ts](src/lib/auth/index.ts#L27-L48), [chat/route.ts](src/app/api/ai/chat/route.ts#L7-L8)

## 错误处理与容错设计

整个 AI 客户端采用**多层错误防御**策略：

| 层次 | 机制 | 代码位置 |
|------|------|---------|
| 参数校验 | `apiKey` / `model` 非空前置检查 | `chatCompletion` 函数入口 |
| 网络层 | `AbortSignal.timeout()` — 对话/分析 120s，模型获取 15s | `fetch` 调用参数 |
| HTTP 层 | `response.ok` 检查，截取前 300 字符错误文本 | API 响应处理 |
| 数据层 | `choices[0].message.content` / `content[0].text` 空值检查 | 响应解析 |
| 服务端 | `try/catch` 包裹全流程，统一 JSON 错误响应 | Route Handler |
| 前端 | `toast.error()` 用户反馈 + `console.error` 开发日志 | Hook 调用层 |

Sources: [ai-client.ts](src/lib/ai-client.ts#L59-L72), [chat/route.ts](src/app/api/ai/chat/route.ts#L160-L165), [useAIAssistant.ts](src/hooks/useAIAssistant.ts#L165-L172)

## 设计决策与扩展性

**为什么不直接在前端调用 AI API？** 因为服务端中转模式允许在请求中注入桥梁上下文数据（包含完整的步行板状态、桥孔信息等），这些数据需要从数据库查询获取，前端无法直接完成。同时，服务端中转也避免了浏览器 CORS 策略对跨域 API 调用的限制。

**如何新增一个服务商？** 仅需三步：(1) 在 `AIConfig.provider` 联合类型中添加新值；(2) 在 `PROVIDER_BASE_URLS` 映射表中添加默认 URL；(3) 在 `AIConfigDialog` 的静态模型列表中添加对应选项。如果新服务商完全兼容 OpenAI `/chat/completions` 接口，无需编写任何适配器代码。若其 API 协议不同，则需要参照 `callClaudeAPI` 模式新增专用适配器并在 `chatCompletion` 中添加路由分支。

Sources: [ai-client.ts](src/lib/ai-client.ts#L7-L11), [ai-client.ts](src/lib/ai-client.ts#L23-L30)

---

**延伸阅读**：了解 AI 助手如何利用上述客户端进行对话交互和桥梁安全分析，请参阅 [AI 助手对话与桥梁安全分析](18-ai-zhu-shou-dui-hua-yu-qiao-liang-an-quan-fen-xi)。了解 AI 路由的统一鉴权中间件机制，请参阅 [requireAuth 统一鉴权中间件](13-requireauth-tong-jian-quan-zhong-jian-jian)。了解 RBAC 权限体系的完整设计，请参阅 [RBAC 四级角色权限控制体系](10-rbac-si-ji-jiao-se-quan-xian-kong-zhi-ti-xi)。