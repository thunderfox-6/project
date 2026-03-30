import fs from 'fs'
import path from 'path'

interface Session {
  userId: string
  createdAt: string
  expiresAt: string
}

const SESSION_FILE = path.join(process.cwd(), 'prisma', 'db', 'sessions.json')

// 使用 globalThis 确保跨 API 路由共享同一个缓存实例
// （Next.js 可能会为不同路由创建独立的模块实例）
const globalForSessions = globalThis as unknown as {
  _sessionStore: {
    cache: Map<string, Session> | null
    lastSaveTime: number
  }
}

if (!globalForSessions._sessionStore) {
  globalForSessions._sessionStore = {
    cache: null,
    lastSaveTime: 0
  }
}

const SAVE_INTERVAL = 5000 // 5秒批量写入

// 从文件加载会话到内存
function loadSessions(): Map<string, Session> {
  if (globalForSessions._sessionStore.cache) return globalForSessions._sessionStore.cache

  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = fs.readFileSync(SESSION_FILE, 'utf-8')
      const parsed = JSON.parse(data) as Record<string, Session>
      globalForSessions._sessionStore.cache = new Map(Object.entries(parsed))
    } else {
      globalForSessions._sessionStore.cache = new Map()
    }
  } catch {
    globalForSessions._sessionStore.cache = new Map()
  }

  return globalForSessions._sessionStore.cache
}

// 使缓存失效（其他路由写入新 session 后调用）
function invalidateCache(): void {
  globalForSessions._sessionStore.cache = null
}

// 异步写入文件（防抖）
function scheduleSave() {
  const now = Date.now()
  if (now - globalForSessions._sessionStore.lastSaveTime < SAVE_INTERVAL) return
  globalForSessions._sessionStore.lastSaveTime = now

  try {
    const obj: Record<string, Session> = {}
    const sessions = loadSessions()
    sessions.forEach((value, key) => {
      obj[key] = value
    })
    const dir = path.dirname(SESSION_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(SESSION_FILE, JSON.stringify(obj, null, 2))
  } catch (error) {
    console.error('保存会话文件失败:', error)
  }
}

// 创建会话
export function createSession(userId: string): string {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7天过期

  const sessions = loadSessions()
  sessions.set(token, {
    userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  })

  // 同步写入，确保登录后立即可用
  try {
    const obj: Record<string, Session> = {}
    sessions.forEach((value, key) => { obj[key] = value })
    const dir = path.dirname(SESSION_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(SESSION_FILE, JSON.stringify(obj, null, 2))
    globalForSessions._sessionStore.lastSaveTime = Date.now()
  } catch (error) {
    console.error('保存会话文件失败:', error)
  }

  return token
}

// 获取会话
export function getSession(token: string): { userId: string } | null {
  let sessions = loadSessions()
  let session = sessions.get(token)

  // 每次获取会话时概率性清理过期会话（约1/100的概率）
  if (Math.random() < 0.01) {
    cleanExpiredSessions()
  }

  // 内存缓存中未找到，从磁盘重新读取（可能是其他路由刚写入的）
  if (!session) {
    invalidateCache()
    sessions = loadSessions()
    session = sessions.get(token)
  }

  if (!session) return null

  if (new Date() > new Date(session.expiresAt)) {
    sessions.delete(token)
    scheduleSave()
    return null
  }

  return { userId: session.userId }
}

// 删除会话（同步写入确保不丢失）
export function deleteSession(token: string): void {
  const sessions = loadSessions()
  sessions.delete(token)
  try {
    const obj: Record<string, Session> = {}
    sessions.forEach((value, key) => { obj[key] = value })
    const dir = path.dirname(SESSION_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(SESSION_FILE, JSON.stringify(obj, null, 2))
    globalForSessions._sessionStore.lastSaveTime = Date.now()
  } catch (error) {
    console.error('保存会话文件失败:', error)
  }
}

// 清理过期会话（定期调用）
export function cleanExpiredSessions() {
  const sessions = loadSessions()
  const now = new Date()
  let changed = false

  sessions.forEach((session, token) => {
    if (now > new Date(session.expiresAt)) {
      sessions.delete(token)
      changed = true
    }
  })

  if (changed) scheduleSave()
}
