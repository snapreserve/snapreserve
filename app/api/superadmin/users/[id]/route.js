import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { getAdminSession } from '@/lib/get-admin-session'

export async function DELETE(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const hard = searchParams.get('hard') === 'true'

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const adminClient = createAdminClient()

  const { data: targetUser } = await adminClient
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (hard) {
    // Hard delete: remove from auth + users table
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(id)
    if (authDeleteError) {
      return NextResponse.json({ error: authDeleteError.message }, { status: 500 })
    }
    // users row will cascade-delete via FK, but delete explicitly to be safe
    await adminClient.from('users').delete().eq('id', id)
  } else {
    // Soft delete: set deleted_at
    const { error: softDeleteError } = await adminClient
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (softDeleteError) {
      return NextResponse.json({ error: softDeleteError.message }, { status: 500 })
    }
  }

  await logAction({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: role,
    action: hard ? 'user.hard_deleted' : 'user.soft_deleted',
    targetType: 'user',
    targetId: id,
    beforeData: targetUser,
    afterData: null,
    ipAddress: ip,
    userAgent: ua,
  })

  return NextResponse.json({ success: true })
}
