'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Import, Info } from 'lucide-react'

interface ImportConfig {
  mode: 'merge' | 'replace'
  importBridges: boolean
  importSpans: boolean
  importBoards: boolean
  skipExisting: boolean
}

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  theme: 'day' | 'night'
  importFile: File | null
  importConfig: ImportConfig
  setImportConfig: React.Dispatch<React.SetStateAction<ImportConfig>>
  onExecuteImport: () => void
  onDownloadTemplate: () => void
}

export default function ImportDialog({
  open,
  onOpenChange,
  theme,
  importFile,
  importConfig,
  setImportConfig,
  onExecuteImport,
  onDownloadTemplate,
}: ImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-md`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
            <Import className="w-5 h-5" />
            导入Excel数据
          </DialogTitle>
          <DialogDescription className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>
            已选择文件: {importFile?.name || '未选择'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 导入模式 */}
          <div className="space-y-2">
            <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>导入模式</Label>
            <Select
              value={importConfig.mode}
              onValueChange={(v) => setImportConfig({...importConfig, mode: v as 'merge' | 'replace'})}
            >
              <SelectTrigger className={theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="merge">
                  <div>
                    <div className="font-medium">合并模式</div>
                    <div className="text-xs text-slate-400">保留现有数据，新增导入的数据</div>
                  </div>
                </SelectItem>
                <SelectItem value="replace">
                  <div>
                    <div className="font-medium">替换模式</div>
                    <div className="text-xs text-slate-400">删除现有数据，完全替换为导入数据</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 导入选项 */}
          <div className="space-y-3 pt-2">
            <Label className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>导入选项</Label>

            <div className="flex items-center justify-between">
              <span className={`text-sm ${theme === 'night' ? 'text-slate-400' : 'text-gray-600'}`}>导入桥梁信息</span>
              <Switch
                checked={importConfig.importBridges}
                onCheckedChange={(checked) => setImportConfig({...importConfig, importBridges: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className={`text-sm ${theme === 'night' ? 'text-slate-400' : 'text-gray-600'}`}>导入孔位信息</span>
              <Switch
                checked={importConfig.importSpans}
                onCheckedChange={(checked) => setImportConfig({...importConfig, importSpans: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className={`text-sm ${theme === 'night' ? 'text-slate-400' : 'text-gray-600'}`}>导入步行板信息</span>
              <Switch
                checked={importConfig.importBoards}
                onCheckedChange={(checked) => setImportConfig({...importConfig, importBoards: checked})}
              />
            </div>

            {importConfig.mode === 'merge' && (
              <div className="flex items-center justify-between">
                <span className={`text-sm ${theme === 'night' ? 'text-slate-400' : 'text-gray-600'}`}>跳过已存在的桥梁</span>
                <Switch
                  checked={importConfig.skipExisting}
                  onCheckedChange={(checked) => setImportConfig({...importConfig, skipExisting: checked})}
                />
              </div>
            )}
          </div>

          {/* 模板下载提示 */}
          <div className={`p-3 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-start gap-2">
              <Info className={`w-4 h-4 mt-0.5 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-500'}`} />
              <div>
                <p className={`text-sm ${theme === 'night' ? 'text-slate-300' : 'text-gray-700'}`}>需要导入模板？</p>
                <Button
                  variant="link"
                  size="sm"
                  className={`h-auto p-0 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}
                  onClick={() => { onDownloadTemplate(); onOpenChange(false); }}
                >
                  点击下载标准导入模板
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>取消</Button>
          <Button onClick={onExecuteImport} className={theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}>
            <Import className="w-4 h-4 mr-2" />
            开始导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
