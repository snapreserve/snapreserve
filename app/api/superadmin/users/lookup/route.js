import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'

export async function GET(request) {
  const { role, error } = await getAdminSession()
  if (error || role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')?.trim()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()

  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })

  const found = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!found) return NextResponse.json({ error: 'No user found with that email' }, { status: 404 })

  return NextResponse.json({ user_id: found.id, email: found.email })
}
