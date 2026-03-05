'use client'
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({
  theme: 'dark',
  setTheme: () => {},
  toggle: () => {},
})

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark') // default dark; real value set on mount
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // On mount: read saved preference or system preference
    const saved = localStorage.getItem('sr-theme')
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved)
      setThemeState(saved)
    } else {
      // Follow system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const sys = prefersDark ? 'dark' : 'light'
      applyTheme(sys)
      setThemeState(sys)
    }
    setMounted(true)
  }, [])

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t)
  }

  function setTheme(t) {
    applyTheme(t)
    setThemeState(t)
    localStorage.setItem('sr-theme', t)
    // Try to save to user profile (best-effort)
    saveToProfile(t).catch(() => {})
  }

  function toggle() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // Suppress hydration mismatch by not rendering children until mounted
  if (!mounted) return (
    <div style={{ visibility: 'hidden' }}>{children}</div>
  )

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

async function saveToProfile(theme) {
  await fetch('/api/account/theme', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme }),
  })
}

export function useTheme() {
  return useContext(ThemeContext)
}
