'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('error') === 'account_suspended') {
      setError('Your account has been suspended. Contact support@snapreserve.app to appeal.')
    }
  }, [searchParams])

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleReset(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/account`,
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

    // Check if account is suspended
    if (data?.user) {
      const { data: userRow } = await supabase
        .from('users')
        .select('suspended_at, is_active')
        .eq('id', data.user.id)
        .maybeSingle()

      if (userRow?.suspended_at || userRow?.is_active === false) {
        await supabase.auth.signOut()
        setError('Your account has been suspended. Please check your email or contact support@snapreserve.app to appeal.')
        setLoading(false)
        return
      }
    }

    const next = searchParams.get('next') || '/dashboard'
    router.push(next)
    router.refresh()
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; }
        input,button { font-family:'DM Sans',-apple-system,sans-serif; }
        .input-field { width:100%; background:white; border:1.5px solid #E8E2D9; border-radius:12px; padding:12px 16px; font-size:13px; color:#1A1410; outline:none; transition:border-color 0.18s; }
        .input-field:focus { border-color:#F4601A; }
        .social-btn { background:white; border:1.5px solid #E8E2D9; border-radius:12px; padding:11px; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; font-size:13px; cursor:pointer; transition:border-color 0.18s; font-family:inherit; }
        .social-btn:hover { border-color:#1A1410; }
        .social-btn:disabled { opacity:0.6; cursor:not-allowed; }
      `}</style>

      <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>

        {/* LEFT PANEL */}
        <div style={{ flex:'0 0 48%', background:'linear-gradient(135deg, #0F0D0A 0%, #1A1208 50%, #0F0D0A 100%)', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'44px 48px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 25% 65%, rgba(244,96,26,0.22) 0%, transparent 58%)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 85% 15%, rgba(26,110,244,0.07) 0%, transparent 50%)', pointerEvents:'none' }} />

          <div style={{ position:'relative' }}>
            <a href="/home" style={{ fontFamily:'Playfair Display,serif', fontWeight:900, fontSize:22, color:'white', textDecoration:'none' }}>
              Snap<span style={{ color:'#F4601A' }}>Reserve™</span>
            </a>
          </div>

          <div style={{ position:'relative' }}>
            <div style={{ display:'inline-block', background:'rgba(244,96,26,0.12)', border:'1px solid rgba(244,96,26,0.25)', borderRadius:100, padding:'5px 14px', fontSize:11, fontWeight:800, color:'#F4601A', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:22 }}>Now live in the US</div>
            <div style={{ fontFamily:'Playfair Display,serif', fontSize:36, fontWeight:700, color:'white', lineHeight:1.12, marginBottom:16 }}>
              The future of<br />travel booking<br />is <em style={{ color:'#F4601A' }}>here.</em>
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.42)', lineHeight:1.8, marginBottom:36, maxWidth:320 }}>
              Hotels, private stays, and experiences — all in one place with transparent, low platform fees.
            </div>
            <div style={{ display:'flex', gap:32 }}>
              {[['180K+','Hosts worldwide'],['90+','Cities'],['4.9★','Avg. rating']].map(([val, label]) => (
                <div key={label}>
                  <div style={{ fontSize:20, fontWeight:800, color:'#F4601A', marginBottom:3 }}>{val}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position:'relative', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:18, padding:'20px 22px' }}>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.52)', lineHeight:1.75, marginBottom:14, fontStyle:'italic' }}>
              "SnapReserve gave me the tools to turn my spare room into $3,200/month. The dashboard is incredibly easy to use."
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#F4601A,#c43d0a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'white' }}>S</div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'white' }}>Sarah M.</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>Host · Miami, FL</div>
              </div>
              <div style={{ marginLeft:'auto', color:'#F4601A', fontSize:13, letterSpacing:1 }}>★★★★★</div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex:1, background:'#FAF8F5', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px', overflowY:'auto' }}>
          <div style={{ width:'100%', maxWidth:380 }}>

            {/* Login / Sign up toggle */}
            <div style={{ display:'flex', background:'#EDEBE7', borderRadius:100, padding:4, marginBottom:30 }}>
              <div style={{ flex:1, padding:'10px', borderRadius:100, background:'white', textAlign:'center', fontWeight:700, fontSize:13, boxShadow:'0 2px 10px rgba(0,0,0,0.08)', color:'#1A1410' }}>Log in</div>
              <a href={searchParams.get('next') ? `/signup?next=${encodeURIComponent(searchParams.get('next'))}` : '/signup'} style={{ flex:1, padding:'10px', borderRadius:100, textAlign:'center', fontWeight:700, fontSize:13, color:'#6B5F54', textDecoration:'none' }}>Sign up</a>
            </div>

            {!resetMode ? (
              <>
                <div style={{ fontFamily:'Playfair Display,serif', fontSize:27, fontWeight:700, marginBottom:6, color:'#1A1410' }}>Welcome back</div>
                <div style={{ fontSize:13, color:'#6B5F54', marginBottom:24, lineHeight:1.65 }}>Sign in to manage your bookings and listings.</div>

                {error && (
                  <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12, padding:'12px 16px', fontSize:12, color:'#EF4444', marginBottom:16 }}>{error}</div>
                )}

                {/* Google */}
                <button className="social-btn" style={{ width:'100%', marginBottom:14, borderRadius:12, padding:'12px 16px' }} onClick={handleGoogleSignIn} disabled={googleLoading} type="button">
                  <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                </button>

                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                  <div style={{ flex:1, height:1, background:'#E8E2D9' }} />
                  <span style={{ fontSize:12, color:'#A89880' }}>or sign in with email</span>
                  <div style={{ flex:1, height:1, background:'#E8E2D9' }} />
                </div>

                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:12, fontWeight:700, display:'block', marginBottom:6, color:'#1A1410' }}>Email address</label>
                    <input className="input-field" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <label style={{ fontSize:12, fontWeight:700, display:'block', marginBottom:6, color:'#1A1410' }}>Password</label>
                    <input className="input-field" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" />
                  </div>
                  <div style={{ textAlign:'right', marginBottom:22 }}>
                    <button type="button" onClick={() => { setResetMode(true); setError('') }} style={{ background:'none', border:'none', fontSize:12, color:'#F4601A', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Forgot password?</button>
                  </div>
                  <button type="submit" disabled={loading} style={{ width:'100%', background: loading ? '#E8E2D9' : '#F4601A', color:'white', padding:'13px', borderRadius:100, fontWeight:700, fontSize:14, border:'none', cursor: loading ? 'not-allowed' : 'pointer', marginBottom:18, transition:'opacity 0.18s' }}>
                    {loading ? 'Signing in...' : 'Log in →'}
                  </button>
                </form>

                <div style={{ textAlign:'center', fontSize:13, color:'#6B5F54' }}>
                  Don't have an account? <a href={searchParams.get('next') ? `/signup?next=${encodeURIComponent(searchParams.get('next'))}` : '/signup'} style={{ color:'#F4601A', fontWeight:700, textDecoration:'none' }}>Sign up free →</a>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily:'Playfair Display,serif', fontSize:27, fontWeight:700, marginBottom:6, color:'#1A1410' }}>Reset password</div>
                <div style={{ fontSize:13, color:'#6B5F54', marginBottom:24, lineHeight:1.65 }}>Enter your email and we'll send a reset link.</div>

                {resetSent ? (
                  <div style={{ background:'rgba(22,163,74,0.06)', border:'1px solid rgba(22,163,74,0.2)', borderRadius:12, padding:'14px 16px', fontSize:13, color:'#16A34A', marginBottom:20 }}>
                    ✓ Reset link sent — check your inbox.
                  </div>
                ) : (
                  <>
                    {error && (
                      <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12, padding:'12px 16px', fontSize:12, color:'#EF4444', marginBottom:16 }}>{error}</div>
                    )}
                    <form onSubmit={handleReset}>
                      <div style={{ marginBottom:20 }}>
                        <label style={{ fontSize:12, fontWeight:700, display:'block', marginBottom:6, color:'#1A1410' }}>Email address</label>
                        <input className="input-field" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                      </div>
                      <button type="submit" disabled={loading} style={{ width:'100%', background: loading ? '#E8E2D9' : '#F4601A', color:'white', padding:'13px', borderRadius:100, fontWeight:700, fontSize:14, border:'none', cursor: loading ? 'not-allowed' : 'pointer', marginBottom:14, transition:'opacity 0.18s' }}>
                        {loading ? 'Sending...' : 'Send reset link →'}
                      </button>
                    </form>
                  </>
                )}

                <button type="button" onClick={() => { setResetMode(false); setResetSent(false); setError('') }} style={{ width:'100%', background:'none', border:'none', color:'#A89880', fontSize:13, cursor:'pointer', fontFamily:'inherit', marginTop:4 }}>
                  ← Back to sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}