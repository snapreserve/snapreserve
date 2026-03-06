export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import WaitlistClient from './_components/WaitlistClient'

async function getWaitlistData() {
  const supabase = createAdminClient()

  const { data: entries, count } = await supabase
    .from('waitlist_v2_signups')
    .select('id, email, first_name, last_name, city, state, country, role, interest, property_type, referral_code, referred_by, signup_source, status, founder_eligible, founder_assigned, founder_region, founder_spot_number, admin_notes, removed_at, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(200)

  const all = entries ?? []

  const stats = {
    total:          count ?? 0,
    hosts:          all.filter(r => r.role === 'host').length,
    travelers:      all.filter(r => r.role === 'traveler' || r.role === 'guest').length,
    both:           all.filter(r => r.role === 'both').length,
    pending:        all.filter(r => !r.status || r.status === 'pending').length,
    founderEligible:all.filter(r => r.founder_eligible).length,
    founderAssigned:all.filter(r => r.founder_assigned).length,
    intl:           all.filter(r => r.country && r.country !== 'United States').length,
    invited:        all.filter(r => r.status === 'invited').length,
  }

  return { entries: all, total: count ?? 0, stats }
}

export default async function WaitlistPage() {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/admin/waitlist')
  if (error === 'mfa_required') redirect('/admin/mfa-verify?next=/admin/waitlist')
  if (!role) redirect('/login?error=no_admin_role')

  const { entries, total, stats } = await getWaitlistData()
  const canAssignFounder = ['admin', 'super_admin'].includes(role)

  return <WaitlistClient initialEntries={entries} total={total} initialStats={stats} role={role} canAssignFounder={canAssignFounder} />
}
