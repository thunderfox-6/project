'use client'

import { useState, useEffect, useCallback } from 'react'
import { offlineDB, OfflineEdit, generateOfflineId } from '@/lib/offline-db'
import { syncService, SyncStatus } from '@/lib/sync-service'

export function useOffline() {
  const [status, setStatus] = useState<SyncStatus>(syncService.getStatus())
  const [isInitialized, setIsInitialized] = useState(false)

  // 初始化
  useEffect(() => {
    const init = async () => {
      await offlineDB.init()
      await syncService.refreshPendingCount()
      setIsInitialized(true)
    }
    init()

    // 订阅状态变化
    const unsubscribe = syncService.subscribe(setStatus)

    // 开始自动同步
    syncService.startAutoSync(30000)

    return () => {
      unsubscribe()
      syncService.stopAutoSync()
    }
  }, [])

  // 手动同步
  const sync = useCallback(async () => {
    return syncService.sync()
  }, [])

  // 记录离线编辑
  const recordEdit = useCallback(async (
    type: 'board' | 'span' | 'bridge',
    action: 'create' | 'update' | 'delete',
    data: Record<string, unknown>
  ) => {
    await syncService.recordEdit({ type, action, data })
  }, [])

  // 获取缓存的桥梁数据
  const getCachedBridges = useCallback(async () => {
    return offlineDB.getCachedBridges()
  }, [])

  // 缓存桥梁数据
  const cacheBridges = useCallback(async (bridges: unknown[]) => {
    return offlineDB.cacheBridges(bridges)
  }, [])

  // 获取未同步编辑数量
  const getUnsyncedCount = useCallback(async () => {
    return offlineDB.getUnsyncedCount()
  }, [])

  return {
    status,
    isInitialized,
    isOnline: status.isOnline,
    isSyncing: status.isSyncing,
    pendingCount: status.pendingCount,
    sync,
    recordEdit,
    getCachedBridges,
    cacheBridges,
    getUnsyncedCount,
    generateOfflineId
  }
}
