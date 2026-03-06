'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Role metadata ────────────────────────────────────────────────────────────
const ROLE_META = {
  manager: {
    label: 'Manager',
    icon:  '🗂',
    color: '#6366f1',
    perms: ['Edit listings & photos', 'Manage bookings & check-ins', 'View earnings reports', 'Reply to guest reviews'],
  },
  staff: {
    label: 'Staff',
    icon:  '🤝',
    color: '#0ea5e9',
    perms: ['View upcoming bookings', 'Manage check-in calendar', 'Send guest messages'],
  },
  finance: {
    label: 'Finance',
    icon:  '📊',
    color: '#10b981',
    perms: ['View all earnings & payouts', 'Export financial reports', 'View booking revenue'],
  },
  custom: {
    label: 'Team Member',
    icon:  '👤',
    color: '#f59e0b',
    perms: ['Permissions defined by your host'],
  },
}

// ── Password strength ────────────────────────────────────────────────────────
function pwStrength(v) {
  if (!v) return 0
  if (v.length < 6) return 1
  if (v.length < 10 || !/\d/.test(v)) return 2
  return 3
}
function strengthLabel(s) {
  return ['', 'Too short', 'Getting stronger', 'Strong ✓'][s]
}
function strengthColor(s) {
  return ['#3a3028', s === 3 ? '#16a34a' : '#d97706', s === 3 ? '#16a34a' : '#d97706', '#16a34a'][s]
}

// ── Views handled in the right panel ─────────────────────────────────────────
// loading | error | choose | create | signin | accepting | done | mismatch

function JoinInner() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const token        = searchParams.get('token')

  const [invite,    setInvite]    = useState(null)          // invite details from API
  const [sessionUser, setSessionUser] = useState(undefined) // undefined=loading, null=anon
  const [view,      setView]      = useState('loading')
  const [apiErr,    setApiErr]    = useState('')

  // Create-account form
  const [name,      setName]      = useState('')
  const [newPw,     setNewPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [formErr,   setFormErr]   = useState('')
  const [busy,      setBusy]      = useState(false)

  // Sign-in form
  const [siEmail,   setSiEmail]   = useState('')
  const [siPw,      setSiPw]      = useState('')
  const [showSiPw,  setShowSiPw]  = useState(false)
  const [siErr,     setSiErr]     = useState('')
  const [siBusy,    setSiBusy]    = useState(false)

  // ── Bootstrap: check session + validate token ──────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user || null
      setSessionUser(u)
      if (u?.user_metadata?.full_name) setName(u.user_metadata.full_name)
    })
  }, [])

  useEffect(() => {
    if (!token) { setView('error'); setApiErr('Missing invite token.'); return }
    fetch(`/api/host/team/accept?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) {
          setInvite(d)
          setSiEmail(d.invite_email || '')
          // sessionUser may still be undefined at this point — resolve after both load
        } else {
          setApiErr(d.error || 'Invalid invite link.')
          setView('error')
        }
      })
      .catch(() => { setApiErr('Could not validate invite. Please try again.'); setView('error') })
  }, [token])

  // When both invite + sessionUser are resolved, pick the right view
  useEffect(() => {
    if (!invite || sessionUser === undefined) return
    if (sessionUser === null) {
      setView('choose')
    } else {
      // Logged in — email match will be validated server-side on accept
      setView('loggedin')
    }
  }, [invite, sessionUser])

  // ── Accept for logged-in user ──────────────────────────────────────────────
  async function handleAccept() {
    setView('accepting')
    setApiErr('')
    const res  = await fetch('/api/host/team/accept', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
    const data = await res.json()
    if (data.success) {
      setView('done')
      setTimeout(() => router.push('/host/dashboard?nav=team'), 2400)
    } else if (res.status === 403) {
      setView('mismatch')
      setApiErr(data.error)
    } else {
      setApiErr(data.error || 'Failed to accept invite.')
      setView('loggedin')
    }
  }

  // ── Create brand-new team account ─────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault()
    setFormErr('')
    if (!name.trim())            return setFormErr('Please enter your full name.')
    if (newPw.length < 8)        return setFormErr('Password must be at least 8 characters.')
    if (newPw !== confirmPw)     return setFormErr('Passwords do not match.')
    setBusy(true)
    try {
      const res  = await fetch('/api/host/team/accept', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, action: 'create_and_accept', full_name: name.trim(), password: newPw }),
      })
      const data = await res.json()
      if (!data.success) { setFormErr(data.error || 'Could not create account.'); return }

      // Sign in client-side after server created the account
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: invite.invite_email,
        password: newPw,
      })
      if (signInErr) {
        // Account exists but session failed — send to login with return URL
        router.push(`/login?next=${encodeURIComponent(`/team/join?token=${token}`)}`)
        return
      }
      setView('done')
      setTimeout(() => router.push('/host/dashboard?nav=team'), 2400)
    } finally {
      setBusy(false)
    }
  }

  // ── Inline sign-in then auto-accept ───────────────────────────────────────
  async function handleSignIn(e) {
    e.preventDefault()
    setSiErr('')
    setSiBusy(true)
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPw })
      if (authErr) { setSiErr(authErr.message); return }

      // Check suspended
      if (data?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('suspended_at, is_active')
          .eq('id', data.user.id)
          .maybeSingle()
        if (profile?.suspended_at || profile?.is_active === false) {
          await supabase.auth.signOut()
          setSiErr('Your account is suspended. Contact support@snapreserve.app.')
          return
        }
      }

      setSessionUser(data.user)
      setView('accepting')
      // Now accept
      const res  = await fetch('/api/host/team/accept', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token }),
      })
      const result = await res.json()
      if (result.success) {
        setView('done')
        setTimeout(() => router.push('/host/dashboard?nav=team'), 2400)
      } else if (res.status === 403) {
        setView('mismatch')
        setApiErr(result.error)
      } else {
        setSiErr(result.error || 'Accept failed. Please try again.')
        setView('signin')
      }
    } finally {
      setSiBusy(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const meta       = invite ? (ROLE_META[invite.role] || ROLE_META.custom) : null
  const expiryDate = invite?.expires_at
    ? new Date(invite.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  const strength   = pwStrength(newPw)

  const showLeft = view !== 'loading'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box}
        html,body{height:100%;overflow:hidden}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .tj-right::-webkit-scrollbar{width:0}
        .tj-fi{width:100%;padding:11px 13px;background:var(--sr-card);border:1.5px solid var(--sr-border-solid,#e2dbd2);border-radius:10px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--sr-text);outline:none;transition:all .18s}
        .tj-fi:focus{border-color:#e8622a;box-shadow:0 0 0 3px rgba(232,98,42,.12)}
        .tj-fi::placeholder{color:var(--sr-sub)}
        .tj-fi:read-only{opacity:.55;cursor:default}
        .tj-cta{width:100%;padding:13px;border-radius:10px;background:#e8622a;border:none;color:white;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .2s;margin-top:4px}
        .tj-cta:hover:not(:disabled){opacity:.88;transform:translateY(-1px);box-shadow:0 6px 20px rgba(232,98,42,.35)}
        .tj-cta:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none}
        .tj-cta-ghost{width:100%;padding:12px;border-radius:10px;background:transparent;border:1.5px solid var(--sr-border-solid,#e2dbd2);color:var(--sr-muted);font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .18s;margin-top:10px}
        .tj-cta-ghost:hover{border-color:var(--sr-text);color:var(--sr-text)}
        .tj-back{display:flex;align-items:center;gap:5px;background:none;border:none;color:var(--sr-muted);font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;padding:0;margin-bottom:20px;transition:color .14s}
        .tj-back:hover{color:var(--sr-text)}
        .tj-label{display:block;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--sr-muted);margin-bottom:5px}
        .tj-field{margin-bottom:13px}
        .tj-pw-wrap{position:relative}
        .tj-pw-eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--sr-sub);font-size:12px;padding:2px;font-family:inherit;font-weight:600;line-height:1}
        .tj-err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.22);border-radius:10px;padding:11px 14px;font-size:12px;color:#ef4444;margin-bottom:14px;line-height:1.55}
        .tj-success{background:rgba(22,163,74,.06);border:1px solid rgba(22,163,74,.22);border-radius:10px;padding:12px 14px;font-size:13px;color:#16a34a}
        .tj-divider{display:flex;align-items:center;gap:12px;margin:18px 0}
        .tj-divider-line{flex:1;height:1px;background:var(--sr-border-solid,#e0d8ce)}
        .tj-divider-text{font-size:10px;font-weight:600;color:var(--sr-sub);white-space:nowrap}
        .tj-anim{animation:fadeUp .32s ease both}
        .tj-spinner{width:20px;height:20px;border:2px solid rgba(255,255,255,.25);border-top-color:white;border-radius:50%;animation:spin .7s linear infinite}
      `}</style>

      <div style={{ display:'grid', gridTemplateColumns:'42% 1fr', height:'100vh', overflow:'hidden', fontFamily:"'DM Sans',sans-serif" }}>

        {/* ══ LEFT PANEL — invite hero ══════════════════════════════════════ */}
        <div style={{ background:'#0f0e0c', position:'relative', overflow:'hidden', display:'flex', flexDirection:'column', padding:'36px 44px' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 60% at 30% 40%, rgba(232,98,42,.16) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 80% 80%, rgba(232,98,42,.07) 0%, transparent 55%)', pointerEvents:'none' }} />

          {/* Logo */}
          <a href="/home" style={{ textDecoration:'none', position:'relative', zIndex:1 }}>
            <span style={{ fontSize:17, fontWeight:700, color:'white' }}>
              Snap<span style={{ color:'#e8622a' }}>Reserve</span>
              <sup style={{ fontSize:8, color:'rgba(255,255,255,.3)', verticalAlign:'super', marginLeft:1 }}>™</sup>
            </span>
          </a>

          {/* Hero content — pushed to bottom */}
          <div style={{ position:'relative', zIndex:1, marginTop:'auto', paddingTop:40, animation: showLeft ? 'fadeUp .4s ease both' : 'none' }}>

            {/* Loading skeleton */}
            {!invite && view !== 'error' && (
              <div style={{ opacity:.4 }}>
                <div style={{ height:12, background:'rgba(255,255,255,.08)', borderRadius:6, width:100, marginBottom:24 }} />
                <div style={{ height:32, background:'rgba(255,255,255,.06)', borderRadius:8, width:'80%', marginBottom:10 }} />
                <div style={{ height:32, background:'rgba(255,255,255,.04)', borderRadius:8, width:'60%', marginBottom:28 }} />
                <div style={{ height:10, background:'rgba(255,255,255,.05)', borderRadius:6, width:'90%', marginBottom:8 }} />
                <div style={{ height:10, background:'rgba(255,255,255,.05)', borderRadius:6, width:'75%' }} />
              </div>
            )}

            {/* Error state — minimal hero */}
            {view === 'error' && (
              <>
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', border:'1px solid rgba(239,68,68,.35)', borderRadius:100, fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#ef4444', marginBottom:22, background:'rgba(239,68,68,.06)' }}>
                  Invite Unavailable
                </div>
                <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(24px,2.6vw,36px)', fontWeight:900, lineHeight:1.08, color:'white', marginBottom:12 }}>
                  This invite<br />link has an<br /><em style={{ color:'#e8622a', fontStyle:'italic' }}>issue.</em>
                </h1>
                <p style={{ fontSize:13, color:'rgba(255,255,255,.38)', lineHeight:1.75, maxWidth:280 }}>
                  It may have expired or already been used. Ask your host to resend a fresh invite link.
                </p>
              </>
            )}

            {/* Valid invite hero */}
            {invite && (
              <>
                {/* Host identity */}
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:26, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'13px 16px' }}>
                  {invite.host_avatar_url ? (
                    <img src={invite.host_avatar_url} alt="" style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                  ) : (
                    <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(232,98,42,.15)', border:'1.5px solid rgba(232,98,42,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>🏡</div>
                  )}
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'white', lineHeight:1.2 }}>{invite.org_name}</div>
                    {invite.host_owner_name && (
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.32)', marginTop:2 }}>by {invite.host_owner_name}</div>
                    )}
                  </div>
                </div>

                {/* Headline */}
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 11px', border:`1px solid ${meta?.color || '#e8622a'}55`, borderRadius:100, fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color: meta?.color || '#e8622a', marginBottom:16, background:`${meta?.color || '#e8622a'}10` }}>
                  {meta?.icon} {meta?.label} Invite
                </div>

                <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(24px,2.6vw,36px)', fontWeight:900, lineHeight:1.08, color:'white', marginBottom:12 }}>
                  You're invited<br />to join the<br /><em style={{ color:'#e8622a', fontStyle:'italic' }}>team.</em>
                </h1>

                {/* Properties */}
                <div style={{ marginBottom:22 }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color:'rgba(255,255,255,.22)', marginBottom:9 }}>Properties</div>
                  {invite.all_properties ? (
                    <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'rgba(255,255,255,.45)' }}>
                      <div style={{ width:5, height:5, borderRadius:'50%', background:'#34d399', flexShrink:0 }} />
                      All properties (current &amp; future)
                    </div>
                  ) : invite.assigned_listings?.length > 0 ? (
                    invite.assigned_listings.map(l => (
                      <div key={l.id} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'rgba(255,255,255,.45)', marginBottom:5 }}>
                        <div style={{ width:5, height:5, borderRadius:'50%', background:'#e8622a', flexShrink:0, opacity:.7 }} />
                        {l.title}{l.city ? ` · ${l.city}` : ''}
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize:12, color:'rgba(255,255,255,.28)' }}>No specific properties assigned.</div>
                  )}
                </div>

                {/* Permissions */}
                {invite.permissions?.length > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                    {invite.permissions.map(p => (
                      <div key={p} style={{ display:'flex', alignItems:'center', gap:9, fontSize:12, color:'rgba(255,255,255,.45)' }}>
                        <div style={{ width:16, height:16, borderRadius:'50%', background:'rgba(232,98,42,.14)', border:'1px solid rgba(232,98,42,.28)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:7, color:'#e8622a' }}>✓</div>
                        {p}
                      </div>
                    ))}
                  </div>
                )}

                {expiryDate && (
                  <div style={{ marginTop:24, fontSize:10, color:'rgba(255,255,255,.2)', letterSpacing:'.04em' }}>
                    Expires {expiryDate}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ══ RIGHT PANEL — form ════════════════════════════════════════════ */}
        <div className="tj-right" style={{ background:'var(--sr-bg)', overflowY:'auto', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 24px' }}>
          <div style={{ width:'100%', maxWidth:430, padding:'16px 0' }}>

            {/* ── Loading ── */}
            {(view === 'loading') && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:320, gap:14 }}>
                <div style={{ width:28, height:28, border:'2.5px solid var(--sr-border-solid,#e2dbd2)', borderTopColor:'#e8622a', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
                <span style={{ fontSize:13, color:'var(--sr-muted)' }}>Validating invite…</span>
              </div>
            )}

            {/* ── Error ── */}
            {view === 'error' && (
              <div className="tj-anim" style={{ paddingTop:40 }}>
                <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(239,68,68,.08)', border:'1.5px solid rgba(239,68,68,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:20 }}>
                  ⛔
                </div>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:900, color:'var(--sr-text)', marginBottom:8, lineHeight:1.1 }}>
                  Invite<br /><em style={{ color:'#e8622a', fontStyle:'italic' }}>unavailable.</em>
                </h2>
                <p style={{ fontSize:13, color:'var(--sr-muted)', marginBottom:28, lineHeight:1.7 }}>{apiErr}</p>
                <div style={{ background:'var(--sr-card)', border:'1px solid var(--sr-border-solid,#e2dbd2)', borderRadius:12, padding:'16px 18px', marginBottom:28, fontSize:13, color:'var(--sr-muted)', lineHeight:1.7 }}>
                  <strong style={{ color:'var(--sr-text)', display:'block', marginBottom:4 }}>What to do next</strong>
                  Ask the host who invited you to open their team dashboard and click <strong>↺ Resend Email</strong> or <strong>🔗 Copy Link</strong> next to your pending invite. Each link expires after 7 days.
                </div>
                <a href="/home">
                  <button className="tj-cta">Back to SnapReserve™</button>
                </a>
              </div>
            )}

            {/* ── Choose: new user — create or sign in ── */}
            {view === 'choose' && invite && (
              <div className="tj-anim">
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:25, fontWeight:900, color:'var(--sr-text)', marginBottom:6, lineHeight:1.1 }}>
                  Join{' '}
                  <em style={{ color:'#e8622a', fontStyle:'italic' }}>
                    {invite.org_name?.split(' ')[0] || 'the team'}.
                  </em>
                </h2>
                <p style={{ fontSize:13, color:'var(--sr-muted)', marginBottom:28, lineHeight:1.65 }}>
                  You've been invited as a <strong style={{ color:'var(--sr-text)' }}>{meta?.label}</strong>. Choose how to join.
                </p>

                <button className="tj-cta" onClick={() => setView('create')}>
                  Create team account →
                </button>

                <div className="tj-divider">
                  <div className="tj-divider-line" />
                  <span className="tj-divider-text">already have an account?</span>
                  <div className="tj-divider-line" />
                </div>

                <button className="tj-cta-ghost" style={{ marginTop:0 }} onClick={() => setView('signin')}>
                  Sign in to accept
                </button>

                <p style={{ fontSize:11, color:'var(--sr-sub)', textAlign:'center', marginTop:22, lineHeight:1.65 }}>
                  This is a <strong>team account</strong> for {invite.org_name} only — no guest booking access.{' '}
                  <a href="/signup" style={{ color:'#e8622a', textDecoration:'none', fontWeight:600 }}>Create a personal account</a>{' '}
                  to book stays as a traveler.
                </p>
              </div>
            )}

            {/* ── Create account form ── */}
            {view === 'create' && invite && (
              <div className="tj-anim">
                <button className="tj-back" onClick={() => { setView('choose'); setFormErr('') }}>← Back</button>

                {/* Progress */}
                <div style={{ height:3, background:'var(--sr-border-solid,#e0d8ce)', borderRadius:100, marginBottom:22, overflow:'hidden' }}>
                  <div style={{ height:'100%', background:'#e8622a', borderRadius:100, width:'50%' }} />
                </div>

                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:900, color:'var(--sr-text)', marginBottom:5, lineHeight:1.1 }}>
                  Create your<br /><em style={{ color:'#e8622a', fontStyle:'italic' }}>team account.</em>
                </h2>
                <p style={{ fontSize:13, color:'var(--sr-muted)', marginBottom:22, lineHeight:1.65 }}>
                  Your account will only have access to the {invite.org_name} team workspace.
                </p>

                {formErr && <div className="tj-err">{formErr}</div>}

                <form onSubmit={handleCreate}>
                  {/* Email — locked */}
                  <div className="tj-field">
                    <label className="tj-label">Email address</label>
                    <input className="tj-fi" type="email" value={invite.invite_email || ''} readOnly />
                  </div>

                  {/* Full name */}
                  <div className="tj-field">
                    <label className="tj-label">Full name <span style={{ color:'#e8622a' }}>*</span></label>
                    <input
                      className="tj-fi"
                      type="text"
                      placeholder="Your full name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  {/* Password */}
                  <div className="tj-field">
                    <label className="tj-label">Password <span style={{ color:'#e8622a' }}>*</span></label>
                    <div className="tj-pw-wrap">
                      <input
                        className="tj-fi"
                        type={showPw ? 'text' : 'password'}
                        placeholder="Min. 8 characters"
                        value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        required
                        minLength={8}
                        style={{ paddingRight:46 }}
                      />
                      <button type="button" className="tj-pw-eye" onClick={() => setShowPw(p => !p)}>
                        {showPw ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {newPw.length > 0 && (
                      <>
                        <div style={{ display:'flex', gap:4, marginTop:5 }}>
                          {[0,1,2].map(i => (
                            <div key={i} style={{ flex:1, height:3, borderRadius:100, background: i < strength ? strengthColor(strength) : 'var(--sr-border-solid,#e0d8ce)', transition:'background .3s' }} />
                          ))}
                        </div>
                        <div style={{ fontSize:10, color:'var(--sr-sub)', marginTop:4 }}>{strengthLabel(strength)}</div>
                      </>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="tj-field">
                    <label className="tj-label">Confirm password <span style={{ color:'#e8622a' }}>*</span></label>
                    <input
                      className="tj-fi"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      required
                    />
                    {confirmPw && confirmPw !== newPw && (
                      <div style={{ fontSize:10, color:'#ef4444', marginTop:4 }}>Passwords don't match</div>
                    )}
                  </div>

                  <button type="submit" className="tj-cta" disabled={busy} style={{ marginTop:6 }}>
                    {busy ? <><div className="tj-spinner" />Creating account…</> : <>Join team <span>→</span></>}
                  </button>
                </form>

                <div className="tj-divider">
                  <div className="tj-divider-line" />
                  <span className="tj-divider-text">already have an account?</span>
                  <div className="tj-divider-line" />
                </div>
                <button className="tj-cta-ghost" style={{ marginTop:0 }} onClick={() => { setView('signin'); setFormErr('') }}>
                  Sign in instead
                </button>
              </div>
            )}

            {/* ── Inline sign-in form ── */}
            {view === 'signin' && invite && (
              <div className="tj-anim">
                <button className="tj-back" onClick={() => { setView('choose'); setSiErr('') }}>← Back</button>

                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:900, color:'var(--sr-text)', marginBottom:5, lineHeight:1.1 }}>
                  Sign in to<br /><em style={{ color:'#e8622a', fontStyle:'italic' }}>accept.</em>
                </h2>
                <p style={{ fontSize:13, color:'var(--sr-muted)', marginBottom:22, lineHeight:1.65 }}>
                  Sign in with the account that matches <strong style={{ color:'var(--sr-text)' }}>{invite.invite_email}</strong>.
                </p>

                {siErr && <div className="tj-err">{siErr}</div>}

                <form onSubmit={handleSignIn}>
                  <div className="tj-field">
                    <label className="tj-label">Email address</label>
                    <input
                      className="tj-fi"
                      type="email"
                      value={siEmail}
                      onChange={e => setSiEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="tj-field">
                    <label className="tj-label">Password <span style={{ color:'#e8622a' }}>*</span></label>
                    <div className="tj-pw-wrap">
                      <input
                        className="tj-fi"
                        type={showSiPw ? 'text' : 'password'}
                        placeholder="Your password"
                        value={siPw}
                        onChange={e => setSiPw(e.target.value)}
                        required
                        autoFocus
                        style={{ paddingRight:46 }}
                      />
                      <button type="button" className="tj-pw-eye" onClick={() => setShowSiPw(p => !p)}>
                        {showSiPw ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="tj-cta" disabled={siBusy} style={{ marginTop:6 }}>
                    {siBusy ? <><div className="tj-spinner" />Signing in…</> : <>Sign in &amp; accept <span>→</span></>}
                  </button>
                </form>

                <div className="tj-divider">
                  <div className="tj-divider-line" />
                  <span className="tj-divider-text">new to SnapReserve?</span>
                  <div className="tj-divider-line" />
                </div>
                <button className="tj-cta-ghost" style={{ marginTop:0 }} onClick={() => { setView('create'); setSiErr('') }}>
                  Create a team account instead
                </button>
              </div>
            )}

            {/* ── Logged-in: accept button ── */}
            {view === 'loggedin' && invite && (
              <div className="tj-anim">
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:900, color:'var(--sr-text)', marginBottom:5, lineHeight:1.1 }}>
                  Accept your<br /><em style={{ color:'#e8622a', fontStyle:'italic' }}>invite.</em>
                </h2>
                <p style={{ fontSize:13, color:'var(--sr-muted)', marginBottom:28, lineHeight:1.65 }}>
                  You're signed in as <strong style={{ color:'var(--sr-text)' }}>{sessionUser?.email}</strong>.
                  {invite.invite_email && sessionUser?.email?.toLowerCase() !== invite.invite_email?.toLowerCase() && (
                    <span style={{ display:'block', marginTop:6, color:'#f59e0b' }}>
                      ⚠ This invite was sent to <strong>{invite.invite_email}</strong>. Make sure you're using the right account.
                    </span>
                  )}
                </p>

                {apiErr && <div className="tj-err">{apiErr}</div>}

                <button className="tj-cta" onClick={handleAccept}>
                  Accept invite &amp; join team →
                </button>

                <div style={{ marginTop:14, textAlign:'center', fontSize:11, color:'var(--sr-sub)' }}>
                  Not your account?{' '}
                  <button
                    onClick={async () => { await supabase.auth.signOut(); setSessionUser(null); setView('choose') }}
                    style={{ background:'none', border:'none', color:'#e8622a', fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:11, padding:0 }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}

            {/* ── Email mismatch ── */}
            {view === 'mismatch' && (
              <div className="tj-anim">
                <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(245,158,11,.08)', border:'1.5px solid rgba(245,158,11,.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:20 }}>
                  ⚠️
                </div>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:900, color:'var(--sr-text)', marginBottom:8, lineHeight:1.1 }}>
                  Wrong<br /><em style={{ color:'#e8622a', fontStyle:'italic' }}>account.</em>
                </h2>
                <p style={{ fontSize:13, color:'var(--sr-muted)', marginBottom:24, lineHeight:1.7 }}>{apiErr}</p>
                <button
                  className="tj-cta"
                  onClick={async () => { await supabase.auth.signOut(); setSessionUser(null); setView('signin'); setSiErr('') }}
                >
                  Sign in with the right account
                </button>
                <button
                  className="tj-cta-ghost"
                  onClick={() => { setView('create'); setFormErr('') }}
                >
                  Create a new team account
                </button>
              </div>
            )}

            {/* ── Accepting spinner ── */}
            {view === 'accepting' && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:320, gap:14 }}>
                <div style={{ width:28, height:28, border:'2.5px solid var(--sr-border-solid,#e2dbd2)', borderTopColor:'#e8622a', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
                <span style={{ fontSize:13, color:'var(--sr-muted)' }}>Accepting invite…</span>
              </div>
            )}

            {/* ── Done ── */}
            {view === 'done' && (
              <div className="tj-anim" style={{ textAlign:'center', paddingTop:20 }}>
                <div style={{ width:72, height:72, borderRadius:'50%', margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, background:'rgba(232,98,42,.1)', border:'2px solid rgba(232,98,42,.25)', animation:'popIn .45s cubic-bezier(.175,.885,.32,1.275) both' }}>
                  🎉
                </div>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:900, color:'var(--sr-text)', marginBottom:8, lineHeight:1.1 }}>
                  Welcome to<br /><em style={{ color:'#e8622a', fontStyle:'italic' }}>the team!</em>
                </h2>
                <p style={{ fontSize:13, color:'var(--sr-muted)', lineHeight:1.75, maxWidth:320, margin:'0 auto 28px' }}>
                  You're now a <strong style={{ color:'var(--sr-text)' }}>{meta?.label}</strong> at <strong style={{ color:'var(--sr-text)' }}>{invite?.org_name}</strong>.
                  Taking you to your team workspace…
                </p>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontSize:12, color:'var(--sr-sub)' }}>
                  <div style={{ width:14, height:14, border:'2px solid var(--sr-border-solid,#e2dbd2)', borderTopColor:'#e8622a', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
                  Redirecting…
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', background:'#0f0e0c', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:28, height:28, border:'2.5px solid rgba(255,255,255,.15)', borderTopColor:'#e8622a', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      </div>
    }>
      <JoinInner />
    </Suspense>
  )
}
