'use client'
import { useState } from 'react'
import SharedHeader from '@/app/components/SharedHeader'

export default function ContactPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', type: 'Traveler looking to book stays', message: '', country: '' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [intlEmail, setIntlEmail] = useState('')
  const [intlSubmitted, setIntlSubmitted] = useState(false)
  const [intlSubmitting, setIntlSubmitting] = useState(false)
  const [intlError, setIntlError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email.trim() || !form.firstName.trim()) return
    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName:  form.lastName,
          email:     form.email,
          type:      form.type,
          message:   form.message,
          region:    form.country || 'us',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || 'Something went wrong.'); return }
      setSubmitted(true)
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleIntlSubmit(e) {
    e.preventDefault()
    if (!intlEmail.trim()) return
    setIntlSubmitting(true)
    setIntlError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'International', email: intlEmail, region: 'international' }),
      })
      const data = await res.json()
      if (!res.ok) { setIntlError(data.error || 'Something went wrong.'); return }
      setIntlSubmitted(true)
    } catch {
      setIntlError('Network error. Please try again.')
    } finally {
      setIntlSubmitting(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; color:var(--sr-text); background:var(--sr-bg); }

        /* HERO */
        .contact-hero { padding:72px 40px 0; max-width:1280px; margin:0 auto; display:grid; grid-template-columns:1fr 520px; gap:60px; align-items:start; }
        .eyebrow { font-size:0.68rem; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:#F4601A; display:flex; align-items:center; gap:8px; margin-bottom:14px; }
        .eyebrow::before { content:''; width:28px; height:2px; background:#F4601A; flex-shrink:0; }
        .ci-title { font-family:'Playfair Display',serif; font-size:clamp(2.5rem,5vw,4rem); font-weight:900; line-height:1.05; letter-spacing:-2px; margin-bottom:16px; }
        .ci-title em { color:#F4601A; font-style:italic; }
        .ci-body { font-size:0.92rem; color:var(--sr-muted); line-height:1.8; margin-bottom:32px; max-width:440px; }
        .ci-items { display:flex; flex-direction:column; gap:18px; margin-bottom:36px; }
        .ci-item { display:flex; align-items:flex-start; gap:16px; }
        .ci-icon-box { width:44px; height:44px; border-radius:12px; background:var(--sr-surface); border:1px solid var(--sr-border2); display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; }
        .ci-label { font-size:0.62rem; font-weight:800; text-transform:uppercase; letter-spacing:0.12em; color:#A89880; margin-bottom:3px; }
        .ci-val { font-size:0.88rem; font-weight:700; color:var(--sr-text); }
        .ci-sub { font-size:0.76rem; color:#A89880; margin-top:2px; }
        .socials-label { font-size:0.62rem; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:#A89880; margin-bottom:12px; }
        .ci-socials { display:flex; gap:8px; flex-wrap:wrap; }
        .soc-btn { display:inline-flex; align-items:center; gap:8px; padding:9px 16px; background:var(--sr-card); border:1px solid var(--sr-border2); border-radius:100px; font-size:0.78rem; font-weight:700; cursor:pointer; font-family:inherit; color:var(--sr-text); text-decoration:none; transition:all 0.15s; }
        .soc-btn:hover { box-shadow:0 2px 10px rgba(0,0,0,0.08); transform:translateY(-1px); }
        .soc-btn.ig:hover  { border-color:#E1306C; color:#E1306C; }
        .soc-btn.x:hover   { border-color:#000; color:#000; }
        .soc-btn.li:hover  { border-color:#0A66C2; color:#0A66C2; }
        .soc-btn.tt:hover  { border-color:#010101; color:#010101; }
        .soc-icon { width:16px; height:16px; flex-shrink:0; }

        /* FORM CARD */
        .cf-card { background:var(--sr-card); border:1px solid var(--sr-border2); border-radius:22px; padding:36px; box-shadow:0 4px 32px rgba(0,0,0,0.06); margin-bottom:60px; }
        .cf-title { font-family:'Playfair Display',serif; font-size:1.3rem; font-weight:700; color:var(--sr-text); margin-bottom:24px; }
        .cf-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .cf-group { margin-bottom:16px; }
        .cf-label { display:block; font-size:0.68rem; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:var(--sr-muted); margin-bottom:7px; }
        .cf-input { width:100%; background:var(--sr-bg); border:1px solid var(--sr-border2); border-radius:10px; padding:11px 14px; font-size:0.88rem; font-family:inherit; color:var(--sr-text); outline:none; transition:border-color 0.15s; resize:vertical; }
        .cf-input:focus { border-color:#F4601A; }
        textarea.cf-input { min-height:100px; }
        .cf-submit { width:100%; background:#F4601A; color:white; border:none; border-radius:100px; padding:14px; font-size:0.92rem; font-weight:700; cursor:pointer; font-family:inherit; margin-top:4px; transition:opacity 0.15s; }
        .cf-submit:hover { opacity:0.88; }
        .cf-submit:disabled { opacity:0.5; cursor:not-allowed; }
        .cf-fine { font-size:0.72rem; color:#A89880; text-align:center; margin-top:12px; line-height:1.6; }
        .cf-fine a { color:#F4601A; cursor:pointer; text-decoration:none; }

        /* SUCCESS */
        .success-card { text-align:center; padding:40px 20px; }
        .success-icon { font-size:3rem; margin-bottom:16px; }
        .success-title { font-family:'Playfair Display',serif; font-size:1.5rem; font-weight:700; color:var(--sr-text); margin-bottom:10px; }
        .success-body { font-size:0.88rem; color:var(--sr-muted); line-height:1.7; }

        /* GEO STRIP */
        .geo-strip { background:var(--sr-surface); border-top:1px solid var(--sr-border2); padding:56px 40px; text-align:center; }
        .section-title { font-family:'Playfair Display',serif; font-size:clamp(1.6rem,3vw,2.2rem); font-weight:700; line-height:1.15; margin-bottom:14px; }
        .section-title em { color:#F4601A; font-style:italic; }
        .geo-card-inline { display:inline-flex; align-items:center; gap:12px; background:var(--sr-card); border:1px solid var(--sr-border2); border-radius:14px; padding:16px 24px; box-shadow:0 4px 16px rgba(58,31,13,0.06); margin-top:24px; }
        .geo-divider { width:1px; height:36px; background:var(--sr-border2); margin:0 4px; }
        .geo-name { font-size:0.82rem; font-weight:700; color:var(--sr-text); }
        .geo-sub { font-size:0.7rem; color:#A89880; margin-top:2px; }
        .geo-badge { font-size:0.65rem; font-weight:700; padding:3px 10px; border-radius:100px; }
        .gb-active { background:rgba(34,197,94,0.1); color:#16a34a; }
        .gb-soon { background:var(--sr-surface); color:#A89880; }

        /* FOOTER */
        .footer { background:#0F0C09; padding:24px 40px 20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; }
        .footer-logo { display:inline-flex; align-items:center; }
        .footer-logo img { height:22px; width:auto; }
        .footer-links { display:flex; gap:22px; }
        .footer-links a { font-size:0.78rem; color:rgba(255,255,255,0.4); text-decoration:none; transition:color 0.15s; }
        .footer-links a:hover { color:rgba(255,255,255,0.7); }
        .footer-copy { font-size:0.72rem; color:rgba(255,255,255,0.25); }

        @media(max-width:900px) { .contact-hero { grid-template-columns:1fr; } .cf-card { margin-bottom:40px; } }
        @media(max-width:768px) { .contact-hero,.geo-strip,.footer { padding-left:20px; padding-right:20px; } .contact-hero { padding-top:44px; } .cf-row { grid-template-columns:1fr; } }
      `}</style>

      <SharedHeader />

      {/* HERO */}
      <div className="contact-hero">
        {/* Left: info */}
        <div style={{paddingBottom:'60px'}}>
          <div className="eyebrow">Get in Touch</div>
          <h1 className="ci-title">Let&apos;s <em>talk</em></h1>
          <p className="ci-body">Have a question, want to list your property, or just curious about SnapReserve™? We'd love to hear from you — send us a message and we'll get back to you within 24 hours.</p>

          <div className="ci-items">
            <div className="ci-item">
              <div className="ci-icon-box">📍</div>
              <div>
                <div className="ci-label">Headquarters</div>
                <div className="ci-val">United States</div>
                <div className="ci-sub">International expansion coming soon</div>
              </div>
            </div>
            <div className="ci-item">
              <div className="ci-icon-box">🌐</div>
              <div>
                <div className="ci-label">Website</div>
                <div className="ci-val">snapreserve.app</div>
                <div className="ci-sub">Launching soon</div>
              </div>
            </div>
            <div className="ci-item">
              <div className="ci-icon-box">✉️</div>
              <div>
                <div className="ci-label">Email</div>
                <div className="ci-val">hello@snapreserve.app</div>
                <div className="ci-sub">We respond within 24 hours</div>
              </div>
            </div>
          </div>

          <div className="socials-label">Follow Us</div>
          <div className="ci-socials">
            <a href="https://instagram.com/snapreserve" target="_blank" rel="noopener noreferrer" className="soc-btn ig">
              <svg className="soc-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Instagram
            </a>
            <a href="https://x.com/snapreserve" target="_blank" rel="noopener noreferrer" className="soc-btn x">
              <svg className="soc-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Twitter / X
            </a>
            <a href="https://linkedin.com/company/snapreserve" target="_blank" rel="noopener noreferrer" className="soc-btn li">
              <svg className="soc-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </a>
            <a href="https://tiktok.com/@snapreserve" target="_blank" rel="noopener noreferrer" className="soc-btn tt">
              <svg className="soc-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/>
              </svg>
              TikTok
            </a>
          </div>
        </div>

        {/* Right: form */}
        <div className="cf-card">
          {submitted ? (
            <div className="success-card">
              <div className="success-icon">✉️</div>
              <div className="success-title">Message sent!</div>
              <p className="success-body">Thanks for reaching out to SnapReserve™. We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="cf-title">Send Us a Message</div>
              <div className="cf-row">
                <div className="cf-group">
                  <label className="cf-label">First Name</label>
                  <input className="cf-input" type="text" placeholder="First name" value={form.firstName} onChange={e => setForm(p => ({...p, firstName: e.target.value}))} required />
                </div>
                <div className="cf-group">
                  <label className="cf-label">Last Name</label>
                  <input className="cf-input" type="text" placeholder="Last name" value={form.lastName} onChange={e => setForm(p => ({...p, lastName: e.target.value}))} />
                </div>
              </div>
              <div className="cf-group">
                <label className="cf-label">Email Address</label>
                <input className="cf-input" type="email" placeholder="hello@example.com" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} required />
              </div>
              <div className="cf-row">
                <div className="cf-group">
                  <label className="cf-label">I am a...</label>
                  <select className="cf-input" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                    <option>Traveler looking to book stays</option>
                    <option>Hotel owner / manager</option>
                    <option>Private home / villa host</option>
                    <option>Investor / partner</option>
                    <option>Just curious</option>
                  </select>
                </div>
                <div className="cf-group">
                  <label className="cf-label">Country</label>
                  <select className="cf-input" value={form.country} onChange={e => setForm(p => ({...p, country: e.target.value}))}>
                    <option value="">Select country…</option>
                    <option value="us">🇺🇸 United States</option>
                    <option value="gb">🇬🇧 United Kingdom</option>
                    <option value="ca">🇨🇦 Canada</option>
                    <option value="au">🇦🇺 Australia</option>
                    <option value="ae">🇦🇪 UAE</option>
                    <option value="fr">🇫🇷 France</option>
                    <option value="de">🇩🇪 Germany</option>
                    <option value="it">🇮🇹 Italy</option>
                    <option value="es">🇪🇸 Spain</option>
                    <option value="nl">🇳🇱 Netherlands</option>
                    <option value="se">🇸🇪 Sweden</option>
                    <option value="no">🇳🇴 Norway</option>
                    <option value="dk">🇩🇰 Denmark</option>
                    <option value="ch">🇨🇭 Switzerland</option>
                    <option value="pt">🇵🇹 Portugal</option>
                    <option value="tr">🇹🇷 Turkey</option>
                    <option value="sg">🇸🇬 Singapore</option>
                    <option value="jp">🇯🇵 Japan</option>
                    <option value="kr">🇰🇷 South Korea</option>
                    <option value="in">🇮🇳 India</option>
                    <option value="ph">🇵🇭 Philippines</option>
                    <option value="my">🇲🇾 Malaysia</option>
                    <option value="th">🇹🇭 Thailand</option>
                    <option value="id">🇮🇩 Indonesia</option>
                    <option value="nz">🇳🇿 New Zealand</option>
                    <option value="za">🇿🇦 South Africa</option>
                    <option value="ng">🇳🇬 Nigeria</option>
                    <option value="gh">🇬🇭 Ghana</option>
                    <option value="ke">🇰🇪 Kenya</option>
                    <option value="br">🇧🇷 Brazil</option>
                    <option value="mx">🇲🇽 Mexico</option>
                    <option value="ar">🇦🇷 Argentina</option>
                    <option value="co">🇨🇴 Colombia</option>
                    <option value="other">🌍 Other</option>
                  </select>
                </div>
              </div>
              <div className="cf-group" style={{marginBottom:0}}>
                <label className="cf-label">Message <span style={{fontWeight:400,textTransform:'none',letterSpacing:0,color:'#A89880'}}>(optional)</span></label>
                <textarea className="cf-input" placeholder="Tell us about your property, travel plans, or anything else…" value={form.message} onChange={e => setForm(p => ({...p, message: e.target.value}))} />
              </div>
              {formError && (
                <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'10px 14px', fontSize:'0.82rem', color:'#DC2626', marginBottom:12 }}>
                  {formError}
                </div>
              )}
              <button className="cf-submit" type="submit" disabled={submitting || !form.email.trim() || !form.firstName.trim()}>
                {submitting ? 'Sending…' : 'Send Message →'}
              </button>
              <div className="cf-fine">
                By submitting you agree to our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Service</a>.
              </div>
            </form>
          )}
        </div>
      </div>

      {/* GEO STRIP */}
      <div className="geo-strip">
        <div className="eyebrow" style={{justifyContent:'center'}}>Where We Serve</div>
        <h2 className="section-title">Currently in the<br /><em>United States</em></h2>
        <p style={{fontSize:'0.88rem', color:'var(--sr-muted)', lineHeight:1.8, maxWidth:'480px', margin:'0 auto'}}>
          SnapReserve™ is launching with destinations across the United States. International expansion is on the roadmap — sign up to be notified when we reach your region.
        </p>
        <div className="geo-card-inline">
          <span style={{fontSize:'1.6rem'}}>🇺🇸</span>
          <div style={{textAlign:'left'}}>
            <div className="geo-name">United States — Active</div>
            <div className="geo-sub">Hotels &amp; Private Stays · All 50 states</div>
          </div>
          <div className="geo-divider" />
          <span style={{fontSize:'1.6rem', opacity:0.45}}>🌍</span>
          <div style={{textAlign:'left'}}>
            <div className="geo-name" style={{color:'var(--sr-muted)'}}>International — Coming Soon</div>
            <div className="geo-sub">Sign up below to be notified</div>
          </div>
        </div>

        {/* International sign-up */}
        <div style={{ marginTop:40, maxWidth:480, margin:'40px auto 0' }}>
          <div style={{ fontSize:'0.68rem', fontWeight:800, letterSpacing:'0.16em', textTransform:'uppercase', color:'#A89880', marginBottom:10 }}>
            Outside the United States?
          </div>
          <p style={{ fontSize:'0.88rem', color:'var(--sr-muted)', lineHeight:1.7, marginBottom:20 }}>
            We&apos;re expanding internationally. Drop your email and you&apos;ll be the first to know when SnapReserve™ reaches your country.
          </p>
          {intlSubmitted ? (
            <div style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:14, padding:'18px 22px', display:'flex', alignItems:'center', gap:12 }}>
              <span style={{fontSize:'1.4rem'}}>🎉</span>
              <div>
                <div style={{ fontSize:'0.88rem', fontWeight:700, color:'#16a34a' }}>You&apos;re on the international list!</div>
                <div style={{ fontSize:'0.78rem', color:'#A89880', marginTop:2 }}>We&apos;ll email you the moment we go live in your region.</div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleIntlSubmit} style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={intlEmail}
                onChange={e => setIntlEmail(e.target.value)}
                style={{ flex:1, minWidth:200, background:'white', border:'1px solid var(--sr-border2)', borderRadius:100, padding:'12px 20px', fontSize:'0.88rem', fontFamily:'inherit', color:'var(--sr-text)', outline:'none' }}
              />
              <button
                type="submit"
                disabled={intlSubmitting || !intlEmail.trim()}
                style={{ background:'var(--sr-text)', color:'white', border:'none', borderRadius:100, padding:'12px 24px', fontSize:'0.84rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: intlSubmitting ? 0.6 : 1, whiteSpace:'nowrap' }}
              >
                {intlSubmitting ? 'Saving…' : 'Notify Me →'}
              </button>
              {intlError && (
                <div style={{ width:'100%', fontSize:'0.78rem', color:'#DC2626', marginTop:4 }}>{intlError}</div>
              )}
            </form>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <span className="footer-logo"><img src="/logo.png" alt="SnapReserve" /></span>
        <div className="footer-links">
          <a href="/about">About</a>
          <a href="/become-a-host">For Hosts</a>
          <a href="/listings">Explore</a>
          <a href="/contact">Contact</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
        <span className="footer-copy">© 2026 SnapReserve™. All rights reserved.</span>
      </footer>
    </>
  )
}
