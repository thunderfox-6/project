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
- **步行板照片** — 支持为每块步行板上传多张巡检照片，移动端支持相机直拍

### 数据管理

- **Excel 导入导出** — 基于模板的多 Sheet 批量导入（桥梁表、桥孔表、步行板表），全流程事务保证数据一致性（5 分钟超时）
- **JSON 导入导出** — 完整数据版本化导入导出，支持合并/替换两种模式，全流程事务保护
- **高级 Excel 导出** — 4 个 Sheet（桥梁总览、桥孔明细、步行板详情、隐患统计），含汇总分析
- **PDF 报告导出** — 将 AI 生成的安全分析报告导出为 PDF 文件，支持自动分页和标题页

### AI 集成

- **多模型 AI 助手** — 支持 GLM、OpenAI、Claude、DeepSeek、MiniMax、Kimi 等多家大模型
- **安全分析报告** — AI 自动生成桥梁级别的安全评估报告
- **对话式操作** — 通过自然语言对话修改步行板状态

### 数据分析与可视化

- **数据总览仪表盘** (`/dashboard`) — 全局视角展示所有桥梁健康度排名、损坏分布饼图、高风险告警列表、状态统计面板
- **趋势分析图表** — 按月展示损坏率走势（面积图）和步行板状态分布变化（堆叠柱状图），支持真实历史数据 + 简单线性回归预测
- **桥梁地图** (`/map`) — SVG 风格化地图可视化桥梁位置分布，颜色编码健康状态，点击查看详情

### 预警系统

- **规则引擎** — 9 条内置预警规则（桥梁损坏率>30%/15%、断裂风险/缺失/严重损坏步行板、防滑不足、栏杆异常、托架锈蚀），支持自定义规则和启用/禁用
- **自动评估** — 步行板状态更新时自动触发规则评估，支持桥梁级/孔位级/步行板级三级作用域，自动去重和自动解决
- **历史快照** — 每次更新前保存步行板完整状态快照，支持按月/周/日聚合查询，为趋势分析提供真实数据
- **告警面板** — 主页面右侧边栏「预警中心」和仪表盘均集成告警面板，支持严重等级筛选、告警解决/忽略
- **模板变量** — 告警消息支持 `{bridgeName}`、`{damageRate}`、`{spanNumber}`、`{boardNumber}` 等动态变量

### 站内消息通知

- **自动通知** — 预警触发时自动为所有管理员和管理者创建站内通知
- **通知铃铛** — 主页面和仪表盘 header 右侧铃铛图标实时显示未读通知数量（30 秒轮询）
- **通知管理** — 点击铃铛展开通知面板，查看未读通知详情（标题 + 内容 + 时间 + 严重等级图标），点击单条标记已读，支持全部标记已读
- **通知 API** — 独立的 REST API 支持查询通知列表、标记已读、全部已读

### 巡检任务管理

- **任务创建** — 为桥梁创建定期巡检任务，指定负责人、截止日期、优先级
- **任务流程** — 待处理 → 进行中 → 已完成 完整状态流转
- **逾期提醒** — 自动标红逾期任务，优先级标记（低/普通/高/紧急）
- **任务看板** (`/inspection`) — 按状态筛选、统计任务进度

### 系统管理

- **用户认证与权限** — 4 级角色（管理员、管理者、普通用户、只读用户），基于 Session 的认证体系，前后端双重权限校验
- **登录安全** — 连续 5 次密码错误自动锁定账户 15 分钟，实时显示剩余尝试次数和倒计时
- **修改密码** — 支持用户自助修改密码，含密码强度指示器（弱/中/强）
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
- **移动端手势引导** — 首次移动端访问时展示操作教程（缩放、滑动、点击）
- **移动端个人中心** — 底部导航"我的"页面，集成修改密码、数据总览、用户管理入口
- **深色/浅色主题** — 科幻风格深色主题 + 日间主题切换
- **空状态引导** — 无数据时展示友好的引导界面，引导用户创建第一座桥梁
- **可关闭安全提示** — 顶部安全提示栏可手动关闭，替代原跑马灯动画，符合无障碍标准

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
| 虚拟滚动 | @tanstack/react-virtual | ^3 |
| 表单 | react-hook-form + zod | — |
| 图表 | Recharts | ^2.15.4 |
| Excel | xlsx (SheetJS) | ^0.18.5 |
| 动画 | Framer Motion | ^12.23.2 |
| PDF 导出 | jspdf + html2canvas | — |
| 通知 | Sonner | ^2.0.6 |
| 图标 | Lucide React | ^0.525.0 |
| 主题切换 | next-themes | ^0.4.6 |
| 日期处理 | date-fns | ^4.1.0 |
| 图片处理 | sharp | ^0.34.3 |

---

## 页面导航

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 主应用 | 桥梁步行板可视化管理系统主页面 |
| `/login` | 登录 | 用户登录（含失败锁定机制） |
| `/dashboard` | 数据总览 | 全局仪表盘、桥梁健康度排名、损坏分布图表 |
| `/map` | 桥梁地图 | 桥梁位置可视化地图 |
| `/inspection` | 巡检管理 | 巡检任务创建、分配、跟踪 |
| `/users` | 用户管理 | 用户 CRUD（仅管理员） |
| `/bridge-3d` | 3D 查看器 | 独立全屏 3D 桥梁模型查看器 |

---

## 使用指南

### 1. 登录系统

1. 打开浏览器访问 `http://localhost:3000`
2. 使用管理员账号登录（首次登录自动创建）：
   - 用户名：`admin`
   - 密码：`admin123`
3. **安全提示：** 连续 5 次输入错误密码将锁定账户 15 分钟

### 2. 修改密码

1. 登录后点击页面头部右上角的钥匙图标
2. 输入当前密码和新密码（至少 6 位）
3. 密码强度指示器会显示新密码的强度等级
4. 移动端用户可通过底部导航「我的」→「修改密码」

### 3. 创建桥梁

1. 在主页面点击头部「新建桥梁」按钮
2. 填写桥梁名称、编号、位置、线路名称
3. 设置孔数、每孔默认步行板数量、避车台配置等参数
4. 点击「创建」完成

### 4. 查看和编辑步行板

1. 在主页面选择一座桥梁（头部下拉选择器）
2. 使用 2D/3D 视图切换按钮选择查看模式
3. **2D 模式：** 点击步行板格子查看详情或编辑状态
4. **3D 模式：** 旋转/缩放 3D 模型，点击步行板编辑
5. **整桥模式：** 点击「整桥模式」一次查看所有孔位
6. 使用左右箭头或下拉选择器切换孔号

### 5. 批量编辑

1. 点击工具栏「批量编辑」按钮进入批量模式
2. 点击需要修改的步行板（支持全选）
3. 点击「编辑选中」按钮
4. 统一设置状态、栏杆、托架、备注等（留空保持不变）
5. 可开启「同步修改尺寸」开关统一调整步行板尺寸
6. 点击「批量更新」

### 6. 上传步行板照片

1. 点击步行板打开编辑对话框
2. 滚动到「步行板照片」区域
3. 点击「添加照片」选择图片文件
4. 移动端支持直接调用相机拍摄
5. 照片会以缩略图形式显示，点击可预览

### 7. 查看数据总览

1. 点击头部「数据总览」按钮（仪表盘图标）或访问 `/dashboard`
2. 查看：
   - **顶部统计栏：** 桥梁/孔/板总数、损坏率、高风险率
   - **损坏分布饼图：** 6 种状态的步行板数量占比
   - **桥梁损坏率柱状图：** 各桥梁损坏率对比
   - **桥梁健康排名：** 按损坏率排序的桥梁列表
   - **高风险告警：** 存在断裂风险步行板的桥梁列表

### 8. 查看趋势分析

1. 在主页面左侧面板找到「趋势分析」卡片
2. 查看：
   - **损坏率趋势：** 近 6 个月损坏率和高风险率的变化曲线（基于真实历史快照数据）
   - **状态分布：** 各类型步行板数量的时间变化
   - **趋势预测：** 基于线性回归的未来损坏率预测
   - **数据标识：** 图表会显示「真实数据」或「模拟数据」标识

### 9. 使用 AI 助手

1. 在右侧面板切换到「AI助手」标签页
2. 首次使用需点击设置图标配置 AI 服务商和 API Key
3. 使用方式：
   - 点击「AI分析桥梁状态」生成安全分析报告
   - 在输入框输入自然语言问题，如「分析当前桥梁安全状态」
   - 使用快捷按钮「分析安全状态」或「显示高危板」
4. AI 可以理解并执行修改步行板状态的指令

### 10. 导出报告

1. 在左侧预警面板点击「生成完整报告」
2. 等待 AI 生成桥梁安全报告
3. 报告生成后可：
   - 点击「复制报告」将 Markdown 文本复制到剪贴板
   - 点击「导出PDF」下载为 PDF 文件

### 11. 巡检任务管理

1. 访问 `/inspection` 或通过仪表盘导航
2. **创建任务：**
   - 点击「新建任务」按钮
   - 选择桥梁、填写负责人、截止日期、优先级和备注
   - 点击创建
3. **执行任务：**
   - 在任务列表中找到待处理的任务
   - 点击状态按钮推进流程：待处理 → 进行中 → 已完成
4. **筛选任务：** 使用顶部状态标签筛选不同状态的任务
5. **逾期提醒：** 逾期任务自动标红显示

### 12. 桥梁地图

1. 访问 `/map` 或通过仪表盘导航
2. 地图以 SVG 风格化方式展示所有桥梁位置
3. 桥梁标记颜色代表健康状态：
   - 🟢 绿色：良好（损坏率 < 5%）
   - 🟡 黄色：一般（损坏率 5-15%）
   - 🟠 橙色：较差（损坏率 15-30%）
   - 🔴 红色：危险（损坏率 > 30%）
4. 点击标记查看桥梁详情弹窗
5. 使用左侧列表快速定位桥梁

### 13. 数据导入导出

**导出 Excel：**
1. 点击左侧面板导出按钮（下载图标）
2. 或使用高级导出（4 Sheet 含汇总分析）

**导入 Excel：**
1. 点击导入按钮（上传图标）选择 .xlsx 文件
2. 选择导入模式（合并/替换）
3. 配置导入选项（桥梁/孔位/步行板/跳过已有）
4. 点击「开始导入」

**导入前建议先下载标准模板。**

> **事务保护：** JSON 导入和 Excel 导入均使用全流程事务保护，如果导入过程中断或失败，已写入的数据会自动回滚，确保数据库不会出现残留的部分数据。

### 15. 预警系统

预警系统在步行板状态更新时自动工作，无需手动操作：

1. **自动触发：** 修改步行板状态（如改为「断裂风险」）后，系统自动评估 9 条内置预警规则
2. **查看告警：**
   - 主页面右侧边栏「预警中心」面板
   - 仪表盘右侧「活跃预警」面板
3. **处理告警：**
   - 点击「解决」按钮标记告警为已解决（需填写解决备注）
   - 点击「忽略」按钮关闭告警
4. **告警级别：** 🔴 严重（断裂风险/桥梁损坏率>30%）→ 🟡 警告（严重损坏/损坏率>15%）→ 🔵 提示（轻微损坏/防滑不足）
5. **自动去重：** 同一规则+同一桥梁不会重复生成告警
6. **自动解决：** 步行板状态恢复正常后，相关告警自动标记为已解决

### 16. 站内消息通知

当预警触发时，系统自动为管理员和管理者创建站内通知：

1. **查看通知：** 页面右上角铃铛图标显示未读通知数量（红色角标）
2. **通知面板：** 点击铃铛展开通知列表，显示通知标题、内容、时间和严重等级
3. **标记已读：** 点击单条通知标记为已读，或点击「全部已读」按钮
4. **自动刷新：** 通知每 30 秒自动轮询更新未读数

### 14. 移动端使用

- **底部导航：** 桥梁 | 预警 | 详情 | AI | 我的
- **手势操作：** 首次访问会显示手势引导教程
  - 双指缩放：放大/缩小桥梁视图
  - 左右滑动：切换桥孔
  - 点击步行板：查看详情/编辑
- **个人中心（我的）：** 修改密码、数据总览、用户管理、操作日志、退出登录

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
│   │   ├── login/page.tsx         # 登录页 (含锁定机制)
│   │   ├── dashboard/page.tsx     # 数据总览仪表盘
│   │   ├── map/page.tsx           # 桥梁地图页
│   │   ├── inspection/page.tsx    # 巡检任务管理页
│   │   ├── bridge-3d/page.tsx     # 独立 3D 桥梁查看器
│   │   ├── users/page.tsx         # 用户管理页
│   │   └── api/
│   │       ├── route.ts           # 健康检查
│   │       ├── bridges/route.ts   # 桥梁 CRUD
│   │       ├── spans/route.ts     # 桥孔 CRUD + 重排序
│   │       ├── boards/route.ts    # 步行板 CRUD + 批量操作 + 预警评估
│   │       ├── boards/photos/route.ts  # 步行板照片上传/管理
│   │       ├── boards/snapshots/route.ts  # 步行板状态快照查询（趋势图表用）
│   │       ├── alerts/route.ts     # 告警记录查询/解决
│   │       ├── alert-rules/route.ts  # 预警规则管理
│   │       ├── notifications/route.ts  # 站内通知查询/标记已读
│   │       ├── inspection/route.ts     # 巡检任务 CRUD
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
│   │           ├── login/route.ts         # 登录 (含锁定机制)
│   │           ├── logout/route.ts        # 登出
│   │           ├── me/route.ts            # 当前用户信息
│   │           └── change-password/route.ts # 修改密码
│   ├── components/
│   │   ├── Providers.tsx           # 根 Provider
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx   # 认证上下文
│   │   │   └── ChangePasswordDialog.tsx  # 修改密码对话框
│   │   ├── bridge/
│   │   │   ├── MobileGestureGuide.tsx    # 移动端手势引导
│   │   │   ├── NotificationBell.tsx      # 通知铃铛组件（Popover + 轮询）
│   │   │   ├── PhotoUpload.tsx           # 照片上传组件
│   │   │   └── TrendAnalysis.tsx         # 趋势分析图表（支持真实数据）
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
│   │   ├── use-toast.ts           # Toast 通知
│   │   ├── useBridgeData.ts       # 桥梁数据加载/选择/统计
│   │   ├── useBoardEditing.ts     # 步行板编辑/批量操作
│   │   ├── useAIAssistant.ts      # AI 对话/分析/配置管理
│   │   ├── useBridgeCRUD.ts       # 桥梁/孔位增删改
│   │   ├── useDataImport.ts       # Excel 导入导出
│   │   ├── useResponsive.ts       # 移动端/离线/缩放状态
│   │   └── bridge-constants.ts    # 共享常量（状态配置/选项/authFetch）
│   └── lib/
│       ├── db.ts                  # Prisma 单例客户端
│       ├── utils.ts               # 工具函数
│       ├── pdf-export.ts          # PDF 报告导出工具
│       ├── alert-engine.ts        # 预警规则引擎（快照+评估+去重）
│       ├── seed-alert-rules.ts    # 内置预警规则初始化
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

### BoardPhoto（步行板照片）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| boardId | String (FK) | 所属步行板 |
| photo | String | 照片数据 (Base64) |
| description | String? | 照片描述 |
| uploadedBy | String? | 上传人 |
| uploadedAt | DateTime | 上传时间 |

### InspectionTask（巡检任务）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| bridgeId | String (FK) | 关联桥梁 |
| assignedTo | String? | 负责人 |
| dueDate | DateTime | 截止日期 |
| status | String | 状态 (pending/in_progress/completed) |
| priority | String | 优先级 (low/normal/high/urgent) |
| notes | String? | 备注 |
| completedAt | DateTime? | 完成时间 |
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

### BoardStatusSnapshot（步行板状态快照）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| boardId | String | 步行板 ID（无外键，避免级联删除） |
| spanId | String | 冗余存储孔位 ID |
| bridgeId | String | 冗余存储桥梁 ID |
| status | String | 快照时的状态 |
| damageDesc | String? | 损坏描述 |
| inspectedBy | String? | 检查人 |
| inspectedAt | DateTime? | 检查时间 |
| antiSlipLevel | Int? | 防滑等级 |
| connectionStatus | String? | 连接状态 |
| weatherCondition | String? | 天气条件 |
| visibility | Int? | 能见度 |
| railingStatus | String? | 栏杆状态 |
| bracketStatus | String? | 托架状态 |
| hasObstacle | Boolean | 是否有杂物 |
| obstacleDesc | String? | 杂物描述 |
| hasWaterAccum | Boolean | 是否有积水 |
| waterAccumDepth | Float? | 积水深度(cm) |
| remarks | String? | 备注 |
| boardLength | Float? | 步行板长度(cm) |
| boardWidth | Float? | 步行板宽度(cm) |
| boardThickness | Float? | 步行板厚度(cm) |
| snapshotReason | String | 快照原因 (update/batch_update/import) |
| createdAt | DateTime | 创建时间 |

### AlertRule（预警规则）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| name | String | 规则名称 |
| description | String? | 规则描述 |
| enabled | Boolean | 是否启用（默认 true） |
| severity | String | 严重等级 (critical/warning/info) |
| scope | String | 作用域 (bridge/span/board) |
| condition | String | JSON 条件 (如 `{"field":"damageRate","operator":">","value":30}`) |
| messageTemplate | String | 消息模板 (支持 `{bridgeName}` 等变量) |
| priority | Int | 优先级（默认 100） |
| isSystem | Boolean | 是否系统内置（不可删除） |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### AlertRecord（告警记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| ruleId | String (FK) | 关联规则 |
| bridgeId | String | 关联桥梁 |
| spanId | String? | 关联孔位 |
| boardId | String? | 关联步行板 |
| severity | String | 严重等级 (critical/warning/info) |
| title | String | 告警标题 |
| message | String | 告警消息 |
| status | String | 状态 (active/resolved/dismissed) |
| resolvedBy | String? | 解决人 |
| resolvedAt | DateTime? | 解决时间 |
| resolveNote | String? | 解决备注 |
| triggerData | String? | 触发时数据快照 (JSON) |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### Notification（站内通知）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| userId | String (FK) | 接收用户 |
| title | String | 通知标题 |
| message | String | 通知内容 |
| type | String | 类型 (alert/system/task) |
| severity | String? | 严重等级 (critical/warning/info) |
| relatedId | String? | 关联 ID（如 AlertRecord.id） |
| isRead | Boolean | 是否已读（默认 false） |
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

# 4. 初始化数据库（11 个模型）
npx prisma db push
npx prisma generate
```

> 系统内置 11 个数据库模型（Bridge, BridgeSpan, WalkingBoard, BoardPhoto, User, OperationLog, InspectionTask, BoardStatusSnapshot, AlertRule, AlertRecord, Notification）。首次登录时自动初始化 9 条预警规则。

```bash
# 5. 启动开发服务器
npm run dev

# 6. 打开浏览器访问
# http://localhost:3000
```

### 默认管理员账号

| 用户名 | 密码 |
|--------|------|
| admin | admin123 |

> 首次登录时自动创建管理员账号。**建议首次登录后立即修改默认密码。**

---

## API 接口

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录（含失败锁定机制） |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 当前用户信息 |
| POST | `/api/auth/change-password` | 修改密码 |

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

### 步行板照片

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/boards/photos?boardId=` | 获取步行板照片列表 | `board:read` |
| POST | `/api/boards/photos` | 上传照片 (FormData) | `board:write` |
| DELETE | `/api/boards/photos?photoId=` | 删除照片 | `board:write` |

### 巡检任务

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/inspection?bridgeId=&status=` | 查询巡检任务 | `bridge:read` |
| POST | `/api/inspection` | 创建巡检任务 | `bridge:write` |
| PUT | `/api/inspection` | 更新任务状态 | `bridge:write` |
| DELETE | `/api/inspection?id=` | 删除任务 | `bridge:delete` |

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

### 预警系统

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/alerts?severity=&status=&bridgeId=&page=` | 查询告警记录（含统计摘要） | `bridge:read` |
| PUT | `/api/alerts` | 解决/忽略告警（resolvedBy, resolveNote） | `bridge:write` |
| GET | `/api/alert-rules` | 列出所有预警规则（含活跃告警数） | admin |
| PUT | `/api/alert-rules` | 启用/禁用/修改规则 | admin |

### 历史快照

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/boards/snapshots?bridgeId=&groupBy=&startDate=&endDate=` | 查询状态快照（支持月/周/日聚合） | `bridge:read` |

### 站内通知

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/notifications?unreadOnly=&limit=` | 查询当前用户通知 + 未读数 | 登录用户 |
| PUT | `/api/notifications` | 标记已读 (`markRead` / `markAllRead`) | 登录用户 |

### AI 辅助

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/ai/analyze` | AI 桥梁安全分析 | `ai:use` |
| POST | `/api/ai/chat` | AI 对话（自然语言操作） | `ai:use` |
| POST | `/api/ai/models` | 获取可用 AI 模型列表 | `ai:use` |

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
