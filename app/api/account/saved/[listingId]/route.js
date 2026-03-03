import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

// DELETE — remove a property from saved
export async function DELETE(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listingId } = await params
  const admin = createAdminClient()

  const { error } = await admin
    .from('saved_properties')
    .delete()
    .eq('user_id', user.id)
    .eq('listing_id', listingId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
