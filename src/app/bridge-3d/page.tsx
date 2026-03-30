'use client'

import { useState, useEffect } from 'react'
import Bridge3DProcedural from '@/components/3d/Bridge3DProcedural'
import { Button } from '@/components/ui/button'
import { 
  X, 
  Info
} from 'lucide-react'

export default function Bridge3DPage() {
  const [showInfo, setShowInfo] = useState(false)
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowInfo(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  return (
    <div className="fixed inset-0 bg-[#0a0f1a] z-50">
      {/* 顶部工具栏 */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-slate-900/90 backdrop-blur-sm border-b border-cyan-500/20 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-cyan-400 font-bold text-lg">3D桥梁步行板模型</h1>
            <p className="text-slate-500 text-xs">程序化生成 · 实时渲染</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInfo(!showInfo)}
            className="text-slate-400 hover:text-cyan-400"
          >
            <Info className="w-4 h-4 mr-1" />
            帮助
          </Button>
        </div>
      </div>
      
      {/* 3D场景 */}
      <Bridge3DProcedural />
      
      {/* 帮助信息 */}
      {showInfo && (
        <div className="absolute top-16 right-4 w-80 bg-slate-900/95 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 z-20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-cyan-400 font-bold">操作指南</h3>
            <button onClick={() => setShowInfo(false)} className="text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="text-slate-300 mb-1">🖱️ 鼠标操作</h4>
              <ul className="text-slate-500 text-xs space-y-1">
                <li>• 左键拖动：旋转视角</li>
                <li>• 右键拖动：平移视角</li>
                <li>• 滚轮：缩放视图</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-slate-300 mb-1">🎨 材质参数</h4>
              <ul className="text-slate-500 text-xs space-y-1">
                <li>• 镀锌钢：银灰色金属光泽</li>
                <li>• 防腐木：木纹质感</li>
                <li>• 复合材料：哑光质感</li>
                <li>• 铝合金：高反光金属</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-slate-300 mb-1">🔍 渲染模式</h4>
              <ul className="text-slate-500 text-xs space-y-1">
                <li>• 照片级真实感：PBR物理渲染</li>
                <li>• 线框结构图：显示网格线框</li>
                <li>• 安全检测：高亮关键结构区域</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-slate-300 mb-1">🛤️ 轨道设置</h4>
              <ul className="text-slate-500 text-xs space-y-1">
                <li>• 标准轨距：1435mm（可调）</li>
                <li>• 枕木类型：木质/混凝土</li>
                <li>• 碎石道砟：程序化生成</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-slate-300 mb-1">☀️ 环境光照</h4>
              <ul className="text-slate-500 text-xs space-y-1">
                <li>• HDR环境光照效果</li>
                <li>• 阴天户外场景渲染</li>
                <li>• 光照强度可调节</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* 底部状态栏 */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-slate-900/80 border-t border-cyan-500/20 flex items-center justify-between px-4 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            实时渲染
          </span>
          <span>Three.js WebGL</span>
        </div>
        <div>
          <span>按 ESC 关闭帮助</span>
        </div>
      </div>
    </div>
  )
}
