import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { logAction } from '@/lib/audit-log'
import { headers } from 'next/headers'

const VALID_ROLES = ['admin', 'support', 'finance', 'trust_safety']

// POST /api/superadmin/view-as  — set or clear the "view as role" cookie
export async function POST(request) {
  const { user, role, error } = await getAdminSession()
  if (error || role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { view_as } = body // null to clear, or a role string

  if (view_as && !VALID_ROLES.includes(view_as)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const response = NextResponse.json({ success: true, view_as: view_as || null })

  if (view_as) {
    response.cookies.set('admin_view_as', view_as, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 4, // 4 hours
    })
  } else {
    response.cookies.delete('admin_view_as')
  }

  const hdrs = await headers()
  await logAction({
    actorId: user.id, actorEmail: user.email, actorRole: role,
    action: view_as ? 'admin.view_as_start' : 'admin.view_as_end',
    targetType: 'admin_role', targetId: view_as || 'cleared',
    ipAddress: hdrs.get('x-forwarded-for'), userAgent: hdrs.get('user-agent'),
  })

  return response
}
