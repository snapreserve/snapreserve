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
      gap: '10px',
      width: '100%',
      padding: '9px 8px',
      borderRadius: '8px',
      background: 'transparent',
      border: 'none',
      color: '#6B5E52',
      fontSize: '0.85rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.15s',
      fontFamily: 'inherit',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = '#2A2420'; e.currentTarget.style.color = '#F87171' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B5E52' }}
    >
      <span style={{fontSize:'1rem', width:'20px', textAlign:'center'}}>↪</span>
      Sign Out
    </button>
  )
}
