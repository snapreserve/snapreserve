export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import HostApplicationsClient from './HostApplicationsClient'

async function signedUrl(admin, path) {
  if (!path) return null
  const { data } = await admin.storage.from('host-id-documents').createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

async function getData() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('host_applications')
    .select(`
      id, status, host_type, display_name, phone, created_at,
      reviewed_at, rejection_reason, user_id, id_admin_notes,
      id_type, id_front_url, id_back_url, id_passport_url, id_selfie_url, id_submitted_at,
      users(email, full_name, avatar_url)
    `)
    .order('created_at', { ascending: false })

  const apps = data ?? []

  // Generate signed URLs for pending applications (admins need to view docs)
  const withUrls = await Promise.all(apps.map(async app => {
    if (app.status !== 'pending' && app.status !== 'rejected') return app
    const [front, back, passport, selfie] = await Promise.all([
      signedUrl(admin, app.id_front_url),
      signedUrl(admin, app.id_back_url),
      signedUrl(admin, app.id_passport_url),
      signedUrl(admin, app.id_selfie_url),
    ])
    return { ...app, id_front_signed: front, id_back_signed: back, id_passport_signed: passport, id_selfie_signed: selfie }
  }))

  return withUrls
}

export default async function HostApplicationsPage() {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/admin/host-applications')
  if (error === 'mfa_required') redirect('/admin/mfa-verify?next=/admin/host-applications')
  if (!role) redirect('/login?error=no_admin_role')

  const applications = await getData()

  return <HostApplicationsClient applications={applications} role={role} />
}
