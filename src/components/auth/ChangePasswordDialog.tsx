'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Key, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ChangePasswordDialogProps {
  open: boolean
  onClose: () => void
  theme?: 'day' | 'night'
}

function getPasswordStrength(password: string): { label: string; level: number; color: string } {
  if (!password) return { label: '', level: 0, color: '' }

  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { label: '弱', level: 1, color: 'bg-red-500' }
  if (score <= 3) return { label: '中', level: 2, color: 'bg-yellow-500' }
  return { label: '强', level: 3, color: 'bg-green-500' }
}

export default function ChangePasswordDialog({ open, onClose, theme = 'night' }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const isDark = theme === 'night'
  const strength = getPasswordStrength(newPassword)
  const passwordsMatch = confirmPassword === newPassword
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    confirmPassword.length > 0 &&
    passwordsMatch &&
    currentPassword !== newPassword &&
    !loading

  const resetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setLoading(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      })

      const data = await res.json()

      if (data.success) {
        toast.success('密码修改成功')
        handleClose()
      } else {
        toast.error(data.error || '密码修改失败')
      }
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className={`sm:max-w-md ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            <Key className="w-5 h-5" />
            修改密码
          </DialogTitle>
          <DialogDescription className={isDark ? 'text-slate-400' : 'text-gray-500'}>
            请输入当前密码并设置新密码
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 当前密码 */}
          <div className="space-y-2">
            <Label className={isDark ? 'text-slate-300' : 'text-gray-700'}>当前密码</Label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="请输入当前密码"
                className={`pr-10 ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'}`}
              />
              <button
                type="button"
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 新密码 */}
          <div className="space-y-2">
            <Label className={isDark ? 'text-slate-300' : 'text-gray-700'}>新密码</Label>
            <div className="relative">
              <Input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少6个字符）"
                className={`pr-10 ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'}`}
              />
              <button
                type="button"
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* 密码强度指示器 */}
            {newPassword.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        strength.level >= level ? strength.color : isDark ? 'bg-slate-700' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${
                  strength.level === 1 ? 'text-red-500' :
                  strength.level === 2 ? 'text-yellow-500' :
                  'text-green-500'
                }`}>
                  密码强度: {strength.label}
                </p>
              </div>
            )}
            {newPassword.length > 0 && newPassword.length < 6 && (
              <p className="text-xs text-red-500">密码长度不能少于6个字符</p>
            )}
            {currentPassword.length > 0 && newPassword.length > 0 && currentPassword === newPassword && (
              <p className="text-xs text-red-500">新密码不能与当前密码相同</p>
            )}
          </div>

          {/* 确认新密码 */}
          <div className="space-y-2">
            <Label className={isDark ? 'text-slate-300' : 'text-gray-700'}>确认新密码</Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                className={`pr-10 ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'}`}
              />
              <button
                type="button"
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-red-500">两次输入的密码不一致</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : ''}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className={isDark ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : ''}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  修改中...
                </>
              ) : (
                '确认修改'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
