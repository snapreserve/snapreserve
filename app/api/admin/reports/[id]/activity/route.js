import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'

export async function GET(request, { params }) {
  const { role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: activity, error: fetchErr } = await admin
    .from('report_activity')
    .select('id, actor_email, action, detail, created_at')
    .eq('report_id', id)
    .order('created_at', { ascending: true })

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  return NextResponse.json({ activity: activity || [] })
}
