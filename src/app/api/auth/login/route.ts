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

// 登录接口
export async function POST(request: NextRequest) {
  try {
    // 确保默认管理员存在
    await createDefaultAdmin()
    
    const body = await request.json()
    const { username, password } = body
    
    if (!username || !password) {
      return NextResponse.json({ 
        success: false, 
        error: '请输入用户名和密码' 
      }, { status: 400 })
    }
    
    // 查找用户
    const user = await db.user.findUnique({
      where: { username }
    })
    
    if (!user) {
      await logOperation({
        username,
        action: 'login',
        module: 'auth',
        description: `登录失败：用户名 ${username} 不存在`,
        ip: getClientIP(request),
        userAgent: getUserAgent(request),
        status: 'failed',
        errorMsg: '用户不存在'
      })
      
      return NextResponse.json({ 
        success: false, 
        error: '用户名或密码错误' 
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
        ip: getClientIP(request),
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
      await logOperation({
        userId: user.id,
        username: user.username,
        action: 'login',
        module: 'auth',
        description: '登录失败：密码错误',
        ip: getClientIP(request),
        userAgent: getUserAgent(request),
        status: 'failed',
        errorMsg: '密码错误'
      })
      
      return NextResponse.json({ 
        success: false, 
        error: '用户名或密码错误' 
      }, { status: 401 })
    }
    
    // 创建会话
    const token = createSession(user.id)
    
    // 更新用户登录信息
    await db.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: getClientIP(request),
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
      ip: getClientIP(request),
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
