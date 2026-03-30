import { NextRequest, NextResponse } from 'next/server'
import { deleteSession, authenticateRequest, logOperation, getClientIP, getUserAgent } from '@/lib/auth/index'

// 登出接口
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    
    if (user) {
      const authHeader = request.headers.get('authorization')
      const token = authHeader?.replace('Bearer ', '')
      
      if (token) {
        deleteSession(token)
      }
      
      // 记录登出日志
      await logOperation({
        userId: user.id,
        username: user.username,
        action: 'logout',
        module: 'auth',
        description: '用户登出',
        ip: getClientIP(request),
        userAgent: getUserAgent(request),
        status: 'success'
      })
    }
    
    return NextResponse.json({
      success: true,
      message: '登出成功'
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({
      success: true,
      message: '登出成功'
    })
  }
}
