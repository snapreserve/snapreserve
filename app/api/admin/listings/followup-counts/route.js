import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const { error } = await getAdminSession()
  if (error) return NextResponse.json({ error }, { status: 401 })

  const admin = createAdminClient()

  // Get unread follow-up counts grouped by listing_id
  const { data, error: fetchErr } = await admin
    .from('listing_follow_ups')
    .select('listing_id')
    .eq('read_by_admin', false)

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  // Aggregate counts
  const countMap = {}
  ;(data || []).forEach(({ listing_id }) => {
    countMap[listing_id] = (countMap[listing_id] || 0) + 1
  })

  const counts = Object.entries(countMap).map(([listing_id, unread]) => ({ listing_id, unread }))
  return NextResponse.json({ counts })
}
