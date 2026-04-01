'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'day' | 'night'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('night')

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'day' || saved === 'night') {
      setThemeState(saved)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'day') {
      root.classList.add('theme-day')
      root.classList.remove('theme-night')
    } else {
      root.classList.add('theme-night')
      root.classList.remove('theme-day')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setThemeState(prev => prev === 'night' ? 'day' : 'night')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  )
}
