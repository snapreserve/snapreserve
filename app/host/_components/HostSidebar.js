'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutGrid, Calendar, CalendarDays, Home, MessageCircle, Tag,
  TrendingUp, Wallet, Receipt, Users, Shield, KeyRound, Activity,
  Star, Settings, LogOut, UserRound,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { buildNavSections, ROLE_NAV } from './nav-config'
import ThemeToggle from '@/app/components/ThemeToggle'

const NAV_ICONS = {
  overview:    LayoutGrid,
  bookings:    Calendar,
  properties:  Home,
  calendar:    CalendarDays,
  messages:    MessageCircle,
  promotions:  Tag,
  earnings:    TrendingUp,
  payouts:     Wallet,
  expenses:    Receipt,
  team:        Users,
  permissions: Shield,
  access:      KeyRound,
  activity:    Activity,
  reviews:     Star,
  settings:    Settings,
}

// Derive active nav id from current pathname (for sub-pages in link mode)
function activeFromPath(pathname) {
  if (!pathname) return 'overview'
  if (pathname.startsWith('/host/bookings')) return 'bookings'
  if (pathname.startsWith('/host/properties')) return 'properties'
  if (pathname.startsWith('/host/calendar')) return 'calendar'
  if (pathname.startsWith('/host/messages')) return 'messages'
  if (pathname.startsWith('/host/earnings')) return 'earnings'
  if (pathname.startsWith('/host/payouts')) return 'payouts'
  if (pathname.startsWith('/host/expenses')) return 'expenses'
  if (pathname.startsWith('/host/promotions')) return 'promotions'
  if (pathname.startsWith('/host/reviews')) return 'reviews'
  if (pathname.startsWith('/host/settings')) return 'settings'
  return 'overview'
}

function initials(name) {
  return (name || '').split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'H'
}

/**
 * HostSidebar — shared sidebar for Host Portal and Team Portal.
 *
 * SPA mode  (dashboard): pass `activeNav` + `onNavChange`; items render as <button>.
 * Link mode (sub-pages): omit `onNavChange`; items render as <Link href="/host/dashboard">.
 */
export default function HostSidebar({
  activeNav,            // controlled active item id (SPA mode)
  onNavChange,          // (id: string) => void — if omitted, link mode is used
  myRole       = 'owner',
  myCustomRole = null,
  viewingAs    = null,
  userName     = '',
  userAvatar   = null,  // URL for profile photo
  orgName      = null,
  isFounder    = false,
  unreadCount  = 0,
  pendingInviteCount = 0,
  onSwitchToGuest = null,
}) {
  const pathname  = usePathname()
  const router    = useRouter()
  const isLinkMode = !onNavChange

  // Resolve allowed nav set
  const baseNav = myRole === 'custom' && myCustomRole
    ? new Set(['overview', ...(myCustomRole.permissions || [])])
    : (ROLE_NAV[myRole] || ROLE_NAV.owner)
  const effectiveNav = viewingAs
    ? (ROLE_NAV[viewingAs.role] || ROLE_NAV.staff)
    : baseNav

  // In link mode, derive active from URL; in SPA mode, use prop
  const currentActive = isLinkMode ? activeFromPath(pathname) : (activeNav || 'overview')

  const sections = buildNavSections({ unreadCount, pendingInviteCount })
  const userInitials = initials(userName)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function NavItem({ item }) {
    const isActive = currentActive === item.id
    const cls = `hs-nav-item${isActive ? ' active' : ''}`
    const Icon = NAV_ICONS[item.id]
    const content = (
      <>
        <span className="hs-nav-icon">
          {Icon ? <Icon size={17} strokeWidth={1.75} /> : null}
        </span>
        <span>{item.label}</span>
        {item.badge > 0 && <span className="hs-nav-badge">{item.badge}</span>}
      </>
    )

    if (isLinkMode) {
      return (
        <Link href="/host/dashboard" className={cls}>
          {content}
        </Link>
      )
    }
    return (
      <button className={cls} onClick={() => onNavChange(item.id)}>
        {content}
      </button>
    )
  }

  return (
    <aside className="hs-sidebar">
      {/* Logo */}
      <div className="hs-logo-wrap">
        <a href="/" className="hs-logo-text">
          Snap<span>Reserve</span><sup>™</sup>
        </a>
        <div className="hs-logo-sub">
          {myRole === 'owner' ? 'Host Portal' : 'Team Portal'}
        </div>
        {myRole !== 'owner' && orgName && (
          <div className="hs-org-name">{orgName}</div>
        )}
      </div>

      {/* Navigation */}
      <nav className="hs-nav-wrap">
        {sections.map(section => {
          const visible = section.items.filter(item => effectiveNav.has(item.id))
          if (!visible.length) return null
          return (
            <div key={section.title}>
              <div className="hs-nav-section-title">{section.title}</div>
              {visible.map(item => <NavItem key={item.id} item={item} />)}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="hs-sidebar-footer">
        <div className="hs-user-row">
          {userAvatar ? (
            <img src={userAvatar} alt="" className="hs-avatar hs-avatar-img" />
          ) : (
            <div className="hs-avatar">{userInitials}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="hs-user-name">
              {userName || 'Host'}
              {isFounder && <span className="hs-founder-badge">🏅</span>}
            </div>
            <div className="hs-user-role">
              {myRole === 'owner'   ? 'Host · Owner'
              : myRole === 'manager' ? 'Host · Manager'
              : myRole === 'staff'   ? 'Host · Staff'
              : myRole === 'finance' ? 'Host · Finance'
              : myRole === 'custom' && myCustomRole ? `Host · ${myCustomRole.name}`
              : 'Host Account'}
            </div>
          </div>
        </div>

        {myRole === 'owner' && onSwitchToGuest && (
          <button className="hs-guest-link" onClick={onSwitchToGuest}>
            <UserRound size={14} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            <span>Switch to Guest Mode</span>
            <span style={{ opacity: 0.8, marginLeft: 'auto' }}>→</span>
          </button>
        )}

        {myRole && myRole !== 'owner' && (
          <div className="hs-team-note">
            <Shield size={13} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            Team member account.
          </div>
        )}

        <ThemeToggle style={{ width: '100%', justifyContent: 'center', marginBottom: '8px' }} />

        <button className="hs-logout-btn" onClick={handleLogout}>
          <LogOut size={14} strokeWidth={1.75} style={{ flexShrink: 0 }} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
