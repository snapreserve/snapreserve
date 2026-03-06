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
  const [showPw, setShowPw] = useState(false)
  const [pwStrength, setPwStrength] = useState(0)
  const [step, setStep] = useState(1)
  const [docType, setDocType] = useState('dl')
  const [uploads, setUploads] = useState({ front: false, back: false, passport: false, selfie: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [refCode] = useState(() => 'VERF-' + Math.random().toString(36).substring(2, 8).toUpperCase())
  const [accountId] = useState(() => 'SR-USR-' + Math.random().toString(36).substring(2, 8).toUpperCase())

  const firstName = fullName.split(' ')[0] || 'there'

  function handlePwChange(v) {
    setPassword(v)
    if (!v.length) { setPwStrength(0); return }
    if (v.length < 6) { setPwStrength(1); return }
    if (v.length < 10 || !/\d/.test(v)) { setPwStrength(2); return }
    setPwStrength(3)
  }

  function barColor(idx) {
    if (pwStrength === 0) return '#e0d8ce'
    if (pwStrength === 1) return idx === 0 ? '#d97706' : '#e0d8ce'
    if (pwStrength === 2) return idx < 2 ? '#d97706' : '#e0d8ce'
    return '#16a34a'
  }

  async function handleGoogleSignUp() {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback` },
    })
  }

  function goToStep2(e) {
    e.preventDefault()
    setError('')
    setStep(2)
  }

  async function completeSignup(skip) {
    setLoading(true)
    setError('')
    setSkipped(skip)

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (authError) {
      setError(authError.message)
      setStep(1)
      setLoading(false)
      return
    }

    setLoading(false)
    setStep(3)

    if (data.session && next) {
      router.push(next)
      router.refresh()
    }
  }

  function simUpload(side) {
    setUploads(prev => ({ ...prev, [side]: true }))
  }

  function resetUpload(side) {
    setUploads(prev => ({ ...prev, [side]: false }))
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700;1,900&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box}
        html,body{height:100%;overflow:hidden}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes popIn{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}
        .sr-fi{width:100%;padding:11px 13px;background:var(--sr-card);border:1.5px solid var(--sr-border-solid,#e2dbd2);border-radius:10px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--sr-text);outline:none;transition:all .18s}
        .sr-fi:focus{border-color:var(--sr-orange);box-shadow:0 0 0 3px var(--sr-ol)}
        .sr-fi::placeholder{color:var(--sr-sub)}
        .sr-cta{width:100%;padding:13px;border-radius:10px;background:var(--sr-orange);border:none;color:white;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .2s;margin-top:4px}
        .sr-cta:hover:not(:disabled){opacity:.88;transform:translateY(-1px);box-shadow:0 6px 20px var(--sr-ob)}
        .sr-cta:disabled{opacity:0.6;cursor:not-allowed}
        .sr-google{width:100%;padding:12px;background:var(--sr-card);border:1.5px solid var(--sr-border-solid,#e2dbd2);border-radius:10px;display:flex;align-items:center;justify-content:center;gap:9px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:var(--sr-text);cursor:pointer;transition:all .18s;margin-bottom:16px}
        .sr-google:hover{border-color:var(--sr-border2);box-shadow:0 2px 8px rgba(0,0,0,.07)}
        .sr-google:disabled{opacity:0.6;cursor:not-allowed}
        .sr-back{display:flex;align-items:center;gap:5px;background:none;border:none;color:var(--sr-muted);font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;padding:0;margin-bottom:18px;transition:color .14s}
        .sr-back:hover{color:var(--sr-text)}
        .sr-doc{padding:13px;border:2px solid var(--sr-border-solid,#e2dbd2);border-radius:11px;background:var(--sr-card);cursor:pointer;transition:all .18s;position:relative;overflow:hidden}
        .sr-doc::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:#e8622a;transform:scaleX(0);transform-origin:left;transition:transform .22s}
        .sr-doc.on{border-color:var(--sr-orange);background:var(--sr-ol)}
        .sr-doc.on::after{transform:scaleX(1)}
        .sr-upload{border:2px dashed var(--sr-border-solid,#e2dbd2);border-radius:11px;background:var(--sr-card);padding:20px 13px;text-align:center;cursor:pointer;transition:all .2s;position:relative;min-height:136px;display:flex;flex-direction:column;align-items:center;justify-content:center}
        .sr-upload:hover{border-color:var(--sr-orange);background:var(--sr-ol)}
        .sr-upload.done{border-style:solid;border-color:#16a34a;background:rgba(22,163,74,.04)}
        .sr-selfie{border:2px dashed var(--sr-border-solid,#e2dbd2);border-radius:11px;background:var(--sr-card);padding:14px;display:flex;align-items:flex-start;gap:12px;cursor:pointer;transition:all .2s;margin-bottom:12px}
        .sr-selfie:hover{border-color:var(--sr-orange);background:var(--sr-ol)}
        .sr-selfie.done{border-style:solid;border-color:#16a34a;background:rgba(22,163,74,.04)}
        .sr-anim{animation:fadeUp .36s ease both}
        .sr-right::-webkit-scrollbar{width:0}
        .sr-pw-eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--sr-sub);font-size:14px;padding:0;line-height:1}
        .dot-anim{width:6px;height:6px;border-radius:50%;background:#d97706;display:inline-block;animation:pulse 1.5s infinite;margin-right:5px;vertical-align:middle}
        .sr-skip-btn{background:none;border:none;color:var(--sr-muted);font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;cursor:pointer;text-decoration:underline}
        .sr-skip-btn:hover{color:var(--sr-text)}
        .sr-ub-btn{display:inline-flex;align-items:center;gap:4px;margin-top:8px;padding:5px 11px;background:var(--sr-text);border-radius:6px;color:var(--sr-bg);font-size:10px;font-weight:700;cursor:pointer;border:none;font-family:'DM Sans',sans-serif}
      `}</style>

      <div style={{ display:'grid', gridTemplateColumns:'42% 1fr', height:'100vh', overflow:'hidden', fontFamily:"'DM Sans',sans-serif" }}>

        {/* LEFT */}
        <div style={{ background:'#0f0e0c', position:'relative', overflow:'hidden', display:'flex', flexDirection:'column', padding:'36px 44px' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 60% at 30% 40%,rgba(232,98,42,.18) 0%,transparent 60%),radial-gradient(ellipse 50% 50% at 80% 80%,rgba(232,98,42,.08) 0%,transparent 55%)', pointerEvents:'none' }} />

          {/* Brand */}
          <div style={{ fontSize:17, fontWeight:700, color:'white', position:'relative', zIndex:1 }}>
            Snap<span style={{ color:'#e8622a' }}>Reserve</span><sup style={{ fontSize:8, color:'rgba(255,255,255,.3)', verticalAlign:'super', marginLeft:1 }}>™</sup>
          </div>

          {/* Hero — step 1 */}
          {step === 1 && (
            <div style={{ position:'relative', zIndex:1, marginTop:'auto', paddingTop:50, animation:'fadeUp .4s ease both' }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', border:'1px solid rgba(232,98,42,.35)', borderRadius:100, fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#e8622a', marginBottom:22, background:'rgba(232,98,42,.06)' }}>Join for Free</div>
              <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(26px,3vw,40px)', fontWeight:900, lineHeight:1.05, color:'white', marginBottom:8 }}>
                Start your<br />journey with<br /><em style={{ color:'#e8622a', fontStyle:'italic', display:'block' }}>SnapReserve™.</em>
              </h1>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.42)', lineHeight:1.75, maxWidth:300, marginBottom:28 }}>Book world-class hotels or list your own property. No hidden fees, no surprises.</p>
              <div style={{ display:'flex', gap:24, marginBottom:36 }}>
                {[['Free','To sign up'],['24/7','Support']].map(([v,l]) => (
                  <div key={l}>
                    <div style={{ fontSize:17, fontWeight:700, color:'#e8622a', marginBottom:1 }}>{v}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,.32)', fontWeight:500 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {['Book hotels and private stays worldwide','List your property with zero upfront cost','Identity verified for a safer community'].map(t => (
                  <div key={t} style={{ display:'flex', alignItems:'center', gap:9, fontSize:12, color:'rgba(255,255,255,.48)' }}>
                    <div style={{ width:17, height:17, borderRadius:'50%', background:'rgba(232,98,42,.14)', border:'1px solid rgba(232,98,42,.28)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:8, color:'#e8622a' }}>✓</div>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step tracker — steps 2+ */}
          {step >= 2 && (
            <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', marginTop:'auto', paddingTop:40, animation:'fadeUp .4s ease both' }}>
              {[
                { n:1, label:'Create account', sub:'Name, email & password' },
                { n:2, label:'Verify identity', sub:'Upload driving licence' },
                { n:3, label:"You're in", sub:'Start booking or listing' },
              ].map(({ n, label, sub }, idx) => {
                const done = step > n
                const active = step === n
                return (
                  <div key={n} style={{ display:'flex', alignItems:'flex-start', gap:11, padding:'9px 0', position:'relative' }}>
                    {idx < 2 && <div style={{ position:'absolute', left:11, top:33, width:1, height:'calc(100% - 12px)', background:'rgba(255,255,255,.07)' }} />}
                    <div style={{ width:23, height:23, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0, border: done ? 'none' : active ? '1.5px solid #e8622a' : '1.5px solid rgba(255,255,255,.1)', background: done ? '#16a34a' : active ? '#e8622a' : 'transparent', color: (done || active) ? 'white' : 'rgba(255,255,255,.25)', boxShadow: active ? '0 0 0 4px rgba(232,98,42,.18)' : 'none', transition:'all .3s' }}>
                      {done ? '✓' : n}
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color: active ? 'white' : done ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.25)', lineHeight:1.2, marginBottom:1, transition:'color .3s' }}>{label}</div>
                      <div style={{ fontSize:10, color: active ? 'rgba(255,255,255,.38)' : 'rgba(255,255,255,.18)', transition:'color .3s' }}>{sub}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="sr-right" style={{ background:'var(--sr-bg)', overflowY:'auto', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 24px' }}>
          <div style={{ width:'100%', maxWidth:430, padding:'16px 0' }}>

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <div className="sr-anim">
                {/* Auth tabs */}
                <div style={{ display:'flex', background:'var(--sr-surface)', borderRadius:100, padding:4, marginBottom:26 }}>
                  <a href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} style={{ flex:1, padding:9, borderRadius:100, textAlign:'center', fontSize:13, fontWeight:600, color:'var(--sr-muted)', textDecoration:'none' }}>Log in</a>
                  <div style={{ flex:1, padding:9, borderRadius:100, textAlign:'center', fontSize:13, fontWeight:600, background:'var(--sr-card)', color:'var(--sr-text)', boxShadow:'0 2px 8px rgba(0,0,0,.07)' }}>Sign up</div>
                </div>

                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:25, fontWeight:900, color:'var(--sr-text)', marginBottom:5, lineHeight:1.1 }}>
                  Create your<br /><em style={{ color:'#e8622a', fontStyle:'italic' }}>account.</em>
                </h2>
                <p style={{ fontSize:13, color:'var(--sr-muted)', marginBottom:22, lineHeight:1.65 }}>Join 180,000+ hosts and travellers on SnapReserve™.</p>

                {error && (
                  <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, padding:'12px 14px', fontSize:12, color:'#ef4444', marginBottom:14 }}>{error}</div>
                )}

                <button className="sr-google" onClick={handleGoogleSignUp} disabled={googleLoading} type="button">
                  <svg width="17" height="17" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.6 0 6.6 5.6 2.8 13.7l7.8 6C12.5 13.5 17.8 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17z"/>
                    <path fill="#FBBC05" d="M10.6 28.3A14.5 14.5 0 0 1 9.5 24c0-1.5.3-3 .7-4.3L2.4 13.7A24 24 0 0 0 0 24c0 3.9.9 7.5 2.4 10.8l8.2-6.5z"/>
                    <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.7 2.3-7.7 2.3-6.2 0-11.5-4.2-13.4-9.8l-7.8 5.8C6.4 42.2 14.6 48 24 48z"/>
                  </svg>
                  {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                </button>

                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                  <div style={{ flex:1, height:1, background:'var(--sr-border-solid,#e0d8ce)' }} />
                  <span style={{ fontSize:10, fontWeight:600, color:'var(--sr-sub)', whiteSpace:'nowrap' }}>or sign up with email</span>
                  <div style={{ flex:1, height:1, background:'var(--sr-border-solid,#e0d8ce)' }} />
                </div>

                <form onSubmit={goToStep2}>
                  <div style={{ marginBottom:13 }}>
                    <label style={{ display:'block', fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--sr-muted)', marginBottom:5 }}>Full name <span style={{ color:'var(--sr-orange)' }}>*</span></label>
                    <input className="sr-fi" type="text" required placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} />
                  </div>
                  <div style={{ marginBottom:13 }}>
                    <label style={{ display:'block', fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--sr-muted)', marginBottom:5 }}>Email address <span style={{ color:'var(--sr-orange)' }}>*</span></label>
                    <input className="sr-fi" type="email" required placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div style={{ marginBottom:13 }}>
                    <label style={{ display:'block', fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--sr-muted)', marginBottom:5 }}>Password <span style={{ color:'var(--sr-orange)' }}>*</span></label>
                    <div style={{ position:'relative' }}>
                      <input className="sr-fi" type={showPw ? 'text' : 'password'} required minLength={8} placeholder="Min. 8 characters" value={password} onChange={e => handlePwChange(e.target.value)} style={{ paddingRight:40 }} />
                      <button className="sr-pw-eye" type="button" onClick={() => setShowPw(p => !p)}>👁</button>
                    </div>
                    <div style={{ display:'flex', gap:4, marginTop:5 }}>
                      {[0,1,2].map(i => <div key={i} style={{ flex:1, height:3, borderRadius:100, background:barColor(i), transition:'background .3s' }} />)}
                    </div>
                    <div style={{ fontSize:10, color:'var(--sr-sub)', marginTop:4 }}>
                      {pwStrength === 0 ? 'Use at least 8 characters with letters and numbers' :
                       pwStrength === 1 ? 'Too short — keep going' :
                       pwStrength === 2 ? 'Getting stronger — add numbers' : 'Strong password ✓'}
                    </div>
                  </div>
                  <button type="submit" className="sr-cta">Create Account <span>→</span></button>
                </form>

                <p style={{ fontSize:10, color:'var(--sr-sub)', marginTop:9, lineHeight:1.65, textAlign:'center' }}>
                  By signing up you agree to our <a href="/terms" style={{ color:'var(--sr-orange)', textDecoration:'none' }}>Terms of Service</a> and <a href="/privacy" style={{ color:'var(--sr-orange)', textDecoration:'none' }}>Privacy Policy</a>.
                </p>
                <p style={{ fontSize:12, color:'var(--sr-muted)', textAlign:'center', marginTop:14 }}>
                  Already have an account? <a href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} style={{ color:'var(--sr-orange)', fontWeight:700, textDecoration:'none' }}>Log in →</a>
                </p>
              </div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <div className="sr-anim">
                <button className="sr-back" onClick={() => setStep(1)}>← Back</button>
                <div style={{ height:3, background:'var(--sr-border-solid,#e0d8ce)', borderRadius:100, marginBottom:24, overflow:'hidden' }}>
                  <div style={{ height:'100%', background:'var(--sr-orange)', borderRadius:100, width:'50%' }} />
                </div>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.2em', textTransform:'uppercase', color:'var(--sr-orange)', marginBottom:10, display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{ width:16, height:1, background:'var(--sr-orange)' }} />
                  Step 2 of 2 — Identity Verification
                </div>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:25, fontWeight:900, color:'var(--sr-text)', marginBottom:5, lineHeight:1.1 }}>
                  Verify your<br /><em style={{ color:'#e8622a', fontStyle:'italic' }}>identity.</em>
                </h2>
                <p style={{ fontSize:13, color:'var(--sr-muted)', marginBottom:22, lineHeight:1.65 }}>Upload your driving licence so we can confirm who you are. Encrypted and kept private — never shown publicly.</p>

                {error && (
                  <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, padding:'12px 14px', fontSize:12, color:'#ef4444', marginBottom:14 }}>{error}</div>
                )}

                {/* Doc type */}
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--sr-muted)', marginBottom:8 }}>Choose document type <span style={{ color:'var(--sr-orange)' }}>*</span></div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
                  {[
                    { id:'dl', icon:'🪪', title:'Driving Licence', sub:'Front & back required', tag:'⭐ Recommended', tagBg:'rgba(22,163,74,.1)', tagColor:'#16a34a', tagBorder:'1px solid rgba(22,163,74,.25)' },
                    { id:'pp', icon:'📘', title:'Passport', sub:'Photo page only', tag:'✓ Accepted', tagBg:'rgba(37,99,235,.08)', tagColor:'#2563eb', tagBorder:'1px solid rgba(37,99,235,.18)' },
                  ].map(({ id, icon, title, sub, tag, tagBg, tagColor, tagBorder }) => (
                    <div key={id} className={`sr-doc${docType === id ? ' on' : ''}`} onClick={() => setDocType(id)}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                        <span style={{ fontSize:20 }}>{icon}</span>
                        <div style={{ width:17, height:17, borderRadius:'50%', border: docType === id ? 'none' : '1.5px solid #e2dbd2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, background: docType === id ? '#e8622a' : 'transparent', color: docType === id ? 'white' : 'transparent', transition:'all .18s' }}>✓</div>
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--sr-text)', marginBottom:2 }}>{title}</div>
                      <div style={{ fontSize:10, color:'var(--sr-muted)' }}>{sub}</div>
                      <div style={{ display:'inline-flex', fontSize:8, fontWeight:700, padding:'2px 7px', borderRadius:100, marginTop:5, background:tagBg, color:tagColor, border:tagBorder }}>{tag}</div>
                    </div>
                  ))}
                </div>

                {/* DL Upload */}
                {docType === 'dl' && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--sr-muted)', marginBottom:7 }}>Upload Driving Licence <span style={{ color:'var(--sr-orange)' }}>*</span></div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      {[
                        { side:'front', tag:'FRONT', icon:'🪪', title:'Front side', sub:'Name, photo & expiry visible', thumbBg:'linear-gradient(135deg,#1e3a8a,#3b82f6)', thumbText:'🪪 FRONT', fileName:'licence_front.jpg', size:'2.4 MB · JPG' },
                        { side:'back', tag:'BACK', icon:'🔄', title:'Back side', sub:'Barcode fully visible', thumbBg:'linear-gradient(135deg,#374151,#6b7280)', thumbText:'▊▊ BACK', fileName:'licence_back.jpg', size:'1.8 MB · JPG' },
                      ].map(({ side, tag, icon, title, sub, thumbBg, thumbText, fileName, size }) => (
                        <div key={side} className={`sr-upload${uploads[side] ? ' done' : ''}`} onClick={() => simUpload(side)}>
                          <span style={{ position:'absolute', top:8, left:8, fontSize:7, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'#b5afa8' }}>{tag}</span>
                          {!uploads[side] ? (
                            <>
                              <div style={{ fontSize:24, marginBottom:6 }}>{icon}</div>
                              <div style={{ fontSize:11, fontWeight:700, color:'var(--sr-text)', marginBottom:2 }}>{title}</div>
                              <div style={{ fontSize:10, color:'var(--sr-muted)', lineHeight:1.5 }}>{sub}</div>
                              <button className="sr-ub-btn">📁 Upload</button>
                            </>
                          ) : (
                            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'100%' }}>
                              <div style={{ width:'100%', maxWidth:170, height:76, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:6, background:thumbBg, color:'white', fontSize:10, fontWeight:700, textAlign:'center', lineHeight:1.4 }}>{thumbText}</div>
                              <div style={{ fontSize:10, fontWeight:700, color:'var(--sr-text)', marginBottom:1 }}>{fileName}</div>
                              <div style={{ fontSize:9, color:'var(--sr-sub)', marginBottom:4 }}>{size}</div>
                              <div style={{ fontSize:10, fontWeight:700, color:'#16a34a' }}>✓ Uploaded</div>
                              <div style={{ fontSize:9, color:'#b5afa8', textDecoration:'underline', cursor:'pointer', marginTop:3 }} onClick={e => { e.stopPropagation(); resetUpload(side) }}>Re-upload</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Passport Upload */}
                {docType === 'pp' && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--sr-muted)', marginBottom:7 }}>Upload Passport <span style={{ color:'var(--sr-orange)' }}>*</span></div>
                    <div className={`sr-upload${uploads.passport ? ' done' : ''}`} onClick={() => simUpload('passport')}>
                      <span style={{ position:'absolute', top:8, left:8, fontSize:7, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--sr-sub)' }}>PHOTO / DATA PAGE</span>
                      {!uploads.passport ? (
                        <>
                          <div style={{ fontSize:24, marginBottom:6 }}>📘</div>
                          <div style={{ fontSize:11, fontWeight:700, color:'var(--sr-text)', marginBottom:2 }}>Passport photo page</div>
                          <div style={{ fontSize:10, color:'var(--sr-muted)', lineHeight:1.5 }}>Page with your photo, name, DOB & MRZ lines</div>
                          <button className="sr-ub-btn">📁 Upload</button>
                        </>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'100%' }}>
                          <div style={{ width:'100%', maxWidth:230, height:96, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:6, background:'linear-gradient(135deg,#1e3a5f,#2563eb)', color:'white', fontSize:10, fontWeight:700 }}>📘 PASSPORT</div>
                          <div style={{ fontSize:10, fontWeight:700, color:'var(--sr-text)', marginBottom:1 }}>passport_photo.jpg</div>
                          <div style={{ fontSize:9, color:'var(--sr-sub)', marginBottom:4 }}>3.1 MB · JPG</div>
                          <div style={{ fontSize:10, fontWeight:700, color:'#16a34a' }}>✓ Uploaded</div>
                          <div style={{ fontSize:9, color:'#b5afa8', textDecoration:'underline', cursor:'pointer', marginTop:3 }} onClick={e => { e.stopPropagation(); resetUpload('passport') }}>Re-upload</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Selfie */}
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--sr-muted)', marginBottom:7, marginTop:2 }}>Selfie holding your ID <span style={{ color:'var(--sr-orange)' }}>*</span></div>
                <div className={`sr-selfie${uploads.selfie ? ' done' : ''}`} onClick={() => simUpload('selfie')}>
                  <div style={{ width:46, height:46, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, background: uploads.selfie ? 'linear-gradient(135deg,#065f46,#16a34a)' : 'var(--sr-surface)', border: uploads.selfie ? '2px solid #16a34a' : '2px solid var(--sr-border-solid,#e2dbd2)', flexShrink:0, transition:'all .2s' }}>🤳</div>
                  {!uploads.selfie ? (
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--sr-text)', marginBottom:2 }}>Hold your ID next to your face</div>
                      <div style={{ fontSize:10, color:'var(--sr-muted)', lineHeight:1.55, marginBottom:6 }}>One clear photo showing your face and the front of your ID side by side.</div>
                      <div style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                        <button style={{ padding:'5px 10px', borderRadius:6, fontFamily:"'DM Sans',sans-serif", fontSize:10, fontWeight:700, cursor:'pointer', border:'none', background:'#e8622a', color:'white' }} onClick={() => simUpload('selfie')}>📷 Take photo</button>
                        <button style={{ padding:'5px 10px', borderRadius:6, fontFamily:"'DM Sans',sans-serif", fontSize:10, fontWeight:700, cursor:'pointer', border:'1px solid var(--sr-border-solid,#e2dbd2)', background:'transparent', color:'var(--sr-muted)' }} onClick={() => simUpload('selfie')}>📁 Upload</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#16a34a' }}>✓ Selfie uploaded</div>
                      <div style={{ fontSize:10, color:'var(--sr-muted)' }}>selfie_with_id.jpg · 3.2 MB</div>
                      <div style={{ fontSize:9, color:'var(--sr-sub)', textDecoration:'underline', cursor:'pointer', marginTop:4 }} onClick={e => { e.stopPropagation(); resetUpload('selfie') }}>Re-upload</div>
                    </div>
                  )}
                </div>

                {/* Tips */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>
                  {[['☀️','Bright light — avoid flash glare on ID'],['📐','All four ID corners must be visible'],['🔍','Text and photo sharp and in focus'],['📵','Original photo only — no screenshots']].map(([icon, text]) => (
                    <div key={text} style={{ background:'var(--sr-card)', border:'1px solid var(--sr-border-solid,#e2dbd2)', borderRadius:8, padding:'8px 10px', display:'flex', alignItems:'flex-start', gap:6, fontSize:10, color:'var(--sr-muted)', lineHeight:1.5 }}>
                      <span style={{ fontSize:13, flexShrink:0 }}>{icon}</span>{text}
                    </div>
                  ))}
                </div>

                {/* Security note */}
                <div style={{ background:'var(--sr-card)', border:'1px solid var(--sr-border-solid,#e2dbd2)', borderRadius:9, padding:'11px 13px', marginBottom:18, display:'flex', gap:8, fontSize:10, color:'var(--sr-muted)', lineHeight:1.65 }}>
                  <span style={{ fontSize:16, flexShrink:0 }}>🔒</span>
                  <span>256-bit SSL encrypted. Never shown publicly or shared with third parties. Only SnapReserve™ staff access your ID for verification — then it is securely deleted after 12 months.</span>
                </div>

                <button className="sr-cta" onClick={() => completeSignup(false)} disabled={loading}>
                  {loading ? 'Creating account…' : <>Complete Sign Up <span>→</span></>}
                </button>
                <div style={{ textAlign:'center', marginTop:11, fontSize:11, color:'var(--sr-sub)' }}>
                  Prefer to verify later? <button className="sr-skip-btn" onClick={() => completeSignup(true)}>Skip for now</button> — some features will be limited.
                </div>
              </div>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
              <div style={{ textAlign:'center', padding:'10px 0 40px', animation:'fadeUp .4s ease both' }}>
                <div style={{ width:72, height:72, borderRadius:'50%', margin:'0 auto 18px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, background:'rgba(217,119,6,.1)', border:'2px solid rgba(217,119,6,.25)', animation:'popIn .5s cubic-bezier(.175,.885,.32,1.275) both' }}>
                  {skipped ? '⚠️' : '🎉'}
                </div>

                {skipped ? (
                  <>
                    <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:900, color:'var(--sr-text)', marginBottom:8, lineHeight:1.1 }}>
                      You're in,<br /><em style={{ color:'#e8622a', fontStyle:'italic' }}>{firstName}!</em>
                    </h2>
                    <p style={{ fontSize:13, color:'var(--sr-muted)', lineHeight:1.75, maxWidth:330, margin:'0 auto 22px' }}>Account created. To unlock full booking and listing features, verify your identity from your account settings.</p>
                    <div style={{ background:'var(--sr-card)', border:'1px solid var(--sr-border-solid,#e2dbd2)', borderRadius:11, padding:'14px 20px', display:'inline-block', marginBottom:22 }}>
                      <div style={{ fontSize:8, fontWeight:700, letterSpacing:'.18em', textTransform:'uppercase', color:'var(--sr-sub)', marginBottom:4 }}>Account ID</div>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:15, fontWeight:700, color:'#e8622a', letterSpacing:'.05em' }}>{accountId}</div>
                    </div>
                    <div style={{ maxWidth:340, margin:'0 auto', textAlign:'left' }}>
                      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'var(--sr-muted)', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
                        Next step <div style={{ flex:1, height:1, background:'var(--sr-border-solid,#e0d8ce)' }} />
                      </div>
                      {[
                        { n:'!', strong:'Verify your identity', desc:'Go to Account → Settings → Identity to upload your ID and unlock all features.' },
                        { n:'→', strong:'Start exploring', desc:'Browse stays while you complete verification.' },
                      ].map(({ n, strong, desc }) => (
                        <div key={strong} style={{ display:'flex', gap:10, marginBottom:11 }}>
                          <div style={{ width:21, height:21, borderRadius:'50%', background:'rgba(232,98,42,.1)', border:'1px solid rgba(232,98,42,.28)', color:'#e8622a', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{n}</div>
                          <div>
                            <div style={{ fontSize:12, fontWeight:700, color:'var(--sr-text)', marginBottom:2 }}>{strong}</div>
                            <div style={{ fontSize:11, color:'var(--sr-muted)', lineHeight:1.5 }}>{desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:900, color:'var(--sr-text)', marginBottom:8, lineHeight:1.1 }}>
                      Welcome to<br /><em style={{ color:'#e8622a', fontStyle:'italic' }}>SnapReserve™!</em>
                    </h2>
                    <p style={{ fontSize:13, color:'var(--sr-muted)', lineHeight:1.75, maxWidth:330, margin:'0 auto 22px' }}>Account created and your ID is under review. We'll confirm within <strong>24–48 hours</strong>. You can start exploring right now.</p>
                    <div style={{ background:'var(--sr-card)', border:'1px solid var(--sr-border-solid,#e2dbd2)', borderRadius:11, padding:'14px 20px', display:'inline-block', marginBottom:22 }}>
                      <div style={{ fontSize:8, fontWeight:700, letterSpacing:'.18em', textTransform:'uppercase', color:'var(--sr-sub)', marginBottom:4 }}>Verification Reference</div>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:15, fontWeight:700, color:'#e8622a', letterSpacing:'.05em' }}>{refCode}</div>
                    </div>
                    <div style={{ maxWidth:340, margin:'0 auto', textAlign:'left' }}>
                      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'var(--sr-muted)', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
                        What happens next <div style={{ flex:1, height:1, background:'var(--sr-border-solid,#e0d8ce)' }} />
                      </div>
                      {[
                        { n:'1', dot:true, strong:'ID under review', desc:'Our team verifies your document within 24–48 hours.' },
                        { n:'2', strong:'You get notified', desc:"We'll email and message you once confirmed." },
                        { n:'3', strong:'Full access unlocked', desc:'Book stays, list your property, and start earning.' },
                      ].map(({ n, dot, strong, desc }) => (
                        <div key={strong} style={{ display:'flex', gap:10, marginBottom:11 }}>
                          <div style={{ width:21, height:21, borderRadius:'50%', background:'rgba(232,98,42,.1)', border:'1px solid rgba(232,98,42,.28)', color:'#e8622a', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{n}</div>
                          <div>
                            <div style={{ fontSize:12, fontWeight:700, color:'var(--sr-text)', marginBottom:2 }}>{dot && <span className="dot-anim" />}{strong}</div>
                            <div style={{ fontSize:11, color:'var(--sr-muted)', lineHeight:1.5 }}>{desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <a href={next || '/home'} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, maxWidth:340, padding:13, borderRadius:10, background:'var(--sr-orange)', color:'white', fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, textDecoration:'none', margin:'22px auto 0', transition:'all .2s' }}>
                  Go to my Dashboard →
                </a>
              </div>
            )}

          </div>
        </div>

      </div>
    </>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:'var(--sr-bg)' }} />}>
      <SignupInner />
    </Suspense>
  )
}
