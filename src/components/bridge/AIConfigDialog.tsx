'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Sparkles, Loader2 } from 'lucide-react'
import type { AIConfig } from '@/types/bridge'

interface AIConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  theme: 'day' | 'night'
  aiConfig: AIConfig
  setAiConfig: React.Dispatch<React.SetStateAction<AIConfig>>
  fetchedModels: { id: string; name?: string }[]
  fetchingModels: boolean
  onFetchModels: () => void
  onSave: (config: AIConfig) => void
}

export default function AIConfigDialog({
  open,
  onOpenChange,
  theme,
  aiConfig,
  setAiConfig,
  fetchedModels,
  fetchingModels,
  onFetchModels,
  onSave,
}: AIConfigDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-md`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
            <Settings className="w-5 h-5" />
            AI模型配置
          </DialogTitle>
          <DialogDescription className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>
            选择AI服务商和模型，配置API密钥
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* AI服务商选择 */}
          <div className="space-y-2">
            <Label className={theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}>AI服务商</Label>
            <Select
              value={aiConfig.provider}
              onValueChange={(v) => {
                const newConfig = { ...aiConfig, provider: v as AIConfig['provider'] }
                // 根据服务商设置默认模型
                if (v === 'glm') newConfig.model = 'glm-4'
                else if (v === 'openai') newConfig.model = 'gpt-4o'
                else if (v === 'claude') newConfig.model = 'claude-3-sonnet'
                else if (v === 'deepseek') newConfig.model = 'deepseek-chat'
                else if (v === 'minimax') newConfig.model = 'abab6.5-chat'
                else if (v === 'kimi') newConfig.model = 'moonshot-v1-8k'
                else newConfig.model = 'custom'
                setAiConfig(newConfig)
              }}
            >
              <SelectTrigger className={theme === 'night' ? 'bg-slate-800 border-cyan-500/30 text-slate-200' : 'bg-gray-50 border-gray-300 text-gray-700'}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={theme === 'night' ? 'bg-slate-800 border-cyan-500/30' : 'bg-white border-gray-200'}>
                <SelectItem value="glm">智谱AI (GLM)</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                <SelectItem value="deepseek">DeepSeek (深度求索)</SelectItem>
                <SelectItem value="minimax">MiniMax (海螺AI)</SelectItem>
                <SelectItem value="kimi">Kimi (月之暗面)</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 模型选择 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className={theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}>模型</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={fetchingModels}
                onClick={onFetchModels}
                className={`h-7 text-xs ${theme === 'night' ? 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}
              >
                {fetchingModels ? (
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" />获取中...</>
                ) : (
                  <><Sparkles className="w-3 h-3 mr-1" />获取可用模型</>
                )}
              </Button>
            </div>
            {fetchedModels.length > 0 ? (
              <Select
                value={aiConfig.model}
                onValueChange={(v) => setAiConfig({...aiConfig, model: v})}
              >
                <SelectTrigger className={theme === 'night' ? 'bg-slate-800 border-cyan-500/30 text-slate-200' : 'bg-gray-50 border-gray-300 text-gray-700'}>
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent className={theme === 'night' ? 'bg-slate-800 border-cyan-500/30' : 'bg-white border-gray-200'}>
                  {fetchedModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name || m.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={aiConfig.model}
                onValueChange={(v) => setAiConfig({...aiConfig, model: v})}
              >
                <SelectTrigger className={theme === 'night' ? 'bg-slate-800 border-cyan-500/30 text-slate-200' : 'bg-gray-50 border-gray-300 text-gray-700'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={theme === 'night' ? 'bg-slate-800 border-cyan-500/30' : 'bg-white border-gray-200'}>
                  {aiConfig.provider === 'glm' && (
                    <>
                      <SelectItem value="glm-4">GLM-4</SelectItem>
                      <SelectItem value="glm-4-plus">GLM-4-Plus</SelectItem>
                      <SelectItem value="glm-4-flash">GLM-4-Flash</SelectItem>
                      <SelectItem value="glm-4-air">GLM-4-Air</SelectItem>
                    </>
                  )}
                  {aiConfig.provider === 'openai' && (
                    <>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </>
                  )}
                  {aiConfig.provider === 'claude' && (
                    <>
                      <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                      <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                      <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                    </>
                  )}
                  {aiConfig.provider === 'deepseek' && (
                    <>
                      <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                      <SelectItem value="deepseek-coder">DeepSeek Coder</SelectItem>
                      <SelectItem value="deepseek-reasoner">DeepSeek Reasoner (R1)</SelectItem>
                    </>
                  )}
                  {aiConfig.provider === 'minimax' && (
                    <>
                      <SelectItem value="abab6.5-chat">ABAB 6.5 Chat</SelectItem>
                      <SelectItem value="abab6.5s-chat">ABAB 6.5s Chat</SelectItem>
                      <SelectItem value="abab5.5-chat">ABAB 5.5 Chat</SelectItem>
                    </>
                  )}
                  {aiConfig.provider === 'kimi' && (
                    <>
                      <SelectItem value="moonshot-v1-8k">Moonshot V1 8K</SelectItem>
                      <SelectItem value="moonshot-v1-32k">Moonshot V1 32K</SelectItem>
                      <SelectItem value="moonshot-v1-128k">Moonshot V1 128K</SelectItem>
                    </>
                  )}
                  {aiConfig.provider === 'custom' && (
                    <SelectItem value="custom">自定义模型</SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
            {fetchedModels.length > 0 && (
              <p className={`text-xs ${theme === 'night' ? 'text-slate-500' : 'text-gray-400'}`}>
                已获取 {fetchedModels.length} 个模型，点击「获取可用模型」刷新列表
              </p>
            )}
          </div>

          {/* API密钥 */}
          <div className="space-y-2">
            <Label className={theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}>API密钥</Label>
            <Input
              type="password"
              value={aiConfig.apiKey}
              onChange={(e) => setAiConfig({...aiConfig, apiKey: e.target.value})}
              placeholder="输入您的API密钥"
              className={theme === 'night' ? 'bg-slate-800 border-cyan-500/30' : 'bg-gray-50 border-gray-300'}
            />
          </div>

          {/* API Base URL提示 */}
          {(aiConfig.provider === 'deepseek' || aiConfig.provider === 'minimax' || aiConfig.provider === 'kimi' || aiConfig.provider === 'custom') && (
            <div className="space-y-2">
              <Label className={theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}>API Base URL (可选)</Label>
              <Input
                value={aiConfig.baseUrl}
                onChange={(e) => setAiConfig({...aiConfig, baseUrl: e.target.value})}
                placeholder={
                  aiConfig.provider === 'deepseek' ? 'https://api.deepseek.com/v1' :
                  aiConfig.provider === 'minimax' ? 'https://api.minimax.chat/v1' :
                  aiConfig.provider === 'kimi' ? 'https://api.moonshot.cn/v1' :
                  'https://api.example.com/v1'
                }
                className={theme === 'night' ? 'bg-slate-800 border-cyan-500/30' : 'bg-gray-50 border-gray-300'}
              />
              <p className={`text-xs ${theme === 'night' ? 'text-slate-500' : 'text-gray-400'}`}>
                {aiConfig.provider === 'deepseek' && 'DeepSeek API 地址: https://api.deepseek.com/v1'}
                {aiConfig.provider === 'minimax' && 'MiniMax API 地址: https://api.minimax.chat/v1'}
                {aiConfig.provider === 'kimi' && 'Kimi API 地址: https://api.moonshot.cn/v1'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>取消</Button>
          <Button onClick={() => onSave(aiConfig)} className={theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}>保存配置</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
