'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  MapPin,
  ArrowLeft,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Users,
  LogOut,
  Crosshair,
  Sun,
  Moon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useTheme } from '@/components/ThemeProvider'

// Types
interface WalkingBoard {
  status: string
}

interface BridgeSpan {
  id: string
  spanNumber: number
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

interface BridgeWithStats extends Bridge {
  totalBoards: number
  damagedBoards: number
  damageRate: number
  healthStatus: 'good' | 'warning' | 'danger' | 'critical'
}

interface CurrentUser {
  id: string
  username: string
  name: string | null
  role: string
}

// Auth fetch helper
function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers = new Headers(options?.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return globalThis.fetch(url, { ...options, headers })
}

// Calculate bridge stats
function calcBridgeStats(bridge: Bridge): BridgeWithStats {
  const allBoards = bridge.spans.flatMap(s => s.walkingBoards)
  const totalBoards = allBoards.length
  const damagedBoards = allBoards.filter(b =>
    b.status !== 'normal' && b.status !== 'replaced'
  ).length
  const damageRate = totalBoards > 0 ? Math.round((damagedBoards / totalBoards) * 1000) / 10 : 0

  let healthStatus: BridgeWithStats['healthStatus'] = 'good'
  if (damageRate >= 30) healthStatus = 'critical'
  else if (damageRate >= 15) healthStatus = 'danger'
  else if (damageRate >= 5) healthStatus = 'warning'

  return { ...bridge, totalBoards, damagedBoards, damageRate, healthStatus }
}

// Health status color mapping
const HEALTH_COLORS: Record<string, { marker: string; glow: string; label: string }> = {
  good: { marker: '#22c55e', glow: '#22c55e', label: '良好' },
  warning: { marker: '#eab308', glow: '#eab308', label: '注意' },
  danger: { marker: '#f97316', glow: '#f97316', label: '警告' },
  critical: { marker: '#ef4444', glow: '#ef4444', label: '严重' }
}

export default function MapPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const isNight = theme === 'night'

  const [bridges, setBridges] = useState<BridgeWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [selectedBridge, setSelectedBridge] = useState<BridgeWithStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredBridge, setHoveredBridge] = useState<string | null>(null)

  // Auth check
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

  // Load bridges
  useEffect(() => {
    const loadBridges = async () => {
      try {
        setLoading(true)
        const response = await authFetch('/api/bridges')
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login')
            return
          }
          throw new Error('Failed to load bridges')
        }
        const data = await response.json()
        const withStats = data.map(calcBridgeStats)
        setBridges(withStats)
      } catch (error) {
        console.error('Failed to load bridges:', error)
        toast.error('加载桥梁数据失败')
      } finally {
        setLoading(false)
      }
    }
    const token = localStorage.getItem('token')
    if (token) loadBridges()
  }, [router])

  // Compute marker positions in a grid layout
  const markers = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(bridges.length))
    const svgWidth = 900
    const svgHeight = 600
    const padding = 80
    const cellW = (svgWidth - padding * 2) / Math.max(cols, 1)
    const cellH = (svgHeight - padding * 2) / Math.max(Math.ceil(bridges.length / cols), 1)

    return bridges.map((bridge, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = padding + col * cellW + cellW / 2
      const y = padding + row * cellH + cellH / 2
      return { bridge, x, y }
    })
  }, [bridges])

  // Filtered bridges for sidebar
  const filteredBridges = useMemo(() => {
    if (!searchQuery) return bridges
    const q = searchQuery.toLowerCase()
    return bridges.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.bridgeCode.toLowerCase().includes(q) ||
      (b.location && b.location.toLowerCase().includes(q))
    )
  }, [bridges, searchQuery])

  // Logout
  const handleLogout = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        await authFetch('/api/auth/logout', { method: 'POST' })
      } catch {}
    }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isNight ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className={isNight ? 'text-slate-400' : 'text-gray-500'}>加载桥梁地图数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isNight ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gray-50'}`}>
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl ${isNight ? 'bg-cyan-500/5' : 'bg-blue-100/30'}`} />
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl ${isNight ? 'bg-purple-500/5' : 'bg-indigo-100/30'}`} />
      </div>

      {/* Header */}
      <header className={`border-b backdrop-blur-sm sticky top-0 z-50 ${isNight ? 'border-slate-700/50 bg-slate-800/50' : 'border-gray-200 bg-white/80'}`}>
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className={isNight ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回管理系统
            </Button>
            <div className={`h-4 w-px ${isNight ? 'bg-slate-600' : 'bg-gray-300'}`} />
            <h1 className={`text-lg font-semibold flex items-center gap-2 ${isNight ? 'text-white' : 'text-gray-900'}`}>
              <MapPin className="w-5 h-5 text-cyan-400" />
              桥梁分布地图
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
              <span className="text-cyan-400 font-medium">{currentUser?.name || currentUser?.username}</span>
            </span>
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
              className={isNight ? 'text-slate-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}
            >
              <LogOut className="w-4 h-4 mr-2" />
              退出
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-6 relative z-10">
        <div className="flex gap-6 h-[calc(100vh-100px)]">
          {/* Sidebar */}
          <div className="w-72 flex-shrink-0 flex flex-col">
            {/* Search */}
            <div className="relative mb-4">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isNight ? 'text-slate-500' : 'text-gray-400'}`} />
              <Input
                placeholder="搜索桥梁..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 focus:border-cyan-500 ${isNight ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
              />
            </div>

            {/* Bridge list */}
            <Card className="tech-card flex-1 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className={`flex items-center gap-2 text-sm ${isNight ? 'text-white' : 'text-gray-900'}`}>
                  <Crosshair className="w-4 h-4 text-cyan-400" />
                  桥梁列表
                  <Badge variant="outline" className={`ml-auto text-xs ${isNight ? 'border-slate-600 text-slate-400' : 'border-gray-300 text-gray-500'}`}>
                    {filteredBridges.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-240px)]">
                  <div className="px-4 pb-4 space-y-1">
                    {filteredBridges.map((bridge) => {
                      const colors = HEALTH_COLORS[bridge.healthStatus]
                      const isSelected = selectedBridge?.id === bridge.id
                      return (
                        <motion.button
                          key={bridge.id}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedBridge(isSelected ? null : bridge)}
                          className={`w-full text-left p-3 rounded-lg transition-all cursor-pointer ${
                            isSelected
                              ? isNight ? 'bg-cyan-500/15 border border-cyan-500/40' : 'bg-blue-50 border border-blue-300'
                              : isNight ? 'bg-slate-800/30 border border-transparent hover:bg-slate-700/40 hover:border-slate-600/50' : 'bg-gray-50 border border-transparent hover:bg-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: colors.marker, boxShadow: `0 0 6px ${colors.glow}` }}
                            />
                            <span className={`text-sm font-medium truncate ${isNight ? 'text-white' : 'text-gray-900'}`}>{bridge.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 ml-4">
                            <span className={`text-xs ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>{bridge.bridgeCode}</span>
                            <span className="text-xs" style={{ color: colors.marker }}>
                              {bridge.damageRate}% 损坏
                            </span>
                          </div>
                        </motion.button>
                      )
                    })}
                    {filteredBridges.length === 0 && (
                      <div className={`py-8 text-center text-sm ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>
                        未找到匹配的桥梁
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Map area */}
          <div className="flex-1 flex flex-col">
            <Card className="tech-card flex-1 overflow-hidden">
              <CardContent className="p-0 h-full relative">
                <svg
                  viewBox="0 0 900 600"
                  className="w-full h-full"
                  style={{ background: isNight ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' : 'linear-gradient(180deg, #f0f4f8 0%, #ffffff 50%, #f0f4f8 100%)' }}
                >
                  {/* Grid lines */}
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path
                        d="M 50 0 L 0 0 0 50"
                        fill="none"
                        stroke={isNight ? '#1e3a5f' : '#d1d5db'}
                        strokeWidth="0.5"
                        opacity="0.4"
                      />
                    </pattern>
                    {/* Glow filter */}
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="glow-strong">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <rect width="900" height="600" fill="url(#grid)" />

                  {/* Axis labels */}
                  {Array.from({ length: 18 }, (_, i) => (
                    <text
                      key={`vlabel-${i}`}
                      x={50 + i * 50}
                      y="20"
                      fill={isNight ? '#334155' : '#9ca3af'}
                      fontSize="8"
                      textAnchor="middle"
                    >
                      {i * 50}
                    </text>
                  ))}
                  {Array.from({ length: 12 }, (_, i) => (
                    <text
                      key={`hlabel-${i}`}
                      x="10"
                      y={50 + i * 50}
                      fill={isNight ? '#334155' : '#9ca3af'}
                      fontSize="8"
                      textAnchor="start"
                    >
                      {i * 50}
                    </text>
                  ))}

                  {/* Connection lines between markers */}
                  {markers.length > 1 && markers.map((m, i) => {
                    if (i === 0) return null
                    const prev = markers[i - 1]
                    return (
                      <line
                        key={`line-${i}`}
                        x1={prev.x}
                        y1={prev.y}
                        x2={m.x}
                        y2={m.y}
                        stroke={isNight ? '#1e3a5f' : '#d1d5db'}
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        opacity="0.3"
                      />
                    )
                  })}

                  {/* Bridge markers */}
                  {markers.map(({ bridge, x, y }) => {
                    const colors = HEALTH_COLORS[bridge.healthStatus]
                    const isSelected = selectedBridge?.id === bridge.id
                    const isHovered = hoveredBridge === bridge.id

                    return (
                      <g
                        key={bridge.id}
                        onClick={() => setSelectedBridge(isSelected ? null : bridge)}
                        onMouseEnter={() => setHoveredBridge(bridge.id)}
                        onMouseLeave={() => setHoveredBridge(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Pulse ring for selected/hovered */}
                        {(isSelected || isHovered) && (
                          <circle
                            cx={x}
                            cy={y}
                            r="28"
                            fill="none"
                            stroke={colors.marker}
                            strokeWidth="1"
                            opacity="0.4"
                          >
                            <animate
                              attributeName="r"
                              values="20;30;20"
                              dur="2s"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.4;0.1;0.4"
                              dur="2s"
                              repeatCount="indefinite"
                            />
                          </circle>
                        )}

                        {/* Outer glow */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isSelected ? 18 : 14}
                          fill={colors.marker}
                          opacity="0.15"
                          filter="url(#glow-strong)"
                        />

                        {/* Main marker */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isSelected ? 10 : 7}
                          fill={colors.marker}
                          filter="url(#glow)"
                          opacity="0.9"
                        />

                        {/* Inner dot */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isSelected ? 4 : 3}
                          fill="#fff"
                          opacity="0.8"
                        />

                        {/* Bridge name label */}
                        <text
                          x={x}
                          y={y + (isSelected ? 22 : 18)}
                          fill={colors.marker}
                          fontSize="9"
                          textAnchor="middle"
                          fontWeight="600"
                        >
                          {bridge.name.length > 8 ? bridge.name.slice(0, 8) + '...' : bridge.name}
                        </text>

                        {/* Damage rate badge */}
                        <text
                          x={x}
                          y={y + (isSelected ? 32 : 27)}
                          fill={isNight ? '#94a3b8' : '#64748b'}
                          fontSize="7"
                          textAnchor="middle"
                        >
                          {bridge.damageRate}% 损坏
                        </text>
                      </g>
                    )
                  })}

                  {/* Title */}
                  <text x="450" y="585" fill={isNight ? '#334155' : '#9ca3af'} fontSize="10" textAnchor="middle">
                    Bridge Health Monitoring System - {bridges.length} bridges tracked
                  </text>

                  {/* Legend */}
                  <g transform="translate(730, 540)">
                    <rect x="-5" y="-12" width="170" height="55" rx="4" fill={isNight ? '#0f172a' : '#ffffff'} opacity="0.8" stroke={isNight ? '#1e3a5f' : '#d1d5db'} strokeWidth="0.5" />
                    {Object.entries(HEALTH_COLORS).map(([key, val], i) => (
                      <g key={key} transform={`translate(${i * 40}, 0)`}>
                        <circle cx="5" cy="0" r="4" fill={val.marker} />
                        <text x="14" y="3" fill={isNight ? '#94a3b8' : '#64748b'} fontSize="8">{val.label}</text>
                      </g>
                    ))}
                    <text x="0" y="25" fill={isNight ? '#475569' : '#9ca3af'} fontSize="7">
                      点击标记查看详情
                    </text>
                  </g>
                </svg>

                {/* Popup card for selected bridge */}
                <AnimatePresence>
                  {selectedBridge && (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute bottom-4 right-4 w-80"
                    >
                      <Card className={`backdrop-blur-md shadow-2xl ${isNight ? 'bg-slate-800/90 border border-slate-600/50' : 'bg-white border border-gray-200'}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className={`text-base flex items-center gap-2 ${isNight ? 'text-white' : 'text-gray-900'}`}>
                              <MapPin className="w-4 h-4" style={{ color: HEALTH_COLORS[selectedBridge.healthStatus].marker }} />
                              {selectedBridge.name}
                            </CardTitle>
                            <button
                              onClick={() => setSelectedBridge(null)}
                              className={`text-lg leading-none ${isNight ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                              &times;
                            </button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-xs ${isNight ? 'border-slate-600 text-slate-400' : 'border-gray-300 text-gray-500'}`}>
                                {selectedBridge.bridgeCode}
                              </Badge>
                              <Badge
                                className="text-xs"
                                style={{
                                  backgroundColor: `${HEALTH_COLORS[selectedBridge.healthStatus].marker}20`,
                                  color: HEALTH_COLORS[selectedBridge.healthStatus].marker,
                                  borderColor: `${HEALTH_COLORS[selectedBridge.healthStatus].marker}50`
                                }}
                              >
                                {HEALTH_COLORS[selectedBridge.healthStatus].label}
                              </Badge>
                            </div>

                            {selectedBridge.location && (
                              <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>{selectedBridge.location}</p>
                            )}

                            <div className="grid grid-cols-3 gap-2">
                              <div className={`p-2 rounded text-center ${isNight ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                                <p className={`text-lg font-bold ${isNight ? 'text-white' : 'text-gray-900'}`}>{selectedBridge.totalSpans}</p>
                                <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>孔数</p>
                              </div>
                              <div className={`p-2 rounded text-center ${isNight ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                                <p className={`text-lg font-bold ${isNight ? 'text-white' : 'text-gray-900'}`}>{selectedBridge.totalBoards}</p>
                                <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>步行板</p>
                              </div>
                              <div className={`p-2 rounded text-center ${isNight ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                                <p className="text-lg font-bold" style={{ color: HEALTH_COLORS[selectedBridge.healthStatus].marker }}>
                                  {selectedBridge.damageRate}%
                                </p>
                                <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>损坏率</p>
                              </div>
                            </div>

                            {/* Status breakdown */}
                            <div className="space-y-1">
                              {(() => {
                                const allBoards = selectedBridge.spans.flatMap(s => s.walkingBoards)
                                const counts: Record<string, number> = {}
                                allBoards.forEach(b => {
                                  counts[b.status] = (counts[b.status] || 0) + 1
                                })
                                const statusLabels: Record<string, { label: string; color: string }> = {
                                  normal: { label: '正常', color: '#22c55e' },
                                  minor_damage: { label: '轻微损坏', color: '#eab308' },
                                  severe_damage: { label: '严重损坏', color: '#f97316' },
                                  fracture_risk: { label: '断裂风险', color: '#ef4444' },
                                  replaced: { label: '已更换', color: '#3b82f6' },
                                  missing: { label: '缺失', color: '#6b7280' }
                                }
                                return Object.entries(counts)
                                  .filter(([key]) => key !== 'normal')
                                  .sort(([, a], [, b]) => b - a)
                                  .slice(0, 3)
                                  .map(([status, count]) => (
                                    <div key={status} className="flex items-center justify-between text-xs">
                                      <span className={`flex items-center gap-1 ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusLabels[status]?.color || '#6b7280' }} />
                                        {statusLabels[status]?.label || status}
                                      </span>
                                      <span style={{ color: statusLabels[status]?.color || '#94a3b8' }} className="font-medium">
                                        {count} 块
                                      </span>
                                    </div>
                                  ))
                              })()}
                            </div>

                            <Button
                              size="sm"
                              className={`w-full text-white ${isNight ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                              onClick={() => router.push(`/?bridge=${selectedBridge.id}`)}
                            >
                              查看详细数据
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Stats bar */}
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                { label: '桥梁总数', value: bridges.length, color: 'text-cyan-400', icon: MapPin },
                { label: '状态良好', value: bridges.filter(b => b.healthStatus === 'good').length, color: 'text-green-400', icon: CheckCircle },
                { label: '需要关注', value: bridges.filter(b => b.healthStatus === 'warning' || b.healthStatus === 'danger').length, color: 'text-yellow-400', icon: AlertTriangle },
                { label: '严重状态', value: bridges.filter(b => b.healthStatus === 'critical').length, color: 'text-red-400', icon: XCircle },
              ].map((stat) => (
                <Card key={stat.label} className="tech-card">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                      <div>
                        <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                        <p className={`text-xs ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
