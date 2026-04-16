'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { authFetch } from '@/lib/bridge-constants'
import type { ChatMessage, AIConfig, Bridge } from '@/types/bridge'

interface UseAIAssistantParams {
  selectedBridge: Bridge | null
  selectedSpanIndex: number
  refreshBridgeData: () => Promise<void>
}

interface UseAIAssistantReturn {
  aiMessages: ChatMessage[]
  setAiMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  aiInput: string
  setAiInput: React.Dispatch<React.SetStateAction<string>>
  aiLoading: boolean
  aiAnalyzing: boolean
  aiAnalysis: string | null
  rightPanelTab: 'info' | 'ai'
  setRightPanelTab: React.Dispatch<React.SetStateAction<'info' | 'ai'>>
  aiConfig: AIConfig
  setAiConfig: React.Dispatch<React.SetStateAction<AIConfig>>
  fetchedModels: { id: string; name?: string }[]
  setFetchedModels: React.Dispatch<React.SetStateAction<{ id: string; name?: string }[]>>
  fetchingModels: boolean
  settingsOpen: boolean
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  handleAISend: () => Promise<void>
  handleAIAnalyze: () => Promise<void>
  fetchModels: () => Promise<void>
  saveAiConfig: (config: AIConfig) => void
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: 'assistant',
    content:
      '您好！我是桥梁步行板AI助手。\n\n我可以帮您：\n• 分析桥梁安全状态\n• 查询步行板信息\n• 修改步行板状态\n• 提供安全建议\n\n请问有什么可以帮您的？',
  },
]

export function useAIAssistant({
  selectedBridge,
  selectedSpanIndex,
  refreshBridgeData,
}: UseAIAssistantParams): UseAIAssistantReturn {
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [rightPanelTab, setRightPanelTab] = useState<'info' | 'ai'>('info')
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'glm',
    model: 'glm-4',
    apiKey: '',
    baseUrl: '',
  })
  const [fetchedModels, setFetchedModels] = useState<{ id: string; name?: string }[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load AI config from server (fall back to localStorage for apiKey)
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await authFetch('/api/ai/config')
        const data = await res.json()
        if (data.success && data.config) {
          // 服务端返回脱敏key，需要从localStorage补充完整key
          const localConfig = localStorage.getItem('ai-config')
          let fullApiKey = data.config.apiKey
          if (localConfig) {
            try {
              const parsed = JSON.parse(localConfig)
              if (parsed.apiKey && !parsed.apiKey.startsWith('****')) {
                fullApiKey = parsed.apiKey
              }
            } catch { /* ignore */ }
          }
          setAiConfig({
            ...data.config,
            apiKey: fullApiKey || ''
          })
          return
        }
      } catch { /* fall through to localStorage */ }

      // Fallback: load from localStorage
      const savedConfig = localStorage.getItem('ai-config')
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig)
          setAiConfig(parsed)
        } catch {
          console.error('Failed to parse AI config')
        }
      }
    }
    loadConfig()
  }, [])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages])

  // Save AI config (server + localStorage for apiKey)
  const saveAiConfig = useCallback(async (config: AIConfig) => {
    setAiConfig(config)
    // localStorage暂存完整key（用于会话内API调用）
    localStorage.setItem('ai-config', JSON.stringify(config))
    try {
      await authFetch('/api/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
    } catch { /* non-critical */ }
    toast.success('AI配置已保存')
    setSettingsOpen(false)
  }, [])

  // Fetch available model list
  const fetchModels = useCallback(async () => {
    if (!aiConfig.apiKey) {
      toast.error('请先填写API密钥')
      return
    }
    setFetchingModels(true)
    try {
      const res = await authFetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiConfig.provider,
          apiKey: aiConfig.apiKey,
          baseUrl: aiConfig.baseUrl,
        }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      if (data.models && data.models.length > 0) {
        setFetchedModels(data.models)
        // If current model is not in the list, select the first one
        if (!data.models.find((m: { id: string }) => m.id === aiConfig.model)) {
          setAiConfig(prev => ({ ...prev, model: data.models[0].id }))
        }
        toast.success(`获取到 ${data.models.length} 个可用模型`)
      } else {
        toast.error('未找到可用模型')
      }
    } catch {
      toast.error('获取模型列表失败')
    } finally {
      setFetchingModels(false)
    }
  }, [aiConfig])

  // AI analysis
  const handleAIAnalyze = useCallback(async () => {
    if (!selectedBridge) {
      toast.error('请先选择一座桥梁')
      return
    }

    setAiAnalyzing(true)
    setAiAnalysis(null)

    try {
      const response = await authFetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bridgeId: selectedBridge.id,
          config: aiConfig,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setAiAnalysis(data.analysis)
        setAiMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `## 桥梁安全分析报告\n\n${data.analysis}`,
          },
        ])
      } else {
        toast.error(data.error || '分析失败')
      }
    } catch (error) {
      console.error('AI analysis failed:', error)
      toast.error('AI分析失败，请稍后重试')
    } finally {
      setAiAnalyzing(false)
    }
  }, [selectedBridge, aiConfig])

  // AI chat send message
  const handleAISend = useCallback(async () => {
    if (!aiInput.trim() || aiLoading) return

    const userMessage = aiInput.trim()
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setAiInput('')
    setAiLoading(true)

    try {
      const response = await authFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          bridgeId: selectedBridge?.id,
          currentSpanId: selectedBridge?.spans[selectedSpanIndex]?.id,
          history: aiMessages.slice(-10).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
          config: aiConfig,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setAiMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.reply,
          },
        ])

        // Handle update actions from AI
        if (data.updateAction && data.updateAction.boardId) {
          const action = data.updateAction
          const updateResponse = await authFetch('/api/boards', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: data.updateAction.boardId,
              status: action.status,
              inspectedBy: 'AI助手',
              damageDesc: `AI标注: ${action.status}`,
            }),
          })

          if (updateResponse.ok) {
            toast.success(
              `已更新第${action.spanNumber}孔${action.position === 'upstream' ? '上行' : action.position === 'downstream' ? '下行' : '避车台'}${action.boardNumber}号板状态`
            )
            refreshBridgeData()
          }
        }
      } else {
        toast.error(data.error || '对话失败')
      }
    } catch (error) {
      console.error('AI chat failed:', error)
      toast.error('AI对话失败，请稍后重试')
    } finally {
      setAiLoading(false)
    }
  }, [aiInput, aiLoading, aiMessages, selectedBridge, selectedSpanIndex, aiConfig, refreshBridgeData])

  return {
    aiMessages,
    setAiMessages,
    aiInput,
    setAiInput,
    aiLoading,
    aiAnalyzing,
    aiAnalysis,
    rightPanelTab,
    setRightPanelTab,
    aiConfig,
    setAiConfig,
    fetchedModels,
    setFetchedModels,
    fetchingModels,
    settingsOpen,
    setSettingsOpen,
    messagesEndRef,
    handleAISend,
    handleAIAnalyze,
    fetchModels,
    saveAiConfig,
  }
}
