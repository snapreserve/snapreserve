'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin',                      icon: '📊', label: 'Overview',          exact: true },
  { href: '/admin/listings',             icon: '🏨', label: 'Listings' },
  { href: '/admin/users',                icon: '👥', label: 'All Users' },
  { href: '/admin/hosts',                icon: '👤', label: 'Hosts' },
  { href: '/admin/host-applications',    icon: '📝', label: 'Host Applications' },
  { href: '/admin/guests',               icon: '🧳', label: 'Guests' },
  { href: '/admin/bookings',             icon: '📅', label: 'Bookings' },
  { href: '/admin/reports',              icon: '🚩', label: 'Reports' },
  { href: '/admin/reviews',              icon: '⭐', label: 'Reviews' },
  { href: '/admin/appeals',              icon: '⚖️', label: 'Appeals' },
  { href: '/admin/refunds',              icon: '💸', label: 'Refunds' },
  { href: '/admin/finance',              icon: '📈', label: 'Finance' },
  { href: '/admin/waitlist',             icon: '📩', label: 'Waitlist' },
  { href: '/admin/international-leads',  icon: '🌍', label: 'Intl Leads' },
  { href: '/admin/status',               icon: '🟢', label: 'Status' },
]

const SUPER_ITEMS = [
  { href: '/superadmin',         icon: '⚡', label: 'Dashboard', exact: true },
  { href: '/superadmin/roles',   icon: '🔑', label: 'Roles' },
  { href: '/superadmin/audit',   icon: '📋', label: 'Audit Log' },
]

export default function AdminNav({ isSuperAdmin }) {
  const pathname = usePathname()

  function isActive({ href, exact }) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <>
      <style>{`
        .nav-section { padding:0 12px; margin-bottom:8px; }
        .nav-label { font-size:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:var(--sr-sub); padding:0 8px; margin-bottom:6px; }
        .nav-link { display:flex; align-items:center; gap:10px; padding:9px 8px 9px 10px; border-radius:8px; color:var(--sr-muted); font-size:0.85rem; font-weight:500; text-decoration:none; transition:all 0.15s; border-left:3px solid transparent; }
        .nav-link:hover { background:var(--sr-border-solid); color:var(--sr-text); border-left-color:transparent; }
        .nav-link.active { background:rgba(244,96,26,0.08); color:var(--sr-orange); border-left:3px solid var(--sr-orange); }
        .nav-link .icon { font-size:1rem; width:20px; text-align:center; flex-shrink:0; }
      `}</style>

      <div className="nav-section">
        <div className="nav-label">Main</div>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link${isActive(item) ? ' active' : ''}`}
          >
            <span className="icon">{item.icon}</span>{item.label}
          </Link>
        ))}
      </div>

      {isSuperAdmin && (
        <div className="nav-section">
          <div className="nav-label">Super Admin</div>
          {SUPER_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${isActive(item) ? ' active' : ''}`}
            >
              <span className="icon">{item.icon}</span>{item.label}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
