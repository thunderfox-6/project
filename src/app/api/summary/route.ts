import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/index'

// GET - 获取所有桥梁汇总统计数据
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'bridge:read')
  if (auth.error) return auth.error

  try {
    const bridges = await db.bridge.findMany({
      include: {
        spans: {
          include: {
            walkingBoards: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    const summary = {
      totalBridges: bridges.length,
      totalSpans: 0,
      totalBoards: 0,
      normalBoards: 0,
      minorDamageBoards: 0,
      severeDamageBoards: 0,
      fractureRiskBoards: 0,
      replacedBoards: 0,
      missingBoards: 0,
      overallDamageRate: 0,
      overallHighRiskRate: 0,
      highRiskBridges: [] as string[],
      bridgeSummaries: [] as Array<{
        id: string
        name: string
        bridgeCode: string
        lineName: string | null
        location: string | null
        totalSpans: number
        totalBoards: number
        normalBoards: number
        minorDamageBoards: number
        severeDamageBoards: number
        fractureRiskBoards: number
        replacedBoards: number
        missingBoards: number
        damageRate: number
        highRiskRate: number
        hasHighRisk: boolean
        lastInspected: string | null
      }>
    }

    for (const bridge of bridges) {
      const bridgeSummary = {
        id: bridge.id,
        name: bridge.name,
        bridgeCode: bridge.bridgeCode,
        lineName: bridge.lineName,
        location: bridge.location,
        totalSpans: bridge.spans.length,
        totalBoards: 0,
        normalBoards: 0,
        minorDamageBoards: 0,
        severeDamageBoards: 0,
        fractureRiskBoards: 0,
        replacedBoards: 0,
        missingBoards: 0,
        damageRate: 0,
        highRiskRate: 0,
        hasHighRisk: false,
        lastInspected: null as string | null
      }

      const inspectedDates: Date[] = []

      for (const span of bridge.spans) {
        summary.totalSpans++
        
        for (const board of span.walkingBoards) {
          summary.totalBoards++
          bridgeSummary.totalBoards++

          switch (board.status) {
            case 'normal':
              summary.normalBoards++
              bridgeSummary.normalBoards++
              break
            case 'minor_damage':
              summary.minorDamageBoards++
              bridgeSummary.minorDamageBoards++
              break
            case 'severe_damage':
              summary.severeDamageBoards++
              bridgeSummary.severeDamageBoards++
              break
            case 'fracture_risk':
              summary.fractureRiskBoards++
              bridgeSummary.fractureRiskBoards++
              break
            case 'replaced':
              summary.replacedBoards++
              bridgeSummary.replacedBoards++
              break
            case 'missing':
              summary.missingBoards++
              bridgeSummary.missingBoards++
              break
          }

          if (board.inspectedAt) {
            inspectedDates.push(new Date(board.inspectedAt))
          }
        }
      }

      // 计算损坏率
      const effectiveBoards = bridgeSummary.totalBoards - bridgeSummary.replacedBoards - bridgeSummary.missingBoards
      if (effectiveBoards > 0) {
        const damagedBoards = bridgeSummary.minorDamageBoards + bridgeSummary.severeDamageBoards + bridgeSummary.fractureRiskBoards
        bridgeSummary.damageRate = Math.round((damagedBoards / effectiveBoards) * 100)
        bridgeSummary.highRiskRate = Math.round((bridgeSummary.fractureRiskBoards / effectiveBoards) * 100)
      }

      bridgeSummary.hasHighRisk = bridgeSummary.fractureRiskBoards > 0 || bridgeSummary.severeDamageBoards > 0

      if (bridgeSummary.hasHighRisk) {
        summary.highRiskBridges.push(bridge.name)
      }

      // 最后检查时间
      if (inspectedDates.length > 0) {
        const latest = new Date(inspectedDates.reduce((max, d) => Math.max(max, d.getTime()), 0))
        bridgeSummary.lastInspected = latest.toLocaleString('zh-CN')
      }

      summary.bridgeSummaries.push(bridgeSummary)
    }

    // 计算总体损坏率
    const effectiveTotal = summary.totalBoards - summary.replacedBoards - summary.missingBoards
    if (effectiveTotal > 0) {
      const damagedTotal = summary.minorDamageBoards + summary.severeDamageBoards + summary.fractureRiskBoards
      summary.overallDamageRate = Math.round((damagedTotal / effectiveTotal) * 100)
      summary.overallHighRiskRate = Math.round((summary.fractureRiskBoards / effectiveTotal) * 100)
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('获取汇总数据失败:', error)
    return NextResponse.json({ error: '获取汇总数据失败' }, { status: 500 })
  }
}
