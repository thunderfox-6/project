import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth/index'

// GET - 查询当前用户的通知
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const session = await getSession(token)
    if (!session) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100)

    const where: Record<string, unknown> = { userId: session.userId }
    if (unreadOnly) {
      where.isRead = false
    }

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      db.notification.count({
        where: { userId: session.userId, isRead: false },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    })
  } catch (error) {
    console.error('获取通知失败:', error)
    return NextResponse.json({ error: '获取通知失败' }, { status: 500 })
  }
}

// PUT - 标记通知已读
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const session = await getSession(token)
    if (!session) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ids } = body

    if (action === 'markRead' && Array.isArray(ids) && ids.length > 0) {
      await db.notification.updateMany({
        where: {
          id: { in: ids },
          userId: session.userId,
        },
        data: { isRead: true },
      })

      const unreadCount = await db.notification.count({
        where: { userId: session.userId, isRead: false },
      })

      return NextResponse.json({ success: true, data: { unreadCount } })
    }

    if (action === 'markAllRead') {
      await db.notification.updateMany({
        where: {
          userId: session.userId,
          isRead: false,
        },
        data: { isRead: true },
      })

      return NextResponse.json({ success: true, data: { unreadCount: 0 } })
    }

    return NextResponse.json({ error: '无效的操作' }, { status: 400 })
  } catch (error) {
    console.error('更新通知失败:', error)
    return NextResponse.json({ error: '更新通知失败' }, { status: 500 })
  }
}
