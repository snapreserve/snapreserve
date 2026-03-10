'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, UserRound, ClipboardList, Luggage,
  CalendarDays, Flag, Star, Scale, Banknote, TrendingUp,
  ListChecks, Globe2, CircleDot, MessageSquare,
  Zap, KeyRound, Shield, ScrollText, Mail, Settings, ShieldOff,
} from 'lucide-react'
import { getAllowedNavItems } from '@/lib/admin-permissions'

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
  '/admin/messages':           'messages',
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
      { href: '/admin', Icon: LayoutDashboard, label: 'Overview', exact: true },
    ],
  },
  {
    title: 'Users & Content',
    items: [
      { href: '/admin/listings',             Icon: Building2,     label: 'Listings' },
      { href: '/admin/listings?tab=pending', Icon: ListChecks,    label: 'Pending Review' },
      { href: '/admin/users',                Icon: Users,         label: 'All Users' },
      { href: '/admin/hosts',              Icon: UserRound,     label: 'Hosts' },
      { href: '/admin/host-applications',  Icon: ClipboardList, label: 'Host Applications' },
      { href: '/admin/guests',             Icon: Luggage,       label: 'Guests' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/admin/bookings',  Icon: CalendarDays, label: 'Bookings' },
      { href: '/admin/messages',  Icon: MessageSquare, label: 'Messages' },
      { href: '/admin/reports',   Icon: Flag,         label: 'Reports' },
      { href: '/admin/reviews',   Icon: Star,         label: 'Reviews' },
      { href: '/admin/appeals',   Icon: Scale,        label: 'Appeals' },
      { href: '/admin/refunds',   Icon: Banknote,     label: 'Refunds' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { href: '/admin/finance',             Icon: TrendingUp,  label: 'Finance' },
      { href: '/admin/waitlist',            Icon: ListChecks,  label: 'Waitlist' },
      { href: '/admin/international-leads', Icon: Globe2,      label: 'Intl Leads' },
      { href: '/admin/status',              Icon: CircleDot,   label: 'Status' },
    ],
  },
]

const SUPER_SECTIONS = [
  {
    title: 'Super Admin',
    items: [
      { href: '/superadmin',             Icon: Zap,       label: 'Dashboard',     exact: true },
      { href: '/superadmin/roles',       Icon: KeyRound,  label: 'Roles' },
      { href: '/superadmin/permissions', Icon: Shield,    label: 'Permissions' },
      { href: '/superadmin/audit',       Icon: ScrollText,label: 'Audit Log' },
      { href: '/superadmin/invites',     Icon: Mail,      label: 'Invites' },
      { href: '/superadmin/settings',    Icon: Settings,  label: 'Settings' },
      { href: '/superadmin/override',    Icon: ShieldOff, label: 'Override Mode' },
    ],
  },
]

export default function AdminNav({ isSuperAdmin, effectiveRole }) {
  const pathname = usePathname()

  const isViewingAs = isSuperAdmin && effectiveRole && effectiveRole !== 'super_admin'
  const allowedItems = isViewingAs ? getAllowedNavItems(effectiveRole) : null

  function isActive({ href, exact }) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  function isAllowed(item) {
    if (!allowedItems) return true
    const key = HREF_KEY_MAP[item.href]
    return key ? allowedItems.has(key) : false
  }

  const sections = isSuperAdmin && !isViewingAs
    ? [...NAV_SECTIONS, ...SUPER_SECTIONS]
    : NAV_SECTIONS

  return (
    <nav className="hs-nav-wrap">
      {sections.map(section => {
        const visibleItems = section.items.filter(item => isAllowed(item))
        if (!visibleItems.length) return null
        return (
          <div key={section.title}>
            <div className="hs-nav-section-title">{section.title}</div>
            {visibleItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`hs-nav-item${isActive(item) ? ' active' : ''}`}
              >
                <span className="hs-nav-icon">
                  <item.Icon size={17} strokeWidth={1.75} />
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )
      })}
    </nav>
  )
}
