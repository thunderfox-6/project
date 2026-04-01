'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { authFetch } from '@/lib/bridge-constants'

interface ImportConfig {
  mode: 'merge' | 'replace'
  importBridges: boolean
  importSpans: boolean
  importBoards: boolean
  skipExisting: boolean
}

interface UseDataImportParams {
  refreshAllData: (targetBridgeId?: string) => Promise<void>
}

interface UseDataImportReturn {
  importDialogOpen: boolean
  setImportDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  importFile: File | null
  setImportFile: React.Dispatch<React.SetStateAction<File | null>>
  importConfig: ImportConfig
  setImportConfig: React.Dispatch<React.SetStateAction<ImportConfig>>
  handleExportData: () => Promise<void>
  handleDownloadTemplate: () => Promise<void>
  handleSelectImportFile: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleExecuteImport: () => Promise<void>
  handleQuickImportData: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
}

function isValidExcelFile(file: File): boolean {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  return validTypes.includes(file.type) || ['xlsx', 'xls'].includes(fileExtension || '')
}

async function downloadBlob(response: Response, filename: string) {
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function useDataImport({ refreshAllData }: UseDataImportParams): UseDataImportReturn {
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importConfig, setImportConfig] = useState<ImportConfig>({
    mode: 'merge',
    importBridges: true,
    importSpans: true,
    importBoards: true,
    skipExisting: true,
  })

  // Export data as Excel
  const handleExportData = useCallback(async () => {
    try {
      toast.loading('正在导出Excel表格...')

      const response = await authFetch('/api/data/excel')

      if (!response.ok) {
        throw new Error('导出失败')
      }

      const dateStr = new Date().toISOString().split('T')[0]
      await downloadBlob(response, `桥梁步行板数据_${dateStr}.xlsx`)

      toast.dismiss()
      toast.success('Excel表格导出成功')
    } catch (error) {
      toast.dismiss()
      console.error('Export failed:', error)
      toast.error('导出Excel失败')
    }
  }, [])

  // Download import template
  const handleDownloadTemplate = useCallback(async () => {
    try {
      toast.loading('正在下载导入模板...')

      const response = await authFetch('/api/data/template')

      if (!response.ok) {
        throw new Error('下载模板失败')
      }

      await downloadBlob(response, '桥梁步行板导入模板.xlsx')

      toast.dismiss()
      toast.success('导入模板下载成功')
    } catch (error) {
      toast.dismiss()
      console.error('Download template failed:', error)
      toast.error('下载模板失败')
    }
  }, [])

  // Select import file
  const handleSelectImportFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!isValidExcelFile(file)) {
      toast.error('请选择Excel文件（.xlsx或.xls格式）')
      event.target.value = ''
      return
    }

    setImportFile(file)
    setImportDialogOpen(true)
    event.target.value = ''
  }, [])

  // Execute import with configuration
  const handleExecuteImport = useCallback(async () => {
    if (!importFile) {
      toast.error('请先选择要导入的文件')
      return
    }

    try {
      toast.loading('正在导入Excel数据...')

      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('mode', importConfig.mode)

      const response = await authFetch('/api/data/excel', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      toast.dismiss()
      if (result.success) {
        toast.success(result.message)
        setImportDialogOpen(false)
        setImportFile(null)
        // Auto-select first imported bridge
        const firstImportedBridgeId = result.results?.importedBridgeIds?.[0]
        refreshAllData(firstImportedBridgeId)
      } else {
        toast.error(result.error || '导入失败')
      }
    } catch (error) {
      toast.dismiss()
      console.error('Import failed:', error)
      toast.error('导入Excel失败，请检查文件格式')
    }
  }, [importFile, importConfig, refreshAllData])

  // Quick import (no configuration dialog)
  const handleQuickImportData = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      if (!isValidExcelFile(file)) {
        toast.error('请选择Excel文件（.xlsx或.xls格式）')
        event.target.value = ''
        return
      }

      try {
        toast.loading('正在导入Excel数据...')

        const formData = new FormData()
        formData.append('file', file)
        formData.append('mode', 'merge')

        const response = await authFetch('/api/data/excel', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        toast.dismiss()
        if (result.success) {
          toast.success(result.message)
          const firstImportedBridgeId = result.results?.importedBridgeIds?.[0]
          refreshAllData(firstImportedBridgeId)
        } else {
          toast.error(result.error || '导入失败')
        }
      } catch (error) {
        toast.dismiss()
        console.error('Import failed:', error)
        toast.error('导入Excel失败，请检查文件格式')
      }

      event.target.value = ''
    },
    [refreshAllData]
  )

  return {
    importDialogOpen,
    setImportDialogOpen,
    importFile,
    setImportFile,
    importConfig,
    setImportConfig,
    handleExportData,
    handleDownloadTemplate,
    handleSelectImportFile,
    handleExecuteImport,
    handleQuickImportData,
  }
}
