import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import GuestsClient from './GuestsClient'

async function getGuests() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('users')
    .select('id, email, full_name, is_active, suspended_at, suspension_reason, deleted_at, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function GuestsPage() {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/admin/guests')
  if (error === 'mfa_required') redirect('/admin/mfa-verify?next=/admin/guests')
  if (!role) redirect('/login?error=no_admin_role')

  const guests = await getGuests()
  return <GuestsClient initialGuests={guests} role={role} />
}
