import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatCompletion, type AIConfig, type ChatMessage } from '@/lib/ai-client'
import { requireAuth } from '@/lib/auth/index'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'ai:use')
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { bridgeId, config } = body as { bridgeId: string; config?: AIConfig }

    if (!bridgeId) {
      return NextResponse.json({ error: '缺少桥梁ID' }, { status: 400 })
    }

    if (!config?.apiKey) {
      return NextResponse.json({ error: '请先在AI模型设置中配置API密钥' }, { status: 400 })
    }

    // 获取桥梁和步行板数据
    const bridge = await db.bridge.findUnique({
      where: { id: bridgeId },
      include: {
        spans: {
          orderBy: { spanNumber: 'asc' },
          include: {
            walkingBoards: {
              orderBy: [{ position: 'asc' }, { columnIndex: 'asc' }, { boardNumber: 'asc' }]
            }
          }
        }
      }
    })

    if (!bridge) {
      return NextResponse.json({ error: '桥梁不存在' }, { status: 404 })
    }

    // 统计数据
    const stats = {
      totalBoards: 0,
      normal: 0,
      minorDamage: 0,
      severeDamage: 0,
      fractureRisk: 0,
      replaced: 0,
      missing: 0
    }

    // 各孔详情
    const spanDetails: {
      spanNumber: number
      total: number
      risk: number
      damage: number
      hasShelter: boolean
      shelterMaxPeople: number
    }[] = []

    // 统计各状态数量
    bridge.spans.forEach(span => {
      const spanStats = { total: 0, risk: 0, damage: 0 }

      span.walkingBoards.forEach(board => {
        stats.totalBoards++
        spanStats.total++

        switch(board.status) {
          case 'normal':
            stats.normal++
            break
          case 'minor_damage':
            stats.minorDamage++
            spanStats.damage++
            break
          case 'severe_damage':
            stats.severeDamage++
            spanStats.damage++
            break
          case 'fracture_risk':
            stats.fractureRisk++
            spanStats.risk++
            break
          case 'replaced':
            stats.replaced++
            break
          case 'missing':
            stats.missing++
            break
        }
      })

      spanDetails.push({
        spanNumber: span.spanNumber,
        total: spanStats.total,
        risk: spanStats.risk,
        damage: spanStats.damage,
        hasShelter: span.shelterSide !== 'none',
        shelterMaxPeople: span.shelterMaxPeople
      })
    })

    // 计算百分比
    const normalRate = stats.totalBoards > 0 ? ((stats.normal / stats.totalBoards) * 100).toFixed(1) : '0'
    const minorDamageRate = stats.totalBoards > 0 ? ((stats.minorDamage / stats.totalBoards) * 100).toFixed(1) : '0'
    const severeDamageRate = stats.totalBoards > 0 ? ((stats.severeDamage / stats.totalBoards) * 100).toFixed(1) : '0'
    const fractureRiskRate = stats.totalBoards > 0 ? ((stats.fractureRisk / stats.totalBoards) * 100).toFixed(1) : '0'

    // 构建分析提示
    const analysisPrompt = `你是一位资深的铁路桥梁安全专家。请根据以下桥梁步行板数据，生成一份专业的安全分析报告。

## 桥梁基本信息
- 桥梁名称：${bridge.name}
- 桥梁编号：${bridge.bridgeCode}
- 位置：${bridge.location || '未指定'}
- 线路：${bridge.lineName || '未指定'}
- 总孔数：${bridge.totalSpans}

## 步行板状态统计
- 总步行板数：${stats.totalBoards}
- 正常：${stats.normal}块 (${normalRate}%)
- 轻微损坏：${stats.minorDamage}块 (${minorDamageRate}%)
- 严重损坏：${stats.severeDamage}块 (${severeDamageRate}%)
- 断裂风险：${stats.fractureRisk}块 (${fractureRiskRate}%)
- 已更换：${stats.replaced}块
- 缺失：${stats.missing}块

## 各孔详情
${spanDetails.map(span => {
  return `- 第${span.spanNumber}孔：共${span.total}块，断裂风险${span.risk}块，损坏${span.damage}块${span.hasShelter ? '，有避车台(限员' + span.shelterMaxPeople + '人)' : ''}`
}).join('\n')}

请提供以下内容：
1. **安全等级评估**（根据损坏情况给出：安全/注意/警告/危险四个等级之一）
2. **主要风险点分析**（列出发现的主要安全隐患）
3. **各孔安全建议**（针对有问题的孔位给出具体建议）
4. **优先整改建议**（列出最需要立即处理的问题）
5. **作业注意事项**（提醒作业人员需要注意的安全事项）

请用专业但易懂的语言撰写，适合一线作业人员阅读。使用Markdown格式输出。`

    // 调用AI分析
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一位资深的铁路桥梁安全专家，专门负责步行板安全评估。你的分析要专业、准确、实用，语言要简洁明了，适合一线作业人员理解。请使用Markdown格式输出分析报告。'
      },
      { role: 'user', content: analysisPrompt }
    ]

    const result = await chatCompletion(config, messages)
    const analysis = result.content

    return NextResponse.json({
      success: true,
      analysis,
      stats: {
        ...stats,
        normalRate,
        minorDamageRate,
        severeDamageRate,
        fractureRiskRate
      },
      spanDetails,
      bridge: {
        name: bridge.name,
        bridgeCode: bridge.bridgeCode,
        location: bridge.location,
        lineName: bridge.lineName,
        totalSpans: bridge.totalSpans
      }
    })

  } catch (error) {
    console.error('AI分析错误:', error)
    const message = error instanceof Error ? error.message : '分析失败，请稍后重试'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
