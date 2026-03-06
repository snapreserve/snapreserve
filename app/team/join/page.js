'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Suspense } from 'react'

const ROLE_LABELS = {
  manager: 'Manager',
  staff:   'Staff',
  finance: 'Finance',
}

const ROLE_PERMS = {
  manager: ['Edit listings', 'Manage bookings', 'View earnings', 'Reply to reviews'],
  staff:   ['Manage bookings', 'View calendar', 'Reply to guests'],
  finance: ['View earnings', 'Manage payouts', 'View booking reports'],
}

function JoinInner() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const token        = searchParams.get('token')

  const [invite,   setInvite]   = useState(null)
  const [user,     setUser]     = useState(undefined)  // undefined = loading
  const [status,   setStatus]   = useState('loading')  // loading | valid | error | accepting | done
  const [errMsg,   setErrMsg]   = useState('')
  const [accepted, setAccepted] = useState(false)

  // Get session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
    })
  }, [])

  // Validate token
  useEffect(() => {
    if (!token) { setStatus('error'); setErrMsg('Missing invite token.'); return }
    fetch(`/api/host/team/accept?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) { setInvite(d); setStatus('valid') }
        else         { setStatus('error'); setErrMsg(d.error || 'Invalid invite') }
      })
      .catch(() => { setStatus('error'); setErrMsg('Failed to validate invite link.') })
  }, [token])

  async function handleAccept() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/team/join?token=${token}`)}`)
      return
    }
    setStatus('accepting')
    const res = await fetch('/api/host/team/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await res.json()
    if (data.success) {
      setAccepted(true)
      setStatus('done')
      setTimeout(() => router.push('/host/dashboard?nav=team'), 2000)
    } else {
      setStatus('error')
      setErrMsg(data.error || 'Failed to accept invite.')
    }
  }

  const perms = invite ? (ROLE_PERMS[invite.role] || []) : []
  const roleLabel = invite ? (ROLE_LABELS[invite.role] || invite.role) : ''

  return (
    <div style={{
      minHeight: '100vh', background: '#0F0D0A', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
    }}>
      {/* Logo */}
      <a href="/home" style={{ textDecoration: 'none', marginBottom: 40 }}>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 900, color: '#F5F0EB' }}>
          Snap<span style={{ color: '#F4601A' }}>Reserve™</span>
        </div>
      </a>

      <div style={{
        background: '#1A1712', border: '1px solid #2A2420', borderRadius: 20,
        padding: '40px 48px', maxWidth: 480, width: '100%', textAlign: 'center',
      }}>

        {/* Loading */}
        {(status === 'loading' || user === undefined) && (
          <div style={{ color: '#A89880', fontSize: '0.9rem' }}>Validating invite…</div>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⛔</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F5F0EB', marginBottom: 10 }}>
              Invalid Invite
            </div>
            <div style={{ color: '#A89880', fontSize: '0.88rem', marginBottom: 28 }}>{errMsg}</div>
            <a href="/home" style={{
              display: 'inline-block', padding: '10px 28px', background: '#F4601A',
              color: 'white', borderRadius: 100, textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem',
            }}>
              Go to SnapReserve™
            </a>
          </>
        )}

        {/* Valid invite */}
        {(status === 'valid' || status === 'accepting') && invite && (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: 'rgba(244,96,26,0.12)',
              border: '2px solid rgba(244,96,26,0.3)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.6rem', margin: '0 auto 20px',
            }}>👥</div>

            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F5F0EB', marginBottom: 8 }}>
              You've been invited
            </div>
            <div style={{ color: '#A89880', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.6 }}>
              Join <strong style={{ color: '#F5F0EB' }}>{invite.org_name}</strong> as a{' '}
              <span style={{
                background: 'rgba(244,96,26,0.15)', color: '#F4601A',
                border: '1px solid rgba(244,96,26,0.3)',
                borderRadius: 100, padding: '2px 10px', fontWeight: 700, fontSize: '0.84rem',
              }}>
                {roleLabel}
              </span>
            </div>

            {/* Permissions */}
            {perms.length > 0 && (
              <div style={{
                background: '#120E0A', border: '1px solid #2A2420', borderRadius: 12,
                padding: '14px 18px', marginBottom: 28, textAlign: 'left',
              }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6B5E52', marginBottom: 10 }}>
                  Your permissions
                </div>
                {perms.map(p => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: '#4ade80', fontSize: '0.8rem' }}>✓</span>
                    <span style={{ color: '#A89880', fontSize: '0.84rem' }}>{p}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Auth prompt if not logged in */}
            {user === null && (
              <div style={{
                background: 'rgba(244,96,26,0.06)', border: '1px solid rgba(244,96,26,0.2)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                color: '#F4601A', fontSize: '0.84rem', textAlign: 'left',
              }}>
                You need to be logged in to accept this invite.{' '}
                <strong>Use the account that matches {invite.invite_email || 'the invited email'}.</strong>
                <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a href={`/login?next=${encodeURIComponent(`/team/join?token=${token}`)}`} style={{ color: '#F4601A', fontWeight: 700, textDecoration: 'underline', fontSize: '0.82rem' }}>Log in →</a>
                  <span style={{ color: 'rgba(244,96,26,0.4)' }}>|</span>
                  <a href={`/signup?next=${encodeURIComponent(`/team/join?token=${token}`)}`} style={{ color: '#F4601A', fontWeight: 700, textDecoration: 'underline', fontSize: '0.82rem' }}>Create an account →</a>
                </div>
              </div>
            )}

            <button
              onClick={handleAccept}
              disabled={status === 'accepting'}
              style={{
                width: '100%', padding: '13px', background: status === 'accepting' ? '#6B5E52' : '#F4601A',
                color: 'white', border: 'none', borderRadius: 12, fontWeight: 700,
                fontSize: '0.95rem', cursor: status === 'accepting' ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s', fontFamily: 'inherit',
              }}
            >
              {status === 'accepting' ? 'Accepting…' : user ? 'Accept Invite' : 'Log in to Accept'}
            </button>

            {invite.expires_at && (
              <div style={{ marginTop: 14, fontSize: '0.75rem', color: '#6B5E52' }}>
                Expires {new Date(invite.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </>
        )}

        {/* Done */}
        {status === 'done' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#F5F0EB', marginBottom: 10 }}>
              Welcome to the team!
            </div>
            <div style={{ color: '#A89880', fontSize: '0.88rem' }}>
              Redirecting you to the host dashboard…
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0F0D0A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A89880' }}>
        Loading…
      </div>
    }>
      <JoinInner />
    </Suspense>
  )
}
