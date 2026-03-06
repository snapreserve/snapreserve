'use client'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button onClick={handleSignOut} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      width: '100%',
      padding: '8px 10px',
      borderRadius: '9px',
      background: 'transparent',
      border: 'none',
      color: 'var(--sr-sub)',
      fontSize: '0.78rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.15s',
      fontFamily: 'inherit',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--sr-redl)'; e.currentTarget.style.color = 'var(--sr-red)' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sr-sub)' }}
    >
      <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center', lineHeight: 1 }}>↪</span>
      Sign Out
    </button>
  )
}
