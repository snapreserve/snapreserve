/**
 * Admin Permission Registry
 * Single source of truth for all admin module/action definitions and role permission checking.
 *
 * Usage:
 *   import { hasPermission, MODULES } from '@/lib/admin-permissions'
 *   if (!hasPermission(role, 'finance', 'view_sensitive', customPermissions)) return 403
 */

// All modules and their available actions
export const MODULES = {
  listings:  { label: 'Listings',   icon: '🏨', actions: ['view', 'approve', 'reject', 'suspend', 'request_changes'] },
  bookings:  { label: 'Bookings',   icon: '📅', actions: ['view', 'cancel', 'export'] },
  users:     { label: 'Users',      icon: '👥', actions: ['view', 'suspend', 'deactivate', 'view_personal'] },
  hosts:     { label: 'Hosts',      icon: '👤', actions: ['view', 'verify', 'suspend'] },
  finance:   { label: 'Finance',    icon: '💸', actions: ['view', 'view_sensitive', 'approve_refunds', 'export'] },
  reports:   { label: 'Reports',    icon: '🚩', actions: ['view', 'resolve', 'escalate', 'dismiss'] },
  messaging: { label: 'Messaging',  icon: '💬', actions: ['view', 'send'] },
  settings:  { label: 'Settings',   icon: '⚙️', actions: ['view', 'edit'] },
  audit:     { label: 'Audit Log',  icon: '📋', actions: ['view'] },
  roles:     { label: 'Roles',      icon: '🔑', actions: ['manage'] },
}

// Action labels for UI display
export const ACTION_LABELS = {
  view:             'View',
  approve:          'Approve',
  reject:           'Reject',
  suspend:          'Suspend',
  request_changes:  'Request Changes',
  cancel:           'Cancel',
  export:           'Export CSV',
  deactivate:       'Deactivate',
  view_personal:    'View Personal Data',
  verify:           'Verify',
  view_sensitive:   'View Sensitive Financial Data',
  approve_refunds:  'Approve Refunds',
  resolve:          'Resolve',
  escalate:         'Escalate',
  dismiss:          'Dismiss',
  send:             'Send Messages',
  edit:             'Edit Settings',
  manage:           'Manage Roles',
}

// Built-in system role permission sets (mirrors DB seed data)
export const SYSTEM_ROLE_PERMISSIONS = {
  super_admin: {
    listings:  ['view', 'approve', 'reject', 'suspend', 'request_changes'],
    bookings:  ['view', 'cancel', 'export'],
    users:     ['view', 'suspend', 'deactivate', 'view_personal'],
    hosts:     ['view', 'verify', 'suspend'],
    finance:   ['view', 'view_sensitive', 'approve_refunds', 'export'],
    reports:   ['view', 'resolve', 'escalate', 'dismiss'],
    messaging: ['view', 'send'],
    settings:  ['view', 'edit'],
    audit:     ['view'],
    roles:     ['manage'],
  },
  admin: {
    listings:  ['view', 'approve', 'reject', 'suspend', 'request_changes'],
    bookings:  ['view', 'cancel', 'export'],
    users:     ['view', 'suspend', 'deactivate', 'view_personal'],
    hosts:     ['view', 'verify', 'suspend'],
    finance:   ['view', 'view_sensitive', 'approve_refunds', 'export'],
    reports:   ['view', 'resolve', 'escalate', 'dismiss'],
    messaging: ['view', 'send'],
    settings:  ['view'],
    audit:     ['view'],
    roles:     [],
  },
  support: {
    listings:  ['view'],
    bookings:  ['view'],
    users:     ['view'],
    hosts:     ['view'],
    finance:   [],
    reports:   ['view', 'resolve', 'dismiss'],
    messaging: ['view', 'send'],
    settings:  [],
    audit:     [],
    roles:     [],
  },
  finance: {
    listings:  [],
    bookings:  ['view', 'export'],
    users:     [],
    hosts:     [],
    finance:   ['view', 'view_sensitive', 'approve_refunds', 'export'],
    reports:   [],
    messaging: [],
    settings:  [],
    audit:     ['view'],
    roles:     [],
  },
  trust_safety: {
    listings:  ['view', 'suspend'],
    bookings:  ['view'],
    users:     ['view', 'suspend', 'view_personal'],
    hosts:     ['view', 'suspend'],
    finance:   [],
    reports:   ['view', 'resolve', 'escalate', 'dismiss'],
    messaging: ['view'],
    settings:  [],
    audit:     ['view'],
    roles:     [],
  },
}

/**
 * Check if a role has a specific permission.
 * @param {string} role - The admin role (e.g. 'admin', 'support', 'custom')
 * @param {string} module - Module name (e.g. 'finance', 'listings')
 * @param {string} action - Action name (e.g. 'view_sensitive', 'approve')
 * @param {object|null} customPermissions - For custom roles: the permissions JSONB object
 * @returns {boolean}
 */
export function hasPermission(role, module, action, customPermissions = null) {
  if (role === 'super_admin') return true
  const perms = customPermissions || SYSTEM_ROLE_PERMISSIONS[role] || {}
  return Array.isArray(perms[module]) && perms[module].includes(action)
}

/**
 * Get the full permissions object for a role.
 * @param {string} role
 * @param {object|null} customPermissions
 * @returns {object} permissions map
 */
export function getRolePermissions(role, customPermissions = null) {
  if (role === 'super_admin') return SYSTEM_ROLE_PERMISSIONS.super_admin
  return customPermissions || SYSTEM_ROLE_PERMISSIONS[role] || {}
}

/**
 * Get the list of admin nav items this role can access.
 * Returns array of nav item IDs.
 */
export function getAllowedNavItems(role, customPermissions = null) {
  if (role === 'super_admin') {
    return new Set([
      'overview', 'listings', 'users', 'guests', 'hosts', 'host-applications',
      'bookings', 'messages', 'reports', 'reviews', 'appeals', 'refunds', 'finance',
      'waitlist', 'intl-leads', 'status', 'exports', 'audit',
      'roles', 'invites', 'permissions', 'settings',
    ])
  }

  const perms = getRolePermissions(role, customPermissions)
  const allowed = new Set()

  // Always show overview
  allowed.add('overview')

  if (perms.listings?.includes('view'))  { allowed.add('listings') }
  if (perms.users?.includes('view'))     { allowed.add('users'); allowed.add('guests') }
  if (perms.hosts?.includes('view'))     { allowed.add('hosts'); allowed.add('host-applications') }
  if (perms.bookings?.includes('view'))  { allowed.add('bookings') }
  if (perms.messaging?.includes('view')) { allowed.add('messages') }
  if (perms.reports?.includes('view'))   { allowed.add('reports'); allowed.add('reviews'); allowed.add('appeals') }
  if (perms.finance?.includes('view'))   { allowed.add('refunds') }
  if (perms.finance?.includes('view_sensitive')) { allowed.add('finance') }
  if (perms.finance?.includes('export') || perms.bookings?.includes('export')) { allowed.add('exports') }
  if (perms.audit?.includes('view'))     { allowed.add('audit') }
  if (perms.roles?.includes('manage'))   { allowed.add('roles'); allowed.add('invites'); allowed.add('permissions') }
  if (perms.settings?.includes('view'))  { allowed.add('settings') }

  // Waitlist/intl leads — viewable by admin+ or anyone with user view
  if (perms.users?.includes('view') || role === 'admin' || role === 'super_admin') {
    allowed.add('waitlist')
    allowed.add('intl-leads')
    allowed.add('status')
  }

  return allowed
}
