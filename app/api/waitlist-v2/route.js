import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

function generateReferralCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I or O (confusing)
  const digits  = '0123456789'
  const rand = (chars) => chars[Math.floor(Math.random() * chars.length)]
  const part1 = rand(letters) + rand(letters)
  const part2 = rand(digits) + rand(digits) + rand(digits) + rand(digits)
  return `SNAP-${part1}-${part2}`
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { first_name, last_name, email, city, role, interest, referred_by } = body

    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'First name, last name, and email are required.' }, { status: 400 })
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(email.trim())) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Check for duplicate email
    const { data: existing } = await adminClient
      .from('waitlist_v2_signups')
      .select('id, referral_code, created_at')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (existing) {
      // Return their existing spot gracefully
      const { count } = await adminClient
        .from('waitlist_v2_signups')
        .select('*', { count: 'exact', head: true })
        .lte('created_at', existing.created_at)
      return NextResponse.json({
        already_registered: true,
        referral_code: existing.referral_code,
        first_name: first_name.trim(),
        position: count ?? 1,
      })
    }

    // Generate unique referral code (retry on collision)
    let referral_code
    let attempts = 0
    while (attempts < 10) {
      referral_code = generateReferralCode()
      const { data: collision } = await adminClient
        .from('waitlist_v2_signups')
        .select('id')
        .eq('referral_code', referral_code)
        .maybeSingle()
      if (!collision) break
      attempts++
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('waitlist_v2_signups')
      .insert({
        first_name: first_name.trim(),
        last_name:  last_name.trim(),
        email:      email.trim().toLowerCase(),
        city:       city?.trim() || null,
        role:       role?.trim() || null,
        interest:   interest?.trim() || null,
        referral_code,
        referred_by: referred_by?.trim() || null,
      })
      .select('id, referral_code, created_at')
      .single()

    if (insertError) {
      // Handle race-condition duplicate
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'This email is already on the waitlist.' }, { status: 409 })
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Get position (how many rows inserted before this one, inclusive)
    const { count: position } = await adminClient
      .from('waitlist_v2_signups')
      .select('*', { count: 'exact', head: true })
      .lte('created_at', inserted.created_at)

    return NextResponse.json({
      success: true,
      referral_code: inserted.referral_code,
      first_name: first_name.trim(),
      position: position ?? 1,
    })
  } catch {
    return NextResponse.json({ error: 'Unexpected error. Please try again.' }, { status: 500 })
  }
}
