'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { height:100%; font-family:'DM Sans',-apple-system,sans-serif; background:#0F0D0A; color:#F5F0EB; }
  .page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
  .card { background:#1A1712; border:1px solid #2A2420; border-radius:20px; padding:40px 36px; width:100%; max-width:420px; }
  .logo { font-size:1.1rem; font-weight:800; color:#F4601A; margin-bottom:28px; display:block; }
  .logo small { display:block; font-size:0.65rem; color:#A89880; font-weight:500; text-transform:uppercase; letter-spacing:0.1em; margin-top:2px; }
  h1 { font-size:1.3rem; font-weight:800; color:#F5F0EB; margin-bottom:8px; }
  .subtitle { font-size:0.88rem; color:#A89880; margin-bottom:24px; line-height:1.5; }
  .invite-info { background:#0F0D0A; border:1px solid #2A2420; border-radius:10px; padding:16px 18px; margin-bottom:24px; }
  .invite-row { display:flex; justify-content:space-between; align-items:center; padding:4px 0; }
  .invite-label { font-size:0.75rem; color:#6B5E52; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; }
  .invite-value { font-size:0.85rem; color:#F5F0EB; font-weight:600; }
  .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:0.72rem; font-weight:700; }
  .badge-admin { background:rgba(26,110,244,0.15); color:#6EA4F4; }
  .badge-support { background:rgba(22,163,74,0.15); color:#4ADE80; }
  .btn { width:100%; padding:12px; border-radius:10px; font-size:0.9rem; font-weight:700; cursor:pointer; border:none; transition:opacity 0.15s; margin-bottom:10px; }
  .btn-primary { background:#F4601A; color:#fff; }
  .btn-primary:hover:not(:disabled) { opacity:0.9; }
  .btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
  .btn-secondary { background:#2A2420; color:#A89880; border:1px solid #3A3028; }
  .btn-secondary:hover { color:#F5F0EB; border-color:#4A3A30; }
  .warning-box { background:rgba(234,179,8,0.08); border:1px solid rgba(234,179,8,0.25); border-radius:10px; padding:14px 16px; margin-bottom:20px; font-size:0.83rem; color:#FCD34D; line-height:1.5; }
  .error-box { background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.25); border-radius:10px; padding:14px 16px; margin-bottom:20px; font-size:0.83rem; color:#F87171; line-height:1.5; }
  .success-box { background:rgba(74,222,128,0.08); border:1px solid rgba(74,222,128,0.25); border-radius:10px; padding:14px 16px; margin-bottom:20px; font-size:0.83rem; color:#4ADE80; line-height:1.5; }
  .loading { text-align:center; color:#6B5E52; padding:40px 0; font-size:0.88rem; }
  .divider { border:none; border-top:1px solid #2A2420; margin:16px 0; }
  .link { color:#F4601A; text-decoration:none; font-weight:600; }
  .link:hover { text-decoration:underline; }
`

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [invite, setInvite] = useState(null)
  const [currentUser, setCurrentUser] = useState(undefined) // undefined = loading
  const [state, setState] = useState('loading') // loading | invalid | ready | wrong_email | accepting | accepted
  const [error, setError] = useState('')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    if (!token) { setState('invalid'); setError('No invite token provided.'); return }
    Promise.all([
      fetch(`/api/superadmin/invites/${token}`).then(r => r.json()),
      supabase.auth.getUser(),
    ]).then(([inviteData, { data: { user } }]) => {
      if (inviteData.error) { setState('invalid'); setError(inviteData.error); return }
      setInvite(inviteData.invite)
      setCurrentUser(user)
      if (!user) { setState('unauthenticated'); return }
      if (user.email?.toLowerCase() !== inviteData.invite.email.toLowerCase()) {
        setState('wrong_email'); return
      }
      setState('ready')
    }).catch(() => { setState('invalid'); setError('Failed to validate invite.') })
  }, [token])

  async function acceptInvite() {
    setState('accepting')
    try {
      const res = await fetch(`/api/superadmin/invites/${token}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to accept invite'); setState('ready'); return }
      setState('accepted')
      setTimeout(() => router.push('/admin/mfa-setup'), 2000)
    } catch {
      setError('Unexpected error. Please try again.')
      setState('ready')
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setState('unauthenticated')
  }

  return (
    <div className="page">
      <div className="card">
        <span className="logo">
          SnapReserve
          <small>Admin Console</small>
        </span>

        {state === 'loading' && <div className="loading">Validating invite...</div>}

        {state === 'invalid' && (
          <>
            <h1>Invalid Invite</h1>
            <div className="error-box">{error}</div>
            <a href="/login" className="btn btn-secondary" style={{display:'block', textAlign:'center', textDecoration:'none'}}>Back to Login</a>
          </>
        )}

        {invite && state !== 'invalid' && state !== 'loading' && (
          <>
            <h1>Admin Invite</h1>
            <p className="subtitle">You have been invited to join SnapReserve as an admin.</p>

            <div className="invite-info">
              <div className="invite-row">
                <span className="invite-label">Email</span>
                <span className="invite-value">{invite.email}</span>
              </div>
              <div className="invite-row">
                <span className="invite-label">Role</span>
                <span className={`badge badge-${invite.role}`}>{invite.role}</span>
              </div>
              <div className="invite-row">
                <span className="invite-label">Expires</span>
                <span className="invite-value">
                  {new Date(invite.expires_at).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}
                </span>
              </div>
            </div>

            {state === 'unauthenticated' && (
              <>
                <p className="subtitle">Sign in or create an account with <strong>{invite.email}</strong> to accept this invite.</p>
                <a href={`/login?next=/admin/accept-invite?token=${token}`} className="btn btn-primary" style={{display:'block',textAlign:'center',textDecoration:'none'}}>Log In</a>
                <a href={`/signup?next=/admin/accept-invite?token=${token}&email=${encodeURIComponent(invite.email)}`} className="btn btn-secondary" style={{display:'block',textAlign:'center',textDecoration:'none'}}>Create Account</a>
              </>
            )}

            {state === 'wrong_email' && (
              <>
                <div className="warning-box">
                  You are signed in as <strong>{currentUser?.email}</strong>, but this invite is for <strong>{invite.email}</strong>.
                  Please sign out and use the correct account.
                </div>
                <button className="btn btn-secondary" onClick={signOut}>Sign Out</button>
              </>
            )}

            {(state === 'ready' || state === 'accepting') && (
              <>
                {error && <div className="error-box">{error}</div>}
                <p className="subtitle">You are signed in as <strong>{currentUser?.email}</strong>.</p>
                <button
                  className="btn btn-primary"
                  disabled={state === 'accepting'}
                  onClick={acceptInvite}
                >
                  {state === 'accepting' ? 'Accepting...' : 'Accept Invite'}
                </button>
              </>
            )}

            {state === 'accepted' && (
              <div className="success-box">
                Invite accepted! You now have <strong>{invite.role}</strong> access.
                Redirecting to MFA setup...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <>
      <style>{STYLES}</style>
      <Suspense fallback={
        <>
          <style>{STYLES}</style>
          <div className="page"><div className="card"><div className="loading">Loading...</div></div></div>
        </>
      }>
        <AcceptInviteContent />
      </Suspense>
    </>
  )
}
