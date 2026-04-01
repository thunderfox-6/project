import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/index'

/**
 * GET /api/alerts
 *
 * 查询告警记录，支持过滤、分页、统计。
 *
 * 参数:
 *   severity (可选) - critical | warning | info
 *   status (可选)   - active | resolved | dismissed (默认 active)
 *   bridgeId (可选) - 桥梁ID
 *   page (可选)     - 页码，默认 1
 *   pageSize (可选) - 每页条数，默认 50
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'board:read')
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity')
    const status = searchParams.get('status') || 'active'
    const bridgeId = searchParams.get('bridgeId')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50', 10), 100)

    const where: Record<string, unknown> = {}
    if (severity) where.severity = severity
    if (status !== 'all') where.status = status
    if (bridgeId) where.bridgeId = bridgeId

    // 统计摘要
    const [activeCritical, activeWarning, activeInfo] = await Promise.all([
      db.alertRecord.count({ where: { status: 'active', severity: 'critical' } }),
      db.alertRecord.count({ where: { status: 'active', severity: 'warning' } }),
      db.alertRecord.count({ where: { status: 'active', severity: 'info' } }),
    ])
    const summary = {
      activeCritical,
      activeWarning,
      activeInfo,
      activeTotal: activeCritical + activeWarning + activeInfo,
    }

    // 分页查询
    const total = await db.alertRecord.count({ where })
    const totalPages = Math.ceil(total / pageSize)

    const data = await db.alertRecord.findMany({
      where,
      include: {
        rule: { select: { name: true, scope: true } },
      },
      orderBy: [
        { severity: 'desc' }, // critical > warning > info
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, pageSize, total, totalPages },
      summary,
    })
  } catch (error) {
    console.error('获取告警记录失败:', error)
    return NextResponse.json({ error: '获取告警记录失败' }, { status: 500 })
  }
}

/**
 * PUT /api/alerts
 *
 * 解决或忽略告警。
 *
 * Body:
 *   id          - 告警ID
 *   status      - resolved | dismissed
 *   resolveNote (可选) - 解决说明
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'board:write')
    if (auth.error) return auth.error

    const body = await request.json()
    const { id, status, resolveNote } = body

    if (!id || !status || !['resolved', 'dismissed'].includes(status)) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 })
    }

    const alert = await db.alertRecord.update({
      where: { id },
      data: {
        status,
        resolvedBy: auth.user?.username || 'unknown',
        resolvedAt: new Date(),
        resolveNote: resolveNote || null,
      },
    })

    return NextResponse.json({ success: true, data: alert })
  } catch (error) {
    console.error('更新告警状态失败:', error)
    return NextResponse.json({ error: '更新告警状态失败' }, { status: 500 })
  }
}
