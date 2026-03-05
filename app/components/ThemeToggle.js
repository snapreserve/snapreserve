'use client'
import { useTheme } from './ThemeProvider'

export default function ThemeToggle({ style = {} }) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 13px',
        borderRadius: '8px',
        border: '1px solid var(--sr-border2, rgba(255,255,255,0.12))',
        background: 'transparent',
        color: 'var(--sr-muted, #8a7f72)',
        fontSize: '11px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.18s',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--sr-orange, #e8622a)'
        e.currentTarget.style.color = 'var(--sr-orange, #e8622a)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--sr-border2, rgba(255,255,255,0.12))'
        e.currentTarget.style.color = 'var(--sr-muted, #8a7f72)'
      }}
    >
      {isDark ? '☀️' : '🌙'} {isDark ? 'Light' : 'Dark'}
    </button>
  )
}
