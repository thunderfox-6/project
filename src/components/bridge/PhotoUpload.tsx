'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Camera, Trash2, Upload, ImageIcon, X, Sparkles, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface PhotoItem {
  id: string
  boardId: string
  description: string | null
  uploadedBy: string | null
  uploadedAt: string
}

interface PhotoUploadProps {
  boardId: string
  theme: 'day' | 'night'
}

export default function PhotoUpload({ boardId, theme }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [photoAnalysis, setPhotoAnalysis] = useState<{
    damageDetected: boolean
    damageType: string
    severityLevel: string
    confidence: number
    description: string
    suggestion: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // authFetch helper
  const authFetch = useCallback((url: string, options?: RequestInit): Promise<Response> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = new Headers(options?.headers)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return globalThis.fetch(url, { ...options, headers })
  }, [])

  // Load photos list
  const loadPhotos = useCallback(async () => {
    if (!boardId) return
    setLoading(true)
    try {
      const res = await authFetch(`/api/boards/photos?boardId=${boardId}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setPhotos(data)
      }
    } catch (error) {
      console.error('加载照片列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [boardId, authFetch])

  useEffect(() => {
    loadPhotos()
  }, [loadPhotos])

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('不支持的文件类型，仅支持 JPG、PNG、GIF、WebP、BMP 格式')
      event.target.value = ''
      return
    }

    // Validate size
    if (file.size > 5 * 1024 * 1024) {
      toast.error('照片文件大小不能超过5MB')
      event.target.value = ''
      return
    }

    // Upload
    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('boardId', boardId)
      formData.append('photo', file)
      if (description.trim()) {
        formData.append('description', description.trim())
      }

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const res = await authFetch('/api/boards/photos', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const data = await res.json()

      if (res.ok && data.success) {
        toast.success('照片上传成功')
        setDescription('')
        loadPhotos()
      } else {
        toast.error(data.error || '上传失败')
      }
    } catch (error) {
      console.error('上传照片失败:', error)
      toast.error('上传照片失败')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (event.target) event.target.value = ''
    }
  }

  // Delete photo
  const handleDelete = async (photoId: string) => {
    try {
      const res = await authFetch(`/api/boards/photos?photoId=${photoId}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (res.ok && data.success) {
        toast.success('照片已删除')
        setPhotos(prev => prev.filter(p => p.id !== photoId))
        if (previewUrl) {
          setPreviewUrl(null)
        }
      } else {
        toast.error(data.error || '删除失败')
      }
    } catch (error) {
      console.error('删除照片失败:', error)
      toast.error('删除照片失败')
    }
  }

  // View full-size photo
  const handleViewPhoto = async (photoId: string) => {
    try {
      const res = await authFetch(`/api/boards/photos/single?photoId=${photoId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.photo) {
          setPreviewUrl(data.photo)
        }
      }
    } catch {
      // fallback: ignore
    }
  }

  // AI photo analysis
  const handleAnalyzePhoto = async (photoId: string) => {
    // Get AI config from localStorage
    const configStr = localStorage.getItem('ai-config')
    if (!configStr) {
      toast.error('请先配置AI模型（点击设置图标）')
      return
    }
    let config
    try {
      config = JSON.parse(configStr)
    } catch {
      toast.error('AI配置格式错误')
      return
    }
    if (!config.apiKey) {
      toast.error('请先在AI设置中填写API密钥')
      return
    }

    setAnalyzing(true)
    setPhotoAnalysis(null)
    try {
      const res = await authFetch('/api/ai/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, photoId, config }),
      })
      const data = await res.json()
      if (data.success && data.analysis) {
        setPhotoAnalysis(data.analysis)
        toast.success('AI分析完成')
      } else {
        toast.error(data.error || 'AI分析失败')
      }
    } catch (error) {
      console.error('AI照片分析失败:', error)
      toast.error('AI照片分析失败')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Section title */}
      <div className={`text-sm font-semibold flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
        <Camera className="w-4 h-4" />
        现场照片
      </div>

      {/* Description input */}
      <div>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="照片描述（可选）"
          className={`text-sm ${theme === 'night' ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-300'}`}
        />
      </div>

      {/* Upload button */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 ${theme === 'night' ? 'border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              上传中 {uploadProgress}%
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              拍照 / 选择照片
            </>
          )}
        </Button>
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-700/50">
          <div
            className="h-full bg-cyan-500 transition-all duration-300 rounded-full"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Photo thumbnails */}
      {loading && photos.length === 0 && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className={`w-5 h-5 animate-spin ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`} />
          <span className={`ml-2 text-sm ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>加载照片...</span>
        </div>
      )}

      {!loading && photos.length === 0 && (
        <div className={`text-center py-4 text-sm ${theme === 'night' ? 'text-slate-500' : 'text-gray-400'}`}>
          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          暂无照片，点击上方按钮上传
        </div>
      )}

      {photos.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={`relative group rounded-lg overflow-hidden border ${
                  theme === 'night' ? 'border-slate-600/50 bg-slate-800/50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                {/* Thumbnail placeholder - since we don't have base64 in list view */}
                <button
                  onClick={() => handleViewPhoto(photo.id)}
                  className="w-full aspect-square flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    background: theme === 'night'
                      ? 'linear-gradient(135deg, rgba(34,211,238,0.1), rgba(139,92,246,0.1))'
                      : 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))'
                  }}
                >
                  <ImageIcon className={`w-8 h-8 ${theme === 'night' ? 'text-cyan-400/50' : 'text-blue-400/50'}`} />
                </button>

                {/* Delete button overlay */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(photo.id)
                  }}
                  className={`absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                    theme === 'night' ? 'bg-red-500/80 text-white hover:bg-red-500' : 'bg-red-500/90 text-white hover:bg-red-600'
                  }`}
                  title="删除照片"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {/* AI analyze button overlay */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAnalyzePhoto(photo.id)
                  }}
                  disabled={analyzing}
                  className={`absolute bottom-1 left-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                    analyzing
                      ? 'bg-gray-500/80 text-white'
                      : theme === 'night' ? 'bg-purple-500/80 text-white hover:bg-purple-500' : 'bg-purple-500/90 text-white hover:bg-purple-600'
                  }`}
                  title="AI识别损坏"
                >
                  {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                </button>

                {/* Description overlay */}
                {photo.description && (
                  <div className={`absolute bottom-0 left-0 right-0 px-1.5 py-1 text-[10px] truncate ${
                    theme === 'night' ? 'bg-slate-900/80 text-slate-300' : 'bg-black/50 text-white'
                  }`}>
                    {photo.description}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* AI Analysis button for latest photo */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={analyzing || photos.length === 0}
            onClick={() => handleAnalyzePhoto(photos[0].id)}
            className={`w-full ${theme === 'night' ? 'border-purple-500/50 text-purple-400 hover:bg-purple-500/10' : 'border-purple-300 text-purple-600 hover:bg-purple-50'}`}
          >
            {analyzing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI正在分析照片...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />AI识别最新照片损坏情况</>
            )}
          </Button>

          {/* AI Analysis result */}
          {photoAnalysis && (
            <div className={`rounded-lg border p-3 text-sm space-y-2 ${
              theme === 'night' ? 'bg-purple-950/30 border-purple-500/30' : 'bg-purple-50 border-purple-200'
            }`}>
              <div className={`font-semibold flex items-center gap-2 ${theme === 'night' ? 'text-purple-400' : 'text-purple-700'}`}>
                <Sparkles className="w-4 h-4" />
                AI分析结果
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>损坏检测: </span>
                  <span className={photoAnalysis.damageDetected ? 'text-red-500 font-medium' : 'text-green-500 font-medium'}>
                    {photoAnalysis.damageDetected ? '发现损坏' : '未发现损坏'}
                  </span>
                </div>
                <div>
                  <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>损坏类型: </span>
                  <span className={theme === 'night' ? 'text-slate-200' : 'text-gray-800'}>{photoAnalysis.damageType}</span>
                </div>
                <div>
                  <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>严重程度: </span>
                  <span className={`font-medium ${
                    photoAnalysis.severityLevel === 'fracture_risk' ? 'text-red-500' :
                    photoAnalysis.severityLevel === 'severe_damage' ? 'text-orange-500' :
                    photoAnalysis.severityLevel === 'minor_damage' ? 'text-yellow-500' : 'text-green-500'
                  }`}>
                    {{ normal: '正常', minor_damage: '轻微损坏', severe_damage: '严重损坏', fracture_risk: '断裂风险' }[photoAnalysis.severityLevel] || photoAnalysis.severityLevel}
                  </span>
                </div>
                <div>
                  <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>置信度: </span>
                  <span className={theme === 'night' ? 'text-slate-200' : 'text-gray-800'}>{(photoAnalysis.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>

              {photoAnalysis.description && (
                <div className={`text-xs ${theme === 'night' ? 'text-slate-300' : 'text-gray-700'}`}>
                  <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>描述: </span>
                  {photoAnalysis.description}
                </div>
              )}

              {photoAnalysis.suggestion && (
                <div className={`text-xs ${theme === 'night' ? 'text-slate-300' : 'text-gray-700'}`}>
                  <span className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>建议: </span>
                  {photoAnalysis.suggestion}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Full-size photo preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-3 -right-3 p-1.5 rounded-full bg-white/90 text-gray-900 hover:bg-white z-10 shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="照片预览"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
