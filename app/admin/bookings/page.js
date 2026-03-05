export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import BookingsClient from './BookingsClient'

async function getBookings() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('bookings')
    .select(`
      id, guest_id, host_id, listing_id, status,
      check_in, check_out, guests, nights,
      price_per_night, cleaning_fee, service_fee, total_amount,
      payment_status, payment_provider, payment_intent_id,
      reference, created_at, cancellation_policy,
      special_requests, refund_amount, stripe_refund_id,
      admin_cancelled_at, admin_cancel_reason, cancelled_by_admin_id,
      listings(id, title, city, state, type),
      guest:users!bookings_guest_id_fkey(id, full_name, email),
      host:users!bookings_host_id_fkey(id, full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(500)
  return data ?? []
}

export default async function BookingsPage() {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/admin/bookings')
  if (error === 'mfa_required') redirect('/admin/mfa-verify?next=/admin/bookings')
  if (!role) redirect('/login?error=no_admin_role')

  const bookings = await getBookings()
  return <BookingsClient initialBookings={bookings} role={role} />
}
