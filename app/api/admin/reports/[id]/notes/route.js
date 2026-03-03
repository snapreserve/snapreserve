import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'

export async function GET(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: notes, error: fetchErr } = await admin
    .from('report_notes')
    .select('id, author_email, note, created_at')
    .eq('report_id', id)
    .order('created_at', { ascending: true })

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  return NextResponse.json({ notes: notes || [] })
}

export async function POST(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const note = body.note?.trim()
  if (!note) return NextResponse.json({ error: 'note is required' }, { status: 400 })

  const admin = createAdminClient()

  // Verify report exists
  const { data: report } = await admin.from('reports').select('id').eq('id', id).single()
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const { error: insertErr } = await admin.from('report_notes').insert({
    report_id:    id,
    author_id:    user.id,
    author_email: user.email,
    note,
  })
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Append to activity timeline
  await admin.from('report_activity').insert({
    report_id:   id,
    actor_id:    user.id,
    actor_email: user.email,
    action:      'note_added',
    detail:      note.slice(0, 120),
  })

  return NextResponse.json({ success: true })
}
