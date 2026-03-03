import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import BookingsClient from './BookingsClient'

async function getBookings() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('bookings')
    .select('id, guest_id, status, check_in, check_out, total_amount, payment_status, reference, created_at, admin_cancelled_at, admin_cancel_reason, listings(title, city)')
    .order('created_at', { ascending: false })
    .limit(200)
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
