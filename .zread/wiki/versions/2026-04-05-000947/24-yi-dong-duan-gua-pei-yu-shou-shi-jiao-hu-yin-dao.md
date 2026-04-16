本系统采用**分层响应式架构**，从设备检测、布局重构、手势处理到首次引导，完整覆盖了移动端场景。核心设计思想是：桌面端呈现三栏信息密集布局，移动端通过底部 Tab 导航将同一份状态拆解为多个独立面板，确保小屏幕下的操作效率与信息可读性。

Sources: [use-mobile.ts](src/hooks/use-mobile.ts#L1-L19), [useResponsive.ts](src/hooks/useResponsive.ts#L1-L155), [page.tsx](src/app/page.tsx#L142-L217)

## 架构总览：三层响应式体系

系统的移动端适配可划分为三个协作层——**检测层**负责环境感知，**布局层**负责界面重构，**交互层**负责触摸操作增强。三层各自独立，通过共享的 `isMobile` / `isPortrait` 状态实现联动。

```
┌─────────────────────────────────────────────────────────┐
│                     交互层 (Interaction)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Pinch Zoom   │  │ Touch Feed-  │  │ Gesture Guide │  │
│  │ 双指缩放     │  │ back 触摸反馈│  │ 首次使用引导  │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
├─────────┼─────────────────┼──────────────────┼──────────┤
│         │            布局层 (Layout)          │          │
│  ┌──────┴─────────────────┴──────────────────┴───────┐  │
│  │ MobileBottomNav   Sheet Panels   Bridge2DView     │  │
│  │ 底部Tab导航       底部弹出面板   2D视图触控适配   │  │
│  └──────────────────────┬────────────────────────────┘  │
├─────────────────────────┼──────────────────────────────┤
│                   检测层 (Detection)                     │
│  ┌──────────────┐  ┌───┴───────────┐  ┌─────────────┐  │
│  │ useIsMobile  │  │ useResponsive │  │ CSS @media  │  │
│  │ 基础设备检测 │  │ 综合状态管理  │  │ 媒体查询    │  │
│  └──────────────┘  └───────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
```

Sources: [use-mobile.ts](src/hooks/use-mobile.ts#L1-L19), [useResponsive.ts](src/hooks/useResponsive.ts#L1-L35), [globals.css](src/app/globals.css#L723-L1013)

## 检测层：设备与屏幕方向感知

### 两种检测 Hook 的定位差异

系统提供了两个粒度不同的设备检测 Hook，分别服务于 UI 组件库（如 Sheet/Dialog 组件内部判断）和业务页面（桥页面的完整移动端状态管理）。

| Hook | 文件位置 | 断点值 | 返回内容 | 适用场景 |
|------|---------|--------|---------|---------|
| `useIsMobile` | [use-mobile.ts](src/hooks/use-mobile.ts) | `768px` | `boolean` | UI 组件级判断（简单轻量） |
| `useResponsive` | [useResponsive.ts](src/hooks/useResponsive.ts) | `768px` | 20+ 状态字段 | 业务页面级综合管理 |

`useIsMobile` 是一个极简实现，通过 `window.matchMedia` API 监听 `(max-width: 767px)` 媒体查询变化，在组件首次挂载和每次视口变化时更新布尔值。它的优势在于零依赖、体积小，适合 shadcn/ui 等 UI 组件库内部的移动端分支判断。

Sources: [use-mobile.ts](src/hooks/use-mobile.ts#L1-L19)

`useResponsive` 则是一个**重量级状态管理中心**，它不仅检测 `isMobile` 和 `isPortrait`，还管理了底部 Tab 导航状态（`mobileTab`）、移动端菜单/面板开关、双指缩放状态（`pinchScale`）、网络状态（`isOnline`）以及侧边栏折叠等全部移动端相关状态。值得注意的是，**主页面实际使用的是 `useBridgePage` 中内联的检测逻辑**（与 `useResponsive` 逻辑相同），而非直接调用 `useResponsive`，这是因为桥页面需要将检测结果与其他 Hook 组合（如 `useBridgeData` 的 `setRightPanelOpen`）。

Sources: [useResponsive.ts](src/hooks/useResponsive.ts#L37-L101), [useBridgePage.tsx](src/hooks/useBridgePage.tsx#L126-L149)

### 方向变化与自动折叠策略

当检测到 **移动端 + 竖屏** 组合条件时，系统会自动执行两个 UI 折叠操作：

```typescript
// useBridgePage.tsx 中的检测逻辑
const checkDevice = () => {
  const width = window.innerWidth
  const height = window.innerHeight
  const mobile = width < 768
  const portrait = height > width

  setIsMobile(mobile)
  setIsPortrait(portrait)

  if (mobile && portrait) {
    setSidebarCollapsed(true)        // 折叠左侧桥梁列表面板
    bridgeData.setRightPanelOpen(false) // 关闭右侧详情面板
  }
}
```

这一策略监听了 `resize` 和 `orientationchange` 两个事件，确保设备旋转时布局即时响应。

Sources: [useBridgePage.tsx](src/hooks/useBridgePage.tsx#L127-L149)

## 布局层：移动端 UI 重构

### 桌面端 vs 移动端布局对比

桌面端采用经典的 **12 列 Grid 三栏布局**：左栏（3 列）放置桥梁列表与预警面板，中栏（6-9 列）承载 2D/3D 可视化视图，右栏（3 列）展示详情与 AI 助手。移动端则完全重构为 **全屏视图 + 底部 Tab 导航 + Sheet 弹出面板** 模式。

```
桌面端 (≥768px)                    移动端 (<768px)
┌──────────────────────────┐       ┌─────────────────────┐
│ Header                   │       │ Header (精简)        │
├──────┬───────────┬───────┤       ├─────────────────────┤
│      │           │       │       │                     │
│ 桥梁 │  2D / 3D  │ 详情  │       │  当前 Tab 全屏内容  │
│ 列表 │  可视化   │ 面板  │       │  (桥梁视图/概览/    │
│      │           │       │       │   详情/AI/我的)     │
│ 预警 │           │ AI    │       │                     │
│ 统计 │           │ 助手  │       │                     │
│ 趋势 │           │       │       ├─────────────────────┤
├──────┴───────────┴───────┤       │ 🏗桥梁 🔔概览 ℹ详情│
│ Footer                   │       │      🤖AI  👤我的   │
└──────────────────────────┘       └─────────────────────┘
```

Sources: [page.tsx](src/app/page.tsx#L1009-L1010), [page.tsx](src/app/page.tsx#L724-L767)

### 底部导航 Tab 系统

移动端底部导航组件 `MobileBottomNav` 定义了 5 个 Tab 页签，通过 `MobileTab` 类型约束：

| Tab 值 | 图标 | 标签 | 功能说明 |
|--------|------|------|---------|
| `bridge` | `Building2` | 桥梁 | 桥梁可视化主视图（2D/3D） |
| `alert` | `Bell` | 概览 | 预警信息与统计概览 |
| `detail` | `Info` | 详情 | 当前孔位详情与步行板列表 |
| `ai` | `Bot` | AI | AI 助手对话面板（需 `ai:use` 权限） |
| `profile` | `User` | 我的 | 个人中心（密码修改、导航跳转） |

底部导航使用 `md:hidden` Tailwind 类实现仅移动端可见，并通过 `fixed bottom-0` 固定在屏幕底部。主内容区通过 `pb-24 md:pb-4` 为底部导航预留空间。切换 Tab 时，`mobilePanelOpen` 状态控制 Sheet 面板的开关（AI 助手面板会在 Tab 切换时自动打开 Sheet）。

Sources: [page.tsx](src/app/page.tsx#L724-L767), [bridge.ts](src/types/bridge.ts#L137)

### Sheet 弹出面板机制

AI 助手和个人中心采用 **底部弹出 Sheet**（`SheetContent side="bottom"`），而非全屏跳转。AI 面板高度占视口 80%（`h-[80vh]`），个人中心占 70%（`h-[70vh]`），从屏幕底部滑入，用户可下拉关闭。这种模式在保持上下文的同时提供了足够的操作空间。

```
AI 面板 Sheet                          个人中心 Sheet
┌─────────────────────┐               ┌─────────────────────┐
│   🤖 AI 助手        │               │   👤 个人中心        │
│─────────────────────│               │─────────────────────│
│   [分析按钮]         │               │ ┌─────────────────┐ │
│                     │               │ │ 头像  用户名     │ │
│   对话消息列表       │               │ │       @username  │ │
│   (ScrollArea)      │               │ │       角色标签   │ │
│                     │               │ └─────────────────┘ │
│                     │               │ 修改密码 →          │
│─────────────────────│               │ 数据总览 →          │
│   [输入框] [发送]    │               │ 用户管理 → (管理员) │
│   [快捷命令按钮]     │               │ 操作日志 →          │
└─────────────────────┘               │ [退出登录]          │
                                      └─────────────────────┘
```

Sources: [page.tsx](src/app/page.tsx#L1686-L1783)

### 移动端头部精简

移动端头部通过 `md:hidden` / `hidden md:block` / `md:w-56` 等响应式类实现差异渲染：副标题（英文描述）仅桌面端显示，桥梁选择器宽度从 `w-56` 缩为 `w-40`，"新建桥梁"按钮文字在移动端隐藏仅保留图标，用户菜单替换为汉堡菜单按钮。

Sources: [page.tsx](src/app/page.tsx#L800-L1006)

## 交互层：手势处理与触摸增强

### 双指缩放（Pinch Zoom）

系统实现了自定义的 **双指缩放** 算法，用于 2D/3D 桥梁视图的缩放交互。核心逻辑位于 `useBridgePage.tsx` 中的 `handlePinchZoom` 回调：

```typescript
const handlePinchZoom = useCallback((e: React.TouchEvent) => {
  if (e.touches.length === 2) {
    // 1. 计算两指间欧氏距离
    const distance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    )
    // 2. 与上帧距离比值得到缩放系数
    const scale = distance / lastDistanceRef
    // 3. 累乘缩放值，钳制在 [0.5, 3.0] 区间
    setPinchScale(prev => Math.min(Math.max(prev * scale, 0.5), 3))
  }
}, [])
```

缩放值 `pinchScale` 被约束在 **0.5x 至 3.0x** 范围内，防止过度缩放导致的视觉混乱。上一帧的双指距离通过 `window.lastPinchDistance` 临时存储（一种简洁但非线程安全的实践），在 `handlePinchEnd` 中重置为 0。CSS 层面，`.pinch-zoom-container` 设置了 `touch-action: pan-x pan-y`，将默认的浏览器缩放行为替换为自定义处理。

Sources: [useBridgePage.tsx](src/hooks/useBridgePage.tsx#L209-L230), [globals.css](src/app/globals.css#L989-L998)

### 触摸反馈与点击区域

移动端触摸体验通过多层次的 CSS 增强实现：

| CSS 类 | 效果 | 作用位置 |
|--------|------|---------|
| `-webkit-tap-highlight-color: transparent` | 全局禁用移动端默认点击高亮 | [globals.css](src/app/globals.css#L939-L941) |
| `.touch-feedback:active { scale(0.95) }` | 按下时缩小 5% 的触觉反馈 | [globals.css](src/app/globals.css#L771-L777) |
| `.mobile-button { min-*: 44px }` | 最小触摸目标 44px（Apple HIG 标准） | [globals.css](src/app/globals.css#L841-L844) |
| `.board-cell-2d { min-*: 44px !important }` | 步行板单元格最小点击区域 44px | [globals.css](src/app/globals.css#L982-L987) |
| `.board-cell-2d:active { scale(0.95) }` | 步行板按下缩小反馈 | [globals.css](src/app/globals.css#L750-L752) |
| `.mobile-nav button:active { scale(0.95) }` | 底部导航按钮按下反馈 | [globals.css](src/app/globals.css#L764-L766) |

44px 的最小触摸目标尺寸遵循了 Apple Human Interface Guidelines 中关于可交互元素最小 44×44 点的建议，步行板单元格在移动端通过 `!important` 覆盖了桌面端的 `w-11 h-9`（约 44×36px）尺寸。

Sources: [globals.css](src/app/globals.css#L725-L766), [globals.css](src/app/globals.css#L982-L987)

## 手势引导组件：MobileGestureGuide

### 首次使用引导流程

`MobileGestureGuide` 组件是一个全屏覆盖式的引导轮播，在用户首次以移动端访问系统时自动弹出。它通过 `localStorage` 键 `gesture-guide-shown` 记录已展示状态，确保每次安装仅触发一次。

```
┌─────────────────────────────────┐
│        [半透明遮罩 bg-black/70]   │
│                                 │
│  ┌─────────────────────────┐    │
│  │   操 作 指 引            │    │
│  │                         │    │
│  │    ╭───────────────╮    │    │
│  │    │  🔍 (动画图标) │    │    │ ← framer-motion 动画
│  │    ╰───────────────╯    │    │
│  │                         │    │
│  │    双指缩放              │    │ ← 标题
│  │    用两根手指在屏幕上    │    │ ← 描述
│  │    捏合或张开...         │    │
│  │                         │    │
│  │    ● ○ ○                │    │ ← 指示器
│  │                         │    │
│  │  [跳过]     [下一步 →]  │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

Sources: [MobileGestureGuide.tsx](src/components/bridge/MobileGestureGuide.tsx#L1-L170)

### 三步引导内容与动画

引导分为三个 Slide，每个 Slide 配有独立的 framer-motion 手势动画：

| Slide | 标题 | 动画效果 | 对应图标 |
|-------|------|---------|---------|
| 0 - 双指缩放 | "用两根手指在屏幕上捏合或张开，可以缩放桥梁视图" | `scale: [1, 1.2, 0.9, 1]` 循环 | `ZoomIn` |
| 1 - 左右滑动 | "在桥梁视图上左右滑动，可以快速切换不同的孔位" | `x: [-10, 10, -10, 0]` 循环 | `Hand` |
| 2 - 点击步行板 | "点击任意一块步行板，即可查看详细状态或进行编辑" | `scale: [1, 0.95, 1]` 循环 | `Pointer` |

每个 Slide 的动画以 1.5 秒为周期无限循环，使用 `easeInOut` 缓动曲线。Slide 切换使用 `AnimatePresence mode="wait"` 实现左右滑动过渡（新 Slide 从右侧滑入 `x: 50 → 0`，旧 Slide 向左滑出 `x: 0 → -50`）。

该组件在主页面中以 `{isMobile && <MobileGestureGuide theme={theme} />}` 条件渲染，仅在移动端设备上挂载。

Sources: [MobileGestureGuide.tsx](src/components/bridge/MobileGestureGuide.tsx#L11-L33), [MobileGestureGuide.tsx](src/components/bridge/MobileGestureGuide.tsx#L93-L121), [page.tsx](src/app/page.tsx#L1900-L1902)

## CSS 响应式断点体系

系统的 CSS 媒体查询定义了四个响应式断点，覆盖从手机到大屏显示器的全尺寸范围：

```
         ← 768px →           ← 1024px →          ← 1440px →
  ┌────────────────┬───────────────────┬──────────────────────┐
  │   移动端       │    平板端          │     桌面端           │
  │  <768px        │ 768px ~ 1024px    │   ≥1024px            │
  │                │                   │                      │
  │ • 隐藏双栏     │ • 左栏 200px      │  ≥1440px:           │
  │ • 主内容全宽   │ • 右栏 250px      │  • 左栏 320px       │
  │ • 步行板44px   │ • 3D按钮36×45px   │  • 右栏 360px       │
  │ • 3D按钮32×40  │ • 透视1000px      │                      │
  │ • 透视800px    │                   │                      │
  └────────────────┴───────────────────┴──────────────────────┘
```

| 断点 | 关键样式变化 |
|------|-------------|
| `max-width: 768px` | 双栏隐藏、主内容全宽、步行板放大至 44px、3D 步行板 32×40px、透视 800px、隐藏滚动条、禁用文本选择 |
| `768px ~ 1024px` | 左栏 200px、右栏 250px、3D 步行板 36×45px、透视 1000px |
| `min-width: 1440px` | 左栏 320px、右栏 360px |
| `max-width: 768px + landscape` | 底部导航高度 50px、按钮文字隐藏 |
| `max-width: 768px + portrait` | 侧边栏固定定位并滑出屏幕（`.sidebar-collapsible`） |

Sources: [globals.css](src/app/globals.css#L789-L886), [globals.css](src/app/globals.css#L1000-L1012)

### iOS 安全区域适配

系统通过 `@supports (padding-bottom: env(safe-area-inset-bottom))` 特性查询，为 iPhone X 及以上机型的底部安全区域提供适配。底部导航栏在支持安全区域的设备上自动增加 `env(safe-area-inset-bottom)` 的底部内边距，确保导航按钮不被 Home Indicator 遮挡。

Sources: [globals.css](src/app/globals.css#L903-L909)

### 滚动优化

移动端滚动体验通过两个关键 CSS 属性优化：

- **`.scroll-touch`**：设置 `-webkit-overflow-scrolling: touch`（启用 iOS 惯性滚动）和 `overscroll-behavior: contain`（防止滚动穿透到父容器）
- **`.span-selector`**：孔位选择器使用横向滚动，隐藏滚动条（`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`），配合 `-webkit-overflow-scrolling: touch` 实现丝滑横向滑动

Sources: [globals.css](src/app/globals.css#L803-L812), [globals.css](src/app/globals.css#L932-L936)

## 3D 视图移动端适配

全屏 3D 视图通过 `Fullscreen3DDialog` 组件实现移动端友好的交互体验。对话框尺寸为 `95vw × 95vh`，接近全屏但不完全覆盖，保留了视觉呼吸空间。孔位切换通过左右箭头按钮（`ChevronLeft` / `ChevronRight`）实现，位于左上角，按钮尺寸足够大以适应触摸操作。3D 场景在移动端自动调整透视参数（800px）和步行板按钮尺寸（32×40px），确保在小屏幕上的可读性。

Sources: [Fullscreen3DDialog.tsx](src/components/bridge/Fullscreen3DDialog.tsx#L1-L95), [globals.css](src/app/globals.css#L814-L828)

## 关键文件索引

| 文件 | 职责 | 代码行数参考 |
|------|------|-------------|
| [use-mobile.ts](src/hooks/use-mobile.ts) | 轻量级移动端检测 Hook | L1-L19 |
| [useResponsive.ts](src/hooks/useResponsive.ts) | 综合响应式状态管理 Hook | L1-L155 |
| [useBridgePage.tsx](src/hooks/useBridgePage.tsx) | 主页面设备检测与双指缩放逻辑 | L126-L230 |
| [MobileGestureGuide.tsx](src/components/bridge/MobileGestureGuide.tsx) | 首次使用手势引导轮播组件 | L1-L170 |
| [Fullscreen3DDialog.tsx](src/components/bridge/Fullscreen3DDialog.tsx) | 移动端 3D 全屏查看器 | L1-L95 |
| [page.tsx](src/app/page.tsx) | 移动端底部导航与 Sheet 面板 | L724-L767, L1686-L1783 |
| [globals.css](src/app/globals.css) | 响应式媒体查询与触摸优化 | L723-L1013 |
| [bridge.ts](src/types/bridge.ts) | `MobileTab` 类型定义 | L137 |

## 延伸阅读

- 移动端适配依赖的 2D 视图渲染机制详见 [2D 网格视图与整桥模式](22-2d-wang-ge-shi-tu-yu-zheng-qiao-mo-shi)
- 3D 视图的程序化建模原理详见 [Three.js 程序化 3D 桥梁模型渲染](21-three-js-cheng-xu-hua-3d-qiao-liang-mo-xing-xuan-ran)
- 移动端离线操作与数据同步机制详见 [离线支持：IndexedDB 本地存储与自动同步服务](25-chi-xian-zhi-chi-indexeddb-ben-di-cun-chu-yu-zi-dong-tong-bu-fu-wu)
- 移动端巡检任务操作详见 [巡检任务管理：创建、分配与状态流转](26-xun-jian-ren-wu-guan-li-chuang-jian-fen-pei-yu-zhuang-tai-liu-zhuan)