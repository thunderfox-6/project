// Shared constants for the bridge board system
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Wrench,
  Minus,
  ShieldAlert,
  Activity,
  CloudRain,
  CloudSnow,
  CloudFog,
  Thermometer,
} from 'lucide-react'

// Walking board status configuration
export const BOARD_STATUS_CONFIG: Record<string, {
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: typeof CheckCircle
  glowClass: string
}> = {
  normal: {
    label: '正常',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: 'rgba(34, 197, 94, 0.5)',
    icon: CheckCircle,
    glowClass: 'normal-glow'
  },
  minor_damage: {
    label: '轻微损坏',
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.25)',
    borderColor: 'rgba(234, 179, 8, 0.6)',
    icon: AlertCircle,
    glowClass: 'neon-glow-yellow'
  },
  severe_damage: {
    label: '严重损坏',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.2)',
    borderColor: 'rgba(249, 115, 22, 0.5)',
    icon: AlertTriangle,
    glowClass: 'neon-glow-yellow'
  },
  fracture_risk: {
    label: '断裂风险',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.3)',
    borderColor: 'rgba(239, 68, 68, 0.8)',
    icon: XCircle,
    glowClass: 'danger-pulse fracture-border-blink'
  },
  replaced: {
    label: '已更换',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
    icon: Wrench,
    glowClass: ''
  },
  missing: {
    label: '缺失',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.3)',
    borderColor: 'rgba(107, 114, 128, 0.6)',
    icon: Minus,
    glowClass: ''
  }
}

// Railing status options
export const RAILING_STATUS_OPTIONS = [
  { value: 'normal', label: '正常', desc: '无损坏' },
  { value: 'loose', label: '松动', desc: '固定件松动' },
  { value: 'damaged', label: '损坏', desc: '变形或断裂' },
  { value: 'missing', label: '缺失', desc: '已拆除或丢失' }
]

// Bracket status options
export const BRACKET_STATUS_OPTIONS = [
  { value: 'normal', label: '正常', desc: '无问题' },
  { value: 'loose', label: '松动', desc: '螺栓松动' },
  { value: 'damaged', label: '损坏', desc: '变形开裂' },
  { value: 'corrosion', label: '锈蚀', desc: '严重锈蚀' },
  { value: 'missing', label: '缺失', desc: '已拆除' }
]

// Board material configuration
export const BOARD_MATERIAL_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  galvanized_steel: { label: '镀锌钢', color: '#a8b5c4', desc: '耐腐蚀，强度高' },
  composite: { label: '复合材料', color: '#5a7247', desc: '轻质，防滑性好' },
  aluminum: { label: '铝合金', color: '#c0c8d0', desc: '轻便，耐腐蚀' },
  steel_grating: { label: '钢格栅', color: '#6b7280', desc: '排水性好，防滑' }
}

// Shelter side configuration
export const SHELTER_SIDE_CONFIG: Record<string, { label: string; desc: string }> = {
  none: { label: '无避车台', desc: '不设置避车台' },
  single: { label: '单侧避车台', desc: '仅一侧设置避车台' },
  double: { label: '双侧避车台', desc: '两侧均设置避车台' }
}

// Weather configuration
export const WEATHER_CONFIG: Record<string, { icon: typeof CloudRain; label: string; color: string }> = {
  normal: { icon: Activity, label: '正常', color: '#22c55e' },
  rain: { icon: CloudRain, label: '雨天', color: '#3b82f6' },
  snow: { icon: CloudSnow, label: '雪天', color: '#94a3b8' },
  fog: { icon: CloudFog, label: '雾天', color: '#6b7280' },
  ice: { icon: Thermometer, label: '冰冻', color: '#06b6d4' }
}

// Role labels
export const ROLE_LABELS: Record<string, string> = {
  admin: '系统管理员',
  manager: '桥梁管理者',
  user: '普通用户',
  viewer: '只读用户'
}

// Authenticated fetch wrapper
export function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers = new Headers(options?.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (!headers.has('Content-Type') && options?.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }
  return globalThis.fetch(url, { ...options, headers })
}

// Get status color class helper
export function getStatusColorClass(status: string) {
  const config = BOARD_STATUS_CONFIG[status] || BOARD_STATUS_CONFIG.normal
  return {
    bg: config.bgColor,
    border: config.borderColor,
    color: config.color
  }
}

// Group walking boards by position and column
export function getBoardsByPosition(span: import('@/types/bridge').BridgeSpan) {
  const upstream = span.walkingBoards
    .filter(b => b.position === 'upstream')
    .sort((a, b) => a.columnIndex - b.columnIndex || a.boardNumber - b.boardNumber)
  const downstream = span.walkingBoards
    .filter(b => b.position === 'downstream')
    .sort((a, b) => a.columnIndex - b.columnIndex || a.boardNumber - b.boardNumber)
  const shelterLeft = span.walkingBoards
    .filter(b => b.position === 'shelter_left')
    .sort((a, b) => a.boardNumber - b.boardNumber)
  const shelterRight = span.walkingBoards
    .filter(b => b.position === 'shelter_right')
    .sort((a, b) => a.boardNumber - b.boardNumber)
  const shelterOld = span.walkingBoards
    .filter(b => b.position === 'shelter')
    .sort((a, b) => a.boardNumber - b.boardNumber)

  const groupByColumn = (boards: import('@/types/bridge').WalkingBoard[], columns: number) => {
    const groups: import('@/types/bridge').WalkingBoard[][] = []
    for (let i = 1; i <= columns; i++) {
      groups.push(boards.filter(b => b.columnIndex === i))
    }
    return groups
  }

  return {
    upstream,
    downstream,
    shelterLeft,
    shelterRight,
    shelterOld,
    upstreamColumns: groupByColumn(upstream, span.upstreamColumns),
    downstreamColumns: groupByColumn(downstream, span.downstreamColumns)
  }
}
