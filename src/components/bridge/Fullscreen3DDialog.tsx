'use client'

import dynamic from 'next/dynamic'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import type { Bridge } from '@/types/bridge'

// 动态导入3D组件（禁用SSR）
const HomeBridge3D = dynamic(() => import('@/components/3d/HomeBridge3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">加载3D场景...</p>
      </div>
    </div>
  )
})

interface Fullscreen3DDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  theme: 'day' | 'night'
  bridge: Bridge | null
  spanIndex: number
  setSpanIndex: React.Dispatch<React.SetStateAction<number>>
  render3DBridge: () => React.ReactNode
}

export default function Fullscreen3DDialog({
  open,
  onOpenChange,
  theme,
  bridge,
  spanIndex,
  setSpanIndex,
  render3DBridge,
}: Fullscreen3DDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-[95vw] w-[95vw] h-[95vh] max-h-[95vh] p-0`}>
        <div className="relative w-full h-full">
          {/* 关闭按钮 */}
          <button
            onClick={() => onOpenChange(false)}
            className={`absolute top-4 right-4 z-50 p-2 rounded-lg transition-colors ${
              theme === 'night'
                ? 'bg-slate-800/80 text-cyan-400 hover:bg-slate-700 border border-cyan-500/30'
                : 'bg-white/80 text-blue-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>

          {/* 孔位切换 */}
          {bridge && bridge.spans.length > 1 && (
            <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSpanIndex(Math.max(0, spanIndex - 1))}
                disabled={spanIndex === 0}
                className={theme === 'night' ? 'bg-slate-800/80 text-cyan-400 hover:bg-slate-700 border border-cyan-500/30' : 'bg-white/80 text-blue-600 hover:bg-gray-100 border border-gray-200'}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                theme === 'night' ? 'bg-slate-800/80 text-cyan-400 border border-cyan-500/30' : 'bg-white/80 text-blue-600 border border-gray-200'
              }`}>
                第 {spanIndex + 1} 孔 / 共 {bridge.totalSpans} 孔
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSpanIndex(Math.min(bridge.spans.length - 1, spanIndex + 1))}
                disabled={spanIndex === bridge.spans.length - 1}
                className={theme === 'night' ? 'bg-slate-800/80 text-cyan-400 hover:bg-slate-700 border border-cyan-500/30' : 'bg-white/80 text-blue-600 hover:bg-gray-100 border border-gray-200'}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* 3D视图 */}
          <div className="w-full h-full">
            {render3DBridge()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
