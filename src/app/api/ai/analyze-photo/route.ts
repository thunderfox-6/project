import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatCompletionWithImage, type AIConfig } from '@/lib/ai-client'
import { requireAuth } from '@/lib/auth/index'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'ai:use')
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { boardId, photoId, config } = body as {
      boardId?: string
      photoId?: string
      config?: AIConfig
    }

    if (!config?.apiKey) {
      return NextResponse.json({ error: '请先在AI模型设置中配置API密钥' }, { status: 400 })
    }

    if (!boardId && !photoId) {
      return NextResponse.json({ error: '缺少步行板ID或照片ID' }, { status: 400 })
    }

    // 获取照片
    let photo: { photo: string } | null = null
    if (photoId) {
      photo = await db.boardPhoto.findUnique({
        where: { id: photoId },
        select: { photo: true },
      })
    } else if (boardId) {
      // 获取该步行板最新一张照片
      photo = await db.boardPhoto.findFirst({
        where: { boardId },
        orderBy: { uploadedAt: 'desc' },
        select: { photo: true },
      })
    }

    if (!photo?.photo) {
      return NextResponse.json({ error: '未找到巡检照片' }, { status: 404 })
    }

    // 获取步行板信息
    let boardInfo = ''
    if (boardId) {
      const board = await db.walkingBoard.findUnique({
        where: { id: boardId },
        include: { span: { include: { bridge: true } } },
      })
      if (board) {
        boardInfo = `
当前步行板信息：
- 桥梁：${board.span.bridge.name}
- 孔号：第${board.span.spanNumber}孔
- 位置：${board.position === 'upstream' ? '上行' : board.position === 'downstream' ? '下行' : '避车台'}
- 编号：${board.boardNumber}号
- 当前状态：${board.status}
- 当前损坏描述：${board.damageDesc || '无'}
`.trim()
      }
    }

    const prompt = `请仔细分析这张铁路桥梁步行板巡检照片，识别以下内容：

${boardInfo ? boardInfo + '\n\n' : ''}请按以下JSON格式返回分析结果（不要包含其他文字）：
{
  "damageDetected": true/false,
  "damageType": "裂缝/腐蚀/磨损/变形/松动/缺失/杂物堆积/积水/正常",
  "severityLevel": "normal/minor_damage/severe_damage/fracture_risk",
  "confidence": 0.0-1.0,
  "description": "详细的损坏描述，包括位置、大小、程度等",
  "suggestion": "修复建议和处理优先级"
}

注意：
- 如果照片无法识别或质量太差，请将confidence设为0并说明原因
- severityLevel必须从以下选项中选择：normal, minor_damage, severe_damage, fracture_risk
- damageType必须从以下选项中选择：裂缝, 腐蚀, 磨损, 变形, 松动, 缺失, 杂物堆积, 积水, 正常`

    const result = await chatCompletionWithImage(config, prompt, photo.photo)

    // 尝试解析AI返回的JSON
    let analysisResult
    try {
      // 提取JSON部分
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0])
      }
    } catch {
      analysisResult = null
    }

    return NextResponse.json({
      success: true,
      rawAnalysis: result.content,
      analysis: analysisResult,
    })
  } catch (error) {
    console.error('照片AI分析错误:', error)
    const message = error instanceof Error ? error.message : '分析失败，请稍后重试'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
