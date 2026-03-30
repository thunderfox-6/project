import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/index'

// GET - 获取桥梁统计数据
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'bridge:read')
  if (auth.error) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const bridgeId = searchParams.get('bridgeId')

    if (!bridgeId) {
      return NextResponse.json({ error: '缺少桥梁ID' }, { status: 400 })
    }

    const bridge = await db.bridge.findUnique({
      where: { id: bridgeId },
      include: {
        spans: {
          orderBy: { spanNumber: 'asc' },
          include: {
            walkingBoards: true
          }
        }
      }
    })

    if (!bridge) {
      return NextResponse.json({ error: '桥梁不存在' }, { status: 404 })
    }

    // 统计数据
    const stats = {
      bridgeName: bridge.name,
      bridgeCode: bridge.bridgeCode,
      totalSpans: bridge.totalSpans,
      totalBoards: 0,
      normalBoards: 0,
      minorDamageBoards: 0,
      severeDamageBoards: 0,
      fractureRiskBoards: 0,
      replacedBoards: 0,
      missingBoards: 0,
      damageRate: 0,
      highRiskRate: 0,
      spanStats: [] as Array<{
        spanNumber: number
        spanLength: number
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
      }>
    }

    // 按桥孔统计
    for (const span of bridge.spans) {
      const spanStat = {
        spanNumber: span.spanNumber,
        spanLength: span.spanLength,
        totalBoards: span.walkingBoards.length,
        normalBoards: 0,
        minorDamageBoards: 0,
        severeDamageBoards: 0,
        fractureRiskBoards: 0,
        replacedBoards: 0,
        missingBoards: 0,
        damageRate: 0,
        highRiskRate: 0,
        hasHighRisk: false
      }

      for (const board of span.walkingBoards) {
        stats.totalBoards++
        spanStat.totalBoards++

        switch (board.status) {
          case 'normal':
            stats.normalBoards++
            spanStat.normalBoards++
            break
          case 'minor_damage':
            stats.minorDamageBoards++
            spanStat.minorDamageBoards++
            break
          case 'severe_damage':
            stats.severeDamageBoards++
            spanStat.severeDamageBoards++
            break
          case 'fracture_risk':
            stats.fractureRiskBoards++
            spanStat.fractureRiskBoards++
            break
          case 'replaced':
            stats.replacedBoards++
            spanStat.replacedBoards++
            break
          case 'missing':
            stats.missingBoards++
            spanStat.missingBoards++
            break
        }
      }

      // 计算损坏率 (不包括已更换和缺失的)
      const effectiveBoards = spanStat.totalBoards - spanStat.replacedBoards - spanStat.missingBoards
      if (effectiveBoards > 0) {
        const damagedBoards = spanStat.minorDamageBoards + spanStat.severeDamageBoards + spanStat.fractureRiskBoards
        spanStat.damageRate = Math.round((damagedBoards / effectiveBoards) * 100)
        spanStat.highRiskRate = Math.round((spanStat.fractureRiskBoards / effectiveBoards) * 100)
      }

      spanStat.hasHighRisk = spanStat.fractureRiskBoards > 0 || spanStat.severeDamageBoards > 0
      stats.spanStats.push(spanStat)
    }

    // 计算总体损坏率
    const effectiveTotal = stats.totalBoards - stats.replacedBoards - stats.missingBoards
    if (effectiveTotal > 0) {
      const damagedTotal = stats.minorDamageBoards + stats.severeDamageBoards + stats.fractureRiskBoards
      stats.damageRate = Math.round((damagedTotal / effectiveTotal) * 100)
      stats.highRiskRate = Math.round((stats.fractureRiskBoards / effectiveTotal) * 100)
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('获取统计数据失败:', error)
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 })
  }
}
