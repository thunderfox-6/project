'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { authFetch } from '@/lib/bridge-constants'
import type { WalkingBoard, Bridge } from '@/types/bridge'

interface EditForm {
  status: string
  damageDesc: string
  inspectedBy: string
  antiSlipLevel: number
  connectionStatus: string
  weatherCondition: string
  visibility: number
  railingStatus: string
  bracketStatus: string
  hasObstacle: boolean
  obstacleDesc: string
  hasWaterAccum: boolean
  waterAccumDepth: number
  remarks: string
  boardLength: number
  boardWidth: number
  boardThickness: number
}

interface BatchEditForm {
  status: string
  inspectedBy: string
  railingStatus: string
  bracketStatus: string
  remarks: string
  editSize: boolean
  boardLength: number
  boardWidth: number
  boardThickness: number
}

const DEFAULT_BATCH_EDIT_FORM: BatchEditForm = {
  status: '',
  inspectedBy: '',
  railingStatus: '',
  bracketStatus: '',
  remarks: '',
  editSize: false,
  boardLength: 100,
  boardWidth: 50,
  boardThickness: 5,
}

interface UseBoardEditingParams {
  selectedBridge: Bridge | null
  selectedSpanIndex: number
  refreshBridgeData: () => Promise<void>
}

interface UseBoardEditingReturn {
  editingBoard: WalkingBoard | null
  editDialogOpen: boolean
  editForm: EditForm
  setEditForm: React.Dispatch<React.SetStateAction<EditForm>>
  detailDialogOpen: boolean
  selectedBoardForDetail: WalkingBoard | null
  batchMode: boolean
  setBatchMode: React.Dispatch<React.SetStateAction<boolean>>
  selectedBoards: string[]
  setSelectedBoards: React.Dispatch<React.SetStateAction<string[]>>
  batchEditDialogOpen: boolean
  setBatchEditDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  batchEditForm: BatchEditForm
  setBatchEditForm: React.Dispatch<React.SetStateAction<BatchEditForm>>
  handleUpdateBoard: () => Promise<void>
  handleBatchUpdateBoards: () => Promise<void>
  toggleBoardSelection: (boardId: string) => void
  toggleSelectAll: () => void
  openEditDialog: (board: WalkingBoard) => void
  openDetailDialog: (board: WalkingBoard) => void
}

export function useBoardEditing({
  selectedBridge,
  selectedSpanIndex,
  refreshBridgeData,
}: UseBoardEditingParams): UseBoardEditingReturn {
  const [editingBoard, setEditingBoard] = useState<WalkingBoard | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    status: 'normal',
    damageDesc: '',
    inspectedBy: '',
    antiSlipLevel: 100,
    connectionStatus: 'normal',
    weatherCondition: 'normal',
    visibility: 100,
    railingStatus: 'normal',
    bracketStatus: 'normal',
    hasObstacle: false,
    obstacleDesc: '',
    hasWaterAccum: false,
    waterAccumDepth: 0,
    remarks: '',
    boardLength: 100,
    boardWidth: 50,
    boardThickness: 5,
  })
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedBoardForDetail, setSelectedBoardForDetail] = useState<WalkingBoard | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedBoards, setSelectedBoards] = useState<string[]>([])
  const [batchEditDialogOpen, setBatchEditDialogOpen] = useState(false)
  const [batchEditForm, setBatchEditForm] = useState<BatchEditForm>({ ...DEFAULT_BATCH_EDIT_FORM })

  // Update a single walking board
  const handleUpdateBoard = useCallback(async () => {
    if (!editingBoard) return

    try {
      const response = await authFetch('/api/boards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBoard.id,
          status: editForm.status,
          damageDesc: editForm.damageDesc,
          inspectedBy: editForm.inspectedBy,
          antiSlipLevel: editForm.antiSlipLevel,
          connectionStatus: editForm.connectionStatus,
          weatherCondition: editForm.weatherCondition,
          visibility: editForm.visibility,
          railingStatus: editForm.railingStatus,
          bracketStatus: editForm.bracketStatus,
          hasObstacle: editForm.hasObstacle,
          obstacleDesc: editForm.obstacleDesc,
          hasWaterAccum: editForm.hasWaterAccum,
          waterAccumDepth: editForm.waterAccumDepth,
          remarks: editForm.remarks,
          boardLength: editForm.boardLength,
          boardWidth: editForm.boardWidth,
          boardThickness: editForm.boardThickness,
        }),
      })

      if (response.ok) {
        toast.success('步行板状态更新成功')
        setEditDialogOpen(false)
        setEditingBoard(null)
        refreshBridgeData()
      } else {
        toast.error('更新步行板状态失败')
      }
    } catch (error) {
      console.error('Failed to update walking board:', error)
      toast.error('更新步行板状态失败')
    }
  }, [editingBoard, editForm, refreshBridgeData])

  // Batch update walking boards
  const handleBatchUpdateBoards = useCallback(async () => {
    if (selectedBoards.length === 0) {
      toast.error('请选择要编辑的步行板')
      return
    }

    try {
      if (batchEditForm.status || batchEditForm.railingStatus || batchEditForm.bracketStatus || batchEditForm.remarks || batchEditForm.editSize) {
        const response = await authFetch('/api/boards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updates: selectedBoards.map(id => ({
              id,
              status: batchEditForm.status || undefined,
              railingStatus: batchEditForm.railingStatus || undefined,
              bracketStatus: batchEditForm.bracketStatus || undefined,
              remarks: batchEditForm.remarks || undefined,
              inspectedBy: batchEditForm.inspectedBy || '批量编辑',
              ...(batchEditForm.editSize ? {
                boardLength: batchEditForm.boardLength,
                boardWidth: batchEditForm.boardWidth,
                boardThickness: batchEditForm.boardThickness,
              } : {}),
            })),
          }),
        })

        if (!response.ok) {
          toast.error('批量更新状态失败')
          return
        }
      }

      toast.success(`已批量更新 ${selectedBoards.length} 块步行板`)
      setBatchEditDialogOpen(false)
      setBatchMode(false)
      setSelectedBoards([])
      setBatchEditForm({ ...DEFAULT_BATCH_EDIT_FORM })
      refreshBridgeData()
    } catch (error) {
      console.error('Batch update failed:', error)
      toast.error('批量更新失败')
    }
  }, [selectedBoards, batchEditForm, refreshBridgeData])

  // Toggle board selection
  const toggleBoardSelection = useCallback((boardId: string) => {
    setSelectedBoards(prev =>
      prev.includes(boardId)
        ? prev.filter(id => id !== boardId)
        : [...prev, boardId]
    )
  }, [])

  // Toggle select all boards in current span
  const toggleSelectAll = useCallback(() => {
    if (!selectedBridge) return
    const currentSpan = selectedBridge.spans[selectedSpanIndex]
    if (!currentSpan) return

    const allBoardIds = currentSpan.walkingBoards.map(b => b.id)
    const allSelected = allBoardIds.every(id => selectedBoards.includes(id))

    if (allSelected) {
      setSelectedBoards(prev => prev.filter(id => !allBoardIds.includes(id)))
    } else {
      setSelectedBoards(prev => [...new Set([...prev, ...allBoardIds])])
    }
  }, [selectedBridge, selectedSpanIndex, selectedBoards])

  // Open edit dialog for a board
  const openEditDialog = useCallback((board: WalkingBoard) => {
    setEditingBoard(board)
    setEditForm({
      status: board.status,
      damageDesc: board.damageDesc || '',
      inspectedBy: board.inspectedBy || '',
      antiSlipLevel: board.antiSlipLevel || 100,
      connectionStatus: board.connectionStatus || 'normal',
      weatherCondition: board.weatherCondition || 'normal',
      visibility: board.visibility || 100,
      railingStatus: board.railingStatus || 'normal',
      bracketStatus: board.bracketStatus || 'normal',
      hasObstacle: board.hasObstacle || false,
      obstacleDesc: board.obstacleDesc || '',
      hasWaterAccum: board.hasWaterAccum || false,
      waterAccumDepth: board.waterAccumDepth || 0,
      remarks: board.remarks || '',
      boardLength: board.boardLength || 100,
      boardWidth: board.boardWidth || 50,
      boardThickness: board.boardThickness || 5,
    })
    setEditDialogOpen(true)
  }, [])

  // Open detail dialog for a board
  const openDetailDialog = useCallback((board: WalkingBoard) => {
    setSelectedBoardForDetail(board)
    setDetailDialogOpen(true)
  }, [])

  return {
    editingBoard,
    editDialogOpen,
    editForm,
    setEditForm,
    detailDialogOpen,
    selectedBoardForDetail,
    batchMode,
    setBatchMode,
    selectedBoards,
    setSelectedBoards,
    batchEditDialogOpen,
    setBatchEditDialogOpen,
    batchEditForm,
    setBatchEditForm,
    handleUpdateBoard,
    handleBatchUpdateBoards,
    toggleBoardSelection,
    toggleSelectAll,
    openEditDialog,
    openDetailDialog,
  }
}
