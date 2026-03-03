import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import StatusClient from './StatusClient'

export default async function AdminStatusPage() {
  const { role, error } = await getAdminSession()
  if (error || !role) redirect('/login')

  const admin = createAdminClient()

  const [{ data: components }, { data: incidents }] = await Promise.all([
    admin
      .from('status_components')
      .select('id, name, description, status, updated_at')
      .order('display_order', { ascending: true }),
    admin
      .from('status_incidents')
      .select(`
        id, title, status, impact, message, affected_components, created_at,
        status_incident_updates(id, status, message, created_at)
      `)
      .neq('status', 'resolved')
      .order('created_at', { ascending: false }),
  ])

  return (
    <>
      <div style={{
        background: '#1A1712', borderBottom: '1px solid #2A2420',
        padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F5F0EB' }}>
          Status Page
        </h1>
        <a
          href="https://status.snapreserve.app"
          target="_blank"
          rel="noreferrer"
          style={{
            background: 'rgba(255,255,255,0.07)', color: '#F5F0EB',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
            padding: '7px 14px', fontSize: '0.8rem', fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          ↗ status.snapreserve.app
        </a>
      </div>

      <div style={{ padding: '32px' }}>
        <StatusClient
          initialComponents={components ?? []}
          initialIncidents={incidents ?? []}
        />
      </div>
    </>
  )
}
