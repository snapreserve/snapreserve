export const dynamic = 'force-dynamic'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import ReviewsClient from './ReviewsClient'

async function getInitial() {
  const admin = createAdminClient()
  const { data: rows, count } = await admin
    .from('reviews')
    .select('id, listing_id, booking_id, guest_id, rating, cleanliness, accuracy, communication, location, value, comment, host_reply, is_hidden, created_at, listings(title, city)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 24)

  const guestIds = [...new Set((rows || []).map(r => r.guest_id).filter(Boolean))]
  const { data: guests } = guestIds.length
    ? await admin.from('users').select('id, full_name, email').in('id', guestIds)
    : { data: [] }
  const guestMap = Object.fromEntries((guests || []).map(g => [g.id, g]))

  const reviews = (rows || []).map(r => {
    const g = guestMap[r.guest_id] || {}
    const parts = (g.full_name || '').trim().split(/\s+/)
    const guestName = parts.length > 1 ? `${parts[0]} ${parts[parts.length-1][0]}.` : parts[0] || g.email || 'Guest'
    return {
      id: r.id, listing_id: r.listing_id, listing_title: r.listings?.title || '—', listing_city: r.listings?.city || '',
      booking_id: r.booking_id, guest_id: r.guest_id, guest_name: guestName,
      rating: Number(r.rating), cleanliness: r.cleanliness, accuracy: r.accuracy,
      communication: r.communication, location: r.location, value: r.value,
      comment: r.comment, host_reply: r.host_reply, is_hidden: r.is_hidden, created_at: r.created_at,
    }
  })
  return { reviews, total: count ?? 0 }
}

export default async function AdminReviewsPage() {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/admin/reviews')
  if (error === 'mfa_required')    redirect('/admin/mfa-verify?next=/admin/reviews')
  if (!role) redirect('/login?error=no_admin_role')

  const { reviews, total } = await getInitial()
  return <ReviewsClient initialReviews={reviews} initialTotal={total} />
}
