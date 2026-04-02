'use client'

import { useCallback } from 'react'
import dynamic from 'next/dynamic'
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
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
import ChangePasswordDialog from '@/components/auth/ChangePasswordDialog'
import AIConfigDialog from '@/components/bridge/AIConfigDialog'
import BatchEditDialog from '@/components/bridge/BatchEditDialog'
import BridgeEditDialog from '@/components/bridge/BridgeEditDialog'
import BridgeInfoDialog from '@/components/bridge/BridgeInfoDialog'
import CreateBridgeDialog from '@/components/bridge/CreateBridgeDialog'
import EditBoardDialog from '@/components/bridge/EditBoardDialog'
import Fullscreen3DDialog from '@/components/bridge/Fullscreen3DDialog'
import ImportDialog from '@/components/bridge/ImportDialog'
import MobileGestureGuide from '@/components/bridge/MobileGestureGuide'
import ReportDialog from '@/components/bridge/ReportDialog'
import SpanEditDialog from '@/components/bridge/SpanEditDialog'
import { syncService } from '@/lib/sync-service'
import { exportReportToPdf, exportBoardStatusPdf } from '@/lib/pdf-export'
import TrendAnalysis from '@/components/bridge/TrendAnalysis'
import Bridge2DView from '@/components/bridge/Bridge2DView'
import PhotoUpload from '@/components/bridge/PhotoUpload'
import NotificationBell from '@/components/bridge/NotificationBell'
import { useBridgePage } from '@/hooks/useBridgePage'
import {
  BOARD_STATUS_CONFIG,
  BOARD_MATERIAL_CONFIG,
  SHELTER_SIDE_CONFIG,
  RAILING_STATUS_OPTIONS,
  BRACKET_STATUS_OPTIONS,
  ROLE_LABELS,
} from '@/lib/bridge-constants'
import type { AIConfig } from '@/types/bridge'

// Dynamic import for 3D component (SSR disabled)
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

export default function BridgeVisualizationSystem() {
  const router = useRouter()

  const {
    // Auth
    currentUser,
    checkingAuth,
    changePasswordOpen,
    setChangePasswordOpen,
    hasPermission,
    handleLogout,
    // Theme
    theme,
    toggleTheme,
    // View
    viewAngle,
    setViewAngle,
    zoomLevel,
    setZoomLevel,
    selectedSpanIndex,
    setSelectedSpanIndex,
    viewMode,
    setViewMode,
    is3DFullscreen,
    setIs3DFullscreen,
    pinchScale,
    setPinchScale,
    // Mobile
    mobileTab,
    setMobileTab,
    mobileMenuOpen,
    setMobileMenuOpen,
    mobilePanelOpen,
    setMobilePanelOpen,
    isMobile,
    isPortrait,
    sidebarCollapsed,
    setSidebarCollapsed,
    // UI
    visibleSpanIndex,
    logDialogOpen,
    setLogDialogOpen,
    isOnline,
    offlineEdits,
    setOfflineEdits,
    isSyncing,
    setIsSyncing,
    safetyTipDismissed,
    setSafetyTipDismissed,
    isReadOnly,
    // Refs
    fullBridgeScrollRef,
    spanRefs,
    boardListScrollRef,
    // Virtualization
    sortedBoards,
    boardVirtualizer,
    // Composed hooks
    bridgeData,
    aiAssistant,
    bridgeCRUD,
    boardEditing,
    dataImport,
    // Handlers
    scrollToSpan,
    handlePinchZoom,
    handlePinchEnd,
    generateReport,
    getAlertInfo,
    renderMarkdownText,
    // Report
    reportContent,
    reportDialogOpen,
    setReportDialogOpen,
    generatingReport,
  } = useBridgePage()

  // Flatten sub-hooks for convenient access in JSX
  const {
    selectedBridge,
    setSelectedBridge,
    bridges,
    setBridges,
    bridgeStats,
    loading,
    bridgeViewMode,
    setBridgeViewMode,
    rightPanelOpen,
    setRightPanelOpen,
    highRiskFilter,
    setHighRiskFilter,
    loadBridges,
    loadSummary,
    refreshBridgeData,
    refreshAllData,
  } = bridgeData

  const {
    aiMessages,
    aiInput,
    setAiInput,
    aiLoading,
    aiAnalyzing,
    rightPanelTab,
    setRightPanelTab,
    aiConfig,
    setAiConfig,
    fetchedModels,
    setFetchedModels,
    fetchingModels,
    settingsOpen,
    setSettingsOpen,
    messagesEndRef,
    handleAISend,
    handleAIAnalyze,
    fetchModels,
    saveAiConfig,
  } = aiAssistant

  const {
    createDialogOpen,
    setCreateDialogOpen,
    bridgeInfoDialogOpen,
    setBridgeInfoDialogOpen,
    bridgeEditDialogOpen,
    setBridgeEditDialogOpen,
    spanEditDialogOpen,
    setSpanEditDialogOpen,
    editingSpan,
    bridgeEditForm,
    setBridgeEditForm,
    spanEditForm,
    setSpanEditForm,
    newBridge,
    setNewBridge,
    regenerating,
    handleCreateBridge,
    handleDeleteBridge,
    handleViewBridgeInfo,
    handleEditBridge,
    handleSaveBridgeEdit,
    handleEditSpan,
    handleSaveSpanEdit,
    handleAddSpan,
    handleDeleteSpan,
  } = bridgeCRUD

  const {
    editingBoard,
    editDialogOpen,
    setEditDialogOpen,
    editForm,
    setEditForm,
    detailDialogOpen,
    selectedBoardForDetail,
    batchMode,
    setBatchMode,
    selectedBoards,
    setSelectedBoards,
    batchEditDialogOpen,
    setBatchEditDialogOpen,
    batchEditForm,
    setBatchEditForm,
    handleUpdateBoard,
    handleBatchUpdateBoards,
    toggleBoardSelection,
    toggleSelectAll,
    openEditDialog,
    openDetailDialog,
  } = boardEditing

  const {
    importDialogOpen,
    setImportDialogOpen,
    importFile,
    setImportFile,
    importConfig,
    setImportConfig,
    handleExportData,
    handleDownloadTemplate,
    handleSelectImportFile,
    handleExecuteImport,
    handleQuickImportData,
  } = dataImport


  // 渲染3D桥梁视图 - 使用增强的Three.js场景
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
          <span className="text-xs">概览</span>
        </button>
        <button
          onClick={() => { setMobileTab('detail'); setMobilePanelOpen(false) }}
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
              
              {/* 导航菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="tech-button" title="导航菜单">
                    <Settings className={`w-5 h-5 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={theme === 'night' ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'}>
                  <DropdownMenuItem onClick={() => router.push('/dashboard')} className={theme === 'night' ? 'text-slate-300 hover:bg-slate-700 focus:bg-slate-700' : ''}>
                    <LayoutDashboard className="w-4 h-4 mr-2" />数据总览
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/map')} className={theme === 'night' ? 'text-slate-300 hover:bg-slate-700 focus:bg-slate-700' : ''}>
                    <MapPin className="w-4 h-4 mr-2" />桥梁地图
                  </DropdownMenuItem>
                  {hasPermission('bridge:read') && (
                  <DropdownMenuItem onClick={() => router.push('/inspection')} className={theme === 'night' ? 'text-slate-300 hover:bg-slate-700 focus:bg-slate-700' : ''}>
                    <ClipboardList className="w-4 h-4 mr-2" />巡检管理
                  </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => window.open('/bridge-3d', '_blank')} className={theme === 'night' ? 'text-slate-300 hover:bg-slate-700 focus:bg-slate-700' : ''}>
                    <Box className="w-4 h-4 mr-2" />3D模型
                  </DropdownMenuItem>
                  {hasPermission('ai:use') && (
                  <>
                    <DropdownMenuSeparator className={theme === 'night' ? 'bg-slate-600' : ''} />
                    <DropdownMenuItem onClick={() => setSettingsOpen(true)} className={theme === 'night' ? 'text-cyan-400 hover:bg-slate-700 focus:bg-slate-700' : ''}>
                      <Settings className="w-4 h-4 mr-2" />AI设置
                    </DropdownMenuItem>
                  </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
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
                    viewMode === '3d' ? render3DBridge() : (
                      <Bridge2DView
                        selectedBridge={selectedBridge!}
                        selectedSpanIndex={selectedSpanIndex}
                        bridgeViewMode={bridgeViewMode}
                        highRiskFilter={highRiskFilter}
                        theme={theme}
                        batchMode={batchMode}
                        selectedBoards={selectedBoards}
                        visibleSpanIndex={visibleSpanIndex}
                        fullBridgeScrollRef={fullBridgeScrollRef}
                        spanRefs={spanRefs}
                        hasPermission={hasPermission}
                        onEditBoard={openEditDialog}
                        onToggleBoardSelection={toggleBoardSelection}
                        onScrollToSpan={scrollToSpan}
                        onSetSelectedSpanIndex={setSelectedSpanIndex}
                        onSetHighRiskFilter={setHighRiskFilter}
                      />
                    )
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
                              <span className={theme === 'night' ? 'text-white' : 'text-gray-900'}>{BOARD_MATERIAL_CONFIG[selectedBridge.spans[selectedSpanIndex]?.boardMaterial || 'galvanized_steel']?.label || '镀锌钢'}</span>
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
                            onClick={() => handleViewBridgeInfo()}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            查看桥梁信息
                          </Button>
                          {hasPermission('bridge:write') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className={`w-full font-medium ${theme === 'night' ? 'border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}
                            onClick={() => handleEditBridge()}
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
      <CreateBridgeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        theme={theme}
        newBridge={newBridge}
        setNewBridge={setNewBridge}
        onCreate={handleCreateBridge}
      />

      {/* 桥梁信息对话框 */}
      <BridgeInfoDialog
        open={bridgeInfoDialogOpen}
        onOpenChange={setBridgeInfoDialogOpen}
        theme={theme}
        bridge={selectedBridge}
      />

      {/* 编辑桥梁对话框 */}
      <BridgeEditDialog
        open={bridgeEditDialogOpen}
        onOpenChange={setBridgeEditDialogOpen}
        theme={theme}
        form={bridgeEditForm}
        setForm={setBridgeEditForm}
        onSave={handleSaveBridgeEdit}
      />

      {/* 编辑孔位对话框 */}
      <SpanEditDialog
        open={spanEditDialogOpen}
        onOpenChange={setSpanEditDialogOpen}
        theme={theme}
        editingSpan={editingSpan}
        form={spanEditForm}
        setForm={setSpanEditForm}
        regenerating={regenerating}
        onSave={handleSaveSpanEdit}
        onDelete={handleDeleteSpan}
        totalSpans={selectedBridge?.spans.length || 0}
      />

      {/* 编辑步行板对话框 */}
      <EditBoardDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        theme={theme}
        editingBoard={editingBoard}
        form={editForm}
        setForm={setEditForm}
        onSave={handleUpdateBoard}
      />

      {/* AI模型设置对话框 */}
      <AIConfigDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        theme={theme}
        aiConfig={aiConfig}
        setAiConfig={setAiConfig}
        fetchedModels={fetchedModels}
        fetchingModels={fetchingModels}
        onFetchModels={fetchModels}
        onSave={saveAiConfig}
      />

      {/* 桥梁安全报告对话框 */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        theme={theme}
        content={reportContent}
        bridgeName={selectedBridge?.name || '桥梁'}
      />

      {/* 3D全屏显示对话框 */}
      <Fullscreen3DDialog
        open={is3DFullscreen}
        onOpenChange={setIs3DFullscreen}
        theme={theme}
        bridge={selectedBridge}
        spanIndex={selectedSpanIndex}
        setSpanIndex={setSelectedSpanIndex}
        render3DBridge={render3DBridge}
      />

      {/* 批量编辑步行板对话框 */}
      <BatchEditDialog
        open={batchEditDialogOpen}
        onOpenChange={setBatchEditDialogOpen}
        theme={theme}
        selectedCount={selectedBoards.length}
        form={batchEditForm}
        setForm={setBatchEditForm}
        onBatchUpdate={handleBatchUpdateBoards}
      />

      {/* 导入配置对话框 */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={(open) => { if (!open) setImportFile(null); setImportDialogOpen(open) }}
        theme={theme}
        importFile={importFile}
        importConfig={importConfig}
        setImportConfig={setImportConfig}
        onExecuteImport={handleExecuteImport}
        onDownloadTemplate={() => { handleDownloadTemplate(); setImportDialogOpen(false) }}
      />

      {/* 操作日志对话框 */}
      <OperationLogDialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} />

      {/* 修改密码对话框 */}
      <ChangePasswordDialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} theme={theme} />

      {/* 移动端手势引导 */}
      {isMobile && <MobileGestureGuide theme={theme} />}
    </div>
  )
}
