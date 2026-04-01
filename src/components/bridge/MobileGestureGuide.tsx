'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ZoomIn, Hand, Pointer } from 'lucide-react'

interface MobileGestureGuideProps {
  theme: 'day' | 'night'
}

const slides = [
  {
    id: 0,
    title: '双指缩放',
    description: '用两根手指在屏幕上捏合或张开，可以缩放桥梁视图，查看更多细节。',
    icon: ZoomIn,
    gesture: 'pinch'
  },
  {
    id: 1,
    title: '左右滑动',
    description: '在桥梁视图上左右滑动，可以快速切换不同的孔位，浏览整座桥梁。',
    icon: Hand,
    gesture: 'swipe'
  },
  {
    id: 2,
    title: '点击步行板',
    description: '点击任意一块步行板，即可查看该步行板的详细状态信息或进行编辑操作。',
    icon: Pointer,
    gesture: 'tap'
  }
]

const GESTURE_STORAGE_KEY = 'gesture-guide-shown'

export default function MobileGestureGuide({ theme }: MobileGestureGuideProps) {
  const [visible, setVisible] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const isDark = theme === 'night'

  useEffect(() => {
    // Only show on mobile
    const isMobile = window.innerWidth < 768
    if (!isMobile) return

    const shown = localStorage.getItem(GESTURE_STORAGE_KEY)
    if (!shown) {
      setVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(GESTURE_STORAGE_KEY, 'true')
    setVisible(false)
  }

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1)
    } else {
      handleDismiss()
    }
  }

  if (!visible) return null

  const slide = slides[currentSlide]
  const IconComponent = slide.icon
  const isLast = currentSlide === slides.length - 1

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Content */}
      <div className="relative z-10 w-[85vw] max-w-sm mx-auto">
        <div
          className={`rounded-2xl overflow-hidden ${isDark ? 'bg-slate-900 border border-cyan-500/30' : 'bg-white border border-gray-200'}`}
          style={{ boxShadow: isDark ? '0 0 40px rgba(0, 240, 255, 0.15)' : '0 8px 32px rgba(0,0,0,0.15)' }}
        >
          {/* Header */}
          <div className={`px-6 pt-6 pb-2 text-center ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
            <p className="text-xs font-medium tracking-widest uppercase opacity-70">操作指引</p>
          </div>

          {/* Slide content */}
          <div className="px-6 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center"
              >
                {/* Gesture animation area */}
                <div
                  className={`w-28 h-28 rounded-full flex items-center justify-center mb-6 ${isDark ? 'bg-cyan-500/10 border-2 border-cyan-500/30' : 'bg-blue-50 border-2 border-blue-200'}`}
                >
                  <motion.div
                    animate={
                      slide.gesture === 'pinch'
                        ? { scale: [1, 1.2, 0.9, 1] }
                        : slide.gesture === 'swipe'
                          ? { x: [-10, 10, -10, 0] }
                          : { scale: [1, 0.95, 1] }
                    }
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <IconComponent
                      className={`w-12 h-12 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}
                      strokeWidth={1.5}
                    />
                  </motion.div>
                </div>

                {/* Title */}
                <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {slide.title}
                </h3>

                {/* Description */}
                <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                  {slide.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-2 pb-4">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`rounded-full transition-all duration-300 ${
                  idx === currentSlide
                    ? `w-6 h-2 ${isDark ? 'bg-cyan-400' : 'bg-blue-600'}`
                    : `w-2 h-2 ${isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-300 hover:bg-gray-400'}`
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className={`px-6 pb-6 flex items-center justify-between`}>
            <button
              onClick={handleDismiss}
              className={`text-sm ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              跳过
            </button>
            <button
              onClick={handleNext}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${isDark ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
            >
              {isLast ? '开始使用' : '下一步'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
