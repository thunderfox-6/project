'use client'

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Badge } from '@/components/ui/badge'
import {
  Train,
  AlertTriangle,
  ShieldAlert,
  Users,
  Clock,
  Navigation,
  Activity,
  CheckSquare,
  Square,
  Ruler,
  Palette,
} from 'lucide-react'
import {
  BOARD_STATUS_CONFIG,
  BOARD_MATERIAL_CONFIG,
  getStatusColorClass,
  getBoardsByPosition,
} from '@/lib/bridge-constants'
import type { WalkingBoard, BridgeSpan, Bridge } from '@/types/bridge'

interface Bridge2DViewProps {
  selectedBridge: Bridge
  selectedSpanIndex: number
  bridgeViewMode: 'single' | 'full'
  highRiskFilter: boolean
  theme: string
  batchMode: boolean
  selectedBoards: string[]
  visibleSpanIndex: number
  fullBridgeScrollRef: React.RefObject<HTMLDivElement | null>
  spanRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  hasPermission: (perm: string) => boolean
  onEditBoard: (board: WalkingBoard) => void
  onToggleBoardSelection: (id: string) => void
  onScrollToSpan: (index: number) => void
  onSetSelectedSpanIndex: (index: number) => void
  onSetHighRiskFilter: (v: boolean) => void
}

export default function Bridge2DView({
  selectedBridge,
  selectedSpanIndex,
  bridgeViewMode,
  highRiskFilter,
  theme,
  batchMode,
  selectedBoards,
  visibleSpanIndex,
  fullBridgeScrollRef,
  spanRefs,
  hasPermission,
  onEditBoard,
  onToggleBoardSelection,
  onScrollToSpan,
  onSetSelectedSpanIndex,
  onSetHighRiskFilter,
}: Bridge2DViewProps) {

  const currentSpan = selectedBridge.spans[selectedSpanIndex]

  // 计算单孔最大行数
  const getSpanMaxRows = (span: BridgeSpan) => {
    const { upstreamColumns, downstreamColumns } = getBoardsByPosition(span)
    const uMax = upstreamColumns.length > 0 ? Math.max(...upstreamColumns.map(c => c.length)) : 0
    const dMax = downstreamColumns.length > 0 ? Math.max(...downstreamColumns.map(c => c.length)) : 0
    return Math.max(uMax, dMax)
  }

  // 渲染单块步行板按钮（含悬停气泡）
  const renderBoardBtn = (board: WalkingBoard) => {
    const colors = getStatusColorClass(board.status)
    const isSelected = selectedBoards.includes(board.id)
    const statusCfg = BOARD_STATUS_CONFIG[board.status as keyof typeof BOARD_STATUS_CONFIG] || BOARD_STATUS_CONFIG.normal
    const posLabelMap: Record<string, string> = {
      upstream: '上行', downstream: '下行',
      shelter_left: '上行避车台', shelter_right: '下行避车台', shelter: '避车台'
    }
    const posLabel = posLabelMap[board.position] || board.position
    const isHighRisk = board.status === 'severe_damage' || board.status === 'fracture_risk'
    const isFiltered = highRiskFilter && !isHighRisk

    return (
      <HoverCard key={board.id} openDelay={200}>
        <HoverCardTrigger asChild>
          <button
            onClick={() => { if (hasPermission('board:write')) { batchMode ? onToggleBoardSelection(board.id) : onEditBoard(board) } }}
            className={`board-cell-2d relative w-11 h-9 rounded flex items-center justify-center text-[14px] font-bold transition-all hover:scale-110 ${isSelected ? 'ring-2 ring-purple-500 ring-offset-1' : ''} ${board.status === 'fracture_risk' ? 'fracture-border-blink' : ''} ${isFiltered ? 'opacity-30' : ''}`}
            style={{ background: isFiltered ? 'rgba(107, 114, 128, 0.2)' : colors.bg, border: `${board.status === 'fracture_risk' ? '3px' : '2px'} solid ${isFiltered ? 'rgba(107, 114, 128, 0.3)' : colors.border}`, color: isFiltered ? '#6b7280' : colors.color, boxShadow: (board.status === 'fracture_risk' && !isFiltered) ? '0 0 12px rgba(239, 68, 68, 0.5)' : 'none' }}
          >
            {batchMode && (
              <div className="absolute -top-1 -left-1">
                {isSelected ? (
                  <CheckSquare className="w-3 h-3 text-purple-500" />
                ) : (
                  <Square className="w-3 h-3 text-slate-400" />
                )}
              </div>
            )}
            {board.boardNumber}
          </button>
        </HoverCardTrigger>
        <HoverCardContent side="top" className={`w-52 p-3 text-xs ${theme === 'night' ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'}`} sideOffset={4}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`font-bold ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>{posLabel} {board.columnIndex}列 {board.boardNumber}号</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color }}>{statusCfg.label}</span>
            </div>
            {board.inspectedBy && (
              <div className={`flex items-center gap-1.5 ${theme === 'night' ? 'text-slate-300' : 'text-gray-600'}`}>
                <Users className="w-3 h-3 flex-shrink-0" />
                <span>{board.inspectedBy}</span>
              </div>
            )}
            {board.inspectedAt && (
              <div className={`flex items-center gap-1.5 ${theme === 'night' ? 'text-slate-300' : 'text-gray-600'}`}>
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>{new Date(board.inspectedAt).toLocaleString('zh-CN')}</span>
              </div>
            )}
            {board.damageDesc && (
              <div className={`pt-1 border-t ${theme === 'night' ? 'border-slate-700 text-orange-300' : 'border-gray-100 text-orange-600'}`}>
                {board.damageDesc}
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    )
  }

  // 渲染避车台
  const renderShelter = (boards: WalkingBoard[], label: string, maxPeople: number) => {
    if (boards.length === 0) return null
    return (
      <div
        className="mt-2 p-1.5 rounded-lg"
        style={{
          background: theme === 'night' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)',
          border: `2px dashed ${theme === 'night' ? '#a78bfa' : '#8b5cf6'}`
        }}
      >
        <div className={`text-[10px] font-bold mb-1 flex items-center gap-1 ${theme === 'night' ? 'text-purple-400' : 'text-purple-600'}`}>
          <ShieldAlert className="w-3 h-3" />
          <span title={`限${maxPeople}人，禁止集中避车`}>{label} (限{maxPeople}人)</span>
        </div>
        <div className="flex flex-wrap gap-0.5">
          {boards.map((board) => {
            const colors = getStatusColorClass(board.status)
            const isSelected = selectedBoards.includes(board.id)
            const isHighRisk = board.status === 'severe_damage' || board.status === 'fracture_risk'
            const isFiltered = highRiskFilter && !isHighRisk

            return (
              <button
                key={board.id}
                onClick={() => { if (hasPermission('board:write')) { batchMode ? onToggleBoardSelection(board.id) : onEditBoard(board) } }}
                className={`w-11 h-9 rounded flex items-center justify-center text-[14px] font-bold transition-all hover:scale-110 relative ${board.status === 'fracture_risk' ? 'fracture-border-blink' : ''} ${isSelected ? 'ring-2 ring-purple-500 ring-offset-1' : ''} ${isFiltered ? 'opacity-30' : ''}`}
                style={{ background: isFiltered ? 'rgba(107, 114, 128, 0.2)' : colors.bg, border: `${board.status === 'fracture_risk' ? '3px' : '2px'} solid ${isFiltered ? 'rgba(107, 114, 128, 0.3)' : colors.border}`, color: isFiltered ? '#6b7280' : colors.color, boxShadow: (board.status === 'fracture_risk' && !isFiltered) ? '0 0 12px rgba(239, 68, 68, 0.5)' : 'none' }}
              >
                {batchMode && (
                  <div className="absolute -top-1 -left-1">
                    {isSelected ? (
                      <CheckSquare className="w-3 h-3 text-purple-500" />
                    ) : (
                      <Square className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                )}
                {board.boardNumber}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 渲染轨道栏
  const renderTrackColumn = (span: BridgeSpan, spanHeight: number, isActive: boolean, showShelterExtension: boolean) => {
    const hasRisk = span.walkingBoards.some(b => b.status === 'fracture_risk')
    const sleeperSpacing = 19
    const sleeperCount = Math.max(1, Math.floor(spanHeight / sleeperSpacing))

    return (
      <div className="relative w-full flex flex-col">
        {/* 步行板区域对应轨道 */}
        <div className="relative w-full" style={{ height: spanHeight }}>
          <div className="absolute left-1 top-0 bottom-0 w-1.5 rounded-sm" style={{ background: '#333333' }} />
          <div className="absolute right-1 top-0 bottom-0 w-1.5 rounded-sm" style={{ background: '#333333' }} />
          {Array.from({ length: sleeperCount }).map((_, si) => (
            <div
              key={si}
              className="absolute rounded-[1px]"
              style={{
                top: (si + 0.5) * sleeperSpacing,
                left: '6px',
                right: '6px',
                height: '5px',
                background: hasRisk
                  ? (theme === 'night' ? 'rgba(139,69,19,0.5)' : 'rgba(139,69,19,0.45)')
                  : (theme === 'night' ? 'rgba(139,69,19,0.4)' : 'rgba(139,69,19,0.35)')
              }}
            />
          ))}
          <span
            className={`absolute z-10 font-bold ${isActive ? (theme === 'night' ? 'text-cyan-400' : 'text-blue-600') : (theme === 'night' ? 'text-slate-500' : 'text-gray-400')}`}
            style={{
              writingMode: 'vertical-rl',
              fontSize: '10px',
              letterSpacing: '2px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textShadow: theme === 'night' ? '0 0 4px rgba(0,0,0,0.8)' : '0 0 4px rgba(255,255,255,0.9)'
            }}
          >
            {span.spanNumber}孔
          </span>
        </div>
        {/* 避车台区域对应轨道延伸 */}
        {showShelterExtension && (
          <div className="relative w-full mt-2" style={{ height: 50 }}>
            <div className="absolute left-1 top-0 bottom-0 w-1.5 rounded-sm" style={{ background: '#333333' }} />
            <div className="absolute right-1 top-0 bottom-0 w-1.5 rounded-sm" style={{ background: '#333333' }} />
            {Array.from({ length: 2 }).map((_, si) => (
              <div
                key={si}
                className="absolute rounded-[1px]"
                style={{
                  top: (si + 0.5) * 19,
                  left: '6px',
                  right: '6px',
                  height: '5px',
                  background: theme === 'night' ? 'rgba(139,69,19,0.4)' : 'rgba(139,69,19,0.35)'
                }}
              />
            ))}
            <span
              className={`absolute z-10 font-bold ${theme === 'night' ? 'text-purple-400' : 'text-purple-600'}`}
              style={{
                writingMode: 'vertical-rl',
                fontSize: '9px',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textShadow: theme === 'night' ? '0 0 4px rgba(0,0,0,0.8)' : '0 0 4px rgba(255,255,255,0.9)'
              }}
            >
              避车台
            </span>
          </div>
        )}
      </div>
    )
  }

  // ==================== 整桥模式 ====================
  if (bridgeViewMode === 'full') {
    const allBoards = selectedBridge.spans.flatMap(s => s.walkingBoards)
    const totalBoards = allBoards.length
    const damagedBoards = allBoards.filter(b => b.status !== 'normal' && b.status !== 'replaced').length
    const damageRate = totalBoards > 0 ? damagedBoards / totalBoards : 0
    const isHighDamage = damageRate > 0.1

    return (
      <div
        ref={fullBridgeScrollRef}
        className={`bridge-2d-container w-full h-full flex flex-col items-center p-4 overflow-auto ${theme === 'night' ? '' : 'bg-gray-50'}`}
      >
        {/* 桥梁名称 + 整桥统计 */}
        <div className="text-center mb-2 sticky top-0 z-10 bg-inherit py-1">
          <span className={`text-lg font-bold ${theme === 'night' ? 'text-cyan-400 text-glow-cyan' : 'text-blue-600'}`}>{selectedBridge.name}</span>
          <span className={`text-sm ml-2 ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>({selectedBridge.spans.length}孔)</span>
        </div>
        <div className={`w-full max-w-4xl mb-3 p-2 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center justify-center gap-4 text-xs">
            <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>总板数 <b className={theme === 'night' ? 'text-white' : 'text-gray-900'}>{totalBoards}</b></span>
            <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>损坏 <b className={damagedBoards > 0 ? (isHighDamage ? 'text-red-500' : 'text-orange-500') : (theme === 'night' ? 'text-green-400' : 'text-green-600')}>{damagedBoards}</b></span>
            <span className={`px-2 py-0.5 rounded font-bold ${isHighDamage ? (theme === 'night' ? 'bg-red-500/30 text-red-400' : 'bg-red-100 text-red-600') : damagedBoards > 0 ? (theme === 'night' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600') : (theme === 'night' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600')}`}>
              损坏率 {(damageRate * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 风险热力图 */}
        <div className={`w-full max-w-4xl mb-3 p-3 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
          <div className="text-xs font-bold mb-2 flex items-center gap-2">
            <Activity className={`w-4 h-4 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-500'}`} />
            <span className={theme === 'night' ? 'text-slate-300' : 'text-gray-700'}>风险热力图</span>
          </div>
          <div className="flex gap-1 h-8 items-center">
            {selectedBridge.spans.map((span, idx) => {
              const spanDamaged = span.walkingBoards.filter(b => b.status !== 'normal' && b.status !== 'replaced' && b.status !== 'missing').length
              const spanTotal = span.walkingBoards.filter(b => b.status !== 'replaced' && b.status !== 'missing').length
              const rate = spanTotal > 0 ? spanDamaged / spanTotal : 0
              const hasRisk = span.walkingBoards.some(b => b.status === 'fracture_risk')
              const heatColor = hasRisk
                ? `rgba(239, 68, 68, ${0.3 + rate * 0.7})`
                : rate > 0.1
                  ? `rgba(249, 115, 22, ${0.2 + rate * 0.6})`
                  : rate > 0
                    ? `rgba(234, 179, 8, ${0.1 + rate * 0.5})`
                    : 'rgba(34, 197, 94, 0.2)'
              return (
                <button
                  key={span.id}
                  onClick={() => onScrollToSpan(idx)}
                  className="flex-1 h-full rounded transition-all hover:scale-105 relative group"
                  style={{ background: heatColor, minWidth: '20px' }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
                    {span.spanNumber}
                  </span>
                  <div className={`absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block px-2 py-1 rounded text-[10px] whitespace-nowrap z-20 ${theme === 'night' ? 'bg-slate-700 text-white' : 'bg-gray-800 text-white'}`}>
                    第{span.spanNumber}孔: {(rate * 100).toFixed(0)}%
                  </div>
                </button>
              )
            })}
            {/* 图例 */}
            <div className="ml-3 flex items-center gap-2 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(34, 197, 94, 0.2)' }} />
                <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>正常</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(234, 179, 8, 0.5)' }} />
                <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>轻微</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(249, 115, 22, 0.6)' }} />
                <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>严重</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(239, 68, 68, 0.7)' }} />
                <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>断裂</span>
              </div>
            </div>
          </div>
        </div>

        {/* 每孔竖向堆叠 */}
        <div className="w-full max-w-4xl space-y-2">
          {selectedBridge.spans.map((span, spanIdx) => {
            const { upstreamColumns, downstreamColumns, shelterLeft, shelterRight, shelterOld } = getBoardsByPosition(span)
            const maxRows = getSpanMaxRows(span)
            const upstreamShelter = shelterLeft.length > 0 ? shelterLeft : (shelterRight.length === 0 ? shelterOld : [])
            const downstreamShelter = shelterRight.length > 0 ? shelterRight : []
            const isActive = spanIdx === visibleSpanIndex
            const spanTotalBoards = span.walkingBoards.length
            const spanDamaged = span.walkingBoards.filter(b => b.status !== 'normal' && b.status !== 'replaced').length
            const spanDamageRate = spanTotalBoards > 0 ? spanDamaged / spanTotalBoards : 0
            const spanHighDamage = spanDamageRate > 0.1
            const hasRisk = span.walkingBoards.some(b => b.status === 'fracture_risk')
            const hasUpstreamShelter = upstreamShelter.length > 0
            const hasDownstreamShelter = downstreamShelter.length > 0
            const spanHeight = maxRows * 38

            return (
              <div
                key={span.id}
                ref={el => { spanRefs.current[spanIdx] = el }}
                data-span-index={spanIdx}
                onClick={() => onSetSelectedSpanIndex(spanIdx)}
                className={`w-full text-left p-3 rounded-lg transition-all relative cursor-pointer ${isActive ? (theme === 'night' ? 'bg-slate-800/60 ring-2 ring-cyan-500/50' : 'bg-blue-50 ring-2 ring-blue-300') : (theme === 'night' ? 'bg-slate-900/30 hover:bg-slate-800/40' : 'bg-gray-50 hover:bg-gray-100')}`}
              >
                {/* 孔标题 + 统计 */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isActive ? (theme === 'night' ? 'text-cyan-400' : 'text-blue-600') : (theme === 'night' ? 'text-slate-400' : 'text-gray-500')}`}>
                      第{span.spanNumber}孔
                    </span>
                    <span className={`text-xs ${theme === 'night' ? 'text-slate-500' : 'text-gray-400'}`}>({span.spanLength}m)</span>
                    {hasRisk && <span className="text-red-500 text-xs font-bold">⚠ 断裂风险</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>{spanTotalBoards}块</span>
                    {spanDamaged > 0 && (
                      <span className={`px-1.5 py-0.5 rounded font-bold ${spanHighDamage ? (theme === 'night' ? 'bg-red-500/30 text-red-400' : 'bg-red-100 text-red-600') : (theme === 'night' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600')}`}>
                        损坏率 {(spanDamageRate * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* 三栏布局：上行 | 轨道 | 下行 */}
                <div className="flex flex-row items-stretch gap-1">
                  {/* 上行步行板 */}
                  <div className="flex-1">
                    <div className={`text-[10px] mb-1 flex items-center gap-1 ${theme === 'night' ? 'text-blue-400' : 'text-blue-600'}`}>
                      <Navigation className="w-3 h-3" />上行
                    </div>
                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${span.upstreamColumns}, 1fr)` }}>
                      {upstreamColumns.map((column, colIdx) => (
                        <div key={colIdx} className="flex flex-col gap-0.5">
                          {Array.from({ length: maxRows }).map((_, rowIdx) => {
                            const board = column[rowIdx]
                            return board ? renderBoardBtn(board) : <div key={`fu-${rowIdx}`} className="w-11 h-9" />
                          })}
                        </div>
                      ))}
                    </div>
                    {renderShelter(upstreamShelter, '上行避车台', span.shelterMaxPeople)}
                  </div>

                  {/* 轨道 */}
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: '18%' }}>
                    <div className="h-4 mb-1 flex items-center justify-center w-full">
                      <Train className={`w-3 h-3 ${theme === 'night' ? 'text-slate-500' : 'text-gray-400'}`} />
                    </div>
                    {renderTrackColumn(span, spanHeight, isActive, hasUpstreamShelter || hasDownstreamShelter)}
                  </div>

                  {/* 下行步行板 */}
                  <div className="flex-1">
                    <div className={`text-[10px] mb-1 flex items-center gap-1 ${theme === 'night' ? 'text-green-400' : 'text-green-600'}`}>
                      <Navigation className="w-3 h-3 rotate-180" />下行
                    </div>
                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${span.downstreamColumns}, 1fr)` }}>
                      {downstreamColumns.map((column, colIdx) => (
                        <div key={colIdx} className="flex flex-col gap-0.5">
                          {Array.from({ length: maxRows }).map((_, rowIdx) => {
                            const board = column[rowIdx]
                            return board ? renderBoardBtn(board) : <div key={`fd-${rowIdx}`} className="w-11 h-9" />
                          })}
                        </div>
                      ))}
                    </div>
                    {renderShelter(downstreamShelter, '下行避车台', span.shelterMaxPeople)}
                  </div>
                </div>

                {/* 高损坏率红色遮罩 */}
                {spanHighDamage && (
                  <div className="absolute inset-0 rounded-lg pointer-events-none border-2 border-red-500/40" style={{ background: 'rgba(239, 68, 68, 0.06)' }}>
                    <div className="absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold bg-red-500/80 text-white pointer-events-none">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />损坏率 &gt;10%
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 孔位快速跳转栏 */}
        <div className={`sticky bottom-0 mt-4 w-full max-w-4xl p-3 rounded-lg ${theme === 'night' ? 'bg-slate-800/90 border border-slate-700/50 backdrop-blur-sm' : 'bg-white/90 border border-gray-200 backdrop-blur-sm'}`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <button
              onClick={() => onScrollToSpan(0)}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${theme === 'night' ? 'bg-cyan-600/30 text-cyan-300 hover:bg-cyan-600/50' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
            >
              第1孔
            </button>
            {selectedBridge.spans.length >= 5 && (
              <button
                onClick={() => onScrollToSpan(4)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${theme === 'night' ? 'bg-cyan-600/30 text-cyan-300 hover:bg-cyan-600/50' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
              >
                第5孔
              </button>
            )}
            <button
              onClick={() => onScrollToSpan(selectedBridge.spans.length - 1)}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${theme === 'night' ? 'bg-cyan-600/30 text-cyan-300 hover:bg-cyan-600/50' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
            >
              最后1孔
            </button>
          </div>
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {selectedBridge.spans.map((span, idx) => {
              const isActive = idx === visibleSpanIndex
              const hasRisk = span.walkingBoards.some(b => b.status === 'fracture_risk')
              const hasDamage = span.walkingBoards.some(b => b.status === 'severe_damage' || b.status === 'minor_damage')
              return (
                <button
                  key={span.id}
                  onClick={() => onScrollToSpan(idx)}
                  className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${isActive ? (theme === 'night' ? 'bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-500/50' : 'bg-blue-500 text-white') : hasRisk ? (theme === 'night' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-600 hover:bg-red-200') : hasDamage ? (theme === 'night' ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : 'bg-orange-100 text-orange-600 hover:bg-orange-200') : (theme === 'night' ? 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}`}
                >
                  {span.spanNumber}孔
                </button>
              )
            })}
          </div>
        </div>

        {/* 图例 */}
        <div className="mt-3 flex flex-wrap gap-3 justify-center">
          {Object.entries(BOARD_STATUS_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1 text-xs">
              <div className="w-4 h-4 rounded" style={{ background: config.bgColor, border: `1px solid ${config.borderColor}` }} />
              <span style={{ color: config.color }}>{config.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ==================== 单孔模式（默认） ====================
  if (!currentSpan) return null
  const { shelterLeft, shelterRight, shelterOld, upstreamColumns, downstreamColumns } = getBoardsByPosition(currentSpan)
  const materialConfig = BOARD_MATERIAL_CONFIG[currentSpan.boardMaterial] || BOARD_MATERIAL_CONFIG.galvanized_steel
  const upstreamMaxRows = upstreamColumns.length > 0 ? Math.max(...upstreamColumns.map(c => c.length)) : 0
  const downstreamMaxRows = downstreamColumns.length > 0 ? Math.max(...downstreamColumns.map(c => c.length)) : 0
  const maxRows = Math.max(upstreamMaxRows, downstreamMaxRows)
  const upstreamShelter = shelterLeft.length > 0 ? shelterLeft : (shelterRight.length === 0 ? shelterOld : [])
  const downstreamShelter = shelterRight.length > 0 ? shelterRight : []
  const totalBoards = currentSpan.walkingBoards.length
  const damagedBoards = currentSpan.walkingBoards.filter(b => b.status !== 'normal' && b.status !== 'replaced').length
  const damageRate = totalBoards > 0 ? damagedBoards / totalBoards : 0
  const isHighDamage = damageRate > 0.1

  return (
    <div className={`bridge-2d-container w-full h-full flex flex-col items-center p-4 overflow-auto ${theme === 'night' ? '' : 'bg-gray-50'}`}>
      {/* 标题 */}
      <div className="text-center mb-3">
        <span className={`text-xl font-bold ${theme === 'night' ? 'text-cyan-400 text-glow-cyan' : 'text-blue-600'}`}>第{currentSpan.spanNumber}孔</span>
        <span className={`text-sm ml-2 ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>({currentSpan.spanLength}m)</span>
      </div>

      {/* 材质信息 + 本孔统计 */}
      <div className={`w-full max-w-4xl mb-3 p-3 rounded-lg ${theme === 'night' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <Ruler className={`w-4 h-4 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-500'}`} />
              <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>尺寸: {(() => { const sizes = currentSpan.walkingBoards.map(b => `${b.boardLength || 100}×${b.boardWidth || 50}×${b.boardThickness || 5}`); const unique = [...new Set(sizes)]; return unique.length === 1 ? unique[0] + 'cm' : '多种'; })()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Palette className={`w-4 h-4 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-500'}`} />
              <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>材质: {materialConfig.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>总板数 <b className={theme === 'night' ? 'text-white' : 'text-gray-900'}>{totalBoards}</b></span>
            <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>损坏 <b className={damagedBoards > 0 ? (isHighDamage ? 'text-red-500' : 'text-orange-500') : (theme === 'night' ? 'text-green-400' : 'text-green-600')}>{damagedBoards}</b></span>
            <span className={`px-2 py-0.5 rounded font-bold ${isHighDamage ? (theme === 'night' ? 'bg-red-500/30 text-red-400' : 'bg-red-100 text-red-600') : damagedBoards > 0 ? (theme === 'night' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600') : (theme === 'night' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600')}`}>
              损坏率 {(damageRate * 100).toFixed(1)}%
            </span>
            {isHighDamage && (
              <span className="flex items-center gap-1 text-red-500 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />高危
              </span>
            )}
            <button
              onClick={() => onSetHighRiskFilter(!highRiskFilter)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all ${highRiskFilter ? (theme === 'night' ? 'bg-red-500/30 text-red-300 ring-1 ring-red-500/50' : 'bg-red-100 text-red-600 ring-1 ring-red-300') : (theme === 'night' ? 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {highRiskFilter ? '显示全部' : '仅显示高危'}
            </button>
          </div>
        </div>
      </div>

      {/* 三栏竖线并排布局：上行 | 轨道 | 下行 */}
      <div className="w-full max-w-4xl relative">
        {isHighDamage && (
          <div className="absolute inset-0 rounded-lg pointer-events-none z-20 border-2 border-red-500/40" style={{ background: 'rgba(239, 68, 68, 0.06)' }}>
            <div className="absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold bg-red-500/80 text-white z-30">
              <AlertTriangle className="w-3 h-3 inline mr-1" />损坏率 &gt;10% 注意安全
            </div>
          </div>
        )}
        <div className="flex flex-row items-stretch gap-1">
          {/* 上行步行板 */}
          <div className="flex-1 flex flex-col">
            <div className={`text-xs mb-2 flex items-center gap-2 ${theme === 'night' ? 'text-blue-400' : 'text-blue-600'}`}>
              <Navigation className="w-4 h-4" />上行步行板
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${currentSpan.upstreamColumns}, 1fr)` }}>
              {upstreamColumns.map((column, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-0.5">
                  {Array.from({ length: maxRows }).map((_, rowIdx) => {
                    const board = column[rowIdx]
                    return board ? renderBoardBtn(board) : (
                      <div key={`empty-${rowIdx}`} className="w-11 h-9" />
                    )
                  })}
                </div>
              ))}
            </div>
            {renderShelter(upstreamShelter, '上行避车台', currentSpan.shelterMaxPeople)}
          </div>

          {/* 轨道 */}
          <div className="flex flex-col items-center flex-shrink-0" style={{ width: '18%' }}>
            <div className="h-5 mb-2 flex items-center justify-center w-full">
              <Train className={`w-3.5 h-3.5 ${theme === 'night' ? 'text-slate-400' : 'text-gray-400'}`} />
            </div>
            {renderTrackColumn(currentSpan, maxRows * 38, true, upstreamShelter.length > 0 || downstreamShelter.length > 0)}
          </div>

          {/* 下行步行板 */}
          <div className="flex-1 flex flex-col">
            <div className={`text-xs mb-2 flex items-center gap-2 ${theme === 'night' ? 'text-green-400' : 'text-green-600'}`}>
              <Navigation className="w-4 h-4 rotate-180" />下行步行板
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${currentSpan.downstreamColumns}, 1fr)` }}>
              {downstreamColumns.map((column, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-0.5">
                  {Array.from({ length: maxRows }).map((_, rowIdx) => {
                    const board = column[rowIdx]
                    return board ? renderBoardBtn(board) : (
                      <div key={`empty-${rowIdx}`} className="w-11 h-9" />
                    )
                  })}
                </div>
              ))}
            </div>
            {renderShelter(downstreamShelter, '下行避车台', currentSpan.shelterMaxPeople)}
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        {Object.entries(BOARD_STATUS_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1 text-xs">
            <div className="w-4 h-4 rounded" style={{ background: config.bgColor, border: `1px solid ${config.borderColor}` }} />
            <span style={{ color: config.color }}>{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
