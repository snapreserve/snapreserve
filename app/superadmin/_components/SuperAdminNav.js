'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, UserRound, ClipboardList, Luggage,
  CalendarDays, Flag, Star, Scale, Banknote, TrendingUp,
  ListChecks, Globe2, CircleDot,
  Zap, KeyRound, Shield, ScrollText, Mail, Settings, ShieldOff,
} from 'lucide-react'

const SECTIONS = [
  {
    title: 'Admin Console',
    items: [
      { href: '/admin',                   Icon: LayoutDashboard, label: 'Overview',          exact: true },
      { href: '/admin/listings',          Icon: Building2,       label: 'Listings' },
      { href: '/admin/users',             Icon: Users,           label: 'All Users' },
      { href: '/admin/hosts',             Icon: UserRound,       label: 'Hosts' },
      { href: '/admin/host-applications', Icon: ClipboardList,   label: 'Host Applications' },
      { href: '/admin/guests',            Icon: Luggage,         label: 'Guests' },
      { href: '/admin/bookings',          Icon: CalendarDays,    label: 'Bookings' },
      { href: '/admin/reports',           Icon: Flag,            label: 'Reports' },
      { href: '/admin/refunds',           Icon: Banknote,        label: 'Refunds' },
      { href: '/admin/reviews',           Icon: Star,            label: 'Reviews' },
      { href: '/admin/appeals',           Icon: Scale,           label: 'Appeals' },
      { href: '/admin/finance',           Icon: TrendingUp,      label: 'Finance' },
      { href: '/admin/waitlist',          Icon: ListChecks,      label: 'Waitlist' },
      { href: '/admin/international-leads', Icon: Globe2,        label: 'Intl Leads' },
      { href: '/admin/status',            Icon: CircleDot,       label: 'Status' },
    ],
  },
  {
    title: 'Super Admin',
    items: [
      { href: '/superadmin',             Icon: Zap,        label: 'Dashboard',    exact: true },
      { href: '/superadmin/roles',       Icon: KeyRound,   label: 'Roles' },
      { href: '/superadmin/permissions', Icon: Shield,     label: 'Permissions' },
      { href: '/superadmin/audit',       Icon: ScrollText, label: 'Audit Log' },
      { href: '/superadmin/invites',     Icon: Mail,       label: 'Invites' },
      { href: '/superadmin/settings',    Icon: Settings,   label: 'Settings' },
      { href: '/superadmin/override',    Icon: ShieldOff,  label: 'Override Mode' },
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
    <nav className="hs-nav-wrap">
      {SECTIONS.map(section => (
        <div key={section.title}>
          <div className="hs-nav-section-title">{section.title}</div>
          {section.items.map(item => (
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
      ))}
    </nav>
  )
}
