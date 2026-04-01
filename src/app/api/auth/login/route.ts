import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyPassword,
  createSession,
  getClientIP,
  getUserAgent,
  logOperation,
  createDefaultAdmin
} from '@/lib/auth/index'
import { seedAlertRules } from '@/lib/seed-alert-rules'

// 登录失败锁定机制
interface LockoutInfo {
  attempts: number
  lockedUntil: number | null // timestamp (ms)
}

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 分钟（毫秒）

// 使用内存 Map 跟踪失败尝试：key 为 "username:ip"
const loginAttempts = new Map<string, LockoutInfo>()

function getLockoutKey(username: string, ip: string): string {
  return `${username}:${ip}`
}

function getLockoutInfo(key: string): LockoutInfo {
  const info = loginAttempts.get(key)
  if (!info) return { attempts: 0, lockedUntil: null }
  return info
}

function isLockedOut(info: LockoutInfo): boolean {
  if (!info.lockedUntil) return false
  if (Date.now() >= info.lockedUntil) {
    // 锁定已过期，视为未锁定
    return false
  }
  return true
}

function recordFailure(key: string): LockoutInfo {
  const info = getLockoutInfo(key)
  // 如果之前的锁定已过期，重置计数
  if (info.lockedUntil && Date.now() >= info.lockedUntil) {
    info.attempts = 0
    info.lockedUntil = null
  }
  info.attempts += 1
  if (info.attempts >= MAX_ATTEMPTS) {
    info.lockedUntil = Date.now() + LOCKOUT_DURATION
  }
  loginAttempts.set(key, info)
  return info
}

function resetAttempts(key: string): void {
  loginAttempts.delete(key)
}

// 登录接口
export async function POST(request: NextRequest) {
  try {
    // 确保默认管理员存在
    await createDefaultAdmin()

    // 初始化内置预警规则（幂等）
    await seedAlertRules()

    const body = await request.json()
    const { username, password } = body
    const clientIP = getClientIP(request)

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: '请输入用户名和密码'
      }, { status: 400 })
    }

    // 检查该 username+IP 是否已被锁定
    const lockoutKey = getLockoutKey(username, clientIP)
    const lockoutInfo = getLockoutInfo(lockoutKey)

    if (isLockedOut(lockoutInfo)) {
      const remainingMs = (lockoutInfo.lockedUntil! - Date.now())
      const remainingMin = Math.ceil(remainingMs / 60000)

      await logOperation({
        username,
        action: 'login',
        module: 'auth',
        description: `登录被拒绝：账户已锁定（IP: ${clientIP}）`,
        ip: clientIP,
        userAgent: getUserAgent(request),
        status: 'failed',
        errorMsg: '账户已锁定'
      })

      return NextResponse.json({
        success: false,
        error: '账户已锁定，请 15 分钟后重试',
        locked: true,
        lockedUntil: lockoutInfo.lockedUntil,
        remainingMinutes: remainingMin
      }, { status: 429 })
    }

    // 查找用户
    const user = await db.user.findUnique({
      where: { username }
    })

    if (!user) {
      const info = recordFailure(lockoutKey)
      const remaining = MAX_ATTEMPTS - info.attempts

      await logOperation({
        username,
        action: 'login',
        module: 'auth',
        description: `登录失败：用户名 ${username} 不存在`,
        ip: clientIP,
        userAgent: getUserAgent(request),
        status: 'failed',
        errorMsg: '用户不存在'
      })

      if (remaining <= 0) {
        return NextResponse.json({
          success: false,
          error: '账户已锁定，请 15 分钟后重试',
          locked: true,
          lockedUntil: info.lockedUntil,
          remainingMinutes: 15
        }, { status: 429 })
      }

      return NextResponse.json({
        success: false,
        error: `密码错误，还剩 ${remaining} 次尝试机会`,
        remainingAttempts: remaining
      }, { status: 401 })
    }

    // 检查用户状态
    if (user.status !== 'active') {
      await logOperation({
        userId: user.id,
        username: user.username,
        action: 'login',
        module: 'auth',
        description: `登录失败：账户状态为 ${user.status}`,
        ip: clientIP,
        userAgent: getUserAgent(request),
        status: 'failed',
        errorMsg: '账户已被禁用或锁定'
      })

      return NextResponse.json({
        success: false,
        error: '账户已被禁用或锁定，请联系管理员'
      }, { status: 403 })
    }

    // 验证密码
    if (!verifyPassword(password, user.password)) {
      const info = recordFailure(lockoutKey)
      const remaining = MAX_ATTEMPTS - info.attempts

      await logOperation({
        userId: user.id,
        username: user.username,
        action: 'login',
        module: 'auth',
        description: '登录失败：密码错误',
        ip: clientIP,
        userAgent: getUserAgent(request),
        status: 'failed',
        errorMsg: '密码错误'
      })

      if (remaining <= 0) {
        return NextResponse.json({
          success: false,
          error: '账户已锁定，请 15 分钟后重试',
          locked: true,
          lockedUntil: info.lockedUntil,
          remainingMinutes: 15
        }, { status: 429 })
      }

      return NextResponse.json({
        success: false,
        error: `密码错误，还剩 ${remaining} 次尝试机会`,
        remainingAttempts: remaining
      }, { status: 401 })
    }

    // 登录成功，重置失败计数
    resetAttempts(lockoutKey)

    // 创建会话
    const token = createSession(user.id)

    // 更新用户登录信息
    await db.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: clientIP,
        loginCount: { increment: 1 }
      }
    })

    // 记录登录日志
    await logOperation({
      userId: user.id,
      username: user.username,
      action: 'login',
      module: 'auth',
      description: '用户登录成功',
      ip: clientIP,
      userAgent: getUserAgent(request),
      status: 'success'
    })

    // 返回用户信息和token
    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          phone: user.phone,
          department: user.department,
          role: user.role
        }
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({
      success: false,
      error: '登录失败，请稍后重试'
    }, { status: 500 })
  }
}
