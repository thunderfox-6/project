'use client'

import { useState, useRef, useMemo, useCallback, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Text, Html, Environment, Float, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, CheckCircle, AlertCircle, XCircle, FileX, Wrench,
  RotateCcw, ZoomIn, ZoomOut, Maximize2, Eye, ShieldAlert, Users
} from 'lucide-react'

// 类型定义
interface WalkingBoard {
  id: string
  boardNumber: number
  position: string
  columnIndex: number
  status: string
  damageDesc: string | null
  damageCause: string | null
  temporaryProtection: boolean
  rectifyStatus: string
  inspectedBy: string | null
  inspectedAt: string | null
}

interface BridgeSpan {
  id: string
  spanNumber: number
  spanLength: number
  upstreamBoards: number
  downstreamBoards: number
  upstreamColumns: number
  downstreamColumns: number
  hasShelter: boolean
  shelterBoards: number
  shelterMaxPeople: number
  walkingBoards: WalkingBoard[]
}

interface Bridge {
  id: string
  name: string
  bridgeCode: string
  spans: BridgeSpan[]
}

interface Bridge3DViewerProps {
  bridge: Bridge
  onBoardClick: (board: WalkingBoard) => void
  showHighRiskOnly: boolean
}

// 状态颜色映射
const STATUS_COLORS: Record<string, string> = {
  normal: '#22c55e',      // green-500
  minor_damage: '#eab308', // yellow-500
  severe_damage: '#f97316', // orange-500
  fracture_risk: '#ef4444', // red-500
  missing: '#6b7280',     // gray-500
  replaced: '#3b82f6'     // blue-500
}

// 判断是否高危
const isHighRisk = (status: string) => 
  status === 'fracture_risk' || status === 'missing' || status === 'severe_damage'

// 相机控制器 - 45°俯视视角
function CameraController({ spanCount, maxSpanLength }: { spanCount: number; maxSpanLength: number }) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)

  // 计算合适的相机位置
  const cameraDistance = useMemo(() => {
    const totalLength = spanCount * maxSpanLength * 0.15
    return Math.max(15, Math.min(40, totalLength))
  }, [spanCount, maxSpanLength])

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[cameraDistance * 0.7, cameraDistance * 0.7, cameraDistance * 0.5]}
        fov={50}
        near={0.1}
        far={1000}
      />
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={100}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 6}
        target={[0, 0, 0]}
      />
    </>
  )
}

// 单个步行板3D组件
function Board3D({ 
  board, 
  position, 
  size, 
  onClick,
  isSelected
}: { 
  board: WalkingBoard
  position: [number, number, number]
  size: [number, number, number]
  onClick: () => void
  isSelected: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  
  const statusColor = STATUS_COLORS[board.status] || STATUS_COLORS.normal
  const highRisk = isHighRisk(board.status)
  const isFractureRisk = board.status === 'fracture_risk' || board.status === 'missing'

  // 动画效果 - 断裂风险板轻微浮动
  useFrame((state) => {
    if (meshRef.current && isFractureRisk) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05
    }
  })

  // 高亮边框效果
  const edgeColor = highRisk ? '#ff0000' : (hovered ? '#ffffff' : '#333333')
  const edgeWidth = highRisk ? 2 : 1

  return (
    <group position={position}>
      {/* 步行板主体 */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick() }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial 
          color={hovered ? new THREE.Color(statusColor).multiplyScalar(1.3) : statusColor}
          roughness={0.7}
          metalness={0.2}
          transparent={true}
          opacity={isSelected ? 0.9 : 0.85}
        />
      </mesh>
      
      {/* 边框线 */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
        <lineBasicMaterial color={edgeColor} linewidth={edgeWidth} />
      </lineSegments>

      {/* 高危标识 */}
      {highRisk && (
        <Float speed={3} rotationIntensity={0} floatIntensity={0.5}>
          <Billboard position={[0, size[1] + 0.3, 0]}>
            <Text
              fontSize={0.25}
              color="#ff0000"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="#000000"
            >
              ⚠️
            </Text>
          </Billboard>
        </Float>
      )}

      {/* 临时防护标识 */}
      {board.temporaryProtection && (
        <mesh position={[0, size[1] + 0.1, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.2, 8]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
      )}

      {/* 悬停信息卡片 */}
      {hovered && (
        <Html
          position={[0, size[1] + 0.8, 0]}
          center
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-2 text-xs border">
            <div className="font-semibold text-gray-800">
              {board.position === 'upstream' ? '上行' : board.position === 'downstream' ? '下行' : '避车台'}
              -{board.columnIndex}列{board.boardNumber}号
            </div>
            <div className="text-gray-600 mt-1" style={{ color: statusColor }}>
              {board.status === 'normal' ? '正常' : 
               board.status === 'minor_damage' ? '轻微损坏' :
               board.status === 'severe_damage' ? '严重损坏' :
               board.status === 'fracture_risk' ? '断裂风险' :
               board.status === 'missing' ? '缺失' : '已更换'}
            </div>
            {board.damageDesc && (
              <div className="text-gray-500 mt-1 max-w-32 truncate">{board.damageDesc}</div>
            )}
            {highRisk && (
              <div className="text-red-500 font-bold mt-1">⚠️ 禁止踩踏！</div>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}

// 避车台3D组件
function Shelter3D({ 
  span, 
  position,
  onBoardClick 
}: { 
  span: BridgeSpan
  position: [number, number, number]
  onBoardClick: (board: WalkingBoard) => void
}) {
  const shelterBoards = span.walkingBoards.filter(b => b.position === 'shelter')
  const hasHighRisk = shelterBoards.some(b => isHighRisk(b.status))

  return (
    <group position={position}>
      {/* 避车台平台 */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[2.5, 0.1, 3]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.8} />
      </mesh>

      {/* 边框 */}
      <lineSegments position={[0, -0.05, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(2.5, 0.1, 3)]} />
        <lineBasicMaterial color={hasHighRisk ? '#ef4444' : '#f59e0b'} linewidth={2} />
      </lineSegments>

      {/* 避车台步行板 */}
      <group position={[0, 0.05, 0]}>
        {shelterBoards.map((board, idx) => (
          <Board3D
            key={board.id}
            board={board}
            position={[(idx - shelterBoards.length / 2 + 0.5) * 0.6, 0.15, 0]}
            size={[0.5, 0.1, 2.5]}
            onClick={() => onBoardClick(board)}
            isSelected={false}
          />
        ))}
      </group>

      {/* 人数提示牌 */}
      <Billboard position={[0, 0.8, 0]}>
        <Html center>
          <div className="bg-amber-100 border-2 border-amber-400 rounded-lg px-2 py-1 text-xs shadow-lg">
            <div className="flex items-center gap-1 text-amber-700 font-semibold">
              <ShieldAlert className="w-3 h-3" />
              避车台
            </div>
            <div className="flex items-center gap-1 text-amber-600">
              <Users className="w-3 h-3" />
              限{span.shelterMaxPeople}人
            </div>
          </div>
        </Html>
      </Billboard>
    </group>
  )
}

// 单孔桥梁3D组件
function BridgeSpan3D({ 
  span, 
  position,
  onBoardClick,
  showHighRiskOnly
}: { 
  span: BridgeSpan
  position: [number, number, number]
  onBoardClick: (board: WalkingBoard) => void
  showHighRiskOnly: boolean
}) {
  const upstreamBoards = span.walkingBoards.filter(b => b.position === 'upstream')
  const downstreamBoards = span.walkingBoards.filter(b => b.position === 'downstream')
  
  const boardWidth = 0.6
  const boardHeight = 0.1
  const boardDepth = 1.8
  const gap = 0.05
  const columnGap = 0.3

  // 计算桥梁宽度
  const totalWidth = span.spanLength * 0.15

  return (
    <group position={position}>
      {/* 桥梁主体 - 桁架 */}
      <mesh position={[0, -0.3, 0]}>
        <boxGeometry args={[totalWidth, 0.5, 4.5]} />
        <meshStandardMaterial color="#374151" roughness={0.9} metalness={0.3} />
      </mesh>

      {/* 轨道 */}
      <group position={[0, 0.05, 0]}>
        {/* 左轨 */}
        <mesh position={[-0.7, 0, 0]}>
          <boxGeometry args={[totalWidth, 0.1, 0.15]} />
          <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* 右轨 */}
        <mesh position={[0.7, 0, 0]}>
          <boxGeometry args={[totalWidth, 0.1, 0.15]} />
          <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* 上行步行板区域 */}
      <group position={[-1.6, 0.15, 0]}>
        {span.upstreamColumns > 1 ? (
          // 多列显示
          Array.from({ length: span.upstreamColumns }).map((_, colIdx) => {
            const colBoards = upstreamBoards.filter(b => b.columnIndex === colIdx + 1)
            const displayBoards = showHighRiskOnly ? colBoards.filter(b => isHighRisk(b.status)) : colBoards
            
            return (
              <group key={colIdx} position={[0, 0, (colIdx - (span.upstreamColumns - 1) / 2) * (boardDepth + columnGap)]}>
                {displayBoards.map((board, idx) => (
                  <Board3D
                    key={board.id}
                    board={board}
                    position={[
                      (idx - displayBoards.length / 2 + 0.5) * (boardWidth + gap),
                      0,
                      0
                    ]}
                    size={[boardWidth, boardHeight, boardDepth]}
                    onClick={() => onBoardClick(board)}
                    isSelected={false}
                  />
                ))}
              </group>
            )
          })
        ) : (
          // 单列显示
          (showHighRiskOnly ? upstreamBoards.filter(b => isHighRisk(b.status)) : upstreamBoards).map((board, idx) => (
            <Board3D
              key={board.id}
              board={board}
              position={[
                (idx - upstreamBoards.length / 2 + 0.5) * (boardWidth + gap),
                0,
                0
              ]}
              size={[boardWidth, boardHeight, boardDepth]}
              onClick={() => onBoardClick(board)}
              isSelected={false}
            />
          ))
        )}
      </group>

      {/* 下行步行板区域 */}
      <group position={[1.6, 0.15, 0]}>
        {span.downstreamColumns > 1 ? (
          Array.from({ length: span.downstreamColumns }).map((_, colIdx) => {
            const colBoards = downstreamBoards.filter(b => b.columnIndex === colIdx + 1)
            const displayBoards = showHighRiskOnly ? colBoards.filter(b => isHighRisk(b.status)) : colBoards
            
            return (
              <group key={colIdx} position={[0, 0, (colIdx - (span.downstreamColumns - 1) / 2) * (boardDepth + columnGap)]}>
                {displayBoards.map((board, idx) => (
                  <Board3D
                    key={board.id}
                    board={board}
                    position={[
                      (idx - displayBoards.length / 2 + 0.5) * (boardWidth + gap),
                      0,
                      0
                    ]}
                    size={[boardWidth, boardHeight, boardDepth]}
                    onClick={() => onBoardClick(board)}
                    isSelected={false}
                  />
                ))}
              </group>
            )
          })
        ) : (
          (showHighRiskOnly ? downstreamBoards.filter(b => isHighRisk(b.status)) : downstreamBoards).map((board, idx) => (
            <Board3D
              key={board.id}
              board={board}
              position={[
                (idx - downstreamBoards.length / 2 + 0.5) * (boardWidth + gap),
                0,
                0
              ]}
              size={[boardWidth, boardHeight, boardDepth]}
              onClick={() => onBoardClick(board)}
              isSelected={false}
            />
          ))
        )}
      </group>

      {/* 避车台 */}
      {span.hasShelter && (
        <Shelter3D 
          span={span} 
          position={[0, 0, 2.8]}
          onBoardClick={onBoardClick}
        />
      )}

      {/* 孔号标签 */}
      <Billboard position={[totalWidth / 2 + 0.5, 0.5, 0]}>
        <Html center>
          <div className="bg-slate-800 text-white px-2 py-1 rounded text-xs font-bold shadow-lg">
            第{span.spanNumber}孔
            <div className="text-slate-300 font-normal">{span.spanLength}m</div>
          </div>
        </Html>
      </Billboard>
    </group>
  )
}

// 整体桥梁3D场景
function BridgeScene({ 
  bridge, 
  onBoardClick,
  showHighRiskOnly 
}: { 
  bridge: Bridge
  onBoardClick: (board: WalkingBoard) => void
  showHighRiskOnly: boolean
}) {
  const maxSpanLength = Math.max(...bridge.spans.map(s => s.spanLength))
  const spanWidth = maxSpanLength * 0.15
  const totalWidth = bridge.spans.length * (spanWidth + 0.5)

  return (
    <>
      {/* 环境光 */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />

      {/* 地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#1e293b" roughness={1} />
      </mesh>

      {/* 网格参考线 */}
      <gridHelper args={[100, 100, '#334155', '#1e293b']} position={[0, -0.55, 0]} />

      {/* 桥梁各孔 */}
      {bridge.spans.map((span, idx) => (
        <BridgeSpan3D
          key={span.id}
          span={span}
          position={[(idx - (bridge.spans.length - 1) / 2) * (spanWidth + 0.5), 0, 0]}
          onBoardClick={onBoardClick}
          showHighRiskOnly={showHighRiskOnly}
        />
      ))}

      {/* 相机控制 */}
      <CameraController spanCount={bridge.spans.length} maxSpanLength={maxSpanLength} />
    </>
  )
}

// 加载中提示
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#ef4444" wireframe />
    </mesh>
  )
}

// 主组件
export default function Bridge3DViewer({ bridge, onBoardClick, showHighRiskOnly }: Bridge3DViewerProps) {
  const [resetKey, setResetKey] = useState(0)

  const handleReset = useCallback(() => {
    setResetKey(prev => prev + 1)
  }, [])

  return (
    <div className="relative w-full h-full">
      {/* 3D Canvas */}
      <Canvas
        key={resetKey}
        shadows
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={<LoadingFallback />}>
          <BridgeScene 
            bridge={bridge} 
            onBoardClick={onBoardClick}
            showHighRiskOnly={showHighRiskOnly}
          />
        </Suspense>
      </Canvas>

      {/* 控制面板 */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          className="bg-white/90 backdrop-blur-sm shadow-lg"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          重置视角
        </Button>
      </div>

      {/* 图例 */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="text-xs font-semibold text-gray-700 mb-2">步行板状态</div>
        <div className="space-y-1">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
              <span className="text-gray-600">
                {status === 'normal' ? '正常' :
                 status === 'minor_damage' ? '轻微损坏' :
                 status === 'severe_damage' ? '严重损坏' :
                 status === 'fracture_risk' ? '断裂风险' :
                 status === 'missing' ? '缺失' : '已更换'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 操作提示 */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg text-xs text-gray-500">
        <div>🖱️ 左键旋转 | 右键平移 | 滚轮缩放</div>
        <div>👆 点击步行板查看详情</div>
      </div>
    </div>
  )
}
