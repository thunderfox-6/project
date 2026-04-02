'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Ruler } from 'lucide-react'
import PhotoUpload from '@/components/bridge/PhotoUpload'
import { BOARD_STATUS_CONFIG, RAILING_STATUS_OPTIONS, BRACKET_STATUS_OPTIONS } from '@/lib/bridge-constants'
import type { WalkingBoard } from '@/types/bridge'

interface EditForm {
  status: string
  damageDesc: string
  inspectedBy: string
  antiSlipLevel: number
  connectionStatus: string
  weatherCondition: string
  visibility: number
  railingStatus: string
  bracketStatus: string
  hasObstacle: boolean
  obstacleDesc: string
  hasWaterAccum: boolean
  waterAccumDepth: number
  remarks: string
  boardLength: number
  boardWidth: number
  boardThickness: number
}

interface EditBoardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  theme: 'day' | 'night'
  editingBoard: WalkingBoard | null
  form: EditForm
  setForm: React.Dispatch<React.SetStateAction<EditForm>>
  onSave: () => void
}

export default function EditBoardDialog({
  open,
  onOpenChange,
  theme,
  editingBoard,
  form,
  setForm,
  onSave,
}: EditBoardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-lg max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className={theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}>编辑步行板状态</DialogTitle>
          <DialogDescription className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>
            {editingBoard && `位置：${editingBoard.position === 'upstream' ? '上行' : editingBoard.position === 'downstream' ? '下行' : editingBoard.position === 'shelter_left' ? '左侧避车台' : editingBoard.position === 'shelter_right' ? '右侧避车台' : '避车台'} 第${editingBoard.columnIndex}列 ${editingBoard.boardNumber}号`}
          </DialogDescription>
        </DialogHeader>

        {editingBoard && (
          <div className="space-y-4">
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>状态</Label>
              <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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

            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>损坏描述</Label>
              <Textarea value={form.damageDesc} onChange={(e) => setForm({...form, damageDesc: e.target.value})} placeholder="描述损坏情况..." className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>

            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>检查人</Label>
              <Input value={form.inspectedBy} onChange={(e) => setForm({...form, inspectedBy: e.target.value})} placeholder="检查人员姓名" className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>防滑等级(%)</Label>
                <Input type="number" value={form.antiSlipLevel} onChange={(e) => setForm({...form, antiSlipLevel: parseInt(e.target.value) || 100})} min={0} max={100} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>连接状态</Label>
                <Select value={form.connectionStatus} onValueChange={(v) => setForm({...form, connectionStatus: v})}>
                  <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">正常</SelectItem>
                    <SelectItem value="loose">松动</SelectItem>
                    <SelectItem value="gap_large">间隙过大</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>天气条件</Label>
                <Select value={form.weatherCondition} onValueChange={(v) => setForm({...form, weatherCondition: v})}>
                  <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">正常</SelectItem>
                    <SelectItem value="rain">雨天</SelectItem>
                    <SelectItem value="snow">雪天</SelectItem>
                    <SelectItem value="fog">雾天</SelectItem>
                    <SelectItem value="ice">冰冻</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>能见度(%)</Label>
                <Input type="number" value={form.visibility} onChange={(e) => setForm({...form, visibility: parseInt(e.target.value) || 100})} min={0} max={100} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            </div>

            {/* 栏杆状态和托架状态 - 非必填 */}
            <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <Label className="text-blue-400 font-semibold flex items-center gap-2 mb-2 text-xs">
                附属设施状态（选填）
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>栏杆状态</Label>
                  <Select value={form.railingStatus || 'normal'} onValueChange={(v) => setForm({...form, railingStatus: v})}>
                    <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">正常</SelectItem>
                      <SelectItem value="loose">松动</SelectItem>
                      <SelectItem value="damaged">损坏</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>托架状态</Label>
                  <Select value={form.bracketStatus || 'normal'} onValueChange={(v) => setForm({...form, bracketStatus: v})}>
                    <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">正常</SelectItem>
                      <SelectItem value="loose">松动</SelectItem>
                      <SelectItem value="damaged">损坏</SelectItem>
                      <SelectItem value="corrosion">锈蚀</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="hasObstacle" checked={form.hasObstacle} onChange={(e) => setForm({...form, hasObstacle: e.target.checked})} className="rounded" />
                <Label htmlFor="hasObstacle" className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>有杂物</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="hasWaterAccum" checked={form.hasWaterAccum} onChange={(e) => setForm({...form, hasWaterAccum: e.target.checked})} className="rounded" />
                <Label htmlFor="hasWaterAccum" className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>有积水</Label>
              </div>
            </div>

            {form.hasObstacle && (
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>杂物描述</Label>
                <Input value={form.obstacleDesc} onChange={(e) => setForm({...form, obstacleDesc: e.target.value})} placeholder="描述杂物情况" className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            )}

            {form.hasWaterAccum && (
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>积水深度(cm)</Label>
                <Input type="number" value={form.waterAccumDepth} onChange={(e) => setForm({...form, waterAccumDepth: parseFloat(e.target.value) || 0})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            )}

            {/* 备注信息 */}
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>备注</Label>
              <Textarea
                value={form.remarks}
                onChange={(e) => setForm({...form, remarks: e.target.value})}
                placeholder="添加备注信息..."
                className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}
                rows={2}
              />
            </div>

            {/* 尺寸编辑 */}
            <div className="space-y-3 pt-2 border-t border-slate-600/30">
              <Label className={`flex items-center gap-2 ${theme === 'night' ? 'text-slate-300' : 'text-gray-700'}`}>
                <Ruler className="w-4 h-4" />
                步行板尺寸
              </Label>
              <div className="grid grid-cols-3 gap-3">
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
            </div>

            {/* 步行板照片 */}
            <div className="space-y-2">
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>步行板照片</Label>
              <PhotoUpload boardId={editingBoard.id} theme={theme} />
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>取消</Button>
          <Button onClick={onSave} className={theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
