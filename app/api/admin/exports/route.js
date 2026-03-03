import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'

const ALLOWED_TYPES = ['hosts', 'guests', 'bookings', 'listings', 'refunds']

function toCSV(rows, columns) {
  const header = columns.join(',')
  const lines = rows.map(row =>
    columns.map(col => {
      const val = row[col] ?? ''
      const str = String(val).replace(/"/g, '""')
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str
    }).join(',')
  )
  return [header, ...lines].join('\n')
}

export async function GET(request) {
  const { role, error } = await getAdminSession()
  if (error || !role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // support and trust_safety cannot export anything
  if (role === 'support' || role === 'trust_safety') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: `type must be one of: ${ALLOWED_TYPES.join(', ')}` }, { status: 400 })
  }

  // finance role can only export refund data — not PII (hosts, guests, bookings, listings)
  if (role === 'finance' && type !== 'refunds') {
    return NextResponse.json({ error: 'Finance role can only export refund data' }, { status: 403 })
  }

  const adminClient = createAdminClient()
  let csv = ''
  const filename = `${type}-${new Date().toISOString().split('T')[0]}.csv`

  if (type === 'hosts') {
    const { data } = await adminClient
      .from('hosts')
      .select('id, user_id, verification_status, suspended_at, created_at, stripe_connect_account_id, payout_status')
      .order('created_at', { ascending: false })
    csv = toCSV(data ?? [], ['id', 'user_id', 'verification_status', 'suspended_at', 'created_at'])

  } else if (type === 'guests') {
    const { data } = await adminClient
      .from('users')
      .select('id, email, full_name, is_active, suspended_at, deleted_at, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    csv = toCSV(data ?? [], ['id', 'email', 'full_name', 'is_active', 'suspended_at', 'created_at'])

  } else if (type === 'bookings') {
    const { data } = await adminClient
      .from('bookings')
      .select('id, listing_id, guest_id, status, check_in, check_out, total_amount, payment_status, reference, created_at, admin_cancelled_at, admin_cancel_reason')
      .order('created_at', { ascending: false })
    csv = toCSV(data ?? [], ['id', 'listing_id', 'guest_id', 'reference', 'status', 'check_in', 'check_out', 'total_amount', 'payment_status', 'created_at'])

  } else if (type === 'listings') {
    const { data } = await adminClient
      .from('listings')
      .select('id, title, status, is_active, suspended_at, deleted_at, created_at')
      .order('created_at', { ascending: false })
    csv = toCSV(data ?? [], ['id', 'title', 'status', 'is_active', 'suspended_at', 'deleted_at', 'created_at'])

  } else if (type === 'refunds') {
    const { data } = await adminClient
      .from('refund_requests')
      .select('id, booking_id, requested_by, reason, amount, status, approved_by, approved_at, created_at')
      .order('created_at', { ascending: false })
    csv = toCSV(data ?? [], ['id', 'booking_id', 'requested_by', 'reason', 'amount', 'status', 'approved_by', 'approved_at', 'created_at'])
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
