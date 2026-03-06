'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SECTIONS = [
  {
    title: 'Admin Console',
    items: [
      { href: '/admin',                     icon: '📊', label: 'Overview',           exact: true },
      { href: '/admin/listings',            icon: '🏨', label: 'Listings' },
      { href: '/admin/users',               icon: '👥', label: 'All Users' },
      { href: '/admin/hosts',               icon: '👤', label: 'Hosts' },
      { href: '/admin/host-applications',   icon: '📝', label: 'Host Applications' },
      { href: '/admin/guests',              icon: '🧳', label: 'Guests' },
      { href: '/admin/bookings',            icon: '📅', label: 'Bookings' },
      { href: '/admin/reports',             icon: '🚩', label: 'Reports' },
      { href: '/admin/refunds',             icon: '💸', label: 'Refunds' },
      { href: '/admin/waitlist',            icon: '📩', label: 'Waitlist' },
    ],
  },
  {
    title: 'Super Admin',
    items: [
      { href: '/superadmin',          icon: '⚡', label: 'Dashboard',    exact: true },
      { href: '/superadmin/roles',        icon: '🔑', label: 'Roles' },
      { href: '/superadmin/permissions',  icon: '🛡️', label: 'Permissions' },
      { href: '/superadmin/audit',        icon: '📋', label: 'Audit Log' },
      { href: '/superadmin/invites',      icon: '✉️', label: 'Invites' },
      { href: '/superadmin/settings',     icon: '⚙️', label: 'Settings' },
      { href: '/superadmin/override',     icon: '🔐', label: 'Override Mode' },
    ],
  },
]

export default function SuperAdminNav() {
  const pathname = usePathname()

  function isActive({ href, exact }) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <>
      <style>{`
        .san-wrap { flex: 1; padding: 16px 12px; overflow-y: auto; }
        .san-sec-title { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--sr-sub); padding: 0 10px; margin-bottom: 6px; margin-top: 18px; }
        .san-sec-title:first-child { margin-top: 0; }
        .san-link { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; color: var(--sr-muted); font-size: 0.84rem; font-weight: 500; text-decoration: none; transition: all 0.15s; margin-bottom: 2px; }
        .san-link:hover { background: var(--sr-overlay-xs); color: var(--sr-text); }
        .san-link.active { background: var(--sr-orange); color: white; font-weight: 700; }
        .san-icon { font-size: 1rem; line-height: 1; flex-shrink: 0; width: 20px; text-align: center; }
      `}</style>

      <div className="san-wrap">
        {SECTIONS.map(section => (
          <div key={section.title}>
            <div className="san-sec-title">{section.title}</div>
            {section.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`san-link${isActive(item) ? ' active' : ''}`}
              >
                <span className="san-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
