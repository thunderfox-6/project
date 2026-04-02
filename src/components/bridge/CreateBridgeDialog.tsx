'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShieldAlert, Ruler, Palette } from 'lucide-react'
import { SHELTER_SIDE_CONFIG, BOARD_MATERIAL_CONFIG } from '@/lib/bridge-constants'

interface NewBridgeForm {
  name: string
  bridgeCode: string
  location: string
  lineName: string
  totalSpans: number
  defaultSpanLength: number
  defaultUpstreamBoards: number
  defaultDownstreamBoards: number
  defaultUpstreamColumns: number
  defaultDownstreamColumns: number
  shelterSide: string
  shelterEvery: number
  shelterBoards: number
  shelterMaxPeople: number
  boardLength: number
  boardWidth: number
  boardThickness: number
  boardMaterial: string
}

interface CreateBridgeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  theme: 'day' | 'night'
  newBridge: NewBridgeForm
  setNewBridge: React.Dispatch<React.SetStateAction<NewBridgeForm>>
  onCreate: () => void
}

export default function CreateBridgeDialog({
  open,
  onOpenChange,
  theme,
  newBridge,
  setNewBridge,
  onCreate,
}: CreateBridgeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-lg max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className={theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}>新建桥梁</DialogTitle>
          <DialogDescription className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>填写桥梁基本信息创建新的桥梁记录</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>桥梁名称 *</Label>
              <Input value={newBridge.name} onChange={(e) => setNewBridge({...newBridge, name: e.target.value})} placeholder="如：黄河大桥" className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>桥梁编号 *</Label>
              <Input value={newBridge.bridgeCode} onChange={(e) => setNewBridge({...newBridge, bridgeCode: e.target.value})} placeholder="如：DK100+500" className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>位置</Label>
              <Input value={newBridge.location} onChange={(e) => setNewBridge({...newBridge, location: e.target.value})} placeholder="地理位置" className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>线路名称</Label>
              <Input value={newBridge.lineName} onChange={(e) => setNewBridge({...newBridge, lineName: e.target.value})} placeholder="所属线路" className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
          </div>

          <div>
            <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>总孔数</Label>
            <Input type="number" value={newBridge.totalSpans} onChange={(e) => setNewBridge({...newBridge, totalSpans: parseInt(e.target.value) || 1})} min={1} max={50} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>默认孔长度(m)</Label>
              <Input type="number" value={newBridge.defaultSpanLength} onChange={(e) => setNewBridge({...newBridge, defaultSpanLength: parseFloat(e.target.value) || 20})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>每几孔设避车台(0=不设)</Label>
              <Input type="number" value={newBridge.shelterEvery} onChange={(e) => setNewBridge({...newBridge, shelterEvery: parseInt(e.target.value) || 0})} min={0} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
          </div>

          {/* 避车台配置 */}
          <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/10">
            <Label className="text-purple-400 font-semibold flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4" />避车台配置
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>避车台位置</Label>
                <Select value={newBridge.shelterSide} onValueChange={(v) => setNewBridge({...newBridge, shelterSide: v})}>
                  <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SHELTER_SIDE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div>
                          <div className="font-medium">{config.label}</div>
                          <div className="text-xs text-slate-400">{config.desc}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>避车台板数/侧</Label>
                <Input type="number" value={newBridge.shelterBoards} onChange={(e) => setNewBridge({...newBridge, shelterBoards: parseInt(e.target.value) || 4})} min={1} max={20} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            </div>
            <div className="mt-2">
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>限员人数</Label>
              <Input type="number" value={newBridge.shelterMaxPeople} onChange={(e) => setNewBridge({...newBridge, shelterMaxPeople: parseInt(e.target.value) || 4})} min={1} max={20} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>上行步行板数量/孔</Label>
              <Input type="number" value={newBridge.defaultUpstreamBoards} onChange={(e) => setNewBridge({...newBridge, defaultUpstreamBoards: parseInt(e.target.value) || 10})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>下行步行板数量/孔</Label>
              <Input type="number" value={newBridge.defaultDownstreamBoards} onChange={(e) => setNewBridge({...newBridge, defaultDownstreamBoards: parseInt(e.target.value) || 10})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>上行列数</Label>
              <Input type="number" value={newBridge.defaultUpstreamColumns} onChange={(e) => setNewBridge({...newBridge, defaultUpstreamColumns: parseInt(e.target.value) || 1})} min={1} max={4} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>下行列数</Label>
              <Input type="number" value={newBridge.defaultDownstreamColumns} onChange={(e) => setNewBridge({...newBridge, defaultDownstreamColumns: parseInt(e.target.value) || 1})} min={1} max={4} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
          </div>

          {/* 步行板尺寸配置 */}
          <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
            <Label className="text-cyan-400 font-semibold flex items-center gap-2 mb-2">
              <Ruler className="w-4 h-4" />步行板尺寸配置
            </Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>长度(cm)</Label>
                <Input type="number" value={newBridge.boardLength} onChange={(e) => setNewBridge({...newBridge, boardLength: parseFloat(e.target.value) || 100})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>宽度(cm)</Label>
                <Input type="number" value={newBridge.boardWidth} onChange={(e) => setNewBridge({...newBridge, boardWidth: parseFloat(e.target.value) || 50})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
              <div>
                <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>厚度(cm)</Label>
                <Input type="number" value={newBridge.boardThickness} onChange={(e) => setNewBridge({...newBridge, boardThickness: parseFloat(e.target.value) || 5})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
              </div>
            </div>
          </div>

          {/* 步行板材质配置 */}
          <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10">
            <Label className="text-green-400 font-semibold flex items-center gap-2 mb-2">
              <Palette className="w-4 h-4" />步行板材质配置
            </Label>
            <Select value={newBridge.boardMaterial} onValueChange={(v) => setNewBridge({...newBridge, boardMaterial: v})}>
              <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BOARD_MATERIAL_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ background: config.color }} />
                      <div>
                        <div className="font-medium">{config.label}</div>
                        <div className="text-xs text-slate-400">{config.desc}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>取消</Button>
          <Button onClick={onCreate} className={theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}>创建桥梁</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
