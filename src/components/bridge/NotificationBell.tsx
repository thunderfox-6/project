'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, BellOff, Check, CheckCheck, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { NotificationItem } from '@/types/bridge'

interface NotificationBellProps {
  userId: string
  theme?: 'day' | 'night'
}

function SeverityIcon({ severity }: { severity: string | null }) {
  switch (severity) {
    case 'critical':
      return <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
    case 'info':
      return <Info className="h-4 w-4 text-blue-500 shrink-0" />
    default:
      return <Bell className="h-4 w-4 text-gray-400 shrink-0" />
  }
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  if (diffHour < 24) return `${diffHour} 小时前`
  if (diffDay < 30) return `${diffDay} 天前`
  return date.toLocaleDateString('zh-CN')
}

export default function NotificationBell({ userId, theme = 'day' }: NotificationBellProps) {
  const isNight = theme === 'night'
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [marking, setMarking] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return

      const { data } = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch {
      // 静默失败
    }
  }, [])

  // 初始加载 + 30秒轮询
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // 打开时刷新
  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

  const markRead = async (ids: string[]) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      setMarking(true)
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'markRead', ids }),
      })

      if (res.ok) {
        const { data } = await res.json()
        setUnreadCount(data.unreadCount || 0)
        setNotifications((prev) =>
          prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
        )
      }
    } catch {
      // 静默失败
    } finally {
      setMarking(false)
    }
  }

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      setMarking(true)
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'markAllRead' }),
      })

      if (res.ok) {
        setUnreadCount(0)
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      }
    } catch {
      // 静默失败
    } finally {
      setMarking(false)
    }
  }

  const unreadNotifications = notifications.filter((n) => !n.isRead)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          {unreadCount > 0 ? (
            <>
              <Bell className={`h-5 w-5 ${isNight ? 'text-slate-300' : 'text-gray-700'}`} />
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            </>
          ) : (
            <BellOff className={`h-5 w-5 ${isNight ? 'text-slate-500' : 'text-gray-400'}`} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={`w-80 p-0 ${isNight ? 'bg-slate-800 border-slate-700' : 'bg-white'}`}
        align="end"
      >
        <div
          className={`flex items-center justify-between px-4 py-3 border-b ${
            isNight ? 'border-slate-700' : 'border-gray-200'
          }`}
        >
          <h3 className={`font-semibold text-sm ${isNight ? 'text-white' : 'text-gray-900'}`}>
            站内通知
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              disabled={marking}
              className={`h-7 text-xs ${isNight ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              全部已读
            </Button>
          )}
        </div>
        <ScrollArea className="h-[320px]">
          {unreadNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Check
                className={`h-8 w-8 mb-2 ${
                  isNight ? 'text-green-500/50' : 'text-green-400'
                }`}
              />
              <p
                className={`text-sm ${
                  isNight ? 'text-slate-500' : 'text-gray-400'
                }`}
              >
                暂无未读通知
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {unreadNotifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => markRead([notification.id])}
                  className={`w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors ${
                    notification.isRead
                      ? isNight
                        ? 'opacity-50'
                        : 'opacity-60'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <SeverityIcon severity={notification.severity} />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          isNight ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p
                        className={`text-xs mt-0.5 line-clamp-2 ${
                          isNight ? 'text-slate-400' : 'text-gray-500'
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isNight ? 'text-slate-500' : 'text-gray-400'
                        }`}
                      >
                        {timeAgo(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
