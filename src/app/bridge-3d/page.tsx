'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useTheme } from '@/components/ThemeProvider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  ArrowLeft,
  Sun,
  Moon,
  LogOut,
  Loader2,
  Box,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Wrench,
  Minus
} from 'lucide-react'
import { toast } from 'sonner'

// Dynamic import for the 3D component (SSR disabled)
const HomeBridge3D = dynamic(() => import('@/components/3d/HomeBridge3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">Loading 3D scene...</p>
      </div>
    </div>
  )
})

// Types
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

interface CurrentUser {
  id: string
  username: string
  name: string | null
  role: string
}

// Board status config
const BOARD_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  normal: { label: '正常', color: '#22c55e' },
  minor_damage: { label: '轻微损坏', color: '#eab308' },
  severe_damage: { label: '严重损坏', color: '#f97316' },
  fracture_risk: { label: '断裂风险', color: '#ef4444' },
  replaced: { label: '已更换', color: '#3b82f6' },
  missing: { label: '缺失', color: '#6b7280' }
}

// Authenticated fetch helper
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

export default function Bridge3DPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const isNight = theme === 'night'

  // Auth state
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Data state
  const [bridges, setBridges] = useState<Bridge[]>([])
  const [selectedBridge, setSelectedBridge] = useState<Bridge | null>(null)
  const [selectedSpanIndex, setSelectedSpanIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingBoard, setEditingBoard] = useState<WalkingBoard | null>(null)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    status: 'normal',
    damageDesc: '',
    inspectedBy: ''
  })

  // Authentication check
  useEffect(() => {
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

    setAuthChecked(true)
  }, [router])

  // Load bridges list
  const loadBridges = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await authFetch('/api/bridges')
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load bridges')
      }
      const data = await response.json()
      const bridgeList = Array.isArray(data) ? data : (data.bridges || [])
      setBridges(bridgeList)

      // Auto-select first bridge if available
      if (bridgeList.length > 0) {
        await loadBridgeDetail(bridgeList[0].id)
      }
    } catch (err) {
      console.error('Failed to load bridges:', err)
      setError('Failed to load bridge data')
      toast.error('Failed to load bridge data')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // Load full bridge detail (spans + boards)
  const loadBridgeDetail = useCallback(async (bridgeId: string) => {
    try {
      const bridgeRes = await authFetch(`/api/boards?bridgeId=${bridgeId}`)
      if (!bridgeRes.ok) {
        throw new Error('Failed to load bridge detail')
      }
      const fullBridge = await bridgeRes.json()
      setSelectedBridge(fullBridge)
      setSelectedSpanIndex(0)
    } catch (err) {
      console.error('Failed to load bridge detail:', err)
      toast.error('Failed to load bridge detail')
    }
  }, [])

  // Load bridges after auth is confirmed
  useEffect(() => {
    if (authChecked) {
      loadBridges()
    }
  }, [authChecked, loadBridges])

  // Handle bridge selection change
  const handleBridgeChange = (bridgeId: string) => {
    const bridge = bridges.find(b => b.id === bridgeId)
    if (bridge) {
      loadBridgeDetail(bridge.id)
    }
  }

  // Span navigation
  const currentSpan = selectedBridge?.spans?.[selectedSpanIndex] || null
  const totalSpans = selectedBridge?.spans?.length || 0

  const handlePrevSpan = () => {
    if (selectedSpanIndex > 0) {
      setSelectedSpanIndex(selectedSpanIndex - 1)
    }
  }

  const handleNextSpan = () => {
    if (selectedSpanIndex < totalSpans - 1) {
      setSelectedSpanIndex(selectedSpanIndex + 1)
    }
  }

  // Board click handler
  const handleBoardClick = (board: { id: string; boardNumber: number; position: string; columnIndex: number; status: string }) => {
    // Find the full board data from the current span
    const fullBoard = currentSpan?.walkingBoards?.find(b => b.id === board.id)
    if (fullBoard) {
      setEditingBoard(fullBoard)
      setEditForm({
        status: fullBoard.status || 'normal',
        damageDesc: fullBoard.damageDesc || '',
        inspectedBy: fullBoard.inspectedBy || ''
      })
    } else {
      // Fallback with basic data from the 3D click
      setEditingBoard({
        id: board.id,
        boardNumber: board.boardNumber,
        position: board.position,
        columnIndex: board.columnIndex,
        status: board.status,
        damageDesc: null,
        inspectedBy: null,
        inspectedAt: null,
        antiSlipLevel: null,
        connectionStatus: null,
        weatherCondition: null,
        visibility: null,
        railingStatus: null,
        bracketStatus: null,
        hasObstacle: false,
        obstacleDesc: null,
        hasWaterAccum: false,
        waterAccumDepth: null,
        remarks: null,
        boardLength: null,
        boardWidth: null,
        boardThickness: null
      })
      setEditForm({
        status: board.status || 'normal',
        damageDesc: '',
        inspectedBy: ''
      })
    }
    setEditDialogOpen(true)
  }

  // Save board edit
  const handleSaveBoard = async () => {
    if (!editingBoard) return

    try {
      setSaving(true)
      const response = await authFetch('/api/boards', {
        method: 'PUT',
        body: JSON.stringify({
          id: editingBoard.id,
          status: editForm.status,
          damageDesc: editForm.damageDesc,
          inspectedBy: editForm.inspectedBy
        })
      })

      if (response.ok) {
        toast.success('Board status updated successfully')
        setEditDialogOpen(false)
        setEditingBoard(null)
        // Refresh bridge data
        if (selectedBridge) {
          await loadBridgeDetail(selectedBridge.id)
        }
      } else {
        toast.error('Failed to update board status')
      }
    } catch (err) {
      console.error('Failed to update board:', err)
      toast.error('Failed to update board status')
    } finally {
      setSaving(false)
    }
  }

  // Logout
  const handleLogout = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        await authFetch('/api/auth/logout', { method: 'POST' })
      } catch (err) {
        console.error('Logout error:', err)
      }
    }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  // Position label helper
  const getPositionLabel = (position: string) => {
    const labels: Record<string, string> = {
      upstream: 'Upstream',
      downstream: 'Downstream',
      shelter_left: 'Left Shelter',
      shelter_right: 'Right Shelter',
      shelter: 'Shelter'
    }
    return labels[position] || position
  }

  // Auth loading
  if (!authChecked) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isNight ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className={isNight ? 'text-slate-400' : 'text-gray-500'}>Loading...</p>
        </div>
      </div>
    )
  }

  // Data loading
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isNight ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className={isNight ? 'text-slate-400' : 'text-gray-500'}>Loading 3D bridge viewer...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isNight ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <p className={`mb-4 ${isNight ? 'text-slate-300' : 'text-gray-600'}`}>{error}</p>
          <Button
            onClick={loadBridges}
            className={`text-white ${isNight ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}`}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`fixed inset-0 flex flex-col ${isNight ? 'bg-[#0a0f1a]' : 'bg-gray-50'}`}>
      {/* Sticky Header */}
      <header className={`shrink-0 border-b backdrop-blur-sm sticky top-0 z-50 ${isNight ? 'border-slate-700/50 bg-slate-800/50' : 'border-gray-200 bg-white/80'}`}>
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className={isNight ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to System</span>
            </Button>
            <div className={`h-4 w-px ${isNight ? 'bg-slate-600' : 'bg-gray-300'}`} />
            <h1 className={`text-base sm:text-lg font-semibold flex items-center gap-2 ${isNight ? 'text-white' : 'text-gray-900'}`}>
              <Box className={`w-5 h-5 ${isNight ? 'text-cyan-400' : 'text-blue-600'}`} />
              <span className="hidden sm:inline">3D Bridge Model Viewer</span>
              <span className="sm:hidden">3D Viewer</span>
            </h1>
          </div>

          {/* Center: Bridge selector (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-2">
            {bridges.length > 0 && (
              <Select
                value={selectedBridge?.id || ''}
                onValueChange={handleBridgeChange}
              >
                <SelectTrigger className={`w-64 ${isNight ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}>
                  <SelectValue placeholder="Select bridge..." />
                </SelectTrigger>
                <SelectContent>
                  {bridges.map(bridge => (
                    <SelectItem key={bridge.id} value={bridge.id}>
                      {bridge.name} ({bridge.bridgeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Right: Theme + User + Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isNight ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
            >
              {isNight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <span className={`text-sm hidden sm:inline ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
              <span className={`font-medium ${isNight ? 'text-cyan-400' : 'text-blue-600'}`}>
                {currentUser?.name || currentUser?.username}
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className={isNight ? 'text-slate-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Mobile bridge selector */}
        <div className={`md:hidden px-4 pb-2 border-t ${isNight ? 'border-slate-700/30' : 'border-gray-100'}`}>
          {bridges.length > 0 && (
            <Select
              value={selectedBridge?.id || ''}
              onValueChange={handleBridgeChange}
            >
              <SelectTrigger className={`w-full h-8 text-sm ${isNight ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}>
                <SelectValue placeholder="Select bridge..." />
              </SelectTrigger>
              <SelectContent>
                {bridges.map(bridge => (
                  <SelectItem key={bridge.id} value={bridge.id}>
                    {bridge.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      {/* Span Navigation Bar */}
      {selectedBridge && totalSpans > 0 && (
        <div className={`shrink-0 flex items-center justify-center gap-2 px-4 py-2 border-b ${isNight ? 'border-slate-700/30 bg-slate-900/60' : 'border-gray-100 bg-gray-100/60'}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevSpan}
            disabled={selectedSpanIndex === 0}
            className={`h-7 w-7 p-0 ${isNight ? 'text-slate-400 hover:text-white disabled:opacity-30' : 'text-gray-500 hover:text-gray-900 disabled:opacity-30'}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-2xl">
            {selectedBridge.spans.map((span, idx) => (
              <button
                key={span.id}
                onClick={() => setSelectedSpanIndex(idx)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                  idx === selectedSpanIndex
                    ? isNight
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-blue-500/20 text-blue-600 border border-blue-300'
                    : isNight
                      ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'
                }`}
              >
                Span {span.spanNumber}
                <span className="ml-1 opacity-60">({span.spanLength}m)</span>
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextSpan}
            disabled={selectedSpanIndex >= totalSpans - 1}
            className={`h-7 w-7 p-0 ${isNight ? 'text-slate-400 hover:text-white disabled:opacity-30' : 'text-gray-500 hover:text-gray-900 disabled:opacity-30'}`}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Span info badge */}
          {currentSpan && (
            <div className="hidden sm:flex items-center gap-2 ml-3">
              <Badge variant="outline" className={`text-xs ${isNight ? 'border-slate-600 text-slate-400' : 'border-gray-300 text-gray-500'}`}>
                {currentSpan.upstreamBoards} upstream / {currentSpan.downstreamBoards} downstream
              </Badge>
              <span className={`text-xs ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>
                {currentSpan.walkingBoards?.length || 0} boards total
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3D Viewport - fills remaining space */}
      <div className="flex-1 relative overflow-hidden">
        {currentSpan ? (
          <HomeBridge3D
            span={currentSpan}
            theme={theme}
            onBoardClick={handleBoardClick}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${isNight ? 'bg-[#0a0f1a]' : 'bg-gray-100'}`}>
            <div className="text-center">
              <Box className={`w-16 h-16 mx-auto mb-4 ${isNight ? 'text-slate-600' : 'text-gray-300'}`} />
              <p className={`text-lg font-medium mb-2 ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
                {bridges.length === 0 ? 'No bridge data' : 'Select a bridge to view'}
              </p>
              <p className={`text-sm ${isNight ? 'text-slate-600' : 'text-gray-400'}`}>
                {bridges.length === 0
                  ? 'Please add bridge data in the management system first'
                  : 'Use the dropdown above to select a bridge'}
              </p>
              {bridges.length === 0 && (
                <Button
                  onClick={() => router.push('/')}
                  className={`mt-4 text-white ${isNight ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                >
                  Back to Management System
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Board Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className={`${isNight ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-lg max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className={isNight ? 'text-cyan-400' : 'text-blue-600'}>
              Edit Board Status
            </DialogTitle>
            <DialogDescription className={isNight ? 'text-slate-400' : 'text-gray-500'}>
              {editingBoard && `Position: ${getPositionLabel(editingBoard.position)} Column ${editingBoard.columnIndex} #${editingBoard.boardNumber}`}
            </DialogDescription>
          </DialogHeader>

          {editingBoard && (
            <div className="space-y-4">
              {/* Current status indicator */}
              <div className={`flex items-center gap-2 p-2 rounded-lg ${isNight ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                <span className={`text-xs ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>Current status:</span>
                <Badge
                  style={{
                    backgroundColor: (BOARD_STATUS_CONFIG[editingBoard.status] || BOARD_STATUS_CONFIG.normal).color + '33',
                    color: (BOARD_STATUS_CONFIG[editingBoard.status] || BOARD_STATUS_CONFIG.normal).color,
                    borderColor: (BOARD_STATUS_CONFIG[editingBoard.status] || BOARD_STATUS_CONFIG.normal).color + '80'
                  }}
                  variant="outline"
                  className="text-xs"
                >
                  {BOARD_STATUS_CONFIG[editingBoard.status]?.label || editingBoard.status}
                </Badge>
              </div>

              {/* Status select */}
              <div>
                <Label className={isNight ? 'text-slate-300' : 'text-gray-700'}>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                >
                  <SelectTrigger className={isNight ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
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

              {/* Damage description */}
              <div>
                <Label className={isNight ? 'text-slate-300' : 'text-gray-700'}>Damage Description</Label>
                <Textarea
                  value={editForm.damageDesc}
                  onChange={(e) => setEditForm({ ...editForm, damageDesc: e.target.value })}
                  placeholder="Describe the damage condition..."
                  className={isNight ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}
                  rows={3}
                />
              </div>

              {/* Inspector name */}
              <div>
                <Label className={isNight ? 'text-slate-300' : 'text-gray-700'}>Inspector</Label>
                <Input
                  value={editForm.inspectedBy}
                  onChange={(e) => setEditForm({ ...editForm, inspectedBy: e.target.value })}
                  placeholder="Inspector name"
                  className={isNight ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className={isNight ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveBoard}
              disabled={saving}
              className={`text-white ${isNight ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
