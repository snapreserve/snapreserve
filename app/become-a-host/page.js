'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const HOST_TYPES = [
  {
    id: 'hotel',
    icon: '🏨',
    label: 'Hotel or Resort',
    desc: 'You manage a hotel, boutique inn, bed & breakfast, or resort.',
  },
  {
    id: 'property_manager',
    icon: '🏢',
    label: 'Property Manager',
    desc: 'You manage multiple rental properties on behalf of owners.',
  },
  {
    id: 'individual',
    icon: '🏠',
    label: 'Individual Host',
    desc: 'You\'re renting your own home, apartment, villa, or spare room.',
  },
]

const TYPE_LABEL = { hotel: 'Hotel or Resort', property_manager: 'Property Manager', individual: 'Individual Host' }

export default function BecomeAHostPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [checking, setChecking] = useState(true)

  // Form state
  const [hostType, setHostType] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [agreed, setAgreed] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Step 1 validation errors
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login?next=/become-a-host')
        return
      }
      supabase.from('users').select('user_role').eq('id', user.id).maybeSingle().then(({ data }) => {
        if (data?.user_role === 'host') {
          router.replace('/host/dashboard')
        } else if (data?.user_role === 'pending_host') {
          setStep('pending')
          setChecking(false)
        } else {
          setChecking(false)
        }
      })
    })
  }, [])

  function validateStep1() {
    const errs = {}
    if (!hostType) errs.hostType = 'Please select a host type.'
    if (!displayName.trim() || displayName.trim().length < 2) errs.displayName = 'Enter at least 2 characters.'
    if (displayName.trim().length > 100) errs.displayName = 'Max 100 characters.'
    if (!phone.trim() || !/^\+?[\d\s\-().]{7,20}$/.test(phone.trim())) errs.phone = 'Enter a valid phone number.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleContinue() {
    if (validateStep1()) setStep(2)
  }

  async function handleSubmit() {
    if (!agreed) { setError('You must agree to the Host Terms to continue.'); return }
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/become-host', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host_type: hostType, display_name: displayName.trim(), phone: phone.trim() }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error || 'Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    setStep('submitted')
  }

  const inp = {
    width: '100%', padding: '12px 14px', border: '1px solid #E8E2D9',
    borderRadius: '10px', fontSize: '0.92rem', fontFamily: 'inherit',
    background: 'white', outline: 'none', color: '#1A1410',
  }
  const label = {
    display: 'block', fontSize: '0.76rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: '#6B5F54', marginBottom: '7px',
  }
  const errTxt = { fontSize: '0.75rem', color: '#DC2626', marginTop: '5px' }

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF8F5' }}>
      <div style={{ color: '#A89880', fontSize: '0.9rem', fontFamily: 'sans-serif' }}>Loading…</div>
    </div>
  )

  const pendingOrSubmitted = step === 'pending' || step === 'submitted'
  if (pendingOrSubmitted) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; background:#FAF8F5; color:#1A1410; }
        .topbar { background:white; border-bottom:1px solid #E8E2D9; padding:0 40px; height:64px; display:flex; align-items:center; }
        .logo { font-family:'Playfair Display',serif; font-size:1.2rem; font-weight:900; text-decoration:none; color:#1A1410; }
        .logo span { color:#F4601A; }
      `}</style>
      <div className="topbar">
        <a href="/home" className="logo">Snap<span>Reserve</span></a>
      </div>
      <div style={{ maxWidth: '520px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>⏳</div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', fontWeight: 900, marginBottom: '14px' }}>
          {step === 'submitted' ? 'Application submitted!' : 'Application under review'}
        </h1>
        <p style={{ fontSize: '0.92rem', color: '#6B5F54', lineHeight: 1.75, marginBottom: '32px' }}>
          {step === 'submitted'
            ? 'Thank you! Our team will review your host application and get back to you within 1–3 business days.'
            : 'Your host application is currently being reviewed. We\'ll notify you once it\'s approved.'
          }
        </p>
        <div style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px', padding: '24px', marginBottom: '28px', textAlign: 'left' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#A89880', marginBottom: '8px' }}>Status</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: '100px', padding: '6px 16px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FCD34D', display: 'inline-block' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#D97706' }}>Pending Review</span>
          </div>
        </div>
        <a href="/dashboard" style={{ display: 'inline-block', padding: '12px 28px', background: 'linear-gradient(135deg,#F4601A,#FF7A35)', color: 'white', borderRadius: '12px', fontWeight: 700, fontSize: '0.92rem', textDecoration: 'none' }}>
          Back to Dashboard
        </a>
      </div>
    </>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; background:#FAF8F5; color:#1A1410; }
        .topbar { background:white; border-bottom:1px solid #E8E2D9; padding:0 40px; height:64px; display:flex; align-items:center; justify-content:space-between; }
        .logo { font-family:'Playfair Display',serif; font-size:1.2rem; font-weight:900; text-decoration:none; color:#1A1410; }
        .logo span { color:#F4601A; }
        .back-link { font-size:0.84rem; color:#6B5F54; text-decoration:none; }
        .back-link:hover { color:#1A1410; }
        .type-card { background:white; border:2px solid #E8E2D9; border-radius:14px; padding:20px; cursor:pointer; transition:all 0.15s; text-align:left; font-family:inherit; width:100%; }
        .type-card:hover { border-color:#F4601A; background:#FFFAF8; }
        .type-card.selected { border-color:#F4601A; background:#FFF5F0; }
        .type-icon { font-size:1.6rem; margin-bottom:10px; }
        .type-label { font-size:0.92rem; font-weight:700; color:#1A1410; margin-bottom:4px; }
        .type-desc { font-size:0.78rem; color:#6B5F54; line-height:1.5; }
        @media(max-width:640px) { .topbar{padding:0 20px;} .type-grid{grid-template-columns:1fr !important;} }
      `}</style>

      {/* Top bar */}
      <div className="topbar">
        <a href="/home" className="logo">Snap<span>Reserve</span></a>
        {step === 2
          ? <button onClick={() => setStep(1)} className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
          : <a href="/dashboard" className="back-link">← Back to dashboard</a>
        }
      </div>

      {/* Progress */}
      <div style={{ background: 'white', borderBottom: '1px solid #E8E2D9', padding: '0 40px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', gap: '0', height: '4px' }}>
          <div style={{ flex: 1, background: '#F4601A', borderRadius: '0 0 0 4px' }} />
          <div style={{ flex: 1, background: step === 2 || step === 'submitted' ? '#F4601A' : '#E8E2D9', borderRadius: '0 0 4px 0' }} />
        </div>
      </div>

      {/* Form area */}
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* ─── STEP 1 ─── */}
        {step === 1 && (
          <>
            <div style={{ marginBottom: '36px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#F4601A', marginBottom: '10px' }}>
                Step 1 of 2
              </div>
              <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.5px', marginBottom: '10px' }}>
                Tell us about your hosting
              </h1>
              <p style={{ fontSize: '0.9rem', color: '#6B5F54', lineHeight: 1.7 }}>
                This takes about 2 minutes. You can update these details any time from your host profile.
              </p>
            </div>

            {/* Host type */}
            <div style={{ marginBottom: '28px' }}>
              <div style={label}>What type of host are you?</div>
              <div className="type-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                {HOST_TYPES.map(t => (
                  <button
                    key={t.id}
                    className={`type-card${hostType === t.id ? ' selected' : ''}`}
                    onClick={() => { setHostType(t.id); setFieldErrors(e => ({ ...e, hostType: '' })) }}
                    type="button"
                  >
                    <div className="type-icon">{t.icon}</div>
                    <div className="type-label">{t.label}</div>
                    <div className="type-desc">{t.desc}</div>
                  </button>
                ))}
              </div>
              {fieldErrors.hostType && <p style={errTxt}>{fieldErrors.hostType}</p>}
            </div>

            {/* Display name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={label}>
                {hostType === 'individual' ? 'Your hosting name' : 'Business or property name'}
              </label>
              <input
                style={{ ...inp, borderColor: fieldErrors.displayName ? '#DC2626' : '#E8E2D9' }}
                value={displayName}
                onChange={e => { setDisplayName(e.target.value); setFieldErrors(e2 => ({ ...e2, displayName: '' })) }}
                placeholder={
                  hostType === 'hotel' ? 'e.g. Grand Palace Hotel'
                  : hostType === 'property_manager' ? 'e.g. Lakeside Properties LLC'
                  : 'e.g. Alex\'s Beachside Retreat'
                }
                maxLength={100}
              />
              <p style={{ fontSize: '0.72rem', color: '#A89880', marginTop: '5px' }}>
                This is how you'll appear to guests on your listings.
              </p>
              {fieldErrors.displayName && <p style={errTxt}>{fieldErrors.displayName}</p>}
            </div>

            {/* Phone */}
            <div style={{ marginBottom: '36px' }}>
              <label style={label}>Phone number</label>
              <input
                style={{ ...inp, borderColor: fieldErrors.phone ? '#DC2626' : '#E8E2D9' }}
                value={phone}
                onChange={e => { setPhone(e.target.value); setFieldErrors(e2 => ({ ...e2, phone: '' })) }}
                placeholder="+1 (555) 000-0000"
                type="tel"
              />
              <p style={{ fontSize: '0.72rem', color: '#A89880', marginTop: '5px' }}>
                For booking notifications only — never shown to guests.
              </p>
              {fieldErrors.phone && <p style={errTxt}>{fieldErrors.phone}</p>}
            </div>

            <button
              onClick={handleContinue}
              style={{
                width: '100%', background: 'linear-gradient(135deg,#F4601A,#FF7A35)',
                color: 'white', border: 'none', borderRadius: '12px',
                padding: '15px', fontSize: '1rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Continue →
            </button>
          </>
        )}

        {/* ─── STEP 2 ─── */}
        {step === 2 && (
          <>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#F4601A', marginBottom: '10px' }}>
                Step 2 of 2
              </div>
              <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.5px', marginBottom: '10px' }}>
                Review your profile
              </h1>
              <p style={{ fontSize: '0.9rem', color: '#6B5F54', lineHeight: 1.7 }}>
                Confirm your details before we create your host account.
              </p>
            </div>

            {/* Summary card */}
            <div style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px', padding: '24px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'Host type',     value: `${HOST_TYPES.find(t => t.id === hostType)?.icon}  ${TYPE_LABEL[hostType]}` },
                  { label: 'Display name',  value: displayName.trim() },
                  { label: 'Phone',         value: phone.trim() },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #F3F0EB' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#A89880' }}>{row.label}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1A1410' }}>{row.value}</span>
                  </div>
                ))}
                <button
                  onClick={() => setStep(1)}
                  style={{ background: 'none', border: 'none', fontSize: '0.78rem', color: '#F4601A', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0, textAlign: 'left' }}
                >
                  Edit details
                </button>
              </div>
            </div>

            {/* Terms */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', marginBottom: '28px' }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => { setAgreed(e.target.checked); setError('') }}
                style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#F4601A', flexShrink: 0 }}
              />
              <span style={{ fontSize: '0.84rem', color: '#6B5F54', lineHeight: 1.6 }}>
                I have read and agree to SnapReserve's{' '}
                <a href="/host-agreement" style={{ color: '#F4601A', fontWeight: 600 }}>Host Terms & Conditions</a>,
                including the host service fee of 3.2% and the cancellation policy framework.
                I confirm that I have the right to list any properties on this platform.
              </span>
            </label>

            {error && (
              <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '10px', padding: '12px 16px', fontSize: '0.84rem', color: '#DC2626', marginBottom: '20px' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: '100%', background: submitting ? '#D4CEC5' : 'linear-gradient(135deg,#F4601A,#FF7A35)',
                color: 'white', border: 'none', borderRadius: '12px',
                padding: '15px', fontSize: '1rem', fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                transition: 'background 0.2s',
              }}
            >
              {submitting ? 'Creating your host profile…' : 'Create Host Profile'}
            </button>

            <p style={{ fontSize: '0.76rem', color: '#A89880', textAlign: 'center', marginTop: '14px', lineHeight: 1.6 }}>
              No commitment. You can stop hosting at any time from your account settings.
            </p>
          </>
        )}
      </div>
    </>
  )
}
