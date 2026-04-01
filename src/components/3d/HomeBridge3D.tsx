'use client'

import { useEffect, useRef, useState, useCallback, memo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  useBridge3DStore,
  MATERIAL_CONFIGS,
  type MaterialType,
  type RailingStyle,
  type RenderMode,
  type SleeperType
} from '@/lib/bridge3d-store'

// 简化的噪声函数
class SimplexNoise {
  private perm: number[] = []
  
  constructor(seed = Math.random()) {
    const p: number[] = []
    for (let i = 0; i < 256; i++) p[i] = i
    for (let i = 255; i > 0; i--) {
      const j = Math.floor((seed * (i + 1)) % (i + 1))
      ;[p[i], p[j]] = [p[j], p[i]]
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255]
  }
  
  noise2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1)
    const G2 = (3 - Math.sqrt(3)) / 6
    const s = (x + y) * F2
    const i = Math.floor(x + s)
    const j = Math.floor(y + s)
    const t = (i + j) * G2
    const X0 = i - t
    const Y0 = j - t
    const x0 = x - X0
    const y0 = y - Y0
    const i1 = x0 > y0 ? 1 : 0
    const j1 = x0 > y0 ? 0 : 1
    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2
    
    const grad = (hash: number, gx: number, gy: number) => {
      const h = hash & 7
      const u = h < 4 ? gx : gy
      const v = h < 4 ? gy : gx
      return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v)
    }
    
    let n0 = 0, n1 = 0, n2 = 0
    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 >= 0) {
      t0 *= t0
      n0 = t0 * t0 * grad(this.perm[i + this.perm[j]], x0, y0)
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 >= 0) {
      t1 *= t1
      n1 = t1 * t1 * grad(this.perm[i + i1 + this.perm[j + j1]], x1, y1)
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 >= 0) {
      t2 *= t2
      n2 = t2 * t2 * grad(this.perm[i + 1 + this.perm[j + 1]], x2, y2)
    }
    return 70 * (n0 + n1 + n2)
  }
  
  fractal(x: number, y: number, octaves: number, persistence: number): number {
    let total = 0, frequency = 1, amplitude = 1, maxValue = 0
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude
      maxValue += amplitude
      amplitude *= persistence
      frequency *= 2
    }
    return total / maxValue
  }
}

const STATUS_COLORS: Record<string, THREE.Color> = {
  normal: new THREE.Color(0x22c55e),
  minor_damage: new THREE.Color(0xf59e0b),
  severe_damage: new THREE.Color(0xf97316),
  fracture_risk: new THREE.Color(0xef4444),
  missing: new THREE.Color(0x6b7280),
  replaced: new THREE.Color(0x3b82f6)
}

interface BoardData {
  id: string
  boardNumber: number
  position: string
  columnIndex: number
  status: string
  damageDesc?: string | null
  inspectedBy?: string | null
  inspectedAt?: string | null
}

interface BridgeSpanData {
  id?: string
  spanNumber: number
  spanLength: number
  upstreamBoards: number
  downstreamBoards: number
  upstreamColumns: number
  downstreamColumns: number
  shelterSide: string
  shelterBoards: number
  shelterMaxPeople: number
  boardMaterial?: string
  walkingBoards: BoardData[]
}

interface HomeBridge3DProps {
  span: BridgeSpanData
  theme?: 'day' | 'night'
  onBoardClick?: (board: BoardData) => void
  isMobile?: boolean
}

// View presets for camera
const VIEW_PRESETS: Record<string, { position: number[]; target: number[] }> = {
  front: { position: [0, 2, 15], target: [0, 0, -5] },
  side: { position: [20, 5, -5], target: [0, 0, -5] },
  top: { position: [0, 25, -5], target: [0, 0, -5] },
  inspection: { position: [3, 1.5, -3], target: [0, 0.4, -5] }
}

const STATUS_LABELS: Record<string, string> = {
  normal: '正常',
  minor_damage: '轻微损坏',
  severe_damage: '严重损坏',
  fracture_risk: '断裂风险',
  replaced: '已更换',
  missing: '缺失'
}

function HomeBridge3D({ span, theme = 'night', onBoardClick, isMobile }: HomeBridge3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const boardMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const boardDataMapRef = useRef<Map<string, BoardData>>(new Map())
  const noiseRef = useRef<SimplexNoise>(new SimplexNoise())
  const envMapRef = useRef<THREE.DataTexture | null>(null)
  const labelSpritesRef = useRef<THREE.Sprite[]>([])
  const warningSpritesRef = useRef<THREE.Sprite[]>([])
  const waterRef = useRef<THREE.Mesh | null>(null)
  const cameraTargetRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; lerping: boolean }>({
    pos: new THREE.Vector3(12, 6, 15),
    target: new THREE.Vector3(0, 0, -5),
    lerping: false
  })
  const hoveredBoardRef = useRef<string | null>(null)
  const animFrameRef = useRef<number>(0)

  const { config, setConfig, regenerate } = useBridge3DStore()
  const [isReady, setIsReady] = useState(false)
  const [showBoardNumbers, setShowBoardNumbers] = useState(true)
  const [hoveredBoardInfo, setHoveredBoardInfo] = useState<{
    x: number; y: number; board: BoardData
  } | null>(null)
  
  const createHDREnvironmentMap = useCallback(() => {
    const size = 256
    const data = new Float32Array(size * size * 4)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        const theta = (x / size) * Math.PI * 2
        const phi = (y / size) * Math.PI
        const skyBrightness = 0.8 + Math.cos(phi) * 0.2
        const groundReflection = Math.max(0, -Math.cos(phi)) * 0.3
        data[i] = (0.6 + Math.sin(theta) * 0.1) * skyBrightness + groundReflection * 0.4
        data[i + 1] = (0.65 + Math.sin(theta + 1) * 0.1) * skyBrightness + groundReflection * 0.35
        data[i + 2] = (0.7 + Math.sin(theta + 2) * 0.1) * skyBrightness + groundReflection * 0.3
        data[i + 3] = 1
      }
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType)
    texture.mapping = THREE.EquirectangularReflectionMapping
    texture.needsUpdate = true
    return texture
  }, [])
  
  const generateTextures = useCallback((matType: MaterialType) => {
    const noise = noiseRef.current
    const size = 512
    const matConfig = MATERIAL_CONFIGS[matType]
    const baseColor = matConfig.baseColor
    
    const colorCanvas = document.createElement('canvas')
    colorCanvas.width = size
    colorCanvas.height = size
    const colorCtx = colorCanvas.getContext('2d')!
    const imageData = colorCtx.createImageData(size, size)
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        const noise1 = noise.fractal(x / 50, y / 50, 4, 0.5)
        const scratch = noise.noise2D(x / 100, y / 10) * config.scratchLevel
        const dirt = noise.fractal(x / 40, y / 40, 3, 0.5) * config.dirtLevel
        
        let r = baseColor.r * 255
        let g = baseColor.g * 255
        let b = baseColor.b * 255
        
        const variation = (noise1 * 0.1 + scratch)
        r = Math.max(0, Math.min(255, r * (1 + variation) - dirt * 25))
        g = Math.max(0, Math.min(255, g * (1 + variation) - dirt * 30))
        b = Math.max(0, Math.min(255, b * (1 + variation) - dirt * 35))
        
        imageData.data[i] = r
        imageData.data[i + 1] = g
        imageData.data[i + 2] = b
        imageData.data[i + 3] = 255
      }
    }
    colorCtx.putImageData(imageData, 0, 0)
    
    return { colorTexture: new THREE.CanvasTexture(colorCanvas) }
  }, [config.scratchLevel, config.dirtLevel])

  // Create board number label sprite
  const createNumberSprite = useCallback((text: string | number, color = '#ffffff'): THREE.Sprite => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.roundRect(0, 0, 64, 32, 4)
    ctx.fill()
    ctx.fillStyle = color
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(text), 32, 16)
    const texture = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(0.4, 0.2, 1)
    return sprite
  }, [])

  // Create warning sprite for high-risk boards
  const createWarningSprite = useCallback((): THREE.Sprite => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ff0000'
    ctx.font = 'bold 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('\u26A0', 32, 32) // ⚠ symbol
    const texture = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(0.4, 0.4, 1)
    return sprite
  }, [])

  // Create water surface
  const createWaterSurface = useCallback((length: number): THREE.Mesh => {
    const waterGeom = new THREE.PlaneGeometry(30, length + 20, 32, 32)
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1a6fa8,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      metalness: 0.6,
      side: THREE.DoubleSide
    })
    const water = new THREE.Mesh(waterGeom, waterMat)
    water.rotation.x = -Math.PI / 2
    water.position.set(0, -3.3, -length / 2)
    water.name = 'waterSurface'
    return water
  }, [])
  
  // 创建水平钢轨 - 工字钢形状，水平放置在桥面上
  const createRail = useCallback((length: number) => {
    // 工字钢轨参数 (单位: 米)
    const railHeight = 0.176  // 176mm 轨高
    const headWidth = 0.073   // 73mm 轨头宽
    const headHeight = 0.030  // 30mm 轨头高
    const webWidth = 0.017    // 17mm 腰宽
    const webHeight = 0.116   // 116mm 腰高
    const baseWidth = 0.150   // 150mm 轨底宽
    const baseHeight = 0.030  // 30mm 轨底高
    
    // 创建工字钢断面形状
    const shape = new THREE.Shape()
    
    // 从左下角开始绘制工字钢断面
    shape.moveTo(-baseWidth / 2, 0)
    shape.lineTo(baseWidth / 2, 0)
    shape.lineTo(baseWidth / 2, baseHeight)
    shape.lineTo(-webWidth / 2, baseHeight)
    shape.lineTo(-webWidth / 2, baseHeight + webHeight)
    shape.lineTo(-headWidth / 2, baseHeight + webHeight)
    shape.lineTo(-headWidth / 2, railHeight)
    shape.lineTo(headWidth / 2, railHeight)
    shape.lineTo(headWidth / 2, baseHeight + webHeight)
    shape.lineTo(webWidth / 2, baseHeight + webHeight)
    shape.lineTo(webWidth / 2, baseHeight)
    shape.lineTo(baseWidth / 2, baseHeight)
    // 闭合
    shape.lineTo(-baseWidth / 2, baseHeight)
    shape.lineTo(-baseWidth / 2, 0)
    
    // 沿Z轴拉伸
    const geometry = new THREE.ExtrudeGeometry(shape, {
      steps: Math.ceil(length * 5),
      depth: length,
      bevelEnabled: false
    })

    // 默认ExtrudeGeometry沿+Z延伸，桥梁沿-Z方向延伸
    // 将钢轨平移使其从 z=0 延伸到 z=-length
    geometry.translate(0, 0, -length)

    return geometry
  }, [])
  
  // 创建桥墩
  const createBridgePiers = useCallback((bridgeLength: number) => {
    const group = new THREE.Group()
    
    const pierMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.9,
      metalness: 0.1
    })
    
    // 桥梁两端设置桥墩
    const pierPositions = [0, bridgeLength]
    
    pierPositions.forEach((z) => {
      // 桥墩主体 - 梯形截面
      const pierHeight = 2.5
      const pierTopWidth = 1.8
      const pierBottomWidth = 2.5
      const pierDepth = 1.2
      
      const pierGeometry = new THREE.BoxGeometry(pierTopWidth, pierHeight, pierDepth)
      const pier = new THREE.Mesh(pierGeometry, pierMaterial)
      pier.position.set(0, -pierHeight / 2, -z)
      group.add(pier)
      
      // 墩帽
      const capGeometry = new THREE.BoxGeometry(pierTopWidth + 0.4, 0.3, pierDepth + 0.4)
      const cap = new THREE.Mesh(capGeometry, pierMaterial.clone())
      cap.position.set(0, -0.15, -z)
      group.add(cap)
    })
    
    return group
  }, [])
  
  // 创建主梁/纵梁
  const createMainBeams = useCallback((length: number) => {
    const group = new THREE.Group()
    
    const beamMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      metalness: 0.8,
      roughness: 0.3
    })
    
    const railGaugeM = config.railGauge / 1000
    
    // 主梁尺寸
    const beamHeight = 0.5
    const beamWidth = 0.25
    
    // 两根主纵梁（在轨道两侧）
    const positions = [-railGaugeM - 0.3, railGaugeM + 0.3]
    
    positions.forEach(x => {
      const beamGeom = new THREE.BoxGeometry(beamWidth, beamHeight, length)
      const beam = new THREE.Mesh(beamGeom, beamMaterial)
      beam.position.set(x, -beamHeight / 2 - 0.5, -length / 2)
      group.add(beam)
    })
    
    return group
  }, [config.railGauge])
  
  // 创建横梁
  const createCrossBeams = useCallback((length: number) => {
    const group = new THREE.Group()
    
    const beamMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a5a5a,
      metalness: 0.7,
      roughness: 0.35
    })
    
    const railGaugeM = config.railGauge / 1000
    const beamHeight = 0.35
    const beamWidth = 0.15
    const beamLength = railGaugeM * 2 + 1.5
    const spacing = 1.5
    const count = Math.ceil(length / spacing)
    
    for (let i = 0; i <= count; i++) {
      const z = -i * spacing
      const beamGeom = new THREE.BoxGeometry(beamLength, beamHeight, beamWidth)
      const beam = new THREE.Mesh(beamGeom, beamMaterial.clone())
      beam.position.set(0, -beamHeight / 2 - 0.25, z)
      group.add(beam)
    }
    
    return group
  }, [config.railGauge])
  
  // 创建桥枕
  const createSleepers = useCallback((length: number) => {
    const group = new THREE.Group()
    
    const sleeperMaterial = new THREE.MeshStandardMaterial({
      color: config.sleeperType === 'wood' ? 0x5a4030 : 0x606060,
      roughness: config.sleeperType === 'wood' ? 0.9 : 0.7,
      metalness: config.sleeperType === 'wood' ? 0.0 : 0.1
    })
    
    const sleeperWidth = 2.5
    const sleeperHeight = 0.16
    const sleeperDepth = 0.22
    const spacing = 0.6
    
    const sleeperGeom = new THREE.BoxGeometry(sleeperWidth, sleeperHeight, sleeperDepth)
    const count = Math.ceil(length / spacing)
    
    for (let i = 0; i <= count; i++) {
      const sleeper = new THREE.Mesh(sleeperGeom, sleeperMaterial.clone())
      sleeper.position.set(0, sleeperHeight / 2, -i * spacing)
      
      if (config.sleeperType === 'wood') {
        const variation = noiseRef.current.noise2D(i * 0.5, 0) * 0.1
        sleeper.material.color.offsetHSL(variation * 0.1, 0, variation * 0.15)
      }
      
      group.add(sleeper)
    }
    
    return group
  }, [config.sleeperType])
  
  // 创建道砟
  const createBallast = useCallback((length: number) => {
    const group = new THREE.Group()
    const isMobileDevice = (typeof window !== 'undefined' && window.innerWidth < 768) || isMobile
    const count = isMobileDevice ? 100 : 600
    const width = 3.5
    
    const stoneGeom = new THREE.DodecahedronGeometry(0.035)
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x7a7a7a,
      roughness: 0.95,
      metalness: 0.05
    })
    
    const instancedMesh = new THREE.InstancedMesh(stoneGeom, stoneMat, count)
    const matrix = new THREE.Matrix4()
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * width
      const y = -0.1 + Math.random() * 0.15
      const z = -Math.random() * length
      
      const scale = new THREE.Vector3(
        0.5 + Math.random() * 1.5,
        0.5 + Math.random() * 1.5,
        0.5 + Math.random() * 1.5
      )
      const position = new THREE.Vector3(x, y, z)
      const quaternion = new THREE.Quaternion()
      quaternion.setFromEuler(new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ))
      matrix.compose(position, quaternion, scale)
      instancedMesh.setMatrixAt(i, matrix)
    }
    
    group.add(instancedMesh)
    
    // 道砟基础层
    const baseGeom = new THREE.BoxGeometry(width, 0.15, length)
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x5a5a5a,
      roughness: 0.95,
      metalness: 0.05
    })
    const base = new THREE.Mesh(baseGeom, baseMat)
    base.position.set(0, -0.15, -length / 2)
    group.add(base)
    
    return group
  }, [])
  
  // 创建挡砟墙
  const createBallastWall = useCallback((length: number) => {
    const group = new THREE.Group()
    const wallHeight = 0.25
    const wallThickness = 0.12
    const wallOffset = 1.8
    
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x707070,
      roughness: 0.85,
      metalness: 0.1
    })
    
    const wallGeom = new THREE.BoxGeometry(wallThickness, wallHeight, length)
    
    const leftWall = new THREE.Mesh(wallGeom, wallMat)
    leftWall.position.set(-wallOffset, wallHeight / 2, -length / 2)
    group.add(leftWall)
    
    const rightWall = new THREE.Mesh(wallGeom, wallMat.clone())
    rightWall.position.set(wallOffset, wallHeight / 2, -length / 2)
    group.add(rightWall)
    
    return group
  }, [])
  
  // 创建步行板 - 按照2D数据排列
  const createWalkingBoards = useCallback((spanData: BridgeSpanData, textures: { colorTexture: THREE.CanvasTexture }) => {
    const group = new THREE.Group()
    const matConfig = MATERIAL_CONFIGS[config.material]

    const boardMaterial = new THREE.MeshStandardMaterial({
      map: textures.colorTexture,
      metalness: matConfig.metalness,
      roughness: matConfig.roughness,
      envMap: envMapRef.current,
      envMapIntensity: matConfig.envMapIntensity,
      side: THREE.DoubleSide
    })

    const railGaugeM = config.railGauge / 1000
    const spanLengthM = spanData.spanLength || 20

    const boardWidth = 0.6
    const boardThickness = 0.05
    const gapBetweenBoards = 0.05

    const railOuterEdge = railGaugeM / 2 + 0.2

    // Helper to add board number label and warning sprites
    const addBoardDecorations = (mesh: THREE.Mesh, board: BoardData) => {
      if (showBoardNumbers) {
        const statusColor = board.status === 'normal' ? '#ffffff' : (STATUS_COLORS[board.status] ? '#' + STATUS_COLORS[board.status].getHexString() : '#ffffff')
        const label = createNumberSprite(board.boardNumber, statusColor)
        label.position.set(0, 0.1, 0)
        mesh.add(label)
        labelSpritesRef.current.push(label)
      }

      if (board.status === 'fracture_risk' || board.status === 'severe_damage' || board.status === 'missing') {
        const warning = createWarningSprite()
        warning.position.set(0, 0.25, 0)
        mesh.add(warning)
        warningSpritesRef.current.push(warning)
      }

      boardDataMapRef.current.set(board.id, board)
    }

    // Damage visualization
    const applyDamageVisuals = (mesh: THREE.Mesh, boardWidth_: number, boardLength_: number, status: string) => {
      if (status === 'missing') {
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.transparent = true
        mat.opacity = 0.3
        mat.wireframe = true
        mat.needsUpdate = true
      } else if (status === 'fracture_risk') {
        mesh.rotation.z = 0.05
      } else if (status === 'severe_damage') {
        const crackMat = new THREE.LineBasicMaterial({ color: 0xff4400, linewidth: 1 })
        const crackPoints: THREE.Vector3[] = []
        for (let c = 0; c < 3; c++) {
          const sx = (Math.random() - 0.5) * boardWidth_ * 0.6
          const sz = (Math.random() - 0.5) * boardLength_ * 0.8
          crackPoints.push(
            new THREE.Vector3(sx, boardThickness / 2 + 0.002, sz),
            new THREE.Vector3(sx + (Math.random() - 0.5) * 0.15, boardThickness / 2 + 0.002, sz + (Math.random() - 0.5) * 0.2)
          )
        }
        const crackGeom = new THREE.BufferGeometry().setFromPoints(crackPoints)
        const cracks = new THREE.LineSegments(crackGeom, crackMat)
        mesh.add(cracks)
      }
    }

    // Create a single board mesh with edge, position, status color, damage visuals, decorations
    const createBoardMesh = (
      board: BoardData,
      x: number, y: number, z: number,
      bw: number, bl: number
    ) => {
      const boardGeom = new THREE.BoxGeometry(bw, boardThickness, bl * 0.95)
      const mesh = new THREE.Mesh(boardGeom, boardMaterial.clone())
      const statusColor = STATUS_COLORS[board.status] || STATUS_COLORS.normal

      if (board.status !== 'normal') {
        (mesh.material as THREE.MeshStandardMaterial).color = statusColor
        ;(mesh.material as THREE.MeshStandardMaterial).emissive = statusColor
        ;(mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
          config.renderMode === 'safety_inspection' ? 0.5 : 0.3
      }

      const edgeGeom = new THREE.BoxGeometry(bw + 0.02, boardThickness + 0.01, bl * 0.95 + 0.02)
      const edgeMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.2 })
      const edge = new THREE.Mesh(edgeGeom, edgeMat)
      edge.position.y = -0.005
      mesh.add(edge)

      mesh.position.set(x, y, z)
      mesh.userData = { boardId: board.id, boardData: board }
      mesh.name = `board-${board.id}`
      mesh.castShadow = true

      applyDamageVisuals(mesh, bw, bl, board.status)
      addBoardDecorations(mesh, board)

      group.add(mesh)
      boardMeshesRef.current.set(board.id, mesh)
    }

    // Separate boards by position first, matching 2D getBoardsByPosition logic
    const allBoards = spanData.walkingBoards
    const upstreamBoards = allBoards.filter(b => b.position === 'upstream')
    const downstreamBoards = allBoards.filter(b => b.position === 'downstream')
    const shelterLeftBoards = allBoards.filter(b => b.position === 'shelter_left')
    const shelterRightBoards = allBoards.filter(b => b.position === 'shelter_right')
    const shelterOldBoards = allBoards.filter(b => b.position === 'shelter')

    // Group boards by column, sort by boardNumber (same as 2D getBoardsByPosition)
    const groupByColumn = (boards: BoardData[], columns: number) => {
      const sorted = [...boards].sort((a, b) => a.columnIndex - b.columnIndex || a.boardNumber - b.boardNumber)
      const groups: BoardData[][] = []
      for (let i = 1; i <= columns; i++) {
        groups.push(sorted.filter(b => b.columnIndex === i))
      }
      return groups
    }

    const upstreamCols = groupByColumn(upstreamBoards, spanData.upstreamColumns)
    const downstreamCols = groupByColumn(downstreamBoards, spanData.downstreamColumns)

    // Calculate maxRows across ALL columns (both sides) for aligned row count
    const allColumnLengths = [
      ...upstreamCols.map(c => c.length),
      ...downstreamCols.map(c => c.length)
    ]
    const maxRows = Math.max(...allColumnLengths, 1)
    const boardLength = spanLengthM / maxRows

    // Process boards for a side, matching 2D grid layout
    // Each column's boards are sorted by boardNumber, then placed by row index (NOT boardNumber)
    // This ensures same row index = same Z position = visual alignment across columns
    const processSide = (
      columnGroups: BoardData[][],
      startX: number,
      direction: 1 | (-1)
    ) => {
      columnGroups.forEach((columnBoards, col) => {
        if (columnBoards.length === 0) return
        const columnX = startX + direction * col * (boardWidth + gapBetweenBoards)

        columnBoards.forEach((board, rowIdx) => {
          createBoardMesh(
            board,
            columnX + boardWidth / 2,
            0.45,
            -(rowIdx + 0.5) * boardLength,
            boardWidth, boardLength
          )
        })
      })
    }

    // Upstream boards (right side) - columns go rightward from rail edge
    processSide(upstreamCols, railOuterEdge + 0.3, 1)

    // Downstream boards (left side) - columns go leftward from rail edge
    processSide(downstreamCols, -railOuterEdge - 0.3 - boardWidth, -1)

    // ====== Shelter boards - map to actual shelter platforms ======
    // Shelter platforms are at fixed intervals (every ~50m), placed at x = ±3.0
    // Shelter boards are placed ON these platforms
    const shelterPlatformX = 3.0  // matches createShelterPlatform xOffset
    const shelterBoardWidth = 0.5
    const shelterBoardLength = 0.8
    const shelterBoardGap = 0.05

    const processShelterBoards = (boards: BoardData[], xOffset: number) => {
      if (boards.length === 0) return
      // Sort by boardNumber for consistent layout
      const sorted = [...boards].sort((a, b) => a.boardNumber - b.boardNumber)
      sorted.forEach((board, idx) => {
        createBoardMesh(
          board,
          xOffset,
          0.50,  // Slightly above the platform surface (platform top at ~0.45)
          -(board.boardNumber - 0.5) * (shelterBoardLength + shelterBoardGap),
          shelterBoardWidth, shelterBoardLength
        )
      })
    }

    // Upstream shelter (shelter_left in 2D, or fallback to old 'shelter')
    const upstreamShelterBoards = shelterLeftBoards.length > 0
      ? shelterLeftBoards
      : (shelterRightBoards.length === 0 ? shelterOldBoards : [])
    if (upstreamShelterBoards.length > 0) {
      // Place on the right-side shelter platform (x = +3.0)
      processShelterBoards(upstreamShelterBoards, shelterPlatformX)
    }

    // Downstream shelter (shelter_right in 2D)
    if (shelterRightBoards.length > 0) {
      // Place on the left-side shelter platform (x = -3.0)
      processShelterBoards(shelterRightBoards, -shelterPlatformX)
    }

    return group
  }, [config.material, config.railGauge, config.renderMode, showBoardNumbers, createNumberSprite, createWarningSprite])
  
  // 创建护栏
  const createRailing = useCallback((style: RailingStyle, length: number, xPositions: number[]) => {
    const group = new THREE.Group()
    const postHeight = 1.0
    const postSpacing = 2.0
    
    const postMat = new THREE.MeshStandardMaterial({
      color: style === 'modern' ? 0x2a2a2a : 0x4a4a4a,
      metalness: 0.85,
      roughness: 0.35
    })
    
    xPositions.forEach(x => {
      const postCount = Math.ceil(length / postSpacing) + 1
      
      for (let i = 0; i < postCount; i++) {
        const postGeom = new THREE.CylinderGeometry(0.03, 0.033, postHeight, 8)
        const post = new THREE.Mesh(postGeom, postMat)
        post.position.set(x, postHeight / 2 + 0.4, -i * postSpacing)
        group.add(post)
      }
      
      const railGeom = new THREE.CylinderGeometry(0.02, 0.02, length, 8)
      const topRail = new THREE.Mesh(railGeom, postMat)
      topRail.position.set(x, postHeight + 0.4, -length / 2)
      topRail.rotation.x = Math.PI / 2
      group.add(topRail)
      
      const midRail = new THREE.Mesh(railGeom, postMat)
      midRail.position.set(x, postHeight * 0.5 + 0.4, -length / 2)
      midRail.rotation.x = Math.PI / 2
      group.add(midRail)
    })
    
    return group
  }, [])
  
  // 创建避车台
  const createShelterPlatform = useCallback((position: 'left' | 'right', zPosition: number) => {
    const group = new THREE.Group()
    
    const platformWidth = 1.2
    const platformDepth = 1.8
    const platformHeight = 0.1
    
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x606060,
      roughness: 0.7,
      metalness: 0.3
    })
    
    const platformGeom = new THREE.BoxGeometry(platformWidth, platformHeight, platformDepth)
    const platform = new THREE.Mesh(platformGeom, platformMat)
    platform.position.set(0, 0.4, 0)
    group.add(platform)
    
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      metalness: 0.6,
      roughness: 0.4,
      emissive: new THREE.Color(0x4c1d95),
      emissiveIntensity: 0.3
    })
    
    const backRailGeom = new THREE.BoxGeometry(platformWidth, 1.0, 0.05)
    const backRail = new THREE.Mesh(backRailGeom, railMat)
    backRail.position.set(0, 0.9, -platformDepth / 2)
    group.add(backRail)
    
    const sideRailGeom = new THREE.BoxGeometry(0.05, 1.0, platformDepth)
    const sideRail = new THREE.Mesh(sideRailGeom, railMat)
    sideRail.position.set(0, 0.9, 0)
    group.add(sideRail)
    
    // 顶棚
    const roofGeom = new THREE.BoxGeometry(platformWidth + 0.2, 0.05, platformDepth + 0.2)
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.6,
      metalness: 0.4
    })
    const roof = new THREE.Mesh(roofGeom, roofMat)
    roof.position.set(0, 1.95, 0)
    group.add(roof)
    
    const xOffset = position === 'left' ? -3.0 : 3.0
    group.position.set(xOffset, 0, zPosition)
    
    return group
  }, [])
  
  // 应用渲染模式
  const applyRenderMode = useCallback((group: THREE.Group, mode: RenderMode) => {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        switch (mode) {
          case 'photorealistic':
            obj.material.wireframe = false
            if (!obj.userData.boardData) {
              obj.material.emissive = new THREE.Color(0x000000)
              obj.material.emissiveIntensity = 0
            }
            break
          case 'wireframe':
            obj.material.wireframe = true
            obj.material.emissive = new THREE.Color(0x00ffff)
            obj.material.emissiveIntensity = 0.3
            break
          case 'safety_inspection':
            obj.material.wireframe = false
            if (obj.userData.boardData) {
              const status = obj.userData.boardData.status
              if (status === 'fracture_risk') {
                obj.material.emissive = new THREE.Color(0xff0000)
                obj.material.emissiveIntensity = 0.5
              } else if (status === 'severe_damage') {
                obj.material.emissive = new THREE.Color(0xff6600)
                obj.material.emissiveIntensity = 0.4
              } else if (status === 'minor_damage') {
                obj.material.emissive = new THREE.Color(0xffaa00)
                obj.material.emissiveIntensity = 0.3
              } else {
                obj.material.emissive = new THREE.Color(0x00ff00)
                obj.material.emissiveIntensity = 0.2
              }
            } else {
              obj.material.emissive = new THREE.Color(0x0044aa)
              obj.material.emissiveIntensity = 0.2
            }
            break
        }
        obj.material.needsUpdate = true
      }
    })
  }, [])
  
  // 初始化场景
  useEffect(() => {
    if (!containerRef.current) return

    const isMobileDevice = (typeof window !== 'undefined' && window.innerWidth < 768) || isMobile
    const ballastCount = isMobileDevice ? 100 : 600
    const shadowMapSize = isMobileDevice ? 512 : 2048

    envMapRef.current = createHDREnvironmentMap()

    const scene = new THREE.Scene()
    const bgColor = theme === 'night' ? 0x0a0f1a : 0x8899aa
    scene.background = new THREE.Color(bgColor)
    scene.fog = theme === 'night' ? new THREE.Fog(0x0a0f1a, 20, 80) : new THREE.Fog(0x8899aa, 40, 150)
    scene.environment = envMapRef.current
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      500
    )
    camera.position.set(12, 6, 15)
    camera.lookAt(0, 0, -5)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobileDevice,
      alpha: true,
      powerPreference: isMobileDevice ? 'low-power' : 'high-performance'
    })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileDevice ? 1.5 : 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0 + config.lightIntensity * 0.5
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI / 2 - 0.1
    controls.minDistance = 3
    controls.maxDistance = 50
    controls.target.set(0, 0, -5)
    controlsRef.current = controls

    const ambientLight = new THREE.AmbientLight(0xb0c4de, 0.4 * config.lightIntensity)
    scene.add(ambientLight)

    const hemiLight = new THREE.HemisphereLight(
      theme === 'night' ? 0x4466aa : 0x87ceeb,
      theme === 'night' ? 0x080820 : 0x4a4a3a,
      0.6 * config.lightIntensity
    )
    scene.add(hemiLight)

    const directionalLight = new THREE.DirectionalLight(0xffeedd, 1.2 * config.lightIntensity)
    directionalLight.position.set(15, 30, 20)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = shadowMapSize
    directionalLight.shadow.mapSize.height = shadowMapSize
    directionalLight.name = 'mainLight'
    scene.add(directionalLight)

    const fillLight = new THREE.DirectionalLight(0xadd8e6, 0.3 * config.lightIntensity)
    fillLight.position.set(-10, 10, -15)
    scene.add(fillLight)

    const gridHelper = new THREE.GridHelper(50, 50, theme === 'night' ? 0x00f0ff : 0x404040, theme === 'night' ? 0x1a3050 : 0x303030)
    gridHelper.position.y = -3.5
    scene.add(gridHelper)

    const groundGeom = new THREE.PlaneGeometry(150, 150)
    const groundMat = new THREE.MeshStandardMaterial({
      color: theme === 'night' ? 0x1a2a1a : 0x3a4a3a,
      roughness: 0.9,
      metalness: 0.1
    })
    const ground = new THREE.Mesh(groundGeom, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -3.5
    ground.receiveShadow = true
    scene.add(ground)

    // Water surface
    const maxBoardNum = Math.max(...span.walkingBoards.map(b => b.boardNumber), 10)
    const sceneLength = maxBoardNum * 1.0
    const water = createWaterSurface(sceneLength)
    scene.add(water)
    waterRef.current = water

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    let currentHoveredId: string | null = null

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || !onBoardClick) return
      const rect = containerRef.current.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const meshes = Array.from(boardMeshesRef.current.values())
      const intersects = raycaster.intersectObjects(meshes, true)
      if (intersects.length > 0) {
        let obj = intersects[0].object
        while (obj.parent && !obj.userData.boardData) obj = obj.parent
        const boardData = obj.userData.boardData as BoardData
        if (boardData) onBoardClick(boardData)
      }
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const meshes = Array.from(boardMeshesRef.current.values())
      const intersects = raycaster.intersectObjects(meshes, true)

      if (intersects.length > 0) {
        let obj = intersects[0].object
        while (obj.parent && !obj.userData.boardData) obj = obj.parent
        const boardData = obj.userData.boardData as BoardData
        if (boardData && boardData.id !== currentHoveredId) {
          currentHoveredId = boardData.id
          hoveredBoardRef.current = boardData.id
          // Project 3D position to screen
          const pos = new THREE.Vector3()
          obj.getWorldPosition(pos)
          pos.project(camera)
          const x = ((pos.x + 1) / 2 * rect.width)
          const y = ((-pos.y + 1) / 2 * rect.height)
          setHoveredBoardInfo({ x, y, board: boardData })
        }
        renderer.domElement.style.cursor = 'pointer'
      } else {
        if (currentHoveredId) {
          currentHoveredId = null
          hoveredBoardRef.current = null
          setHoveredBoardInfo(null)
        }
        renderer.domElement.style.cursor = 'default'
      }
    }

    renderer.domElement.addEventListener('click', handleClick)
    renderer.domElement.addEventListener('mousemove', handleMouseMove)

    const clock = new THREE.Clock()

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      controls.update()

      // Camera lerp for view presets
      const camTarget = cameraTargetRef.current
      if (camTarget.lerping) {
        camera.position.lerp(camTarget.pos, 0.05)
        controls.target.lerp(camTarget.target, 0.05)
        if (camera.position.distanceTo(camTarget.pos) < 0.1) {
          camTarget.lerping = false
        }
      }

      // Water surface animation
      if (waterRef.current) {
        const posAttr = waterRef.current.geometry.getAttribute('position')
        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i)
          const z = posAttr.getZ(i)
          posAttr.setY(i, Math.sin(x * 0.3 + elapsed * 0.8) * 0.05 + Math.cos(z * 0.2 + elapsed * 0.6) * 0.04)
        }
        posAttr.needsUpdate = true
        ;(waterRef.current.material as THREE.MeshStandardMaterial).opacity =
          0.45 + Math.sin(elapsed * 0.5) * 0.1
      }

      // High-risk board oscillation animation
      boardMeshesRef.current.forEach((mesh) => {
        const bd = mesh.userData.boardData as BoardData
        if (bd && (bd.status === 'fracture_risk' || bd.status === 'missing')) {
          const baseY = mesh.userData.baseY ?? mesh.position.y
          if (mesh.userData.baseY === undefined) mesh.userData.baseY = mesh.position.y
          mesh.position.y = baseY + Math.sin(elapsed * 2 + mesh.position.x) * 0.04
        }
      })

      // Update hover tooltip position
      if (currentHoveredId && hoveredBoardRef.current) {
        const mesh = boardMeshesRef.current.get(currentHoveredId)
        if (mesh && containerRef.current) {
          const pos = new THREE.Vector3()
          mesh.getWorldPosition(pos)
          pos.project(camera)
          const rect = containerRef.current.getBoundingClientRect()
          const x = ((pos.x + 1) / 2 * rect.width)
          const y = ((-pos.y + 1) / 2 * rect.height)
          const bd = mesh.userData.boardData as BoardData
          if (bd) setHoveredBoardInfo(prev => prev ? { ...prev, x, y } : null)
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!containerRef.current) return
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    setIsReady(true)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('click', handleClick)
      renderer.domElement.removeEventListener('mousemove', handleMouseMove)
      renderer.dispose()
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [theme, onBoardClick, config.lightIntensity, createHDREnvironmentMap, createWaterSurface, isMobile])
  
  // 更新光照
  useEffect(() => {
    if (sceneRef.current) {
      const mainLight = sceneRef.current.getObjectByName('mainLight') as THREE.DirectionalLight
      if (mainLight) mainLight.intensity = 1.2 * config.lightIntensity
      if (rendererRef.current) {
        rendererRef.current.toneMappingExposure = 1.0 + config.lightIntensity * 0.5
      }
    }
  }, [config.lightIntensity])
  
  // 生成桥梁场景
  useEffect(() => {
    if (!sceneRef.current || !isReady) return
    
    noiseRef.current = new SimplexNoise(config.seed)
    
    const oldBridge = sceneRef.current.getObjectByName('bridgeGroup')
    if (oldBridge) {
      sceneRef.current.remove(oldBridge)
      oldBridge.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (obj.material instanceof THREE.Material) obj.material.dispose()
        }
      })
    }
    
    boardMeshesRef.current.clear()
    
    const bridgeGroup = new THREE.Group()
    bridgeGroup.name = 'bridgeGroup'
    
    const maxBoardNum = Math.max(...span.walkingBoards.map(b => b.boardNumber), 10)
    const sceneLength = maxBoardNum * 1.0
    
    const textures = generateTextures(config.material)
    const railGaugeM = config.railGauge / 1000
    
    // 1. 桥墩
    const piers = createBridgePiers(sceneLength)
    bridgeGroup.add(piers)
    
    // 2. 主梁
    const mainBeams = createMainBeams(sceneLength)
    bridgeGroup.add(mainBeams)
    
    // 3. 横梁
    const crossBeams = createCrossBeams(sceneLength)
    bridgeGroup.add(crossBeams)
    
    // 4. 道砟
    const ballast = createBallast(sceneLength)
    bridgeGroup.add(ballast)
    
    // 5. 挡砟墙
    const ballastWall = createBallastWall(sceneLength)
    bridgeGroup.add(ballastWall)
    
    // 6. 桥枕
    const sleepers = createSleepers(sceneLength)
    bridgeGroup.add(sleepers)
    
    // 钢轨材质
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x6a6a6a,
      metalness: 0.95,
      roughness: 0.15,
      envMap: envMapRef.current,
      envMapIntensity: 1.5
    })
    
    const guardRailMat = new THREE.MeshStandardMaterial({
      color: 0x7a7a7a,
      metalness: 0.9,
      roughness: 0.25,
      envMap: envMapRef.current,
      envMapIntensity: 1.2
    })
    
    // 7. 正轨 (2根) - 水平铺设在轨枕上
    const railGeom = createRail(sceneLength)
    
    // 左正轨
    const leftRail = new THREE.Mesh(railGeom, railMat)
    leftRail.position.set(-railGaugeM / 2, 0.2, 0)  // 放在轨枕上方
    bridgeGroup.add(leftRail)
    
    // 右正轨
    const rightRail = new THREE.Mesh(railGeom.clone(), railMat.clone())
    rightRail.position.set(railGaugeM / 2, 0.2, 0)
    bridgeGroup.add(rightRail)
    
    // 8. 护轨 (2根) - 在正轨内侧
    const guardRailOffset = railGaugeM / 2 - 0.25
    
    const leftGuardRail = new THREE.Mesh(railGeom.clone(), guardRailMat)
    leftGuardRail.position.set(-guardRailOffset, 0.18, 0)
    leftGuardRail.scale.set(0.85, 0.85, 1)  // 护轨稍小
    bridgeGroup.add(leftGuardRail)
    
    const rightGuardRail = new THREE.Mesh(railGeom.clone(), guardRailMat.clone())
    rightGuardRail.position.set(guardRailOffset, 0.18, 0)
    rightGuardRail.scale.set(0.85, 0.85, 1)
    bridgeGroup.add(rightGuardRail)
    
    // 9. 步行板
    const boards = createWalkingBoards(span, textures)
    bridgeGroup.add(boards)
    
    // 10. 护栏
    const upstreamX = railGaugeM / 2 + 0.8 + span.upstreamColumns * 0.55
    const downstreamX = -railGaugeM / 2 - 0.8 - span.downstreamColumns * 0.55
    const railing = createRailing(config.railingStyle, sceneLength, [upstreamX, downstreamX])
    bridgeGroup.add(railing)
    
    // 11. 避车台 - 根据实际步行板数据映射，匹配2D避车台布局
    // 检查实际的避车台步行板数据来决定平台位置
    const shelterBoards = span.walkingBoards
    const hasUpstreamShelter = shelterBoards.some(b => b.position === 'shelter_left' || b.position === 'shelter')
    const hasDownstreamShelter = shelterBoards.some(b => b.position === 'shelter_right')
    const hasAnyShelter = span.shelterSide !== 'none' || hasUpstreamShelter || hasDownstreamShelter

    if (hasAnyShelter) {
      const shelterInterval = 50
      const shelterCount = Math.max(1, Math.ceil(sceneLength / shelterInterval))

      // 根据实际数据决定是否创建上游/下游避车台
      const showUpstreamShelter = hasUpstreamShelter || span.shelterSide === 'double'
      const showDownstreamShelter = hasDownstreamShelter || span.shelterSide === 'double'
      // single模式且没有实际数据时，创建下行侧（左侧）避车台
      const showSingleLeft = !showUpstreamShelter && !showDownstreamShelter && span.shelterSide === 'single'

      for (let i = 0; i < shelterCount; i++) {
        const shelterZ = -(i + 1) * shelterInterval
        if (Math.abs(shelterZ) < sceneLength) {
          if (showUpstreamShelter) {
            bridgeGroup.add(createShelterPlatform('right', shelterZ))
          }
          if (showDownstreamShelter || showSingleLeft) {
            bridgeGroup.add(createShelterPlatform('left', shelterZ))
          }
        }
      }
    }
    
    // 12. 避车台步行板 - now handled by createWalkingBoards using actual board data

    applyRenderMode(bridgeGroup, config.renderMode)
    sceneRef.current.add(bridgeGroup)
    
  }, [span, isReady, config, generateTextures, createRail, createBridgePiers, createMainBeams, 
      createCrossBeams, createBallast, createBallastWall, createSleepers, createWalkingBoards, 
      createRailing, createShelterPlatform, applyRenderMode])
  
  const handleRegenerate = () => regenerate()

  const handleViewPreset = (preset: string) => {
    const p = VIEW_PRESETS[preset]
    if (!p || !cameraRef.current || !controlsRef.current) return
    const sceneCenter = new THREE.Vector3(0, 0, -(span.spanLength || 20) / 2)
    cameraTargetRef.current = {
      pos: new THREE.Vector3(p.position[0], p.position[1], p.position[2] + sceneCenter.z + 5),
      target: sceneCenter,
      lerping: true
    }
  }

  const tc = theme === 'night'
  const panelBg = tc ? 'bg-slate-900/90 border-cyan-500/30' : 'bg-white/90 border-gray-200'
  const textPrimary = tc ? 'text-cyan-400' : 'text-blue-600'
  const textMuted = tc ? 'text-slate-400' : 'text-gray-600'
  const inputCls = tc ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-gray-50 border-gray-300 text-gray-700'

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Hover tooltip */}
      {hoveredBoardInfo && (
        <div
          className={`absolute pointer-events-none z-50 ${tc ? 'bg-slate-800/95 border-cyan-500/40' : 'bg-white/95 border-gray-300'} border rounded-lg px-3 py-2 text-xs shadow-xl backdrop-blur-sm`}
          style={{
            left: Math.min(hoveredBoardInfo.x + 15, (containerRef.current?.clientWidth || 800) - 200),
            top: Math.max(hoveredBoardInfo.y - 80, 5),
            maxWidth: 200
          }}
        >
          <div className={`font-bold ${textPrimary}`}>
            {{ upstream: '上行', downstream: '下行', shelter_left: '上行避车台', shelter_right: '下行避车台', shelter: '避车台' }[hoveredBoardInfo.board.position] || hoveredBoardInfo.board.position}{' '}
            {hoveredBoardInfo.board.columnIndex ? `${hoveredBoardInfo.board.columnIndex}列 ` : ''}{hoveredBoardInfo.board.boardNumber}号
          </div>
          <div className="mt-1" style={{ color: STATUS_COLORS[hoveredBoardInfo.board.status]?.getHexString() ? '#' + STATUS_COLORS[hoveredBoardInfo.board.status].getHexString() : '#fff' }}>
            状态: {STATUS_LABELS[hoveredBoardInfo.board.status] || hoveredBoardInfo.board.status}
          </div>
          {hoveredBoardInfo.board.damageDesc && (
            <div className={`${tc ? 'text-slate-300' : 'text-gray-600'} mt-0.5 truncate`}>
              {hoveredBoardInfo.board.damageDesc}
            </div>
          )}
          {(hoveredBoardInfo.board.status === 'fracture_risk' || hoveredBoardInfo.board.status === 'missing') && (
            <div className="text-red-500 font-bold mt-1">⚠ 禁止踩踏!</div>
          )}
          {hoveredBoardInfo.board.inspectedBy && (
            <div className={`${tc ? 'text-slate-500' : 'text-gray-400'} mt-0.5`}>
              {hoveredBoardInfo.board.inspectedBy}
              {hoveredBoardInfo.board.inspectedAt && ` | ${hoveredBoardInfo.board.inspectedAt.slice(0, 10)}`}
            </div>
          )}
        </div>
      )}

      {/* Control panel */}
      <div className={`absolute top-2 left-2 ${panelBg} backdrop-blur-sm border rounded-lg p-3 text-xs overflow-y-auto`}
        style={{ width: isMobile ? '10rem' : '13rem', maxHeight: isMobile ? '50vh' : '70vh' }}>
        <h4 className={`font-bold mb-2 ${textPrimary}`}>3D场景控制</h4>

        <div className="space-y-2">
          <button
            onClick={handleRegenerate}
            className={`w-full py-1.5 rounded font-medium transition-all ${
              tc ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'
                 : 'bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 border border-blue-200'
            }`}
          >
            🔄 重新生成
          </button>

          {/* View presets */}
          <div>
            <label className={textMuted}>视角预设</label>
            <div className="grid grid-cols-4 gap-1 mt-1">
              {Object.entries(VIEW_PRESETS).map(([key]) => (
                <button
                  key={key}
                  onClick={() => handleViewPreset(key)}
                  className={`py-1 rounded text-[10px] font-medium transition-all ${
                    tc ? 'bg-slate-700/80 text-slate-200 hover:bg-cyan-500/30 border border-slate-600'
                       : 'bg-gray-100 text-gray-700 hover:bg-blue-50 border border-gray-200'
                  }`}
                >
                  {{ front: '正面', side: '侧面', top: '俯视', inspection: '巡检' }[key] || key}
                </button>
              ))}
            </div>
          </div>

          {/* Board number toggle */}
          <label className={`flex items-center gap-1.5 cursor-pointer ${textMuted}`}>
            <input
              type="checkbox"
              checked={showBoardNumbers}
              onChange={(e) => setShowBoardNumbers(e.target.checked)}
              className="accent-cyan-500"
            />
            显示板号
          </label>

          <div>
            <label className={textMuted}>步行板材质</label>
            <select
              value={config.material}
              onChange={(e) => setConfig({ material: e.target.value as MaterialType })}
              className={`w-full mt-1 text-xs rounded px-2 py-1 ${inputCls} border`}
            >
              <option value="galvanized_steel">镀锌钢</option>
              <option value="treated_wood">防腐木</option>
              <option value="composite">复合材料</option>
              <option value="aluminum">铝合金</option>
            </select>
          </div>

          <div>
            <label className={textMuted}>护栏样式</label>
            <select
              value={config.railingStyle}
              onChange={(e) => setConfig({ railingStyle: e.target.value as RailingStyle })}
              className={`w-full mt-1 text-xs rounded px-2 py-1 ${inputCls} border`}
            >
              <option value="industrial">工业风格</option>
              <option value="safety">安全防护</option>
              <option value="modern">简约现代</option>
            </select>
          </div>

          <div>
            <label className={textMuted}>渲染模式</label>
            <select
              value={config.renderMode}
              onChange={(e) => setConfig({ renderMode: e.target.value as RenderMode })}
              className={`w-full mt-1 text-xs rounded px-2 py-1 ${inputCls} border`}
            >
              <option value="photorealistic">照片级真实感</option>
              <option value="wireframe">线框结构图</option>
              <option value="safety_inspection">施工安全检测</option>
            </select>
          </div>

          <div>
            <label className={textMuted}>桥枕类型</label>
            <select
              value={config.sleeperType}
              onChange={(e) => setConfig({ sleeperType: e.target.value as SleeperType })}
              className={`w-full mt-1 text-xs rounded px-2 py-1 ${inputCls} border`}
            >
              <option value="wood">木质枕木</option>
              <option value="concrete">混凝土桥枕</option>
            </select>
          </div>

          <div>
            <label className={textMuted}>铁轨轨距: {config.railGauge}mm</label>
            <input
              type="range" min="1000" max="1700" step="5"
              value={config.railGauge}
              onChange={(e) => setConfig({ railGauge: parseInt(e.target.value) })}
              className="w-full mt-1 accent-cyan-500"
            />
          </div>

          <div>
            <label className={textMuted}>光照: {config.lightIntensity.toFixed(1)}x</label>
            <input
              type="range" min="0.5" max="3.0" step="0.1"
              value={config.lightIntensity}
              onChange={(e) => setConfig({ lightIntensity: parseFloat(e.target.value) })}
              className="w-full mt-1 accent-yellow-500"
            />
          </div>

          {/* Wear sliders */}
          <div className="space-y-1.5 border-t pt-2" style={{ borderColor: tc ? 'rgba(100,116,139,0.3)' : 'rgba(209,213,219,0.5)' }}>
            <label className={`${textMuted} font-medium`}>磨损参数</label>
            <div>
              <div className="flex justify-between"><span className={textMuted}>划痕</span><span className={tc ? 'text-orange-300' : 'text-orange-600'}>{(config.scratchLevel * 100).toFixed(0)}%</span></div>
              <input type="range" min="0" max="1" step="0.05" value={config.scratchLevel}
                onChange={(e) => setConfig({ scratchLevel: parseFloat(e.target.value) })}
                className="w-full accent-orange-500" />
            </div>
            <div>
              <div className="flex justify-between"><span className={textMuted}>污渍</span><span className={tc ? 'text-amber-300' : 'text-amber-600'}>{(config.dirtLevel * 100).toFixed(0)}%</span></div>
              <input type="range" min="0" max="1" step="0.05" value={config.dirtLevel}
                onChange={(e) => setConfig({ dirtLevel: parseFloat(e.target.value) })}
                className="w-full accent-amber-500" />
            </div>
            <div>
              <div className="flex justify-between"><span className={textMuted}>锈蚀</span><span className={tc ? 'text-red-300' : 'text-red-600'}>{(config.rustLevel * 100).toFixed(0)}%</span></div>
              <input type="range" min="0" max="1" step="0.05" value={config.rustLevel}
                onChange={(e) => setConfig({ rustLevel: parseFloat(e.target.value) })}
                className="w-full accent-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Operation hints */}
      <div className={`absolute bottom-2 left-2 text-xs ${tc ? 'text-slate-500' : 'text-gray-500'}`}>
        🖱️ 左键旋转 | 右键平移 | 滚轮缩放 | 点击步行板编辑
      </div>

      {/* Span number badge */}
      <div className={`absolute top-2 right-2 ${panelBg} backdrop-blur-sm border rounded-lg px-3 py-2`}>
        <span className={`font-bold ${textPrimary}`}>第{span.spanNumber}孔</span>
        <span className={`ml-2 ${tc ? 'text-slate-400' : 'text-gray-500'}`}>({span.spanLength}m)</span>
      </div>

      {/* Render mode indicator */}
      <div className={`absolute bottom-2 right-2 ${panelBg} backdrop-blur-sm border rounded-lg px-2 py-1 text-xs`}>
        <span className={textPrimary}>
          {config.renderMode === 'photorealistic' && '📷 照片级真实感'}
          {config.renderMode === 'wireframe' && '📐 线框结构图'}
          {config.renderMode === 'safety_inspection' && '🔍 施工安全检测'}
        </span>
      </div>
    </div>
  )
}

export default memo(HomeBridge3D)
