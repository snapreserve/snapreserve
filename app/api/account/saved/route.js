import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

// GET — list saved properties
export async function GET() {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('saved_properties')
    .select(`
      id, created_at,
      listings!inner (
        id, title, city, country, main_image_url,
        price_per_night, is_active
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — save a property
export async function POST(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { listing_id } = body
  if (!listing_id) return NextResponse.json({ error: 'listing_id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('saved_properties')
    .upsert({ user_id: user.id, listing_id }, { onConflict: 'user_id,listing_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true }, { status: 201 })
}
