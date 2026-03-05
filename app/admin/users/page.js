export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import UsersClient from './UsersClient'

async function getAllUsers() {
  const admin = createAdminClient()

  const [
    { data: users },
    { data: bookingRows },
    { data: hostRows },
    { data: listingRows },
  ] = await Promise.all([
    admin
      .from('users')
      .select('id, email, full_name, is_active, is_host, user_role, suspended_at, suspension_reason, deleted_at, created_at, avatar_url')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    admin
      .from('bookings')
      .select('guest_id, total_amount')
      .not('status', 'in', '("cancelled","pending")'),
    admin
      .from('hosts')
      .select('user_id, id, verification_status, suspended_at'),
    admin
      .from('listings')
      .select('host_id, is_active, status')
      .is('deleted_at', null),
  ])

  const bookingMap = {}
  for (const b of bookingRows ?? []) {
    if (!bookingMap[b.guest_id]) bookingMap[b.guest_id] = { count: 0, total: 0 }
    bookingMap[b.guest_id].count++
    bookingMap[b.guest_id].total += b.total_amount ?? 0
  }

  const hostMap = {}
  for (const h of hostRows ?? []) {
    hostMap[h.user_id] = h
  }

  const listingMap = {}
  for (const l of listingRows ?? []) {
    const host = hostRows?.find(h => h.id === l.host_id)
    if (host) {
      if (!listingMap[host.user_id]) listingMap[host.user_id] = 0
      listingMap[host.user_id]++
    }
  }

  return (users ?? []).map(u => ({
    ...u,
    booking_count:   bookingMap[u.id]?.count   ?? 0,
    total_spent:     bookingMap[u.id]?.total    ?? 0,
    listing_count:   listingMap[u.id]           ?? 0,
    host_row:        hostMap[u.id]              ?? null,
  }))
}

export default async function AdminUsersPage() {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/admin/users')
  if (error === 'mfa_required')    redirect('/admin/mfa-verify?next=/admin/users')
  if (!role)                       redirect('/login?error=no_admin_role')

  const users = await getAllUsers()
  return <UsersClient initialUsers={users} role={role} />
}
