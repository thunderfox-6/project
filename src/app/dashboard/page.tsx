'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/components/ThemeProvider'
import {
  LayoutDashboard,
  Train,
  Building2,
  Layers,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Wrench,
  ArrowLeft,
  Users,
  Loader2,
  Activity,
  ShieldAlert,
  Hash,
  Gauge,
  TrendingUp,
  AlertOctagon,
  Navigation,
  Sun,
  Moon,
  Bell,
  BellOff,
  Eye,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { toast } from 'sonner'
import NotificationBell from '@/components/bridge/NotificationBell'

// 类型定义
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
  lastInspected: string | null
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

interface CurrentUser {
  id: string
  username: string
  name: string | null
  role: string
}

// 状态颜色配置
const STATUS_COLORS: Record<string, { label: string; color: string; chartColor: string }> = {
  normal: { label: '正常', color: '#22c55e', chartColor: '#22c55e' },
  minor_damage: { label: '轻微损坏', color: '#eab308', chartColor: '#eab308' },
  severe_damage: { label: '严重损坏', color: '#f97316', chartColor: '#f97316' },
  fracture_risk: { label: '断裂风险', color: '#ef4444', chartColor: '#ef4444' },
  replaced: { label: '已更换', color: '#3b82f6', chartColor: '#3b82f6' },
  missing: { label: '缺失', color: '#6b7280', chartColor: '#6b7280' }
}

// 带认证的 fetch
function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers = new Headers(options?.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return globalThis.fetch(url, { ...options, headers })
}

export default function DashboardPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const isNight = theme === 'night'
  const [summary, setSummary] = useState<OverallSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  // 告警状态
  const [alerts, setAlerts] = useState<any[]>([])
  const [alertSummary, setAlertSummary] = useState({ activeCritical: 0, activeWarning: 0, activeInfo: 0, activeTotal: 0 })
  const [alertFilter, setAlertFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all')

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
    }

    checkAuth()
  }, [router])

  // 加载汇总数据
  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true)
        const response = await authFetch('/api/summary')
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login')
            return
          }
          throw new Error('Failed to load summary')
        }
        const data = await response.json()
        setSummary(data)
      } catch (error) {
        console.error('Failed to load summary:', error)
        toast.error('加载汇总数据失败')
      } finally {
        setLoading(false)
      }
    }

    // Wait for auth check to pass before loading data
    const token = localStorage.getItem('token')
    if (token) {
      loadSummary()
      // 加载告警数据
      const loadAlerts = async () => {
        try {
          const params = new URLSearchParams({ status: 'active', page: '1', pageSize: '50' })
          if (alertFilter !== 'all') params.set('severity', alertFilter)
          const res = await authFetch(`/api/alerts?${params}`)
          if (res.ok) {
            const data = await res.json()
            setAlerts(data.data || [])
            setAlertSummary(data.summary || { activeCritical: 0, activeWarning: 0, activeInfo: 0, activeTotal: 0 })
          }
        } catch (e) {
          console.error('Failed to load alerts:', e)
        }
      }
      loadAlerts()
    }
  }, [router, alertFilter])

  // 解决/忽略告警
  const handleResolveAlert = async (alertId: string, status: 'resolved' | 'dismissed') => {
    try {
      const res = await authFetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alertId, status }),
      })
      if (res.ok) {
        toast.success(status === 'resolved' ? '预警已解决' : '预警已忽略')
        setAlerts((prev) => prev.filter((a: any) => a.id !== alertId))
        setAlertSummary((prev) => ({ ...prev, activeTotal: prev.activeTotal - 1 }))
      }
    } catch {
      toast.error('操作失败')
    }
  }

  // 准备图表数据
  const getPieChartData = () => {
    if (!summary) return []
    return [
      { name: '正常', value: summary.normalBoards, fill: '#22c55e' },
      { name: '轻微损坏', value: summary.minorDamageBoards, fill: '#eab308' },
      { name: '严重损坏', value: summary.severeDamageBoards, fill: '#f97316' },
      { name: '断裂风险', value: summary.fractureRiskBoards, fill: '#ef4444' },
      { name: '已更换', value: summary.replacedBoards, fill: '#3b82f6' },
      { name: '缺失', value: summary.missingBoards, fill: '#6b7280' }
    ].filter(d => d.value > 0)
  }

  const getBarChartData = () => {
    if (!summary) return []
    return summary.bridgeSummaries
      .slice()
      .sort((a, b) => b.damageRate - a.damageRate)
      .slice(0, 10)
      .map(b => ({
        name: b.name.length > 6 ? b.name.slice(0, 6) + '...' : b.name,
        damageRate: b.damageRate,
        highRiskRate: b.highRiskRate
      }))
  }

  // 损坏率颜色
  const getDamageRateColor = (rate: number) => {
    if (rate >= 30) return 'text-red-400'
    if (rate >= 15) return 'text-orange-400'
    if (rate >= 5) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getDamageRateBg = (rate: number) => {
    if (rate >= 30) return 'bg-red-500/20 text-red-400 border-red-500/30'
    if (rate >= 15) return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    if (rate >= 5) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    return 'bg-green-500/20 text-green-400 border-green-500/30'
  }

  // 按损坏率排序的桥梁列表
  const sortedBridges = summary?.bridgeSummaries
    ? [...summary.bridgeSummaries].sort((a, b) => b.damageRate - a.damageRate)
    : []

  // 高风险桥梁（有断裂风险的）
  const highRiskBridges = sortedBridges.filter(b => b.fractureRiskBoards > 0)

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

  // 图表轴线和文字颜色
  const chartTickFill = isNight ? '#94a3b8' : '#64748b'
  const chartAxisStroke = isNight ? '#334155' : '#d1d5db'
  const legendTextColor = isNight ? '#94a3b8' : '#64748b'

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; fill?: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`${isNight ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg p-3 shadow-xl`}>
          <p className={`${isNight ? 'text-slate-300' : 'text-gray-600'} text-sm mb-1`}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.fill }}>
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const total = summary?.totalBoards || 1
      const percent = ((data.value / total) * 100).toFixed(1)
      return (
        <div className={`${isNight ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg p-3 shadow-xl`}>
          <p className="text-sm font-medium" style={{ color: data.payload.fill }}>
            {data.name}
          </p>
          <p className={`${isNight ? 'text-slate-300' : 'text-gray-600'} text-xs`}>
            {data.value} 块 ({percent}%)
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${isNight ? 'bg-slate-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className={`${isNight ? 'text-slate-400' : 'text-gray-500'}`}>加载仪表盘数据...</p>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className={`min-h-screen ${isNight ? 'bg-slate-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <p className={`${isNight ? 'text-slate-300' : 'text-gray-600'} mb-4`}>暂无数据</p>
          <Button
            onClick={() => router.push('/')}
            className="bg-cyan-600 hover:bg-cyan-500"
          >
            返回管理系统
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isNight ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gray-50'}`}>
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 ${isNight ? 'bg-cyan-500/5' : 'bg-blue-100/30'} rounded-full blur-3xl`} />
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 ${isNight ? 'bg-purple-500/5' : 'bg-indigo-100/30'} rounded-full blur-3xl`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 ${isNight ? 'bg-cyan-500/3' : 'bg-blue-100/20'} rounded-full blur-3xl`} />
      </div>

      {/* 顶部导航 */}
      <header className={`border-b ${isNight ? 'border-slate-700/50 bg-slate-800/50' : 'border-gray-200 bg-white/80'} backdrop-blur-sm sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className={`${isNight ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回管理系统
            </Button>
            <div className={`h-4 w-px ${isNight ? 'bg-slate-600' : 'bg-gray-300'}`} />
            <h1 className={`text-lg font-semibold ${isNight ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              <LayoutDashboard className={`w-5 h-5 ${isNight ? 'text-cyan-400' : 'text-blue-600'}`} />
              数据总览仪表盘
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {currentUser && (
              <NotificationBell userId={currentUser.id} theme={isNight ? 'night' : 'day'} />
            )}
            {currentUser?.role === 'admin' && (
              <Button
                variant="ghost"
                size="sm"
                className={`${isNight ? 'text-slate-400 hover:text-purple-400' : 'text-gray-500 hover:text-indigo-600'}`}
                onClick={() => router.push('/users')}
              >
                <Users className="w-4 h-4 mr-2" />
                用户管理
              </Button>
            )}
            <div className={`text-sm ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
              <span className={`${isNight ? 'text-cyan-400' : 'text-blue-600'} font-medium`}>{currentUser?.name || currentUser?.username}</span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isNight ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
            >
              {isNight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className={`${isNight ? 'text-slate-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
            >
              退出
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {/* ==================== 顶部统计栏 ==================== */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {/* 桥梁总数 */}
          <Card className="tech-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isNight ? 'text-white' : 'text-gray-900'}`}>{summary.totalBridges}</p>
                  <p className={`text-sm ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>桥梁总数</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 孔位总数 */}
          <Card className="tech-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Hash className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isNight ? 'text-white' : 'text-gray-900'}`}>{summary.totalSpans}</p>
                  <p className={`text-sm ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>孔位总数</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 步行板总数 */}
          <Card className="tech-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Layers className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isNight ? 'text-white' : 'text-gray-900'}`}>{summary.totalBoards}</p>
                  <p className={`text-sm ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>步行板总数</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 整体损坏率 */}
          <Card className="tech-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Gauge className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-bold ${getDamageRateColor(summary.overallDamageRate)}`}>
                      {summary.overallDamageRate}%
                    </p>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${getDamageRateBg(summary.overallDamageRate)}`}>
                      {summary.overallDamageRate >= 30 ? '高危' : summary.overallDamageRate >= 15 ? '关注' : summary.overallDamageRate >= 5 ? '一般' : '良好'}
                    </span>
                  </div>
                  <p className={`text-sm ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>整体损坏率</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 高风险率 */}
          <Card className="tech-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${summary.overallHighRiskRate > 5 ? 'text-red-400' : summary.overallHighRiskRate > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                    {summary.overallHighRiskRate}%
                  </p>
                  <p className={`text-sm ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>高风险率</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 活跃告警 */}
          <Card className="tech-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${alertSummary.activeTotal > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                    {alertSummary.activeTotal}
                  </p>
                  <p className={`text-sm ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>活跃预警</p>
                </div>
                <Bell className={`w-8 h-8 ${alertSummary.activeTotal > 0 ? 'text-orange-400/50' : 'text-green-400/50'}`} />
              </div>
              {alertSummary.activeTotal > 0 && (
                <div className="flex gap-2 mt-2">
                  {alertSummary.activeCritical > 0 && (
                    <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-xs">{alertSummary.activeCritical} 严重</Badge>
                  )}
                  {alertSummary.activeWarning > 0 && (
                    <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/20 text-xs">{alertSummary.activeWarning} 警告</Badge>
                  )}
                  {alertSummary.activeInfo > 0 && (
                    <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 text-xs">{alertSummary.activeInfo} 提示</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ==================== 图表区域 ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 损坏分布饼图 */}
          <Card className="tech-card">
            <CardHeader>
              <CardTitle className={`${isNight ? 'text-white' : 'text-gray-900'} flex items-center gap-2 text-base`}>
                <Activity className={`w-4 h-4 ${isNight ? 'text-cyan-400' : 'text-blue-600'}`} />
                步行板状态分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getPieChartData().length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getPieChartData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {getPieChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: '12px', color: legendTextColor }}
                        formatter={(value: string) => (
                          <span style={{ color: legendTextColor }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className={`h-72 flex items-center justify-center ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* 桥梁损坏率柱状图 */}
          <Card className="tech-card">
            <CardHeader>
              <CardTitle className={`${isNight ? 'text-white' : 'text-gray-900'} flex items-center gap-2 text-base`}>
                <TrendingUp className={`w-4 h-4 ${isNight ? 'text-purple-400' : 'text-indigo-600'}`} />
                桥梁损坏率排行 (Top 10)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getBarChartData().length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getBarChartData()} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <XAxis
                        type="number"
                        tick={{ fill: chartTickFill, fontSize: 11 }}
                        axisLine={{ stroke: chartAxisStroke }}
                        tickLine={{ stroke: chartAxisStroke }}
                        domain={[0, 'auto']}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: chartTickFill, fontSize: 11 }}
                        axisLine={{ stroke: chartAxisStroke }}
                        tickLine={{ stroke: chartAxisStroke }}
                        width={80}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="damageRate" name="损坏率" fill="#f97316" radius={[0, 4, 4, 0]} barSize={16} />
                      <Bar dataKey="highRiskRate" name="高风险率" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className={`h-72 flex items-center justify-center ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ==================== 桥梁健康排行 ==================== */}
          <div className="lg:col-span-2">
            <Card className="tech-card">
              <CardHeader>
                <CardTitle className={`${isNight ? 'text-white' : 'text-gray-900'} flex items-center gap-2 text-base`}>
                  <Building2 className={`w-4 h-4 ${isNight ? 'text-cyan-400' : 'text-blue-600'}`} />
                  桥梁健康排行
                  <span className={`text-xs font-normal ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>(按损坏率降序)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sortedBridges.length > 0 ? (
                  <ScrollArea className="max-h-[480px]">
                    <div className="space-y-2">
                      {sortedBridges.map((bridge, index) => (
                        <a
                          key={bridge.id}
                          href="/"
                          className={`block p-3 rounded-lg ${isNight ? 'bg-slate-800/50 hover:bg-slate-700/50' : 'bg-gray-50 hover:bg-gray-100'} border border-transparent ${isNight ? 'hover:border-cyan-500/30' : 'hover:border-blue-300'} transition-all cursor-pointer`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className={`text-sm font-bold w-6 text-center ${
                                index === 0 ? 'text-red-400' :
                                index === 1 ? 'text-orange-400' :
                                index === 2 ? 'text-yellow-400' :
                                (isNight ? 'text-slate-500' : 'text-gray-400')
                              }`}>
                                {index + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`${isNight ? 'text-white' : 'text-gray-900'} font-medium text-sm truncate`}>{bridge.name}</span>
                                  <Badge variant="outline" className={`text-xs ${isNight ? 'border-slate-600 text-slate-400' : 'border-gray-300 text-gray-500'} flex-shrink-0`}>
                                    {bridge.bridgeCode}
                                  </Badge>
                                  {bridge.hasHighRisk && (
                                    <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/50 flex-shrink-0">
                                      <AlertTriangle className="w-3 h-3 mr-1" />高危
                                    </Badge>
                                  )}
                                </div>
                                <div className={`flex items-center gap-3 mt-1 text-xs ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>
                                  <span>{bridge.totalSpans}孔</span>
                                  <span>{bridge.totalBoards}块板</span>
                                  {bridge.lineName && <span>{bridge.lineName}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                              <div className="text-right">
                                <div className={`text-sm font-bold ${getDamageRateColor(bridge.damageRate)}`}>
                                  {bridge.damageRate}%
                                </div>
                                <div className={`text-xs ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>损坏率</div>
                              </div>
                              {bridge.fractureRiskBoards > 0 && (
                                <div className="text-right">
                                  <div className="text-sm font-bold text-red-400">
                                    {bridge.fractureRiskBoards}
                                  </div>
                                  <div className={`text-xs ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>高风险</div>
                                </div>
                              )}
                              <div className="w-24">
                                <Progress
                                  value={bridge.damageRate}
                                  className="h-2"
                                />
                              </div>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className={`text-center py-8 ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>
                    暂无桥梁数据
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ==================== 右侧面板 ==================== */}
          <div className="space-y-6">
            {/* 高风险预警 */}
            <Card className="tech-card">
              <CardHeader>
                <CardTitle className={`${isNight ? 'text-white' : 'text-gray-900'} flex items-center gap-2 text-base`}>
                  <AlertOctagon className="w-4 h-4 text-red-400" />
                  高风险预警
                  {highRiskBridges.length > 0 && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs">
                      {highRiskBridges.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {highRiskBridges.length > 0 ? (
                  <ScrollArea className="max-h-[320px]">
                    <div className="space-y-3">
                      {highRiskBridges.map((bridge) => (
                        <div
                          key={bridge.id}
                          className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span className={`${isNight ? 'text-white' : 'text-gray-900'} font-medium text-sm`}>{bridge.name}</span>
                          </div>
                          <div className="ml-6 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className={isNight ? 'text-slate-400' : 'text-gray-500'}>断裂风险步行板</span>
                              <span className="text-red-400 font-bold">{bridge.fractureRiskBoards} 块</span>
                            </div>
                            {bridge.severeDamageBoards > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className={isNight ? 'text-slate-400' : 'text-gray-500'}>严重损坏步行板</span>
                                <span className="text-orange-400 font-bold">{bridge.severeDamageBoards} 块</span>
                              </div>
                            )}
                            <Separator className={`${isNight ? 'bg-slate-700/50' : 'bg-gray-200'} my-1`} />
                            <div className={`text-xs ${isNight ? 'text-slate-400' : 'text-gray-500'} flex items-center gap-1`}>
                              <ShieldAlert className="w-3 h-3 text-red-400" />
                              <span className="text-red-300">建议：立即安排检修，设置禁行区域</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-6 text-center">
                    <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                    <p className="text-green-400 font-medium text-sm">暂无高风险桥梁</p>
                    <p className={`text-xs mt-1 ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>所有桥梁状态良好</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 预警中心 */}
            <Card className="tech-card">
              <CardHeader className="pb-3">
                <CardTitle className={`${isNight ? 'text-white' : 'text-gray-900'} flex items-center justify-between text-base`}>
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-orange-400" />
                    预警中心
                    {alertSummary.activeTotal > 0 && (
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 text-xs">
                        {alertSummary.activeTotal}
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* 严重等级筛选 */}
                <div className="flex gap-1 mb-3">
                  {([
                    { key: 'all', label: '全部' },
                    { key: 'critical', label: '严重' },
                    { key: 'warning', label: '警告' },
                    { key: 'info', label: '提示' },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setAlertFilter(key)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                        alertFilter === key
                          ? key === 'critical'
                            ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                            : key === 'warning'
                            ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30'
                            : key === 'info'
                            ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                            : 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30'
                          : isNight
                          ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* 告警列表 */}
                <ScrollArea className="max-h-[400px]">
                  {alerts.length > 0 ? (
                    <div className="space-y-2">
                      {alerts.map((alert: any) => {
                        const isCritical = alert.severity === 'critical'
                        const isWarning = alert.severity === 'warning'
                        const borderColor = isCritical ? 'border-red-500/20 bg-red-500/5'
                          : isWarning ? 'border-yellow-500/20 bg-yellow-500/5'
                          : 'border-blue-500/20 bg-blue-500/5'
                        const iconColor = isCritical ? 'text-red-400'
                          : isWarning ? 'text-yellow-400'
                          : 'text-blue-400'
                        const Icon = isCritical ? XCircle : isWarning ? AlertTriangle : AlertCircle
                        const timeStr = new Date(alert.createdAt).toLocaleString('zh-CN', {
                          month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                        })

                        return (
                          <div key={alert.id} className={`p-3 rounded-lg border ${borderColor}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconColor}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${isNight ? 'text-white' : 'text-gray-900'}`}>
                                    {alert.title}
                                  </p>
                                  <p className={`text-xs mt-1 line-clamp-2 ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
                                    {alert.message}
                                  </p>
                                  <p className={`text-xs mt-1.5 ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>
                                    {timeStr}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleResolveAlert(alert.id, 'resolved')}
                                  className={`p-1 rounded transition-colors ${isNight ? 'hover:bg-green-500/20 text-slate-500 hover:text-green-400' : 'hover:bg-green-50 text-gray-400 hover:text-green-600'}`}
                                  title="标记为已解决"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleResolveAlert(alert.id, 'dismissed')}
                                  className={`p-1 rounded transition-colors ${isNight ? 'hover:bg-slate-600 text-slate-500 hover:text-slate-300' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                                  title="忽略"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <BellOff className="w-10 h-10 text-green-400 mx-auto mb-2" />
                      <p className="text-green-400 font-medium text-sm">暂无活跃预警</p>
                      <p className={`text-xs mt-1 ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>所有桥梁运行正常</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* 快速操作 */}
            <Card className="tech-card">
              <CardHeader>
                <CardTitle className={`${isNight ? 'text-white' : 'text-gray-900'} flex items-center gap-2 text-base`}>
                  <Navigation className={`w-4 h-4 ${isNight ? 'text-purple-400' : 'text-indigo-600'}`} />
                  快速操作
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className={`w-full bg-gradient-to-r ${isNight ? 'from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500' : 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'} text-white font-medium`}
                  onClick={() => router.push('/')}
                >
                  <Train className="w-4 h-4 mr-2" />
                  返回管理系统
                </Button>

                {currentUser?.role === 'admin' && (
                  <Button
                    variant="outline"
                    className={`w-full ${isNight ? 'border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300' : 'border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700'}`}
                    onClick={() => router.push('/users')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    用户管理
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* 数据统计摘要 */}
            <Card className="tech-card">
              <CardHeader>
                <CardTitle className={`${isNight ? 'text-white' : 'text-gray-900'} flex items-center gap-2 text-base`}>
                  <Activity className="w-4 h-4 text-green-400" />
                  状态统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_COLORS).map(([key, config]) => {
                    const count = summary[`${key.replace(/_([a-z])/g, (_, l) => l.toUpperCase())}Boards` as keyof OverallSummary] as number || 0
                    const fieldMap: Record<string, string> = {
                      normal: 'normalBoards',
                      minor_damage: 'minorDamageBoards',
                      severe_damage: 'severeDamageBoards',
                      fracture_risk: 'fractureRiskBoards',
                      replaced: 'replacedBoards',
                      missing: 'missingBoards'
                    }
                    const value = summary[fieldMap[key] as keyof OverallSummary] as number || 0
                    return (
                      <div
                        key={key}
                        className={`p-2 rounded-lg ${isNight ? 'bg-slate-800/50 border-slate-700/50' : 'bg-gray-50 border-gray-200'} border`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full" style={{ background: config.color }} />
                          <span className={`text-xs ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>{config.label}</span>
                        </div>
                        <div className="text-lg font-bold" style={{ color: config.color }}>
                          {value}
                        </div>
                        <div className={`text-xs ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>
                          {summary.totalBoards > 0 ? ((value / summary.totalBoards) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
