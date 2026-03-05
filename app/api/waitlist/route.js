import { createClient } from '@supabase/supabase-js'

// Use anon client — RLS policy "Anyone can join waitlist" allows public inserts
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return Response.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const { firstName, lastName, email, type, message, region } = body

    if (!email?.trim() || !firstName?.trim()) {
      return Response.json({ error: 'Email and first name are required.' }, { status: 400 })
    }

    const supabase = getClient()
    const { error } = await supabase.from('waitlist').insert({
      email:      email.trim().toLowerCase(),
      first_name: firstName.trim(),
      last_name:  lastName?.trim()  || null,
      user_type:  type              || null,
      message:    message?.trim()   || null,
      region:     region            || 'us',
    })

    if (error) {
      if (error.code === '23505') {
        return Response.json({ error: 'This email is already on the list.' }, { status: 409 })
      }
      console.error('Waitlist insert error:', error)
      return Response.json({ error: 'Failed to sign up. Please try again.' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Waitlist route error:', err)
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
