'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Edit3, Ruler } from 'lucide-react'
import { BOARD_STATUS_CONFIG, RAILING_STATUS_OPTIONS, BRACKET_STATUS_OPTIONS } from '@/lib/bridge-constants'

interface BatchEditForm {
  status: string
  inspectedBy: string
  railingStatus: string
  bracketStatus: string
  remarks: string
  editSize: boolean
  boardLength: number
  boardWidth: number
  boardThickness: number
}

interface BatchEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  theme: 'day' | 'night'
  selectedCount: number
  form: BatchEditForm
  setForm: React.Dispatch<React.SetStateAction<BatchEditForm>>
  onBatchUpdate: () => void
}

export default function BatchEditDialog({
  open,
  onOpenChange,
  theme,
  selectedCount,
  form,
  setForm,
  onBatchUpdate,
}: BatchEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-md`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${theme === 'night' ? 'text-purple-400' : 'text-purple-600'}`}>
            <Edit3 className="w-5 h-5" />
            批量编辑步行板
          </DialogTitle>
          <DialogDescription className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>
            已选择 {selectedCount} 块步行板，空白字段将保持不变
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 状态 */}
          <div className="space-y-2">
            <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>状态（留空保持不变）</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({...form, status: v === 'keep' ? '' : v})}
            >
              <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                <SelectValue placeholder="保持不变" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keep">保持不变</SelectItem>
                {Object.entries(BOARD_STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: config.color }} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 栏杆状态 */}
          <div className="space-y-2">
            <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>栏杆状态（留空保持不变）</Label>
            <Select
              value={form.railingStatus}
              onValueChange={(v) => setForm({...form, railingStatus: v === 'keep' ? '' : v})}
            >
              <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                <SelectValue placeholder="保持不变" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keep">保持不变</SelectItem>
                {RAILING_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-slate-400">{option.desc}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 托架状态 */}
          <div className="space-y-2">
            <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>托架状态（留空保持不变）</Label>
            <Select
              value={form.bracketStatus}
              onValueChange={(v) => setForm({...form, bracketStatus: v === 'keep' ? '' : v})}
            >
              <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                <SelectValue placeholder="保持不变" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keep">保持不变</SelectItem>
                {BRACKET_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-slate-400">{option.desc}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 备注 */}
          <div className="space-y-2">
            <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>备注（留空保持不变）</Label>
            <Textarea
              value={form.remarks}
              onChange={(e) => setForm({...form, remarks: e.target.value})}
              placeholder="添加备注信息..."
              className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}
              rows={2}
            />
          </div>

          {/* 检查人 */}
          <div className="space-y-2">
            <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>检查人（留空默认为"批量编辑"）</Label>
            <Input
              value={form.inspectedBy}
              onChange={(e) => setForm({...form, inspectedBy: e.target.value})}
              placeholder="检查人员姓名"
              className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}
            />
          </div>

          {/* 尺寸编辑开关 */}
          <div className="space-y-3 pt-2 border-t border-slate-600/30">
            <div className="flex items-center justify-between">
              <Label className={`flex items-center gap-2 ${theme === 'night' ? 'text-slate-300' : 'text-gray-700'}`}>
                <Ruler className="w-4 h-4" />
                同步修改尺寸
              </Label>
              <Switch
                checked={form.editSize}
                onCheckedChange={(checked) => setForm({...form, editSize: checked})}
              />
            </div>

            {form.editSize && (
              <div className="grid grid-cols-3 gap-3 animate-in slide-in-from-top-2">
                <div className="space-y-1">
                  <Label className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>长度(cm)</Label>
                  <Input
                    type="number"
                    value={form.boardLength}
                    onChange={(e) => setForm({...form, boardLength: parseFloat(e.target.value) || 100})}
                    className={`h-8 text-sm ${theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>宽度(cm)</Label>
                  <Input
                    type="number"
                    value={form.boardWidth}
                    onChange={(e) => setForm({...form, boardWidth: parseFloat(e.target.value) || 50})}
                    className={`h-8 text-sm ${theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>厚度(cm)</Label>
                  <Input
                    type="number"
                    value={form.boardThickness}
                    onChange={(e) => setForm({...form, boardThickness: parseFloat(e.target.value) || 5})}
                    className={`h-8 text-sm ${theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>取消</Button>
          <Button onClick={onBatchUpdate} className={theme === 'night' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-purple-600 hover:bg-purple-500'}>
            批量更新
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
