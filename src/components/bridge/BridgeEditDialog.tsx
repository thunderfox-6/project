'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Save } from 'lucide-react'

interface BridgeEditForm {
  name: string
  bridgeCode: string
  location: string
  lineName: string
  totalSpans: number
}

interface BridgeEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  theme: 'day' | 'night'
  form: BridgeEditForm
  setForm: React.Dispatch<React.SetStateAction<BridgeEditForm>>
  onSave: () => void
}

export default function BridgeEditDialog({
  open,
  onOpenChange,
  theme,
  form,
  setForm,
  onSave,
}: BridgeEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-lg max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
            <Pencil className="w-5 h-5" />
            编辑桥梁信息
          </DialogTitle>
          <DialogDescription className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>修改桥梁的基本信息</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>桥梁名称 *</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>桥梁编号 *</Label>
              <Input value={form.bridgeCode} onChange={(e) => setForm({...form, bridgeCode: e.target.value})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>位置</Label>
              <Input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
            <div>
              <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>线路名称</Label>
              <Input value={form.lineName} onChange={(e) => setForm({...form, lineName: e.target.value})} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            </div>
          </div>

          <div>
            <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>总孔数</Label>
            <Input type="number" value={form.totalSpans} onChange={(e) => setForm({...form, totalSpans: parseInt(e.target.value) || 0})} min={1} className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'} />
            <p className={`text-xs mt-1 ${theme === 'night' ? 'text-slate-500' : 'text-gray-400'}`}>注意：修改总孔数不会自动增减孔位，请通过添加/删除孔位操作</p>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>取消</Button>
          <Button onClick={onSave} className={theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}>
            <Save className="w-4 h-4 mr-2" />保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
