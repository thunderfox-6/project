'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTheme } from '@/components/ThemeProvider'
import { Button } from '@/components/ui/button'
import OperationLogDialog from '@/components/user/OperationLogDialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import {
  Train,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  XCircle,
  ShieldAlert,
  Wrench,
  Hash,
  Ruler,
  ChevronLeft,
  ChevronRight,
  Activity,
  Clock,
  Users,
  Eye,
  Zap,
  Layers,
  Settings,
  CloudRain,
  CloudSnow,
  CloudFog,
  Thermometer,
  Droplets,
  Wind,
  Navigation,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Radio,
  Signal,
  Gauge,
  AlertOctagon,
  Building2,
  Swords,
  Grid3X3,
  Box,
  Menu,
  X,
  Home,
  Bell,
  Info,
  ArrowLeft,
  ArrowRight,
  Bot,
  Send,
  Sparkles,
  Loader2,
  FileText,
  MessageSquare,
  Sun,
  Moon,
  Palette,
  Minus,
  CheckSquare,
  Square,
  Edit3,
  Upload,
  Download,
  Import,
  LogOut,
  PanelRightOpen,
  PanelRightClose,
  Save,
  RefreshCw,
  Pencil,
  KeyRound,
  User,
  LayoutDashboard,
  MapPin,
  ClipboardList,
  FileImage
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/components/auth/AuthProvider'
import ChangePasswordDialog from '@/components/auth/ChangePasswordDialog'
import MobileGestureGuide from '@/components/bridge/MobileGestureGuide'
import { syncService } from '@/lib/sync-service'
import { exportReportToPdf, exportBoardStatusPdf } from '@/lib/pdf-export'
import TrendAnalysis from '@/components/bridge/TrendAnalysis'
import PhotoUpload from '@/components/bridge/PhotoUpload'
import NotificationBell from '@/components/bridge/NotificationBell'

// 动态导入3D组件（禁用SSR）
const HomeBridge3D = dynamic(() => import('@/components/3d/HomeBridge3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">加载3D场景...</p>
      </div>
    </div>
  )
})

// 类型定义
interface WalkingBoard {
  id: string
  boardNumber: number
  position: string
  columnIndex: number
  status: string
  damageDesc: string | null
  inspectedBy: string | null
  inspectedAt: string | null
  antiSlipLevel: number | null
  antiSlipLastCheck: string | null
  connectionStatus: string | null
  weatherCondition: string | null
  visibility: number | null
  railingStatus: string | null
  bracketStatus: string | null
  hasObstacle: boolean
  obstacleDesc: string | null
  hasWaterAccum: boolean
  waterAccumDepth: number | null
  remarks: string | null
  boardLength: number | null
  boardWidth: number | null
  boardThickness: number | null
}

interface BridgeSpan {
  id: string
  spanNumber: number
  spanLength: number
  upstreamBoards: number
  downstreamBoards: number
  upstreamColumns: number
  downstreamColumns: number
  shelterSide: string
  shelterBoards: number
  shelterMaxPeople: number
  boardMaterial?: string
  walkingBoards: WalkingBoard[]
}

interface Bridge {
  id: string
  name: string
  bridgeCode: string
  location: string | null
  totalSpans: number
  lineName: string | null
  spans: BridgeSpan[]
}

interface BridgeStats {
  bridgeName: string
  bridgeCode: string
  totalSpans: number
  totalBoards: number
  normalBoards: number
  minorDamageBoards: number
  severeDamageBoards: number
  fractureRiskBoards: number
  replacedBoards: number
  missingBoards: number
  damageRate: number
  highRiskRate: number
  spanStats: {
    spanNumber: number
    spanLength: number
    totalBoards: number
    normalBoards: number
    minorDamageBoards: number
    severeDamageBoards: number
    fractureRiskBoards: number
    replacedBoards: number
    missingBoards: number
    damageRate: number
    highRiskRate: number
    hasHighRisk: boolean
  }[]
}

interface BridgeSummary {
  id: string
  name: string
  bridgeCode: string
  lineName: string | null
  location: string | null
  totalSpans: number
  totalBoards: number
  normalBoards: number
  minorDamageBoards: number
  severeDamageBoards: number
  fractureRiskBoards: number
  replacedBoards: number
  missingBoards: number
  damageRate: number
  highRiskRate: number
  hasHighRisk: boolean
}

interface OverallSummary {
  totalBridges: number
  totalSpans: number
  totalBoards: number
  normalBoards: number
  minorDamageBoards: number
  severeDamageBoards: number
  fractureRiskBoards: number
  replacedBoards: number
  missingBoards: number
  overallDamageRate: number
  overallHighRiskRate: number
  highRiskBridges: string[]
  bridgeSummaries: BridgeSummary[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// AI配置类型
interface AIConfig {
  provider: 'glm' | 'openai' | 'claude' | 'deepseek' | 'minimax' | 'kimi' | 'custom'
  model: string
  apiKey: string
  baseUrl: string
}

// 步行板状态配置
const BOARD_STATUS_CONFIG = {
  normal: {
    label: '正常',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: 'rgba(34, 197, 94, 0.5)',
    icon: CheckCircle,
    glowClass: 'normal-glow'
  },
  minor_damage: {
    label: '轻微损坏',
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.25)',
    borderColor: 'rgba(234, 179, 8, 0.6)',
    icon: AlertCircle,
    glowClass: 'neon-glow-yellow'
  },
  severe_damage: {
    label: '严重损坏',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.2)',
    borderColor: 'rgba(249, 115, 22, 0.5)',
    icon: AlertTriangle,
    glowClass: 'neon-glow-yellow'
  },
  fracture_risk: {
    label: '断裂风险',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.3)',
    borderColor: 'rgba(239, 68, 68, 0.8)',
    icon: XCircle,
    glowClass: 'danger-pulse fracture-border-blink'
  },
  replaced: {
    label: '已更换',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
    icon: Wrench,
    glowClass: ''
  },
  missing: {
    label: '缺失',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.3)',
    borderColor: 'rgba(107, 114, 128, 0.6)',
    icon: Minus,
    glowClass: ''
  }
}

// 栏杆状态选项
const RAILING_STATUS_OPTIONS = [
  { value: 'normal', label: '正常', desc: '无损坏' },
  { value: 'loose', label: '松动', desc: '固定件松动' },
  { value: 'damaged', label: '损坏', desc: '变形或断裂' },
  { value: 'missing', label: '缺失', desc: '已拆除或丢失' }
]

// 托架状态选项
const BRACKET_STATUS_OPTIONS = [
  { value: 'normal', label: '正常', desc: '无问题' },
  { value: 'loose', label: '松动', desc: '螺栓松动' },
  { value: 'damaged', label: '损坏', desc: '变形开裂' },
  { value: 'corrosion', label: '锈蚀', desc: '严重锈蚀' },
  { value: 'missing', label: '缺失', desc: '已拆除' }
]

// 材质配置
const BOARD_MATERIAL_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  galvanized_steel: { label: '镀锌钢', color: '#a8b5c4', desc: '耐腐蚀，强度高' },
  composite: { label: '复合材料', color: '#5a7247', desc: '轻质，防滑性好' },
  aluminum: { label: '铝合金', color: '#c0c8d0', desc: '轻便，耐腐蚀' },
  steel_grating: { label: '钢格栅', color: '#6b7280', desc: '排水性好，防滑' }
}

// 避车台配置
const SHELTER_SIDE_CONFIG: Record<string, { label: string; desc: string }> = {
  none: { label: '无避车台', desc: '不设置避车台' },
  single: { label: '单侧避车台', desc: '仅一侧设置避车台' },
  double: { label: '双侧避车台', desc: '两侧均设置避车台' }
}

// 天气配置
const WEATHER_CONFIG: Record<string, { icon: typeof CloudRain; label: string; color: string }> = {
  normal: { icon: Activity, label: '正常', color: '#22c55e' },
  rain: { icon: CloudRain, label: '雨天', color: '#3b82f6' },
  snow: { icon: CloudSnow, label: '雪天', color: '#94a3b8' },
  fog: { icon: CloudFog, label: '雾天', color: '#6b7280' },
  ice: { icon: Thermometer, label: '冰冻', color: '#06b6d4' }
}

// 移动端底部导航类型
type MobileTab = 'bridge' | 'alert' | 'detail' | 'ai' | 'profile'

// 用户类型
interface CurrentUser {
  id: string
  username: string
  name: string | null
  role: string
}

// 角色配置
const ROLE_LABELS: Record<string, string> = {
  admin: '系统管理员',
  manager: '桥梁管理者',
  user: '普通用户',
  viewer: '只读用户'
}

// 带认证的 fetch 封装
function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers = new Headers(options?.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (!headers.has('Content-Type') && options?.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }
  return globalThis.fetch(url, { ...options, headers })
}

export default function BridgeVisualizationSystem() {
  const router = useRouter()
  const { hasPermission } = useAuthContext()

  // 用户状态
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  
  // 状态
  const [bridges, setBridges] = useState<Bridge[]>([])
  const [selectedBridge, setSelectedBridge] = useState<Bridge | null>(null)
  const [bridgeStats, setBridgeStats] = useState<BridgeStats | null>(null)
  const [overallSummary, setOverallSummary] = useState<OverallSummary | null>(null)
  const [loading, setLoading] = useState(true)

  // 主题模式（使用全局 ThemeProvider）
  const { theme, toggleTheme } = useTheme()

  // 视图状态
  const [viewAngle, setViewAngle] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [selectedSpanIndex, setSelectedSpanIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('2d')
  const [is3DFullscreen, setIs3DFullscreen] = useState(false)
  const [pinchScale, setPinchScale] = useState(1)
  
  // 移动端状态
  const [mobileTab, setMobileTab] = useState<MobileTab>('bridge')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // AI助手状态
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '您好！我是桥梁步行板AI助手。\n\n我可以帮您：\n• 分析桥梁安全状态\n• 查询步行板信息\n• 修改步行板状态\n• 提供安全建议\n\n请问有什么可以帮您的？' }
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [rightPanelTab, setRightPanelTab] = useState<'info' | 'ai'>('info')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fullBridgeScrollRef = useRef<HTMLDivElement>(null)
  const spanRefs = useRef<(HTMLDivElement | null)[]>([])
  const boardListScrollRef = useRef<HTMLDivElement>(null)
  const [visibleSpanIndex, setVisibleSpanIndex] = useState(0)

  // 虚拟滚动：排序后的步行板列表
  const sortedBoards = useMemo(() => {
    if (!selectedBridge || !selectedBridge.spans[selectedSpanIndex]) return []
    return [...selectedBridge.spans[selectedSpanIndex].walkingBoards].sort((a, b) => {
      if (a.position !== b.position) return a.position.localeCompare(b.position)
      if (a.columnIndex !== b.columnIndex) return a.columnIndex - b.columnIndex
      return a.boardNumber - b.boardNumber
    })
  }, [selectedBridge, selectedSpanIndex])

  const boardVirtualizer = useVirtualizer({
    count: sortedBoards.length,
    getScrollElement: () => boardListScrollRef.current,
    estimateSize: () => 44,
    overscan: 10,
  })
  
  // 对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingBoard, setEditingBoard] = useState<WalkingBoard | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedBoardForDetail, setSelectedBoardForDetail] = useState<WalkingBoard | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportContent, setReportContent] = useState<string>('')
  const [generatingReport, setGeneratingReport] = useState(false)
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  
  // AI配置状态
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'glm',
    model: 'glm-4',
    apiKey: '',
    baseUrl: ''
  })
  const [fetchedModels, setFetchedModels] = useState<{id: string; name?: string}[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [highRiskFilter, setHighRiskFilter] = useState(false)
  const [bridgeViewMode, setBridgeViewMode] = useState<'single' | 'full'>('single')
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)

  // 桥梁信息/编辑对话框状态
  const [bridgeInfoDialogOpen, setBridgeInfoDialogOpen] = useState(false)
  const [bridgeEditDialogOpen, setBridgeEditDialogOpen] = useState(false)
  const [spanEditDialogOpen, setSpanEditDialogOpen] = useState(false)
  const [editingSpan, setEditingSpan] = useState<BridgeSpan | null>(null)
  const [bridgeEditForm, setBridgeEditForm] = useState({
    name: '',
    bridgeCode: '',
    location: '',
    lineName: '',
    totalSpans: 0
  })
  const [spanEditForm, setSpanEditForm] = useState({
    spanLength: 20,
    upstreamBoards: 10,
    downstreamBoards: 10,
    upstreamColumns: 2,
    downstreamColumns: 2,
    shelterSide: 'none',
    shelterBoards: 0,
    shelterMaxPeople: 4,
    boardLength: 100,
    boardWidth: 50,
    boardThickness: 5,
    boardMaterial: 'galvanized_steel'
  })
  const [regenerating, setRegenerating] = useState(false)

  // 表单状态
  const [newBridge, setNewBridge] = useState({
    name: '',
    bridgeCode: '',
    location: '',
    lineName: '',
    totalSpans: 3,
    defaultSpanLength: 20,
    defaultUpstreamBoards: 10,
    defaultDownstreamBoards: 10,
    defaultUpstreamColumns: 2,
    defaultDownstreamColumns: 2,
    shelterSide: 'double',
    shelterEvery: 2,
    shelterBoards: 4,
    shelterMaxPeople: 4,
    boardLength: 100,
    boardWidth: 50,
    boardThickness: 5,
    boardMaterial: 'galvanized_steel'
  })
  
  const [editForm, setEditForm] = useState({
    status: 'normal',
    damageDesc: '',
    inspectedBy: '',
    antiSlipLevel: 100,
    connectionStatus: 'normal',
    weatherCondition: 'normal',
    visibility: 100,
    railingStatus: 'normal',
    bracketStatus: 'normal',
    hasObstacle: false,
    obstacleDesc: '',
    hasWaterAccum: false,
    waterAccumDepth: 0,
    remarks: '',
    boardLength: 100,
    boardWidth: 50,
    boardThickness: 5
  })
  
  // 批量编辑状态
  const [batchMode, setBatchMode] = useState(false)
  const [selectedBoards, setSelectedBoards] = useState<string[]>([])
  const [batchEditDialogOpen, setBatchEditDialogOpen] = useState(false)
  const [batchEditForm, setBatchEditForm] = useState({
    status: '',
    inspectedBy: '',
    railingStatus: '',
    bracketStatus: '',
    remarks: '',
    // 尺寸编辑
    editSize: false,
    boardLength: 100,
    boardWidth: 50,
    boardThickness: 5
  })
  
  // 导入配置状态
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importConfig, setImportConfig] = useState({
    mode: 'merge' as 'merge' | 'replace',
    importBridges: true,
    importSpans: true,
    importBoards: true,
    skipExisting: true
  })
  
  // 离线状态
  const [isOnline, setIsOnline] = useState(true)
  const [offlineEdits, setOfflineEdits] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  // 安全提示栏关闭状态
  const [safetyTipDismissed, setSafetyTipDismissed] = useState(false)

  // 检查登录状态
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      
      if (!token || !userStr) {
        router.push('/login')
        return
      }
      
      try {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
      } catch {
        router.push('/login')
        return
      }
      
      setCheckingAuth(false)
    }
    
    checkAuth()
  }, [router])

  // 从localStorage加载AI配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('ai-config')
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        setAiConfig(parsed)
      } catch {
        console.error('Failed to parse AI config')
      }
    }
  }, [])

  // 保存AI配置
  const saveAiConfig = (config: AIConfig) => {
    setAiConfig(config)
    localStorage.setItem('ai-config', JSON.stringify(config))
    toast.success('AI配置已保存')
    setSettingsOpen(false)
  }

  // 获取可用模型列表
  const fetchModels = async () => {
    if (!aiConfig.apiKey) {
      toast.error('请先填写API密钥')
      return
    }
    setFetchingModels(true)
    try {
      const res = await authFetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiConfig.provider,
          apiKey: aiConfig.apiKey,
          baseUrl: aiConfig.baseUrl
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      if (data.models && data.models.length > 0) {
        setFetchedModels(data.models)
        // 如果当前模型不在列表中，自动选中第一个
        if (!data.models.find((m: {id: string}) => m.id === aiConfig.model)) {
          setAiConfig({ ...aiConfig, model: data.models[0].id })
        }
        toast.success(`获取到 ${data.models.length} 个可用模型`)
      } else {
        toast.error('未找到可用模型')
      }
    } catch {
      toast.error('获取模型列表失败')
    } finally {
      setFetchingModels(false)
    }
  }

  // 退出登录
  const handleLogout = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        await authFetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  // 检测移动端和屏幕方向
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const mobile = width < 768
      const portrait = height > width
      
      setIsMobile(mobile)
      setIsPortrait(portrait)
      
      // 竖屏时自动折叠侧边栏
      if (mobile && portrait) {
        setSidebarCollapsed(true)
        setRightPanelOpen(false)
      }
    }
    checkDevice()
    window.addEventListener('resize', checkDevice)
    window.addEventListener('orientationchange', checkDevice)
    return () => {
      window.removeEventListener('resize', checkDevice)
      window.removeEventListener('orientationchange', checkDevice)
    }
  }, [])

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('网络已连接')
    }
    const handleOffline = () => {
      setIsOnline(false)
      toast.warning('网络已断开，进入离线模式')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 初始检查
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 自动滚动到消息底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages])

  // 整桥模式滚动监听 - 高亮当前可视孔
  useEffect(() => {
    if (bridgeViewMode !== 'full' || !fullBridgeScrollRef.current) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        // 找到最上面可见的孔
        const visibleEntries = entries.filter(e => e.isIntersecting)
        if (visibleEntries.length > 0) {
          // 按照位置排序，取最上面的
          const sorted = visibleEntries.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          const spanId = sorted[0].target.getAttribute('data-span-index')
          if (spanId !== null) {
            setVisibleSpanIndex(parseInt(spanId))
          }
        }
      },
      {
        root: fullBridgeScrollRef.current,
        threshold: 0.3
      }
    )

    // 观察所有孔
    spanRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [bridgeViewMode, selectedBridge])

  // 滚动到指定孔
  const scrollToSpan = (index: number) => {
    const el = spanRefs.current[index]
    if (el && fullBridgeScrollRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setSelectedSpanIndex(index)
    }
  }

  // 双指缩放处理
  const handlePinchZoom = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      
      // 使用ref存储初始距离
      const lastDistanceRef = (window as unknown as { lastPinchDistance?: number }).lastPinchDistance
      if (lastDistanceRef !== undefined && lastDistanceRef > 0) {
        const scale = distance / lastDistanceRef
        setPinchScale(prev => Math.min(Math.max(prev * scale, 0.5), 3))
      }
      ;(window as unknown as { lastPinchDistance?: number }).lastPinchDistance = distance
    }
  }, [])

  const handlePinchEnd = useCallback(() => {
    ;(window as unknown as { lastPinchDistance?: number }).lastPinchDistance = 0
  }, [])

  // 加载桥梁列表
  const loadBridges = useCallback(async () => {
    try {
      setLoading(true)
      const response = await authFetch('/api/bridges')
      const data = await response.json()
      if (!response.ok || !Array.isArray(data)) {
        console.error('加载桥梁失败:', data)
        toast.error(data?.error || '加载桥梁列表失败')
        return
      }
      setBridges(data)
      if (data.length > 0) {
        setSelectedBridge(prev => prev ? prev : data[0])
      }
    } catch (error) {
      console.error('加载桥梁失败:', error)
      toast.error('加载桥梁列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  // 加载统计数据
  const loadStats = useCallback(async (bridgeId: string) => {
    try {
      const response = await authFetch(`/api/stats?bridgeId=${bridgeId}`)
      const data = await response.json()
      setBridgeStats(data)
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }, [])

  // 加载汇总数据
  const loadSummary = useCallback(async () => {
    try {
      const response = await authFetch('/api/summary')
      const data = await response.json()
      setOverallSummary(data)
    } catch (error) {
      console.error('加载汇总数据失败:', error)
    }
  }, [])

  // 刷新所有数据（导入后使用）
  const refreshAllData = useCallback(async (targetBridgeId?: string) => {
    try {
      setLoading(true)
      console.log('[刷新数据] 开始刷新，目标桥梁ID:', targetBridgeId)
      
      // 重新加载桥梁列表
      const response = await authFetch('/api/bridges')
      const data = await response.json()
      if (!Array.isArray(data)) {
        console.error('[刷新数据] 加载桥梁列表失败:', data)
        toast.error(data?.error || '加载桥梁列表失败')
        return
      }
      setBridges(data)
      console.log('[刷新数据] 桥梁列表:', data.length, '座')
      
      // 确定要选择的桥梁ID
      let bridgeIdToSelect = targetBridgeId
      
      // 如果没有指定目标桥梁，但有选中的桥梁，则刷新选中的桥梁
      if (!bridgeIdToSelect && selectedBridge) {
        bridgeIdToSelect = selectedBridge.id
      }
      
      // 如果有目标桥梁ID，加载该桥梁数据
      if (bridgeIdToSelect) {
        console.log('[刷新数据] 加载桥梁详情，ID:', bridgeIdToSelect)
        const bridgeRes = await authFetch(`/api/boards?bridgeId=${bridgeIdToSelect}`)
        const targetBridge = await bridgeRes.json()
        console.log('[刷新数据] 桥梁详情:', targetBridge?.name, '孔位数:', targetBridge?.spans?.length)
        if (targetBridge) {
          // 统计步行板数量
          const totalBoards = targetBridge.spans?.reduce((sum: number, span: BridgeSpan) => sum + (span.walkingBoards?.length || 0), 0) || 0
          console.log('[刷新数据] 步行板总数:', totalBoards)
          setSelectedBridge(targetBridge)
          loadStats(targetBridge.id)
        }
      } else if (data.length > 0) {
        // 如果没有目标桥梁，选择第一个
        const bridgeRes = await authFetch(`/api/boards?bridgeId=${data[0].id}`)
        const firstBridge = await bridgeRes.json()
        setSelectedBridge(firstBridge)
        loadStats(data[0].id)
      }
      
      // 刷新汇总数据
      loadSummary()
    } catch (error) {
      console.error('刷新数据失败:', error)
      toast.error('刷新数据失败')
    } finally {
      setLoading(false)
    }
  }, [selectedBridge, loadStats, loadSummary])

  useEffect(() => {
    loadBridges()
    loadSummary()
  }, [loadBridges, loadSummary])

  useEffect(() => {
    if (selectedBridge) {
      loadStats(selectedBridge.id)
    }
  }, [selectedBridge, loadStats])

  // AI分析
  const handleAIAnalyze = async () => {
    if (!selectedBridge) {
      toast.error('请先选择一座桥梁')
      return
    }
    
    setAiAnalyzing(true)
    setAiAnalysis(null)
    
    try {
      const response = await authFetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bridgeId: selectedBridge.id,
          config: aiConfig
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setAiAnalysis(data.analysis)
        setAiMessages(prev => [...prev, {
          role: 'assistant',
          content: `## 桥梁安全分析报告\n\n${data.analysis}`
        }])
      } else {
        toast.error(data.error || '分析失败')
      }
    } catch (error) {
      console.error('AI分析失败:', error)
      toast.error('AI分析失败，请稍后重试')
    } finally {
      setAiAnalyzing(false)
    }
  }

  // AI对话发送消息
  const handleAISend = async () => {
    if (!aiInput.trim() || aiLoading) return
    
    const userMessage = aiInput.trim()
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setAiInput('')
    setAiLoading(true)
    
    try {
      const response = await authFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          bridgeId: selectedBridge?.id,
          currentSpanId: selectedBridge?.spans[selectedSpanIndex]?.id,
          history: aiMessages.slice(-10).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
          config: aiConfig
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setAiMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply
        }])
        
        // 处理修改指令
        if (data.updateAction && data.updateAction.boardId) {
          const action = data.updateAction
          // 执行更新
          const updateResponse = await authFetch('/api/boards', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: data.updateAction.boardId,
              status: action.status,
              inspectedBy: 'AI助手',
              damageDesc: `AI标注: ${action.status}`
            })
          })
          
          if (updateResponse.ok) {
            toast.success(`已更新第${action.spanNumber}孔${action.position === 'upstream' ? '上行' : action.position === 'downstream' ? '下行' : '避车台'}${action.boardNumber}号板状态`)
            refreshBridgeData()
          }
        }
      } else {
        toast.error(data.error || '对话失败')
      }
    } catch (error) {
      console.error('AI对话失败:', error)
      toast.error('AI对话失败，请稍后重试')
    } finally {
      setAiLoading(false)
    }
  }

  // 创建桥梁
  const handleCreateBridge = async () => {
    if (!newBridge.name || !newBridge.bridgeCode) {
      toast.error('请填写桥梁名称和编号')
      return
    }

    try {
      const spans = []
      for (let i = 1; i <= newBridge.totalSpans; i++) {
        const hasShelter = newBridge.shelterEvery > 0 && i % newBridge.shelterEvery === 0
        spans.push({
          spanNumber: i,
          spanLength: newBridge.defaultSpanLength,
          upstreamBoards: newBridge.defaultUpstreamBoards,
          downstreamBoards: newBridge.defaultDownstreamBoards,
          upstreamColumns: newBridge.defaultUpstreamColumns,
          downstreamColumns: newBridge.defaultDownstreamColumns,
          shelterSide: hasShelter ? newBridge.shelterSide : 'none',
          shelterBoards: hasShelter ? newBridge.shelterBoards : 0,
          shelterMaxPeople: newBridge.shelterMaxPeople,
          boardLength: newBridge.boardLength,
          boardWidth: newBridge.boardWidth,
          boardThickness: newBridge.boardThickness,
          boardMaterial: newBridge.boardMaterial
        })
      }

      const response = await authFetch('/api/bridges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBridge.name,
          bridgeCode: newBridge.bridgeCode,
          location: newBridge.location,
          lineName: newBridge.lineName,
          totalSpans: newBridge.totalSpans,
          spans
        })
      })

      if (response.ok) {
        toast.success('桥梁创建成功')
        setCreateDialogOpen(false)
        resetNewBridgeForm()
        loadBridges()
        loadSummary()
      } else {
        toast.error('创建桥梁失败')
      }
    } catch (error) {
      console.error('创建桥梁失败:', error)
      toast.error('创建桥梁失败')
    }
  }

  const resetNewBridgeForm = () => {
    setNewBridge({
      name: '',
      bridgeCode: '',
      location: '',
      lineName: '',
      totalSpans: 3,
      defaultSpanLength: 20,
      defaultUpstreamBoards: 10,
      defaultDownstreamBoards: 10,
      defaultUpstreamColumns: 2,
      defaultDownstreamColumns: 2,
      shelterSide: 'double',
      shelterEvery: 2,
      shelterBoards: 4,
      shelterMaxPeople: 4,
      boardLength: 100,
      boardWidth: 50,
      boardThickness: 5,
      boardMaterial: 'galvanized_steel'
    })
  }

  // 删除桥梁
  const handleDeleteBridge = async (id: string) => {
    try {
      const response = await authFetch(`/api/bridges?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('桥梁删除成功')
        setSelectedBridge(null)
        loadBridges()
        loadSummary()
      } else {
        toast.error('删除桥梁失败')
      }
    } catch (error) {
      console.error('删除桥梁失败:', error)
      toast.error('删除桥梁失败')
    }
  }

  // 查看桥梁信息
  const handleViewBridgeInfo = (bridge?: Bridge) => {
    const target = bridge || selectedBridge
    if (!target) {
      toast.error('请先选择一座桥梁')
      return
    }
    if (bridge) setSelectedBridge(bridge)
    setBridgeInfoDialogOpen(true)
  }

  // 编辑桥梁基本信息
  const handleEditBridge = async (bridge?: Bridge) => {
    const target = bridge || selectedBridge
    if (!target) {
      toast.error('请先选择一座桥梁')
      return
    }
    if (bridge) {
      // 确保加载完整的桥梁数据（含spans）
      try {
        const bridgeRes = await authFetch(`/api/boards?bridgeId=${bridge.id}`)
        const fullBridge = await bridgeRes.json()
        if (fullBridge) {
          setSelectedBridge(fullBridge)
          setSelectedSpanIndex(0)
        }
      } catch (e) {
        console.error('加载桥梁详情失败:', e)
      }
    }
    setBridgeEditForm({
      name: target.name,
      bridgeCode: target.bridgeCode,
      location: target.location || '',
      lineName: target.lineName || '',
      totalSpans: target.totalSpans
    })
    setBridgeEditDialogOpen(true)
  }

  // 保存桥梁编辑
  const handleSaveBridgeEdit = async () => {
    if (!selectedBridge || !bridgeEditForm.name || !bridgeEditForm.bridgeCode) {
      toast.error('请填写桥梁名称和编号')
      return
    }

    try {
      const response = await authFetch('/api/bridges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedBridge.id,
          name: bridgeEditForm.name,
          bridgeCode: bridgeEditForm.bridgeCode,
          location: bridgeEditForm.location || null,
          lineName: bridgeEditForm.lineName || null,
          totalSpans: bridgeEditForm.totalSpans
        })
      })

      if (response.ok) {
        const updatedBridge = await response.json()
        toast.success('桥梁信息更新成功')
        setBridgeEditDialogOpen(false)
        setSelectedBridge(updatedBridge)
        // 更新列表中的桥梁数据
        setBridges(prev => prev.map(b => b.id === updatedBridge.id ? updatedBridge : b))
        loadSummary()
      } else {
        const data = await response.json()
        toast.error(data.error || '更新桥梁失败')
      }
    } catch (error) {
      console.error('更新桥梁失败:', error)
      toast.error('更新桥梁失败')
    }
  }

  // 编辑当前孔位
  const handleEditSpan = (span?: BridgeSpan) => {
    const targetSpan = span || (selectedBridge?.spans[selectedSpanIndex])
    if (!targetSpan) {
      toast.error('请先选择一个孔位')
      return
    }
    setEditingSpan(targetSpan)
    const firstBoard = targetSpan.walkingBoards[0]
    setSpanEditForm({
      spanLength: targetSpan.spanLength,
      upstreamBoards: targetSpan.upstreamBoards,
      downstreamBoards: targetSpan.downstreamBoards,
      upstreamColumns: targetSpan.upstreamColumns,
      downstreamColumns: targetSpan.downstreamColumns,
      shelterSide: targetSpan.shelterSide,
      shelterBoards: targetSpan.shelterBoards,
      shelterMaxPeople: targetSpan.shelterMaxPeople,
      boardLength: firstBoard?.boardLength || 100,
      boardWidth: firstBoard?.boardWidth || 50,
      boardThickness: firstBoard?.boardThickness || 5,
      boardMaterial: targetSpan.boardMaterial
    })
    setSpanEditDialogOpen(true)
  }

  // 保存孔位编辑
  const handleSaveSpanEdit = async (forceRegenerate: boolean = false) => {
    if (!editingSpan) return

    try {
      setRegenerating(true)
      const response = await authFetch('/api/spans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSpan.id,
          ...spanEditForm,
          regenerateBoards: forceRegenerate
        })
      })

      if (response.ok) {
        const updatedSpan = await response.json()
        toast.success('孔位信息更新成功')
        setSpanEditDialogOpen(false)
        // 更新当前桥梁数据中的孔位
        if (selectedBridge) {
          const updatedBridge = {
            ...selectedBridge,
            spans: selectedBridge.spans.map(s => s.id === updatedSpan.id ? updatedSpan : s)
          }
          setSelectedBridge(updatedBridge)
          setBridges(prev => prev.map(b => b.id === updatedBridge.id ? updatedBridge : b))
        }
        if (selectedBridge) {
          loadStats(selectedBridge.id)
        }
      } else {
        const data = await response.json()
        toast.error(data.error || '更新孔位失败')
      }
    } catch (error) {
      console.error('更新孔位失败:', error)
      toast.error('更新孔位失败')
    } finally {
      setRegenerating(false)
    }
  }

  // 添加新孔位
  const handleAddSpan = async () => {
    if (!selectedBridge) {
      toast.error('请先选择一座桥梁')
      return
    }

    try {
      const response = await authFetch('/api/spans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bridgeId: selectedBridge.id,
          insertPosition: selectedBridge.spans.length + 1,
          spanLength: 20,
          upstreamBoards: 10,
          downstreamBoards: 10,
          upstreamColumns: 2,
          downstreamColumns: 2,
          shelterSide: 'none',
          shelterBoards: 0,
          shelterMaxPeople: 4,
          boardLength: 100,
          boardWidth: 50,
          boardThickness: 5,
          boardMaterial: 'galvanized_steel'
        })
      })

      if (response.ok) {
        const updatedBridge = await response.json()
        toast.success('新孔位添加成功')
        setSelectedBridge(updatedBridge)
        setBridges(prev => prev.map(b => b.id === updatedBridge.id ? updatedBridge : b))
        if (updatedBridge.spans.length > 0) {
          setSelectedSpanIndex(updatedBridge.spans.length - 1)
          loadStats(updatedBridge.id)
        }
      } else {
        const data = await response.json()
        toast.error(data.error || '添加孔位失败')
      }
    } catch (error) {
      console.error('添加孔位失败:', error)
      toast.error('添加孔位失败')
    }
  }

  // 删除孔位
  const handleDeleteSpan = async (spanId: string) => {
    if (!selectedBridge) return

    if (selectedBridge.spans.length <= 1) {
      toast.error('桥梁至少需要一个孔位')
      return
    }

    try {
      const response = await authFetch(`/api/spans?id=${spanId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const updatedBridge = await response.json()
        toast.success('孔位删除成功')
        setSelectedBridge(updatedBridge)
        setBridges(prev => prev.map(b => b.id === updatedBridge.id ? updatedBridge : b))
        // 调整选中孔位索引
        if (selectedSpanIndex >= updatedBridge.spans.length) {
          setSelectedSpanIndex(updatedBridge.spans.length - 1)
        }
        if (updatedBridge.id) {
          loadStats(updatedBridge.id)
        }
      } else {
        const data = await response.json()
        toast.error(data.error || '删除孔位失败')
      }
    } catch (error) {
      console.error('删除孔位失败:', error)
      toast.error('删除孔位失败')
    }
  }

  // 导出数据为Excel表格
  const handleExportData = async () => {
    try {
      toast.loading('正在导出Excel表格...')
      
      const response = await authFetch('/api/data/excel')
      
      if (!response.ok) {
        throw new Error('导出失败')
      }
      
      // 获取Excel文件blob
      const blob = await response.blob()
      
      // 创建下载链接
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `桥梁步行板数据_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.dismiss()
      toast.success('Excel表格导出成功')
    } catch (error) {
      toast.dismiss()
      console.error('导出数据失败:', error)
      toast.error('导出Excel失败')
    }
  }

  // 下载导入模板
  const handleDownloadTemplate = async () => {
    try {
      toast.loading('正在下载导入模板...')
      
      const response = await authFetch('/api/data/template')
      
      if (!response.ok) {
        throw new Error('下载模板失败')
      }
      
      // 获取Excel文件blob
      const blob = await response.blob()
      
      // 创建下载链接
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '桥梁步行板导入模板.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.dismiss()
      toast.success('导入模板下载成功')
    } catch (error) {
      toast.dismiss()
      console.error('下载模板失败:', error)
      toast.error('下载模板失败')
    }
  }

  // 选择导入文件
  const handleSelectImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // 检查文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    
    if (!validTypes.includes(file.type) && !['xlsx', 'xls'].includes(fileExtension || '')) {
      toast.error('请选择Excel文件（.xlsx或.xls格式）')
      event.target.value = ''
      return
    }
    
    setImportFile(file)
    setImportDialogOpen(true)
    event.target.value = ''
  }

  // 执行导入
  const handleExecuteImport = async () => {
    if (!importFile) {
      toast.error('请先选择要导入的文件')
      return
    }
    
    try {
      toast.loading('正在导入Excel数据...')
      
      // 使用FormData上传文件
      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('mode', importConfig.mode)
      
      const response = await authFetch('/api/data/excel', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      toast.dismiss()
      if (result.success) {
        toast.success(result.message)
        setImportDialogOpen(false)
        setImportFile(null)
        // 如果有导入的桥梁ID，自动选择第一个导入的桥梁
        const firstImportedBridgeId = result.results?.importedBridgeIds?.[0]
        refreshAllData(firstImportedBridgeId)
      } else {
        toast.error(result.error || '导入失败')
      }
    } catch (error) {
      toast.dismiss()
      console.error('导入数据失败:', error)
      toast.error('导入Excel失败，请检查文件格式')
    }
  }

  // 快速导入Excel数据（直接导入，无配置）
  const handleQuickImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // 检查文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    
    if (!validTypes.includes(file.type) && !['xlsx', 'xls'].includes(fileExtension || '')) {
      toast.error('请选择Excel文件（.xlsx或.xls格式）')
      event.target.value = ''
      return
    }
    
    try {
      toast.loading('正在导入Excel数据...')
      
      // 使用FormData上传文件
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mode', 'merge') // 合并模式，不覆盖已有数据
      
      const response = await authFetch('/api/data/excel', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      toast.dismiss()
      if (result.success) {
        toast.success(result.message)
        // 如果有导入的桥梁ID，自动选择第一个导入的桥梁
        const firstImportedBridgeId = result.results?.importedBridgeIds?.[0]
        refreshAllData(firstImportedBridgeId)
      } else {
        toast.error(result.error || '导入失败')
      }
    } catch (error) {
      toast.dismiss()
      console.error('导入数据失败:', error)
      toast.error('导入Excel失败，请检查文件格式')
    }
    
    // 清空文件输入
    event.target.value = ''
  }

  // 更新步行板状态
  const handleUpdateBoard = async () => {
    if (!editingBoard) return

    try {
      const response = await authFetch('/api/boards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBoard.id,
          status: editForm.status,
          damageDesc: editForm.damageDesc,
          inspectedBy: editForm.inspectedBy,
          antiSlipLevel: editForm.antiSlipLevel,
          connectionStatus: editForm.connectionStatus,
          weatherCondition: editForm.weatherCondition,
          visibility: editForm.visibility,
          railingStatus: editForm.railingStatus,
          bracketStatus: editForm.bracketStatus,
          hasObstacle: editForm.hasObstacle,
          obstacleDesc: editForm.obstacleDesc,
          hasWaterAccum: editForm.hasWaterAccum,
          waterAccumDepth: editForm.waterAccumDepth,
          remarks: editForm.remarks,
          boardLength: editForm.boardLength,
          boardWidth: editForm.boardWidth,
          boardThickness: editForm.boardThickness
        })
      })

      if (response.ok) {
        toast.success('步行板状态更新成功')
        setEditDialogOpen(false)
        setEditingBoard(null)
        refreshBridgeData()
      } else {
        toast.error('更新步行板状态失败')
      }
    } catch (error) {
      console.error('更新步行板状态失败:', error)
      toast.error('更新步行板状态失败')
    }
  }

  // 刷新桥梁数据
  const refreshBridgeData = async () => {
    if (selectedBridge) {
      const bridgeRes = await authFetch(`/api/boards?bridgeId=${selectedBridge.id}`)
      const updatedBridge = await bridgeRes.json()
      setSelectedBridge(updatedBridge)
      loadStats(selectedBridge.id)
      loadSummary()
    }
  }

  // 批量更新步行板
  const handleBatchUpdateBoards = async () => {
    if (selectedBoards.length === 0) {
      toast.error('请选择要编辑的步行板')
      return
    }

    try {
      // 更新步行板状态
      if (batchEditForm.status || batchEditForm.railingStatus || batchEditForm.bracketStatus || batchEditForm.remarks || batchEditForm.editSize) {
        const response = await authFetch('/api/boards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updates: selectedBoards.map(id => ({
              id,
              status: batchEditForm.status || undefined,
              railingStatus: batchEditForm.railingStatus || undefined,
              bracketStatus: batchEditForm.bracketStatus || undefined,
              remarks: batchEditForm.remarks || undefined,
              inspectedBy: batchEditForm.inspectedBy || '批量编辑',
              ...(batchEditForm.editSize ? {
                boardLength: batchEditForm.boardLength,
                boardWidth: batchEditForm.boardWidth,
                boardThickness: batchEditForm.boardThickness
              } : {})
            }))
          })
        })

        if (!response.ok) {
          toast.error('批量更新状态失败')
          return
        }
      }

      toast.success(`已批量更新 ${selectedBoards.length} 块步行板`)
      setBatchEditDialogOpen(false)
      setBatchMode(false)
      setSelectedBoards([])
      setBatchEditForm({
        status: '',
        inspectedBy: '',
        railingStatus: '',
        bracketStatus: '',
        remarks: '',
        editSize: false,
        boardLength: 100,
        boardWidth: 50,
        boardThickness: 5
      })
      refreshBridgeData()
    } catch (error) {
      console.error('批量更新失败:', error)
      toast.error('批量更新失败')
    }
  }

  // 切换步行板选中状态
  const toggleBoardSelection = (boardId: string) => {
    setSelectedBoards(prev => 
      prev.includes(boardId) 
        ? prev.filter(id => id !== boardId)
        : [...prev, boardId]
    )
  }

  // 全选/取消全选当前孔位步行板
  const toggleSelectAll = () => {
    if (!selectedBridge) return
    const currentSpan = selectedBridge.spans[selectedSpanIndex]
    if (!currentSpan) return

    const allBoardIds = currentSpan.walkingBoards.map(b => b.id)
    const allSelected = allBoardIds.every(id => selectedBoards.includes(id))

    if (allSelected) {
      setSelectedBoards(prev => prev.filter(id => !allBoardIds.includes(id)))
    } else {
      setSelectedBoards(prev => [...new Set([...prev, ...allBoardIds])])
    }
  }

  // 打开编辑对话框
  const openEditDialog = (board: WalkingBoard) => {
    setEditingBoard(board)
    setEditForm({
      status: board.status,
      damageDesc: board.damageDesc || '',
      inspectedBy: board.inspectedBy || '',
      antiSlipLevel: board.antiSlipLevel || 100,
      connectionStatus: board.connectionStatus || 'normal',
      weatherCondition: board.weatherCondition || 'normal',
      visibility: board.visibility || 100,
      railingStatus: board.railingStatus || 'normal',
      bracketStatus: board.bracketStatus || 'normal',
      hasObstacle: board.hasObstacle || false,
      obstacleDesc: board.obstacleDesc || '',
      hasWaterAccum: board.hasWaterAccum || false,
      waterAccumDepth: board.waterAccumDepth || 0,
      remarks: board.remarks || '',
      boardLength: board.boardLength || 100,
      boardWidth: board.boardWidth || 50,
      boardThickness: board.boardThickness || 5
    })
    setEditDialogOpen(true)
    setMobilePanelOpen(false)
  }

  // 查看详情
  const openDetailDialog = (board: WalkingBoard) => {
    setSelectedBoardForDetail(board)
    setDetailDialogOpen(true)
    setMobilePanelOpen(false)
  }
  
  // 生成桥梁报告
  const generateReport = useCallback(() => {
    if (!selectedBridge || !bridgeStats) return
    
    setGeneratingReport(true)
    
    try {
      const now = new Date()
      const dateStr = now.toLocaleString('zh-CN')
      
      // 分析各孔状态
      const spanAnalysis = selectedBridge.spans.map(span => {
        const boards = span.walkingBoards
        const normal = boards.filter(b => b.status === 'normal').length
        const minor = boards.filter(b => b.status === 'minor_damage').length
        const severe = boards.filter(b => b.status === 'severe_damage').length
        const fracture = boards.filter(b => b.status === 'fracture_risk').length
        const replaced = boards.filter(b => b.status === 'replaced').length
        
        const hasRisk = fracture > 0
        const hasDamage = severe > 0
        
        // 分析栏杆和托架状态
        const railingIssues = boards.filter(b => b.railingStatus && b.railingStatus !== 'normal').length
        const bracketIssues = boards.filter(b => b.bracketStatus && b.bracketStatus !== 'normal').length
        
        return {
          spanNumber: span.spanNumber,
          spanLength: span.spanLength,
          total: boards.length,
          normal,
          minor,
          severe,
          fracture,
          replaced,
          hasRisk,
          hasDamage,
          railingIssues,
          bracketIssues,
          shelterSide: span.shelterSide
        }
      })
      
      // 识别高风险区域
      const highRiskAreas = spanAnalysis.filter(s => s.hasRisk).map(s => `第${s.spanNumber}孔`)
      const damageAreas = spanAnalysis.filter(s => s.hasDamage && !s.hasRisk).map(s => `第${s.spanNumber}孔`)
      
      // 生成走行建议
      const walkingSuggestions: string[] = []
      
      if (highRiskAreas.length > 0) {
        walkingSuggestions.push(`⚠️ 禁止通行区域：${highRiskAreas.join('、')}存在断裂风险步行板，请绕行或等待修复`)
      }
      
      if (damageAreas.length > 0) {
        walkingSuggestions.push(`⚡ 谨慎通行区域：${damageAreas.join('、')}存在严重损坏步行板，通行时请避开损坏位置`)
      }
      
      // 根据整体损坏率给出建议
      if (bridgeStats.damageRate > 30) {
        walkingSuggestions.push('🔴 当前桥梁整体损坏率较高，建议限制通行并尽快安排全面维修')
      } else if (bridgeStats.damageRate > 15) {
        walkingSuggestions.push('🟡 桥梁存在多处损坏，建议优先维修受损严重的步行板')
      } else if (bridgeStats.damageRate > 5) {
        walkingSuggestions.push('🟢 桥梁整体状况良好，建议按计划进行日常维护')
      } else {
        walkingSuggestions.push('✅ 桥梁状况优秀，可正常通行，建议保持定期检查')
      }
      
      // 避车台使用建议
      const shelterSpans = spanAnalysis.filter(s => s.shelterSide !== 'none')
      if (shelterSpans.length > 0) {
        walkingSuggestions.push(`📢 避车台位置：第${shelterSpans.map(s => s.spanNumber).join('、')}孔设有避车台，列车通过时请在此避让`)
      }
      
      // 栏杆和托架问题
      const totalRailingIssues = spanAnalysis.reduce((sum, s) => sum + s.railingIssues, 0)
      const totalBracketIssues = spanAnalysis.reduce((sum, s) => sum + s.bracketIssues, 0)
      
      if (totalRailingIssues > 0) {
        walkingSuggestions.push(`🔧 发现${totalRailingIssues}处栏杆问题，通行时请注意抓牢扶手`)
      }
      if (totalBracketIssues > 0) {
        walkingSuggestions.push(`🔧 发现${totalBracketIssues}处托架问题，建议尽快安排检修`)
      }
      
      // 生成报告内容
      const report = `# ${selectedBridge.name} 步行板安全报告

## 基本信息
- **桥梁名称**：${selectedBridge.name}
- **桥梁编号**：${selectedBridge.bridgeCode}
- **线路**：${selectedBridge.lineName || '未指定'}
- **位置**：${selectedBridge.location || '未指定'}
- **总孔数**：${selectedBridge.totalSpans}孔
- **生成时间**：${dateStr}

## 整体状况

| 指标 | 数值 |
|------|------|
| 步行板总数 | ${bridgeStats.totalBoards}块 |
| 正常 | ${bridgeStats.normalBoards}块 (${((bridgeStats.normalBoards / bridgeStats.totalBoards) * 100).toFixed(1)}%) |
| 轻微损坏 | ${bridgeStats.minorDamageBoards}块 (${((bridgeStats.minorDamageBoards / bridgeStats.totalBoards) * 100).toFixed(1)}%) |
| 严重损坏 | ${bridgeStats.severeDamageBoards}块 (${((bridgeStats.severeDamageBoards / bridgeStats.totalBoards) * 100).toFixed(1)}%) |
| 断裂风险 | ${bridgeStats.fractureRiskBoards}块 (${((bridgeStats.fractureRiskBoards / bridgeStats.totalBoards) * 100).toFixed(1)}%) |
| 已更换 | ${bridgeStats.replacedBoards}块 |
| 缺失 | ${bridgeStats.missingBoards}块 |
| 损坏率 | ${(bridgeStats.damageRate * 100).toFixed(1)}% |
| 高风险率 | ${(bridgeStats.highRiskRate * 100).toFixed(1)}% |

## 各孔详细状态

${spanAnalysis.map(s => {
  const status = s.hasRisk ? '🔴 高风险' : s.hasDamage ? '🟡 需关注' : '🟢 正常'
  return `### 第${s.spanNumber}孔 (${s.spanLength}m) ${status}
- 步行板：正常${s.normal}块 | 轻损${s.minor}块 | 重损${s.severe}块 | 断裂风险${s.fracture}块
- 附属设施：栏杆问题${s.railingIssues}处 | 托架问题${s.bracketIssues}处
- 避车台：${s.shelterSide === 'none' ? '无' : s.shelterSide === 'single' ? '单侧' : '双侧'}`
}).join('\n\n')}

## 人员作业走行建议

${walkingSuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n\n')}

## 安全提示

1. 通行前请查看本报告，了解当前桥梁步行板状态
2. 遇到断裂风险步行板时，禁止踩踏，请绕行或使用安全通道
3. 夜间或恶劣天气条件下，请特别注意步行板状态
4. 发现新的损坏情况，请及时上报

---
*本报告由铁路桥梁步行板可视化管理系统自动生成*`
      
      setReportContent(report)
      setReportDialogOpen(true)
    } catch (error) {
      console.error('生成报告失败:', error)
      toast.error('生成报告失败')
    } finally {
      setGeneratingReport(false)
    }
  }, [selectedBridge, bridgeStats])

  // 获取步行板按位置和列分组
  const getBoardsByPosition = (span: BridgeSpan) => {
    const upstream = span.walkingBoards
      .filter(b => b.position === 'upstream')
      .sort((a, b) => a.columnIndex - b.columnIndex || a.boardNumber - b.boardNumber)
    const downstream = span.walkingBoards
      .filter(b => b.position === 'downstream')
      .sort((a, b) => a.columnIndex - b.columnIndex || a.boardNumber - b.boardNumber)
    const shelterLeft = span.walkingBoards
      .filter(b => b.position === 'shelter_left')
      .sort((a, b) => a.boardNumber - b.boardNumber)
    const shelterRight = span.walkingBoards
      .filter(b => b.position === 'shelter_right')
      .sort((a, b) => a.boardNumber - b.boardNumber)
    // 兼容旧数据
    const shelterOld = span.walkingBoards
      .filter(b => b.position === 'shelter')
      .sort((a, b) => a.boardNumber - b.boardNumber)

    const groupByColumn = (boards: WalkingBoard[], columns: number) => {
      const groups: WalkingBoard[][] = []
      for (let i = 1; i <= columns; i++) {
        groups.push(boards.filter(b => b.columnIndex === i))
      }
      return groups
    }

    return {
      upstream,
      downstream,
      shelterLeft,
      shelterRight,
      shelterOld,
      upstreamColumns: groupByColumn(upstream, span.upstreamColumns),
      downstreamColumns: groupByColumn(downstream, span.downstreamColumns)
    }
  }

  // 计算预警信息
  const getAlertInfo = () => {
    if (!bridgeStats) return null
    
    const alerts: { level: 'danger' | 'warning' | 'info'; message: string; count: number }[] = []
    
    if (bridgeStats.fractureRiskBoards > 0) {
      alerts.push({
        level: 'danger',
        message: '存在断裂风险步行板，禁止通行！',
        count: bridgeStats.fractureRiskBoards
      })
    }
    
    if (bridgeStats.severeDamageBoards > 0) {
      alerts.push({
        level: 'warning',
        message: '存在严重损坏步行板，需立即维修',
        count: bridgeStats.severeDamageBoards
      })
    }
    
    if (bridgeStats.minorDamageBoards > 0) {
      alerts.push({
        level: 'info',
        message: '存在轻微损坏步行板，建议检查',
        count: bridgeStats.minorDamageBoards
      })
    }
    
    return alerts
  }

  // 获取状态颜色类名
  const getStatusColorClass = (status: string) => {
    const config = BOARD_STATUS_CONFIG[status as keyof typeof BOARD_STATUS_CONFIG] || BOARD_STATUS_CONFIG.normal
    return {
      bg: config.bgColor,
      border: config.borderColor,
      color: config.color
    }
  }

  // 渲染Markdown简单解析
  const renderMarkdownText = (text: string) => {
    return text.split('\n').map((line, i) => {
      // 标题
      if (line.startsWith('## ')) {
        return <h2 key={i} className={`text-lg font-bold mt-4 mb-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>{line.slice(3)}</h2>
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className={`text-base font-bold mt-3 mb-1 ${theme === 'night' ? 'text-cyan-300' : 'text-blue-500'}`}>{line.slice(4)}</h3>
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className={`font-bold ${theme === 'night' ? 'text-cyan-300' : 'text-blue-600'}`}>{line.slice(2, -2)}</p>
      }
      // 列表
      if (line.startsWith('- ')) {
        return <p key={i} className={`ml-2 ${theme === 'night' ? 'text-slate-300' : 'text-gray-600'}`}>• {line.slice(2)}</p>
      }
      if (line.match(/^\d+\./)) {
        return <p key={i} className={`ml-2 ${theme === 'night' ? 'text-slate-300' : 'text-gray-600'}`}>{line}</p>
      }
      // 空行
      if (line.trim() === '') {
        return <div key={i} className="h-2" />
      }
      return <p key={i} className={theme === 'night' ? 'text-slate-300' : 'text-gray-600'}>{line}</p>
    })
  }

  // 渲染单个步行板块
  const renderBoardButton = (board: WalkingBoard, posLabel: string) => {
    const config = BOARD_STATUS_CONFIG[board.status as keyof typeof BOARD_STATUS_CONFIG] || BOARD_STATUS_CONFIG.normal
    return (
      <button
        key={board.id}
        onClick={() => { if (hasPermission('board:write')) openEditDialog(board) }}
        className="relative group"
        style={{
          width: '40px',
          height: '50px',
          background: config.bgColor,
          border: `2px solid ${config.borderColor}`,
          borderRadius: '4px',
          transition: 'all 0.3s ease',
          boxShadow: board.status === 'fracture_risk' 
            ? '0 0 15px rgba(239, 68, 68, 0.5)' 
            : board.status === 'severe_damage'
            ? '0 0 10px rgba(249, 115, 22, 0.4)'
            : 'none'
        }}
      >
        <div 
          className="absolute inset-1"
          style={{
            background: `repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 6px)`
          }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: config.color }}>
          {board.boardNumber}
        </span>
        
        <div 
          className={`absolute -top-20 left-1/2 -translate-x-1/2 z-50 hidden group-hover:block w-48 p-3 rounded-lg border text-xs ${theme === 'night' ? 'bg-slate-900/95 border-cyan-500/30' : 'bg-white/95 border-blue-200'}`}
          style={{ transform: 'translateZ(100px) rotateX(-55deg)', boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`font-semibold ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>{posLabel} {board.boardNumber}号</span>
            <Badge style={{ background: config.bgColor, color: config.color, border: `1px solid ${config.borderColor}` }}>
              {config.label}
            </Badge>
          </div>
          {board.damageDesc && <div className="text-red-400 mb-1">{board.damageDesc}</div>}
          {board.hasObstacle && <div className="text-yellow-400">⚠ 有杂物: {board.obstacleDesc}</div>}
          {board.hasWaterAccum && <div className="text-blue-400">💧 积水: {board.waterAccumDepth}cm</div>}
          {board.antiSlipLevel !== null && board.antiSlipLevel < 80 && <div className="text-orange-400">防滑等级: {board.antiSlipLevel}%</div>}
          {board.inspectedBy && <div className={`mt-1 ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>检查人: {board.inspectedBy}</div>}
        </div>
      </button>
    )
  }

  // 渲染避车台
  const renderShelter = (boards: WalkingBoard[], side: 'left' | 'right', maxPeople: number) => {
    if (boards.length === 0) return null
    const posLabel = side === 'left' ? '左侧避车台' : '右侧避车台'
    
    return (
      <div 
        className={`absolute ${side === 'left' ? '-left-20' : '-right-20'} top-1/2 -translate-y-1/2`}
        style={{ transform: 'translateZ(30px)' }}
      >
        <div 
          className="p-2 rounded-lg"
          style={{ 
            background: theme === 'night' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)', 
            border: `2px solid ${theme === 'night' ? 'rgba(139, 92, 246, 0.5)' : 'rgba(139, 92, 246, 0.3)'}`, 
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' 
          }}
        >
          <div className={`text-xs font-bold mb-1 flex items-center gap-1 ${theme === 'night' ? 'text-purple-400' : 'text-purple-600'}`}>
            <ShieldAlert className="w-3 h-3" />{posLabel}
          </div>
          <div className="flex gap-1 flex-wrap max-w-24">
            {boards.map((board) => {
              const config = BOARD_STATUS_CONFIG[board.status as keyof typeof BOARD_STATUS_CONFIG] || BOARD_STATUS_CONFIG.normal
              return (
                <button
                  key={board.id}
                  onClick={() => { if (hasPermission('board:write')) openEditDialog(board) }}
                  className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                  style={{ background: config.bgColor, border: `1px solid ${config.borderColor}`, color: config.color }}
                >
                  {board.boardNumber}
                </button>
              )
            })}
          </div>
          <div className={`text-xs mt-1 ${theme === 'night' ? 'text-purple-300' : 'text-purple-500'}`}>
            <Users className="w-3 h-3 inline mr-1" />限{maxPeople}人
          </div>
        </div>
      </div>
    )
  }

  // 渲染3D桥梁视图 - 使用增强的Three.js场景
  const render3DBridge = () => {
    if (!selectedBridge) return null
    
    const currentSpan = selectedBridge.spans[selectedSpanIndex]
    if (!currentSpan) return null
    
    // 准备3D组件需要的数据
    const spanDataFor3D = {
      spanNumber: currentSpan.spanNumber,
      spanLength: currentSpan.spanLength,
      upstreamBoards: currentSpan.upstreamBoards,
      downstreamBoards: currentSpan.downstreamBoards,
      upstreamColumns: currentSpan.upstreamColumns,
      downstreamColumns: currentSpan.downstreamColumns,
      shelterSide: currentSpan.shelterSide || 'none',
      shelterBoards: currentSpan.shelterBoards || 0,
      shelterMaxPeople: currentSpan.shelterMaxPeople || 4,
      walkingBoards: currentSpan.walkingBoards.map(board => ({
        id: board.id,
        boardNumber: board.boardNumber,
        position: board.position,
        columnIndex: board.columnIndex,
        status: board.status,
        damageDesc: board.damageDesc,
        inspectedBy: board.inspectedBy,
        inspectedAt: board.inspectedAt
      }))
    }
    
    return (
      <HomeBridge3D 
        span={spanDataFor3D}
        theme={theme}
        onBoardClick={(board) => {
          if (!hasPermission('board:write')) return
          const fullBoard = currentSpan.walkingBoards.find(b => b.id === board.id)
          if (fullBoard) {
            openEditDialog(fullBoard)
          }
        }}
      />
    )
  }

  // 渲染2D桥梁视图 — 竖线并排布局
  const render2DBridge = () => {
    if (!selectedBridge) return null

    const currentSpan = selectedBridge.spans[selectedSpanIndex]
    if (!currentSpan) return null

    const { shelterLeft, shelterRight, shelterOld, upstreamColumns, downstreamColumns } = getBoardsByPosition(currentSpan)
    const materialConfig = BOARD_MATERIAL_CONFIG[currentSpan.boardMaterial] || BOARD_MATERIAL_CONFIG.galvanized_steel

    // 计算上下行最大行数，用于对齐
    const upstreamMaxRows = upstreamColumns.length > 0 ? Math.max(...upstreamColumns.map(c => c.length)) : 0
    const downstreamMaxRows = downstreamColumns.length > 0 ? Math.max(...downstreamColumns.map(c => c.length)) : 0
    const maxRows = Math.max(upstreamMaxRows, downstreamMaxRows)

    // 上行避车台步行板（shelterLeft 或兼容旧数据 shelterOld）
    const upstreamShelter = shelterLeft.length > 0 ? shelterLeft : (shelterRight.length === 0 ? shelterOld : [])
    // 下行避车台步行板
    const downstreamShelter = shelterRight.length > 0 ? shelterRight : []

    // 本孔实时统计
    const totalBoards = currentSpan.walkingBoards.length
    const damagedBoards = currentSpan.walkingBoards.filter(b => b.status !== 'normal' && b.status !== 'replaced').length
    const damageRate = totalBoards > 0 ? damagedBoards / totalBoards : 0
    const isHighDamage = damageRate > 0.1

    // 位置中文标签
    const posLabelMap: Record<string, string> = {
      upstream: '上行', downstream: '下行',
      shelter_left: '上行避车台', shelter_right: '下行避车台', shelter: '避车台'
    }

    // 渲染单块步行板按钮（含悬停气泡）
    const renderBoardBtn = (board: WalkingBoard) => {
      const colors = getStatusColorClass(board.status)
      const isSelected = selectedBoards.includes(board.id)
      const statusCfg = BOARD_STATUS_CONFIG[board.status as keyof typeof BOARD_STATUS_CONFIG] || BOARD_STATUS_CONFIG.normal
      const posLabel = posLabelMap[board.position] || board.position
      // 高危过滤：如果不是高危状态且开启了过滤，则置灰
      const isHighRisk = board.status === 'severe_damage' || board.status === 'fracture_risk'
      const isFiltered = highRiskFilter && !isHighRisk
      
      return (
        <HoverCard key={board.id} openDelay={200}>
          <HoverCardTrigger asChild>
            <button
              onClick={() => { if (hasPermission('board:write')) { batchMode ? toggleBoardSelection(board.id) : openEditDialog(board) } }}
              className={`board-cell-2d relative w-11 h-9 rounded flex items-center justify-center text-[14px] font-bold transition-all hover:scale-110 ${isSelected ? 'ring-2 ring-purple-500 ring-offset-1' : ''} ${board.status === 'fracture_risk' ? 'fracture-border-blink' : ''} ${isFiltered ? 'opacity-30' : ''}`}
              style={{ background: isFiltered ? 'rgba(107, 114, 128, 0.2)' : colors.bg, border: `${board.status === 'fracture_risk' ? '3px' : '2px'} solid ${isFiltered ? 'rgba(107, 114, 128, 0.3)' : colors.border}`, color: isFiltered ? '#6b7280' : colors.color, boxShadow: (board.status === 'fracture_risk' && !isFiltered) ? '0 0 12px rgba(239, 68, 68, 0.5)' : 'none' }}
            >
              {batchMode && (
                <div className="absolute -top-1 -left-1">
                  {isSelected ? (
                    <CheckSquare className="w-3 h-3 text-purple-500" />
                  ) : (
                    <Square className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              )}
              {board.boardNumber}
            </button>
          </HoverCardTrigger>
          <HoverCardContent side="top" className={`w-52 p-3 text-xs ${theme === 'night' ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'}`} sideOffset={4}>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={`font-bold ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>{posLabel} {board.columnIndex}列 {board.boardNumber}号</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color }}>{statusCfg.label}</span>
              </div>
              {board.inspectedBy && (
                <div className={`flex items-center gap-1.5 ${theme === 'night' ? 'text-slate-300' : 'text-gray-600'}`}>
                  <Users className="w-3 h-3 flex-shrink-0" />
                  <span>{board.inspectedBy}</span>
                </div>
              )}
              {board.inspectedAt && (
                <div className={`flex items-center gap-1.5 ${theme === 'night' ? 'text-slate-300' : 'text-gray-600'}`}>
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span>{new Date(board.inspectedAt).toLocaleString('zh-CN')}</span>
                </div>
              )}
              {board.damageDesc && (
                <div className={`pt-1 border-t ${theme === 'night' ? 'border-slate-700 text-orange-300' : 'border-gray-100 text-orange-600'}`}>
                  {board.damageDesc}
                </div>
              )}
            </div>
          </HoverCardContent>
        </HoverCard>
      )
    }

    // 渲染避车台
    const renderShelter = (boards: WalkingBoard[], label: string, maxPeople: number) => {
      if (boards.length === 0) return null
      return (
        <div
          className="mt-2 p-1.5 rounded-lg"
          style={{
            background: theme === 'night' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)',
            border: `2px dashed ${theme === 'night' ? '#a78bfa' : '#8b5cf6'}`
          }}
        >
          <div className={`text-[10px] font-bold mb-1 flex items-center gap-1 ${theme === 'night' ? 'text-purple-400' : 'text-purple-600'}`}>
            <ShieldAlert className="w-3 h-3" />
            <span title={`限${maxPeople}人，禁止集中避车`}>{label} (限{maxPeople}人)</span>
          </div>
          <div className="flex flex-wrap gap-0.5">
            {boards.map((board) => {
              const colors = getStatusColorClass(board.status)
              const isSelected = selectedBoards.includes(board.id)
              // 高危过滤
              const isHighRisk = board.status === 'severe_damage' || board.status === 'fracture_risk'
              const isFiltered = highRiskFilter && !isHighRisk
              
              return (
                <button
                  key={board.id}
                  onClick={() => { if (hasPermission('board:write')) { batchMode ? toggleBoardSelection(board.id) : openEditDialog(board) } }}
                  className={`w-11 h-9 rounded flex items-center justify-center text-[14px] font-bold transition-all hover:scale-110 relative ${board.status === 'fracture_risk' ? 'fracture-border-blink' : ''} ${isSelected ? 'ring-2 ring-purple-500 ring-offset-1' : ''} ${isFiltered ? 'opacity-30' : ''}`}
                  style={{ background: isFiltered ? 'rgba(107, 114, 128, 0.2)' : colors.bg, border: `${board.status === 'fracture_risk' ? '3px' : '2px'} solid ${isFiltered ? 'rgba(107, 114, 128, 0.3)' : colors.border}`, color: isFiltered ? '#6b7280' : colors.color, boxShadow: (board.status === 'fracture_risk' && !isFiltered) ? '0 0 12px rgba(239, 68, 68, 0.5)' : 'none' }}
                >
                  {batchMode && (
                    <div className="absolute -top-1 -left-1">
                      {isSelected ? (
                        <CheckSquare className="w-3 h-3 text-purple-500" />
                      ) : (
                        <Square className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  )}
                  {board.boardNumber}
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    // 计算单孔最大行数
    const getSpanMaxRows = (span: BridgeSpan) => {
      const { upstreamColumns, downstreamColumns } = getBoardsByPosition(span)
      const uMax = upstreamColumns.length > 0 ? Math.max(...upstreamColumns.map(c => c.length)) : 0
      const dMax = downstreamColumns.length > 0 ? Math.max(...downstreamColumns.map(c => c.length)) : 0
      return Math.max(uMax, dMax)
    }

    // ==================== 整桥模式（每孔完整三栏布局，竖向堆叠） ====================
    if (bridgeViewMode === 'full') {
      const allBoards = selectedBridge.spans.flatMap(s => s.walkingBoards)
      const totalBoards = allBoards.length
      const damagedBoards = allBoards.filter(b => b.status !== 'normal' && b.status !== 'replaced').length
      const damageRate = totalBoards > 0 ? damagedBoards / totalBoards : 0
      const isHighDamage = damageRate > 0.1

      return (
        <div 
          ref={fullBridgeScrollRef}
          className={`bridge-2d-container w-full h-full flex flex-col items-center p-4 overflow-auto ${theme === 'night' ? '' : 'bg-gray-50'}`}
        >
          {/* 桥梁名称 + 整桥统计 */}
          <div className="text-center mb-2 sticky top-0 z-10 bg-inherit py-1">
            <span className={`text-lg font-bold ${theme === 'night' ? 'text-cyan-400 text-glow-cyan' : 'text-blue-600'}`}>{selectedBridge.name}</span>
            <span className={`text-sm ml-2 ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>({selectedBridge.spans.length}孔)</span>
          </div>
          <div className={`w-full max-w-4xl mb-3 p-2 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-center gap-4 text-xs">
              <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>总板数 <b className={theme === 'night' ? 'text-white' : 'text-gray-900'}>{totalBoards}</b></span>
              <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>损坏 <b className={damagedBoards > 0 ? (isHighDamage ? 'text-red-500' : 'text-orange-500') : (theme === 'night' ? 'text-green-400' : 'text-green-600')}>{damagedBoards}</b></span>
              <span className={`px-2 py-0.5 rounded font-bold ${isHighDamage ? (theme === 'night' ? 'bg-red-500/30 text-red-400' : 'bg-red-100 text-red-600') : damagedBoards > 0 ? (theme === 'night' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600') : (theme === 'night' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600')}`}>
                损坏率 {(damageRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* 风险热力图 */}
          <div className={`w-full max-w-4xl mb-3 p-3 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
            <div className="text-xs font-bold mb-2 flex items-center gap-2">
              <Activity className={`w-4 h-4 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-500'}`} />
              <span className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>风险热力图</span>
            </div>
            <div className="flex gap-1 h-8 items-center">
              {selectedBridge.spans.map((span, idx) => {
                const spanDamaged = span.walkingBoards.filter(b => b.status !== 'normal' && b.status !== 'replaced' && b.status !== 'missing').length
                const spanTotal = span.walkingBoards.filter(b => b.status !== 'replaced' && b.status !== 'missing').length
                const rate = spanTotal > 0 ? spanDamaged / spanTotal : 0
                const hasRisk = span.walkingBoards.some(b => b.status === 'fracture_risk')
                // 根据损坏率决定颜色深浅
                const heatColor = hasRisk 
                  ? `rgba(239, 68, 68, ${0.3 + rate * 0.7})`
                  : rate > 0.1 
                    ? `rgba(249, 115, 22, ${0.2 + rate * 0.6})`
                    : rate > 0 
                      ? `rgba(234, 179, 8, ${0.1 + rate * 0.5})`
                      : 'rgba(34, 197, 94, 0.2)'
                return (
                  <button
                    key={span.id}
                    onClick={() => scrollToSpan(idx)}
                    className="flex-1 h-full rounded transition-all hover:scale-105 relative group"
                    style={{ background: heatColor, minWidth: '20px' }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
                      {span.spanNumber}
                    </span>
                    <div className={`absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block px-2 py-1 rounded text-[10px] whitespace-nowrap z-20 ${theme === 'night' ? 'bg-slate-700 text-white' : 'bg-gray-800 text-white'}`}>
                      第{span.spanNumber}孔: {(rate * 100).toFixed(0)}%
                    </div>
                  </button>
                )
              })}
              {/* 图例 */}
              <div className="ml-3 flex items-center gap-2 text-[10px]">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: 'rgba(34, 197, 94, 0.2)' }} />
                  <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>正常</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: 'rgba(234, 179, 8, 0.5)' }} />
                  <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>轻微</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: 'rgba(249, 115, 22, 0.6)' }} />
                  <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>严重</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: 'rgba(239, 68, 68, 0.7)' }} />
                  <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>断裂</span>
                </div>
              </div>
            </div>
          </div>

          {/* 每孔竖向堆叠，每孔独立三栏布局 */}
          <div className="w-full max-w-4xl space-y-2">
            {selectedBridge.spans.map((span, spanIdx) => {
              const { upstreamColumns, downstreamColumns, shelterLeft, shelterRight, shelterOld } = getBoardsByPosition(span)
              const maxRows = getSpanMaxRows(span)
              const upstreamShelter = shelterLeft.length > 0 ? shelterLeft : (shelterRight.length === 0 ? shelterOld : [])
              const downstreamShelter = shelterRight.length > 0 ? shelterRight : []
              const isActive = spanIdx === visibleSpanIndex
              const spanTotalBoards = span.walkingBoards.length
              const spanDamaged = span.walkingBoards.filter(b => b.status !== 'normal' && b.status !== 'replaced').length
              const spanDamageRate = spanTotalBoards > 0 ? spanDamaged / spanTotalBoards : 0
              const spanHighDamage = spanDamageRate > 0.1
              const hasRisk = span.walkingBoards.some(b => b.status === 'fracture_risk')
              const hasUpstreamShelter = upstreamShelter.length > 0
              const hasDownstreamShelter = downstreamShelter.length > 0
              const spanHeight = maxRows * 38
              const sleeperSpacing = 19
              const sleeperCount = Math.max(1, Math.floor(spanHeight / sleeperSpacing))

              return (
                <div
                  key={span.id}
                  ref={el => { spanRefs.current[spanIdx] = el }}
                  data-span-index={spanIdx}
                  onClick={() => setSelectedSpanIndex(spanIdx)}
                  className={`w-full text-left p-3 rounded-lg transition-all relative cursor-pointer ${isActive ? (theme === 'night' ? 'bg-slate-800/60 ring-2 ring-cyan-500/50' : 'bg-blue-50 ring-2 ring-blue-300') : (theme === 'night' ? 'bg-slate-900/30 hover:bg-slate-800/40' : 'bg-gray-50 hover:bg-gray-100')}`}
                >
                  {/* 孔标题 + 统计 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isActive ? (theme === 'night' ? 'text-cyan-400' : 'text-blue-600') : (theme === 'night' ? 'text-slate-400' : 'text-gray-500')}`}>
                        第{span.spanNumber}孔
                      </span>
                      <span className={`text-xs ${theme === 'night' ? 'text-slate-500' : 'text-gray-400'}`}>({span.spanLength}m)</span>
                      {hasRisk && <span className="text-red-500 text-xs font-bold">⚠ 断裂风险</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>{spanTotalBoards}块</span>
                      {spanDamaged > 0 && (
                        <span className={`px-1.5 py-0.5 rounded font-bold ${spanHighDamage ? (theme === 'night' ? 'bg-red-500/30 text-red-400' : 'bg-red-100 text-red-600') : (theme === 'night' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600')}`}>
                          损坏率 {(spanDamageRate * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 三栏布局：上行 | 轨道 | 下行 */}
                  <div className="flex flex-row items-stretch gap-1">
                    {/* 上行步行板 */}
                    <div className="flex-1">
                      <div className={`text-[10px] mb-1 flex items-center gap-1 ${theme === 'night' ? 'text-blue-400' : 'text-blue-600'}`}>
                        <Navigation className="w-3 h-3" />上行
                      </div>
                      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${span.upstreamColumns}, 1fr)` }}>
                        {upstreamColumns.map((column, colIdx) => (
                          <div key={colIdx} className="flex flex-col gap-0.5">
                            {Array.from({ length: maxRows }).map((_, rowIdx) => {
                              const board = column[rowIdx]
                              return board ? renderBoardBtn(board) : <div key={`fu-${rowIdx}`} className="w-11 h-9" />
                            })}
                          </div>
                        ))}
                      </div>
                      {renderShelter(upstreamShelter, '上行避车台', span.shelterMaxPeople)}
                    </div>

                    {/* 轨道 */}
                    <div className="flex flex-col items-center flex-shrink-0" style={{ width: '18%' }}>
                      <div className="h-4 mb-1 flex items-center justify-center w-full">
                        <Train className={`w-3 h-3 ${theme === 'night' ? 'text-slate-500' : 'text-gray-400'}`} />
                      </div>
                      <div className="relative w-full">
                        {/* 步行板区域对应轨道 */}
                        <div className="relative w-full" style={{ height: spanHeight }}>
                          <div className="absolute left-1 top-0 bottom-0 w-1.5 rounded-sm" style={{ background: '#333333' }} />
                          <div className="absolute right-1 top-0 bottom-0 w-1.5 rounded-sm" style={{ background: '#333333' }} />
                          {Array.from({ length: sleeperCount }).map((_, si) => (
                            <div
                              key={si}
                              className="absolute rounded-[1px]"
                              style={{
                                top: (si + 0.5) * sleeperSpacing,
                                left: '6px',
                                right: '6px',
                                height: '5px',
                                background: hasRisk
                                  ? (theme === 'night' ? 'rgba(139,69,19,0.5)' : 'rgba(139,69,19,0.45)')
                                  : (theme === 'night' ? 'rgba(139,69,19,0.4)' : 'rgba(139,69,19,0.35)')
                              }}
                            />
                          ))}
                          <span
                            className={`absolute z-10 font-bold ${isActive ? (theme === 'night' ? 'text-cyan-400' : 'text-blue-600') : (theme === 'night' ? 'text-slate-500' : 'text-gray-400')}`}
                            style={{
                              writingMode: 'vertical-rl',
                              fontSize: '10px',
                              letterSpacing: '2px',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              textShadow: theme === 'night' ? '0 0 4px rgba(0,0,0,0.8)' : '0 0 4px rgba(255,255,255,0.9)'
                            }}
                          >
                            {span.spanNumber}孔
                          </span>
                        </div>
                        {/* 避车台区域对应轨道延伸 */}
                        {(hasUpstreamShelter || hasDownstreamShelter) && (
                          <div className="relative w-full mt-2" style={{ height: 50 }}>
                            <div className="absolute left-1 top-0 bottom-0 w-1.5 rounded-sm" style={{ background: '#333333' }} />
                            <div className="absolute right-1 top-0 bottom-0 w-1.5 rounded-sm" style={{ background: '#333333' }} />
                            {Array.from({ length: 2 }).map((_, si) => (
                              <div
                                key={si}
                                className="absolute rounded-[1px]"
                                style={{
                                  top: (si + 0.5) * 19,
                                  left: '6px',
                                  right: '6px',
                                  height: '5px',
                                  background: theme === 'night' ? 'rgba(139,69,19,0.4)' : 'rgba(139,69,19,0.35)'
                                }}
                              />
                            ))}
                            <span
                              className={`absolute z-10 font-bold ${theme === 'night' ? 'text-purple-400' : 'text-purple-600'}`}
                              style={{
                                writingMode: 'vertical-rl',
                                fontSize: '9px',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textShadow: theme === 'night' ? '0 0 4px rgba(0,0,0,0.8)' : '0 0 4px rgba(255,255,255,0.9)'
                              }}
                            >
                              避车台
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 下行步行板 */}
                    <div className="flex-1">
                      <div className={`text-[10px] mb-1 flex items-center gap-1 ${theme === 'night' ? 'text-green-400' : 'text-green-600'}`}>
                        <Navigation className="w-3 h-3 rotate-180" />下行
                      </div>
                      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${span.downstreamColumns}, 1fr)` }}>
                        {downstreamColumns.map((column, colIdx) => (
                          <div key={colIdx} className="flex flex-col gap-0.5">
                            {Array.from({ length: maxRows }).map((_, rowIdx) => {
                              const board = column[rowIdx]
                              return board ? renderBoardBtn(board) : <div key={`fd-${rowIdx}`} className="w-11 h-9" />
                            })}
                          </div>
                        ))}
                      </div>
                      {renderShelter(downstreamShelter, '下行避车台', span.shelterMaxPeople)}
                    </div>
                  </div>

                  {/* 高损坏率红色遮罩 */}
                  {spanHighDamage && (
                    <div className="absolute inset-0 rounded-lg pointer-events-none border-2 border-red-500/40" style={{ background: 'rgba(239, 68, 68, 0.06)' }}>
                      <div className="absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold bg-red-500/80 text-white pointer-events-none">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />损坏率 &gt;10%
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 孔位快速跳转栏 */}
          <div className={`sticky bottom-0 mt-4 w-full max-w-4xl p-3 rounded-lg ${theme === 'night' ? 'bg-slate-800/90 border border-slate-700/50 backdrop-blur-sm' : 'bg-white/90 border border-gray-200 backdrop-blur-sm'}`}>
            {/* 快速跳转按钮 */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <button
                onClick={() => scrollToSpan(0)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${theme === 'night' ? 'bg-cyan-600/30 text-cyan-300 hover:bg-cyan-600/50' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
              >
                第1孔
              </button>
              {selectedBridge.spans.length >= 5 && (
                <button
                  onClick={() => scrollToSpan(4)}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${theme === 'night' ? 'bg-cyan-600/30 text-cyan-300 hover:bg-cyan-600/50' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                >
                  第5孔
                </button>
              )}
              <button
                onClick={() => scrollToSpan(selectedBridge.spans.length - 1)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${theme === 'night' ? 'bg-cyan-600/30 text-cyan-300 hover:bg-cyan-600/50' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
              >
                最后1孔
              </button>
            </div>
            {/* 孔号选择器 */}
            <div className="flex items-center justify-center gap-1 flex-wrap">
              {selectedBridge.spans.map((span, idx) => {
                const isActive = idx === visibleSpanIndex
                const hasRisk = span.walkingBoards.some(b => b.status === 'fracture_risk')
                const hasDamage = span.walkingBoards.some(b => b.status === 'severe_damage' || b.status === 'minor_damage')
                return (
                  <button
                    key={span.id}
                    onClick={() => scrollToSpan(idx)}
                    className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${isActive ? (theme === 'night' ? 'bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-500/50' : 'bg-blue-500 text-white') : hasRisk ? (theme === 'night' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-600 hover:bg-red-200') : hasDamage ? (theme === 'night' ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : 'bg-orange-100 text-orange-600 hover:bg-orange-200') : (theme === 'night' ? 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}`}
                  >
                    {span.spanNumber}孔
                  </button>
                )
              })}
            </div>
          </div>

          {/* 图例 */}
          <div className="mt-3 flex flex-wrap gap-3 justify-center">
            {Object.entries(BOARD_STATUS_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1 text-xs">
                <div className="w-4 h-4 rounded" style={{ background: config.bgColor, border: `1px solid ${config.borderColor}` }} />
                <span style={{ color: config.color }}>{config.label}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    // ==================== 单孔模式（默认） ====================
    return (
      <div className={`bridge-2d-container w-full h-full flex flex-col items-center p-4 overflow-auto ${theme === 'night' ? '' : 'bg-gray-50'}`}>
        {/* 标题 */}
        <div className="text-center mb-3">
          <span className={`text-xl font-bold ${theme === 'night' ? 'text-cyan-400 text-glow-cyan' : 'text-blue-600'}`}>第{currentSpan.spanNumber}孔</span>
          <span className={`text-sm ml-2 ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>({currentSpan.spanLength}m)</span>
        </div>

        {/* 材质信息 + 本孔统计 */}
        <div className={`w-full max-w-4xl mb-3 p-3 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <Ruler className={`w-4 h-4 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-500'}`} />
                <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>尺寸: {(() => { const sizes = currentSpan.walkingBoards.map(b => `${b.boardLength || 100}×${b.boardWidth || 50}×${b.boardThickness || 5}`); const unique = [...new Set(sizes)]; return unique.length === 1 ? unique[0] + 'cm' : '多种'; })()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Palette className={`w-4 h-4 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-500'}`} />
                <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>材质: {materialConfig.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>总板数 <b className={theme === 'night' ? 'text-white' : 'text-gray-900'}>{totalBoards}</b></span>
              <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>损坏 <b className={damagedBoards > 0 ? (isHighDamage ? 'text-red-500' : 'text-orange-500') : (theme === 'night' ? 'text-green-400' : 'text-green-600')}>{damagedBoards}</b></span>
              <span className={`px-2 py-0.5 rounded font-bold ${isHighDamage ? (theme === 'night' ? 'bg-red-500/30 text-red-400' : 'bg-red-100 text-red-600') : damagedBoards > 0 ? (theme === 'night' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600') : (theme === 'night' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600')}`}>
                损坏率 {(damageRate * 100).toFixed(1)}%
              </span>
              {isHighDamage && (
                <span className="flex items-center gap-1 text-red-500 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />高危
                </span>
              )}
              {/* 仅显示高危按钮 */}
              <button
                onClick={() => setHighRiskFilter(!highRiskFilter)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all ${highRiskFilter ? (theme === 'night' ? 'bg-red-500/30 text-red-300 ring-1 ring-red-500/50' : 'bg-red-100 text-red-600 ring-1 ring-red-300') : (theme === 'night' ? 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {highRiskFilter ? '显示全部' : '仅显示高危'}
              </button>
            </div>
          </div>
        </div>

        {/* 三栏竖线并排布局：上行 | 轨道 | 下行 */}
        <div className="w-full max-w-4xl relative">
          {/* 高损坏率红色遮罩 */}
          {isHighDamage && (
            <div className="absolute inset-0 rounded-lg pointer-events-none z-20 border-2 border-red-500/40" style={{ background: 'rgba(239, 68, 68, 0.06)' }}>
              <div className="absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold bg-red-500/80 text-white z-30">
                <AlertTriangle className="w-3 h-3 inline mr-1" />损坏率 &gt;10% 注意安全
              </div>
            </div>
          )}
        <div className="flex flex-row items-stretch gap-1">

          {/* ===== 左栏：上行步行板 + 上行避车台 ===== */}
          <div className="flex-1 flex flex-col">
            <div className={`text-xs mb-2 flex items-center gap-2 ${theme === 'night' ? 'text-blue-400' : 'text-blue-600'}`}>
              <Navigation className="w-4 h-4" />上行步行板
            </div>
            {/* 各列竖向排列 */}
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${currentSpan.upstreamColumns}, 1fr)` }}>
              {upstreamColumns.map((column, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-0.5">
                  {Array.from({ length: maxRows }).map((_, rowIdx) => {
                    const board = column[rowIdx]
                    return board ? renderBoardBtn(board) : (
                      <div key={`empty-${rowIdx}`} className="w-11 h-9" />
                    )
                  })}
                </div>
              ))}
            </div>

            {/* 上行避车台 */}
            {renderShelter(upstreamShelter, '上行避车台', currentSpan.shelterMaxPeople)}
          </div>

          {/* ===== 中栏：轨道（仅当前孔） ===== */}
          <div className="flex flex-col items-center flex-shrink-0" style={{ width: '18%' }}>
            {/* 标题行占位，与左右栏标题对齐 */}
            <div className="h-5 mb-2 flex items-center justify-center w-full">
              <Train className={`w-3.5 h-3.5 ${theme === 'night' ? 'text-slate-400' : 'text-gray-400'}`} />
            </div>

            {/* 轨道主体 — 仅当前孔 */}
            {(() => {
              const span = currentSpan
              const hasRisk = span.walkingBoards.some(b => b.status === 'fracture_risk')
              const spanHeight = maxRows * 38
              const sleeperSpacing = 19
              const sleeperCount = Math.max(1, Math.floor(spanHeight / sleeperSpacing))
              const hasUpstreamShelter = upstreamShelter.length > 0
              const hasDownstreamShelter = downstreamShelter.length > 0

              return (
                <div className="relative w-full flex flex-col">
                  {/* 步行板区域对应轨道 */}
                  <div className="relative w-full" style={{ height: spanHeight }}>
                    <div className="absolute left-1 top-0 bottom-0 w-1.5 rounded-sm" style={{ background: '#333333' }} />
                    <div className="absolute right-1 top-0 bottom-0 w-1.5 rounded-sm" style={{ background: '#333333' }} />
                    {Array.from({ length: sleeperCount }).map((_, si) => (
                      <div
                        key={si}
                        className="absolute rounded-[1px]"
                        style={{
                          top: (si + 0.5) * sleeperSpacing,
                          left: '6px',
                          right: '6px',
                          height: '5px',
                          background: hasRisk
                            ? (theme === 'night' ? 'rgba(139,69,19,0.5)' : 'rgba(139,69,19,0.45)')
                            : (theme === 'night' ? 'rgba(139,69,19,0.4)' : 'rgba(139,69,19,0.35)')
                        }}
                      />
                    ))}
                    <span
                      className={`absolute z-10 font-bold ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}
                      style={{
                        writingMode: 'vertical-rl',
                        fontSize: '10px',
                        letterSpacing: '2px',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textShadow: theme === 'night' ? '0 0 4px rgba(0,0,0,0.8)' : '0 0 4px rgba(255,255,255,0.9)'
                      }}
                    >
                      {span.spanNumber}孔
                    </span>
                  </div>

                  {/* 避车台区域对应轨道延伸 */}
                  {(hasUpstreamShelter || hasDownstreamShelter) && (
                    <div className="relative w-full mt-2" style={{ height: 50 }}>
                      <div className="absolute left-1 top-0 bottom-0 w-1.5 rounded-sm" style={{ background: '#333333' }} />
                      <div className="absolute right-1 top-0 bottom-0 w-1.5 rounded-sm" style={{ background: '#333333' }} />
                      {Array.from({ length: 2 }).map((_, si) => (
                        <div
                          key={si}
                          className="absolute rounded-[1px]"
                          style={{
                            top: (si + 0.5) * 19,
                            left: '6px',
                            right: '6px',
                            height: '5px',
                            background: theme === 'night' ? 'rgba(139,69,19,0.4)' : 'rgba(139,69,19,0.35)'
                          }}
                        />
                      ))}
                      <span
                        className={`absolute z-10 font-bold ${theme === 'night' ? 'text-purple-400' : 'text-purple-600'}`}
                        style={{
                          writingMode: 'vertical-rl',
                          fontSize: '9px',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          textShadow: theme === 'night' ? '0 0 4px rgba(0,0,0,0.8)' : '0 0 4px rgba(255,255,255,0.9)'
                        }}
                      >
                        避车台
                      </span>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* ===== 右栏：下行步行板 + 下行避车台 ===== */}
          <div className="flex-1 flex flex-col">
            <div className={`text-xs mb-2 flex items-center gap-2 ${theme === 'night' ? 'text-green-400' : 'text-green-600'}`}>
              <Navigation className="w-4 h-4 rotate-180" />下行步行板
            </div>
            {/* 各列竖向排列 */}
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${currentSpan.downstreamColumns}, 1fr)` }}>
              {downstreamColumns.map((column, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-0.5">
                  {Array.from({ length: maxRows }).map((_, rowIdx) => {
                    const board = column[rowIdx]
                    return board ? renderBoardBtn(board) : (
                      <div key={`empty-${rowIdx}`} className="w-11 h-9" />
                    )
                  })}
                </div>
              ))}
            </div>

            {/* 下行避车台 */}
            {renderShelter(downstreamShelter, '下行避车台', currentSpan.shelterMaxPeople)}
          </div>
        </div>
        </div>

        {/* 图例 */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {Object.entries(BOARD_STATUS_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1 text-xs">
              <div className="w-4 h-4 rounded" style={{ background: config.bgColor, border: `1px solid ${config.borderColor}` }} />
              <span style={{ color: config.color }}>{config.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 获取人员作业走行建议
  const getWalkingRecommendations = useCallback(() => {
    if (!selectedBridge || !bridgeStats) return []
    
    const recommendations: { level: 'danger' | 'warning' | 'info'; title: string; content: string; icon: typeof AlertTriangle }[] = []
    
    // 分析各孔风险
    const riskSpans = selectedBridge.spans.map(span => {
      const fractureBoards = span.walkingBoards.filter(b => b.status === 'fracture_risk')
      const severeBoards = span.walkingBoards.filter(b => b.status === 'severe_damage')
      const railingIssues = span.walkingBoards.filter(b => b.railingStatus && b.railingStatus !== 'normal')
      const bracketIssues = span.walkingBoards.filter(b => b.bracketStatus && b.bracketStatus !== 'normal')
      
      return {
        spanNumber: span.spanNumber,
        fractureCount: fractureBoards.length,
        severeCount: severeBoards.length,
        railingIssues: railingIssues.length,
        bracketIssues: bracketIssues.length,
        shelterSide: span.shelterSide
      }
    })
    
    // 1. 断裂风险区域 - 禁止通行
    const fractureSpans = riskSpans.filter(s => s.fractureCount > 0)
    if (fractureSpans.length > 0) {
      recommendations.push({
        level: 'danger',
        title: '⚠️ 禁止通行区域',
        content: `第${fractureSpans.map(s => s.spanNumber).join('、')}孔存在断裂风险步行板，禁止通行！请绕行或等待修复。`,
        icon: XCircle
      })
    }
    
    // 2. 严重损坏区域 - 谨慎通行
    const severeSpans = riskSpans.filter(s => s.severeCount > 0 && s.fractureCount === 0)
    if (severeSpans.length > 0) {
      recommendations.push({
        level: 'warning',
        title: '⚡ 谨慎通行区域',
        content: `第${severeSpans.map(s => s.spanNumber).join('、')}孔存在严重损坏步行板，通行时请避开损坏位置，注意脚下安全。`,
        icon: AlertTriangle
      })
    }
    
    // 3. 栏杆问题提醒
    const totalRailingIssues = riskSpans.reduce((sum, s) => sum + s.railingIssues, 0)
    if (totalRailingIssues > 0) {
      recommendations.push({
        level: 'warning',
        title: '🔧 栏杆安全提醒',
        content: `发现${totalRailingIssues}处栏杆问题（松动或损坏），通行时请注意抓牢扶手，避免倚靠问题栏杆。`,
        icon: AlertCircle
      })
    }
    
    // 4. 托架问题提醒
    const totalBracketIssues = riskSpans.reduce((sum, s) => sum + s.bracketIssues, 0)
    if (totalBracketIssues > 0) {
      recommendations.push({
        level: 'info',
        title: '🔧 托架检修提醒',
        content: `发现${totalBracketIssues}处托架问题（松动、损坏或锈蚀），建议尽快安排检修。`,
        icon: Wrench
      })
    }
    
    // 5. 避车台位置提醒
    const shelterSpans = riskSpans.filter(s => s.shelterSide !== 'none')
    if (shelterSpans.length > 0) {
      recommendations.push({
        level: 'info',
        title: '📢 避车台位置',
        content: `第${shelterSpans.map(s => s.spanNumber).join('、')}孔设有避车台，列车通过时请在此避让。严格遵守限员规定。`,
        icon: ShieldAlert
      })
    }
    
    // 6. 整体状况建议
    if (bridgeStats.damageRate > 30) {
      recommendations.push({
        level: 'danger',
        title: '🔴 高风险桥梁',
        content: '当前桥梁整体损坏率超过30%，建议限制通行并尽快安排全面维修。',
        icon: AlertOctagon
      })
    } else if (bridgeStats.damageRate > 15) {
      recommendations.push({
        level: 'warning',
        title: '🟡 关注桥梁',
        content: '桥梁存在多处损坏，建议优先维修受损严重的步行板。',
        icon: AlertTriangle
      })
    } else if (bridgeStats.damageRate > 5) {
      recommendations.push({
        level: 'info',
        title: '🟢 状况良好',
        content: '桥梁整体状况良好，建议按计划进行日常维护。',
        icon: CheckCircle
      })
    } else {
      recommendations.push({
        level: 'info',
        title: '✅ 状况优秀',
        content: '桥梁状况优秀，可正常通行，建议保持定期检查。',
        icon: CheckCircle
      })
    }
    
    return recommendations
  }, [selectedBridge, bridgeStats])

  // 预警面板组件
  const AlertPanel = () => {
    const alerts = getAlertInfo()
    const recommendations = getWalkingRecommendations()
    
    if (!alerts || alerts.length === 0) {
      return (
        <div className="space-y-3">
          <div className={`p-4 rounded-lg ${theme === 'night' ? 'tech-card' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">系统状态正常</span>
            </div>
            <p className={`text-sm mt-2 ${theme === 'night' ? 'text-slate-400' : 'text-green-600'}`}>所有步行板状态良好，无安全隐患</p>
          </div>
          
          {/* 显示人员作业走行建议 */}
          {recommendations.length > 0 && (
            <div className={`p-3 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-cyan-500/20' : 'bg-blue-50 border border-blue-200'}`}>
              <div className={`text-xs font-semibold mb-2 flex items-center gap-1 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
                <Navigation className="w-3 h-3" />作业走行建议
              </div>
              <div className="space-y-2">
                {recommendations.slice(0, 3).map((rec, idx) => (
                  <div key={idx} className={`text-xs p-2 rounded ${theme === 'night' ? 'bg-slate-900/50' : 'bg-white'}`}>
                    <span className="font-medium">{rec.title}</span>
                    <p className={`mt-1 ${theme === 'night' ? 'text-slate-400' : 'text-gray-600'}`}>{rec.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 快速生成报告按钮 */}
          {hasPermission('data:export') && (
          <Button
            size="sm"
            className={`w-full font-medium shadow-lg ${theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/30' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30'}`}
            onClick={generateReport}
            disabled={!selectedBridge || !bridgeStats || generatingReport}
          >
            {generatingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            生成完整报告
          </Button>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {/* 预警信息 */}
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div 
              key={idx}
              className={`p-3 rounded-lg border ${
                alert.level === 'danger' 
                  ? 'bg-red-500/20 border-red-500/50 neon-glow-red' 
                  : alert.level === 'warning'
                  ? 'bg-yellow-500/20 border-yellow-500/50'
                  : 'bg-blue-500/20 border-blue-500/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {alert.level === 'danger' && <XCircle className="w-5 h-5 text-red-400 danger-pulse" />}
                {alert.level === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                {alert.level === 'info' && <AlertCircle className="w-5 h-5 text-blue-400" />}
                <span className={`font-semibold text-sm ${alert.level === 'danger' ? 'text-red-400' : alert.level === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`}>
                  {alert.message}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={alert.level === 'danger' ? 'border-red-500 text-red-400' : alert.level === 'warning' ? 'border-yellow-500 text-yellow-400' : 'border-blue-500 text-blue-400'}>
                  {alert.count} 块
                </Badge>
              </div>
            </div>
          ))}
        </div>
        
        {/* 人员作业走行建议 */}
        {recommendations.length > 0 && (
          <div className={`p-3 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-cyan-500/20' : 'bg-blue-50 border border-blue-200'}`}>
            <div className={`text-xs font-semibold mb-2 flex items-center gap-1 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
              <Navigation className="w-3 h-3" />作业走行建议
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recommendations.map((rec, idx) => (
                <div 
                  key={idx} 
                  className={`text-xs p-2 rounded ${
                    rec.level === 'danger' 
                      ? 'bg-red-500/10 border-l-2 border-red-500' 
                      : rec.level === 'warning'
                      ? 'bg-yellow-500/10 border-l-2 border-yellow-500'
                      : 'bg-blue-500/10 border-l-2 border-blue-400'
                  }`}
                >
                  <span className={`font-medium ${rec.level === 'danger' ? 'text-red-400' : rec.level === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {rec.title}
                  </span>
                  <p className={`mt-1 ${theme === 'night' ? 'text-slate-400' : 'text-gray-600'}`}>{rec.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 快速生成报告按钮 */}
        {hasPermission('data:export') && (
        <Button
          size="sm"
          className={`w-full font-medium shadow-lg ${theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/30' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30'}`}
          onClick={generateReport}
          disabled={!selectedBridge || !bridgeStats || generatingReport}
        >
          {generatingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
          生成完整报告
        </Button>
        )}
      </div>
    )
  }

  // 统计卡片
  const StatCard = ({ title, value, total, color, icon: Icon }: { 
    title: string
    value: number 
    total?: number
    color: string
    icon: typeof CheckCircle 
  }) => (
    <div className={`p-3 rounded-lg ${theme === 'night' ? 'tech-card' : 'bg-white border border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className={`text-sm ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>{title}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      {total !== undefined && (
        <Progress value={(value / total) * 100} className="h-1 mt-2" />
      )}
    </div>
  )

  // AI助手面板
  const AIAssistantPanel = () => (
    <div className="flex flex-col h-full">
      {/* AI分析按钮 - 仅有ai:use权限的用户显示 */}
      {hasPermission('ai:use') && (
      <Button
        onClick={handleAIAnalyze}
        disabled={aiAnalyzing || !selectedBridge}
        className={`w-full mb-3 border-0 ${theme === 'night' ? 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500'}`}
      >
        {aiAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            正在分析...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            AI分析桥梁状态
          </>
        )}
      </Button>
      )}
      
      {/* 对话区域 */}
      <ScrollArea className="flex-1 min-h-0 mb-3 pr-2">
        <div className="space-y-3">
          {aiMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] p-3 rounded-lg text-sm ${
                  msg.role === 'user' 
                    ? theme === 'night'
                      ? 'bg-cyan-600/30 border border-cyan-500/50 text-cyan-100'
                      : 'bg-blue-100 border border-blue-200 text-blue-800'
                    : theme === 'night'
                      ? 'bg-slate-700/50 border border-slate-600/50 text-slate-200'
                      : 'bg-gray-100 border border-gray-200 text-gray-800'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className={`flex items-center gap-2 mb-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
                    <Bot className="w-4 h-4" />
                    <span className="font-semibold text-xs">AI助手</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{renderMarkdownText(msg.content)}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* 输入区域 */}
      <div className="flex gap-2">
        <Input
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAISend()}
          placeholder="输入消息，如：分析桥梁状态"
          className={`flex-1 ${theme === 'night' ? 'bg-slate-800/50 border-slate-600/50 focus:border-cyan-500/50' : 'bg-white border-gray-300 focus:border-blue-500'}`}
        />
        <Button 
          onClick={handleAISend} 
          disabled={!aiInput.trim() || aiLoading}
          className={theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}
        >
          {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
      
      {/* 快捷命令 */}
      <div className="flex gap-2 mt-2 flex-wrap">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => { setAiInput('分析当前桥梁安全状态'); handleAISend(); }}
          className={`text-xs ${theme === 'night' ? 'border-slate-600/50 text-slate-400 hover:text-cyan-400' : 'border-gray-300 text-gray-600 hover:text-blue-600'}`}
        >
          分析安全状态
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setAiInput('显示所有断裂风险的步行板')}
          className={`text-xs ${theme === 'night' ? 'border-slate-600/50 text-slate-400 hover:text-cyan-400' : 'border-gray-300 text-gray-600 hover:text-blue-600'}`}
        >
          显示高危板
        </Button>
      </div>
    </div>
  )

  // 移动端底部导航
  const MobileBottomNav = () => (
    <nav className={`md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-sm z-50 safe-area-bottom border-t ${theme === 'night' ? 'bg-slate-900/95 border-slate-700/50' : 'bg-white/95 border-gray-200'}`}>
      <div className="flex justify-around py-2">
        <button
          onClick={() => { setMobileTab('bridge'); setMobilePanelOpen(false) }}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${mobileTab === 'bridge' ? (theme === 'night' ? 'text-cyan-400' : 'text-blue-600') : (theme === 'night' ? 'text-slate-400' : 'text-gray-500')}`}
        >
          <Building2 className="w-5 h-5" />
          <span className="text-xs">桥梁</span>
        </button>
        <button
          onClick={() => { setMobileTab('alert'); setMobilePanelOpen(false) }}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${mobileTab === 'alert' ? (theme === 'night' ? 'text-cyan-400' : 'text-blue-600') : (theme === 'night' ? 'text-slate-400' : 'text-gray-500')}`}
        >
          <Bell className="w-5 h-5" />
          <span className="text-xs">预警</span>
        </button>
        <button
          onClick={() => { setMobileTab('detail'); setMobilePanelOpen(true) }}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${mobileTab === 'detail' ? (theme === 'night' ? 'text-cyan-400' : 'text-blue-600') : (theme === 'night' ? 'text-slate-400' : 'text-gray-500')}`}
        >
          <Info className="w-5 h-5" />
          <span className="text-xs">详情</span>
        </button>
        {hasPermission('ai:use') && (
        <button
          onClick={() => { setMobileTab('ai'); setMobilePanelOpen(true) }}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${mobileTab === 'ai' ? (theme === 'night' ? 'text-cyan-400' : 'text-blue-600') : (theme === 'night' ? 'text-slate-400' : 'text-gray-500')}`}
        >
          <Bot className="w-5 h-5" />
          <span className="text-xs">AI</span>
        </button>
        )}
        <button
          onClick={() => { setMobileTab('profile'); setMobilePanelOpen(false) }}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${mobileTab === 'profile' ? (theme === 'night' ? 'text-cyan-400' : 'text-blue-600') : (theme === 'night' ? 'text-slate-400' : 'text-gray-500')}`}
        >
          <User className="w-5 h-5" />
          <span className="text-xs">我的</span>
        </button>
      </div>
    </nav>
  )

  // 主渲染
  if (checkingAuth || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'night' ? 'bg-[#0a0f1a]' : 'bg-gray-100'}`}>
        <div className="text-center">
          <Loader2 className={`w-12 h-12 animate-spin mx-auto mb-4 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`} />
          <p className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>{checkingAuth ? '验证登录状态...' : '加载中...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${theme === 'night' ? 'bg-[#0a0f1a] text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* 顶部安全提示 - 静态可关闭 */}
      {!safetyTipDismissed && (
        <div className="bg-gradient-to-r from-red-900/30 via-orange-900/30 to-red-900/30 border-b border-red-500/30">
          <div className="flex items-center justify-center py-2 px-4 text-sm text-orange-300 gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
            <span>安全提示：通过桥梁时请注意观察步行板状态，发现断裂风险步行板禁止通行，及时上报并避让。避车台限员规定请严格遵守。发现异常情况立即报告。</span>
            <button onClick={() => setSafetyTipDismissed(true)} className="ml-2 text-orange-400/60 hover:text-orange-300 flex-shrink-0" aria-label="关闭安全提示">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 头部 */}
      <header className={`border-b backdrop-blur-sm sticky top-0 z-40 ${theme === 'night' ? 'border-cyan-500/20 bg-slate-900/50' : 'border-gray-200 bg-white/80'}`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                <Train className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-lg md:text-xl font-bold ${theme === 'night' ? 'bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent' : 'text-gray-900'}`}>
                  铁路明桥面步行板可视化管理系统
                </h1>
                <p className={`text-xs hidden md:block ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>Railway Bridge Walking Board Management System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* 离线状态指示器 */}
              {!isOnline && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold ${theme === 'night' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-orange-100 text-orange-600 border border-orange-300'}`}>
                  <Signal className="w-4 h-4" />
                  <span>离线模式</span>
                  {offlineEdits > 0 && (
                    <Badge className="ml-1 bg-orange-500/30 text-orange-300">
                      {offlineEdits}待同步
                    </Badge>
                  )}
                </div>
              )}
              {isOnline && offlineEdits > 0 && (
                <button
                  onClick={async () => {
                    setIsSyncing(true)
                    toast.loading('正在同步离线数据...')
                    try {
                      const result = await syncService.sync()
                      toast.dismiss()
                      if (result.success) {
                        toast.success(`同步完成，已同步 ${result.syncedCount} 条记录`)
                        setOfflineEdits(0)
                        refreshAllData()
                      } else {
                        toast.error(result.error || '同步失败')
                      }
                    } catch {
                      toast.dismiss()
                      toast.error('同步失败')
                    } finally {
                      setIsSyncing(false)
                    }
                  }}
                  disabled={isSyncing}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all ${theme === 'night' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30' : 'bg-cyan-100 text-cyan-600 border border-cyan-300 hover:bg-cyan-200'}`}
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudRain className="w-4 h-4" />
                  )}
                  <span>同步({offlineEdits})</span>
                </button>
              )}
              
              {/* 主题切换按钮 */}
              <Button 
                variant="ghost" 
                size="sm"
                className="tech-button"
                onClick={toggleTheme}
                title={theme === 'night' ? '切换到白天模式' : '切换到夜晚模式'}
              >
                {theme === 'night' ? (
                  <Sun className={`w-5 h-5 ${theme === 'night' ? 'text-yellow-400' : 'text-yellow-500'}`} />
                ) : (
                  <Moon className="w-5 h-5 text-blue-600" />
                )}
              </Button>
              
              {/* 桥梁选择器 */}
              <Select
                value={selectedBridge?.id || ''}
                onValueChange={(val) => {
                  const bridge = bridges.find(b => b.id === val)
                  if (bridge) {
                    setSelectedBridge(bridge)
                    setSelectedSpanIndex(0)
                  }
                }}
              >
                <SelectTrigger className={`w-40 md:w-56 ${theme === 'night' ? 'bg-slate-800/50 border-cyan-500/30' : 'bg-white border-gray-300'}`}>
                  <SelectValue placeholder="选择桥梁" />
                </SelectTrigger>
                <SelectContent>
                  {bridges.map(bridge => (
                    <SelectItem key={bridge.id} value={bridge.id}>
                      {bridge.name} ({bridge.bridgeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {hasPermission('bridge:write') && (
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className={theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}
              >
                <Plus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">新建桥梁</span>
              </Button>
              )}
              
              {/* 数据总览按钮 */}
              <Button
                variant="ghost"
                size="sm"
                className="tech-button"
                onClick={() => router.push('/dashboard')}
                title="数据总览仪表盘"
              >
                <LayoutDashboard className={`w-5 h-5 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`} />
                <span className={`hidden md:inline ml-1 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>数据总览</span>
              </Button>

              {/* 桥梁地图按钮 */}
              <Button
                variant="ghost"
                size="sm"
                className="tech-button"
                onClick={() => router.push('/map')}
                title="桥梁地图"
              >
                <MapPin className={`w-5 h-5 ${theme === 'night' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span className={`hidden md:inline ml-1 ${theme === 'night' ? 'text-emerald-400' : 'text-emerald-600'}`}>地图</span>
              </Button>

              {/* 巡检管理按钮 */}
              {hasPermission('bridge:read') && (
              <Button
                variant="ghost"
                size="sm"
                className="tech-button"
                onClick={() => router.push('/inspection')}
                title="巡检任务管理"
              >
                <ClipboardList className={`w-5 h-5 ${theme === 'night' ? 'text-amber-400' : 'text-amber-600'}`} />
                <span className={`hidden md:inline ml-1 ${theme === 'night' ? 'text-amber-400' : 'text-amber-600'}`}>巡检</span>
              </Button>
              )}

              {/* 3D模型查看器按钮 */}
              <Button
                variant="ghost"
                size="sm"
                className="tech-button"
                onClick={() => window.open('/bridge-3d', '_blank')}
                title="打开3D模型查看器"
              >
                <Box className={`w-5 h-5 ${theme === 'night' ? 'text-purple-400' : 'text-purple-600'}`} />
                <span className={`hidden md:inline ml-1 ${theme === 'night' ? 'text-purple-400' : 'text-purple-600'}`}>3D模型</span>
              </Button>
              
              {/* AI设置按钮 - 仅管理员 */}
              {hasPermission('ai:use') && (
              <Button
                variant="ghost"
                size="sm"
                className="tech-button"
                onClick={() => setSettingsOpen(true)}
                title="AI模型设置"
              >
                <Settings className={`w-5 h-5 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`} />
              </Button>
              )}
              
              {/* 用户菜单 */}
              <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-600/50">
                {currentUser && (
                  <NotificationBell userId={currentUser.id} theme={theme} />
                )}
                {hasPermission('bridge:delete') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="tech-button"
                    onClick={() => router.push('/users')}
                    title="用户管理"
                  >
                    <Users className={`w-5 h-5 ${theme === 'night' ? 'text-purple-400' : 'text-purple-600'}`} />
                  </Button>
                )}
                {hasPermission('log:read') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="tech-button"
                    onClick={() => setLogDialogOpen(true)}
                    title="操作日志"
                  >
                    <FileText className={`w-5 h-5 ${theme === 'night' ? 'text-orange-400' : 'text-orange-600'}`} />
                  </Button>
                )}
                <div className={`text-sm ${theme === 'night' ? 'text-slate-300' : 'text-gray-700'}`}>
                  <span className="font-medium">{currentUser?.name || currentUser?.username}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded ${theme === 'night' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-blue-100 text-blue-600'}`}>
                    {ROLE_LABELS[currentUser?.role || 'user']}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="tech-button"
                  onClick={() => setChangePasswordOpen(true)}
                  title="修改密码"
                >
                  <KeyRound className={`w-5 h-5 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="tech-button"
                  onClick={handleLogout}
                  title="退出登录"
                >
                  <LogOut className={`w-5 h-5 ${theme === 'night' ? 'text-red-400' : 'text-red-600'}`} />
                </Button>
              </div>
              
              {/* 移动端菜单 */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="container mx-auto px-4 py-4 pb-24 md:pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 左侧面板 */}
          <div className="lg:col-span-3 space-y-4 hidden md:block">
            {/* 桥梁列表 */}
            <Card className={theme === 'night' ? 'tech-card' : 'bg-white border border-gray-200'}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-sm flex items-center gap-2 ${theme === 'night' ? '' : 'text-gray-900'}`}>
                    <Building2 className={`w-4 h-4 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`} />
                    桥梁列表
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {hasPermission('data:export') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 px-2 ${theme === 'night' ? 'text-cyan-400 hover:bg-cyan-500/10' : 'text-blue-600 hover:bg-blue-50'}`}
                      onClick={handleDownloadTemplate}
                      title="下载导入模板"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    )}
                    {hasPermission('data:export') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 px-2 ${theme === 'night' ? 'text-cyan-400 hover:bg-cyan-500/10' : 'text-blue-600 hover:bg-blue-50'}`}
                      onClick={handleExportData}
                      title="导出Excel数据"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    )}
                    {selectedBridge && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 px-2 ${theme === 'night' ? 'text-cyan-400 hover:bg-cyan-500/10' : 'text-blue-600 hover:bg-blue-50'}`}
                      onClick={async () => {
                        if (!selectedBridge) return
                        try {
                          await exportBoardStatusPdf(selectedBridge)
                          toast.success('步行板状态PDF已生成')
                        } catch (err) {
                          console.error('导出状态图失败:', err)
                          toast.error('导出失败，请重试')
                        }
                      }}
                      title="导出各孔步行板状态PDF"
                    >
                      <FileImage className="w-4 h-4" />
                    </Button>
                    )}
                    {hasPermission('data:import') && (
                    <label title="导入Excel数据（带配置）">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleSelectImportFile}
                        className="hidden"
                        id="import-file"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 px-2 cursor-pointer ${theme === 'night' ? 'text-cyan-400 hover:bg-cyan-500/10' : 'text-blue-600 hover:bg-blue-50'}`}
                        asChild
                      >
                        <span>
                          <Upload className="w-4 h-4" />
                        </span>
                      </Button>
                    </label>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {bridges.map(bridge => (
                      <div key={bridge.id} className="flex items-center gap-1 group">
                        <button
                          onClick={() => { setSelectedBridge(bridge); setSelectedSpanIndex(0) }}
                          className={`flex-1 text-left p-2 rounded-lg transition-all ${
                            selectedBridge?.id === bridge.id 
                              ? theme === 'night'
                                ? 'bg-cyan-500/20 border border-cyan-500/50'
                                : 'bg-blue-100 border border-blue-300'
                              : theme === 'night'
                                ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-transparent'
                                : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                          }`}
                        >
                          <div className="font-medium text-sm">{bridge.name}</div>
                          <div className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>{bridge.bridgeCode} • {bridge.totalSpans}孔</div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedSpanIndex(0); handleViewBridgeInfo(bridge) }}
                          className={`p-1.5 rounded-md transition-colors ${theme === 'night' ? 'hover:bg-slate-700 text-slate-400 hover:text-cyan-400' : 'hover:bg-gray-200 text-gray-400 hover:text-blue-600'}`}
                          title="查看桥梁信息"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {hasPermission('bridge:write') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditBridge(bridge) }}
                          className={`p-1.5 rounded-md transition-colors ${theme === 'night' ? 'hover:bg-slate-700 text-slate-400 hover:text-cyan-400' : 'hover:bg-gray-200 text-gray-400 hover:text-blue-600'}`}
                          title="编辑桥梁"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        )}
                        {hasPermission('bridge:delete') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteBridge(bridge.id) }}
                          className={`p-1.5 rounded-md transition-colors ${theme === 'night' ? 'hover:bg-red-500/20 text-slate-500 hover:text-red-400' : 'hover:bg-red-100 text-gray-400 hover:text-red-600'}`}
                          title="删除桥梁"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* 预警面板 */}
            <Card className={theme === 'night' ? 'tech-card' : 'bg-white border border-gray-200'}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm flex items-center gap-2 ${theme === 'night' ? '' : 'text-gray-900'}`}>
                  <AlertTriangle className={`w-4 h-4 ${theme === 'night' ? 'text-orange-400' : 'text-orange-500'}`} />
                  安全预警
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AlertPanel />
              </CardContent>
            </Card>

            {/* 统计概览 */}
            {bridgeStats && (
              <Card className={theme === 'night' ? 'tech-card' : 'bg-white border border-gray-200'}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm flex items-center gap-2 ${theme === 'night' ? '' : 'text-gray-900'}`}>
                    <Activity className={`w-4 h-4 ${theme === 'night' ? 'text-green-400' : 'text-green-600'}`} />
                    统计概览
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <StatCard title="正常" value={bridgeStats.normalBoards} total={bridgeStats.totalBoards} color="#22c55e" icon={CheckCircle} />
                    <StatCard title="轻微损坏" value={bridgeStats.minorDamageBoards} total={bridgeStats.totalBoards} color="#f59e0b" icon={AlertCircle} />
                    <StatCard title="严重损坏" value={bridgeStats.severeDamageBoards} total={bridgeStats.totalBoards} color="#f97316" icon={AlertTriangle} />
                    <StatCard title="断裂风险" value={bridgeStats.fractureRiskBoards} total={bridgeStats.totalBoards} color="#ef4444" icon={XCircle} />
                    <StatCard title="已更换" value={bridgeStats.replacedBoards} total={bridgeStats.totalBoards} color="#3b82f6" icon={Wrench} />
                    <StatCard title="缺失" value={bridgeStats.missingBoards} total={bridgeStats.totalBoards} color="#6b7280" icon={Minus} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 趋势分析 */}
            <Card className={theme === 'night' ? 'tech-card' : 'bg-white border border-gray-200'}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm flex items-center gap-2 ${theme === 'night' ? '' : 'text-gray-900'}`}>
                  <Activity className={`w-4 h-4 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`} />
                  趋势分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TrendAnalysis bridgeStats={bridgeStats} bridgeId={selectedBridge?.id || null} theme={theme} />
              </CardContent>
            </Card>
          </div>

          {/* 中间可视化区域 */}
          <div className={rightPanelOpen ? 'lg:col-span-6' : 'lg:col-span-9'}>
            <Card className={`h-full ${theme === 'night' ? 'tech-card' : 'bg-white border border-gray-200'}`}>
              <CardContent className="p-4 h-full flex flex-col">
                {/* 工具栏 */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {/* 视图切换 */}
                    <div className={`flex rounded-lg overflow-hidden border ${theme === 'night' ? 'border-slate-600/50' : 'border-gray-300'}`}>
                      <button
                        onClick={() => setViewMode('3d')}
                        className={`px-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${viewMode === '3d' ? (theme === 'night' ? 'bg-cyan-600 text-white' : 'bg-blue-600 text-white') : (theme === 'night' ? 'bg-slate-800/50 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900')}`}
                      >
                        <Box className="w-4 h-4" />3D
                      </button>
                      <button
                        onClick={() => setViewMode('2d')}
                        className={`px-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${viewMode === '2d' ? (theme === 'night' ? 'bg-cyan-600 text-white' : 'bg-blue-600 text-white') : (theme === 'night' ? 'bg-slate-800/50 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900')}`}
                      >
                        <Grid3X3 className="w-4 h-4" />2D
                      </button>
                    </div>

                    {/* 单孔/整桥模式切换 — 仅2D模式 */}
                    {viewMode === '2d' && (
                      <button
                        onClick={() => setBridgeViewMode(bridgeViewMode === 'single' ? 'full' : 'single')}
                        className={`px-3 py-1.5 text-xs flex items-center gap-1 rounded-lg border transition-colors ${
                          bridgeViewMode === 'full'
                            ? 'bg-amber-600 text-white border-amber-500'
                            : theme === 'night'
                              ? 'bg-slate-800/50 text-slate-400 border-slate-600/50 hover:text-white hover:border-amber-500/50'
                              : 'bg-gray-100 text-gray-600 border-gray-300 hover:text-gray-900 hover:border-amber-300'
                        }`}
                      >
                        <Layers className="w-4 h-4" />
                        {bridgeViewMode === 'full' ? '整桥模式' : '单孔模式'}
                      </button>
                    )}

                    {/* 批量编辑模式 */}
                    {hasPermission('board:write') && (
                    <button
                      onClick={() => {
                        setBatchMode(!batchMode)
                        if (batchMode) setSelectedBoards([])
                      }}
                      className={`px-3 py-1.5 text-xs flex items-center gap-1 rounded-lg border transition-colors ${
                        batchMode
                          ? 'bg-purple-600 text-white border-purple-500'
                          : theme === 'night'
                            ? 'bg-slate-800/50 text-slate-400 border-slate-600/50 hover:text-white hover:border-purple-500/50'
                            : 'bg-gray-100 text-gray-600 border-gray-300 hover:text-gray-900 hover:border-purple-300'
                      }`}
                    >
                      <Edit3 className="w-4 h-4" />
                      {batchMode ? '退出批量' : '批量编辑'}
                    </button>
                    )}

                    {/* 批量模式下显示选项 */}
                    {batchMode && hasPermission('board:write') && (
                      <>
                        <button
                          onClick={toggleSelectAll}
                          className={`px-3 py-1.5 text-xs flex items-center gap-1 rounded-lg border transition-colors ${theme === 'night' ? 'bg-slate-800/50 text-slate-400 border-slate-600/50 hover:text-white' : 'bg-gray-100 text-gray-600 border-gray-300 hover:text-gray-900'}`}
                        >
                          <CheckSquare className="w-4 h-4" />
                          全选
                        </button>
                        <button
                          onClick={() => setBatchEditDialogOpen(true)}
                          disabled={selectedBoards.length === 0}
                          className={`px-3 py-1.5 text-xs flex items-center gap-1 rounded-lg border transition-colors ${
                            selectedBoards.length === 0 
                              ? 'opacity-50 cursor-not-allowed' 
                              : theme === 'night' 
                                ? 'bg-purple-600/50 text-white border-purple-500/50 hover:bg-purple-600'
                                : 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200'
                          }`}
                        >
                          <Edit3 className="w-4 h-4" />
                          编辑选中 ({selectedBoards.length})
                        </button>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* 缩放控制 - 仅3D模式 */}
                    {viewMode === '3d' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}>
                          <ZoomOut className="w-4 h-4" />
                        </Button>
                        <span className={`text-xs w-12 text-center ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>{Math.round(zoomLevel * 100)}%</span>
                        <Button variant="ghost" size="sm" onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}>
                          <ZoomIn className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setZoomLevel(1); setViewAngle(0) }}>
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIs3DFullscreen(true)}
                          className={theme === 'night' ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-500'}
                        >
                          <Maximize2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {/* 右侧面板切换 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRightPanelOpen(!rightPanelOpen)}
                      className={theme === 'night' ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-500'}
                      title={rightPanelOpen ? '收起侧边栏' : '展开侧边栏'}
                    >
                      {rightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  {/* 孔位导航 */}
                  {selectedBridge && (
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedSpanIndex(Math.max(0, selectedSpanIndex - 1))} 
                        disabled={selectedSpanIndex === 0}
                        className="rounded"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {/* 下拉选择器 */}
                      <Select
                        value={String(selectedSpanIndex + 1)}
                        onValueChange={(val) => setSelectedSpanIndex(parseInt(val) - 1)}
                      >
                        <SelectTrigger className={`w-24 h-8 rounded ${theme === 'night' ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'}`}>
                          <SelectValue placeholder="选择孔号" />
                        </SelectTrigger>
                        <SelectContent className={theme === 'night' ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'}>
                          {selectedBridge.spans.map((span, idx) => {
                            const hasRisk = span.walkingBoards.some(b => b.status === 'fracture_risk')
                            return (
                              <SelectItem 
                                key={span.id} 
                                value={String(idx + 1)}
                                className={hasRisk ? 'text-red-400' : undefined}
                              >
                                第{span.spanNumber}孔 {hasRisk && '⚠'}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <span className={`text-sm ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>
                        / {selectedBridge.totalSpans}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedSpanIndex(Math.min(selectedBridge.spans.length - 1, selectedSpanIndex + 1))} 
                        disabled={selectedSpanIndex === selectedBridge.spans.length - 1}
                        className="rounded"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      {/* 直接输入孔号 */}
                      <div className="hidden md:flex items-center gap-1 ml-2">
                        <span className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>跳转:</span>
                        <Input
                          type="number"
                          min={1}
                          max={selectedBridge.totalSpans}
                          className={`w-14 h-7 text-xs rounded ${theme === 'night' ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'}`}
                          placeholder="孔号"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = parseInt((e.target as HTMLInputElement).value)
                              if (val >= 1 && val <= selectedBridge.totalSpans) {
                                setSelectedSpanIndex(val - 1)
                                ;(e.target as HTMLInputElement).value = ''
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 可视化区域 */}
                <div className={`flex-1 min-h-[300px] md:min-h-[400px] relative overflow-hidden rounded-lg border ${theme === 'night' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-gray-50 border-gray-200'}`}>
                  {bridges.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8">
                      <div className={`relative mb-6 ${theme === 'night' ? '' : ''}`}>
                        <div className={`absolute inset-0 rounded-full blur-2xl ${theme === 'night' ? 'bg-cyan-500/10' : 'bg-blue-500/5'}`} style={{ width: '120px', height: '120px', left: '-4px', top: '-4px' }} />
                        <Building2 className={`w-16 h-16 relative ${theme === 'night' ? 'text-cyan-500/60' : 'text-blue-400/60'}`} strokeWidth={1.2} />
                      </div>
                      <h2 className={`text-xl font-bold mb-3 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
                        还没有桥梁数据
                      </h2>
                      <p className={`text-sm mb-8 text-center max-w-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>
                        创建您的第一座桥梁，开始使用步行板可视化管理功能
                      </p>
                      {hasPermission('bridge:write') && (
                        <Button
                          size="lg"
                          onClick={() => setCreateDialogOpen(true)}
                          className={`font-semibold shadow-lg transition-all hover:scale-105 ${theme === 'night' ? 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-cyan-500/25' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-blue-500/25'}`}
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          创建桥梁
                        </Button>
                      )}
                      {!hasPermission('bridge:write') && (
                        <p className={`text-xs ${theme === 'night' ? 'text-slate-500' : 'text-gray-400'}`}>
                          请联系管理员创建桥梁
                        </p>
                      )}
                    </div>
                  ) : (
                    viewMode === '3d' ? render3DBridge() : render2DBridge()
                  )}
                </div>

                {/* 孔位缩略图 */}
                {selectedBridge && selectedBridge.spans.length > 1 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                    {selectedBridge.spans.map((span, idx) => {
                      const hasRisk = span.walkingBoards.some(b => b.status === 'fracture_risk')
                      const hasDamage = span.walkingBoards.some(b => b.status === 'severe_damage' || b.status === 'minor_damage')
                      return (
                        <button
                          key={span.id}
                          onClick={() => setSelectedSpanIndex(idx)}
                          className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs transition-all ${
                            selectedSpanIndex === idx 
                              ? theme === 'night'
                                ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                                : 'bg-blue-100 border border-blue-300 text-blue-600'
                              : hasRisk 
                                ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                                : hasDamage
                                  ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400'
                                  : theme === 'night'
                                    ? 'bg-slate-800/50 border border-slate-600/30 text-slate-400'
                                    : 'bg-gray-100 border border-gray-200 text-gray-600'
                          }`}
                        >
                          第{span.spanNumber}孔
                          {hasRisk && <span className="ml-1">⚠</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧面板 */}
          {rightPanelOpen && (
          <div className="lg:col-span-3 hidden md:block animate-in slide-in-from-right-2 duration-200">
            <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as 'info' | 'ai')} className="h-full">
              <TabsList className={`grid w-full mb-4 ${theme === 'night' ? 'bg-slate-800/50' : 'bg-gray-100'} ${hasPermission('ai:use') ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <TabsTrigger value="info" className={`text-xs data-[state=active]:${theme === 'night' ? 'bg-cyan-600/30 data-[state=active]:text-cyan-400' : 'bg-white data-[state=active]:text-blue-600'}`}>
                  <FileText className="w-4 h-4 mr-1" />孔信息
                </TabsTrigger>
                {hasPermission('ai:use') && (
                <TabsTrigger value="ai" className={`text-xs data-[state=active]:${theme === 'night' ? 'bg-purple-600/30 data-[state=active]:text-purple-400' : 'bg-white data-[state=active]:text-purple-600'}`}>
                  <Bot className="w-4 h-4 mr-1" />AI助手
                </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="info" className="h-[calc(100%-60px)] mt-0">
                <Card className={`h-full ${theme === 'night' ? 'tech-card' : 'bg-white border border-gray-200'}`}>
                  <CardContent className="p-4 h-full overflow-auto">
                    {selectedBridge && selectedBridge.spans[selectedSpanIndex] && (
                      <>
                        {/* 当前孔信息 */}
                        <div className="mb-4">
                          <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
                            <Hash className="w-4 h-4" />
                            第{selectedBridge.spans[selectedSpanIndex].spanNumber}孔信息
                          </h3>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className={`p-2 rounded ${theme === 'night' ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                              <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>孔长：</span>
                              <span className={theme === 'night' ? 'text-white' : 'text-gray-900'}>{selectedBridge.spans[selectedSpanIndex].spanLength}m</span>
                            </div>
                            <div className={`p-2 rounded ${theme === 'night' ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                              <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>上行板：</span>
                              <span className="text-blue-400">{selectedBridge.spans[selectedSpanIndex].upstreamBoards}块</span>
                            </div>
                            <div className={`p-2 rounded ${theme === 'night' ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                              <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>下行板：</span>
                              <span className="text-green-400">{selectedBridge.spans[selectedSpanIndex].downstreamBoards}块</span>
                            </div>
                            <div className={`p-2 rounded ${theme === 'night' ? 'bg-purple-500/20' : 'bg-purple-50'}`}>
                              <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>避车台：</span>
                              <span className="text-purple-400">{SHELTER_SIDE_CONFIG[selectedBridge.spans[selectedSpanIndex].shelterSide]?.label || '无'}</span>
                            </div>
                            <div className={`p-2 rounded ${theme === 'night' ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                              <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>尺寸：</span>
                              <span className={theme === 'night' ? 'text-white' : 'text-gray-900'}>{(() => { const span = selectedBridge.spans[selectedSpanIndex]; const sizes = span.walkingBoards.map(b => `${b.boardLength || 100}×${b.boardWidth || 50}`); const unique = [...new Set(sizes)]; return unique.length === 1 ? unique[0] + 'cm' : '多种'; })()}</span>
                            </div>
                            <div className={`p-2 rounded ${theme === 'night' ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                              <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>材质：</span>
                              <span className={theme === 'night' ? 'text-white' : 'text-gray-900'}>{BOARD_MATERIAL_CONFIG[selectedBridge.spans[selectedSpanIndex].boardMaterial]?.label || '镀锌钢'}</span>
                            </div>
                          </div>
                        </div>

                        <Separator className={`my-4 ${theme === 'night' ? 'bg-slate-700/50' : 'bg-gray-200'}`} />

                        {/* 步行板列表 */}
                        <div>
                          <div className={`flex items-center justify-between mb-2`}>
                            <h3 className={`text-sm font-semibold flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>步行板状态 <span className={`text-xs font-normal ${theme === 'night' ? 'text-slate-400' : 'text-gray-400'}`}>({sortedBoards.length}块)</span></h3>
                            <div className="flex items-center gap-1">
                              {hasPermission('span:write') && (
                              <button
                                onClick={handleAddSpan}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${theme === 'night' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30' : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-300'}`}
                                title="添加新孔位"
                              >
                                <Plus className="w-3 h-3" />
                                <span className="hidden sm:inline">添加孔位</span>
                              </button>
                              )}
                              {hasPermission('span:write') && selectedBridge.spans.length > 1 && (
                                <button
                                  onClick={() => {
                                    const span = selectedBridge.spans[selectedSpanIndex]
                                    if (span) handleDeleteSpan(span.id)
                                  }}
                                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${theme === 'night' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-300'}`}
                                  title="删除当前孔位"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span className="hidden sm:inline">删除此孔</span>
                                </button>
                              )}
                            </div>
                          </div>
                          <div
                            ref={boardListScrollRef}
                            className="max-h-[500px] overflow-y-auto"
                          >
                            <div
                              style={{
                                height: `${boardVirtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                              }}
                            >
                              {boardVirtualizer.getVirtualItems().map(virtualRow => {
                                const board = sortedBoards[virtualRow.index]
                                const config = BOARD_STATUS_CONFIG[board.status as keyof typeof BOARD_STATUS_CONFIG] || BOARD_STATUS_CONFIG.normal
                                const posLabel = board.position === 'upstream' ? '上行' : board.position === 'downstream' ? '下行' : board.position === 'shelter_left' ? '左侧避车台' : board.position === 'shelter_right' ? '右侧避车台' : '避车台'
                                return (
                                  <button
                                    key={board.id}
                                    onClick={() => { if (hasPermission('board:write')) openEditDialog(board) }}
                                    data-index={virtualRow.index}
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: `${virtualRow.size}px`,
                                      transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                    className={`text-left p-2 rounded transition-colors flex items-center justify-between ${!hasPermission('board:write') ? 'cursor-default' : (theme === 'night' ? 'bg-slate-800/50 hover:bg-slate-700/50' : 'bg-gray-50 hover:bg-gray-100')}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full" style={{ background: config.color }} />
                                      <span className={`text-xs ${theme === 'night' ? 'text-slate-300' : 'text-gray-700'}`}>
                                        {posLabel} {board.columnIndex}列 {board.boardNumber}号
                                      </span>
                                    </div>
                                    <Badge variant="outline" className="text-xs" style={{ color: config.color, borderColor: config.borderColor }}>
                                      {config.label}
                                    </Badge>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        <Separator className={`my-4 ${theme === 'night' ? 'bg-slate-700/50' : 'bg-gray-200'}`} />

                        {/* 操作按钮 */}
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`w-full font-medium ${theme === 'night' ? 'border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}
                            onClick={handleViewBridgeInfo}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            查看桥梁信息
                          </Button>
                          {hasPermission('bridge:write') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className={`w-full font-medium ${theme === 'night' ? 'border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}
                            onClick={handleEditBridge}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            编辑桥梁
                          </Button>
                          )}
                          {hasPermission('span:write') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className={`w-full font-medium ${theme === 'night' ? 'border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}
                            onClick={() => handleEditSpan()}
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            编辑当前孔
                          </Button>
                          )}
                          {hasPermission('span:write') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className={`w-full font-medium ${theme === 'night' ? 'border-green-500/50 text-green-400 hover:bg-green-500/10' : 'border-green-300 text-green-600 hover:bg-green-50'}`}
                            onClick={handleAddSpan}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            添加新孔位
                          </Button>
                          )}
                          {hasPermission('bridge:delete') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className={`w-full font-medium ${theme === 'night' ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30' : 'bg-red-500 border-red-600 text-white hover:bg-red-600'}`}
                            onClick={() => selectedBridge && handleDeleteBridge(selectedBridge.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除桥梁
                          </Button>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="ai" className="h-[calc(100%-60px)] mt-0">
                <Card className={`h-full ${theme === 'night' ? 'tech-card' : 'bg-white border border-gray-200'}`}>
                  <CardContent className="p-4 h-full">
                    <AIAssistantPanel />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          )}
        </div>
      </main>

      {/* 移动端底部导航 */}
      <MobileBottomNav />

      {/* 移动端AI面板 */}
      <Sheet open={mobileTab === 'ai' && mobilePanelOpen} onOpenChange={(open) => { if (!open) setMobilePanelOpen(false) }}>
        <SheetContent side="bottom" className={`h-[80vh] ${theme === 'night' ? 'bg-slate-900 border-t border-cyan-500/30' : 'bg-white border-t border-gray-200'}`}>
          <SheetHeader>
            <SheetTitle className={`flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
              <Bot className="w-5 h-5" />
              AI助手
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 h-[calc(100%-60px)]">
            <AIAssistantPanel />
          </div>
        </SheetContent>
      </Sheet>

      {/* 移动端个人中心面板 */}
      <Sheet open={mobileTab === 'profile'} onOpenChange={(open) => { if (!open) setMobileTab('bridge') }}>
        <SheetContent side="bottom" className={`h-[70vh] ${theme === 'night' ? 'bg-slate-900 border-t border-cyan-500/30' : 'bg-white border-t border-gray-200'}`}>
          <SheetHeader>
            <SheetTitle className={`flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
              <User className="w-5 h-5" />
              个人中心
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 px-2">
            {/* 用户信息 */}
            <div className={`flex items-center gap-4 p-4 rounded-xl mb-4 ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-gray-50 border border-gray-200'}`}>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${theme === 'night' ? 'bg-cyan-600/20 border-2 border-cyan-500/50' : 'bg-blue-100 border-2 border-blue-300'}`}>
                <User className={`w-7 h-7 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`} />
              </div>
              <div>
                <div className={`text-lg font-bold ${theme === 'night' ? 'text-white' : 'text-gray-900'}`}>
                  {currentUser?.name || currentUser?.username || '未知用户'}
                </div>
                <div className={`text-sm ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>
                  @{currentUser?.username}
                </div>
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${theme === 'night' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-blue-100 text-blue-600'}`}>
                  {ROLE_LABELS[currentUser?.role || 'user']}
                </span>
              </div>
            </div>

            {/* 菜单项 */}
            <div className="space-y-2">
              <button
                onClick={() => { setChangePasswordOpen(true); setMobileTab('bridge') }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${theme === 'night' ? 'bg-slate-800/30 hover:bg-slate-800/60 text-slate-200' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
              >
                <KeyRound className={`w-5 h-5 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`} />
                <span className="flex-1 font-medium">修改密码</span>
                <ChevronRight className={`w-4 h-4 ${theme === 'night' ? 'text-slate-500' : 'text-gray-400'}`} />
              </button>

              <button
                onClick={() => { router.push('/dashboard'); setMobileTab('bridge') }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${theme === 'night' ? 'bg-slate-800/30 hover:bg-slate-800/60 text-slate-200' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
              >
                <Activity className={`w-5 h-5 ${theme === 'night' ? 'text-green-400' : 'text-green-600'}`} />
                <span className="flex-1 font-medium">数据总览</span>
                <ChevronRight className={`w-4 h-4 ${theme === 'night' ? 'text-slate-500' : 'text-gray-400'}`} />
              </button>

              {hasPermission('bridge:delete') && (
              <button
                onClick={() => { router.push('/users'); setMobileTab('bridge') }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${theme === 'night' ? 'bg-slate-800/30 hover:bg-slate-800/60 text-slate-200' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
              >
                <Users className={`w-5 h-5 ${theme === 'night' ? 'text-purple-400' : 'text-purple-600'}`} />
                <span className="flex-1 font-medium">用户管理</span>
                <ChevronRight className={`w-4 h-4 ${theme === 'night' ? 'text-slate-500' : 'text-gray-400'}`} />
              </button>
              )}

              {hasPermission('log:read') && (
              <button
                onClick={() => { setLogDialogOpen(true); setMobileTab('bridge') }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${theme === 'night' ? 'bg-slate-800/30 hover:bg-slate-800/60 text-slate-200' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
              >
                <FileText className={`w-5 h-5 ${theme === 'night' ? 'text-orange-400' : 'text-orange-600'}`} />
                <span className="flex-1 font-medium">操作日志</span>
                <ChevronRight className={`w-4 h-4 ${theme === 'night' ? 'text-slate-500' : 'text-gray-400'}`} />
              </button>
              )}
            </div>

            {/* 退出登录 */}
            <div className="mt-6">
              <button
                onClick={handleLogout}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${theme === 'night' ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}
              >
                <LogOut className="w-5 h-5" />
                退出登录
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 创建桥梁对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-lg max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className={theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}>新建桥梁</DialogTitle>
            <DialogDescription className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>填写桥梁基本信息创建新的桥梁记录</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>桥梁名称 *</Label>
                <Input value={newBridge.name} onChange={(e) => setNewBridge({...newBridge, name: e.target.value})} placeholder="如：黄河大桥" className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>桥梁编号 *</Label>
                <Input value={newBridge.bridgeCode} onChange={(e) => setNewBridge({...newBridge, bridgeCode: e.target.value})} placeholder="如：DK100+500" className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>位置</Label>
                <Input value={newBridge.location} onChange={(e) => setNewBridge({...newBridge, location: e.target.value})} placeholder="地理位置" className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>线路名称</Label>
                <Input value={newBridge.lineName} onChange={(e) => setNewBridge({...newBridge, lineName: e.target.value})} placeholder="所属线路" className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            </div>
            
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>总孔数</Label>
              <Input type="number" value={newBridge.totalSpans} onChange={(e) => setNewBridge({...newBridge, totalSpans: parseInt(e.target.value) || 1})} min={1} max={50} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>默认孔长度(m)</Label>
                <Input type="number" value={newBridge.defaultSpanLength} onChange={(e) => setNewBridge({...newBridge, defaultSpanLength: parseFloat(e.target.value) || 20})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>每几孔设避车台(0=不设)</Label>
                <Input type="number" value={newBridge.shelterEvery} onChange={(e) => setNewBridge({...newBridge, shelterEvery: parseInt(e.target.value) || 0})} min={0} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            </div>

            {/* 避车台配置 */}
            <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/10">
              <Label className="text-purple-400 font-semibold flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4" />避车台配置
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>避车台位置</Label>
                  <Select value={newBridge.shelterSide} onValueChange={(v) => setNewBridge({...newBridge, shelterSide: v})}>
                    <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SHELTER_SIDE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div>
                            <div className="font-medium">{config.label}</div>
                            <div className="text-xs text-slate-400">{config.desc}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>避车台板数/侧</Label>
                  <Input type="number" value={newBridge.shelterBoards} onChange={(e) => setNewBridge({...newBridge, shelterBoards: parseInt(e.target.value) || 4})} min={1} max={20} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
              </div>
              <div className="mt-2">
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>限员人数</Label>
                <Input type="number" value={newBridge.shelterMaxPeople} onChange={(e) => setNewBridge({...newBridge, shelterMaxPeople: parseInt(e.target.value) || 4})} min={1} max={20} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>上行步行板数量/孔</Label>
                <Input type="number" value={newBridge.defaultUpstreamBoards} onChange={(e) => setNewBridge({...newBridge, defaultUpstreamBoards: parseInt(e.target.value) || 10})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>下行步行板数量/孔</Label>
                <Input type="number" value={newBridge.defaultDownstreamBoards} onChange={(e) => setNewBridge({...newBridge, defaultDownstreamBoards: parseInt(e.target.value) || 10})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>上行列数</Label>
                <Input type="number" value={newBridge.defaultUpstreamColumns} onChange={(e) => setNewBridge({...newBridge, defaultUpstreamColumns: parseInt(e.target.value) || 1})} min={1} max={4} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>下行列数</Label>
                <Input type="number" value={newBridge.defaultDownstreamColumns} onChange={(e) => setNewBridge({...newBridge, defaultDownstreamColumns: parseInt(e.target.value) || 1})} min={1} max={4} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            </div>

            {/* 步行板尺寸配置 */}
            <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
              <Label className="text-cyan-400 font-semibold flex items-center gap-2 mb-2">
                <Ruler className="w-4 h-4" />步行板尺寸配置
              </Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>长度(cm)</Label>
                  <Input type="number" value={newBridge.boardLength} onChange={(e) => setNewBridge({...newBridge, boardLength: parseFloat(e.target.value) || 100})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>宽度(cm)</Label>
                  <Input type="number" value={newBridge.boardWidth} onChange={(e) => setNewBridge({...newBridge, boardWidth: parseFloat(e.target.value) || 50})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>厚度(cm)</Label>
                  <Input type="number" value={newBridge.boardThickness} onChange={(e) => setNewBridge({...newBridge, boardThickness: parseFloat(e.target.value) || 5})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
              </div>
            </div>

            {/* 步行板材质配置 */}
            <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10">
              <Label className="text-green-400 font-semibold flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4" />步行板材质配置
              </Label>
              <Select value={newBridge.boardMaterial} onValueChange={(v) => setNewBridge({...newBridge, boardMaterial: v})}>
                <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BOARD_MATERIAL_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ background: config.color }} />
                        <div>
                          <div className="font-medium">{config.label}</div>
                          <div className="text-xs text-slate-400">{config.desc}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>取消</Button>
            <Button onClick={handleCreateBridge} className={theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}>创建桥梁</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 桥梁信息对话框 */}
      <Dialog open={bridgeInfoDialogOpen} onOpenChange={setBridgeInfoDialogOpen}>
        <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-2xl max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
              <Building2 className="w-5 h-5" />
              桥梁详细信息
            </DialogTitle>
          </DialogHeader>
          
          {selectedBridge && (
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className={`p-4 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700' : 'bg-gray-50 border border-gray-200'}`}>
                <h3 className={`text-sm font-semibold mb-3 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>基本信息</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>桥梁名称：</span>
                    <span className={theme === 'night' ? 'text-white font-medium' : 'text-gray-900 font-medium'}>{selectedBridge.name}</span>
                  </div>
                  <div>
                    <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>桥梁编号：</span>
                    <span className={theme === 'night' ? 'text-white font-medium' : 'text-gray-900 font-medium'}>{selectedBridge.bridgeCode}</span>
                  </div>
                  <div>
                    <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>线路名称：</span>
                    <span className={theme === 'night' ? 'text-white' : 'text-gray-900'}>{selectedBridge.lineName || '-'}</span>
                  </div>
                  <div>
                    <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>位置：</span>
                    <span className={theme === 'night' ? 'text-white' : 'text-gray-900'}>{selectedBridge.location || '-'}</span>
                  </div>
                  <div>
                    <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>总孔数：</span>
                    <span className={theme === 'night' ? 'text-white font-medium' : 'text-gray-900 font-medium'}>{selectedBridge.totalSpans}孔</span>
                  </div>
                </div>
              </div>

              {/* 统计概览 */}
              <div className={`p-4 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700' : 'bg-gray-50 border border-gray-200'}`}>
                <h3 className={`text-sm font-semibold mb-3 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>步行板统计</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  {(() => {
                    const allBoards = selectedBridge.spans.flatMap(s => s.walkingBoards)
                    const normal = allBoards.filter(b => b.status === 'normal').length
                    const damaged = allBoards.filter(b => ['minor_damage', 'severe_damage', 'fracture_risk'].includes(b.status)).length
                    const other = allBoards.filter(b => ['missing', 'replaced'].includes(b.status)).length
                    return (
                      <>
                        <div className={`text-center p-2 rounded ${theme === 'night' ? 'bg-green-500/10' : 'bg-green-50'}`}>
                          <div className="text-lg font-bold text-green-500">{normal}</div>
                          <div className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>正常</div>
                        </div>
                        <div className={`text-center p-2 rounded ${theme === 'night' ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
                          <div className="text-lg font-bold text-orange-500">{damaged}</div>
                          <div className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>损坏</div>
                        </div>
                        <div className={`text-center p-2 rounded ${theme === 'night' ? 'bg-gray-500/10' : 'bg-gray-100'}`}>
                          <div className="text-lg font-bold text-gray-500">{other}</div>
                          <div className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>其他</div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* 孔位列表 */}
              <div className={`p-4 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700' : 'bg-gray-50 border border-gray-200'}`}>
                <h3 className={`text-sm font-semibold mb-3 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>孔位详情</h3>
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {selectedBridge.spans.map(span => {
                      const upstream = span.walkingBoards.filter(b => b.position === 'upstream').length
                      const downstream = span.walkingBoards.filter(b => b.position === 'downstream').length
                      const shelter = span.walkingBoards.filter(b => b.position.startsWith('shelter')).length
                      const riskBoards = span.walkingBoards.filter(b => ['severe_damage', 'fracture_risk'].includes(b.status)).length
                      return (
                        <div key={span.id} className={`p-2 rounded border ${riskBoards > 0 ? 'border-red-500/30 bg-red-500/5' : theme === 'night' ? 'border-slate-700 bg-slate-800/30' : 'border-gray-200 bg-white'}`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-medium text-sm ${theme === 'night' ? 'text-white' : 'text-gray-900'}`}>第{span.spanNumber}孔</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>{span.spanLength}m</span>
                              {riskBoards > 0 && <Badge variant="outline" className="text-xs text-red-500 border-red-500/50">⚠{riskBoards}块损坏</Badge>}
                            </div>
                          </div>
                          <div className={`text-xs mt-1 space-x-3 ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>
                            <span>上行:{upstream}块</span>
                            <span>下行:{downstream}块</span>
                            {shelter > 0 && <span>避车台:{shelter}块</span>}
                            <span>材质:{BOARD_MATERIAL_CONFIG[span.boardMaterial]?.label || span.boardMaterial}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setBridgeInfoDialogOpen(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑桥梁对话框 */}
      <Dialog open={bridgeEditDialogOpen} onOpenChange={setBridgeEditDialogOpen}>
        <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-lg max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
              <Pencil className="w-5 h-5" />
              编辑桥梁信息
            </DialogTitle>
            <DialogDescription className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>修改桥梁的基本信息</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>桥梁名称 *</Label>
                <Input value={bridgeEditForm.name} onChange={(e) => setBridgeEditForm({...bridgeEditForm, name: e.target.value})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>桥梁编号 *</Label>
                <Input value={bridgeEditForm.bridgeCode} onChange={(e) => setBridgeEditForm({...bridgeEditForm, bridgeCode: e.target.value})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>位置</Label>
                <Input value={bridgeEditForm.location} onChange={(e) => setBridgeEditForm({...bridgeEditForm, location: e.target.value})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>线路名称</Label>
                <Input value={bridgeEditForm.lineName} onChange={(e) => setBridgeEditForm({...bridgeEditForm, lineName: e.target.value})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            </div>
            
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>总孔数</Label>
              <Input type="number" value={bridgeEditForm.totalSpans} onChange={(e) => setBridgeEditForm({...bridgeEditForm, totalSpans: parseInt(e.target.value) || 0})} min={1} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              <p className={`text-xs mt-1 ${theme === 'night' ? 'text-slate-500' : 'text-gray-400'}`}>注意：修改总孔数不会自动增减孔位，请通过添加/删除孔位操作</p>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setBridgeEditDialogOpen(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>取消</Button>
            <Button onClick={handleSaveBridgeEdit} className={theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}>
              <Save className="w-4 h-4 mr-2" />保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑孔位对话框 */}
      <Dialog open={spanEditDialogOpen} onOpenChange={setSpanEditDialogOpen}>
        <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-lg max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
              <Edit3 className="w-5 h-5" />
              编辑孔位配置 - 第{editingSpan?.spanNumber}孔
            </DialogTitle>
            <DialogDescription className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>修改孔位参数，步行板数量变化时将自动重新生成</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 孔位尺寸 */}
            <div>
              <Label className={`font-semibold text-xs ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>孔位参数</Label>
              <div className="mt-2">
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>孔长(m)</Label>
                <Input type="number" value={spanEditForm.spanLength} onChange={(e) => setSpanEditForm({...spanEditForm, spanLength: parseFloat(e.target.value) || 20})} step={0.1} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            </div>

            {/* 步行板数量配置 */}
            <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <Label className="text-blue-400 font-semibold flex items-center gap-2 mb-2 text-xs">
                <Layers className="w-3.5 h-3.5" />步行板数量配置
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>上行步行板数</Label>
                  <Input type="number" value={spanEditForm.upstreamBoards} onChange={(e) => setSpanEditForm({...spanEditForm, upstreamBoards: parseInt(e.target.value) || 0})} min={0} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>下行步行板数</Label>
                  <Input type="number" value={spanEditForm.downstreamBoards} onChange={(e) => setSpanEditForm({...spanEditForm, downstreamBoards: parseInt(e.target.value) || 0})} min={0} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>上行列数</Label>
                  <Input type="number" value={spanEditForm.upstreamColumns} onChange={(e) => setSpanEditForm({...spanEditForm, upstreamColumns: parseInt(e.target.value) || 1})} min={1} max={10} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>下行列数</Label>
                  <Input type="number" value={spanEditForm.downstreamColumns} onChange={(e) => setSpanEditForm({...spanEditForm, downstreamColumns: parseInt(e.target.value) || 1})} min={1} max={10} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
              </div>
            </div>

            {/* 避车台配置 */}
            <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5">
              <Label className="text-purple-400 font-semibold flex items-center gap-2 mb-2 text-xs">
                <ShieldAlert className="w-3.5 h-3.5" />避车台配置
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>避车台位置</Label>
                  <Select value={spanEditForm.shelterSide} onValueChange={(v) => setSpanEditForm({...spanEditForm, shelterSide: v})}>
                    <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SHELTER_SIDE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <div>{config.label}</div>
                            <div className="text-xs text-slate-400">{config.desc}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>避车台板数(每侧)</Label>
                  <Input type="number" value={spanEditForm.shelterBoards} onChange={(e) => setSpanEditForm({...spanEditForm, shelterBoards: parseInt(e.target.value) || 0})} min={0} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>最大站立人数</Label>
                  <Input type="number" value={spanEditForm.shelterMaxPeople} onChange={(e) => setSpanEditForm({...spanEditForm, shelterMaxPeople: parseInt(e.target.value) || 4})} min={1} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
              </div>
            </div>

            {/* 步行板尺寸配置 */}
            <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5">
              <Label className="text-orange-400 font-semibold flex items-center gap-2 mb-2 text-xs">
                <Ruler className="w-3.5 h-3.5" />步行板尺寸配置
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>长度(cm)</Label>
                  <Input type="number" value={spanEditForm.boardLength} onChange={(e) => setSpanEditForm({...spanEditForm, boardLength: parseFloat(e.target.value) || 100})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>宽度(cm)</Label>
                  <Input type="number" value={spanEditForm.boardWidth} onChange={(e) => setSpanEditForm({...spanEditForm, boardWidth: parseFloat(e.target.value) || 50})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>厚度(cm)</Label>
                  <Input type="number" value={spanEditForm.boardThickness} onChange={(e) => setSpanEditForm({...spanEditForm, boardThickness: parseFloat(e.target.value) || 5})} step={0.1} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
              </div>
            </div>

            {/* 步行板材质配置 */}
            <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
              <Label className="text-green-400 font-semibold flex items-center gap-2 mb-2 text-xs">
                <Palette className="w-3.5 h-3.5" />步行板材质配置
              </Label>
              <Select value={spanEditForm.boardMaterial} onValueChange={(v) => setSpanEditForm({...spanEditForm, boardMaterial: v})}>
                <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BOARD_MATERIAL_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ background: config.color }} />
                        <div>{config.label}</div>
                        <div className="text-xs text-slate-400">{config.desc}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 重新生成步行板提示 */}
            <div className={`p-3 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className="flex items-start gap-2">
                <RefreshCw className={`w-4 h-4 mt-0.5 flex-shrink-0 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-500'}`} />
                <div>
                  <p className={`text-xs ${theme === 'night' ? 'text-slate-300' : 'text-gray-700'}`}>
                    修改步行板数量或列数时会自动重新生成步行板（重置为正常状态）。
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`mt-2 h-7 text-xs ${theme === 'night' ? 'border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}
                    onClick={() => handleSaveSpanEdit(true)}
                    disabled={regenerating}
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${regenerating ? 'animate-spin' : ''}`} />
                    强制重新生成步行板
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-4 flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (editingSpan) {
                  handleDeleteSpan(editingSpan.id)
                  setSpanEditDialogOpen(false)
                }
              }}
              disabled={selectedBridge ? selectedBridge.spans.length <= 1 : false}
              className={theme === 'night' ? 'border-red-500/50 text-red-400 hover:bg-red-500/20 disabled:opacity-30' : 'border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-30'}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除此孔
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSpanEditDialogOpen(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>取消</Button>
              <Button onClick={() => handleSaveSpanEdit(false)} disabled={regenerating} className={theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}>
                {regenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {regenerating ? '生成中...' : '保存'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑步行板对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-lg max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className={theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}>编辑步行板状态</DialogTitle>
            <DialogDescription className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>
              {editingBoard && `位置：${editingBoard.position === 'upstream' ? '上行' : editingBoard.position === 'downstream' ? '下行' : editingBoard.position === 'shelter_left' ? '左侧避车台' : editingBoard.position === 'shelter_right' ? '右侧避车台' : '避车台'} 第${editingBoard.columnIndex}列 ${editingBoard.boardNumber}号`}
            </DialogDescription>
          </DialogHeader>
          
          {editingBoard && (
            <div className="space-y-4">
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>状态</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({...editForm, status: v})}>
                  <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BOARD_STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: config.color }} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>损坏描述</Label>
                <Textarea value={editForm.damageDesc} onChange={(e) => setEditForm({...editForm, damageDesc: e.target.value})} placeholder="描述损坏情况..." className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>检查人</Label>
                <Input value={editForm.inspectedBy} onChange={(e) => setEditForm({...editForm, inspectedBy: e.target.value})} placeholder="检查人员姓名" className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>防滑等级(%)</Label>
                  <Input type="number" value={editForm.antiSlipLevel} onChange={(e) => setEditForm({...editForm, antiSlipLevel: parseInt(e.target.value) || 100})} min={0} max={100} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>连接状态</Label>
                  <Select value={editForm.connectionStatus} onValueChange={(v) => setEditForm({...editForm, connectionStatus: v})}>
                    <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">正常</SelectItem>
                      <SelectItem value="loose">松动</SelectItem>
                      <SelectItem value="gap_large">间隙过大</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>天气条件</Label>
                  <Select value={editForm.weatherCondition} onValueChange={(v) => setEditForm({...editForm, weatherCondition: v})}>
                    <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">正常</SelectItem>
                      <SelectItem value="rain">雨天</SelectItem>
                      <SelectItem value="snow">雪天</SelectItem>
                      <SelectItem value="fog">雾天</SelectItem>
                      <SelectItem value="ice">冰冻</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>能见度(%)</Label>
                  <Input type="number" value={editForm.visibility} onChange={(e) => setEditForm({...editForm, visibility: parseInt(e.target.value) || 100})} min={0} max={100} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
              </div>
              
              {/* 栏杆状态和托架状态 - 非必填 */}
              <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
                <Label className="text-blue-400 font-semibold flex items-center gap-2 mb-2 text-xs">
                  附属设施状态（选填）
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>栏杆状态</Label>
                    <Select value={editForm.railingStatus || 'normal'} onValueChange={(v) => setEditForm({...editForm, railingStatus: v})}>
                      <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">正常</SelectItem>
                        <SelectItem value="loose">松动</SelectItem>
                        <SelectItem value="damaged">损坏</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>托架状态</Label>
                    <Select value={editForm.bracketStatus || 'normal'} onValueChange={(v) => setEditForm({...editForm, bracketStatus: v})}>
                      <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">正常</SelectItem>
                        <SelectItem value="loose">松动</SelectItem>
                        <SelectItem value="damaged">损坏</SelectItem>
                        <SelectItem value="corrosion">锈蚀</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="hasObstacle" checked={editForm.hasObstacle} onChange={(e) => setEditForm({...editForm, hasObstacle: e.target.checked})} className="rounded" />
                  <Label htmlFor="hasObstacle" className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>有杂物</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="hasWaterAccum" checked={editForm.hasWaterAccum} onChange={(e) => setEditForm({...editForm, hasWaterAccum: e.target.checked})} className="rounded" />
                  <Label htmlFor="hasWaterAccum" className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>有积水</Label>
                </div>
              </div>
              
              {editForm.hasObstacle && (
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>杂物描述</Label>
                  <Input value={editForm.obstacleDesc} onChange={(e) => setEditForm({...editForm, obstacleDesc: e.target.value})} placeholder="描述杂物情况" className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
              )}
              
              {editForm.hasWaterAccum && (
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>积水深度(cm)</Label>
                  <Input type="number" value={editForm.waterAccumDepth} onChange={(e) => setEditForm({...editForm, waterAccumDepth: parseFloat(e.target.value) || 0})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
                </div>
              )}
              
              {/* 备注信息 */}
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>备注</Label>
                <Textarea
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({...editForm, remarks: e.target.value})}
                  placeholder="添加备注信息..."
                  className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}
                  rows={2}
                />
              </div>

              {/* 尺寸编辑 */}
              <div className="space-y-3 pt-2 border-t border-slate-600/30">
                <Label className={`flex items-center gap-2 ${theme === 'night' ? 'text-slate-300' : 'text-gray-700'}`}>
                  <Ruler className="w-4 h-4" />
                  步行板尺寸
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>长度(cm)</Label>
                    <Input
                      type="number"
                      value={editForm.boardLength}
                      onChange={(e) => setEditForm({...editForm, boardLength: parseFloat(e.target.value) || 100})}
                      className={`h-8 text-sm ${theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>宽度(cm)</Label>
                    <Input
                      type="number"
                      value={editForm.boardWidth}
                      onChange={(e) => setEditForm({...editForm, boardWidth: parseFloat(e.target.value) || 50})}
                      className={`h-8 text-sm ${theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>厚度(cm)</Label>
                    <Input
                      type="number"
                      value={editForm.boardThickness}
                      onChange={(e) => setEditForm({...editForm, boardThickness: parseFloat(e.target.value) || 5})}
                      className={`h-8 text-sm ${theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}`}
                    />
                  </div>
                </div>
              </div>

              {/* 步行板照片 */}
              <div className="space-y-2">
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>步行板照片</Label>
                <PhotoUpload boardId={editingBoard.id} theme={theme} />
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>取消</Button>
            <Button onClick={handleUpdateBoard} className={theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI模型设置对话框 */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-md`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
              <Settings className="w-5 h-5" />
              AI模型配置
            </DialogTitle>
            <DialogDescription className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>
              选择AI服务商和模型，配置API密钥
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* AI服务商选择 */}
            <div className="space-y-2">
              <Label className={theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}>AI服务商</Label>
              <Select 
                value={aiConfig.provider} 
                onValueChange={(v) => {
                  const newConfig = { ...aiConfig, provider: v as AIConfig['provider'] }
                  // 根据服务商设置默认模型
                  if (v === 'glm') newConfig.model = 'glm-4'
                  else if (v === 'openai') newConfig.model = 'gpt-4o'
                  else if (v === 'claude') newConfig.model = 'claude-3-sonnet'
                  else if (v === 'deepseek') newConfig.model = 'deepseek-chat'
                  else if (v === 'minimax') newConfig.model = 'abab6.5-chat'
                  else if (v === 'kimi') newConfig.model = 'moonshot-v1-8k'
                  else newConfig.model = 'custom'
                  setAiConfig(newConfig)
                  setFetchedModels([])
                }}
              >
                <SelectTrigger className={theme === 'night' ? 'bg-slate-800 border-cyan-500/30 text-slate-200' : 'bg-gray-50 border-gray-300 text-gray-700'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={theme === 'night' ? 'bg-slate-800 border-cyan-500/30' : 'bg-white border-gray-200'}>
                  <SelectItem value="glm">智谱AI (GLM)</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                  <SelectItem value="deepseek">DeepSeek (深度求索)</SelectItem>
                  <SelectItem value="minimax">MiniMax (海螺AI)</SelectItem>
                  <SelectItem value="kimi">Kimi (月之暗面)</SelectItem>
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 模型选择 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className={theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}>模型</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={fetchingModels}
                  onClick={fetchModels}
                  className={`h-7 text-xs ${theme === 'night' ? 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}
                >
                  {fetchingModels ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" />获取中...</>
                  ) : (
                    <><Sparkles className="w-3 h-3 mr-1" />获取可用模型</>
                  )}
                </Button>
              </div>
              {fetchedModels.length > 0 ? (
                <Select
                  value={aiConfig.model}
                  onValueChange={(v) => setAiConfig({...aiConfig, model: v})}
                >
                  <SelectTrigger className={theme === 'night' ? 'bg-slate-800 border-cyan-500/30 text-slate-200' : 'bg-gray-50 border-gray-300 text-gray-700'}>
                    <SelectValue placeholder="选择模型" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'night' ? 'bg-slate-800 border-cyan-500/30' : 'bg-white border-gray-200'}>
                    {fetchedModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name || m.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={aiConfig.model}
                  onValueChange={(v) => setAiConfig({...aiConfig, model: v})}
                >
                  <SelectTrigger className={theme === 'night' ? 'bg-slate-800 border-cyan-500/30 text-slate-200' : 'bg-gray-50 border-gray-300 text-gray-700'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={theme === 'night' ? 'bg-slate-800 border-cyan-500/30' : 'bg-white border-gray-200'}>
                    {aiConfig.provider === 'glm' && (
                      <>
                        <SelectItem value="glm-4">GLM-4</SelectItem>
                        <SelectItem value="glm-4-plus">GLM-4-Plus</SelectItem>
                        <SelectItem value="glm-4-flash">GLM-4-Flash</SelectItem>
                        <SelectItem value="glm-4-air">GLM-4-Air</SelectItem>
                      </>
                    )}
                    {aiConfig.provider === 'openai' && (
                      <>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      </>
                    )}
                    {aiConfig.provider === 'claude' && (
                      <>
                        <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                        <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                        <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                      </>
                    )}
                    {aiConfig.provider === 'deepseek' && (
                      <>
                        <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                        <SelectItem value="deepseek-coder">DeepSeek Coder</SelectItem>
                        <SelectItem value="deepseek-reasoner">DeepSeek Reasoner (R1)</SelectItem>
                      </>
                    )}
                    {aiConfig.provider === 'minimax' && (
                      <>
                        <SelectItem value="abab6.5-chat">ABAB 6.5 Chat</SelectItem>
                        <SelectItem value="abab6.5s-chat">ABAB 6.5s Chat</SelectItem>
                        <SelectItem value="abab5.5-chat">ABAB 5.5 Chat</SelectItem>
                      </>
                    )}
                    {aiConfig.provider === 'kimi' && (
                      <>
                        <SelectItem value="moonshot-v1-8k">Moonshot V1 8K</SelectItem>
                        <SelectItem value="moonshot-v1-32k">Moonshot V1 32K</SelectItem>
                        <SelectItem value="moonshot-v1-128k">Moonshot V1 128K</SelectItem>
                      </>
                    )}
                    {aiConfig.provider === 'custom' && (
                      <SelectItem value="custom">自定义模型</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
              {fetchedModels.length > 0 && (
                <p className={`text-xs ${theme === 'night' ? 'text-slate-500' : 'text-gray-400'}`}>
                  已获取 {fetchedModels.length} 个模型，点击「获取可用模型」刷新列表
                </p>
              )}
            </div>
            
            {/* API密钥 */}
            <div className="space-y-2">
              <Label className={theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}>API密钥</Label>
              <Input 
                type="password" 
                value={aiConfig.apiKey} 
                onChange={(e) => setAiConfig({...aiConfig, apiKey: e.target.value})}
                placeholder="输入您的API密钥" 
                className={theme === 'night' ? 'bg-slate-800 border-cyan-500/30' : 'bg-gray-50 border-gray-300'}
              />
            </div>
            
            {/* API Base URL提示 */}
            {(aiConfig.provider === 'deepseek' || aiConfig.provider === 'minimax' || aiConfig.provider === 'kimi' || aiConfig.provider === 'custom') && (
              <div className="space-y-2">
                <Label className={theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}>API Base URL (可选)</Label>
                <Input 
                  value={aiConfig.baseUrl} 
                  onChange={(e) => setAiConfig({...aiConfig, baseUrl: e.target.value})}
                  placeholder={
                    aiConfig.provider === 'deepseek' ? 'https://api.deepseek.com/v1' :
                    aiConfig.provider === 'minimax' ? 'https://api.minimax.chat/v1' :
                    aiConfig.provider === 'kimi' ? 'https://api.moonshot.cn/v1' :
                    'https://api.example.com/v1'
                  } 
                  className={theme === 'night' ? 'bg-slate-800 border-cyan-500/30' : 'bg-gray-50 border-gray-300'}
                />
                <p className={`text-xs ${theme === 'night' ? 'text-slate-500' : 'text-gray-400'}`}>
                  {aiConfig.provider === 'deepseek' && 'DeepSeek API 地址: https://api.deepseek.com/v1'}
                  {aiConfig.provider === 'minimax' && 'MiniMax API 地址: https://api.minimax.chat/v1'}
                  {aiConfig.provider === 'kimi' && 'Kimi API 地址: https://api.moonshot.cn/v1'}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>取消</Button>
            <Button onClick={() => saveAiConfig(aiConfig)} className={theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}>保存配置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 桥梁安全报告对话框 */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-3xl max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
              <FileText className="w-5 h-5" />
              桥梁安全报告
            </DialogTitle>
            <DialogDescription className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>
              桥梁步行板状况汇总及人员作业走行建议
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <ScrollArea className="h-[60vh]">
              <div id="report-content" className={`prose prose-sm max-w-none ${theme === 'night' ? 'prose-invert' : ''}`}>
                {reportContent.split('\n').map((line, i) => {
                  // 标题
                  if (line.startsWith('# ')) {
                    return <h1 key={i} className={`text-2xl font-bold mb-4 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>{line.slice(2)}</h1>
                  }
                  if (line.startsWith('## ')) {
                    return <h2 key={i} className={`text-xl font-bold mt-6 mb-3 ${theme === 'night' ? 'text-cyan-300' : 'text-blue-600'}`}>{line.slice(3)}</h2>
                  }
                  if (line.startsWith('### ')) {
                    return <h3 key={i} className={`text-lg font-bold mt-4 mb-2 ${theme === 'night' ? 'text-cyan-200' : 'text-blue-500'}`}>{line.slice(4)}</h3>
                  }
                  // 列表项
                  if (line.startsWith('- ')) {
                    return <p key={i} className={`ml-4 my-1 ${theme === 'night' ? 'text-slate-300' : 'text-gray-600'}`}>• {line.slice(2)}</p>
                  }
                  if (line.match(/^\d+\./)) {
                    return <p key={i} className={`ml-4 my-1 ${theme === 'night' ? 'text-slate-300' : 'text-gray-600'}`}>{line}</p>
                  }
                  // 表格
                  if (line.startsWith('|')) {
                    return <div key={i} className={`font-mono text-sm ${theme === 'night' ? 'text-slate-300' : 'text-gray-600'}`}>{line}</div>
                  }
                  // 分隔线
                  if (line.startsWith('---')) {
                    return <hr key={i} className={`my-4 ${theme === 'night' ? 'border-slate-700' : 'border-gray-200'}`} />
                  }
                  // 粗体文本
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={i} className={`font-bold ${theme === 'night' ? 'text-white' : 'text-gray-900'}`}>{line.slice(2, -2)}</p>
                  }
                  // 列表项带 *
                  if (line.startsWith('*')) {
                    return <p key={i} className={`text-sm italic mt-4 ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>{line}</p>
                  }
                  // 空行
                  if (line.trim() === '') {
                    return <div key={i} className="h-2" />
                  }
                  // 普通文本
                  return <p key={i} className={theme === 'night' ? 'text-slate-300' : 'text-gray-600'}>{line}</p>
                })}
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>关闭</Button>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(reportContent)
                toast.success('报告已复制到剪贴板')
              }}
              className={theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}
            >
              复制报告
            </Button>
            <Button
              onClick={async () => {
                try {
                  const bridgeName = selectedBridge?.name || '桥梁'
                  const date = new Date().toISOString().slice(0, 10)
                  await exportReportToPdf('report-content', `桥梁报告_${bridgeName}_${date}.pdf`)
                  toast.success('PDF报告已生成并下载')
                } catch (err) {
                  console.error('导出PDF失败:', err)
                  toast.error('导出PDF失败，请重试')
                }
              }}
              className={theme === 'night' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}
            >
              <Download className="w-4 h-4 mr-1" />
              导出PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3D全屏显示对话框 */}
      <Dialog open={is3DFullscreen} onOpenChange={setIs3DFullscreen}>
        <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-[95vw] w-[95vw] h-[95vh] max-h-[95vh] p-0`}>
          <div className="relative w-full h-full">
            {/* 关闭按钮 */}
            <button
              onClick={() => setIs3DFullscreen(false)}
              className={`absolute top-4 right-4 z-50 p-2 rounded-lg transition-colors ${
                theme === 'night' 
                  ? 'bg-slate-800/80 text-cyan-400 hover:bg-slate-700 border border-cyan-500/30' 
                  : 'bg-white/80 text-blue-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* 孔位切换 */}
            {selectedBridge && selectedBridge.spans.length > 1 && (
              <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedSpanIndex(Math.max(0, selectedSpanIndex - 1))} 
                  disabled={selectedSpanIndex === 0}
                  className={theme === 'night' ? 'bg-slate-800/80 text-cyan-400 hover:bg-slate-700 border border-cyan-500/30' : 'bg-white/80 text-blue-600 hover:bg-gray-100 border border-gray-200'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  theme === 'night' ? 'bg-slate-800/80 text-cyan-400 border border-cyan-500/30' : 'bg-white/80 text-blue-600 border border-gray-200'
                }`}>
                  第 {selectedSpanIndex + 1} 孔 / 共 {selectedBridge.totalSpans} 孔
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedSpanIndex(Math.min(selectedBridge.spans.length - 1, selectedSpanIndex + 1))} 
                  disabled={selectedSpanIndex === selectedBridge.spans.length - 1}
                  className={theme === 'night' ? 'bg-slate-800/80 text-cyan-400 hover:bg-slate-700 border border-cyan-500/30' : 'bg-white/80 text-blue-600 hover:bg-gray-100 border border-gray-200'}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {/* 3D视图 */}
            <div className="w-full h-full">
              {render3DBridge()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 批量编辑步行板对话框 */}
      <Dialog open={batchEditDialogOpen} onOpenChange={setBatchEditDialogOpen}>
        <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-md`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${theme === 'night' ? 'text-purple-400' : 'text-purple-600'}`}>
              <Edit3 className="w-5 h-5" />
              批量编辑步行板
            </DialogTitle>
            <DialogDescription className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>
              已选择 {selectedBoards.length} 块步行板，空白字段将保持不变
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* 状态 */}
            <div className="space-y-2">
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>状态（留空保持不变）</Label>
              <Select 
                value={batchEditForm.status} 
                onValueChange={(v) => setBatchEditForm({...batchEditForm, status: v === 'keep' ? '' : v})}
              >
                <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                  <SelectValue placeholder="保持不变" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">保持不变</SelectItem>
                  {Object.entries(BOARD_STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: config.color }} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 栏杆状态 */}
            <div className="space-y-2">
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>栏杆状态（留空保持不变）</Label>
              <Select 
                value={batchEditForm.railingStatus} 
                onValueChange={(v) => setBatchEditForm({...batchEditForm, railingStatus: v === 'keep' ? '' : v})}
              >
                <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                  <SelectValue placeholder="保持不变" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">保持不变</SelectItem>
                  {RAILING_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-slate-400">{option.desc}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 托架状态 */}
            <div className="space-y-2">
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>托架状态（留空保持不变）</Label>
              <Select 
                value={batchEditForm.bracketStatus} 
                onValueChange={(v) => setBatchEditForm({...batchEditForm, bracketStatus: v === 'keep' ? '' : v})}
              >
                <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                  <SelectValue placeholder="保持不变" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">保持不变</SelectItem>
                  {BRACKET_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-slate-400">{option.desc}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 备注 */}
            <div className="space-y-2">
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>备注（留空保持不变）</Label>
              <Textarea
                value={batchEditForm.remarks}
                onChange={(e) => setBatchEditForm({...batchEditForm, remarks: e.target.value})}
                placeholder="添加备注信息..."
                className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}
                rows={2}
              />
            </div>

            {/* 检查人 */}
            <div className="space-y-2">
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>检查人（留空默认为"批量编辑"）</Label>
              <Input
                value={batchEditForm.inspectedBy}
                onChange={(e) => setBatchEditForm({...batchEditForm, inspectedBy: e.target.value})}
                placeholder="检查人员姓名"
                className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}
              />
            </div>
            
            {/* 尺寸编辑开关 */}
            <div className="space-y-3 pt-2 border-t border-slate-600/30">
              <div className="flex items-center justify-between">
                <Label className={`flex items-center gap-2 ${theme === 'night' ? 'text-slate-300' : 'text-gray-700'}`}>
                  <Ruler className="w-4 h-4" />
                  同步修改尺寸
                </Label>
                <Switch
                  checked={batchEditForm.editSize}
                  onCheckedChange={(checked) => setBatchEditForm({...batchEditForm, editSize: checked})}
                />
              </div>
              
              {batchEditForm.editSize && (
                <div className="grid grid-cols-3 gap-3 animate-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <Label className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>长度(cm)</Label>
                    <Input 
                      type="number" 
                      value={batchEditForm.boardLength} 
                      onChange={(e) => setBatchEditForm({...batchEditForm, boardLength: parseFloat(e.target.value) || 100})}
                      className={`h-8 text-sm ${theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>宽度(cm)</Label>
                    <Input 
                      type="number" 
                      value={batchEditForm.boardWidth} 
                      onChange={(e) => setBatchEditForm({...batchEditForm, boardWidth: parseFloat(e.target.value) || 50})}
                      className={`h-8 text-sm ${theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>厚度(cm)</Label>
                    <Input 
                      type="number" 
                      value={batchEditForm.boardThickness} 
                      onChange={(e) => setBatchEditForm({...batchEditForm, boardThickness: parseFloat(e.target.value) || 5})}
                      className={`h-8 text-sm ${theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}`}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchEditDialogOpen(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>取消</Button>
            <Button onClick={handleBatchUpdateBoards} className={theme === 'night' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-purple-600 hover:bg-purple-500'}>
              批量更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导入配置对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-md`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
              <Import className="w-5 h-5" />
              导入Excel数据
            </DialogTitle>
            <DialogDescription className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>
              已选择文件: {importFile?.name || '未选择'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* 导入模式 */}
            <div className="space-y-2">
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>导入模式</Label>
              <Select 
                value={importConfig.mode} 
                onValueChange={(v) => setImportConfig({...importConfig, mode: v as 'merge' | 'replace'})}
              >
                <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">
                    <div>
                      <div className="font-medium">合并模式</div>
                      <div className="text-xs text-slate-400">保留现有数据，新增导入的数据</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="replace">
                    <div>
                      <div className="font-medium">替换模式</div>
                      <div className="text-xs text-slate-400">删除现有数据，完全替换为导入数据</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 导入选项 */}
            <div className="space-y-3 pt-2">
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>导入选项</Label>
              
              <div className="flex items-center justify-between">
                <span className={`text-sm ${theme === 'night' ? 'text-slate-400' : 'text-gray-600'}`}>导入桥梁信息</span>
                <Switch
                  checked={importConfig.importBridges}
                  onCheckedChange={(checked) => setImportConfig({...importConfig, importBridges: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`text-sm ${theme === 'night' ? 'text-slate-400' : 'text-gray-600'}`}>导入孔位信息</span>
                <Switch
                  checked={importConfig.importSpans}
                  onCheckedChange={(checked) => setImportConfig({...importConfig, importSpans: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`text-sm ${theme === 'night' ? 'text-slate-400' : 'text-gray-600'}`}>导入步行板信息</span>
                <Switch
                  checked={importConfig.importBoards}
                  onCheckedChange={(checked) => setImportConfig({...importConfig, importBoards: checked})}
                />
              </div>
              
              {importConfig.mode === 'merge' && (
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${theme === 'night' ? 'text-slate-400' : 'text-gray-600'}`}>跳过已存在的桥梁</span>
                  <Switch
                    checked={importConfig.skipExisting}
                    onCheckedChange={(checked) => setImportConfig({...importConfig, skipExisting: checked})}
                  />
                </div>
              )}
            </div>
            
            {/* 模板下载提示 */}
            <div className={`p-3 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-start gap-2">
                <Info className={`w-4 h-4 mt-0.5 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-500'}`} />
                <div>
                  <p className={`text-sm ${theme === 'night' ? 'text-slate-300' : 'text-gray-700'}`}>需要导入模板？</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className={`h-auto p-0 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}
                    onClick={() => { handleDownloadTemplate(); setImportDialogOpen(false); }}
                  >
                    点击下载标准导入模板
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportFile(null); }} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>取消</Button>
            <Button onClick={handleExecuteImport} className={theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}>
              <Import className="w-4 h-4 mr-2" />
              开始导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 操作日志对话框 */}
      <OperationLogDialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} />

      {/* 修改密码对话框 */}
      <ChangePasswordDialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} theme={theme} />

      {/* 移动端手势引导 */}
      {isMobile && <MobileGestureGuide theme={theme} />}
    </div>
  )
}
