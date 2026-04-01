'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ClipboardList,
  ArrowLeft,
  Plus,
  Loader2,
  AlertTriangle,
  Clock,
  User,
  LogOut,
  Calendar,
  CheckCircle2,
  Timer,
  Trash2,
  ChevronRight,
  Filter,
  Building2,
  Sun,
  Moon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useTheme } from '@/components/ThemeProvider'

// Types
interface Bridge {
  id: string
  name: string
  bridgeCode: string
  location: string | null
}

interface InspectionTask {
  id: string
  bridgeId: string
  assignedTo: string | null
  dueDate: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  notes: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  bridge: Bridge
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

// Status config
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: '待处理', color: '#eab308', bg: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', icon: Clock },
  in_progress: { label: '进行中', color: '#3b82f6', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: Timer },
  completed: { label: '已完成', color: '#22c55e', bg: 'bg-green-500/15 text-green-400 border-green-500/30', icon: CheckCircle2 }
}

// Priority config
const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: '低', color: '#6b7280', bg: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  normal: { label: '中', color: '#3b82f6', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  high: { label: '高', color: '#f97316', bg: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  urgent: { label: '紧急', color: '#ef4444', bg: 'bg-red-500/15 text-red-400 border-red-500/30' }
}

// Next status flow
const NEXT_STATUS: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'completed'
}

export default function InspectionPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const isNight = theme === 'night'

  const [tasks, setTasks] = useState<InspectionTask[]>([])
  const [bridges, setBridges] = useState<Bridge[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // Create form
  const [form, setForm] = useState({
    bridgeId: '',
    assignedTo: '',
    dueDate: '',
    priority: 'normal',
    notes: ''
  })

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

  // Load data
  const loadData = async () => {
    try {
      setLoading(true)
      const [taskRes, bridgeRes] = await Promise.all([
        authFetch('/api/inspection'),
        authFetch('/api/bridges')
      ])

      if (!taskRes.ok || !bridgeRes.ok) {
        if (taskRes.status === 401 || bridgeRes.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load data')
      }

      const taskData = await taskRes.json()
      const bridgeData = await bridgeRes.json()

      // For bridges, only need basic info
      const bridgeList: Bridge[] = bridgeData.map((b: any) => ({
        id: b.id,
        name: b.name,
        bridgeCode: b.bridgeCode,
        location: b.location
      }))

      setTasks(taskData)
      setBridges(bridgeList)
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) loadData()
  }, [router])

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (statusFilter === 'all') return tasks
    return tasks.filter(t => t.status === statusFilter)
  }, [tasks, statusFilter])

  // Task counts by status
  const taskCounts = useMemo(() => {
    const counts = { all: tasks.length, pending: 0, in_progress: 0, completed: 0 }
    tasks.forEach(t => { counts[t.status]++ })
    return counts
  }, [tasks])

  // Check overdue
  const isOverdue = (task: InspectionTask) => {
    if (task.status === 'completed') return false
    return new Date(task.dueDate) < new Date()
  }

  // Create task
  const handleCreate = async () => {
    if (!form.bridgeId) {
      toast.error('请选择桥梁')
      return
    }
    if (!form.dueDate) {
      toast.error('请选择截止日期')
      return
    }

    setCreating(true)
    try {
      const res = await authFetch('/api/inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '创建失败')
      }

      toast.success('检查任务已创建')
      setCreateOpen(false)
      setForm({ bridgeId: '', assignedTo: '', dueDate: '', priority: 'normal', notes: '' })
      loadData()
    } catch (error: any) {
      toast.error(error.message || '创建失败')
    } finally {
      setCreating(false)
    }
  }

  // Update task status
  const handleStatusUpdate = async (task: InspectionTask) => {
    const nextStatus = NEXT_STATUS[task.status]
    if (!nextStatus) return

    try {
      const res = await authFetch('/api/inspection', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: nextStatus })
      })

      if (!res.ok) {
        throw new Error('更新失败')
      }

      const labels: Record<string, string> = { pending: '待处理', in_progress: '进行中', completed: '已完成' }
      toast.success(`任务状态已更新为「${labels[nextStatus]}」`)
      loadData()
    } catch (error) {
      toast.error('更新状态失败')
    }
  }

  // Delete task
  const handleDelete = async (task: InspectionTask) => {
    if (!confirm(`确认删除「${task.bridge.name}」的检查任务？`)) return

    try {
      const res = await authFetch(`/api/inspection?id=${task.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('删除失败')

      toast.success('任务已删除')
      loadData()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  // Logout
  const handleLogout = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try { await authFetch('/api/auth/logout', { method: 'POST' }) } catch {}
    }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  // Format date
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', year: 'numeric' })
  }

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isNight ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className={isNight ? 'text-slate-400' : 'text-gray-500'}>加载检查任务数据...</p>
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
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
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
              <ClipboardList className="w-5 h-5 text-cyan-400" />
              巡检任务管理
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

      <main className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: '全部任务', value: taskCounts.all, color: 'text-cyan-400', bg: 'bg-cyan-500/20', icon: ClipboardList },
            { label: '待处理', value: taskCounts.pending, color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Clock },
            { label: '进行中', value: taskCounts.in_progress, color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Timer },
            { label: '已完成', value: taskCounts.completed, color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle2 },
          ].map((stat) => (
            <Card key={stat.label} className="tech-card">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className={`text-sm ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter bar and create button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter className={`w-4 h-4 ${isNight ? 'text-slate-400' : 'text-gray-500'}`} />
            <span className={`text-sm mr-2 ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>状态筛选:</span>
            {[
              { key: 'all', label: '全部' },
              { key: 'pending', label: '待处理' },
              { key: 'in_progress', label: '进行中' },
              { key: 'completed', label: '已完成' }
            ].map((f) => (
              <Button
                key={f.key}
                variant={statusFilter === f.key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter(f.key)}
                className={
                  statusFilter === f.key
                    ? isNight ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                    : isNight ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }
              >
                {f.label}
                <Badge variant="secondary" className={`ml-1.5 text-xs ${isNight ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                  {f.key === 'all' ? taskCounts.all : taskCounts[f.key as keyof typeof taskCounts]}
                </Badge>
              </Button>
            ))}
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className={`text-white bg-gradient-to-r ${isNight ? 'from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500' : 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'}`}>
                <Plus className="w-4 h-4 mr-2" />
                创建任务
              </Button>
            </DialogTrigger>
            <DialogContent className={isNight ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}>
              <DialogHeader>
                <DialogTitle className={`flex items-center gap-2 ${isNight ? 'text-white' : 'text-gray-900'}`}>
                  <ClipboardList className="w-5 h-5 text-cyan-400" />
                  创建巡检任务
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className={isNight ? 'text-slate-300' : 'text-gray-700'}>选择桥梁 *</Label>
                  <Select
                    value={form.bridgeId}
                    onValueChange={(v) => setForm({ ...form, bridgeId: v })}
                  >
                    <SelectTrigger className={isNight ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}>
                      <SelectValue placeholder="请选择桥梁" />
                    </SelectTrigger>
                    <SelectContent className={isNight ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}>
                      {bridges.map((b) => (
                        <SelectItem key={b.id} value={b.id} className={isNight ? 'text-white focus:bg-slate-700 focus:text-white' : 'text-gray-900 focus:bg-gray-100 focus:text-gray-900'}>
                          {b.name} ({b.bridgeCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className={isNight ? 'text-slate-300' : 'text-gray-700'}>负责人</Label>
                  <Input
                    placeholder="请输入负责人姓名"
                    value={form.assignedTo}
                    onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                    className={isNight ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={isNight ? 'text-slate-300' : 'text-gray-700'}>截止日期 *</Label>
                    <Input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      className={isNight ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={isNight ? 'text-slate-300' : 'text-gray-700'}>优先级</Label>
                    <Select
                      value={form.priority}
                      onValueChange={(v) => setForm({ ...form, priority: v })}
                    >
                      <SelectTrigger className={isNight ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={isNight ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}>
                        <SelectItem value="low" className={isNight ? 'text-white' : 'text-gray-900'}>低</SelectItem>
                        <SelectItem value="normal" className={isNight ? 'text-white' : 'text-gray-900'}>中</SelectItem>
                        <SelectItem value="high" className={isNight ? 'text-white' : 'text-gray-900'}>高</SelectItem>
                        <SelectItem value="urgent" className={isNight ? 'text-white' : 'text-gray-900'}>紧急</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className={isNight ? 'text-slate-300' : 'text-gray-700'}>备注</Label>
                  <Textarea
                    placeholder="任务备注..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className={isNight ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setCreateOpen(false)}
                    className={isNight ? 'text-slate-400' : 'text-gray-500'}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={creating}
                    className={isNight ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        创建中...
                      </>
                    ) : '创建任务'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Task list */}
        <ScrollArea className="h-[calc(100vh-340px)]">
          <AnimatePresence mode="popLayout">
            {filteredTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.map((task) => {
                  const statusConf = STATUS_CONFIG[task.status]
                  const priorityConf = PRIORITY_CONFIG[task.priority]
                  const overdue = isOverdue(task)
                  const StatusIcon = statusConf.icon

                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className={`tech-card transition-all ${isNight ? 'hover:border-slate-600' : 'hover:border-gray-300'} ${
                        overdue ? 'border-red-500/40 bg-red-500/5' : ''
                      }`}>
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            {/* Header: bridge name + badges */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                                  <h3 className={`font-medium text-sm truncate ${isNight ? 'text-white' : 'text-gray-900'}`}>
                                    {task.bridge.name}
                                  </h3>
                                </div>
                                <p className={`text-xs mt-0.5 ml-6 ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>
                                  {task.bridge.bridgeCode}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <Badge className={`text-xs border ${priorityConf.bg}`}>
                                  {priorityConf.label}
                                </Badge>
                              </div>
                            </div>

                            {/* Status badge */}
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs border ${statusConf.bg}`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConf.label}
                              </Badge>
                              {overdue && (
                                <Badge className="text-xs border bg-red-500/15 text-red-400 border-red-500/30">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  已逾期
                                </Badge>
                              )}
                            </div>

                            {/* Details */}
                            <div className={`space-y-1.5 text-xs ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
                              {task.assignedTo && (
                                <div className="flex items-center gap-2">
                                  <User className="w-3 h-3" />
                                  <span>{task.assignedTo}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                <span className={overdue ? 'text-red-400' : ''}>
                                  截止: {formatDate(task.dueDate)}
                                </span>
                              </div>
                              {task.completedAt && (
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                                  <span>完成: {formatDate(task.completedAt)}</span>
                                </div>
                              )}
                              {task.notes && (
                                <p className={`mt-1 line-clamp-2 italic ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>
                                  "{task.notes}"
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className={`flex items-center gap-2 pt-2 border-t ${isNight ? 'border-slate-700/50' : 'border-gray-200'}`}>
                              {NEXT_STATUS[task.status] && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 text-xs h-7"
                                  onClick={() => handleStatusUpdate(task)}
                                >
                                  <ChevronRight className="w-3 h-3 mr-1" />
                                  {task.status === 'pending' ? '开始执行' : '标记完成'}
                                </Button>
                              )}
                              <div className="flex-1" />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 text-xs h-7"
                                onClick={() => handleDelete(task)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <ClipboardList className={`w-16 h-16 mx-auto mb-4 ${isNight ? 'text-slate-600' : 'text-gray-300'}`} />
                <p className={`text-lg mb-2 ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
                  {statusFilter === 'all' ? '暂无检查任务' : `暂无${STATUS_CONFIG[statusFilter]?.label || ''}任务`}
                </p>
                <p className={`text-sm mb-4 ${isNight ? 'text-slate-500' : 'text-gray-400'}`}>点击「创建任务」按钮添加新的检查任务</p>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className={isNight ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  创建任务
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </main>
    </div>
  )
}
