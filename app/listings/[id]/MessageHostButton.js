'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function MessageHostButton({ listingId }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = `/login?redirect=/listings/${listingId}`
      return
    }
    const res = await fetch('/api/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ listing_id: listingId }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok && data.conversation_id) {
      window.location.href = `/account/messages?c=${data.conversation_id}`
    } else {
      setError(data.error || 'Could not start conversation.')
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          width: '100%', padding: '13px', background: 'white',
          border: '1.5px solid #E8E2D9', borderRadius: '12px',
          fontSize: '0.9rem', fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
          fontFamily: 'inherit', color: '#1A1410', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: '8px',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = '#F4601A' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E2D9' }}
      >
        <span style={{ fontSize: '1.1rem' }}>💬</span>
        {loading ? 'Opening chat…' : 'Message Host'}
      </button>
      {error && (
        <div style={{ marginTop: '6px', fontSize: '0.76rem', color: '#DC2626', textAlign: 'center' }}>
          {error}
        </div>
      )}
    </div>
  )
}
