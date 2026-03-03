import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import ReportsClient from './ReportsClient'

async function getReports() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('reports')
    .select('id, reporter_id, target_type, target_id, reason, details, status, resolved_at, resolution_note, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  return data ?? []
}

export default async function ReportsPage() {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/admin/reports')
  if (error === 'mfa_required') redirect('/admin/mfa-verify?next=/admin/reports')
  if (!role) redirect('/login?error=no_admin_role')

  const reports = await getReports()
  return <ReportsClient initialReports={reports} role={role} />
}
