import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(_req, { params }) {
  const { role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('listing_images')
    .select('id, path, is_cover, sort_order')
    .eq('listing_id', id)
    .order('sort_order', { ascending: true })

  if (!rows?.length) return NextResponse.json({ images: [] })

  // Generate signed URLs (1 hr) — works on public + private buckets
  const images = await Promise.all(
    rows.map(async (row) => {
      const { data } = await admin.storage
        .from('property-images')
        .createSignedUrl(row.path, 3600)
      return { ...row, url: data?.signedUrl ?? null }
    })
  )

  return NextResponse.json({ images: images.filter(i => i.url) })
}
