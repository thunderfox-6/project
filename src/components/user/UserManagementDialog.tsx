'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Plus, Edit2, Trash2, Shield, Eye, EyeOff, Loader2, Search, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

const ROLE_PERMISSIONS = {
  admin: { label: '系统管理员', description: '拥有所有权限' },
  manager: { label: '桥梁管理者', description: '管理桥梁数据和日志' },
  user: { label: '普通用户', description: '查看和更新步行板' },
  viewer: { label: '只读用户', description: '只能查看数据' }
} as const

interface UserInfo {
  id: string
  username: string
  name: string | null
  email: string | null
  role: string
  phone?: string | null
  department?: string | null
}

interface User extends UserInfo {
  status: string
  lastLoginAt?: string | null
  loginCount: number
  createdAt: string
}

function UserManagementDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', department: '', role: 'user', status: 'active', password: '' })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ username: '', password: '', name: '', email: '', department: '', role: 'user' })
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        setCurrentUserId(user.id)
      } catch {}
    }
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } })
      const result = await response.json()
      if (result.success) setUsers(result.data)
      else toast.error(result.error || '加载用户列表失败')
    } catch (error) {
      toast.error('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (open) loadUsers() }, [open])

  const handleCreateUser = async () => {
    if (!createForm.username || !createForm.password) {
      toast.error('用户名和密码为必填项')
      return
    }
    setCreating(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(createForm)
      })
      const result = await response.json()
      if (result.success) {
        toast.success('用户创建成功')
        setCreateDialogOpen(false)
        setCreateForm({ username: '', password: '', name: '', email: '', department: '', role: 'user' })
        loadUsers()
      } else toast.error(result.error || '创建用户失败')
    } catch {
      toast.error('创建用户失败')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: editingUser.id, ...editForm, password: editForm.password || undefined })
      })
      const result = await response.json()
      if (result.success) {
        toast.success('用户信息更新成功')
        setEditDialogOpen(false)
        loadUsers()
      } else toast.error(result.error || '更新用户失败')
    } catch {
      toast.error('更新用户失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`确定要删除用户 "${user.username}" 吗？`)) return
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/users?id=${user.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      const result = await response.json()
      if (result.success) {
        toast.success('用户已删除')
        loadUsers()
      } else toast.error(result.error || '删除用户失败')
    } catch {
      toast.error('删除用户失败')
    }
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setEditForm({ name: user.name || '', email: user.email || '', department: user.department || '', role: user.role, status: user.status, password: '' })
    setEditDialogOpen(true)
  }

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()))

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      active: { label: '正常', color: 'bg-green-500' },
      inactive: { label: '未激活', color: 'bg-gray-500' },
      locked: { label: '锁定', color: 'bg-red-500' }
    }
    const config = configs[status] || configs.active
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>
  }

  const getRoleBadge = (role: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      admin: { label: '管理员', color: 'bg-purple-500' },
      manager: { label: '管理者', color: 'bg-blue-500' },
      user: { label: '用户', color: 'bg-cyan-500' },
      viewer: { label: '访客', color: 'bg-gray-500' }
    }
    const config = configs[role] || configs.user
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-cyan-400"><Users className="w-5 h-5" />用户管理</DialogTitle>
            <DialogDescription className="text-slate-400">管理系统用户账户和权限</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input placeholder="搜索用户..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-slate-800/50 border-slate-600" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading} className="border-slate-600"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
                <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="bg-cyan-600 hover:bg-cyan-500"><Plus className="w-4 h-4 mr-1" />新建用户</Button>
              </div>
            </div>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">用户名</TableHead>
                    <TableHead className="text-slate-400">姓名</TableHead>
                    <TableHead className="text-slate-400">角色</TableHead>
                    <TableHead className="text-slate-400">状态</TableHead>
                    <TableHead className="text-slate-400">登录次数</TableHead>
                    <TableHead className="text-slate-400">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-8">暂无用户数据</TableCell></TableRow>
                  ) : (
                    filteredUsers.map((u) => (
                      <TableRow key={u.id} className="border-slate-700">
                        <TableCell className="font-medium text-white">{u.username}</TableCell>
                        <TableCell className="text-slate-300">{u.name || '-'}</TableCell>
                        <TableCell>{getRoleBadge(u.role)}</TableCell>
                        <TableCell>{getStatusBadge(u.status)}</TableCell>
                        <TableCell className="text-slate-300">{u.loginCount || 0}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(u)} className="text-slate-400 hover:text-cyan-400"><Edit2 className="w-4 h-4" /></Button>
                            {u.id !== currentUserId && <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(u)} className="text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader className="py-2">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2"><Shield className="w-4 h-4" />角色权限说明</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(ROLE_PERMISSIONS).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">{getRoleBadge(key)}<span className="text-slate-400">{value.description}</span></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader><DialogTitle className="text-cyan-400">新建用户</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-slate-300">用户名 *</Label><Input value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} className="bg-slate-800/50 border-slate-600" /></div>
              <div className="space-y-2"><Label className="text-slate-300">密码 *</Label><Input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="bg-slate-800/50 border-slate-600" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-slate-300">姓名</Label><Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="bg-slate-800/50 border-slate-600" /></div>
              <div className="space-y-2"><Label className="text-slate-300">角色</Label><Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v })}><SelectTrigger className="bg-slate-800/50 border-slate-600"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_PERMISSIONS).map(([key, value]) => (<SelectItem key={key} value={key}>{value.label}</SelectItem>))}</SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-slate-600">取消</Button>
            <Button onClick={handleCreateUser} disabled={creating} className="bg-cyan-600">{creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader><DialogTitle className="text-cyan-400">编辑用户</DialogTitle><DialogDescription className="text-slate-400">编辑用户: {editingUser?.username}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-slate-300">姓名</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-slate-800/50 border-slate-600" /></div>
              <div className="space-y-2"><Label className="text-slate-300">新密码</Label><Input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="留空保持不变" className="bg-slate-800/50 border-slate-600" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-slate-300">角色</Label><Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}><SelectTrigger className="bg-slate-800/50 border-slate-600"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_PERMISSIONS).map(([key, value]) => (<SelectItem key={key} value={key}>{value.label}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label className="text-slate-300">状态</Label><Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}><SelectTrigger className="bg-slate-800/50 border-slate-600"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">正常</SelectItem><SelectItem value="inactive">未激活</SelectItem><SelectItem value="locked">锁定</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-slate-600">取消</Button>
            <Button onClick={handleUpdateUser} disabled={saving} className="bg-cyan-600">{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default UserManagementDialog
