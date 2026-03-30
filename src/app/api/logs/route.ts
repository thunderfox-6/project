import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest, hasPermission } from '@/lib/auth/index'

// 获取操作日志列表
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '未登录或会话已过期'
      }, { status: 401 })
    }
    
    // 检查权限 - admin 或有 log:read 权限的用户可以查看
    if (user.role !== 'admin' && !hasPermission(user.role, 'log:read')) {
      return NextResponse.json({
        success: false,
        error: '没有权限查看操作日志'
      }, { status: 403 })
    }
    
    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '30') || 30))
    const action = searchParams.get('action')
    const module = searchParams.get('module')
    const username = searchParams.get('username')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // 构建查询条件
    const where: Record<string, unknown> = {}
    
    if (action && action !== 'all') {
      where.action = action
    }
    
    if (module && module !== 'all') {
      where.module = module
    }
    
    if (username) {
      where.username = {
        contains: username
      }
    }
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt = {
          ...where.createdAt as object,
          gte: new Date(startDate)
        }
      }
      if (endDate) {
        // 结束日期包含当天全天
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt = {
          ...where.createdAt as object,
          lte: end
        }
      }
    }
    
    // 计算总数
    const total = await db.operationLog.count({ where })
    const totalPages = Math.ceil(total / pageSize)
    
    // 获取日志列表
    const logs = await db.operationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        userId: true,
        username: true,
        action: true,
        module: true,
        targetId: true,
        targetName: true,
        description: true,
        oldValue: true,
        newValue: true,
        ip: true,
        status: true,
        createdAt: true
      }
    })
    
    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    })
  } catch (error) {
    console.error('Get logs error:', error)
    return NextResponse.json({
      success: false,
      error: '获取操作日志失败'
    }, { status: 500 })
  }
}
