'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getAllowedNavItems } from '@/lib/admin-permissions'

// Map each nav item href to a "key" used by getAllowedNavItems
const HREF_KEY_MAP = {
  '/admin':                    'overview',
  '/admin/listings':           'listings',
  '/admin/users':              'users',
  '/admin/hosts':              'hosts',
  '/admin/host-applications':  'host-applications',
  '/admin/guests':             'guests',
  '/admin/bookings':           'bookings',
  '/admin/reports':            'reports',
  '/admin/reviews':            'reviews',
  '/admin/appeals':            'appeals',
  '/admin/refunds':            'refunds',
  '/admin/finance':            'finance',
  '/admin/waitlist':           'waitlist',
  '/admin/international-leads':'intl-leads',
  '/admin/status':             'status',
  '/superadmin':               'overview',
  '/superadmin/roles':         'roles',
  '/superadmin/audit':         'audit',
  '/superadmin/invites':       'invites',
  '/superadmin/permissions':   'permissions',
  '/superadmin/settings':      'settings',
  '/superadmin/override':      'roles',
}

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
      { href: '/superadmin',              icon: '⚡', label: 'Dashboard',    exact: true },
      { href: '/superadmin/roles',        icon: '🔑', label: 'Roles' },
      { href: '/superadmin/permissions',  icon: '🛡️', label: 'Permissions' },
      { href: '/superadmin/audit',        icon: '📋', label: 'Audit Log' },
      { href: '/superadmin/invites',      icon: '✉️', label: 'Invites' },
      { href: '/superadmin/settings',     icon: '⚙️', label: 'Settings' },
      { href: '/superadmin/override',     icon: '🔐', label: 'Override Mode' },
    ],
  },
]

export default function AdminNav({ isSuperAdmin, effectiveRole }) {
  const pathname = usePathname()

  // Super admins in view-as mode use effectiveRole for nav filtering
  // Real super admins (not in view-as) see everything
  const isViewingAs = isSuperAdmin && effectiveRole && effectiveRole !== 'super_admin'
  const allowedItems = isViewingAs ? getAllowedNavItems(effectiveRole) : null

  function isActive({ href, exact }) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  function isAllowed(item) {
    if (!allowedItems) return true // not in view-as mode — show all
    const key = HREF_KEY_MAP[item.href]
    return key ? allowedItems.has(key) : false
  }

  // Super admin sections only shown to real super admins (not while viewing as another role)
  const sections = isSuperAdmin && !isViewingAs
    ? [...NAV_SECTIONS, ...SUPER_SECTIONS]
    : NAV_SECTIONS

  return (
    <>
      <style>{`
        .an-wrap  { flex: 1; padding: 16px 12px; overflow-y: auto; }
        .an-sec-title { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--sr-sub); padding: 0 10px; margin-bottom: 6px; margin-top: 18px; }
        .an-sec-title:first-child { margin-top: 0; }
        .an-link { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; color: var(--sr-muted); font-size: 0.82rem; font-weight: 500; text-decoration: none; transition: all 0.13s; margin-bottom: 1px; border: none; background: none; width: 100%; text-align: left; font-family: 'DM Sans', sans-serif; cursor: pointer; }
        .an-link:hover { background: var(--sr-overlay-xs); color: var(--sr-text); }
        .an-link.active { background: var(--sr-orange); color: white; font-weight: 700; }
        .an-icon { font-size: 1rem; line-height: 1; flex-shrink: 0; width: 20px; text-align: center; }
        .an-restricted { opacity: 0.35; pointer-events: none; }
      `}</style>

      <div className="an-wrap">
        {sections.map((section, si) => {
          const visibleItems = section.items.filter(item => isAllowed(item))
          if (!visibleItems.length) return null
          return (
            <div key={section.title}>
              <div className={`an-sec-title${si === 0 ? ' first' : ''}`}>{section.title}</div>
              {visibleItems.map(item => (
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
          )
        })}
      </div>
    </>
  )
}
