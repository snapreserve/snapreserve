import { createAdminClient } from '@/lib/supabase-admin'
import AuditClient from './AuditClient'

async function getLogs() {
  const sb = createAdminClient()
  const { data } = await sb
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  return data || []
}

export default async function AuditLogPage() {
  const logs = await getLogs()
  return <AuditClient logs={logs} />
}
