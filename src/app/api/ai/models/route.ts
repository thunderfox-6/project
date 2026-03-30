import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/index'

interface ModelsRequest {
  provider: string
  apiKey: string
  baseUrl: string
}

// 各服务商默认的 base URL 和模型列表接口
const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; modelsPath: string }> = {
  glm: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', modelsPath: '/models' },
  openai: { baseUrl: 'https://api.openai.com/v1', modelsPath: '/models' },
  claude: { baseUrl: 'https://api.anthropic.com/v1', modelsPath: '/models' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', modelsPath: '/models' },
  minimax: { baseUrl: 'https://api.minimax.chat/v1', modelsPath: '/models' },
  kimi: { baseUrl: 'https://api.moonshot.cn/v1', modelsPath: '/models' },
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'ai:use')
  if (auth.error) return auth.error

  try {
    const { provider, apiKey, baseUrl } = (await request.json()) as ModelsRequest

    if (!apiKey) {
      return NextResponse.json({ error: '请先填写API密钥' }, { status: 400 })
    }

    const defaults = PROVIDER_DEFAULTS[provider]
    const base = baseUrl || defaults?.baseUrl
    if (!base) {
      return NextResponse.json({ error: '请填写API Base URL' }, { status: 400 })
    }

    const modelsUrl = `${base.replace(/\/$/, '')}${defaults?.modelsPath || '/models'}`

    // Claude 使用不同的认证头
    const headers: Record<string, string> = {}
    if (provider === 'claude') {
      headers['x-api-key'] = apiKey
      headers['anthropic-version'] = '2023-06-01'
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const response = await fetch(modelsUrl, { headers, signal: AbortSignal.timeout(15000) })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return NextResponse.json(
        { error: `获取模型列表失败 (${response.status}): ${text.slice(0, 200)}` },
        { status: 502 }
      )
    }

    const data = await response.json()

    // 不同服务商返回格式不同，统一提取模型 ID 列表
    let models: { id: string; name?: string }[] = []

    if (Array.isArray(data.data)) {
      // OpenAI 兼容格式 (openai, deepseek, kimi, minimax, glm 等)
      models = data.data
        .filter((m: Record<string, unknown>) => typeof m.id === 'string')
        .map((m: Record<string, string>) => ({ id: m.id, name: m.id }))
        .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id))
    } else if (Array.isArray(data.models)) {
      // 有些服务用 data.models
      models = data.models
        .filter((m: Record<string, unknown>) => typeof (m.id || m.name || m.model) === 'string')
        .map((m: Record<string, string>) => ({ id: m.id || m.name || m.model, name: m.id || m.name || m.model }))
        .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id))
    } else if (typeof data === 'object' && data !== null) {
      // Claude 可能返回 { data: [...] } 或其他格式
      const arr = data.data || data.models || data
      if (Array.isArray(arr)) {
        models = arr
          .filter((m: Record<string, unknown>) => typeof (m.id || m.name || m.model) === 'string')
          .map((m: Record<string, string>) => ({ id: m.id || m.name || m.model }))
          .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id))
      }
    }

    if (models.length === 0) {
      return NextResponse.json({ error: '未找到可用模型，请检查API地址和密钥', raw: data }, { status: 404 })
    }

    return NextResponse.json({ success: true, models })
  } catch (error) {
    console.error('获取模型列表错误:', error)
    const message = error instanceof Error ? error.message : '获取模型列表失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
