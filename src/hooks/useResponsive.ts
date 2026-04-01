'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { MobileTab } from '@/types/bridge'

interface UseResponsiveReturn {
  isMobile: boolean
  isPortrait: boolean
  mobileTab: MobileTab
  setMobileTab: React.Dispatch<React.SetStateAction<MobileTab>>
  mobileMenuOpen: boolean
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>
  mobilePanelOpen: boolean
  setMobilePanelOpen: React.Dispatch<React.SetStateAction<boolean>>
  sidebarCollapsed: boolean
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  viewAngle: number
  setViewAngle: React.Dispatch<React.SetStateAction<number>>
  zoomLevel: number
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>
  is3DFullscreen: boolean
  setIs3DFullscreen: React.Dispatch<React.SetStateAction<boolean>>
  pinchScale: number
  setPinchScale: React.Dispatch<React.SetStateAction<number>>
  isOnline: boolean
  offlineEdits: number
  setOfflineEdits: React.Dispatch<React.SetStateAction<number>>
  isSyncing: boolean
  setIsSyncing: React.Dispatch<React.SetStateAction<boolean>>
  safetyTipDismissed: boolean
  setSafetyTipDismissed: React.Dispatch<React.SetStateAction<boolean>>
  handlePinchZoom: (e: React.TouchEvent) => void
  handlePinchEnd: () => void
}

export function useResponsive(): UseResponsiveReturn {
  const [isMobile, setIsMobile] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('bridge')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [viewAngle, setViewAngle] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [is3DFullscreen, setIs3DFullscreen] = useState(false)
  const [pinchScale, setPinchScale] = useState(1)
  const [isOnline, setIsOnline] = useState(true)
  const [offlineEdits, setOfflineEdits] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [safetyTipDismissed, setSafetyTipDismissed] = useState(false)

  // Detect mobile and screen orientation
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const mobile = width < 768
      const portrait = height > width

      setIsMobile(mobile)
      setIsPortrait(portrait)

      // Auto-collapse sidebar in portrait mode
      if (mobile && portrait) {
        setSidebarCollapsed(true)
        // Note: setRightPanelOpen is not in this hook's scope,
        // consumers can react to isMobile/isPortrait changes
      }
    }
    checkDevice()
    window.addEventListener('resize', checkDevice)
    window.addEventListener('orientationchange', checkDevice)
    return () => {
      window.removeEventListener('resize', checkDevice)
      window.removeEventListener('orientationchange', checkDevice)
    }
  }, [])

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('网络已连接')
    }
    const handleOffline = () => {
      setIsOnline(false)
      toast.warning('网络已断开，进入离线模式')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Pinch zoom handler for mobile
  const handlePinchZoom = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )

      const lastDistanceRef = (window as unknown as { lastPinchDistance?: number }).lastPinchDistance
      if (lastDistanceRef !== undefined && lastDistanceRef > 0) {
        const scale = distance / lastDistanceRef
        setPinchScale(prev => Math.min(Math.max(prev * scale, 0.5), 3))
      }
      ;(window as unknown as { lastPinchDistance?: number }).lastPinchDistance = distance
    }
  }, [])

  const handlePinchEnd = useCallback(() => {
    ;(window as unknown as { lastPinchDistance?: number }).lastPinchDistance = 0
  }, [])

  return {
    isMobile,
    isPortrait,
    mobileTab,
    setMobileTab,
    mobileMenuOpen,
    setMobileMenuOpen,
    mobilePanelOpen,
    setMobilePanelOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    viewAngle,
    setViewAngle,
    zoomLevel,
    setZoomLevel,
    is3DFullscreen,
    setIs3DFullscreen,
    pinchScale,
    setPinchScale,
    isOnline,
    offlineEdits,
    setOfflineEdits,
    isSyncing,
    setIsSyncing,
    safetyTipDismissed,
    setSafetyTipDismissed,
    handlePinchZoom,
    handlePinchEnd,
  }
}
