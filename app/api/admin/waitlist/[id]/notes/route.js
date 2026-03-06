import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { headers } from 'next/headers'

export async function POST(req, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error) return NextResponse.json({ error }, { status: 401 })
  if (!role) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const { note } = await req.json()
  if (!note?.trim()) return NextResponse.json({ error: 'note_required' }, { status: 400 })

  const hdrs = await headers()
  const ip  = hdrs.get('x-forwarded-for') ?? 'unknown'
  const ua  = hdrs.get('user-agent') ?? ''

  const supabase = createAdminClient()

  const { data, error: insErr } = await supabase
    .from('waitlist_admin_notes')
    .insert({
      entry_id:   id,
      admin_id:   user.id,
      admin_name: user.email,
      note:       note.trim(),
    })
    .select()
    .single()

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  await logAction({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: role,
    action: 'waitlist.note_add',
    targetType: 'waitlist_entry',
    targetId: id,
    afterData: { note: note.trim() },
    ipAddress: ip,
    userAgent: ua,
  })

  return NextResponse.json({ note: data })
}
