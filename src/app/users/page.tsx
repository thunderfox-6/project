'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Users, UserPlus, Edit, Trash2, ArrowLeft, Shield, Mail, Phone, Building2,
  Clock, LogOut, Loader2, Search, Key, UserCheck, UserX
} from 'lucide-react'
import { toast } from 'sonner'

// 用户类型
interface User {
  id: string
  username: string
  name: string | null
  email: string | null
  phone: string | null
  department: string | null
  role: string
  status: string
  lastLoginAt: string | null
  lastLoginIp: string | null
  loginCount: number
  createdAt: string
}

// 角色配置
const ROLE_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  admin: { label: '系统管理员', color: 'bg-red-500', desc: '拥有所有权限' },
  manager: { label: '桥梁管理者', color: 'bg-blue-500', desc: '管理桥梁数据和日志' },
  user: { label: '普通用户', color: 'bg-green-500', desc: '查看和更新步行板' },
  viewer: { label: '只读用户', color: 'bg-gray-500', desc: '只能查看数据' }
}

// 状态配置
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: '正常', color: 'bg-green-500' },
  inactive: { label: '未激活', color: 'bg-gray-500' },
  locked: { label: '已锁定', color: 'bg-red-500' }
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // 对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  
  // 表单状态
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    role: 'user',
    status: 'active'
  })
  const [formLoading, setFormLoading] = useState(false)

  // 检查登录状态和权限（通过 API 验证，不信任 localStorage）
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')

      if (!token) {
        router.push('/login')
        setLoading(false)
        return
      }

      try {
        // 直接通过 API 验证权限（服务端校验角色，不依赖客户端角色判断）
        const response = await fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (response.status === 401) {
          router.push('/login')
          return
        }

        if (response.status === 403) {
          toast.error('您没有权限访问此页面')
          router.push('/')
          return
        }

        const result = await response.json()
        if (result.success) {
          setUsers(result.data)
          // 从 API 返回的数据中获取当前用户信息
          const userStr = localStorage.getItem('user')
          if (userStr) {
            try { setCurrentUser(JSON.parse(userStr)) } catch { /* ignore */ }
          }
        } else {
          toast.error(result.error || '加载用户列表失败')
        }
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // 加载用户列表
  const loadUsers = async (token: string) => {
    try {
      setLoading(true)
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setUsers(result.data)
      } else {
        toast.error(result.error || '获取用户列表失败')
      }
    } catch (error) {
      console.error('加载用户失败:', error)
      toast.error('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 创建用户
  const handleCreateUser = async () => {
    if (!formData.username || !formData.password) {
      toast.error('请填写用户名和密码')
      return
    }

    const token = localStorage.getItem('token')
    if (!token) return

    try {
      setFormLoading(true)
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('用户创建成功')
        setCreateDialogOpen(false)
        resetForm()
        loadUsers(token)
      } else {
        toast.error(result.error || '创建用户失败')
      }
    } catch (error) {
      console.error('创建用户失败:', error)
      toast.error('创建用户失败')
    } finally {
      setFormLoading(false)
    }
  }

  // 更新用户
  const handleUpdateUser = async () => {
    if (!selectedUser) return

    const token = localStorage.getItem('token')
    if (!token) return

    try {
      setFormLoading(true)
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: selectedUser.id,
          ...formData,
          password: formData.password || undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('用户更新成功')
        setEditDialogOpen(false)
        resetForm()
        loadUsers(token)
      } else {
        toast.error(result.error || '更新用户失败')
      }
    } catch (error) {
      console.error('更新用户失败:', error)
      toast.error('更新用户失败')
    } finally {
      setFormLoading(false)
    }
  }

  // 删除用户
  const handleDeleteUser = async () => {
    if (!selectedUser) return

    const token = localStorage.getItem('token')
    if (!token) return

    try {
      setFormLoading(true)
      const response = await fetch(`/api/users?id=${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await response.json()

      if (result.success) {
        toast.success('用户删除成功')
        setDeleteDialogOpen(false)
        setSelectedUser(null)
        loadUsers(token)
      } else {
        toast.error(result.error || '删除用户失败')
      }
    } catch (error) {
      console.error('删除用户失败:', error)
      toast.error('删除用户失败')
    } finally {
      setFormLoading(false)
    }
  }

  // 打开编辑对话框
  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      password: '',
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      department: user.department || '',
      role: user.role,
      status: user.status
    })
    setEditDialogOpen(true)
  }

  // 重置表单
  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      email: '',
      phone: '',
      department: '',
      role: 'user',
      status: 'active'
    })
    setSelectedUser(null)
  }

  // 退出登录
  const handleLogout = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        await fetch('/api/auth/logout', {
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

  // 过滤用户
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // 格式化日期
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* 顶部导航 */}
      <header className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/')}
              className="text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回主页
            </Button>
            <div className="h-4 w-px bg-slate-600" />
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              用户管理
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-400">
              当前用户：<span className="text-cyan-400">{currentUser?.name || currentUser?.username}</span>
              <Badge className="ml-2 bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                {ROLE_CONFIG[currentUser?.role || 'user']?.label}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{users.length}</p>
                  <p className="text-sm text-slate-400">总用户数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <UserCheck className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {users.filter(u => u.status === 'active').length}
                  </p>
                  <p className="text-sm text-slate-400">活跃用户</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Shield className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {users.filter(u => u.role === 'admin').length}
                  </p>
                  <p className="text-sm text-slate-400">管理员</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <UserX className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {users.filter(u => u.status === 'locked').length}
                  </p>
                  <p className="text-sm text-slate-400">锁定账户</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 用户列表 */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">用户列表</CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="搜索用户..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64 bg-slate-700/50 border-slate-600 text-white placeholder-slate-500"
                  />
                </div>
                <Button
                  onClick={() => {
                    resetForm()
                    setCreateDialogOpen(true)
                  }}
                  className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  添加用户
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-transparent">
                    <TableHead className="text-slate-400">用户名</TableHead>
                    <TableHead className="text-slate-400">姓名</TableHead>
                    <TableHead className="text-slate-400">部门</TableHead>
                    <TableHead className="text-slate-400">角色</TableHead>
                    <TableHead className="text-slate-400">状态</TableHead>
                    <TableHead className="text-slate-400">最后登录</TableHead>
                    <TableHead className="text-slate-400">登录次数</TableHead>
                    <TableHead className="text-slate-400 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="border-slate-700/50 hover:bg-slate-700/30">
                      <TableCell className="text-white font-medium">{user.username}</TableCell>
                      <TableCell className="text-slate-300">{user.name || '-'}</TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          {user.department || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${ROLE_CONFIG[user.role]?.color} text-white`}>
                          {ROLE_CONFIG[user.role]?.label || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_CONFIG[user.status]?.color} text-white`}>
                          {STATUS_CONFIG[user.status]?.label || user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {formatDate(user.lastLoginAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">{user.loginCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                            className="text-slate-400 hover:text-cyan-400"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {user.id !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user)
                                setDeleteDialogOpen(true)
                              }}
                              className="text-slate-400 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  暂无用户数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* 创建用户对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-cyan-400" />
              添加新用户
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              创建新的系统用户账户
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">用户名 *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="输入用户名"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">密码 *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="输入密码"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">姓名</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="输入真实姓名"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">部门</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="输入所属部门"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> 邮箱
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="输入邮箱地址"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> 电话
                </Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="输入联系电话"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> 角色
                </Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {Object.entries(ROLE_CONFIG).map(([key, value]) => (
                      <SelectItem key={key} value={key} className="text-white hover:bg-slate-700">
                        <div className="flex flex-col">
                          <span>{value.label}</span>
                          <span className="text-xs text-slate-400">{value.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">状态</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                      <SelectItem key={key} value={key} className="text-white hover:bg-slate-700">
                        {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-slate-600 text-slate-300">
              取消
            </Button>
            <Button onClick={handleCreateUser} disabled={formLoading} className="bg-gradient-to-r from-cyan-600 to-purple-600">
              {formLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              创建用户
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑用户对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit className="w-5 h-5 text-cyan-400" />
              编辑用户
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              修改用户信息（密码留空表示不修改）
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">用户名</Label>
                <Input
                  value={formData.username}
                  disabled
                  className="bg-slate-700/30 border-slate-600 text-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-1">
                  <Key className="w-3 h-3" /> 新密码
                </Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="留空则不修改"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">姓名</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="输入真实姓名"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">部门</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="输入所属部门"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> 邮箱
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="输入邮箱地址"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> 电话
                </Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="输入联系电话"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> 角色
                </Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {Object.entries(ROLE_CONFIG).map(([key, value]) => (
                      <SelectItem key={key} value={key} className="text-white hover:bg-slate-700">
                        <div className="flex flex-col">
                          <span>{value.label}</span>
                          <span className="text-xs text-slate-400">{value.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">状态</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                      <SelectItem key={key} value={key} className="text-white hover:bg-slate-700">
                        {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-slate-600 text-slate-300">
              取消
            </Button>
            <Button onClick={handleUpdateUser} disabled={formLoading} className="bg-gradient-to-r from-cyan-600 to-purple-600">
              {formLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              确认删除
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              您确定要删除用户 <span className="text-cyan-400">{selectedUser?.username}</span> 吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="border-slate-600 text-slate-300">
              取消
            </Button>
            <Button onClick={handleDeleteUser} disabled={formLoading} className="bg-red-600 hover:bg-red-500">
              {formLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
