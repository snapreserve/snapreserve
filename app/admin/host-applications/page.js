export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import HostApplicationsClient from './HostApplicationsClient'

async function getData() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('host_applications')
    .select('id, status, host_type, display_name, phone, created_at, reviewed_at, rejection_reason, user_id, users(email, full_name, avatar_url)')
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function HostApplicationsPage() {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/admin/host-applications')
  if (error === 'mfa_required') redirect('/admin/mfa-verify?next=/admin/host-applications')
  if (!role) redirect('/login?error=no_admin_role')

  const applications = await getData()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .topbar { background:var(--sr-surface); border-bottom:1px solid var(--sr-border-solid); padding:16px 32px; display:flex; align-items:center; justify-content:space-between; }
        .topbar h1 { font-size:1.05rem; font-weight:700; color:var(--sr-text); }
        .content { padding:32px; }
      `}</style>
      <div className="topbar">
        <h1>Host Applications</h1>
        <div style={{ fontSize: '0.8rem', color: 'var(--sr-muted)' }}>
          {applications.filter(a => a.status === 'pending').length} pending
        </div>
      </div>
      <div className="content">
        <HostApplicationsClient applications={applications} />
      </div>
    </>
  )
}
