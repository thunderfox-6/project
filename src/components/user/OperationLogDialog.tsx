'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { History, Search, RefreshCw, Loader2, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { toast } from 'sonner'

interface OperationLog {
  id: string
  userId: string | null
  username: string | null
  action: string
  module: string
  targetId: string | null
  targetName: string | null
  description: string
  oldValue: string | null
  newValue: string | null
  ip: string | null
  status: string
  createdAt: string
}

const ACTION_CONFIGS: Record<string, { label: string; color: string }> = {
  login: { label: '登录', color: 'bg-green-500' },
  logout: { label: '登出', color: 'bg-gray-500' },
  create: { label: '创建', color: 'bg-blue-500' },
  update: { label: '更新', color: 'bg-yellow-500' },
  delete: { label: '删除', color: 'bg-red-500' },
  import: { label: '导入', color: 'bg-purple-500' },
  export: { label: '导出', color: 'bg-cyan-500' }
}

const MODULE_CONFIGS: Record<string, { label: string }> = {
  auth: { label: '认证' },
  bridge: { label: '桥梁' },
  span: { label: '孔位' },
  board: { label: '步行板' },
  user: { label: '用户' },
  system: { label: '系统' }
}

function OperationLogDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [logs, setLogs] = useState<OperationLog[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 30
  
  // 筛选条件
  const [filters, setFilters] = useState({
    action: 'all',
    module: 'all',
    username: '',
    startDate: '',
    endDate: ''
  })

  const loadLogs = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', pageSize.toString())
      if (filters.action && filters.action !== 'all') params.set('action', filters.action)
      if (filters.module && filters.module !== 'all') params.set('module', filters.module)
      if (filters.username) params.set('username', filters.username)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      
      const response = await fetch(`/api/logs?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const result = await response.json()
      if (result.success) {
        setLogs(result.data)
        setTotal(result.pagination.total)
        setTotalPages(result.pagination.totalPages)
      } else {
        toast.error(result.error || '加载日志失败')
      }
    } catch (error) {
      toast.error('加载日志失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) loadLogs()
  }, [open, page])

  useEffect(() => {
    if (open) {
      setPage(1)
      loadLogs()
    }
  }, [filters])

  const getActionBadge = (action: string) => {
    const config = ACTION_CONFIGS[action] || { label: action, color: 'bg-gray-500' }
    return <Badge className={`${config.color} text-white text-xs`}>{config.label}</Badge>
  }

  const getModuleLabel = (module: string) => {
    const config = MODULE_CONFIGS[module]
    return config ? config.label : module
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-cyan-400">
            <History className="w-5 h-5" />
            操作日志
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            查看系统操作记录和审计日志
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 筛选器 */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-400">筛选：</span>
            </div>
            
            <Select value={filters.action} onValueChange={(v) => setFilters({ ...filters, action: v })}>
              <SelectTrigger className="w-28 bg-slate-800/50 border-slate-600 text-sm">
                <SelectValue placeholder="操作类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部操作</SelectItem>
                {Object.entries(ACTION_CONFIGS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filters.module} onValueChange={(v) => setFilters({ ...filters, module: v })}>
              <SelectTrigger className="w-28 bg-slate-800/50 border-slate-600 text-sm">
                <SelectValue placeholder="模块" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部模块</SelectItem>
                {Object.entries(MODULE_CONFIGS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              placeholder="用户名"
              value={filters.username}
              onChange={(e) => setFilters({ ...filters, username: e.target.value })}
              className="w-32 bg-slate-800/50 border-slate-600 text-sm"
            />
            
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-36 bg-slate-800/50 border-slate-600 text-sm"
            />
            
            <span className="text-slate-500">至</span>
            
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-36 bg-slate-800/50 border-slate-600 text-sm"
            />
            
            <Button variant="outline" size="sm" onClick={() => setFilters({ action: '', module: '', username: '', startDate: '', endDate: '' })} className="border-slate-600 text-slate-400">
              重置
            </Button>
          </div>
          
          {/* 日志列表 */}
          <ScrollArea className="h-[450px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400 w-40">时间</TableHead>
                  <TableHead className="text-slate-400 w-24">用户</TableHead>
                  <TableHead className="text-slate-400 w-20">操作</TableHead>
                  <TableHead className="text-slate-400 w-20">模块</TableHead>
                  <TableHead className="text-slate-400">描述</TableHead>
                  <TableHead className="text-slate-400 w-24">IP</TableHead>
                  <TableHead className="text-slate-400 w-16">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                      暂无操作日志
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="border-slate-700 hover:bg-slate-800/30">
                      <TableCell className="text-slate-300 text-sm">{formatDate(log.createdAt)}</TableCell>
                      <TableCell className="text-slate-300">{log.username || '系统'}</TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="text-slate-300">{getModuleLabel(log.module)}</TableCell>
                      <TableCell className="text-slate-300 max-w-xs truncate" title={log.description}>{log.description}</TableCell>
                      <TableCell className="text-slate-400 text-sm">{log.ip || '-'}</TableCell>
                      <TableCell>
                        <Badge className={log.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                          {log.status === 'success' ? '成功' : '失败'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          
          {/* 分页 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              共 {total} 条记录，第 {page}/{totalPages} 页
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="border-slate-600 text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="border-slate-600 text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default OperationLogDialog
