'use client'

import { useEffect, useState, createContext, useContext, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, LogOut, User, History, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Suspense } from 'react'

interface UserInfo {
  id: string
  username: string
  name: string | null
  email: string | null
  role: string
}

interface AuthContextType {
  user: UserInfo | null
  token: string | null
  loading: boolean
  logout: () => Promise<void>
  isAdmin: () => boolean
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuthContext must be used within AuthProvider')
  return context
}

// 用户管理对话框（延迟加载）
function UserManagementDialogWrapper({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [Component, setComponent] = useState<React.ComponentType<{ open: boolean; onClose: () => void }> | null>(null)
  
  useEffect(() => {
    if (open && !Component) {
      import('@/components/user/UserManagementDialog').then((mod) => {
        setComponent(() => mod.default)
      })
    }
  }, [open, Component])
  
  if (!Component) return null
  return <Component open={open} onClose={onClose} />
}

// 操作日志对话框（延迟加载）
function OperationLogDialogWrapper({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [Component, setComponent] = useState<React.ComponentType<{ open: boolean; onClose: () => void }> | null>(null)
  
  useEffect(() => {
    if (open && !Component) {
      import('@/components/user/OperationLogDialog').then((mod) => {
        setComponent(() => mod.default)
      })
    }
  }, [open, Component])
  
  if (!Component) return null
  return <Component open={open} onClose={onClose} />
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [userManagementOpen, setUserManagementOpen] = useState(false)
  const [logDialogOpen, setLogDialogOpen] = useState(false)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (!storedToken || !storedUser) {
      if (pathname !== '/login') {
        router.push('/login')
      }
      setLoading(false)
      return
    }
    
    try {
      const userData = JSON.parse(storedUser)
      setUser(userData)
      setToken(storedToken)
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (pathname !== '/login') {
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }, [pathname, router])

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      }
    } catch {}
    
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setToken(null)
    toast.success('已退出登录')
    router.push('/login')
  }

  const isAdmin = () => user?.role === 'admin'
  
  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    if (user.role === 'admin') return true
    const perms: Record<string, string[]> = {
      manager: ['bridge:read', 'bridge:write', 'bridge:delete', 'span:read', 'span:write', 'board:read', 'board:write', 'log:read', 'data:import', 'data:export', 'ai:use'],
      user: ['bridge:read', 'span:read', 'board:read'],
      viewer: ['bridge:read', 'span:read', 'board:read']
    }
    return perms[user.role]?.includes(permission) || false
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-slate-400">加载中...</p>
        </div>
      </div>
    )
  }

  if (!user && pathname !== '/login') {
    return null
  }

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: '管理员', color: 'text-purple-400' },
    manager: { label: '管理者', color: 'text-blue-400' },
    user: { label: '用户', color: 'text-cyan-400' },
    viewer: { label: '访客', color: 'text-gray-400' }
  }
  const roleConfig = roleLabels[user?.role || 'viewer'] || roleLabels.viewer

  return (
    <AuthContext.Provider value={{ user, token, loading, logout, isAdmin, hasPermission }}>
      {user && pathname !== '/login' && (
        <>
          <div className="fixed top-0 right-0 z-50 flex items-center gap-2 p-2 bg-slate-900/90 backdrop-blur-sm border-b border-l border-slate-700/50 rounded-bl-lg">
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/50">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-white">{user.name || user.username}</span>
              <span className={`text-xs ${roleConfig.color}`}>({roleConfig.label})</span>
            </div>
            {isAdmin() && (
              <Button variant="ghost" size="sm" onClick={() => setUserManagementOpen(true)} className="text-slate-400 hover:text-cyan-400" title="用户管理">
                <Users className="w-4 h-4" />
              </Button>
            )}
            {hasPermission('log:read') && (
              <Button variant="ghost" size="sm" onClick={() => setLogDialogOpen(true)} className="text-slate-400 hover:text-cyan-400" title="操作日志">
                <History className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400 hover:text-red-400" title="退出登录">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          <UserManagementDialogWrapper open={userManagementOpen} onClose={() => setUserManagementOpen(false)} />
          <OperationLogDialogWrapper open={logDialogOpen} onClose={() => setLogDialogOpen(false)} />
        </>
      )}
      {children}
    </AuthContext.Provider>
  )
}
