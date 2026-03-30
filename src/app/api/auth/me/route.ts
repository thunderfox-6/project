import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth/index'

// 获取当前登录用户信息
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '未登录或会话已过期'
      }, { status: 401 })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        department: user.department,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Get user info error:', error)
    return NextResponse.json({
      success: false,
      error: '获取用户信息失败'
    }, { status: 500 })
  }
}
