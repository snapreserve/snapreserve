'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SignupInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || ''
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogleSignUp() {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // If email confirmation is not required (session exists immediately), redirect now
    if (data.session && next) {
      router.push(next)
      router.refresh()
      return
    }

    setSuccess(true)
    setLoading(false)
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
            <div style={{ display:'inline-block', background:'rgba(244,96,26,0.12)', border:'1px solid rgba(244,96,26,0.25)', borderRadius:100, padding:'5px 14px', fontSize:11, fontWeight:800, color:'#F4601A', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:22 }}>Join for free</div>
            <div style={{ fontFamily:'Playfair Display,serif', fontSize:36, fontWeight:700, color:'white', lineHeight:1.12, marginBottom:16 }}>
              Start your<br />journey with<br /><em style={{ color:'#F4601A' }}>SnapReserve.</em>
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.42)', lineHeight:1.8, marginBottom:36, maxWidth:320 }}>
              Book world-class hotels or list your own property. No hidden fees, no surprises.
            </div>
            <div style={{ display:'flex', gap:32 }}>
              {[['Free','To sign up'],['3.2%','Platform fee'],['24/7','Support']].map(([val, label]) => (
                <div key={label}>
                  <div style={{ fontSize:20, fontWeight:800, color:'#F4601A', marginBottom:3 }}>{val}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position:'relative' }}>
            {[
              ['✓', 'Book hotels and private stays worldwide'],
              ['✓', 'List your property with zero upfront cost'],
              ['✓', 'SnapGuarantee™ protection on every booking'],
              ['✓', 'Instant payouts via Stripe Connect'],
            ].map(([icon, text]) => (
              <div key={text} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background:'rgba(244,96,26,0.2)', border:'1px solid rgba(244,96,26,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#F4601A', fontWeight:900, flexShrink:0 }}>{icon}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>{text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex:1, background:'#FAF8F5', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px', overflowY:'auto' }}>
          <div style={{ width:'100%', maxWidth:380 }}>

            {/* Login / Sign up toggle */}
            <div style={{ display:'flex', background:'#EDEBE7', borderRadius:100, padding:4, marginBottom:30 }}>
              <a href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} style={{ flex:1, padding:'10px', borderRadius:100, textAlign:'center', fontWeight:700, fontSize:13, color:'#6B5F54', textDecoration:'none' }}>Log in</a>
              <div style={{ flex:1, padding:'10px', borderRadius:100, background:'white', textAlign:'center', fontWeight:700, fontSize:13, boxShadow:'0 2px 10px rgba(0,0,0,0.08)', color:'#1A1410' }}>Sign up</div>
            </div>

            {success ? (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <div style={{ fontSize:40, marginBottom:16 }}>🎉</div>
                <div style={{ fontFamily:'Playfair Display,serif', fontSize:24, fontWeight:700, marginBottom:10, color:'#1A1410' }}>Check your email!</div>
                <div style={{ fontSize:13, color:'#6B5F54', lineHeight:1.7, marginBottom:24 }}>
                  We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then return here to continue.
                </div>
                <a href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} style={{ background:'#F4601A', color:'white', padding:'12px 28px', borderRadius:100, fontWeight:700, fontSize:13, textDecoration:'none', display:'inline-block' }}>Back to login →</a>
              </div>
            ) : (
              <>
                <div style={{ fontFamily:'Playfair Display,serif', fontSize:27, fontWeight:700, marginBottom:6, color:'#1A1410' }}>Create your account</div>
                <div style={{ fontSize:13, color:'#6B5F54', marginBottom:24, lineHeight:1.65 }}>Join 180,000+ hosts and travellers on SnapReserve.</div>

                {error && (
                  <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12, padding:'12px 16px', fontSize:12, color:'#EF4444', marginBottom:16 }}>{error}</div>
                )}

                {/* Google */}
                <button className="social-btn" style={{ width:'100%', marginBottom:14, borderRadius:12, padding:'12px 16px' }} onClick={handleGoogleSignUp} disabled={googleLoading} type="button">
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
                  <span style={{ fontSize:12, color:'#A89880' }}>or sign up with email</span>
                  <div style={{ flex:1, height:1, background:'#E8E2D9' }} />
                </div>

                <form onSubmit={handleSignup}>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:12, fontWeight:700, display:'block', marginBottom:6, color:'#1A1410' }}>Full name</label>
                    <input className="input-field" type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:12, fontWeight:700, display:'block', marginBottom:6, color:'#1A1410' }}>Email address</label>
                    <input className="input-field" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:12, fontWeight:700, display:'block', marginBottom:6, color:'#1A1410' }}>Password</label>
                    <input className="input-field" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" />
                  </div>
                  <div style={{ fontSize:11, color:'#A89880', textAlign:'center', marginBottom:16, lineHeight:1.6 }}>
                    By signing up you agree to our <a href="/terms" style={{ color:'#F4601A', textDecoration:'none' }}>Terms of Service</a> and <a href="/refund-policy" style={{ color:'#F4601A', textDecoration:'none' }}>Privacy Policy</a>.
                  </div>
                  <button type="submit" disabled={loading} style={{ width:'100%', background: loading ? '#E8E2D9' : '#F4601A', color:'white', padding:'13px', borderRadius:100, fontWeight:700, fontSize:14, border:'none', cursor: loading ? 'not-allowed' : 'pointer', marginBottom:18, transition:'opacity 0.18s' }}>
                    {loading ? 'Creating account...' : 'Create Account →'}
                  </button>
                </form>

                <div style={{ textAlign:'center', fontSize:13, color:'#6B5F54' }}>
                  Already have an account? <a href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} style={{ color:'#F4601A', fontWeight:700, textDecoration:'none' }}>Log in →</a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FAF8F5' }} />}>
      <SignupInner />
    </Suspense>
  )
}
