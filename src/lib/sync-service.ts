// 离线同步服务

import { offlineDB, OfflineEdit } from './offline-db'

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  lastSyncTime: number | null
  error: string | null
}

type SyncStatusCallback = (status: SyncStatus) => void

class SyncService {
  private status: SyncStatus = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    error: null
  }
  private listeners: Set<SyncStatusCallback> = new Set()
  private syncInterval: NodeJS.Timeout | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      // 监听网络状态变化
      window.addEventListener('online', this.handleOnline.bind(this))
      window.addEventListener('offline', this.handleOffline.bind(this))

      // 从localStorage恢复上次同步时间
      const lastSync = localStorage.getItem('lastSyncTime')
      if (lastSync) {
        this.status.lastSyncTime = parseInt(lastSync)
      }
    }
  }

  private handleOnline() {
    this.status.isOnline = true
    this.notifyListeners()
    this.sync()
  }

  private handleOffline() {
    this.status.isOnline = false
    this.notifyListeners()
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.status }))
  }

  // 订阅状态变化
  subscribe(callback: SyncStatusCallback): () => void {
    this.listeners.add(callback)
    callback({ ...this.status })
    return () => this.listeners.delete(callback)
  }

  // 开始自动同步
  startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
    this.syncInterval = setInterval(() => {
      if (this.status.isOnline && !this.status.isSyncing) {
        this.sync()
      }
    }, intervalMs)
  }

  // 停止自动同步
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  // 同步离线数据
  async sync(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (!this.status.isOnline) {
      return { success: false, syncedCount: 0, error: '离线状态，无法同步' }
    }

    if (this.status.isSyncing) {
      return { success: false, syncedCount: 0, error: '正在同步中' }
    }

    this.status.isSyncing = true
    this.status.error = null
    this.notifyListeners()

    try {
      const unsyncedEdits = await offlineDB.getUnsyncedEdits()
      let syncedCount = 0

      for (const edit of unsyncedEdits) {
        try {
          const success = await this.syncEdit(edit)
          if (success) {
            await offlineDB.markEditSynced(edit.id)
            syncedCount++
          }
        } catch (error) {
          console.error(`Failed to sync edit ${edit.id}:`, error)
          // 继续尝试同步其他记录
        }
      }

      // 清理已同步的旧记录
      await offlineDB.cleanupSyncedEdits()

      // 更新状态
      this.status.pendingCount = await offlineDB.getUnsyncedCount()
      this.status.lastSyncTime = Date.now()
      localStorage.setItem('lastSyncTime', this.status.lastSyncTime.toString())

      return { success: true, syncedCount }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '同步失败'
      this.status.error = errorMessage
      return { success: false, syncedCount: 0, error: errorMessage }
    } finally {
      this.status.isSyncing = false
      this.notifyListeners()
    }
  }

  // 同步单条编辑记录
  private async syncEdit(edit: OfflineEdit): Promise<boolean> {
    const { type, action, data } = edit

    try {
      let url = '/api/'
      let method = 'GET'

      switch (type) {
        case 'board':
          url += 'boards'
          if (action === 'create') {
            method = 'POST'
          } else if (action === 'update') {
            method = 'PUT'
          } else if (action === 'delete') {
            method = 'DELETE'
            url += `?id=${data.id}`
          }
          break
        case 'bridge':
          url += 'bridges'
          if (action === 'create') {
            method = 'POST'
          } else if (action === 'update') {
            method = 'PUT'
          } else if (action === 'delete') {
            method = 'DELETE'
            url += `?id=${data.id}`
          }
          break
        default:
          return false
      }

      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      }

      // 添加认证token
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (token) {
        (options.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
      }

      if (method !== 'GET' && method !== 'DELETE') {
        options.body = JSON.stringify(data)
      }

      const response = await fetch(url, options)
      return response.ok
    } catch (error) {
      console.error('Sync edit failed:', error)
      return false
    }
  }

  // 记录离线编辑
  async recordEdit(edit: Omit<OfflineEdit, 'id' | 'timestamp' | 'synced'>): Promise<void> {
    const fullEdit: OfflineEdit = {
      ...edit,
      id: `edit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      synced: false
    }

    await offlineDB.addEdit(fullEdit)
    this.status.pendingCount = await offlineDB.getUnsyncedCount()
    this.notifyListeners()

    // 如果在线，尝试立即同步
    if (this.status.isOnline) {
      this.sync()
    }
  }

  // 获取当前状态
  getStatus(): SyncStatus {
    return { ...this.status }
  }

  // 刷新待同步数量
  async refreshPendingCount(): Promise<void> {
    this.status.pendingCount = await offlineDB.getUnsyncedCount()
    this.notifyListeners()
  }
}

// 单例导出
export const syncService = new SyncService()
