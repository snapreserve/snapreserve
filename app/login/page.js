'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const next         = searchParams.get('next') || ''

  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [showPw,        setShowPw]        = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [resetMode,     setResetMode]     = useState(false)
  const [resetSent,     setResetSent]     = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'account_suspended') {
      setError('Your account has been suspended. Contact support@snapreserve.app to appeal.')
    } else if (err === 'no_admin_role') {
      setError('This account does not have access to the admin portal. If you should have access, ask a super admin to add your role in Super Admin → Roles.')
    } else if (err === 'oauth_failed') {
      setError('Sign-in with Google failed. Try again or use email and password.')
    } else if (err === 'account_deactivated') {
      setError('Your account has been deactivated. Contact support@snapreserve.app.')
    }
  }, [searchParams])

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    // Use current origin so OAuth always redirects back to this site (prod vs staging).
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const callbackUrl = next
      ? `${origin || process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback?next=${encodeURIComponent(next)}`
      : `${origin || process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    })
  }

  async function handleReset(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin || process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback?next=/account`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setResetSent(true)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }

    // Block suspended accounts + route team members to host portal
    if (data?.user) {
      const { data: userRow } = await supabase
        .from('users')
        .select('suspended_at, is_active, is_team_member')
        .eq('id', data.user.id)
        .maybeSingle()

      if (userRow?.suspended_at || userRow?.is_active === false) {
        await supabase.auth.signOut()
        setError('Your account has been suspended. Please check your email or contact support@snapreserve.app to appeal.')
        setLoading(false)
        return
      }

      // Team members only have access to the host portal
      if (userRow?.is_team_member) {
        router.push('/host/dashboard')
        router.refresh()
        return
      }
    }

    router.push(next || '/dashboard')
    router.refresh()
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after { box-sizing: border-box; }
        html, body { height: 100%; overflow: hidden; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        .sr-fi { width:100%; padding:11px 13px; background:var(--sr-card); border:1.5px solid var(--sr-border-solid,#e2dbd2); border-radius:10px; font-family:'DM Sans',sans-serif; font-size:13px; color:var(--sr-text); outline:none; transition:all .18s; }
        .sr-fi:focus { border-color:var(--sr-orange); box-shadow:0 0 0 3px var(--sr-ol); }
        .sr-fi::placeholder { color:var(--sr-sub); }
        .sr-cta { width:100%; padding:13px; border-radius:10px; background:var(--sr-orange); border:none; color:white; font-family:'DM Sans',sans-serif; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px; transition:all .2s; margin-top:4px; }
        .sr-cta:hover:not(:disabled) { opacity:.88; transform:translateY(-1px); box-shadow:0 6px 20px var(--sr-ob,rgba(244,96,26,.35)); }
        .sr-cta:disabled { opacity:0.6; cursor:not-allowed; }
        .sr-google { width:100%; padding:12px; background:var(--sr-card); border:1.5px solid var(--sr-border-solid,#e2dbd2); border-radius:10px; display:flex; align-items:center; justify-content:center; gap:9px; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:600; color:var(--sr-text); cursor:pointer; transition:all .18s; margin-bottom:16px; }
        .sr-google:hover { border-color:var(--sr-border2); box-shadow:0 2px 8px rgba(0,0,0,.07); }
        .sr-google:disabled { opacity:0.6; cursor:not-allowed; }
        .sr-back { display:flex; align-items:center; gap:5px; background:none; border:none; color:var(--sr-muted); font-family:'DM Sans',sans-serif; font-size:12px; font-weight:600; cursor:pointer; padding:0; margin-bottom:18px; transition:color .14s; }
        .sr-back:hover { color:var(--sr-text); }
        .sr-right::-webkit-scrollbar { width:0; }
        .sr-anim { animation: fadeUp .36s ease both; }
        .sr-pw-wrap { position:relative; }
        .sr-pw-eye { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:var(--sr-sub); font-size:14px; padding:0; line-height:1; font-family:inherit; }
      `}</style>

      <div style={{ display:'grid', gridTemplateColumns:'42% 1fr', height:'100vh', overflow:'hidden', fontFamily:"'DM Sans',sans-serif" }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ background:'#0f0e0c', position:'relative', overflow:'hidden', display:'flex', flexDirection:'column', padding:'36px 44px' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 60% at 30% 40%, rgba(232,98,42,.18) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 80% 80%, rgba(232,98,42,.08) 0%, transparent 55%)', pointerEvents:'none' }} />

          {/* Brand */}
          <div style={{ fontSize:17, fontWeight:700, color:'white', position:'relative', zIndex:1 }}>
            Snap<span style={{ color:'#e8622a' }}>Reserve</span><sup style={{ fontSize:8, color:'rgba(255,255,255,.3)', verticalAlign:'super', marginLeft:1 }}>™</sup>
          </div>

          {/* Hero */}
          <div style={{ position:'relative', zIndex:1, marginTop:'auto', paddingTop:50, animation:'fadeUp .4s ease both' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', border:'1px solid rgba(232,98,42,.35)', borderRadius:100, fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#e8622a', marginBottom:22, background:'rgba(232,98,42,.06)' }}>
              Now live in the US
            </div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(26px,3vw,40px)', fontWeight:900, lineHeight:1.05, color:'white', marginBottom:8 }}>
              The future of<br />travel booking<br /><em style={{ color:'#e8622a', fontStyle:'italic', display:'block' }}>is here.</em>
            </h1>
            <p style={{ fontSize:13, color:'rgba(255,255,255,.42)', lineHeight:1.75, maxWidth:300, marginBottom:28 }}>
              Hotels, private stays, and experiences — all in one place with transparent, low platform fees.
            </p>

            {/* Stats — 4.9★ removed per product direction */}
            <div style={{ display:'flex', gap:24, marginBottom:36 }}>
              {[['180K+','Hosts worldwide'],['90+','Cities']].map(([val, label]) => (
                <div key={label}>
                  <div style={{ fontSize:17, fontWeight:700, color:'#e8622a', marginBottom:1 }}>{val}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.32)', fontWeight:500 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Feature bullets */}
            <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
              {[
                'Your bookings and listings, always at hand',
                'Host dashboard, earnings, and calendar',
                'Transparent fees — no hidden surprises',
              ].map(t => (
                <div key={t} style={{ display:'flex', alignItems:'center', gap:9, fontSize:12, color:'rgba(255,255,255,.48)' }}>
                  <div style={{ width:17, height:17, borderRadius:'50%', background:'rgba(232,98,42,.14)', border:'1px solid rgba(232,98,42,.28)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:8, color:'#e8622a' }}>✓</div>
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="sr-right" style={{ background:'var(--sr-bg)', overflowY:'auto', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 24px' }}>
          <div style={{ width:'100%', maxWidth:430, padding:'16px 0' }}>

            {!resetMode ? (
              <div className="sr-anim">
                {/* Auth tab switcher */}
                <div style={{ display:'flex', background:'var(--sr-surface)', borderRadius:100, padding:4, marginBottom:26 }}>
                  <div style={{ flex:1, padding:9, borderRadius:100, textAlign:'center', fontSize:13, fontWeight:600, background:'var(--sr-card)', color:'var(--sr-text)', boxShadow:'0 2px 8px rgba(0,0,0,.07)' }}>
                    Log in
                  </div>
                  <a href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'} style={{ flex:1, padding:9, borderRadius:100, textAlign:'center', fontSize:13, fontWeight:600, color:'var(--sr-muted)', textDecoration:'none' }}>
                    Sign up
                  </a>
                </div>

                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:25, fontWeight:900, color:'var(--sr-text)', marginBottom:5, lineHeight:1.1 }}>
                  Welcome<br /><em style={{ color:'#e8622a', fontStyle:'italic' }}>back.</em>
                </h2>
                <p style={{ fontSize:13, color:'var(--sr-muted)', marginBottom:22, lineHeight:1.65 }}>
                  Sign in to manage your bookings and listings.
                </p>
                {next && (next.startsWith('/admin') || next.startsWith('/superadmin')) && (
                  <p style={{ fontSize:12, color:'var(--sr-orange)', marginBottom:16, lineHeight:1.5, padding:'10px 12px', background:'rgba(244,96,26,0.08)', borderRadius:8, border:'1px solid rgba(244,96,26,0.2)' }}>
                    Admin access: after signing in you’ll need to enter your authenticator (MFA) code. Your account must have an admin role assigned.
                  </p>
                )}

                {error && (
                  <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, padding:'12px 14px', fontSize:12, color:'#ef4444', marginBottom:14 }}>
                    {error}
                  </div>
                )}

                {/* Google */}
                <button className="sr-google" onClick={handleGoogleSignIn} disabled={googleLoading} type="button">
                  <svg width="17" height="17" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.6 0 6.6 5.6 2.8 13.7l7.8 6C12.5 13.5 17.8 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17z"/>
                    <path fill="#FBBC05" d="M10.6 28.3A14.5 14.5 0 0 1 9.5 24c0-1.5.3-3 .7-4.3L2.4 13.7A24 24 0 0 0 0 24c0 3.9.9 7.5 2.4 10.8l8.2-6.5z"/>
                    <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.7 2.3-7.7 2.3-6.2 0-11.5-4.2-13.4-9.8l-7.8 5.8C6.4 42.2 14.6 48 24 48z"/>
                  </svg>
                  {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                </button>

                {/* Divider */}
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                  <div style={{ flex:1, height:1, background:'var(--sr-border-solid,#e0d8ce)' }} />
                  <span style={{ fontSize:10, fontWeight:600, color:'var(--sr-sub)', whiteSpace:'nowrap' }}>or sign in with email</span>
                  <div style={{ flex:1, height:1, background:'var(--sr-border-solid,#e0d8ce)' }} />
                </div>

                {/* Email + password form */}
                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom:13 }}>
                    <label style={{ display:'block', fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--sr-muted)', marginBottom:5 }}>
                      Email address <span style={{ color:'var(--sr-orange)' }}>*</span>
                    </label>
                    <input
                      className="sr-fi"
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                      <label style={{ display:'block', fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--sr-muted)' }}>
                        Password <span style={{ color:'var(--sr-orange)' }}>*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => { setResetMode(true); setError('') }}
                        style={{ background:'none', border:'none', fontSize:11, color:'var(--sr-orange)', fontWeight:600, cursor:'pointer', fontFamily:'inherit', padding:0 }}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="sr-pw-wrap">
                      <input
                        className="sr-fi"
                        type={showPw ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{ paddingRight:40 }}
                      />
                      <button className="sr-pw-eye" type="button" onClick={() => setShowPw(p => !p)}>
                        👁
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="sr-cta" disabled={loading} style={{ marginTop:18 }}>
                    {loading ? 'Signing in…' : <>Log in <span>→</span></>}
                  </button>
                </form>

                <p style={{ fontSize:12, color:'var(--sr-muted)', textAlign:'center', marginTop:16 }}>
                  Don't have an account?{' '}
                  <a href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'} style={{ color:'var(--sr-orange)', fontWeight:700, textDecoration:'none' }}>
                    Sign up free →
                  </a>
                </p>
              </div>
            ) : (
              /* ── Reset password mode ── */
              <div className="sr-anim">
                <button className="sr-back" onClick={() => { setResetMode(false); setResetSent(false); setError('') }}>
                  ← Back to sign in
                </button>

                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:25, fontWeight:900, color:'var(--sr-text)', marginBottom:5, lineHeight:1.1 }}>
                  Reset your<br /><em style={{ color:'#e8622a', fontStyle:'italic' }}>password.</em>
                </h2>
                <p style={{ fontSize:13, color:'var(--sr-muted)', marginBottom:22, lineHeight:1.65 }}>
                  Enter your email and we'll send a secure reset link.
                </p>

                {resetSent ? (
                  <div style={{ background:'rgba(22,163,74,.06)', border:'1px solid rgba(22,163,74,.2)', borderRadius:10, padding:'14px 16px', fontSize:13, color:'#16A34A' }}>
                    ✓ Reset link sent — check your inbox.
                  </div>
                ) : (
                  <>
                    {error && (
                      <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, padding:'12px 14px', fontSize:12, color:'#ef4444', marginBottom:14 }}>
                        {error}
                      </div>
                    )}
                    <form onSubmit={handleReset}>
                      <div style={{ marginBottom:13 }}>
                        <label style={{ display:'block', fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--sr-muted)', marginBottom:5 }}>
                          Email address <span style={{ color:'var(--sr-orange)' }}>*</span>
                        </label>
                        <input
                          className="sr-fi"
                          type="email"
                          required
                          placeholder="your@email.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                        />
                      </div>
                      <button type="submit" className="sr-cta" disabled={loading}>
                        {loading ? 'Sending…' : <>Send reset link <span>→</span></>}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:'#0f0e0c' }} />}>
      <LoginInner />
    </Suspense>
  )
}
