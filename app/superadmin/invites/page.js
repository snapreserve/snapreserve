import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import InvitesClient from './InvitesClient'

async function getInvites() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('admin_invites')
    .select('id, token, email, role, created_at, expires_at, accepted_at, revoked_at')
    .order('created_at', { ascending: false })

  const now = new Date()
  const BASE_URL = 'https://snapreserve.app'
  return (data ?? []).map(inv => {
    let status = 'pending'
    if (inv.revoked_at) status = 'revoked'
    else if (inv.accepted_at) status = 'accepted'
    else if (new Date(inv.expires_at) < now) status = 'expired'
    return { ...inv, status, link: `${BASE_URL}/admin/accept-invite?token=${inv.token}` }
  })
}

export default async function InvitesPage() {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/superadmin/invites')
  if (error === 'mfa_required') redirect('/admin/mfa-verify?next=/superadmin/invites')
  if (role !== 'super_admin') redirect('/admin')

  const invites = await getInvites()
  return <InvitesClient initialInvites={invites} />
}
