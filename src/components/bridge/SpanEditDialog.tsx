'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShieldAlert, Ruler, Palette, Trash2, RefreshCw, Save, Loader2, Edit3, Layers } from 'lucide-react'
import { SHELTER_SIDE_CONFIG, BOARD_MATERIAL_CONFIG } from '@/lib/bridge-constants'
import type { BridgeSpan, Bridge } from '@/types/bridge'

interface SpanEditForm {
  spanLength: number
  upstreamBoards: number
  downstreamBoards: number
  upstreamColumns: number
  downstreamColumns: number
  shelterSide: string
  shelterBoards: number
  shelterMaxPeople: number
  boardLength: number
  boardWidth: number
  boardThickness: number
  boardMaterial?: string
}

interface SpanEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  theme: 'day' | 'night'
  editingSpan: BridgeSpan | null
  form: SpanEditForm
  setForm: React.Dispatch<React.SetStateAction<SpanEditForm>>
  regenerating: boolean
  onSave: (forceRegenerate?: boolean) => void
  onDelete: (spanId: string) => void
  totalSpans: number
}

export default function SpanEditDialog({
  open,
  onOpenChange,
  theme,
  editingSpan,
  form,
  setForm,
  regenerating,
  onSave,
  onDelete,
  totalSpans,
}: SpanEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-lg max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
            <Edit3 className="w-5 h-5" />
            编辑孔位配置 - 第{editingSpan?.spanNumber}孔
          </DialogTitle>
          <DialogDescription className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>修改孔位参数，步行板数量变化时将自动重新生成</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 孔位尺寸 */}
          <div>
            <Label className={`font-semibold text-xs ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>孔位参数</Label>
            <div className="mt-2">
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>孔长(m)</Label>
              <Input type="number" value={form.spanLength} onChange={(e) => setForm({...form, spanLength: parseFloat(e.target.value) || 20})} step={0.1} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
          </div>

          {/* 步行板数量配置 */}
          <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
            <Label className="text-blue-400 font-semibold flex items-center gap-2 mb-2 text-xs">
              <Layers className="w-3.5 h-3.5" />步行板数量配置
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>上行步行板数</Label>
                <Input type="number" value={form.upstreamBoards} onChange={(e) => setForm({...form, upstreamBoards: parseInt(e.target.value) || 0})} min={0} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>下行步行板数</Label>
                <Input type="number" value={form.downstreamBoards} onChange={(e) => setForm({...form, downstreamBoards: parseInt(e.target.value) || 0})} min={0} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>上行列数</Label>
                <Input type="number" value={form.upstreamColumns} onChange={(e) => setForm({...form, upstreamColumns: parseInt(e.target.value) || 1})} min={1} max={10} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>下行列数</Label>
                <Input type="number" value={form.downstreamColumns} onChange={(e) => setForm({...form, downstreamColumns: parseInt(e.target.value) || 1})} min={1} max={10} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            </div>
          </div>

          {/* 避车台配置 */}
          <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5">
            <Label className="text-purple-400 font-semibold flex items-center gap-2 mb-2 text-xs">
              <ShieldAlert className="w-3.5 h-3.5" />避车台配置
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>避车台位置</Label>
                <Select value={form.shelterSide} onValueChange={(v) => setForm({...form, shelterSide: v})}>
                  <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SHELTER_SIDE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div>{config.label}</div>
                          <div className="text-xs text-slate-400">{config.desc}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>避车台板数(每侧)</Label>
                <Input type="number" value={form.shelterBoards} onChange={(e) => setForm({...form, shelterBoards: parseInt(e.target.value) || 0})} min={0} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>最大站立人数</Label>
                <Input type="number" value={form.shelterMaxPeople} onChange={(e) => setForm({...form, shelterMaxPeople: parseInt(e.target.value) || 4})} min={1} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            </div>
          </div>

          {/* 步行板尺寸配置 */}
          <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5">
            <Label className="text-orange-400 font-semibold flex items-center gap-2 mb-2 text-xs">
              <Ruler className="w-3.5 h-3.5" />步行板尺寸配置
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>长度(cm)</Label>
                <Input type="number" value={form.boardLength} onChange={(e) => setForm({...form, boardLength: parseFloat(e.target.value) || 100})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>宽度(cm)</Label>
                <Input type="number" value={form.boardWidth} onChange={(e) => setForm({...form, boardWidth: parseFloat(e.target.value) || 50})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>厚度(cm)</Label>
                <Input type="number" value={form.boardThickness} onChange={(e) => setForm({...form, boardThickness: parseFloat(e.target.value) || 5})} step={0.1} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            </div>
          </div>

          {/* 步行板材质配置 */}
          <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
            <Label className="text-green-400 font-semibold flex items-center gap-2 mb-2 text-xs">
              <Palette className="w-3.5 h-3.5" />步行板材质配置
            </Label>
            <Select value={form.boardMaterial} onValueChange={(v) => setForm({...form, boardMaterial: v})}>
              <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BOARD_MATERIAL_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ background: config.color }} />
                      <div>{config.label}</div>
                      <div className="text-xs text-slate-400">{config.desc}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 重新生成步行板提示 */}
          <div className={`p-3 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-start gap-2">
              <RefreshCw className={`w-4 h-4 mt-0.5 flex-shrink-0 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-500'}`} />
              <div>
                <p className={`text-xs ${theme === 'night' ? 'text-slate-300' : 'text-gray-700'}`}>
                  修改步行板数量或列数时会自动重新生成步行板（重置为正常状态）。
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className={`mt-2 h-7 text-xs ${theme === 'night' ? 'border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}
                  onClick={() => onSave(true)}
                  disabled={regenerating}
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${regenerating ? 'animate-spin' : ''}`} />
                  强制重新生成步行板
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (editingSpan) {
                onDelete(editingSpan.id)
                onOpenChange(false)
              }
            }}
            disabled={totalSpans <= 1}
            className={theme === 'night' ? 'border-red-500/50 text-red-400 hover:bg-red-500/20 disabled:opacity-30' : 'border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-30'}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            删除此孔
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>取消</Button>
            <Button onClick={() => onSave(false)} disabled={regenerating} className={theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}>
              {regenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {regenerating ? '生成中...' : '保存'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
