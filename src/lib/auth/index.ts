import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createSession, getSession, deleteSession } from '@/lib/session-store'

// 密码哈希
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

// 验证密码
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return hash === verifyHash
}

// 生成会话token
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// 用户角色权限配置
export const ROLE_PERMISSIONS = {
  admin: {
    label: '系统管理员',
    permissions: ['*'],
    description: '拥有系统所有权限'
  },
  manager: {
    label: '桥梁管理者',
    permissions: ['bridge:read', 'bridge:write', 'bridge:delete', 'span:read', 'span:write', 'board:read', 'board:write', 'log:read', 'data:import', 'data:export', 'ai:use'],
    description: '可以管理桥梁数据和日志'
  },
  user: {
    label: '普通用户',
    permissions: ['bridge:read', 'span:read', 'board:read'],
    description: '只能查看数据，不能编辑'
  },
  viewer: {
    label: '只读用户',
    permissions: ['bridge:read', 'span:read', 'board:read'],
    description: '只能查看数据'
  }
} as const

export type Role = keyof typeof ROLE_PERMISSIONS

// 检查权限
export function hasPermission(role: string, permission: string): boolean {
  const roleConfig = ROLE_PERMISSIONS[role as Role]
  if (!roleConfig) return false
  const perms = roleConfig.permissions as readonly string[]
  if (perms.includes('*')) return true
  return perms.includes(permission)
}

/**
 * 统一权限校验：认证 + 权限检查，失败时直接返回错误响应
 * @param request - Next.js Request 对象
 * @param permission - 需要的权限（如 'bridge:read'），不传则只检查登录状态
 * @returns { user } 认证和权限校验通过时返回用户对象
 * @returns { error } 校验失败时返回 NextResponse 错误响应（由调用方 return）
 */
export async function requireAuth(
  request: Request,
  permission?: string
): Promise<{ user: any } | { error: NextResponse }> {
  const user = await authenticateRequest(request)
  if (!user) {
    return { error: NextResponse.json({ success: false, error: '未登录或会话已过期' }, { status: 401 }) }
  }
  if (permission && !hasPermission(user.role, permission)) {
    return { error: NextResponse.json({ success: false, error: '没有权限执行此操作' }, { status: 403 }) }
  }
  return { user }
}

// 获取客户端IP
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

// 获取User-Agent
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}

// 记录操作日志
export async function logOperation(params: {
  userId?: string
  username?: string
  action: string
  module: string
  targetId?: string
  targetName?: string
  description: string
  oldValue?: string
  newValue?: string
  ip?: string
  userAgent?: string
  status?: 'success' | 'failed'
  errorMsg?: string
}) {
  try {
    await db.operationLog.create({
      data: {
        userId: params.userId || null,
        username: params.username || null,
        action: params.action,
        module: params.module,
        targetId: params.targetId || null,
        targetName: params.targetName || null,
        description: params.description,
        oldValue: params.oldValue || null,
        newValue: params.newValue || null,
        ip: params.ip || null,
        userAgent: params.userAgent || null,
        status: params.status || 'success',
        errorMsg: params.errorMsg || null
      }
    })
  } catch (error) {
    console.error('Failed to log operation:', error)
  }
}

// 创建默认管理员账户
export async function createDefaultAdmin() {
  const existingAdmin = await db.user.findUnique({
    where: { username: 'admin' }
  })
  
  if (!existingAdmin) {
    await db.user.create({
      data: {
        username: 'admin',
        password: hashPassword('admin123'),
        name: '系统管理员',
        role: 'admin',
        status: 'active'
      }
    })
    console.log('Default admin account created: admin / admin123')
  }
}

// createSession, getSession, deleteSession 已迁移至 ./session-store.ts
export { createSession, getSession, deleteSession } from '@/lib/session-store'

// 验证会话并获取用户
export async function authenticateRequest(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token) {
    return null
  }
  
  const session = getSession(token)
  if (!session) {
    return null
  }
  
  const user = await db.user.findUnique({
    where: { id: session.userId }
  })
  
  if (!user || user.status !== 'active') {
    return null
  }
  
  return user
}
