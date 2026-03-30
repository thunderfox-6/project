import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatCompletion, type AIConfig, type ChatMessage } from '@/lib/ai-client'
import { requireAuth } from '@/lib/auth/index'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'ai:use')
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { message, bridgeId, currentSpanId, history, config } = body as {
      message: string
      bridgeId?: string
      currentSpanId?: string
      history?: ChatMessage[]
      config?: AIConfig
    }

    if (!message) {
      return NextResponse.json({ error: '缺少消息内容' }, { status: 400 })
    }

    if (!config?.apiKey) {
      return NextResponse.json({ error: '请先在AI模型设置中配置API密钥' }, { status: 400 })
    }

    // 获取桥梁数据作为上下文
    let bridge = null
    let currentSpan = null

    if (bridgeId) {
      bridge = await db.bridge.findUnique({
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

      if (currentSpanId && bridge) {
        currentSpan = bridge.spans.find(s => s.id === currentSpanId)
      }
    }

    // 构建步行板状态说明
    const statusDescriptions = `
- normal: 正常状态，无损坏
- minor_damage: 轻微损坏，如小裂缝、轻微磨损
- severe_damage: 严重损坏，如大裂缝、明显变形
- fracture_risk: 断裂风险，存在断裂危险，禁止通行
- replaced: 已更换新板
- missing: 缺失`

    // 构建当前孔的步行板详情
    let currentSpanDetails = ''
    if (currentSpan) {
      const upstream = currentSpan.walkingBoards.filter(b => b.position === 'upstream')
      const downstream = currentSpan.walkingBoards.filter(b => b.position === 'downstream')
      const shelter = currentSpan.walkingBoards.filter(b => b.position === 'shelter_left' || b.position === 'shelter_right')

      currentSpanDetails = `
当前孔详情（第${currentSpan.spanNumber}孔）：
- 上行步行板：${upstream.length}块
- 下行步行板：${downstream.length}块
${currentSpan.shelterSide !== 'none' ? `- 避车台：${shelter.length}块，限员${currentSpan.shelterMaxPeople}人` : ''}

步行板状态列表：
${currentSpan.walkingBoards.slice(0, 20).map(b => {
  const posLabel = b.position === 'upstream' ? '上行' : b.position === 'downstream' ? '下行' : '避车台'
  return `  ${posLabel} 第${b.columnIndex}列 ${b.boardNumber}号: ${b.status}${b.damageDesc ? ` (${b.damageDesc})` : ''}`
}).join('\n')}
${currentSpan.walkingBoards.length > 20 ? `... 共${currentSpan.walkingBoards.length}块` : ''}`
    }

    // 构建系统提示
    const systemPrompt = `你是一位铁路桥梁步行板管理AI助手。你可以帮助用户：
1. 查询和解释步行板状态
2. 帮助修改步行板状态（需要用户确认）
3. 提供安全建议和风险分析
4. 回答关于桥梁和步行板的问题

${bridge ? `当前桥梁信息：
- 名称：${bridge.name}
- 编号：${bridge.bridgeCode}
- 位置：${bridge.location || '未指定'}
- 线路：${bridge.lineName || '未指定'}
- 总孔数：${bridge.totalSpans}` : '当前没有选择桥梁。'}

${currentSpanDetails}

步行板状态说明：${statusDescriptions}

当用户要求修改步行板状态时，请在回复末尾添加JSON格式的指令（单独一行）：
\`\`\`json
{"action": "update", "spanNumber": 孔号数字, "position": "位置英文", "boardNumber": 编号数字, "status": "新状态英文"}
\`\`\`

例如：
- "把第2孔上行3号板标为断裂风险" -> {"action": "update", "spanNumber": 2, "position": "upstream", "boardNumber": 3, "status": "fracture_risk"}
- "第1孔下行5号板已更换" -> {"action": "update", "spanNumber": 1, "position": "downstream", "boardNumber": 5, "status": "replaced"}

注意事项：
- 修改前需要确认具体信息
- 只处理合理的修改请求
- 对于模糊的请求要询问澄清
- 用简洁友好的语气回复`

    // 构建消息历史
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(history || []).slice(-10),
      { role: 'user', content: message }
    ]

    // 调用AI
    const result = await chatCompletion(config, messages)
    const reply = result.content

    // 检查是否有修改指令
    let updateAction = null
    const jsonMatch = reply.match(/```json\s*(\{[\s\S]*?"action"[\s\S]*?\})\s*```/)
    if (jsonMatch) {
      try {
        updateAction = JSON.parse(jsonMatch[1])
        if (updateAction.action === 'update' && updateAction.spanNumber && updateAction.position && updateAction.boardNumber && updateAction.status) {
          if (bridge) {
            const targetSpan = bridge.spans.find(s => s.spanNumber === updateAction.spanNumber)
            if (targetSpan) {
              const targetBoard = targetSpan.walkingBoards.find(b =>
                b.position === updateAction.position && b.boardNumber === updateAction.boardNumber
              )
              if (targetBoard) {
                updateAction.boardId = targetBoard.id
                updateAction.spanId = targetSpan.id
              }
            }
          }
        }
      } catch {
        updateAction = null
      }
    }

    // 清理回复中的JSON代码块
    const cleanReply = reply.replace(/```json\s*\{[^}]*"action"[^}]*\}\s*```/g, '').trim()

    return NextResponse.json({
      success: true,
      reply: cleanReply,
      updateAction
    })

  } catch (error) {
    console.error('AI对话错误:', error)
    const message = error instanceof Error ? error.message : '对话失败，请稍后重试'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
