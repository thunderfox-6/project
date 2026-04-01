'use client'

import { useEffect, useState, createContext, useContext, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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
export function UserManagementDialogWrapper({ open, onClose }: { open: boolean; onClose: () => void }) {
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
export function OperationLogDialogWrapper({ open, onClose }: { open: boolean; onClose: () => void }) {
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

  return (
    <AuthContext.Provider value={{ user, token, loading, logout, isAdmin, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}
