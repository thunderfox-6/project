import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  authenticateRequest,
  verifyPassword,
  hashPassword,
  logOperation,
  getClientIP,
  getUserAgent
} from '@/lib/auth/index'

// 修改密码接口
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({
        success: false,
        error: '未登录或会话已过期'
      }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({
        success: false,
        error: '请输入当前密码和新密码'
      }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({
        success: false,
        error: '新密码长度不能少于6个字符'
      }, { status: 400 })
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({
        success: false,
        error: '新密码不能与当前密码相同'
      }, { status: 400 })
    }

    // 验证当前密码
    if (!verifyPassword(currentPassword, user.password)) {
      return NextResponse.json({
        success: false,
        error: '当前密码不正确'
      }, { status: 400 })
    }

    // 更新密码
    await db.user.update({
      where: { id: user.id },
      data: { password: hashPassword(newPassword) }
    })

    // 记录操作日志
    await logOperation({
      userId: user.id,
      username: user.username,
      action: 'change_password',
      module: 'auth',
      description: `用户 ${user.username} 修改了密码`,
      ip: getClientIP(request),
      userAgent: getUserAgent(request),
      status: 'success'
    })

    return NextResponse.json({
      success: true,
      message: '密码修改成功'
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({
      success: false,
      error: '密码修改失败，请稍后重试'
    }, { status: 500 })
  }
}
