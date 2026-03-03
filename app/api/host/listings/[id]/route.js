import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

export async function PATCH(request, { params }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { action } = body

  if (!['go_live', 'unpublish', 'resubmit'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: listing } = await admin
    .from('listings')
    .select('id, host_id, status, is_active')
    .eq('id', id)
    .single()

  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  if (listing.host_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let updatePayload = {}

  if (action === 'go_live') {
    if (listing.status !== 'approved') {
      return NextResponse.json({ error: 'Listing must be approved before going live' }, { status: 400 })
    }
    updatePayload = { status: 'live', is_active: true }
  } else if (action === 'unpublish') {
    if (listing.status !== 'live') {
      return NextResponse.json({ error: 'Only live listings can be unpublished' }, { status: 400 })
    }
    updatePayload = { status: 'approved', is_active: false }
  } else if (action === 'resubmit') {
    if (listing.status !== 'changes_requested') {
      return NextResponse.json({ error: 'Only listings with changes requested can be resubmitted' }, { status: 400 })
    }
    // Resolve all open change requests
    await admin
      .from('listing_change_requests')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('listing_id', id)
      .eq('status', 'open')
    // Put the approval back in the queue
    await admin
      .from('listing_approvals')
      .update({ status: 'pending', reviewed_at: null })
      .eq('listing_id', id)
      .eq('status', 'changes_requested')
    updatePayload = { status: 'pending_review', is_active: false }
  }

  const { error } = await admin.from('listings').update(updatePayload).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
