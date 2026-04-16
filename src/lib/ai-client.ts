/**
 * 通用 AI 客户端 - 支持 OpenAI 兼容 API 的多服务商调用
 * 支持: GLM(智谱), OpenAI, Claude(Anthropic), DeepSeek, MiniMax, Kimi, 自定义
 */

export interface AIConfig {
  provider: 'glm' | 'openai' | 'claude' | 'deepseek' | 'minimax' | 'kimi' | 'custom'
  model: string
  apiKey: string
  baseUrl: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

export interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

export interface ChatCompletionResult {
  content: string
}

// 各服务商默认 base URL
const PROVIDER_BASE_URLS: Record<string, string> = {
  glm: 'https://open.bigmodel.cn/api/paas/v4',
  openai: 'https://api.openai.com/v1',
  claude: 'https://api.anthropic.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  minimax: 'https://api.minimax.chat/v1',
  kimi: 'https://api.moonshot.cn/v1',
}

function getBaseUrl(config: AIConfig): string {
  return config.baseUrl || PROVIDER_BASE_URLS[config.provider as keyof typeof PROVIDER_BASE_URLS] || ''
}

/**
 * 调用 OpenAI 兼容的 chat completions API
 */
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  temperature: number = 0.7
): Promise<ChatCompletionResult> {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
    signal: AbortSignal.timeout(120000), // 2分钟超时
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`API 请求失败 (${response.status}): ${text.slice(0, 300)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('API 返回内容为空')
  }
  return { content }
}

/**
 * 调用 Claude (Anthropic) Messages API
 */
async function callClaudeAPI(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  temperature: number = 0.7
): Promise<ChatCompletionResult> {
  // Claude API 不使用 system 角色的 message，而是使用 system 参数
  const systemMessage = messages.find(m => m.role === 'system')?.content || ''
  const chatMessages = messages.filter(m => m.role !== 'system')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemMessage,
      messages: chatMessages,
      temperature,
    }),
    signal: AbortSignal.timeout(120000),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Claude API 请求失败 (${response.status}): ${text.slice(0, 300)}`)
  }

  const data = await response.json()
  // Claude 返回格式: { content: [{ type: "text", text: "..." }] }
  const content = data.content?.[0]?.text
  if (!content) {
    throw new Error('Claude API 返回内容为空')
  }
  return { content }
}

/**
 * 通用 AI 聊天调用入口
 */
export async function chatCompletion(
  config: AIConfig,
  messages: ChatMessage[],
  temperature: number = 0.7
): Promise<ChatCompletionResult> {
  if (!config.apiKey) {
    throw new Error('请先在设置中配置 API 密钥')
  }
  if (!config.model) {
    throw new Error('请先选择 AI 模型')
  }

  // Claude 使用专用 API
  if (config.provider === 'claude') {
    return callClaudeAPI(config.apiKey, config.model, messages, temperature)
  }

  // 其他服务商都走 OpenAI 兼容接口
  const baseUrl = getBaseUrl(config)
  if (!baseUrl) {
    throw new Error('请配置 API Base URL')
  }

  return callOpenAICompatible(baseUrl, config.apiKey, config.model, messages, temperature)
}

/**
 * 多模态调用 - 支持图片+文本的Vision API
 * 用于巡检照片AI识别
 */
export async function chatCompletionWithImage(
  config: AIConfig,
  textPrompt: string,
  imageBase64: string,
  temperature: number = 0.3
): Promise<ChatCompletionResult> {
  if (!config.apiKey) {
    throw new Error('请先在设置中配置 API 密钥')
  }
  if (!config.model) {
    throw new Error('请先选择 AI 模型')
  }

  const systemPrompt = '你是一位专业的铁路桥梁步行板安全巡检专家。你需要根据巡检照片分析步行板的损坏情况，给出专业的判断。'

  if (config.provider === 'claude') {
    // Claude Vision API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
              },
            },
            { type: 'text', text: textPrompt },
          ],
        }],
        temperature,
      }),
      signal: AbortSignal.timeout(120000),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Claude Vision API 请求失败 (${response.status}): ${text.slice(0, 300)}`)
    }
    const data = await response.json()
    const content = data.content?.find((b: { type: string }) => b.type === 'text')?.text
    if (!content) throw new Error('Claude Vision API 返回内容为空')
    return { content }
  }

  // OpenAI Vision 兼容格式（GLM、OpenAI、DeepSeek、MiniMax、Kimi等）
  const baseUrl = getBaseUrl(config)
  if (!baseUrl) throw new Error('请配置 API Base URL')

  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } },
        { type: 'text', text: textPrompt },
      ],
    },
  ]

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ model: config.model, messages, temperature }),
    signal: AbortSignal.timeout(120000),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Vision API 请求失败 (${response.status}): ${text.slice(0, 300)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Vision API 返回内容为空')
  return { content }
}
