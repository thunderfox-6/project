'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { authFetch } from '@/lib/bridge-constants'
import type { Bridge, BridgeStats, OverallSummary, BridgeSpan } from '@/types/bridge'

interface UseBridgeDataReturn {
  bridges: Bridge[]
  setBridges: React.Dispatch<React.SetStateAction<Bridge[]>>
  selectedBridge: Bridge | null
  setSelectedBridge: React.Dispatch<React.SetStateAction<Bridge | null>>
  bridgeStats: BridgeStats | null
  overallSummary: OverallSummary | null
  loading: boolean
  highRiskFilter: boolean
  setHighRiskFilter: React.Dispatch<React.SetStateAction<boolean>>
  bridgeViewMode: 'single' | 'full'
  setBridgeViewMode: React.Dispatch<React.SetStateAction<'single' | 'full'>>
  rightPanelOpen: boolean
  setRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>
  loadBridges: () => Promise<void>
  loadStats: (bridgeId: string) => Promise<void>
  loadSummary: () => Promise<void>
  refreshAllData: (targetBridgeId?: string) => Promise<void>
  refreshBridgeData: () => Promise<void>
}

export function useBridgeData(): UseBridgeDataReturn {
  const [bridges, setBridges] = useState<Bridge[]>([])
  const [selectedBridge, setSelectedBridge] = useState<Bridge | null>(null)
  const [bridgeStats, setBridgeStats] = useState<BridgeStats | null>(null)
  const [overallSummary, setOverallSummary] = useState<OverallSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [highRiskFilter, setHighRiskFilter] = useState(false)
  const [bridgeViewMode, setBridgeViewMode] = useState<'single' | 'full'>('single')
  const [rightPanelOpen, setRightPanelOpen] = useState(false)

  // Load bridge list
  const loadBridges = useCallback(async () => {
    try {
      setLoading(true)
      const response = await authFetch('/api/bridges')
      const data = await response.json()
      if (!response.ok || !Array.isArray(data)) {
        console.error('Failed to load bridges:', data)
        toast.error(data?.error || 'Failed to load bridge list')
        return
      }
      setBridges(data)
      if (data.length > 0) {
        setSelectedBridge(prev => prev ? prev : data[0])
      }
    } catch (error) {
      console.error('Failed to load bridges:', error)
      toast.error('Failed to load bridge list')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load statistics for a bridge
  const loadStats = useCallback(async (bridgeId: string) => {
    try {
      const response = await authFetch(`/api/stats?bridgeId=${bridgeId}`)
      const data = await response.json()
      setBridgeStats(data)
    } catch (error) {
      console.error('Failed to load statistics:', error)
    }
  }, [])

  // Load overall summary
  const loadSummary = useCallback(async () => {
    try {
      const response = await authFetch('/api/summary')
      const data = await response.json()
      setOverallSummary(data)
    } catch (error) {
      console.error('Failed to load summary:', error)
    }
  }, [])

  // Refresh all data (used after import)
  const refreshAllData = useCallback(async (targetBridgeId?: string) => {
    try {
      setLoading(true)
      console.log('[Refresh Data] Starting refresh, target bridge ID:', targetBridgeId)

      // Reload bridge list
      const response = await authFetch('/api/bridges')
      const data = await response.json()
      if (!Array.isArray(data)) {
        console.error('[Refresh Data] Failed to load bridge list:', data)
        toast.error(data?.error || 'Failed to load bridge list')
        return
      }
      setBridges(data)
      console.log('[Refresh Data] Bridge list:', data.length, 'bridges')

      // Determine which bridge ID to select
      let bridgeIdToSelect = targetBridgeId

      // If no target specified but there is a selected bridge, refresh it
      if (!bridgeIdToSelect && selectedBridge) {
        bridgeIdToSelect = selectedBridge.id
      }

      // If there is a target bridge ID, load its data
      if (bridgeIdToSelect) {
        console.log('[Refresh Data] Loading bridge details, ID:', bridgeIdToSelect)
        const bridgeRes = await authFetch(`/api/boards?bridgeId=${bridgeIdToSelect}`)
        const targetBridge = await bridgeRes.json()
        console.log('[Refresh Data] Bridge details:', targetBridge?.name, 'spans:', targetBridge?.spans?.length)
        if (targetBridge) {
          const totalBoards = targetBridge.spans?.reduce((sum: number, span: BridgeSpan) => sum + (span.walkingBoards?.length || 0), 0) || 0
          console.log('[Refresh Data] Total walking boards:', totalBoards)
          setSelectedBridge(targetBridge)
          loadStats(targetBridge.id)
        }
      } else if (data.length > 0) {
        // If no target bridge, select the first one
        const bridgeRes = await authFetch(`/api/boards?bridgeId=${data[0].id}`)
        const firstBridge = await bridgeRes.json()
        setSelectedBridge(firstBridge)
        loadStats(data[0].id)
      }

      // Refresh summary
      loadSummary()
    } catch (error) {
      console.error('Failed to refresh data:', error)
      toast.error('Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }, [selectedBridge, loadStats, loadSummary])

  // Refresh current bridge data
  const refreshBridgeData = useCallback(async () => {
    if (selectedBridge) {
      const bridgeRes = await authFetch(`/api/boards?bridgeId=${selectedBridge.id}`)
      const updatedBridge = await bridgeRes.json()
      setSelectedBridge(updatedBridge)
      loadStats(selectedBridge.id)
      loadSummary()
    }
  }, [selectedBridge, loadStats, loadSummary])

  // Initial load
  useEffect(() => {
    loadBridges()
    loadSummary()
  }, [loadBridges, loadSummary])

  // Load stats when selected bridge changes
  useEffect(() => {
    if (selectedBridge) {
      loadStats(selectedBridge.id)
    }
  }, [selectedBridge, loadStats])

  return {
    bridges,
    setBridges,
    selectedBridge,
    setSelectedBridge,
    bridgeStats,
    overallSummary,
    loading,
    highRiskFilter,
    setHighRiskFilter,
    bridgeViewMode,
    setBridgeViewMode,
    rightPanelOpen,
    setRightPanelOpen,
    loadBridges,
    loadStats,
    loadSummary,
    refreshAllData,
    refreshBridgeData,
  }
}
