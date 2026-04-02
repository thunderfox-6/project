'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTheme } from '@/components/ThemeProvider'
import { useAuthContext } from '@/components/auth/AuthProvider'
import { authFetch } from '@/lib/bridge-constants'
import { useBridgeData } from '@/hooks/useBridgeData'
import { useAIAssistant } from '@/hooks/useAIAssistant'
import { useBridgeCRUD } from '@/hooks/useBridgeCRUD'
import { useBoardEditing } from '@/hooks/useBoardEditing'
import { useDataImport } from '@/hooks/useDataImport'
import type { CurrentUser, MobileTab } from '@/types/bridge'

export function useBridgePage() {
  const router = useRouter()
  const { hasPermission } = useAuthContext()
  const { theme, toggleTheme } = useTheme()

  // Auth state
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  // View state
  const [viewAngle, setViewAngle] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [selectedSpanIndex, setSelectedSpanIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('2d')
  const [is3DFullscreen, setIs3DFullscreen] = useState(false)
  const [pinchScale, setPinchScale] = useState(1)

  // Mobile state
  const [mobileTab, setMobileTab] = useState<MobileTab>('bridge')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // UI state
  const [visibleSpanIndex, setVisibleSpanIndex] = useState(0)
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [offlineEdits, setOfflineEdits] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [safetyTipDismissed, setSafetyTipDismissed] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)

  // Refs
  const fullBridgeScrollRef = useRef<HTMLDivElement>(null)
  const spanRefs = useRef<(HTMLDivElement | null)[]>([])
  const boardListScrollRef = useRef<HTMLDivElement>(null)

  // Compose hooks
  const bridgeData = useBridgeData()
  const aiAssistant = useAIAssistant({
    selectedBridge: bridgeData.selectedBridge,
    selectedSpanIndex,
    refreshBridgeData: bridgeData.refreshBridgeData,
  })
  const bridgeCRUD = useBridgeCRUD({
    selectedBridge: bridgeData.selectedBridge,
    selectedSpanIndex,
    setSelectedBridge: bridgeData.setSelectedBridge,
    setBridges: bridgeData.setBridges,
    setSelectedSpanIndex,
    loadBridges: bridgeData.loadBridges,
    loadSummary: bridgeData.loadSummary,
    refreshAllData: bridgeData.refreshAllData,
  })
  const boardEditing = useBoardEditing({
    selectedBridge: bridgeData.selectedBridge,
    selectedSpanIndex,
    refreshBridgeData: bridgeData.refreshBridgeData,
  })
  const dataImport = useDataImport({
    refreshAllData: bridgeData.refreshAllData,
  })

  // Virtual scrolling
  const sortedBoards = useMemo(() => {
    if (!bridgeData.selectedBridge || !bridgeData.selectedBridge.spans[selectedSpanIndex]) return []
    return [...bridgeData.selectedBridge.spans[selectedSpanIndex].walkingBoards].sort((a, b) => {
      if (a.position !== b.position) return a.position.localeCompare(b.position)
      if (a.columnIndex !== b.columnIndex) return a.columnIndex - b.columnIndex
      return a.boardNumber - b.boardNumber
    })
  }, [bridgeData.selectedBridge, selectedSpanIndex])

  const boardVirtualizer = useVirtualizer({
    count: sortedBoards.length,
    getScrollElement: () => boardListScrollRef.current,
    estimateSize: () => 44,
    overscan: 10,
  })

  // Check auth
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
        if (user.role === 'viewer') setIsReadOnly(true)
      } catch {
        router.push('/login')
        return
      }

      setCheckingAuth(false)
    }

    checkAuth()
  }, [router])

  // Detect mobile and orientation
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const mobile = width < 768
      const portrait = height > width

      setIsMobile(mobile)
      setIsPortrait(portrait)

      if (mobile && portrait) {
        setSidebarCollapsed(true)
        bridgeData.setRightPanelOpen(false)
      }
    }
    checkDevice()
    window.addEventListener('resize', checkDevice)
    window.addEventListener('orientationchange', checkDevice)
    return () => {
      window.removeEventListener('resize', checkDevice)
      window.removeEventListener('orientationchange', checkDevice)
    }
  }, [bridgeData.setRightPanelOpen])

  // Monitor network status
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
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Full bridge mode scroll observer
  useEffect(() => {
    if (bridgeData.bridgeViewMode !== 'full' || !fullBridgeScrollRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter(e => e.isIntersecting)
        if (visibleEntries.length > 0) {
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

    spanRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [bridgeData.bridgeViewMode, bridgeData.selectedBridge])

  // Scroll to span
  const scrollToSpan = useCallback((index: number) => {
    const el = spanRefs.current[index]
    if (el && fullBridgeScrollRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setSelectedSpanIndex(index)
    }
  }, [])

  // Pinch zoom
  const handlePinchZoom = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )

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

  // Logout
  const handleLogout = useCallback(async () => {
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
  }, [router])

  // Open edit dialog with mobile panel close
  const openEditDialogWithMobileClose = useCallback((board: Parameters<typeof boardEditing.openEditDialog>[0]) => {
    boardEditing.openEditDialog(board)
    setMobilePanelOpen(false)
  }, [boardEditing.openEditDialog])

  // Open detail dialog with mobile panel close
  const openDetailDialogWithMobileClose = useCallback((board: Parameters<typeof boardEditing.openDetailDialog>[0]) => {
    boardEditing.openDetailDialog(board)
    setMobilePanelOpen(false)
  }, [boardEditing.openDetailDialog])

  // Report generation
  const [reportContent, setReportContent] = useState('')
  const [generatingReport, setGeneratingReport] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)

  const generateReport = useCallback(() => {
    const selectedBridge = bridgeData.selectedBridge
    const bridgeStats = bridgeData.bridgeStats
    if (!selectedBridge || !bridgeStats) return

    setGeneratingReport(true)

    try {
      const now = new Date()
      const dateStr = now.toLocaleString('zh-CN')

      const spanAnalysis = selectedBridge.spans.map(span => {
        const boards = span.walkingBoards
        const normal = boards.filter(b => b.status === 'normal').length
        const minor = boards.filter(b => b.status === 'minor_damage').length
        const severe = boards.filter(b => b.status === 'severe_damage').length
        const fracture = boards.filter(b => b.status === 'fracture_risk').length
        const replaced = boards.filter(b => b.status === 'replaced').length
        const hasRisk = fracture > 0
        const hasDamage = severe > 0
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

      const highRiskAreas = spanAnalysis.filter(s => s.hasRisk).map(s => `第${s.spanNumber}孔`)
      const damageAreas = spanAnalysis.filter(s => s.hasDamage && !s.hasRisk).map(s => `第${s.spanNumber}孔`)

      const walkingSuggestions: string[] = []

      if (highRiskAreas.length > 0) {
        walkingSuggestions.push(`⚠️ 禁止通行区域：${highRiskAreas.join('、')}存在断裂风险步行板，请绕行或等待修复`)
      }

      if (damageAreas.length > 0) {
        walkingSuggestions.push(`⚡ 谨慎通行区域：${damageAreas.join('、')}存在严重损坏步行板，通行时请避开损坏位置`)
      }

      if (bridgeStats.damageRate > 30) {
        walkingSuggestions.push('🔴 当前桥梁整体损坏率较高，建议限制通行并尽快安排全面维修')
      } else if (bridgeStats.damageRate > 15) {
        walkingSuggestions.push('🟡 桥梁存在多处损坏，建议优先维修受损严重的步行板')
      } else if (bridgeStats.damageRate > 5) {
        walkingSuggestions.push('🟢 桥梁整体状况良好，建议按计划进行日常维护')
      } else {
        walkingSuggestions.push('✅ 桥梁状况优秀，可正常通行，建议保持定期检查')
      }

      const shelterSpans = spanAnalysis.filter(s => s.shelterSide !== 'none')
      if (shelterSpans.length > 0) {
        walkingSuggestions.push(`📢 避车台位置：第${shelterSpans.map(s => s.spanNumber).join('、')}孔设有避车台，列车通过时请在此避让`)
      }

      const totalRailingIssues = spanAnalysis.reduce((sum, s) => sum + s.railingIssues, 0)
      const totalBracketIssues = spanAnalysis.reduce((sum, s) => sum + s.bracketIssues, 0)

      if (totalRailingIssues > 0) {
        walkingSuggestions.push(`🔧 发现${totalRailingIssues}处栏杆问题，通行时请注意抓牢扶手`)
      }
      if (totalBracketIssues > 0) {
        walkingSuggestions.push(`🔧 发现${totalBracketIssues}处托架问题，建议尽快安排检修`)
      }

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
  }, [bridgeData.selectedBridge, bridgeData.bridgeStats])

  // Alert info helper
  const getAlertInfo = useCallback(() => {
    const bridgeStats = bridgeData.bridgeStats
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
  }, [bridgeData.bridgeStats])

  // Markdown renderer
  const renderMarkdownText = useCallback((text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className={`text-lg font-bold mt-4 mb-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>{line.slice(3)}</h2>
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className={`text-base font-bold mt-3 mb-1 ${theme === 'night' ? 'text-cyan-300' : 'text-blue-500'}`}>{line.slice(4)}</h3>
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className={`font-bold ${theme === 'night' ? 'text-cyan-300' : 'text-blue-600'}`}>{line.slice(2, -2)}</p>
      }
      if (line.startsWith('- ')) {
        return <p key={i} className={`ml-2 ${theme === 'night' ? 'text-slate-300' : 'text-gray-600'}`}>• {line.slice(2)}</p>
      }
      if (line.match(/^\d+\./)) {
        return <p key={i} className={`ml-2 ${theme === 'night' ? 'text-slate-300' : 'text-gray-600'}`}>{line}</p>
      }
      if (line.trim() === '') {
        return <div key={i} className="h-2" />
      }
      return <p key={i} className={theme === 'night' ? 'text-slate-300' : 'text-gray-600'}>{line}</p>
    })
  }, [theme])

  return {
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
    openEditDialog: openEditDialogWithMobileClose,
    openDetailDialog: openDetailDialogWithMobileClose,
    generateReport,
    getAlertInfo,
    renderMarkdownText,
    // Report
    reportContent,
    reportDialogOpen,
    setReportDialogOpen,
    generatingReport,
  }
}

export type UseBridgePageReturn = ReturnType<typeof useBridgePage>
