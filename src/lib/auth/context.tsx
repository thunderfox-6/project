'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export interface UserInfo {
  id: string
  username: string
  name: string | null
  email: string | null
  phone?: string | null
  department?: string | null
  role: string
}

interface AuthContextType {
  user: UserInfo | null
  token: string | null
  loading: boolean
  login: (token: string, user: UserInfo) => void
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 检查认证状态
  const checkAuth = async () => {
    const storedToken = localStorage.getItem('token')
    
    if (!storedToken) {
      setUser(null)
      setToken(null)
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setUser(result.data)
          setToken(storedToken)
        } else {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
          setToken(null)
        }
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
        setToken(null)
      }
    } catch (error) {
      console.error('Auth check error:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      setToken(null)
    } finally {
      setLoading(false)
    }
  }

  // 登录
  const login = (newToken: string, newUser: UserInfo) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  // 登出
  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      setToken(null)
      router.push('/login')
    }
  }

  // 初始化检查
  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// 权限检查Hook
export function usePermission() {
  const { user } = useAuth()
  
  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    if (user.role === 'admin') return true
    
    // 定义各角色权限
    const rolePermissions: Record<string, string[]> = {
      admin: ['*'],
      manager: ['bridge:read', 'bridge:write', 'bridge:delete', 'span:read', 'span:write', 'board:read', 'board:write', 'log:read', 'data:import', 'data:export', 'user:read'],
      user: ['bridge:read', 'span:read', 'board:read', 'board:write'],
      viewer: ['bridge:read', 'span:read', 'board:read']
    }
    
    const permissions = rolePermissions[user.role] || []
    return permissions.includes('*') || permissions.includes(permission)
  }
  
  const isAdmin = (): boolean => {
    return user?.role === 'admin'
  }
  
  const isManager = (): boolean => {
    return user?.role === 'admin' || user?.role === 'manager'
  }
  
  return { hasPermission, isAdmin, isManager }
}
