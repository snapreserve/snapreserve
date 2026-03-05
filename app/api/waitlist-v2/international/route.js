import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, country, role } = body

    if (!email?.trim() || !country?.trim()) {
      return NextResponse.json({ error: 'Email and country are required.' }, { status: 400 })
    }
    if (!role || !['guest', 'host'].includes(role)) {
      return NextResponse.json({ error: 'Role must be guest or host.' }, { status: 400 })
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(email.trim())) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Check duplicate
    const { data: existing } = await adminClient
      .from('international_leads')
      .select('id, country, created_at')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ already_registered: true, country: existing.country })
    }

    const { error: insertError } = await adminClient
      .from('international_leads')
      .insert({
        email:   email.trim().toLowerCase(),
        country: country.trim(),
        role,
        source: 'waitlist_v2',
      })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ already_registered: true })
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unexpected error. Please try again.' }, { status: 500 })
  }
}
