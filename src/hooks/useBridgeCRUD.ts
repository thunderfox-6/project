'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { authFetch } from '@/lib/bridge-constants'
import type { Bridge, BridgeSpan } from '@/types/bridge'

interface BridgeEditForm {
  name: string
  bridgeCode: string
  location: string
  lineName: string
  totalSpans: number
}

interface SpanEditForm {
  spanLength: number
  upstreamBoards: number
  downstreamBoards: number
  upstreamColumns: number
  downstreamColumns: number
  shelterSide: string
  shelterBoards: number
  shelterMaxPeople: number
  boardLength: number
  boardWidth: number
  boardThickness: number
  boardMaterial?: string
}

interface NewBridgeForm {
  name: string
  bridgeCode: string
  location: string
  lineName: string
  totalSpans: number
  defaultSpanLength: number
  defaultUpstreamBoards: number
  defaultDownstreamBoards: number
  defaultUpstreamColumns: number
  defaultDownstreamColumns: number
  shelterSide: string
  shelterEvery: number
  shelterBoards: number
  shelterMaxPeople: number
  boardLength: number
  boardWidth: number
  boardThickness: number
  boardMaterial: string
}

const DEFAULT_NEW_BRIDGE: NewBridgeForm = {
  name: '',
  bridgeCode: '',
  location: '',
  lineName: '',
  totalSpans: 3,
  defaultSpanLength: 20,
  defaultUpstreamBoards: 10,
  defaultDownstreamBoards: 10,
  defaultUpstreamColumns: 2,
  defaultDownstreamColumns: 2,
  shelterSide: 'double',
  shelterEvery: 2,
  shelterBoards: 4,
  shelterMaxPeople: 4,
  boardLength: 100,
  boardWidth: 50,
  boardThickness: 5,
  boardMaterial: 'galvanized_steel',
}

interface UseBridgeCRUDParams {
  selectedBridge: Bridge | null
  selectedSpanIndex: number
  setSelectedBridge: React.Dispatch<React.SetStateAction<Bridge | null>>
  setBridges: React.Dispatch<React.SetStateAction<Bridge[]>>
  setSelectedSpanIndex: React.Dispatch<React.SetStateAction<number>>
  loadBridges: () => Promise<void>
  loadSummary: () => Promise<void>
  refreshAllData: (targetBridgeId?: string) => Promise<void>
}

interface UseBridgeCRUDReturn {
  createDialogOpen: boolean
  setCreateDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  bridgeInfoDialogOpen: boolean
  setBridgeInfoDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  bridgeEditDialogOpen: boolean
  setBridgeEditDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  spanEditDialogOpen: boolean
  setSpanEditDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  editingSpan: BridgeSpan | null
  bridgeEditForm: BridgeEditForm
  setBridgeEditForm: React.Dispatch<React.SetStateAction<BridgeEditForm>>
  spanEditForm: SpanEditForm
  setSpanEditForm: React.Dispatch<React.SetStateAction<SpanEditForm>>
  newBridge: NewBridgeForm
  setNewBridge: React.Dispatch<React.SetStateAction<NewBridgeForm>>
  regenerating: boolean
  handleCreateBridge: () => Promise<void>
  resetNewBridgeForm: () => void
  handleDeleteBridge: (id: string) => Promise<void>
  handleViewBridgeInfo: (bridge?: Bridge) => void
  handleEditBridge: (bridge?: Bridge) => Promise<void>
  handleSaveBridgeEdit: () => Promise<void>
  handleEditSpan: (span?: BridgeSpan) => void
  handleSaveSpanEdit: (forceRegenerate?: boolean) => Promise<void>
  handleAddSpan: () => Promise<void>
  handleDeleteSpan: (spanId: string) => Promise<void>
}

export function useBridgeCRUD({
  selectedBridge,
  selectedSpanIndex,
  setSelectedBridge,
  setBridges,
  setSelectedSpanIndex,
  loadBridges,
  loadSummary,
  refreshAllData,
}: UseBridgeCRUDParams): UseBridgeCRUDReturn {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [bridgeInfoDialogOpen, setBridgeInfoDialogOpen] = useState(false)
  const [bridgeEditDialogOpen, setBridgeEditDialogOpen] = useState(false)
  const [spanEditDialogOpen, setSpanEditDialogOpen] = useState(false)
  const [editingSpan, setEditingSpan] = useState<BridgeSpan | null>(null)
  const [bridgeEditForm, setBridgeEditForm] = useState<BridgeEditForm>({
    name: '',
    bridgeCode: '',
    location: '',
    lineName: '',
    totalSpans: 0,
  })
  const [spanEditForm, setSpanEditForm] = useState<SpanEditForm>({
    spanLength: 20,
    upstreamBoards: 10,
    downstreamBoards: 10,
    upstreamColumns: 2,
    downstreamColumns: 2,
    shelterSide: 'none',
    shelterBoards: 0,
    shelterMaxPeople: 4,
    boardLength: 100,
    boardWidth: 50,
    boardThickness: 5,
    boardMaterial: 'galvanized_steel',
  })
  const [newBridge, setNewBridge] = useState<NewBridgeForm>({ ...DEFAULT_NEW_BRIDGE })
  const [regenerating, setRegenerating] = useState(false)

  // Create a new bridge
  const handleCreateBridge = useCallback(async () => {
    if (!newBridge.name || !newBridge.bridgeCode) {
      toast.error('请填写桥梁名称和编号')
      return
    }

    try {
      const spans: Record<string, unknown>[] = []
      for (let i = 1; i <= newBridge.totalSpans; i++) {
        const hasShelter = newBridge.shelterEvery > 0 && i % newBridge.shelterEvery === 0
        spans.push({
          spanNumber: i,
          spanLength: newBridge.defaultSpanLength,
          upstreamBoards: newBridge.defaultUpstreamBoards,
          downstreamBoards: newBridge.defaultDownstreamBoards,
          upstreamColumns: newBridge.defaultUpstreamColumns,
          downstreamColumns: newBridge.defaultDownstreamColumns,
          shelterSide: hasShelter ? newBridge.shelterSide : 'none',
          shelterBoards: hasShelter ? newBridge.shelterBoards : 0,
          shelterMaxPeople: newBridge.shelterMaxPeople,
          boardLength: newBridge.boardLength,
          boardWidth: newBridge.boardWidth,
          boardThickness: newBridge.boardThickness,
          boardMaterial: newBridge.boardMaterial,
        })
      }

      const response = await authFetch('/api/bridges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBridge.name,
          bridgeCode: newBridge.bridgeCode,
          location: newBridge.location,
          lineName: newBridge.lineName,
          totalSpans: newBridge.totalSpans,
          spans,
        }),
      })

      if (response.ok) {
        toast.success('桥梁创建成功')
        setCreateDialogOpen(false)
        resetNewBridgeForm()
        loadBridges()
        loadSummary()
      } else {
        toast.error('创建桥梁失败')
      }
    } catch (error) {
      console.error('Failed to create bridge:', error)
      toast.error('创建桥梁失败')
    }
  }, [newBridge, loadBridges, loadSummary])

  // Reset new bridge form
  const resetNewBridgeForm = useCallback(() => {
    setNewBridge({ ...DEFAULT_NEW_BRIDGE })
  }, [])

  // Delete a bridge
  const handleDeleteBridge = useCallback(
    async (id: string) => {
      try {
        const response = await authFetch(`/api/bridges?id=${id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          toast.success('桥梁删除成功')
          setSelectedBridge(null)
          loadBridges()
          loadSummary()
        } else {
          toast.error('删除桥梁失败')
        }
      } catch (error) {
        console.error('Failed to delete bridge:', error)
        toast.error('删除桥梁失败')
      }
    },
    [setSelectedBridge, loadBridges, loadSummary]
  )

  // View bridge info
  const handleViewBridgeInfo = useCallback(
    (bridge?: Bridge) => {
      const target = bridge || selectedBridge
      if (!target) {
        toast.error('请先选择一座桥梁')
        return
      }
      if (bridge) setSelectedBridge(bridge)
      setBridgeInfoDialogOpen(true)
    },
    [selectedBridge, setSelectedBridge]
  )

  // Edit bridge basic info
  const handleEditBridge = useCallback(
    async (bridge?: Bridge) => {
      const target = bridge || selectedBridge
      if (!target) {
        toast.error('请先选择一座桥梁')
        return
      }
      if (bridge) {
        // Ensure full bridge data with spans is loaded
        try {
          const bridgeRes = await authFetch(`/api/boards?bridgeId=${bridge.id}`)
          const fullBridge = await bridgeRes.json()
          if (fullBridge) {
            setSelectedBridge(fullBridge)
            setSelectedSpanIndex(0)
          }
        } catch (e) {
          console.error('Failed to load bridge details:', e)
        }
      }
      setBridgeEditForm({
        name: target.name,
        bridgeCode: target.bridgeCode,
        location: target.location || '',
        lineName: target.lineName || '',
        totalSpans: target.totalSpans,
      })
      setBridgeEditDialogOpen(true)
    },
    [selectedBridge, setSelectedBridge, setSelectedSpanIndex]
  )

  // Save bridge edit
  const handleSaveBridgeEdit = useCallback(async () => {
    if (!selectedBridge || !bridgeEditForm.name || !bridgeEditForm.bridgeCode) {
      toast.error('请填写桥梁名称和编号')
      return
    }

    try {
      const response = await authFetch('/api/bridges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedBridge.id,
          name: bridgeEditForm.name,
          bridgeCode: bridgeEditForm.bridgeCode,
          location: bridgeEditForm.location || null,
          lineName: bridgeEditForm.lineName || null,
          totalSpans: bridgeEditForm.totalSpans,
        }),
      })

      if (response.ok) {
        const updatedBridge = await response.json()
        toast.success('桥梁信息更新成功')
        setBridgeEditDialogOpen(false)
        setSelectedBridge(updatedBridge)
        // Update bridge in the list
        setBridges(prev => prev.map(b => (b.id === updatedBridge.id ? updatedBridge : b)))
        loadSummary()
      } else {
        const data = await response.json()
        toast.error(data.error || '更新桥梁失败')
      }
    } catch (error) {
      console.error('Failed to update bridge:', error)
      toast.error('更新桥梁失败')
    }
  }, [selectedBridge, bridgeEditForm, setSelectedBridge, setBridges, loadSummary])

  // Edit current span
  const handleEditSpan = useCallback(
    (span?: BridgeSpan) => {
      const targetSpan = span || selectedBridge?.spans[selectedSpanIndex]
      if (!targetSpan) {
        toast.error('请先选择一个孔位')
        return
      }
      setEditingSpan(targetSpan)
      const firstBoard = targetSpan.walkingBoards[0]
      setSpanEditForm({
        spanLength: targetSpan.spanLength,
        upstreamBoards: targetSpan.upstreamBoards,
        downstreamBoards: targetSpan.downstreamBoards,
        upstreamColumns: targetSpan.upstreamColumns,
        downstreamColumns: targetSpan.downstreamColumns,
        shelterSide: targetSpan.shelterSide,
        shelterBoards: targetSpan.shelterBoards,
        shelterMaxPeople: targetSpan.shelterMaxPeople,
        boardLength: firstBoard?.boardLength || 100,
        boardWidth: firstBoard?.boardWidth || 50,
        boardThickness: firstBoard?.boardThickness || 5,
        boardMaterial: targetSpan.boardMaterial,
      })
      setSpanEditDialogOpen(true)
    },
    [selectedBridge, selectedSpanIndex]
  )

  // Save span edit
  const handleSaveSpanEdit = useCallback(
    async (forceRegenerate: boolean = false) => {
      if (!editingSpan) return

      try {
        setRegenerating(true)
        const response = await authFetch('/api/spans', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingSpan.id,
            ...spanEditForm,
            regenerateBoards: forceRegenerate,
          }),
        })

        if (response.ok) {
          const updatedSpan = await response.json()
          toast.success('孔位信息更新成功')
          setSpanEditDialogOpen(false)
          // Update the span in the current bridge
          if (selectedBridge) {
            const updatedBridge = {
              ...selectedBridge,
              spans: selectedBridge.spans.map(s => (s.id === updatedSpan.id ? updatedSpan : s)),
            }
            setSelectedBridge(updatedBridge)
            setBridges(prev => prev.map(b => (b.id === updatedBridge.id ? updatedBridge : b)))
          }
          if (selectedBridge) {
            // Trigger stats reload via the loadStats in refreshAllData
            refreshAllData(selectedBridge.id)
          }
        } else {
          const data = await response.json()
          toast.error(data.error || '更新孔位失败')
        }
      } catch (error) {
        console.error('Failed to update span:', error)
        toast.error('更新孔位失败')
      } finally {
        setRegenerating(false)
      }
    },
    [editingSpan, spanEditForm, selectedBridge, setSelectedBridge, setBridges, refreshAllData]
  )

  // Add new span
  const handleAddSpan = useCallback(async () => {
    if (!selectedBridge) {
      toast.error('请先选择一座桥梁')
      return
    }

    try {
      const response = await authFetch('/api/spans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bridgeId: selectedBridge.id,
          insertPosition: selectedBridge.spans.length + 1,
          spanLength: 20,
          upstreamBoards: 10,
          downstreamBoards: 10,
          upstreamColumns: 2,
          downstreamColumns: 2,
          shelterSide: 'none',
          shelterBoards: 0,
          shelterMaxPeople: 4,
          boardLength: 100,
          boardWidth: 50,
          boardThickness: 5,
          boardMaterial: 'galvanized_steel',
        }),
      })

      if (response.ok) {
        const updatedBridge = await response.json()
        toast.success('新孔位添加成功')
        setSelectedBridge(updatedBridge)
        setBridges(prev => prev.map(b => (b.id === updatedBridge.id ? updatedBridge : b)))
        if (updatedBridge.spans.length > 0) {
          setSelectedSpanIndex(updatedBridge.spans.length - 1)
        }
        refreshAllData(updatedBridge.id)
      } else {
        const data = await response.json()
        toast.error(data.error || '添加孔位失败')
      }
    } catch (error) {
      console.error('Failed to add span:', error)
      toast.error('添加孔位失败')
    }
  }, [selectedBridge, setSelectedBridge, setBridges, setSelectedSpanIndex, refreshAllData])

  // Delete span
  const handleDeleteSpan = useCallback(
    async (spanId: string) => {
      if (!selectedBridge) return

      if (selectedBridge.spans.length <= 1) {
        toast.error('桥梁至少需要一个孔位')
        return
      }

      try {
        const response = await authFetch(`/api/spans?id=${spanId}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          const updatedBridge = await response.json()
          toast.success('孔位删除成功')
          setSelectedBridge(updatedBridge)
          setBridges(prev => prev.map(b => (b.id === updatedBridge.id ? updatedBridge : b)))
          // Adjust selected span index
          if (selectedSpanIndex >= updatedBridge.spans.length) {
            setSelectedSpanIndex(updatedBridge.spans.length - 1)
          }
          refreshAllData(updatedBridge.id)
        } else {
          const data = await response.json()
          toast.error(data.error || '删除孔位失败')
        }
      } catch (error) {
        console.error('Failed to delete span:', error)
        toast.error('删除孔位失败')
      }
    },
    [selectedBridge, selectedSpanIndex, setSelectedBridge, setBridges, setSelectedSpanIndex, refreshAllData]
  )

  return {
    createDialogOpen,
    setCreateDialogOpen,
    bridgeInfoDialogOpen,
    setBridgeInfoDialogOpen,
    bridgeEditDialogOpen,
    setBridgeEditDialogOpen,
    spanEditDialogOpen,
    setSpanEditDialogOpen,
    editingSpan,
    bridgeEditForm,
    setBridgeEditForm,
    spanEditForm,
    setSpanEditForm,
    newBridge,
    setNewBridge,
    regenerating,
    handleCreateBridge,
    resetNewBridgeForm,
    handleDeleteBridge,
    handleViewBridgeInfo,
    handleEditBridge,
    handleSaveBridgeEdit,
    handleEditSpan,
    handleSaveSpanEdit,
    handleAddSpan,
    handleDeleteSpan,
  }
}
