'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/app/components/ThemeProvider'

const NAV_LINKS = [
  { href: '/home',     label: 'Home' },
  { href: '/about',    label: 'About' },
  { href: '/listings', label: 'Explore' },
  { href: '/contact',  label: 'Contact' },
]

// Fixed right-side width prevents layout shift when auth state loads
const RIGHT_WIDTH = 196

const STYLES = `
  .sr-nav {
    background: var(--sr-surface, rgba(250,248,245,0.96));
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--sr-border-solid, #E8E2D9);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .sr-nav-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 40px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .sr-logo {
    text-decoration: none;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
  }
  .sr-logo img { height: 28px; width: auto; }
  html[data-theme="light"] .sr-logo img {
    filter: drop-shadow(0 0 3px rgba(0,0,0,0.45));
  }
  .sr-nav-links {
    display: flex;
    gap: 4px;
    flex: 1;
    justify-content: center;
  }
  .sr-nav-link {
    padding: 8px 14px;
    border-radius: 100px;
    font-size: 0.83rem;
    font-weight: 600;
    color: var(--sr-muted, #6B5F54);
    text-decoration: none;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }
  .sr-nav-link:hover { background: rgba(0,0,0,0.06); color: var(--sr-text, #1A1410); }
  .sr-nav-link.active {
    color: #F4601A;
    font-weight: 700;
    border-bottom: 2px solid #F4601A;
    border-radius: 0;
    padding-bottom: 6px;
  }
  .sr-nav-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
    width: ${RIGHT_WIDTH}px;
    flex-shrink: 0;
  }
  .sr-nav-outline {
    padding: 8px 18px;
    border-radius: 100px;
    font-size: 0.83rem;
    font-weight: 700;
    border: 1px solid var(--sr-border-solid, #D4CEC5);
    color: var(--sr-text, #1A1410);
    text-decoration: none;
    white-space: nowrap;
    transition: border-color 0.15s;
  }
  .sr-nav-outline:hover { border-color: #F4601A; }
  .sr-nav-solid {
    padding: 8px 18px;
    border-radius: 100px;
    font-size: 0.83rem;
    font-weight: 700;
    background: #F4601A;
    color: white;
    text-decoration: none;
    white-space: nowrap;
    transition: opacity 0.15s;
  }
  .sr-nav-solid:hover { opacity: 0.88; }
  .sr-theme-toggle {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid var(--sr-border-solid, #E8E2D9);
    background: var(--sr-surface, white);
    cursor: pointer;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.18s;
    flex-shrink: 0;
  }
  .sr-theme-toggle:hover { border-color: #F4601A; }
  @media (max-width: 768px) {
    .sr-nav-links { display: none; }
    .sr-nav-inner { padding: 0 20px; }
    .sr-nav-actions { width: auto; }
  }
`

export default function SharedHeader() {
  const pathname = usePathname()
  const [user, setUser] = useState(undefined) // undefined = loading
  const { theme, toggle: toggleTheme } = useTheme()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  function isActive(href) {
    if (href === '/home') return pathname === '/home' || pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      <style>{STYLES}</style>
      <nav className="sr-nav">
        <div className="sr-nav-inner">
          <a href="/home" className="sr-logo"><img src="/logo.png" alt="SnapReserve" /></a>

          <div className="sr-nav-links">
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className={`sr-nav-link${isActive(href) ? ' active' : ''}`}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="sr-nav-actions">
            <button
              className="sr-theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {user === undefined ? (
              /* Loading placeholder — same width as logged-out buttons to prevent shift */
              <div style={{ width: 120, height: 34 }} />
            ) : user ? (
              <a href="/account/profile" className="sr-nav-solid">My Account</a>
            ) : (
              <>
                <a href="/login"  className="sr-nav-outline">Log in</a>
                <a href="/signup" className="sr-nav-solid">Sign up</a>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
