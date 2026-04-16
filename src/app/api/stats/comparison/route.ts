import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/index'

interface AggregatedSnapshot {
  totalBoards: number
  normal: number
  minorDamage: number
  severeDamage: number
  fractureRisk: number
  replaced: number
  missing: number
}

function computeStats(snapshots: { status: string }[]): AggregatedSnapshot {
  const stats: AggregatedSnapshot = {
    totalBoards: snapshots.length,
    normal: 0,
    minorDamage: 0,
    severeDamage: 0,
    fractureRisk: 0,
    replaced: 0,
    missing: 0,
  }
  snapshots.forEach(s => {
    switch (s.status) {
      case 'normal': stats.normal++; break
      case 'minor_damage': stats.minorDamage++; break
      case 'severe_damage': stats.severeDamage++; break
      case 'fracture_risk': stats.fractureRisk++; break
      case 'replaced': stats.replaced++; break
      case 'missing': stats.missing++; break
    }
  })
  return stats
}

function computeDamageRate(stats: AggregatedSnapshot): number {
  const effective = stats.totalBoards - stats.replaced - stats.missing
  if (effective <= 0) return 0
  const damaged = stats.minorDamage + stats.severeDamage + stats.fractureRisk
  return Math.round((damaged / effective) * 10000) / 100
}

function computeHighRiskRate(stats: AggregatedSnapshot): number {
  const effective = stats.totalBoards - stats.replaced - stats.missing
  if (effective <= 0) return 0
  return Math.round((stats.fractureRisk / effective) * 10000) / 100
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'bridge:read')
  if (auth.error) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const bridgeId = searchParams.get('bridgeId')
    const compareType = searchParams.get('compareType') || 'month_over_month' // month_over_month | year_over_year

    if (!bridgeId) {
      return NextResponse.json({ error: '缺少桥梁ID' }, { status: 400 })
    }

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Current period: this month's snapshots
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Previous period
    let prevStart: Date
    let prevEnd: Date
    if (compareType === 'year_over_year') {
      prevStart = new Date(now.getFullYear() - 1, now.getMonth(), 1)
      prevEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0, 23, 59, 59)
    } else {
      // month over month
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    }

    // Query snapshots for both periods
    const [currentSnapshots, prevSnapshots] = await Promise.all([
      db.boardStatusSnapshot.findMany({
        where: {
          bridgeId,
          createdAt: { gte: currentStart, lte: currentEnd },
        },
        select: { status: true },
      }),
      db.boardStatusSnapshot.findMany({
        where: {
          bridgeId,
          createdAt: { gte: prevStart, lte: prevEnd },
        },
        select: { status: true },
      }),
    ])

    // Also get current live board states
    const currentBoards = await db.walkingBoard.findMany({
      where: { span: { bridgeId } },
      select: { status: true },
    })

    const currentStats = currentSnapshots.length > 0
      ? computeStats(currentSnapshots)
      : computeStats(currentBoards.map(b => ({ status: b.status })))

    const prevStats = prevSnapshots.length > 0
      ? computeStats(prevSnapshots)
      : { totalBoards: 0, normal: 0, minorDamage: 0, severeDamage: 0, fractureRisk: 0, replaced: 0, missing: 0 }

    const currentDamageRate = computeDamageRate(currentStats)
    const prevDamageRate = computeDamageRate(prevStats)
    const currentHighRiskRate = computeHighRiskRate(currentStats)
    const prevHighRiskRate = computeHighRiskRate(prevStats)

    // Compute change values
    const damageRateChange = currentDamageRate - prevDamageRate
    const highRiskRateChange = currentHighRiskRate - prevHighRiskRate
    const totalChange = currentStats.totalBoards - prevStats.totalBoards
    const damagedChange = (currentStats.minorDamage + currentStats.severeDamage + currentStats.fractureRisk)
      - (prevStats.minorDamage + prevStats.severeDamage + prevStats.fractureRisk)

    const formatPeriod = (start: Date, end: Date) =>
      `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`

    return NextResponse.json({
      success: true,
      compareType,
      currentPeriod: formatPeriod(currentStart, currentEnd),
      previousPeriod: formatPeriod(prevStart, prevEnd),
      current: {
        ...currentStats,
        damageRate: currentDamageRate,
        highRiskRate: currentHighRiskRate,
      },
      previous: {
        ...prevStats,
        damageRate: prevDamageRate,
        highRiskRate: prevHighRiskRate,
      },
      changes: {
        damageRate: damageRateChange,
        damageRatePercent: prevDamageRate > 0
          ? Math.round((damageRateChange / prevDamageRate) * 10000) / 100
          : (currentDamageRate > 0 ? 100 : 0),
        highRiskRate: highRiskRateChange,
        totalBoards: totalChange,
        damagedBoards: damagedChange,
        trend: damageRateChange > 0 ? 'up' : damageRateChange < 0 ? 'down' : 'stable',
      },
      hasHistoricalData: prevSnapshots.length > 0,
    })
  } catch (error) {
    console.error('对比分析错误:', error)
    return NextResponse.json({ error: '获取对比数据失败' }, { status: 500 })
  }
}
