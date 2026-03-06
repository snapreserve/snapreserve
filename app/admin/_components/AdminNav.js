'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { href: '/admin', icon: '📊', label: 'Overview', exact: true },
    ],
  },
  {
    title: 'Users & Content',
    items: [
      { href: '/admin/listings',           icon: '🏨', label: 'Listings' },
      { href: '/admin/users',              icon: '👥', label: 'All Users' },
      { href: '/admin/hosts',              icon: '👤', label: 'Hosts' },
      { href: '/admin/host-applications',  icon: '📝', label: 'Host Applications' },
      { href: '/admin/guests',             icon: '🧳', label: 'Guests' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/admin/bookings',  icon: '📅', label: 'Bookings' },
      { href: '/admin/reports',   icon: '🚩', label: 'Reports' },
      { href: '/admin/reviews',   icon: '⭐', label: 'Reviews' },
      { href: '/admin/appeals',   icon: '⚖️', label: 'Appeals' },
      { href: '/admin/refunds',   icon: '💸', label: 'Refunds' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { href: '/admin/finance',              icon: '📈', label: 'Finance' },
      { href: '/admin/waitlist',             icon: '📩', label: 'Waitlist' },
      { href: '/admin/international-leads',  icon: '🌍', label: 'Intl Leads' },
      { href: '/admin/status',               icon: '🟢', label: 'Status' },
    ],
  },
]

const SUPER_SECTIONS = [
  {
    title: 'Super Admin',
    items: [
      { href: '/superadmin',          icon: '⚡', label: 'Dashboard', exact: true },
      { href: '/superadmin/roles',    icon: '🔑', label: 'Roles' },
      { href: '/superadmin/audit',    icon: '📋', label: 'Audit Log' },
      { href: '/superadmin/invites',  icon: '✉️', label: 'Invites' },
      { href: '/superadmin/settings', icon: '⚙️', label: 'Settings' },
    ],
  },
]

export default function AdminNav({ isSuperAdmin }) {
  const pathname = usePathname()

  function isActive({ href, exact }) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const sections = isSuperAdmin ? [...NAV_SECTIONS, ...SUPER_SECTIONS] : NAV_SECTIONS

  return (
    <>
      <style>{`
        .an-wrap  { flex: 1; padding: 16px 12px; overflow-y: auto; }
        .an-sec-title { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--sr-sub); padding: 0 10px; margin-bottom: 6px; margin-top: 18px; }
        .an-sec-title:first-child { margin-top: 0; }
        .an-link { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; color: var(--sr-muted); font-size: 0.84rem; font-weight: 500; text-decoration: none; transition: all 0.15s; margin-bottom: 2px; border: none; background: none; width: 100%; text-align: left; font-family: 'Syne', sans-serif; cursor: pointer; }
        .an-link:hover { background: var(--sr-overlay-xs); color: var(--sr-text); }
        .an-link.active { background: var(--sr-orange); color: white; font-weight: 700; }
        .an-icon { font-size: 1rem; line-height: 1; flex-shrink: 0; width: 20px; text-align: center; }
      `}</style>

      <div className="an-wrap">
        {sections.map((section, si) => (
          <div key={section.title}>
            <div className={`an-sec-title${si === 0 ? ' first' : ''}`}>{section.title}</div>
            {section.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`an-link${isActive(item) ? ' active' : ''}`}
              >
                <span className="an-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
