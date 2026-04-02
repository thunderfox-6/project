// Shared type definitions for the bridge board system

export interface WalkingBoard {
  id: string
  boardNumber: number
  position: string
  columnIndex: number
  status: string
  damageDesc: string | null
  inspectedBy: string | null
  inspectedAt: string | null
  antiSlipLevel: number | null
  antiSlipLastCheck: string | null
  connectionStatus: string | null
  weatherCondition: string | null
  visibility: number | null
  railingStatus: string | null
  bracketStatus: string | null
  hasObstacle: boolean
  obstacleDesc: string | null
  hasWaterAccum: boolean
  waterAccumDepth: number | null
  remarks: string | null
  boardLength: number | null
  boardWidth: number | null
  boardThickness: number | null
}

export interface BridgeSpan {
  id: string
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
  walkingBoards: WalkingBoard[]
}

export interface Bridge {
  id: string
  name: string
  bridgeCode: string
  location: string | null
  totalSpans: number
  lineName: string | null
  spans: BridgeSpan[]
}

export interface BridgeStats {
  bridgeName: string
  bridgeCode: string
  totalSpans: number
  totalBoards: number
  normalBoards: number
  minorDamageBoards: number
  severeDamageBoards: number
  fractureRiskBoards: number
  replacedBoards: number
  missingBoards: number
  damageRate: number
  highRiskRate: number
  spanStats: {
    spanNumber: number
    spanLength: number
    totalBoards: number
    normalBoards: number
    minorDamageBoards: number
    severeDamageBoards: number
    fractureRiskBoards: number
    replacedBoards: number
    missingBoards: number
    damageRate: number
    highRiskRate: number
    hasHighRisk: boolean
  }[]
}

export interface BridgeSummary {
  id: string
  name: string
  bridgeCode: string
  lineName: string | null
  location: string | null
  totalSpans: number
  totalBoards: number
  normalBoards: number
  minorDamageBoards: number
  severeDamageBoards: number
  fractureRiskBoards: number
  replacedBoards: number
  missingBoards: number
  damageRate: number
  highRiskRate: number
  hasHighRisk: boolean
}

export interface OverallSummary {
  totalBridges: number
  totalSpans: number
  totalBoards: number
  normalBoards: number
  minorDamageBoards: number
  severeDamageBoards: number
  fractureRiskBoards: number
  replacedBoards: number
  missingBoards: number
  overallDamageRate: number
  overallHighRiskRate: number
  highRiskBridges: string[]
  bridgeSummaries: BridgeSummary[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIConfig {
  provider: 'glm' | 'openai' | 'claude' | 'deepseek' | 'minimax' | 'kimi' | 'custom'
  model: string
  apiKey: string
  baseUrl: string
}

export interface CurrentUser {
  id: string
  username: string
  name: string | null
  role: string
}

export type MobileTab = 'bridge' | 'alert' | 'detail' | 'ai' | 'profile'

// 预警相关类型
export interface AlertRecord {
  id: string
  ruleId: string
  rule?: { name: string; scope: string }
  bridgeId: string
  spanId: string | null
  boardId: string | null
  severity: 'critical' | 'warning' | 'info'
  title: string
  message: string
  status: 'active' | 'resolved' | 'dismissed'
  resolvedBy: string | null
  resolvedAt: string | null
  resolveNote: string | null
  triggerData: string | null
  createdAt: string
  updatedAt: string
}

export interface AlertSummary {
  activeCritical: number
  activeWarning: number
  activeInfo: number
  activeTotal: number
}

export interface SnapshotTrendPoint {
  date: string
  totalBoards: number
  normalBoards: number
  minorDamageBoards: number
  severeDamageBoards: number
  fractureRiskBoards: number
  missingBoards: number
  replacedBoards: number
  damageRate: number
  highRiskRate: number
}

export interface NotificationItem {
  id: string
  userId: string
  title: string
  message: string
  type: string
  severity: string | null
  relatedId: string | null
  isRead: boolean
  createdAt: string
}
