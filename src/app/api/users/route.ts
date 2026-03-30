import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { 
  authenticateRequest, 
  hasPermission, 
  hashPassword,
  logOperation,
  getClientIP,
  getUserAgent,
  ROLE_PERMISSIONS
} from '@/lib/auth/index'

// 获取用户列表（需要管理员权限）
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '未登录或会话已过期'
      }, { status: 401 })
    }
    
    if (!hasPermission(user.role, 'user:read') && user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: '没有权限执行此操作'
      }, { status: 403 })
    }
    
    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        department: true,
        role: true,
        status: true,
        lastLoginAt: true,
        lastLoginIp: true,
        loginCount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({
      success: true,
      data: users
    })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({
      success: false,
      error: '获取用户列表失败'
    }, { status: 500 })
  }
}

// 创建新用户（需要管理员权限）
export async function POST(request: NextRequest) {
  try {
    const currentUser = await authenticateRequest(request)
    
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: '未登录或会话已过期'
      }, { status: 401 })
    }
    
    if (currentUser.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: '只有管理员可以创建用户'
      }, { status: 403 })
    }
    
    const body = await request.json()
    const { username, password, name, email, phone, department, role, status } = body

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: '用户名和密码为必填项'
      }, { status: 400 })
    }

    // 检查用户名是否已存在
    const existingUser = await db.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: '用户名已存在'
      }, { status: 400 })
    }

    // 空字符串转为 null，避免唯一约束冲突
    const cleanEmail = email?.trim() || null
    const cleanPhone = phone?.trim() || null
    const cleanName = name?.trim() || null
    const cleanDepartment = department?.trim() || null

    // 创建用户
    const newUser = await db.user.create({
      data: {
        username,
        password: hashPassword(password),
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        department: cleanDepartment,
        role: role || 'user',
        status: status || 'active'
      }
    })
    
    // 记录操作日志
    await logOperation({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'create',
      module: 'user',
      targetId: newUser.id,
      targetName: username,
      description: `创建用户: ${username}`,
      newValue: JSON.stringify({ username, name, email, department, role }),
      ip: getClientIP(request),
      userAgent: getUserAgent(request)
    })
    
    return NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    })
  } catch (error) {
    console.error('Create user error:', error)
    const msg = error instanceof Error ? error.message : '创建用户失败'
    return NextResponse.json({
      success: false,
      error: msg
    }, { status: 500 })
  }
}

// 更新用户信息
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await authenticateRequest(request)
    
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: '未登录或会话已过期'
      }, { status: 401 })
    }
    
    const body = await request.json()
    const { id, username, password, name, email, phone, department, role, status } = body
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: '用户ID为必填项'
      }, { status: 400 })
    }
    
    // 只有管理员可以修改其他用户信息
    if (currentUser.role !== 'admin' && currentUser.id !== id) {
      return NextResponse.json({
        success: false,
        error: '没有权限修改此用户'
      }, { status: 403 })
    }
    
    // 获取原用户信息
    const oldUser = await db.user.findUnique({
      where: { id }
    })
    
    if (!oldUser) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 })
    }
    
    // 构建更新数据（空字符串转为 null）
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name?.trim() || null
    if (email !== undefined) updateData.email = email?.trim() || null
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (department !== undefined) updateData.department = department?.trim() || null
    if (password) updateData.password = hashPassword(password)
    
    // 只有管理员可以修改角色和状态
    if (currentUser.role === 'admin') {
      if (role !== undefined) updateData.role = role
      if (status !== undefined) updateData.status = status
    }
    
    // 更新用户
    const updatedUser = await db.user.update({
      where: { id },
      data: updateData
    })
    
    // 记录操作日志
    await logOperation({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'update',
      module: 'user',
      targetId: id,
      targetName: oldUser.username,
      description: `更新用户信息: ${oldUser.username}`,
      oldValue: JSON.stringify({ name: oldUser.name, email: oldUser.email, role: oldUser.role, status: oldUser.status }),
      newValue: JSON.stringify(updateData),
      ip: getClientIP(request),
      userAgent: getUserAgent(request)
    })
    
    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      }
    })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({
      success: false,
      error: '更新用户失败'
    }, { status: 500 })
  }
}

// 删除用户
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await authenticateRequest(request)
    
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: '未登录或会话已过期'
      }, { status: 401 })
    }
    
    if (currentUser.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: '只有管理员可以删除用户'
      }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: '用户ID为必填项'
      }, { status: 400 })
    }
    
    // 不能删除自己
    if (id === currentUser.id) {
      return NextResponse.json({
        success: false,
        error: '不能删除自己的账户'
      }, { status: 400 })
    }
    
    // 获取用户信息
    const userToDelete = await db.user.findUnique({
      where: { id }
    })
    
    if (!userToDelete) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 })
    }
    
    // 删除用户
    await db.user.delete({
      where: { id }
    })
    
    // 记录操作日志
    await logOperation({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'delete',
      module: 'user',
      targetId: id,
      targetName: userToDelete.username,
      description: `删除用户: ${userToDelete.username}`,
      oldValue: JSON.stringify({ username: userToDelete.username, name: userToDelete.name }),
      ip: getClientIP(request),
      userAgent: getUserAgent(request)
    })
    
    return NextResponse.json({
      success: true,
      message: '用户已删除'
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({
      success: false,
      error: '删除用户失败'
    }, { status: 500 })
  }
}

// 获取角色权限配置
export async function OPTIONS() {
  return NextResponse.json({
    success: true,
    data: ROLE_PERMISSIONS
  })
}
