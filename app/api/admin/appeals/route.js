import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'

// GET — list appeals (trust_safety + super_admin + admin)
export async function GET(request) {
  const { role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending'

  const admin = createAdminClient()
  const query = admin
    .from('appeals')
    .select('*')
    .order('created_at', { ascending: true })

  if (status !== 'all') query.eq('status', status)

  const { data, error: fetchErr } = await query
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  return NextResponse.json({ appeals: data ?? [] })
}
