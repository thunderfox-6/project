// 离线数据库管理 - IndexedDB封装

const DB_NAME = 'bridge-offline-db'
const DB_VERSION = 1

// 离线编辑记录
export interface OfflineEdit {
  id: string
  type: 'board' | 'span' | 'bridge'
  action: 'create' | 'update' | 'delete'
  data: Record<string, unknown>
  timestamp: number
  synced: boolean
}

// 离线缓存数据
export interface OfflineCache {
  bridges: unknown[]
  lastSync: number
}

class OfflineDB {
  private db: IDBDatabase | null = null
  private initPromise: Promise<IDBDatabase> | null = null

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open IndexedDB')
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 创建离线编辑存储
        if (!db.objectStoreNames.contains('edits')) {
          const editsStore = db.createObjectStore('edits', { keyPath: 'id' })
          editsStore.createIndex('synced', 'synced', { unique: false })
          editsStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // 创建离线缓存存储
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' })
        }
      }
    })

    return this.initPromise
  }

  // 添加离线编辑记录
  async addEdit(edit: OfflineEdit): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['edits'], 'readwrite')
      const store = transaction.objectStore('edits')
      const request = store.add(edit)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 获取所有未同步的编辑记录
  async getUnsyncedEdits(): Promise<OfflineEdit[]> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['edits'], 'readonly')
      const store = transaction.objectStore('edits')
      const index = store.index('synced')
      const request = index.getAll(IDBKeyRange.only(false))

      request.onsuccess = () => resolve(request.result as OfflineEdit[])
      request.onerror = () => reject(request.error)
    })
  }

  // 标记编辑记录为已同步
  async markEditSynced(id: string): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['edits'], 'readwrite')
      const store = transaction.objectStore('edits')
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const edit = getRequest.result as OfflineEdit
        if (edit) {
          edit.synced = true
          store.put(edit)
        }
        resolve()
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  // 清理已同步的编辑记录（保留最近7天）
  async cleanupSyncedEdits(): Promise<void> {
    const db = await this.init()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['edits'], 'readwrite')
      const store = transaction.objectStore('edits')
      const index = store.index('synced')
      const request = index.openCursor(IDBKeyRange.only(true))

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          const edit = cursor.value as OfflineEdit
          if (edit.timestamp < sevenDaysAgo) {
            cursor.delete()
          }
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 缓存桥梁数据
  async cacheBridges(bridges: unknown[]): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      const request = store.put({
        key: 'bridges',
        data: bridges,
        lastSync: Date.now()
      })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 获取缓存的桥梁数据
  async getCachedBridges(): Promise<{ data: unknown[]; lastSync: number } | null> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cache'], 'readonly')
      const store = transaction.objectStore('cache')
      const request = store.get('bridges')

      request.onsuccess = () => {
        if (request.result) {
          resolve({
            data: request.result.data as unknown[],
            lastSync: request.result.lastSync
          })
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 获取离线编辑数量
  async getUnsyncedCount(): Promise<number> {
    const edits = await this.getUnsyncedEdits()
    return edits.length
  }

  // 删除所有数据
  async clearAll(): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['edits', 'cache'], 'readwrite')
      const editsStore = transaction.objectStore('edits')
      const cacheStore = transaction.objectStore('cache')

      editsStore.clear()
      cacheStore.clear()

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }
}

// 单例导出
export const offlineDB = new OfflineDB()

// 生成唯一ID
export function generateOfflineId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
