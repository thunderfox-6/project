'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { 
  useBridge3DStore, 
  MATERIAL_CONFIGS,
  type SleeperType 
} from '@/lib/bridge3d-store'

// 桥梁数据类型定义
interface WalkingBoard {
  id: string
  boardNumber: number
  position: string
  columnIndex: number
  status: string
  damageDesc: string | null
}

interface BridgeSpan {
  id: string
  spanNumber: number
  spanLength: number
  upstreamBoards: number
  downstreamBoards: number
  upstreamColumns: number
  downstreamColumns: number
  shelterSide: string
  shelterBoards: number
  walkingBoards: WalkingBoard[]
}

interface Bridge {
  id: string
  name: string
  bridgeCode: string
  totalSpans: number
  spans: BridgeSpan[]
}

// 步行板状态颜色映射
const BOARD_STATUS_COLORS: Record<string, string> = {
  normal: '#22c55e',        // 正常 - 绿色
  minor_damage: '#f59e0b', // 轻微损坏 - 橙色
  severe_damage: '#f97316', // 严重损坏 - 深橙色
  fracture_risk: '#ef4444', // 断裂风险 - 红色
  replaced: '#3b82f6',      // 已更换 - 蓝色
  missing: '#6b7280'        // 缺失 - 灰色
}

// 噪声函数
class SimplexNoise {
  private perm: number[] = []
  
  constructor(seed = Math.random()) {
    const p = []
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
    const X0 = i - t, Y0 = j - t
    const x0 = x - X0, y0 = y - Y0
    const i1 = x0 > y0 ? 1 : 0
    const j1 = x0 > y0 ? 0 : 1
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2
    
    const grad = (hash: number, gx: number, gy: number) => {
      const h = hash & 7
      const u = h < 4 ? gx : gy
      const v = h < 4 ? gy : gx
      return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v)
    }
    
    let n0 = 0, n1 = 0, n2 = 0
    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * grad(this.perm[i + this.perm[j]], x0, y0) }
    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * grad(this.perm[i + i1 + this.perm[j + j1]], x1, y1) }
    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * grad(this.perm[i + 1 + this.perm[j + 1]], x2, y2) }
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

export default function Bridge3DProcedural() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const bridgeGroupRef = useRef<THREE.Group | null>(null)
  const noiseRef = useRef<SimplexNoise>(new SimplexNoise())
  const lightsRef = useRef<{
    ambient: THREE.AmbientLight
    directional: THREE.DirectionalLight
    directional2: THREE.DirectionalLight
    fill: THREE.DirectionalLight
    hemisphere: THREE.HemisphereLight
  } | null>(null)
  const envMapRef = useRef<THREE.DataTexture | null>(null)
  
  const { config, setConfig, regenerate } = useBridge3DStore()
  const [isLoading, setIsLoading] = useState(false)
  const [bridgeData, setBridgeData] = useState<Bridge | null>(null)
  const [selectedSpanIndex, setSelectedSpanIndex] = useState(0)
  
  // 获取桥梁数据
  useEffect(() => {
    const fetchBridgeData = async () => {
      try {
        const response = await fetch('/api/bridges')
        const bridges: Bridge[] = await response.json()
        if (bridges.length > 0) {
          // 获取第一座桥梁的完整数据
          const fullBridgeRes = await fetch(`/api/boards?bridgeId=${bridges[0].id}`)
          const fullBridge = await fullBridgeRes.json()
          setBridgeData(fullBridge)
          
          // 更新配置以匹配实际数据
          if (fullBridge.spans && fullBridge.spans.length > 0) {
            const firstSpan = fullBridge.spans[0]
            setConfig({
              boardCount: firstSpan.upstreamBoards + firstSpan.downstreamBoards,
              boardLength: (firstSpan.spanLength || 20) / 10 // 转换为米
            })
          }
        }
      } catch (error) {
        console.error('获取桥梁数据失败:', error)
      }
    }
    fetchBridgeData()
  }, [setConfig])
  
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
  
  const generateBoardTextures = useCallback(() => {
    const noise = noiseRef.current
    const size = 512
    const colorCanvas = document.createElement('canvas')
    colorCanvas.width = size
    colorCanvas.height = size
    const colorCtx = colorCanvas.getContext('2d')!
    const materialConfig = MATERIAL_CONFIGS[config.material]
    const baseColor = materialConfig.baseColor
    const imageData = colorCtx.createImageData(size, size)
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        const noise1 = noise.fractal(x / 60, y / 60, 4, 0.5)
        const scratch = noise.noise2D(x / 150, y / 8) * config.scratchLevel
        const dirtNoise = noise.fractal(x / 40, y / 40, 3, 0.5) * config.dirtLevel
        
        let r = baseColor.r * 255
        let g = baseColor.g * 255
        let b = baseColor.b * 255
        
        const variation = (noise1 * 0.08 + scratch)
        r = Math.max(0, Math.min(255, r * (1 + variation) - dirtNoise * 25))
        g = Math.max(0, Math.min(255, g * (1 + variation) - dirtNoise * 30))
        b = Math.max(0, Math.min(255, b * (1 + variation) - dirtNoise * 35))
        
        imageData.data[i] = r
        imageData.data[i + 1] = g
        imageData.data[i + 2] = b
        imageData.data[i + 3] = 255
      }
    }
    colorCtx.putImageData(imageData, 0, 0)
    return { colorTexture: new THREE.CanvasTexture(colorCanvas) }
  }, [config])
  
  // 创建工字钢轨 - 水平放置
  const createRailGeometry = useCallback((length: number) => {
    const shape = new THREE.Shape()
    const railHeight = 0.176
    const headWidth = 0.073
    const headHeight = 0.036
    const webWidth = 0.017
    const baseWidth = 0.150
    const baseHeight = 0.020
    
    // 绘制工字钢断面
    shape.moveTo(-baseWidth/2, 0)
    shape.lineTo(-baseWidth/2, baseHeight)
    shape.lineTo(-headWidth/2, baseHeight)
    shape.lineTo(-webWidth/2, railHeight - headHeight)
    shape.lineTo(-headWidth/2, railHeight)
    shape.lineTo(headWidth/2, railHeight)
    shape.lineTo(headWidth/2, railHeight - headHeight)
    shape.lineTo(webWidth/2, baseHeight)
    shape.lineTo(baseWidth/2, baseHeight)
    shape.lineTo(baseWidth/2, 0)
    shape.closePath()
    
    const geometry = new THREE.ExtrudeGeometry(shape, {
      steps: Math.floor(length * 5),
      depth: length,
      bevelEnabled: false
    })
    // 不旋转 - 钢轨水平放置，断面在XY平面，沿Z轴延伸
    return geometry
  }, [])
  
  // 创建混凝土桥枕
  const createConcreteSleeper = useCallback(() => {
    const group = new THREE.Group()
    
    // 混凝土枕主体尺寸 (标准III型混凝土枕)
    const length = 2.5   // 2.5米长
    const width = 0.28   // 280mm宽
    const height = 0.23  // 230mm高
    
    const sleeperMat = new THREE.MeshStandardMaterial({
      color: 0x707070,
      roughness: 0.85,
      metalness: 0.1
    })
    
    // 主体
    const mainGeom = new THREE.BoxGeometry(width, height, length)
    const main = new THREE.Mesh(mainGeom, sleeperMat)
    group.add(main)
    
    // 承轨槽 (两侧凹陷)
    const grooveMat = new THREE.MeshStandardMaterial({
      color: 0x606060,
      roughness: 0.9,
      metalness: 0.05
    })
    
    const grooveGeom = new THREE.BoxGeometry(width * 0.4, 0.03, 0.15)
    const leftGroove = new THREE.Mesh(grooveGeom, grooveMat)
    leftGroove.position.set(0, height/2 - 0.015, 0.55)
    group.add(leftGroove)
    
    const rightGroove = new THREE.Mesh(grooveGeom.clone(), grooveMat.clone())
    rightGroove.position.set(0, height/2 - 0.015, -0.55)
    group.add(rightGroove)
    
    // 预应力钢筋孔 (可见的端面)
    const holeMat = new THREE.MeshStandardMaterial({
      color: 0x404040,
      roughness: 0.7,
      metalness: 0.3
    })
    
    const holeGeom = new THREE.CylinderGeometry(0.015, 0.015, length + 0.01, 8)
    holeGeom.rotateX(Math.PI / 2)
    
    for (let i = -2; i <= 2; i++) {
      if (i !== 0) {
        const hole = new THREE.Mesh(holeGeom, holeMat)
        hole.position.set(i * 0.04, 0, 0)
        group.add(hole)
      }
    }
    
    return group
  }, [])
  
  // 创建木枕
  const createWoodSleeper = useCallback((noise: SimplexNoise, index: number) => {
    const group = new THREE.Group()
    
    const length = 2.6
    const width = 0.25
    const height = 0.16
    
    const variation = noise.noise2D(index * 0.5, 0) * 0.1
    
    const sleeperMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x4a3520).offsetHSL(variation * 0.1, 0, variation * 0.15),
      roughness: 0.9,
      metalness: 0.0
    })
    
    const sleeperGeom = new THREE.BoxGeometry(width, height, length)
    const sleeper = new THREE.Mesh(sleeperGeom, sleeperMat)
    group.add(sleeper)
    
    return group
  }, [])
  
  // 创建桥墩
  const createBridgePier = useCallback((position: number, height: number = 3) => {
    const group = new THREE.Group()
    
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.9,
      metalness: 0.05
    })
    
    // 墩身 (梯形截面)
    const bodyHeight = height - 0.5
    const topWidth = 1.8
    const bottomWidth = 2.8
    const depth = 1.5
    
    // 使用BoxGeometry简化 (实际梯形可以用ExtrudeGeometry)
    const bodyGeom = new THREE.BoxGeometry(topWidth, bodyHeight, depth)
    const body = new THREE.Mesh(bodyGeom, concreteMat)
    body.position.y = -bodyHeight / 2
    group.add(body)
    
    // 墩帽
    const capGeom = new THREE.BoxGeometry(topWidth + 0.4, 0.3, depth + 0.3)
    const cap = new THREE.Mesh(capGeom, concreteMat.clone())
    cap.position.y = 0.15
    group.add(cap)
    
    // 托盘 (墩身到墩帽的过渡)
    const trayGeom = new THREE.BoxGeometry(topWidth + 0.2, 0.2, depth + 0.15)
    const tray = new THREE.Mesh(trayGeom, concreteMat.clone())
    tray.position.y = -0.1
    group.add(tray)
    
    // 基础
    const foundationGeom = new THREE.BoxGeometry(bottomWidth + 0.5, 0.5, depth + 0.5)
    const foundation = new THREE.Mesh(foundationGeom, concreteMat.clone())
    foundation.position.y = -bodyHeight - 0.25
    group.add(foundation)
    
    // 设置位置
    group.position.z = -position
    
    return group
  }, [])
  
  // 创建支座及支承垫石
  const createBearing = useCallback((x: number, z: number) => {
    const group = new THREE.Group()
    
    // 支承垫石 (混凝土)
    const padStoneMat = new THREE.MeshStandardMaterial({
      color: 0x909090,
      roughness: 0.85,
      metalness: 0.1
    })
    
    const padStoneGeom = new THREE.BoxGeometry(0.6, 0.15, 0.6)
    const padStone = new THREE.Mesh(padStoneGeom, padStoneMat)
    padStone.position.y = 0.075
    group.add(padStone)
    
    // 支座下板 (钢板)
    const basePlateMat = new THREE.MeshStandardMaterial({
      color: 0x505050,
      roughness: 0.4,
      metalness: 0.8
    })
    
    const basePlateGeom = new THREE.BoxGeometry(0.5, 0.03, 0.5)
    const basePlate = new THREE.Mesh(basePlateGeom, basePlateMat)
    basePlate.position.y = 0.165
    group.add(basePlate)
    
    // 支座主体 (橡胶支座)
    const bearingMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.7,
      metalness: 0.3
    })
    
    const bearingGeom = new THREE.CylinderGeometry(0.18, 0.2, 0.12, 16)
    const bearing = new THREE.Mesh(bearingGeom, bearingMat)
    bearing.position.y = 0.24
    group.add(bearing)
    
    // 支座上板
    const topPlateGeom = new THREE.BoxGeometry(0.45, 0.025, 0.45)
    const topPlate = new THREE.Mesh(topPlateGeom, basePlateMat.clone())
    topPlate.position.y = 0.31
    group.add(topPlate)
    
    // 设置位置
    group.position.set(x, 0, z)
    
    return group
  }, [])
  
  // 创建石砟层
  const createBallast = useCallback((length: number, width: number, noise: SimplexNoise) => {
    const group = new THREE.Group()
    
    // 石砟基础层 (道床)
    const ballastMat = new THREE.MeshStandardMaterial({
      color: 0x6a6a6a,
      roughness: 0.95,
      metalness: 0.0
    })
    
    const baseGeom = new THREE.BoxGeometry(width + 1.5, 0.35, length)
    const base = new THREE.Mesh(baseGeom, ballastMat)
    base.position.y = -0.35
    group.add(base)
    
    // 石砟粒子
    const stoneGeom = new THREE.DodecahedronGeometry(0.035, 0)
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x7a7a7a,
      roughness: 0.9,
      metalness: 0.05
    })
    
    const stoneCount = Math.min(1500, Math.floor(length * 120))
    const instancedStones = new THREE.InstancedMesh(stoneGeom, stoneMat, stoneCount)
    
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const rotation = new THREE.Euler()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    
    for (let i = 0; i < stoneCount; i++) {
      const x = (noise.noise2D(i * 0.1, 0) * 0.5) * (width / 2 + 0.5)
      const y = -0.22 + noise.noise2D(i * 0.15, 1) * 0.1
      const z = (noise.noise2D(i * 0.1, 2) * 0.5) * length - length / 2
      
      position.set(x, y, z)
      rotation.set(
        noise.noise2D(i, 3) * Math.PI,
        noise.noise2D(i, 4) * Math.PI,
        noise.noise2D(i, 5) * Math.PI
      )
      quaternion.setFromEuler(rotation)
      
      const s = 0.5 + noise.noise2D(i, 6) * 0.6
      scale.set(s, s * (0.6 + noise.noise2D(i, 7) * 0.4), s)
      
      matrix.compose(position, quaternion, scale)
      instancedStones.setMatrixAt(i, matrix)
    }
    
    instancedStones.instanceMatrix.needsUpdate = true
    group.add(instancedStones)
    
    return group
  }, [])
  
  // 创建挡砟墙
  const createBallastWall = useCallback((length: number) => {
    const group = new THREE.Group()
    
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x707070,
      roughness: 0.85,
      metalness: 0.1
    })
    
    const wallHeight = 0.3
    const wallThickness = 0.15
    const wallOffset = 2.2
    
    const wallGeom = new THREE.BoxGeometry(wallThickness, wallHeight, length)
    
    const leftWall = new THREE.Mesh(wallGeom, wallMat)
    leftWall.position.set(-wallOffset, wallHeight / 2 - 0.1, -length / 2)
    group.add(leftWall)
    
    const rightWall = new THREE.Mesh(wallGeom.clone(), wallMat.clone())
    rightWall.position.set(wallOffset, wallHeight / 2 - 0.1, -length / 2)
    group.add(rightWall)
    
    return group
  }, [])
  
  // 创建步行板
  const createBoardGeometry = useCallback(() => {
    return new THREE.BoxGeometry(config.boardWidth, config.boardThickness, config.boardLength)
  }, [config.boardWidth, config.boardLength, config.boardThickness])
  
  const createRailing = useCallback((side: 'left' | 'right') => {
    const group = new THREE.Group()
    const totalLength = config.boardLength * config.boardCount
    const postMat = new THREE.MeshStandardMaterial({
      color: config.railingStyle === 'modern' ? 0x2a2a2a : 0x4a4a4a,
      metalness: 0.85,
      roughness: 0.35
    })
    
    const postHeight = config.railingStyle === 'safety' ? 1.2 : 1.0
    const postSpacing = config.railingStyle === 'modern' ? 2.5 : 2.0
    const postCount = Math.ceil(totalLength / postSpacing) + 1
    
    for (let i = 0; i < postCount; i++) {
      const postRadius = config.railingStyle === 'modern' ? 0.025 : 0.035
      const postGeom = new THREE.CylinderGeometry(postRadius, postRadius * 1.1, postHeight, 8)
      const post = new THREE.Mesh(postGeom, postMat)
      post.position.set(0, postHeight / 2, -totalLength / 2 + i * postSpacing)
      group.add(post)
    }
    
    const railRadius = config.railingStyle === 'modern' ? 0.018 : 0.022
    const railGeom = new THREE.CylinderGeometry(railRadius, railRadius, totalLength, 8)
    railGeom.rotateZ(Math.PI / 2)
    
    const topRail = new THREE.Mesh(railGeom, postMat)
    topRail.position.set(0, postHeight, 0)
    topRail.rotation.y = Math.PI / 2
    group.add(topRail)
    
    if (config.railingStyle === 'safety' || config.railingStyle === 'industrial') {
      const midRail = new THREE.Mesh(railGeom.clone(), postMat)
      midRail.position.set(0, postHeight * 0.55, 0)
      midRail.rotation.y = Math.PI / 2
      group.add(midRail)
    }
    
    return group
  }, [config])
  
  // 创建桥墩周围的铁路围栏
  const createPierFence = useCallback((pierPosition: number, pierHeight: number = 3) => {
    const group = new THREE.Group()
    
    const fenceMat = new THREE.MeshStandardMaterial({
      color: 0xe5e5e5, // 银灰色
      metalness: 0.8,
      roughness: 0.3
    })
    
    const fenceHeight = 1.2
    const postSpacing = 2.0
    const fenceRadius = 3.5 // 围栏距离桥墩的距离
    
    // 四个方向的围栏
    const directions = [
      { angle: 0, length: 6 },    // 前方
      { angle: Math.PI, length: 6 }, // 后方
      { angle: Math.PI/2, length: 4 }, // 左侧
      { angle: -Math.PI/2, length: 4 } // 右侧
    ]
    
    directions.forEach(dir => {
      const fenceGroup = new THREE.Group()
      
      // 立柱
      const postCount = Math.ceil(dir.length / postSpacing) + 1
      for (let i = 0; i < postCount; i++) {
        const postGeom = new THREE.CylinderGeometry(0.04, 0.04, fenceHeight, 8)
        const post = new THREE.Mesh(postGeom, fenceMat)
        post.position.set(
          -dir.length/2 + i * postSpacing,
          fenceHeight/2 - pierHeight,
          0
        )
        fenceGroup.add(post)
      }
      
      // 横杆 (上下两根)
      const railGeom = new THREE.CylinderGeometry(0.025, 0.025, dir.length, 8)
      railGeom.rotateZ(Math.PI / 2)
      
      const topRail = new THREE.Mesh(railGeom, fenceMat)
      topRail.position.set(0, fenceHeight - pierHeight, 0)
      topRail.rotation.y = Math.PI / 2
      fenceGroup.add(topRail)
      
      const bottomRail = new THREE.Mesh(railGeom.clone(), fenceMat)
      bottomRail.position.set(0, fenceHeight * 0.4 - pierHeight, 0)
      bottomRail.rotation.y = Math.PI / 2
      fenceGroup.add(bottomRail)
      
      // 网格 (铁丝网)
      const gridMat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.6,
        roughness: 0.5,
        side: THREE.DoubleSide
      })
      
      // 创建网格线
      const gridLinesV = 15
      for (let i = 0; i <= gridLinesV; i++) {
        const wireGeom = new THREE.CylinderGeometry(0.008, 0.008, fenceHeight * 0.8, 4)
        const wire = new THREE.Mesh(wireGeom, gridMat)
        wire.position.set(
          -dir.length/2 + i * (dir.length / gridLinesV),
          fenceHeight * 0.6 - pierHeight,
          0
        )
        fenceGroup.add(wire)
      }
      
      // 横向网格线
      const gridLinesH = 5
      for (let i = 1; i < gridLinesH; i++) {
        const wireGeom = new THREE.CylinderGeometry(0.008, 0.008, dir.length, 4)
        wireGeom.rotateZ(Math.PI / 2)
        const wire = new THREE.Mesh(wireGeom, gridMat)
        wire.position.set(0, fenceHeight * 0.2 + i * (fenceHeight * 0.6 / gridLinesH) - pierHeight, 0)
        wire.rotation.y = Math.PI / 2
        fenceGroup.add(wire)
      }
      
      fenceGroup.rotation.y = dir.angle
      fenceGroup.position.set(
        Math.sin(dir.angle) * fenceRadius,
        0,
        -pierPosition - Math.cos(dir.angle) * fenceRadius
      )
      group.add(fenceGroup)
    })
    
    return group
  }, [])
  
  // 创建带状态颜色的步行板
  const createBoardWithStatus = useCallback((status: string, boardWidth: number, boardThickness: number, boardLength: number) => {
    const group = new THREE.Group()
    
    // 获取状态颜色
    const statusColor = BOARD_STATUS_COLORS[status] || BOARD_STATUS_COLORS.normal
    
    // 步行板主体
    const boardMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(statusColor),
      metalness: 0.7,
      roughness: 0.3,
      side: THREE.DoubleSide
    })
    
    const boardGeom = new THREE.BoxGeometry(boardWidth, boardThickness, boardLength)
    const board = new THREE.Mesh(boardGeom, boardMat)
    group.add(board)
    
    // 边框 - 使步行板更加分明
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.9,
      roughness: 0.2
    })
    
    const edgeThickness = 0.02
    // 四个边框
    const edges = [
      { w: boardWidth + edgeThickness * 2, h: edgeThickness, d: edgeThickness, x: 0, y: 0, z: -boardLength/2 },
      { w: boardWidth + edgeThickness * 2, h: edgeThickness, d: edgeThickness, x: 0, y: 0, z: boardLength/2 },
      { w: edgeThickness, h: edgeThickness, d: boardLength, x: -boardWidth/2, y: 0, z: 0 },
      { w: edgeThickness, h: edgeThickness, d: boardLength, x: boardWidth/2, y: 0, z: 0 }
    ]
    
    edges.forEach(e => {
      const edgeGeom = new THREE.BoxGeometry(e.w, e.h, e.d)
      const edge = new THREE.Mesh(edgeGeom, edgeMat)
      edge.position.set(e.x, boardThickness/2 + e.h/2, e.z)
      group.add(edge)
    })
    
    // 中心标识 - 高亮状态
    if (status !== 'normal') {
      const indicatorGeom = new THREE.BoxGeometry(boardWidth * 0.3, 0.01, boardLength * 0.3)
      const indicatorMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(statusColor),
        emissive: new THREE.Color(statusColor),
        emissiveIntensity: 0.5
      })
      const indicator = new THREE.Mesh(indicatorGeom, indicatorMat)
      indicator.position.y = boardThickness/2 + 0.01
      group.add(indicator)
    }
    
    return group
  }, [])
  
  const applyRenderMode = useCallback((group: THREE.Group) => {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        switch (config.renderMode) {
          case 'photorealistic':
            obj.material.wireframe = false
            obj.material.emissive = new THREE.Color(0x000000)
            obj.material.emissiveIntensity = 0
            break
          case 'wireframe':
            obj.material.wireframe = true
            obj.material.emissive = new THREE.Color(0x00ffff)
            obj.material.emissiveIntensity = 0.3
            break
          case 'safety_inspection':
            obj.material.wireframe = false
            const damageLevel = config.scratchLevel + config.rustLevel + config.dirtLevel
            if (damageLevel > 0.6) {
              obj.material.emissive = new THREE.Color(0x660000)
              obj.material.emissiveIntensity = 0.4
            } else if (damageLevel > 0.3) {
              obj.material.emissive = new THREE.Color(0x664400)
              obj.material.emissiveIntensity = 0.3
            } else {
              obj.material.emissive = new THREE.Color(0x004400)
              obj.material.emissiveIntensity = 0.2
            }
            break
        }
        obj.material.needsUpdate = true
      }
    })
  }, [config.renderMode, config.scratchLevel, config.rustLevel, config.dirtLevel])
  
  const generateBridge = useCallback(() => {
    if (!sceneRef.current) return

    setIsLoading(true)

    if (bridgeGroupRef.current) {
      sceneRef.current.remove(bridgeGroupRef.current)
      bridgeGroupRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (obj.material instanceof THREE.Material) obj.material.dispose()
        }
      })
    }

    const bridgeGroup = new THREE.Group()
    bridgeGroupRef.current = bridgeGroup

    noiseRef.current = new SimplexNoise(config.seed)
    const noise = noiseRef.current

    const gaugeMeters = config.railGauge / 1000
    const railOffset = gaugeMeters / 2

    // 使用实际数据或默认配置
    const useRealData = bridgeData && bridgeData.spans && bridgeData.spans.length > 0
    const spans = useRealData ? bridgeData.spans : [{ spanNumber: 1, spanLength: config.boardLength * config.boardCount, upstreamBoards: config.boardCount / 2, downstreamBoards: config.boardCount / 2, upstreamColumns: 2, downstreamColumns: 2, shelterSide: 'none', shelterBoards: 0, walkingBoards: [] }]

    let currentZ = 0

    spans.forEach((span, spanIndex) => {
      const spanLength = span.spanLength || config.boardLength * config.boardCount
      const spanStartZ = currentZ

      // ============ 1. 桥墩 (每个孔位两端) ============
      const pierHeight = 4
      if (spanIndex === 0) {
        // 第一个孔位的起始桥墩
        bridgeGroup.add(createBridgePier(spanStartZ, pierHeight))
        // 添加桥墩围栏
        bridgeGroup.add(createPierFence(spanStartZ, pierHeight))
      }
      // 每个孔位的结束桥墩
      bridgeGroup.add(createBridgePier(spanStartZ + spanLength, pierHeight))
      bridgeGroup.add(createPierFence(spanStartZ + spanLength, pierHeight))

      // ============ 2. 支座及支承垫石 ============
      bridgeGroup.add(createBearing(-railOffset - 0.3, -spanStartZ))
      bridgeGroup.add(createBearing(railOffset + 0.3, -spanStartZ))
      bridgeGroup.add(createBearing(-railOffset - 0.3, -spanStartZ - spanLength))
      bridgeGroup.add(createBearing(railOffset + 0.3, -spanStartZ - spanLength))

      // ============ 3. 主梁 (纵梁) ============
      const beamMat = new THREE.MeshStandardMaterial({
        color: 0x4a4a4a,
        metalness: 0.8,
        roughness: 0.3
      })

      const beamHeight = 0.6
      const beamWidth = 0.3
      const beamPositions = [-gaugeMeters - 0.5, gaugeMeters + 0.5]

      beamPositions.forEach(x => {
        const beamGeom = new THREE.BoxGeometry(beamWidth, beamHeight, spanLength)
        const beam = new THREE.Mesh(beamGeom, beamMat)
        beam.position.set(x, -beamHeight / 2 + 0.35, -spanStartZ - spanLength / 2)
        bridgeGroup.add(beam)
      })

      // ============ 4. 横梁 ============
      const crossBeamMat = new THREE.MeshStandardMaterial({
        color: 0x5a5a5a,
        metalness: 0.7,
        roughness: 0.35
      })

      const crossBeamSpacing = 1.5
      const crossBeamCount = Math.ceil(spanLength / crossBeamSpacing)

      for (let i = 0; i <= crossBeamCount; i++) {
        const crossBeamGeom = new THREE.BoxGeometry(gaugeMeters * 2 + 1.5, 0.3, 0.15)
        const crossBeam = new THREE.Mesh(crossBeamGeom, crossBeamMat.clone())
        crossBeam.position.set(0, -0.15, -spanStartZ - i * crossBeamSpacing)
        bridgeGroup.add(crossBeam)
      }

      // ============ 5. 石砟层 - 完整铺设 ============
      const ballast = createBallast(spanLength, gaugeMeters + 1, noise)
      ballast.position.z = -spanStartZ - spanLength / 2
      bridgeGroup.add(ballast)

      // ============ 6. 挡砟墙 ============
      const ballastWall = createBallastWall(spanLength)
      ballastWall.position.z = -spanStartZ
      bridgeGroup.add(ballastWall)

      // ============ 7. 桥枕 - 完整铺设 ============
      const sleeperSpacing = 0.6
      const sleeperCount = Math.floor(spanLength / sleeperSpacing)

      for (let i = 0; i < sleeperCount; i++) {
        const z = -spanStartZ - spanLength / 2 + i * sleeperSpacing + sleeperSpacing / 2

        if (config.sleeperType === 'concrete') {
          const sleeper = createConcreteSleeper()
          sleeper.position.set(0, 0.05, z)
          sleeper.rotation.y = Math.PI / 2
          bridgeGroup.add(sleeper)
        } else {
          const sleeper = createWoodSleeper(noise, i)
          sleeper.position.set(0, 0.02, z)
          sleeper.rotation.y = Math.PI / 2
          bridgeGroup.add(sleeper)
        }
      }

      // ============ 8. 钢轨 - 铺设在所有桥面 ============
      const railMat = new THREE.MeshStandardMaterial({
        color: 0x5a5a5a,
        metalness: 0.95,
        roughness: 0.15,
        envMap: envMapRef.current,
        envMapIntensity: 1.5
      })

      const guardRailMat = new THREE.MeshStandardMaterial({
        color: 0x6a6a6a,
        metalness: 0.9,
        roughness: 0.25,
        envMap: envMapRef.current,
        envMapIntensity: 1.2
      })

      const railGeom = createRailGeometry(spanLength)

      // 2根正轨
      const leftRail = new THREE.Mesh(railGeom, railMat)
      leftRail.position.set(-railOffset, 0.25, -spanStartZ - spanLength / 2)
      bridgeGroup.add(leftRail)

      const rightRail = new THREE.Mesh(railGeom.clone(), railMat.clone())
      rightRail.position.set(railOffset, 0.25, -spanStartZ - spanLength / 2)
      bridgeGroup.add(rightRail)

      // 2根护轨 (在内侧)
      const guardRailOffset = railOffset - 0.25
      const leftGuardRail = new THREE.Mesh(railGeom.clone(), guardRailMat)
      leftGuardRail.position.set(-guardRailOffset, 0.23, -spanStartZ - spanLength / 2)
      leftGuardRail.scale.set(0.85, 0.85, 1)
      bridgeGroup.add(leftGuardRail)

      const rightGuardRail = new THREE.Mesh(railGeom.clone(), guardRailMat.clone())
      rightGuardRail.position.set(guardRailOffset, 0.23, -spanStartZ - spanLength / 2)
      rightGuardRail.scale.set(0.85, 0.85, 1)
      bridgeGroup.add(rightGuardRail)

      // ============ 9. 步行板 - 根据数据显示，个个分明 ============
      const boardWidthMeters = 0.8
      const boardLengthMeters = spanLength / (span.upstreamBoards || 5)
      const boardThickness = 0.06

      // 使用实际数据渲染步行板
      if (span.walkingBoards && span.walkingBoards.length > 0) {
        // 按位置分组
        const upstreamBoards = span.walkingBoards.filter(b => b.position === 'upstream')
        const downstreamBoards = span.walkingBoards.filter(b => b.position === 'downstream')

        // 上游步行板
        upstreamBoards.forEach((board, i) => {
          const boardMesh = createBoardWithStatus(board.status, boardWidthMeters, boardThickness, boardLengthMeters * 0.9)
          boardMesh.position.set(
            railOffset + gaugeMeters / 2 + boardWidthMeters / 2 + 0.3,
            0.5,
            -spanStartZ - boardLengthMeters * i - boardLengthMeters / 2
          )
          bridgeGroup.add(boardMesh)
        })

        // 下游步行板
        downstreamBoards.forEach((board, i) => {
          const boardMesh = createBoardWithStatus(board.status, boardWidthMeters, boardThickness, boardLengthMeters * 0.9)
          boardMesh.position.set(
            -railOffset - gaugeMeters / 2 - boardWidthMeters / 2 - 0.3,
            0.5,
            -spanStartZ - boardLengthMeters * i - boardLengthMeters / 2
          )
          bridgeGroup.add(boardMesh)
        })

        // 避车台步行板
        const shelterBoards = span.walkingBoards.filter(b => b.position.startsWith('shelter'))
        shelterBoards.forEach((board) => {
          const boardMesh = createBoardWithStatus(board.status, boardWidthMeters * 0.8, boardThickness, boardLengthMeters * 0.9)
          const isLeft = board.position.includes('left')
          boardMesh.position.set(
            isLeft ? -railOffset - gaugeMeters * 1.5 : railOffset + gaugeMeters * 1.5,
            0.5,
            -spanStartZ - spanLength / 2 + board.boardNumber * boardLengthMeters
          )
          bridgeGroup.add(boardMesh)
        })
      } else {
        // 默认步行板显示
        const upstreamCount = span.upstreamBoards || Math.floor(config.boardCount / 2)
        const downstreamCount = span.downstreamBoards || Math.floor(config.boardCount / 2)

        // 上游步行板
        for (let i = 0; i < upstreamCount; i++) {
          const boardMesh = createBoardWithStatus('normal', boardWidthMeters, boardThickness, boardLengthMeters * 0.9)
          boardMesh.position.set(
            railOffset + gaugeMeters / 2 + boardWidthMeters / 2 + 0.3,
            0.5,
            -spanStartZ - boardLengthMeters * i - boardLengthMeters / 2
          )
          bridgeGroup.add(boardMesh)
        }

        // 下游步行板
        for (let i = 0; i < downstreamCount; i++) {
          const boardMesh = createBoardWithStatus('normal', boardWidthMeters, boardThickness, boardLengthMeters * 0.9)
          boardMesh.position.set(
            -railOffset - gaugeMeters / 2 - boardWidthMeters / 2 - 0.3,
            0.5,
            -spanStartZ - boardLengthMeters * i - boardLengthMeters / 2
          )
          bridgeGroup.add(boardMesh)
        }
      }

      // ============ 10. 护栏 ============
      const railingL = createRailing('left')
      railingL.position.x = railOffset + gaugeMeters / 2 + boardWidthMeters + 0.45
      railingL.position.y = 0.55
      railingL.position.z = -spanStartZ
      bridgeGroup.add(railingL)

      const railingR = createRailing('right')
      railingR.position.x = -railOffset - gaugeMeters / 2 - boardWidthMeters - 0.45
      railingR.position.y = 0.55
      railingR.position.z = -spanStartZ
      bridgeGroup.add(railingR)

      currentZ += spanLength
    })

    applyRenderMode(bridgeGroup)
    sceneRef.current.add(bridgeGroup)

    setIsLoading(false)
  }, [config, bridgeData, createRailGeometry, createConcreteSleeper, createWoodSleeper,
      createBridgePier, createBearing, createBallast, createBallastWall,
      createBoardGeometry, createRailing, generateBoardTextures, applyRenderMode,
      createPierFence, createBoardWithStatus])
  
  const updateLightIntensity = useCallback((intensity: number) => {
    if (!lightsRef.current) return
    lightsRef.current.ambient.intensity = 0.4 * intensity
    lightsRef.current.directional.intensity = 1.2 * intensity
    lightsRef.current.directional2.intensity = 0.5 * intensity
    lightsRef.current.fill.intensity = 0.3 * intensity
    lightsRef.current.hemisphere.intensity = 0.6 * intensity
    if (rendererRef.current) {
      rendererRef.current.toneMappingExposure = 1.0 + intensity * 0.5
    }
  }, [])
  
  useEffect(() => {
    if (!containerRef.current) return
    
    envMapRef.current = createHDREnvironmentMap()
    
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x8899aa)
    scene.fog = new THREE.Fog(0x8899aa, 30, 150)
    scene.environment = envMapRef.current
    sceneRef.current = scene
    
    const camera = new THREE.PerspectiveCamera(
      55,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      500
    )
    camera.position.set(15, 8, 18)
    camera.lookAt(0, 0, -5)
    cameraRef.current = camera
    
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.5
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer
    
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI / 2 - 0.05
    controls.minDistance = 3
    controls.maxDistance = 60
    controls.target.set(0, 0, -5)
    controlsRef.current = controls
    
    const ambientLight = new THREE.AmbientLight(0xb0c4de, 0.6)
    scene.add(ambientLight)
    
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x4a4a3a, 0.8)
    scene.add(hemisphereLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffeedd, 1.5)
    directionalLight.position.set(15, 30, 20)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)
    
    const directionalLight2 = new THREE.DirectionalLight(0xadd8e6, 0.6)
    directionalLight2.position.set(-15, 15, -15)
    scene.add(directionalLight2)
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4)
    fillLight.position.set(0, 10, 25)
    scene.add(fillLight)
    
    lightsRef.current = {
      ambient: ambientLight,
      directional: directionalLight,
      directional2: directionalLight2,
      fill: fillLight,
      hemisphere: hemisphereLight
    }
    
    const pierHeight = 4  // 桥墩高度常量
    const gridHelper = new THREE.GridHelper(80, 80, 0x404040, 0x303030)
    gridHelper.position.y = -pierHeight - 1
    scene.add(gridHelper)
    
    const groundGeom = new THREE.PlaneGeometry(150, 150)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3a4a3a,
      roughness: 0.9,
      metalness: 0.1
    })
    const ground = new THREE.Mesh(groundGeom, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -pierHeight - 1
    ground.receiveShadow = true
    scene.add(ground)
    
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()
    
    const handleResize = () => {
      if (!containerRef.current) return
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjection()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [createHDREnvironmentMap])
  
  useEffect(() => {
    generateBridge()
  }, [generateBridge])
  
  useEffect(() => {
    updateLightIntensity(config.lightIntensity)
  }, [config.lightIntensity, updateLightIntensity])
  
  const handleRegenerate = () => regenerate()
  
  return (
    <div className="relative w-full h-full bg-slate-900">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* 左侧控制面板 */}
      <div className="absolute top-14 left-4 bottom-8 w-72 bg-slate-950/98 backdrop-blur-md border-2 border-cyan-500/50 rounded-lg overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 border-b border-cyan-500/40 bg-slate-900/80">
          <h3 className="text-cyan-300 font-bold text-lg drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">3D桥梁模型参数</h3>
          <p className="text-slate-300 text-xs mt-1">普速铁路明桥面 · 完整结构</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/60">
          <button
            onClick={handleRegenerate}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-bold shadow-lg shadow-cyan-500/30 hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-400/40 transition-all"
          >
            🔄 重新生成场景
          </button>
          
          {/* 步行板材质 */}
          <div>
            <label className="text-slate-200 text-sm font-medium block mb-2">步行板材质</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(MATERIAL_CONFIGS).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setConfig({ material: key as any })}
                  className={`py-2 px-3 rounded text-xs font-medium transition-all ${
                    config.material === key
                      ? 'bg-cyan-500/40 text-cyan-200 border-2 border-cyan-400 shadow-lg shadow-cyan-500/30'
                      : 'bg-slate-800/80 text-slate-200 border border-slate-600 hover:border-cyan-500/50 hover:bg-slate-700/80'
                  }`}
                >
                  {value.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* 护栏样式 */}
          <div>
            <label className="text-slate-200 text-sm font-medium block mb-2">护栏样式</label>
            <select
              value={config.railingStyle}
              onChange={(e) => setConfig({ railingStyle: e.target.value as any })}
              className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-white font-medium focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
              <option value="industrial">工业风格</option>
              <option value="safety">安全防护</option>
              <option value="modern">简约现代</option>
            </select>
          </div>
          
          {/* 渲染模式 */}
          <div>
            <label className="text-slate-200 text-sm font-medium block mb-2">渲染模式</label>
            <select
              value={config.renderMode}
              onChange={(e) => setConfig({ renderMode: e.target.value as any })}
              className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-white font-medium focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
              <option value="photorealistic">📷 照片级真实感</option>
              <option value="wireframe">📐 线框结构图</option>
              <option value="safety_inspection">🔍 施工安全检测</option>
            </select>
          </div>
          
          {/* 枕木类型 */}
          <div>
            <label className="text-slate-200 text-sm font-medium block mb-2">桥枕类型</label>
            <select
              value={config.sleeperType}
              onChange={(e) => setConfig({ sleeperType: e.target.value as any })}
              className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-white font-medium focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
              <option value="concrete">混凝土桥枕</option>
              <option value="wood">木质枕木</option>
            </select>
          </div>
          
          {/* 轨距 */}
          <div>
            <label className="text-slate-200 text-sm font-medium block mb-2">
              铁轨轨距: <span className="text-cyan-300 font-bold">{config.railGauge}mm</span>
            </label>
            <input
              type="range"
              min="1000"
              max="1700"
              step="5"
              value={config.railGauge}
              onChange={(e) => setConfig({ railGauge: parseInt(e.target.value) })}
              className="w-full accent-cyan-500 h-2"
            />
            <div className="flex justify-between text-xs text-slate-300 mt-1 font-medium">
              <span>1000mm</span>
              <span>标准1435mm</span>
              <span>1700mm</span>
            </div>
          </div>
          
          {/* 光照强度 */}
          <div>
            <label className="text-slate-200 text-sm font-medium block mb-2">
              光照强度: <span className="text-yellow-300 font-bold">{config.lightIntensity.toFixed(1)}x</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={config.lightIntensity}
              onChange={(e) => setConfig({ lightIntensity: parseFloat(e.target.value) })}
              className="w-full accent-yellow-500 h-2"
            />
          </div>
          
          {/* 磨损参数 */}
          <div className="space-y-3">
            <label className="text-slate-200 text-sm font-medium block">磨损参数</label>
            
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">划痕</span>
                <span className="text-orange-300 font-bold">{(config.scratchLevel * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.scratchLevel}
                onChange={(e) => setConfig({ scratchLevel: parseFloat(e.target.value) })}
                className="w-full accent-orange-500 h-2"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">污渍</span>
                <span className="text-amber-300 font-bold">{(config.dirtLevel * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.dirtLevel}
                onChange={(e) => setConfig({ dirtLevel: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 h-2"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">锈蚀</span>
                <span className="text-red-300 font-bold">{(config.rustLevel * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.rustLevel}
                onChange={(e) => setConfig({ rustLevel: parseFloat(e.target.value) })}
                className="w-full accent-red-500 h-2"
              />
            </div>
          </div>
          
          {/* 结构说明 */}
          <div className="mt-4 p-3 bg-slate-800/70 rounded-lg border border-slate-600">
            <h4 className="text-cyan-300 text-xs font-bold mb-2">桥梁结构元素</h4>
            <ul className="text-slate-300 text-xs space-y-1.5 font-medium">
              <li>🏗️ 桥墩 (混凝土)</li>
              <li>🔩 支座及支承垫石</li>
              <li>📏 纵梁/横梁</li>
              <li>🧱 石砟道床</li>
              <li>🛤️ 桥枕 (混凝土/木枕)</li>
              <li>🚂 4根钢轨 (2正轨+2护轨)</li>
              <li>🚶 步行板 + 护栏</li>
            </ul>
          </div>
        </div>
        
        <div className="p-3 border-t border-cyan-500/40 bg-slate-900/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">场景状态</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
              <span className="text-green-300 font-bold">{isLoading ? '渲染中...' : '实时渲染'}</span>
            </span>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-10 right-4 bg-slate-950/95 backdrop-blur-md border-2 border-cyan-500/50 rounded-lg px-4 py-2 shadow-lg">
        <div className="text-xs text-slate-200 font-medium">
          <span className="text-cyan-300 font-bold">Three.js</span> WebGL · <span className="text-cyan-300 font-bold">PBR</span> 物理渲染
        </div>
      </div>
      
      <div className="absolute top-16 right-4 bg-slate-950/95 backdrop-blur-md border-2 border-cyan-500/50 rounded-lg px-4 py-2 shadow-lg">
        <span className="text-cyan-300 font-bold">
          {config.renderMode === 'photorealistic' && '📷 照片级真实感'}
          {config.renderMode === 'wireframe' && '📐 线框结构图'}
          {config.renderMode === 'safety_inspection' && '🔍 施工安全检测'}
        </span>
      </div>
    </div>
  )
}
