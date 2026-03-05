'use client'
import { usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'

export default function FloatingThemeToggle() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin') || pathname.startsWith('/superadmin')) return null
  return (
    <ThemeToggle style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9000,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    }} />
  )
}
