'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Train, Lock, User, Loader2, Eye, EyeOff, ShieldAlert, Timer, Sun, Moon } from 'lucide-react'
import { toast } from 'sonner'
import { useTheme } from '@/components/ThemeProvider'

export default function LoginPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const isNight = theme === 'night'
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    username: '',
    password: ''
  })

  // 锁定相关状态
  const [locked, setLocked] = useState(false)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)

  // 倒计时逻辑
  const updateCountdown = useCallback(() => {
    if (!lockedUntil) return
    const now = Date.now()
    const diff = Math.max(0, Math.ceil((lockedUntil - now) / 1000))
    setRemainingSeconds(diff)
    if (diff <= 0) {
      setLocked(false)
      setLockedUntil(null)
      setRemainingAttempts(null)
    }
  }, [lockedUntil])

  useEffect(() => {
    if (!locked || !lockedUntil) return

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [locked, lockedUntil, updateCountdown])

  // 格式化倒计时 mm:ss
  const formatCountdown = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (locked) {
      toast.error('账户已锁定，请等待解锁后重试')
      return
    }

    if (!form.username || !form.password) {
      toast.error('请输入用户名和密码')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const result = await response.json()

      if (result.success && result.data) {
        // 清除锁定状态
        setLocked(false)
        setLockedUntil(null)
        setRemainingAttempts(null)

        // 保存token和用户信息到localStorage
        localStorage.setItem('token', result.data.token)
        localStorage.setItem('user', JSON.stringify(result.data.user))

        toast.success('登录成功')

        // 刷新页面进入主系统
        router.refresh()
        window.location.href = '/'
      } else {
        // 处理锁定状态
        if (result.locked && result.lockedUntil) {
          setLocked(true)
          setLockedUntil(result.lockedUntil)
          setRemainingAttempts(0)
          toast.error(result.error || '账户已锁定，请 15 分钟后重试')
        } else {
          // 更新剩余尝试次数
          if (result.remainingAttempts !== undefined) {
            setRemainingAttempts(result.remainingAttempts)
          }
          toast.error(result.error || '登录失败')
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${isNight ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
      {/* 主题切换按钮 */}
      <button
        type="button"
        onClick={toggleTheme}
        className={`absolute top-4 right-4 z-20 p-2 rounded-lg transition-colors ${isNight ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
      >
        {isNight ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* 背景效果 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl ${isNight ? 'bg-cyan-500/10' : 'bg-blue-200/30'}`} />
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl ${isNight ? 'bg-purple-500/10' : 'bg-indigo-200/30'}`} />
      </div>

      <Card className={`w-full max-w-md relative z-10 backdrop-blur-sm ${isNight ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white/80 border-gray-200'}`}>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center mb-4">
            <Train className="w-8 h-8 text-white" />
          </div>
          <CardTitle className={`text-2xl font-bold ${isNight ? 'bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent' : 'text-blue-700'}`}>
            铁路明桥面步行板可视化管理系统
          </CardTitle>
          <CardDescription className={isNight ? 'text-slate-400' : 'text-gray-500'}>
            Railway Bridge Walking Board Management System
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className={isNight ? 'text-slate-300' : 'text-gray-700'}>用户名</Label>
              <div className="relative">
                <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isNight ? 'text-slate-500' : 'text-gray-400'}`} />
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className={`pl-10 ${isNight ? 'bg-slate-700/50 border-slate-600 focus:border-cyan-500 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-300 focus:border-blue-500 text-gray-900 placeholder-gray-400'}`}
                  disabled={loading || locked}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={isNight ? 'text-slate-300' : 'text-gray-700'}>密码</Label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isNight ? 'text-slate-500' : 'text-gray-400'}`} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={`pl-10 pr-10 ${isNight ? 'bg-slate-700/50 border-slate-600 focus:border-cyan-500 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-300 focus:border-blue-500 text-gray-900 placeholder-gray-400'}`}
                  disabled={loading || locked}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${isNight ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 锁定状态提示 */}
            {locked && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 space-y-2">
                <div className="flex items-center gap-2 text-red-400">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">账户已锁定</span>
                </div>
                <div className="flex items-center gap-2 text-red-300/80 text-sm">
                  <Timer className="w-4 h-4 flex-shrink-0" />
                  <span>请等待 <span className="font-mono font-bold text-red-300">{formatCountdown(remainingSeconds)}</span> 后重试</span>
                </div>
                <p className="text-xs text-red-300/60">
                  连续 {5} 次登录失败，账户已被临时锁定 15 分钟
                </p>
              </div>
            )}

            {/* 剩余尝试次数提示（非锁定状态下显示） */}
            {remainingAttempts !== null && remainingAttempts > 0 && !locked && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-sm text-amber-300">
                  密码错误，还剩 <span className="font-bold">{remainingAttempts}</span> 次尝试机会
                </span>
              </div>
            )}

            <Button
              type="submit"
              className={`w-full text-white font-medium disabled:opacity-50 ${isNight ? 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'}`}
              disabled={loading || locked}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  登录中...
                </>
              ) : locked ? (
                <>
                  <ShieldAlert className="w-4 h-4 mr-2" />
                  已锁定 {formatCountdown(remainingSeconds)}
                </>
              ) : (
                '登 录'
              )}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  )
}
