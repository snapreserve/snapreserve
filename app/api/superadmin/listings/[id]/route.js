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
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const adminClient = createAdminClient()

  const { data: listing } = await adminClient
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  // Delete related records first
  await adminClient.from('listing_approvals').delete().eq('listing_id', id)
  const { error: deleteError } = await adminClient.from('listings').delete().eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  await logAction({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: role,
    action: 'listing.hard_deleted',
    targetType: 'listing',
    targetId: id,
    beforeData: listing,
    afterData: null,
    ipAddress: ip,
    userAgent: ua,
  })

  return NextResponse.json({ success: true })
}
