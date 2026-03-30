# 铁路明桥面步行板可视化管理系统

> Railway Open-Deck Bridge Walking Board Visual Management System

一套面向铁路一线工人的步行板安全巡检与隐患标注可视化平台。基于 Next.js 16 + Prisma + SQLite 构建，支持 2D 网格与 3D 桥梁模型展示，集成 AI 辅助分析、Excel 批量导入导出、用户权限管理及操作审计日志。

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6-2d3748?logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss)
![Three.js](https://img.shields.io/badge/Three.js-0.183-black?logo=three.js)

---

## 功能特性

### 核心功能

- **步行板可视化** — 2D 网格视图 + Three.js 3D 桥梁模型，步行板状态用颜色编码（正常=绿色，轻微损坏=黄色，严重损坏=橙色，断裂风险=红色闪烁，已更换=蓝色，缺失=灰色）
- **三级数据模型** — 桥梁 → 桥孔 → 步行板 完整层级结构，支持全量 CRUD 操作
- **巡检记录** — 记录步行板状态、损坏描述、防滑等级、连接状态、天气条件、护栏/托架状况、杂物积水、备注等信息

### 数据管理

- **Excel 导入导出** — 基于模板的多 Sheet 批量导入（桥梁表、桥孔表、步行板表），支持事务保证数据一致性
- **JSON 导入导出** — 完整数据版本化导入导出，支持合并/替换两种模式
- **高级 Excel 导出** — 4 个 Sheet（桥梁总览、桥孔明细、步行板详情、隐患统计），含汇总分析

### AI 集成

- **多模型 AI 助手** — 支持 GLM、OpenAI、Claude、DeepSeek、MiniMax、Kimi 等多家大模型
- **安全分析报告** — AI 自动生成桥梁级别的安全评估报告
- **对话式操作** — 通过自然语言对话修改步行板状态

### 系统管理

- **用户认证与权限** — 4 级角色（管理员、管理者、普通用户、只读用户），基于 Session 的认证体系，前后端双重权限校验
- **操作审计日志** — 全量记录用户操作，支持分页查询和筛选
- **统计面板** — 按桥梁和全局维度展示损坏率、高风险预警、桥孔级分析

### 权限体系

系统实现了完整的前后端 RBAC（基于角色的访问控制）：

| 角色 | 标识 | 权限范围 |
|------|------|----------|
| 管理员 | `admin` | 全部权限（含用户管理） |
| 管理者 | `manager` | 桥梁/桥孔/步行板读写、日志查看、数据导入导出、AI 使用 |
| 普通用户 | `user` | 仅查看（桥梁/桥孔/步行板只读） |
| 只读用户 | `viewer` | 仅查看 |

**权限粒度：** 采用 `resource:action` 格式，包括 `bridge:read/write/delete`、`span:read/write`、`board:read/write`、`log:read`、`data:import/export`、`ai:use` 等。所有 API 路由均通过 `requireAuth()` 统一校验，前端按钮按权限条件渲染。

### 其他特性

- **3D 桥梁模型** — Three.js 程序化生成桥梁，支持 PBR 材质、多种渲染模式、可调参数
- **离线支持** — IndexedDB 本地存储，网络恢复后自动同步
- **移动端适配** — 触控优化、双指缩放、底部导航栏、横竖屏自适应
- **深色/浅色主题** — 科幻风格深色主题 + 日间主题切换

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | ^16.1.1 |
| 前端 | React | ^19.0.0 |
| 语言 | TypeScript | ^5 |
| 样式 | Tailwind CSS v4 + tw-animate-css | ^4 |
| UI 组件库 | shadcn/ui (New York 风格, 50+ 组件) | — |
| 数据库 | SQLite (via Prisma ORM) | ^6.11.1 |
| 3D 引擎 | Three.js | ^0.183.2 |
| 状态管理 | Zustand (3D 配置), React useState | ^5.0.6 |
| 数据请求 | @tanstack/react-query | ^5.82.0 |
| 数据表格 | @tanstack/react-table | ^8.21.3 |
| 表单 | react-hook-form + zod | — |
| 拖拽 | @dnd-kit/core + @dnd-kit/sortable | ^6.3.1 |
| 图表 | Recharts | ^2.15.4 |
| Excel | xlsx (SheetJS) | ^0.18.5 |
| 动画 | Framer Motion | ^12.23.2 |
| 通知 | Sonner | ^2.0.6 |
| 图标 | Lucide React | ^0.525.0 |
| 主题切换 | next-themes | ^0.4.6 |
| 日期处理 | date-fns | ^4.1.0 |
| Markdown | react-markdown + react-syntax-highlighter | — |
| 图片处理 | sharp | ^0.34.3 |
| 工具库 | @reactuses/core, uuid | — |

---

## 项目结构

```
bridge-board-system/
├── prisma/
│   ├── schema.prisma              # 数据库 Schema (SQLite)
│   └── db/
│       └── sessions.json          # 文件式会话存储
├── public/
│   ├── favicon.png                # 网站图标
│   ├── logo.jpg                   # Logo
│   ├── logo.svg                   # SVG Logo
│   └── robots.txt                 # 搜索引擎爬虫规则
├── src/
│   ├── app/
│   │   ├── globals.css            # 全局样式 (科幻主题)
│   │   ├── layout.tsx             # 根布局
│   │   ├── page.tsx               # 主应用页面 (桥梁可视化系统)
│   │   ├── login/page.tsx         # 登录页
│   │   ├── bridge-3d/page.tsx     # 独立 3D 桥梁查看器
│   │   ├── users/page.tsx         # 用户管理页
│   │   └── api/
│   │       ├── route.ts           # 健康检查
│   │       ├── bridges/route.ts   # 桥梁 CRUD
│   │       ├── spans/route.ts     # 桥孔 CRUD + 重排序
│   │       ├── boards/route.ts    # 步行板 CRUD + 批量操作
│   │       ├── users/route.ts     # 用户 CRUD + RBAC
│   │       ├── logs/route.ts      # 操作日志 (分页+筛选)
│   │       ├── stats/route.ts     # 单桥统计
│   │       ├── summary/route.ts   # 全桥汇总统计
│   │       ├── export/route.ts    # JSON 数据导出
│   │       ├── data/
│   │       │   ├── route.ts       # JSON 导入/导出 (合并/替换)
│   │       │   ├── excel/route.ts # Excel 导入/导出
│   │       │   └── template/route.ts # Excel 模板下载
│   │       ├── excel/export/route.ts  # 高级 Excel 导出
│   │       ├── ai/
│   │       │   ├── analyze/route.ts   # AI 安全分析
│   │       │   ├── chat/route.ts      # AI 对话
│   │       │   └── models/route.ts    # AI 模型列表
│   │       └── auth/
│   │           ├── login/route.ts # 登录
│   │           ├── logout/route.ts# 登出
│   │           └── me/route.ts    # 当前用户信息
│   ├── components/
│   │   ├── Providers.tsx           # 根 Provider
│   │   ├── auth/
│   │   │   └── AuthProvider.tsx   # 认证上下文 + 顶栏用户信息
│   │   ├── user/
│   │   │   ├── UserManagementDialog.tsx  # 用户管理对话框
│   │   │   └── OperationLogDialog.tsx    # 操作日志对话框
│   │   ├── 3d/
│   │   │   ├── Bridge3DProcedural.tsx    # Three.js 程序化桥梁
│   │   │   ├── Bridge3DViewer.tsx        # 3D 查看器
│   │   │   └── HomeBridge3D.tsx          # 首页 3D 桥梁
│   │   └── ui/                    # 50+ shadcn/ui 组件
│   ├── hooks/
│   │   ├── use-offline.ts         # 离线模式 (IndexedDB)
│   │   ├── use-mobile.ts          # 移动端检测
│   │   └── use-toast.ts           # Toast 通知
│   └── lib/
│       ├── db.ts                  # Prisma 单例客户端
│       ├── utils.ts               # 工具函数
│       ├── auth/
│       │   ├── index.ts           # 认证工具 (PBKDF2 哈希, RBAC, 会话)
│       │   └── context.tsx        # 认证上下文 + useAuth + usePermission
│       ├── session-store.ts       # 文件式会话管理
│       ├── offline-db.ts          # IndexedDB 离线数据库
│       ├── sync-service.ts        # 离线→在线同步服务
│       ├── bridge3d-store.ts      # Zustand 3D 配置
│       └── ai-client.ts           # AI 客户端 (多模型适配)
├── .env                           # 环境变量
├── .env.example                   # 环境变量示例
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs             # PostCSS 配置
└── components.json                # shadcn/ui 配置
```

---

## 数据库模型

### Bridge（桥梁）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| name | String | 桥梁名称 |
| bridgeCode | String (unique) | 桥梁编号 |
| location | String? | 桥梁位置 |
| totalSpans | Int | 总孔数 |
| lineName | String? | 线路名称 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### BridgeSpan（桥孔）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| bridgeId | String (FK) | 所属桥梁 |
| spanNumber | Int | 孔号 |
| spanLength | Float | 孔长度(米) |
| upstreamBoards | Int | 上行步行板数量 |
| downstreamBoards | Int | 下行步行板数量 |
| upstreamColumns | Int | 上行步行板列数 (默认 1) |
| downstreamColumns | Int | 下行步行板列数 (默认 1) |
| shelterSide | String | 避车台位置 (none/single/double) |
| shelterBoards | Int | 避车台步行板数量/每侧 (默认 0) |
| shelterMaxPeople | Int | 避车台建议最大站立人数 (默认 4) |
| boardMaterial | String | 材质类型 (默认 galvanized_steel) |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### WalkingBoard（步行板）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| spanId | String (FK) | 所属桥孔 |
| boardNumber | Int | 编号 |
| position | String | 位置 (upstream/downstream/shelter_left/shelter_right) |
| columnIndex | Int | 列号 (默认 1) |
| status | String | 状态 (normal/minor_damage/severe_damage/fracture_risk/replaced/missing) |
| damageDesc | String? | 损坏描述 |
| inspectedBy | String? | 检查人 |
| inspectedAt | DateTime? | 检查时间 |
| photoUrl | String? | 照片 URL |
| antiSlipLevel | Int? | 防滑等级 (0-100，默认 100) |
| antiSlipLastCheck | DateTime? | 上次防滑检查时间 |
| connectionStatus | String? | 连接状态 (normal/loose/gap_large) |
| weatherCondition | String? | 天气 (normal/rain/snow/fog/ice) |
| visibility | Int? | 能见度 (0-100，默认 100) |
| railingStatus | String? | 护栏状态 (normal/loose/damaged/missing) |
| bracketStatus | String? | 托架状态 (normal/loose/damaged/corrosion/missing) |
| hasObstacle | Boolean | 是否有杂物 (默认 false) |
| obstacleDesc | String? | 杂物描述 |
| hasWaterAccum | Boolean | 是否有积水 (默认 false) |
| waterAccumDepth | Float? | 积水深度(cm) |
| remarks | String? | 备注信息 |
| boardLength | Float? | 步行板长度(cm) |
| boardWidth | Float? | 步行板宽度(cm) |
| boardThickness | Float? | 步行板厚度(cm) |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### User（用户）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| username | String (unique) | 登录用户名 |
| password | String | 密码哈希 (PBKDF2) |
| name | String? | 真实姓名 |
| email | String? (unique) | 邮箱 |
| phone | String? | 电话 |
| department | String? | 部门 |
| role | String | 角色 (admin/manager/user/viewer) |
| status | String | 状态 (active/inactive/locked) |
| lastLoginAt | DateTime? | 最后登录时间 |
| lastLoginIp | String? | 最后登录 IP |
| loginCount | Int | 登录次数 (默认 0) |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### OperationLog（操作日志）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| userId | String? (FK) | 操作用户 ID（null 表示系统操作） |
| username | String? | 操作用户名 |
| action | String | 操作类型 (create/update/delete/import/export/login/logout) |
| module | String | 模块 (bridge/span/board/user/system) |
| targetId | String? | 操作对象 ID |
| targetName | String? | 操作对象名称 |
| description | String | 操作描述 |
| oldValue | String? | 修改前值 (JSON) |
| newValue | String? | 修改后值 (JSON) |
| ip | String? | 操作 IP |
| userAgent | String? | 用户代理 |
| status | String | 操作状态 (success/failed，默认 success) |
| errorMsg | String? | 错误信息 |
| createdAt | DateTime | 创建时间 |

---

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装与运行

```bash
# 1. 克隆项目
git clone https://github.com/thunderfox-6/My-project.git
cd My-project/download/bridge-board-system

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库路径

# 4. 初始化数据库
npx prisma db push
npx prisma generate

# 5. 启动开发服务器
npm run dev

# 6. 打开浏览器访问
# http://localhost:3000
```

### 默认管理员账号

| 用户名 | 密码 |
|--------|------|
| admin | admin123 |

> 首次登录时自动创建管理员账号。

---

## API 接口

### 桥梁管理

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/bridges` | 获取所有桥梁列表 | `bridge:read` |
| POST | `/api/bridges` | 创建桥梁（支持复制模式） | `bridge:write` |
| PUT | `/api/bridges` | 更新桥梁基本信息 | `bridge:write` |
| DELETE | `/api/bridges?id=` | 删除桥梁（级联删除） | `bridge:delete` |

### 桥孔管理

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| PUT | `/api/spans` | 更新桥孔配置（可选重新生成步行板） | `span:write` |
| POST | `/api/spans` | 添加新桥孔（自动重编号） | `span:write` |
| DELETE | `/api/spans?id=` | 删除桥孔（自动重编号） | `span:write` |

### 步行板管理

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/boards?spanId=&bridgeId=` | 查询步行板 | `board:read` |
| PUT | `/api/boards` | 更新单块步行板 | `board:write` |
| POST | `/api/boards` | 批量更新步行板 | `board:write` |

### 用户管理

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/users` | 获取用户列表 | admin |
| POST | `/api/users` | 创建用户 | admin |
| PUT | `/api/users` | 更新用户 | admin |
| DELETE | `/api/users?id=` | 删除用户 | admin |

### 数据导入导出

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/data/excel` | Excel 导出 | `data:export` |
| POST | `/api/data/excel` | Excel 导入（3 Sheet + 事务） | `data:import` |
| GET | `/api/data/template` | 下载 Excel 导入模板 | `data:export` |
| GET | `/api/excel/export?bridgeId=` | 高级 Excel 导出（4 Sheet + 汇总） | `data:export` |
| GET | `/api/data` | JSON 导出 | `data:export` |
| POST | `/api/data` | JSON 导入（合并/替换） | `data:import` |

### 统计与日志

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/stats?bridgeId=` | 单桥统计 | `bridge:read` |
| GET | `/api/summary` | 全桥汇总 | `bridge:read` |
| GET | `/api/logs?page=&action=&module=` | 操作日志（分页） | `log:read` |

### AI 辅助

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/ai/analyze` | AI 桥梁安全分析 | `ai:use` |
| POST | `/api/ai/chat` | AI 对话（自然语言操作） | `ai:use` |
| POST | `/api/ai/models` | 获取可用 AI 模型列表 | `ai:use` |

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 当前用户信息 |

---

## 部署

### 本地部署（PM2）

```bash
# 构建项目
npm run build

# 使用 PM2 启动
pm2 start npm --name "bridge-board" -- start

# 查看状态
pm2 status
pm2 logs bridge-board
```

### 生产部署建议

1. 设置 `NODE_ENV=production`
2. 配置反向代理（Nginx / Caddy）
3. SQLite 数据库定期备份
4. 通过环境变量配置数据库路径

---

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (端口 3000) |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | ESLint 代码检查 |
| `npm run db:push` | 推送 Schema 到数据库 |
| `npm run db:generate` | 生成 Prisma Client |
| `npm run db:migrate` | 运行数据库迁移 |
| `npm run db:reset` | 重置数据库 |

---

## 步行板状态说明

| 状态 | 颜色 | 说明 |
|------|------|------|
| normal | 🟢 绿色 | 正常 |
| minor_damage | 🟡 黄色 | 轻微损坏 |
| severe_damage | 🟠 橙色 | 严重损坏 |
| fracture_risk | 🔴 红色闪烁 | 断裂风险 |
| replaced | 🔵 蓝色 | 已更换 |
| missing | ⚪ 灰色 | 缺失 |

---

## 许可证

Private — All rights reserved.
