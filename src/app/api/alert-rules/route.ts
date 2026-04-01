import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/index'

/**
 * GET /api/alert-rules - 列出所有预警规则
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'board:read')
    if (auth.error) return auth.error

    const rules = await db.alertRule.findMany({
      orderBy: { priority: 'asc' },
    })

    // 统计每条规则关联的活跃告警数
    const alertCounts = await db.alertRecord.groupBy({
      by: ['ruleId'],
      where: { status: 'active' },
      _count: true,
    })

    const countMap = new Map(alertCounts.map((a) => [a.ruleId, a._count]))

    return NextResponse.json({
      success: true,
      data: rules.map((r) => ({
        ...r,
        activeAlertCount: countMap.get(r.id) || 0,
      })),
    })
  } catch (error) {
    console.error('获取预警规则失败:', error)
    return NextResponse.json({ error: '获取预警规则失败' }, { status: 500 })
  }
}

/**
 * PUT /api/alert-rules - 更新规则（仅管理员）
 *
 * Body:
 *   id      - 规则ID
 *   enabled - 是否启用
 *   severity (可选) - 严重等级
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'admin')
    if (auth.error) return auth.error

    const body = await request.json()
    const { id, enabled, severity } = body

    if (!id) {
      return NextResponse.json({ error: '缺少规则ID' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (enabled !== undefined) updateData.enabled = enabled
    if (severity) updateData.severity = severity

    const rule = await db.alertRule.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: rule })
  } catch (error) {
    console.error('更新预警规则失败:', error)
    return NextResponse.json({ error: '更新预警规则失败' }, { status: 500 })
  }
}
