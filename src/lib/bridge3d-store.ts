import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 材质类型
export type MaterialType = 'galvanized_steel' | 'treated_wood' | 'composite' | 'aluminum'
export type RailingStyle = 'industrial' | 'safety' | 'modern'
export type RenderMode = 'photorealistic' | 'wireframe' | 'safety_inspection'
export type SleeperType = 'wood' | 'concrete'

// 3D场景配置
export interface Bridge3DConfig {
  // 步行板参数
  boardCount: number
  boardWidth: number
  boardLength: number
  boardThickness: number
  
  // 格栅参数
  gratingHoleSize: number
  gratingSpacing: number
  
  // 材质和样式
  material: MaterialType
  railingStyle: RailingStyle
  renderMode: RenderMode
  sleeperType: SleeperType
  
  // 轨道参数
  railGauge: number // 轨距，单位mm，标准轨1435mm
  
  // 环境参数
  lightIntensity: number // 环境光照强度
  
  // 磨损参数
  scratchLevel: number
  dirtLevel: number
  rustLevel: number
  
  // 随机种子
  seed: number
  
  // 相机位置
  cameraPosition: { x: number; y: number; z: number }
  cameraTarget: { x: number; y: number; z: number }
}

// 默认配置
export const DEFAULT_3D_CONFIG: Bridge3DConfig = {
  boardCount: 8,
  boardWidth: 0.8,
  boardLength: 3.0,
  boardThickness: 0.06,
  gratingHoleSize: 0.025,
  gratingSpacing: 0.04,
  material: 'galvanized_steel',
  railingStyle: 'industrial',
  renderMode: 'photorealistic',
  sleeperType: 'wood',
  railGauge: 1435,
  lightIntensity: 1.5,
  scratchLevel: 0.3,
  dirtLevel: 0.2,
  rustLevel: 0.1,
  seed: Math.random() * 10000,
  cameraPosition: { x: 10, y: 5, z: 12 },
  cameraTarget: { x: 0, y: 0, z: -5 }
}

// Store状态
interface Bridge3DStore {
  config: Bridge3DConfig
  setConfig: (config: Partial<Bridge3DConfig>) => void
  resetConfig: () => void
  regenerate: () => void
}

// 创建持久化store
export const useBridge3DStore = create<Bridge3DStore>()(
  persist(
    (set) => ({
      config: DEFAULT_3D_CONFIG,
      
      setConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig }
        })),
      
      resetConfig: () =>
        set({ config: { ...DEFAULT_3D_CONFIG, seed: Math.random() * 10000 } }),
      
      regenerate: () =>
        set((state) => ({
          config: { ...state.config, seed: Math.random() * 10000 }
        }))
    }),
    {
      name: 'bridge-3d-config',
      partialize: (state) => ({
        config: {
          material: state.config.material,
          railingStyle: state.config.railingStyle,
          renderMode: state.config.renderMode,
          sleeperType: state.config.sleeperType,
          railGauge: state.config.railGauge,
          lightIntensity: state.config.lightIntensity,
          scratchLevel: state.config.scratchLevel,
          dirtLevel: state.config.dirtLevel,
          rustLevel: state.config.rustLevel
        }
      })
    }
  )
)

// 材质配置
export const MATERIAL_CONFIGS: Record<MaterialType, {
  name: string
  baseColor: { r: number; g: number; b: number }
  metalness: number
  roughness: number
  envMapIntensity: number
}> = {
  galvanized_steel: {
    name: '镀锌钢',
    baseColor: { r: 0.65, g: 0.67, b: 0.70 },
    metalness: 0.95,
    roughness: 0.25,
    envMapIntensity: 1.5
  },
  treated_wood: {
    name: '防腐木',
    baseColor: { r: 0.35, g: 0.25, b: 0.15 },
    metalness: 0.0,
    roughness: 0.8,
    envMapIntensity: 0.4
  },
  composite: {
    name: '复合材料',
    baseColor: { r: 0.3, g: 0.32, b: 0.35 },
    metalness: 0.1,
    roughness: 0.6,
    envMapIntensity: 0.5
  },
  aluminum: {
    name: '铝合金',
    baseColor: { r: 0.75, g: 0.77, b: 0.80 },
    metalness: 0.95,
    roughness: 0.15,
    envMapIntensity: 1.8
  }
}

// 渲染模式配置
export const RENDER_MODE_CONFIGS: Record<RenderMode, { name: string; desc: string }> = {
  photorealistic: { name: '照片级真实感', desc: 'PBR物理渲染，逼真材质' },
  wireframe: { name: '线框结构图', desc: '显示几何结构线框' },
  safety_inspection: { name: '施工安全检测', desc: '高亮关键结构区域' }
}

// 护栏样式配置
export const RAILING_STYLE_CONFIGS: Record<RailingStyle, { name: string; desc: string }> = {
  industrial: { name: '工业风格', desc: '经典工业护栏设计' },
  safety: { name: '安全防护', desc: '带金属网的安全护栏' },
  modern: { name: '简约现代', desc: '简洁现代线条设计' }
}
