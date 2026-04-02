'use client'

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Building2 } from 'lucide-react'
import { BOARD_MATERIAL_CONFIG } from '@/lib/bridge-constants'
import type { Bridge } from '@/types/bridge'

interface BridgeInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  theme: 'day' | 'night'
  bridge: Bridge | null
}

export default function BridgeInfoDialog({
  open,
  onOpenChange,
  theme,
  bridge,
}: BridgeInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-2xl max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
            <Building2 className="w-5 h-5" />
            桥梁详细信息
          </DialogTitle>
        </DialogHeader>

        {bridge && (
          <div className="space-y-4">
            {/* 基本信息 */}
            <div className={`p-4 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700' : 'bg-gray-50 border border-gray-200'}`}>
              <h3 className={`text-sm font-semibold mb-3 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>基本信息</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>桥梁名称：</span>
                  <span className={theme === 'night' ? 'text-white font-medium' : 'text-gray-900 font-medium'}>{bridge.name}</span>
                </div>
                <div>
                  <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>桥梁编号：</span>
                  <span className={theme === 'night' ? 'text-white font-medium' : 'text-gray-900 font-medium'}>{bridge.bridgeCode}</span>
                </div>
                <div>
                  <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>线路名称：</span>
                  <span className={theme === 'night' ? 'text-white' : 'text-gray-900'}>{bridge.lineName || '-'}</span>
                </div>
                <div>
                  <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>位置：</span>
                  <span className={theme === 'night' ? 'text-white' : 'text-gray-900'}>{bridge.location || '-'}</span>
                </div>
                <div>
                  <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>总孔数：</span>
                  <span className={theme === 'night' ? 'text-white font-medium' : 'text-gray-900 font-medium'}>{bridge.totalSpans}孔</span>
                </div>
              </div>
            </div>

            {/* 统计概览 */}
            <div className={`p-4 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700' : 'bg-gray-50 border border-gray-200'}`}>
              <h3 className={`text-sm font-semibold mb-3 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>步行板统计</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                {(() => {
                  const allBoards = bridge.spans.flatMap(s => s.walkingBoards)
                  const normal = allBoards.filter(b => b.status === 'normal').length
                  const damaged = allBoards.filter(b => ['minor_damage', 'severe_damage', 'fracture_risk'].includes(b.status)).length
                  const other = allBoards.filter(b => ['missing', 'replaced'].includes(b.status)).length
                  return (
                    <>
                      <div className={`text-center p-2 rounded ${theme === 'night' ? 'bg-green-500/10' : 'bg-green-50'}`}>
                        <div className="text-lg font-bold text-green-500">{normal}</div>
                        <div className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>正常</div>
                      </div>
                      <div className={`text-center p-2 rounded ${theme === 'night' ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
                        <div className="text-lg font-bold text-orange-500">{damaged}</div>
                        <div className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>损坏</div>
                      </div>
                      <div className={`text-center p-2 rounded ${theme === 'night' ? 'bg-gray-500/10' : 'bg-gray-100'}`}>
                        <div className="text-lg font-bold text-gray-500">{other}</div>
                        <div className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>其他</div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* 孔位列表 */}
            <div className={`p-4 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700' : 'bg-gray-50 border border-gray-200'}`}>
              <h3 className={`text-sm font-semibold mb-3 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>孔位详情</h3>
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {bridge.spans.map(span => {
                    const upstream = span.walkingBoards.filter(b => b.position === 'upstream').length
                    const downstream = span.walkingBoards.filter(b => b.position === 'downstream').length
                    const shelter = span.walkingBoards.filter(b => b.position.startsWith('shelter')).length
                    const riskBoards = span.walkingBoards.filter(b => ['severe_damage', 'fracture_risk'].includes(b.status)).length
                    return (
                      <div key={span.id} className={`p-2 rounded border ${riskBoards > 0 ? 'border-red-500/30 bg-red-500/5' : theme === 'night' ? 'border-slate-700 bg-slate-800/30' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`font-medium text-sm ${theme === 'night' ? 'text-white' : 'text-gray-900'}`}>第{span.spanNumber}孔</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>{span.spanLength}m</span>
                            {riskBoards > 0 && <Badge variant="outline" className="text-xs text-red-500 border-red-500/50">⚠{riskBoards}块损坏</Badge>}
                          </div>
                        </div>
                        <div className={`text-xs mt-1 space-x-3 ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>
                          <span>上行:{upstream}块</span>
                          <span>下行:{downstream}块</span>
                          {shelter > 0 && <span>避车台:{shelter}块</span>}
                          <span>材质:{BOARD_MATERIAL_CONFIG[span.boardMaterial]?.label || span.boardMaterial}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
