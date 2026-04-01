'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
} from 'recharts'

interface BridgeStats {
  bridgeName: string
  bridgeCode: string
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
}

interface TrendAnalysisProps {
  bridgeStats: BridgeStats | null
  bridgeId: string | null
  theme: 'day' | 'night'
}

/** Generate simulated monthly trend data based on current stats. */
function generateTrendData(stats: BridgeStats) {
  const months: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    )
  }

  const currentDamage = stats.damageRate * 100
  const currentHighRisk = stats.highRiskRate * 100
  const total = stats.totalBoards

  // Simulate a gradual increase towards current values over 6 months
  const data = months.map((month, idx) => {
    const progress = (idx + 1) / 6
    const noise = (Math.random() - 0.5) * 2
    const damageRate = Math.max(0, +(currentDamage * progress * 0.7 + noise + currentDamage * 0.3 * (1 - progress)).toFixed(1))
    const highRiskRate = Math.max(0, +(currentHighRisk * progress * 0.6 + noise * 0.5 + currentHighRisk * 0.4 * (1 - progress)).toFixed(1))

    const normalPct = Math.max(0, +(100 - damageRate - highRiskRate).toFixed(1))
    const damagePct = +damageRate.toFixed(1)
    const highRiskPct = +highRiskRate.toFixed(1)

    return {
      month,
      damageRate,
      highRiskRate,
      normalRate: normalPct,
      normal: Math.round((normalPct / 100) * total),
      minorDamage: Math.round((damagePct / 100) * total * 0.6),
      severeDamage: Math.round((damagePct / 100) * total * 0.3),
      fractureRisk: Math.round((highRiskPct / 100) * total),
    }
  })

  return data
}

/** Simple linear regression to project future damage rate. */
function projectFuture(data: { damageRate: number }[]) {
  const n = data.length
  if (n < 2) return { nextMonth: data[data.length - 1]?.damageRate ?? 0, monthAfter: data[data.length - 1]?.damageRate ?? 0, trend: 'stable' as const }

  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0

  data.forEach((d, i) => {
    sumX += i
    sumY += d.damageRate
    sumXY += i * d.damageRate
    sumXX += i * i
  })

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const nextMonth = slope * n + intercept
  const monthAfter = slope * (n + 1) + intercept

  return {
    nextMonth: Math.max(0, +nextMonth.toFixed(1)),
    monthAfter: Math.max(0, +monthAfter.toFixed(1)),
    trend: (slope > 0 ? 'up' : slope < 0 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
  }
}

export default function TrendAnalysis({ bridgeStats, bridgeId, theme }: TrendAnalysisProps) {
  const isNight = theme === 'night'

  // 获取真实历史快照数据
  const [realData, setRealData] = useState<any[]>([])
  const [useRealData, setUseRealData] = useState(false)

  useEffect(() => {
    if (!bridgeId) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return

    fetch(`/api/boards/snapshots?bridgeId=${bridgeId}&groupBy=month`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: any[]) => {
        if (data && data.length >= 2) {
          setRealData(data)
          setUseRealData(true)
        }
      })
      .catch(() => {})
  }, [bridgeId])

  const trendData = useMemo(() => {
    if (useRealData && realData.length >= 2) {
      // 使用真实快照数据
      return realData.map((point) => ({
        month: point.date,
        damageRate: point.damageRate,
        highRiskRate: point.highRiskRate,
        normalRate: Math.max(0, 100 - point.damageRate - point.highRiskRate),
        normal: point.normalBoards,
        minorDamage: point.minorDamageBoards,
        severeDamage: point.severeDamageBoards,
        fractureRisk: point.fractureRiskBoards,
      }))
    }
    // 降级为模拟数据
    if (!bridgeStats) return []
    return generateTrendData(bridgeStats)
  }, [bridgeStats, useRealData, realData])

  const projection = useMemo(() => {
    if (trendData.length < 2) return null
    return projectFuture(trendData)
  }, [trendData])

  // Extended data with projections
  const chartDataWithProjection = useMemo(() => {
    if (!bridgeStats || !projection) return trendData

    const now = new Date()
    const futureMonths: string[] = []
    for (let i = 1; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      futureMonths.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      )
    }

    return [
      ...trendData,
      {
        month: futureMonths[0],
        damageRate: projection.nextMonth,
        highRiskRate: null,
        normalRate: null,
        projected: true,
      },
      {
        month: futureMonths[1],
        damageRate: projection.monthAfter,
        highRiskRate: null,
        normalRate: null,
        projected: true,
      },
    ]
  }, [trendData, projection, bridgeStats])

  const textColor = isNight ? '#94a3b8' : '#64748b'
  const gridColor = isNight ? '#334155' : '#e2e8f0'
  const bgColor = isNight ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.9)'

  if (!bridgeStats) {
    return (
      <div
        className={`p-4 rounded-lg border text-center ${
          isNight
            ? 'bg-slate-800/50 border-slate-700 text-slate-400'
            : 'bg-gray-50 border-gray-200 text-gray-500'
        }`}
      >
        请先选择一座桥梁以查看趋势分析
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Damage Rate Trend Line Chart */}
      <div>
        <h4
          className={`text-xs font-semibold mb-2 ${
            isNight ? 'text-cyan-300' : 'text-blue-600'
          }`}
        >
          损坏率趋势 (近6个月)
          {useRealData && (
            <span className={`ml-2 text-[10px] font-normal ${isNight ? 'text-green-400' : 'text-green-600'}`}>
              ● 真实数据
            </span>
          )}
          {!useRealData && bridgeStats && (
            <span className={`ml-2 text-[10px] font-normal ${isNight ? 'text-yellow-400' : 'text-yellow-600'}`}>
              ● 模拟数据
            </span>
          )}
        </h4>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartDataWithProjection}>
            <defs>
              <linearGradient id="damageGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="highRiskGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="month"
              tick={{ fill: textColor, fontSize: 10 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              tick={{ fill: textColor, fontSize: 10 }}
              unit="%"
              width={35}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: bgColor,
                border: `1px solid ${gridColor}`,
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: string | number | Array<string | number>, name: string) => {
                if (value == null) return ['--', name]
                return [`${value}%`, name]
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '10px' }}
            />
            <Area
              type="monotone"
              dataKey="damageRate"
              name="损坏率"
              stroke="#f97316"
              fill="url(#damageGrad)"
              strokeWidth={2}
              dot={{ r: 3 }}
              strokeDasharray="undefined"
            />
            <Area
              type="monotone"
              dataKey="highRiskRate"
              name="高风险率"
              stroke="#ef4444"
              fill="url(#highRiskGrad)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Board Status Distribution Bar Chart */}
      <div>
        <h4
          className={`text-xs font-semibold mb-2 ${
            isNight ? 'text-cyan-300' : 'text-blue-600'
          }`}
        >
          步行板状态分布变化
        </h4>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="month"
              tick={{ fill: textColor, fontSize: 10 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis tick={{ fill: textColor, fontSize: 10 }} width={30} />
            <Tooltip
              contentStyle={{
                backgroundColor: bgColor,
                border: `1px solid ${gridColor}`,
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Bar
              dataKey="normal"
              name="正常"
              stackId="a"
              fill="#22c55e"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="minorDamage"
              name="轻微损坏"
              stackId="a"
              fill="#f59e0b"
            />
            <Bar
              dataKey="severeDamage"
              name="严重损坏"
              stackId="a"
              fill="#f97316"
            />
            <Bar
              dataKey="fractureRisk"
              name="断裂风险"
              stackId="a"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Projection Summary */}
      {projection && (
        <div
          className={`p-3 rounded-lg border text-xs ${
            isNight
              ? 'bg-slate-800/60 border-slate-700'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {projection.trend === 'up' && (
              <span className="text-red-500 font-bold">↑ 上升趋势</span>
            )}
            {projection.trend === 'down' && (
              <span className="text-green-500 font-bold">↓ 下降趋势</span>
            )}
            {projection.trend === 'stable' && (
              <span className="text-yellow-500 font-bold">→ 趋势平稳</span>
            )}
          </div>
          <p className={isNight ? 'text-slate-400' : 'text-gray-600'}>
            预测下月损坏率: <strong>{projection.nextMonth}%</strong>，
            后月: <strong>{projection.monthAfter}%</strong>
          </p>
          <p
            className={`mt-1 ${isNight ? 'text-slate-500' : 'text-gray-400'}`}
          >
            * 基于线性回归的简化预测，仅供参考
          </p>
        </div>
      )}
    </div>
  )
}
