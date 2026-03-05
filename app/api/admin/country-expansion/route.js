import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'

export async function GET() {
  const { role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createAdminClient()
  const { data, error: fetchError } = await adminClient
    .from('country_expansion')
    .select('*')
    .order('priority_rank', { ascending: true, nullsFirst: false })

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  return NextResponse.json({ countries: data ?? [] })
}

export async function POST(request) {
  const { user, role, error } = await getAdminSession()
  if (error || !['admin', 'super_admin'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { country, status, priority_rank, target_quarter, notes } = body

  if (!country?.trim()) return NextResponse.json({ error: 'Country is required.' }, { status: 400 })
  if (!['coming_soon', 'researching', 'live'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data, error: upsertError } = await adminClient
    .from('country_expansion')
    .upsert({
      country:        country.trim(),
      status:         status ?? 'researching',
      priority_rank:  priority_rank ?? null,
      target_quarter: target_quarter?.trim() || null,
      notes:          notes?.trim() || null,
      updated_at:     new Date().toISOString(),
    }, { onConflict: 'country' })
    .select()
    .single()

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })
  return NextResponse.json({ country: data })
}

export async function DELETE(request) {
  const { role, error } = await getAdminSession()
  if (error || !['admin', 'super_admin'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { country } = await request.json()
  if (!country) return NextResponse.json({ error: 'Country required.' }, { status: 400 })

  const adminClient = createAdminClient()
  const { error: delError } = await adminClient
    .from('country_expansion')
    .delete()
    .eq('country', country)

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
