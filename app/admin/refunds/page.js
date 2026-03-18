export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import RefundsClient from './RefundsClient'

async function getRefunds() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('refund_requests')
    .select('id, booking_id, requested_by, reason, amount, status, approved_by, approved_at, notes, created_at, bookings(total_amount, reference)')
    .order('created_at', { ascending: false })
    .limit(200)
  return data ?? []
}

export default async function RefundsPage() {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/admin/refunds')
  if (error === 'mfa_required') redirect('/admin/mfa-verify?next=/admin/refunds')
  if (!role) redirect('/login?error=no_admin_role')

  const refunds = await getRefunds()
  return <RefundsClient initialRefunds={refunds} role={role} />
}

