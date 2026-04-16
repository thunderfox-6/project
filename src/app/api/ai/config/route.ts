import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/index'

// GET: 获取当前用户的AI配置（apiKey脱敏）
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'ai:use')
  if (auth.error) return auth.error

  try {
    const user = await db.user.findUnique({
      where: { id: auth.user.id },
      select: { aiConfig: true }
    })

    if (!user?.aiConfig) {
      return NextResponse.json({ success: true, config: null })
    }

    const config = JSON.parse(user.aiConfig)

    // 脱敏：只返回apiKey后4位
    const maskedConfig = {
      ...config,
      apiKey: config.apiKey
        ? `****${config.apiKey.slice(-4)}`
        : ''
    }

    return NextResponse.json({ success: true, config: maskedConfig })
  } catch (error) {
    console.error('获取AI配置失败:', error)
    return NextResponse.json({ error: '获取AI配置失败' }, { status: 500 })
  }
}

// PUT: 保存AI配置（含完整apiKey）
export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request, 'ai:use')
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { provider, model, apiKey, baseUrl } = body

    if (!provider || !model) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 如果apiKey是脱敏格式(****xxxx)，则保留原有密钥
    let finalApiKey = apiKey
    if (apiKey && apiKey.startsWith('****')) {
      const user = await db.user.findUnique({
        where: { id: auth.user.id },
        select: { aiConfig: true }
      })
      if (user?.aiConfig) {
        const existingConfig = JSON.parse(user.aiConfig)
        finalApiKey = existingConfig.apiKey || ''
      }
    }

    const configToSave = {
      provider,
      model,
      apiKey: finalApiKey,
      baseUrl: baseUrl || ''
    }

    await db.user.update({
      where: { id: auth.user.id },
      data: { aiConfig: JSON.stringify(configToSave) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('保存AI配置失败:', error)
    return NextResponse.json({ error: '保存AI配置失败' }, { status: 500 })
  }
}
