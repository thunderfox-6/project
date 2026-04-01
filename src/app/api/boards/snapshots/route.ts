import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/index'

/**
 * GET /api/boards/snapshots
 *
 * 查询步行板状态历史快照，支持按月/周/日聚合用于趋势图表。
 *
 * 参数:
 *   bridgeId (必填)  - 桥梁ID
 *   spanId (可选)     - 孔位ID
 *   boardId (可选)    - 步行板ID
 *   startDate (可选)  - 开始日期 YYYY-MM-DD
 *   endDate (可选)    - 结束日期 YYYY-MM-DD
 *   groupBy (可选)    - month | week | day (默认 month)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'board:read')
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const bridgeId = searchParams.get('bridgeId')
    const spanId = searchParams.get('spanId')
    const boardId = searchParams.get('boardId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const groupBy = searchParams.get('groupBy') || 'month'

    if (!bridgeId) {
      return NextResponse.json({ error: '缺少 bridgeId 参数' }, { status: 400 })
    }

    // 构建查询条件
    const where: Record<string, unknown> = { bridgeId }
    if (spanId) where.spanId = spanId
    if (boardId) where.boardId = boardId
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate + 'T23:59:59')
    }

    // 获取快照数据
    const snapshots = await db.boardStatusSnapshot.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })

    if (snapshots.length === 0) {
      return NextResponse.json([])
    }

    // 按时间分组聚合
    const grouped = new Map<string, {
      total: number
      normal: number
      minorDamage: number
      severeDamage: number
      fractureRisk: number
      missing: number
      replaced: number
    }>()

    for (const s of snapshots) {
      let key: string
      const d = new Date(s.createdAt)

      if (groupBy === 'day') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      } else if (groupBy === 'week') {
        // ISO 周号
        const oneJan = new Date(d.getFullYear(), 0, 1)
        const weekNum = Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7)
        key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
      } else {
        // month (默认)
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      }

      if (!grouped.has(key)) {
        grouped.set(key, { total: 0, normal: 0, minorDamage: 0, severeDamage: 0, fractureRisk: 0, missing: 0, replaced: 0 })
      }
      const g = grouped.get(key)!
      g.total++
      switch (s.status) {
        case 'normal': g.normal++; break
        case 'minor_damage': g.minorDamage++; break
        case 'severe_damage': g.severeDamage++; break
        case 'fracture_risk': g.fractureRisk++; break
        case 'missing': g.missing++; break
        case 'replaced': g.replaced++; break
      }
    }

    // 转换为趋势数据点
    const trendData = Array.from(grouped.entries()).map(([date, counts]) => {
      const effective = counts.total - counts.replaced - counts.missing
      const damageRate = effective > 0
        ? Math.round(((counts.minorDamage + counts.severeDamage + counts.fractureRisk) / effective) * 100 * 100) / 100
        : 0
      const highRiskRate = effective > 0
        ? Math.round((counts.fractureRisk / effective) * 100 * 100) / 100
        : 0

      return {
        date,
        totalBoards: counts.total,
        normalBoards: counts.normal,
        minorDamageBoards: counts.minorDamage,
        severeDamageBoards: counts.severeDamage,
        fractureRiskBoards: counts.fractureRisk,
        missingBoards: counts.missing,
        replacedBoards: counts.replaced,
        damageRate,
        highRiskRate,
      }
    })

    return NextResponse.json(trendData)
  } catch (error) {
    console.error('获取快照数据失败:', error)
    return NextResponse.json({ error: '获取快照数据失败' }, { status: 500 })
  }
}
