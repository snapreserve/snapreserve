// Single source of truth for host portal navigation

export const ROLE_NAV = {
  owner:   new Set(['overview','bookings','properties','calendar','messages','earnings','payouts','expenses','promotions','team','permissions','access','activity','reviews','settings']),
  manager: new Set(['overview','bookings','properties','calendar','messages','promotions','activity','reviews']),
  staff:   new Set(['overview','bookings','calendar','messages']),
  finance: new Set(['overview','earnings','payouts','expenses','activity']),
}

export function buildNavSections({ unreadCount = 0, pendingInviteCount = 0 } = {}) {
  return [
    {
      title: 'MAIN',
      items: [
        { id: 'overview',   label: 'Overview',   icon: '⬛' },
        { id: 'bookings',   label: 'Bookings',   icon: '📋' },
        { id: 'properties', label: 'Properties', icon: '🏨' },
        { id: 'calendar',   label: 'Calendar',   icon: '📅' },
        { id: 'messages',   label: 'Messages',   icon: '💬', badge: unreadCount },
        { id: 'promotions', label: 'Promotions', icon: '🏷️' },
      ],
    },
    {
      title: 'FINANCE',
      items: [
        { id: 'earnings', label: 'Earnings', icon: '💰' },
        { id: 'payouts',  label: 'Payouts',  icon: '🏦' },
        { id: 'expenses', label: 'Expenses', icon: '🧾' },
      ],
    },
    {
      title: 'TEAM',
      items: [
        { id: 'team',        label: 'Team Members',        icon: '👥', badge: pendingInviteCount },
        { id: 'permissions', label: 'Roles & Permissions', icon: '🔐' },
        { id: 'access',      label: 'Property Access',     icon: '🏢' },
        { id: 'activity',    label: 'Activity Log',        icon: '📜' },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        { id: 'reviews',  label: 'Reviews',  icon: '⭐' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
      ],
    },
  ]
}
