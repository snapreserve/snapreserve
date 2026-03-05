'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const HOST_TYPES = [
  { id: 'hotel',            icon: '🏨', label: 'Hotel or Resort',   desc: 'You manage a hotel, boutique inn, bed & breakfast, or resort.' },
  { id: 'property_manager', icon: '🏢', label: 'Property Manager',  desc: 'You manage multiple rental properties on behalf of owners.' },
  { id: 'individual',       icon: '🏠', label: 'Individual Host',   desc: "You're renting your own home, apartment, villa, or spare room." },
]

const emptySlot = () => ({ file: null, path: null, uploading: false, error: null, preview: null })

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'DM Sans',-apple-system,sans-serif; background:#f5f0ea; color:#0f0e0c; }
  .bah-nav {
    position:sticky; top:0; z-index:100;
    background:rgba(245,240,234,.92); backdrop-filter:blur(18px);
    border-bottom:1px solid #e0d8ce;
    padding:0 40px; height:60px;
    display:flex; align-items:center; justify-content:space-between;
  }
  .bah-logo { font-size:15px; font-weight:700; text-decoration:none; color:#0f0e0c; }
  .bah-logo span { color:#e8622a; }
  .bah-steps { display:flex; align-items:center; gap:6px; }
  .bah-step { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:600; color:#9ca3af; }
  .bah-step.done { color:#16a34a; }
  .bah-step.active { color:#e8622a; }
  .bah-dot { width:20px; height:20px; border-radius:50%; border:1.5px solid #ddd5c8; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; flex-shrink:0; }
  .bah-step.done .bah-dot { background:#16a34a; border-color:#16a34a; color:#fff; }
  .bah-step.active .bah-dot { background:#e8622a; border-color:#e8622a; color:#fff; }
  .bah-sep { color:#e0d8ce; font-size:13px; }
  .bah-main { max-width:660px; margin:0 auto; padding:56px 24px 100px; }
  .bah-eyebrow { font-size:9px; font-weight:700; letter-spacing:.22em; text-transform:uppercase; color:#e8622a; margin-bottom:14px; display:flex; align-items:center; gap:8px; }
  .bah-eyebrow::before { content:''; width:20px; height:1px; background:#e8622a; }
  .bah-h { font-family:'Playfair Display',serif; font-size:38px; font-weight:900; line-height:1.05; letter-spacing:-.02em; color:#0f0e0c; margin-bottom:12px; }
  .bah-h em { color:#e8622a; font-style:italic; }
  .bah-sub { font-size:14px; color:#6b7280; line-height:1.75; margin-bottom:36px; max-width:480px; }
  /* Step 1 styles */
  .type-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:28px; }
  .type-card { background:white; border:2px solid #e0d8ce; border-radius:14px; padding:20px 16px; cursor:pointer; transition:all .15s; text-align:left; font-family:inherit; width:100%; }
  .type-card:hover { border-color:#e8622a; background:#fffaf8; }
  .type-card.sel { border-color:#e8622a; background:rgba(232,98,42,.04); }
  .tc-icon { font-size:1.6rem; margin-bottom:10px; display:block; }
  .tc-label { font-size:0.9rem; font-weight:700; color:#0f0e0c; margin-bottom:4px; }
  .tc-desc { font-size:0.74rem; color:#6b7280; line-height:1.5; }
  .field-label { display:block; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#6b7280; margin-bottom:7px; }
  .field-input { width:100%; padding:12px 14px; border:1px solid #e0d8ce; border-radius:10px; font-size:0.9rem; font-family:inherit; background:white; outline:none; color:#0f0e0c; transition:border-color .14s; }
  .field-input:focus { border-color:#e8622a; }
  .field-input.err { border-color:#dc2626; }
  .field-hint { font-size:0.71rem; color:#9ca3af; margin-top:5px; }
  .field-err { font-size:0.73rem; color:#dc2626; margin-top:4px; }
  .submit-btn { width:100%; padding:15px; border-radius:10px; background:#e8622a; border:none; color:white; font-family:'DM Sans',sans-serif; font-size:14px; font-weight:700; cursor:pointer; transition:all .2s; }
  .submit-btn:hover { background:#d4561f; transform:translateY(-1px); box-shadow:0 8px 24px rgba(232,98,42,.28); }
  .submit-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; box-shadow:none; }
  /* Step 2 styles */
  .why-strip { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:32px; }
  .why-chip { display:flex; align-items:center; gap:6px; padding:6px 11px; background:white; border:1px solid #e0d8ce; border-radius:7px; font-size:10px; font-weight:600; color:#6b7280; }
  .doc-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:28px; }
  .doc-card { border:2px solid #e0d8ce; border-radius:12px; background:white; padding:18px 16px; cursor:pointer; transition:all .18s; position:relative; }
  .doc-card:hover { border-color:#ccc3b8; }
  .doc-card.sel { border-color:#e8622a; background:rgba(232,98,42,.03); }
  .doc-check { position:absolute; top:12px; right:12px; width:20px; height:20px; border-radius:50%; border:1.5px solid #e0d8ce; display:flex; align-items:center; justify-content:center; font-size:9px; }
  .doc-card.sel .doc-check { background:#e8622a; border-color:#e8622a; color:white; }
  .doc-icon { font-size:28px; margin-bottom:12px; display:block; }
  .doc-title { font-size:14px; font-weight:700; color:#0f0e0c; margin-bottom:3px; }
  .doc-desc { font-size:11px; color:#6b7280; line-height:1.5; }
  .upload-section-label { font-size:9px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#6b7280; margin-bottom:10px; }
  .upload-sides { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:18px; }
  .upload-sides.single { grid-template-columns:1fr; }
  .upload-box {
    border:2px dashed #e0d8ce; border-radius:12px; background:white;
    min-height:150px; display:flex; flex-direction:column; align-items:center;
    justify-content:center; cursor:pointer; transition:all .18s; position:relative;
    padding:20px 16px; text-align:center;
  }
  .upload-box:hover, .upload-box.drag { border-color:#e8622a; background:rgba(232,98,42,.025); }
  .upload-box.done { border-style:solid; border-color:#16a34a; background:rgba(22,163,74,.03); }
  .upload-box.uploading { border-color:#e8622a; background:rgba(232,98,42,.025); }
  .ub-corner-label { position:absolute; top:10px; left:12px; font-size:7px; font-weight:700; letter-spacing:.15em; text-transform:uppercase; color:#9ca3af; }
  .ub-icon { font-size:28px; margin-bottom:8px; }
  .ub-title { font-size:12px; font-weight:700; color:#0f0e0c; margin-bottom:3px; }
  .ub-sub { font-size:10px; color:#6b7280; line-height:1.5; margin-bottom:10px; }
  .ub-btn { display:inline-flex; align-items:center; gap:5px; padding:7px 14px; background:#0f0e0c; border-radius:7px; color:white; font-size:11px; font-weight:700; cursor:pointer; border:none; font-family:'DM Sans',sans-serif; }
  .up-img { width:100%; max-width:200px; height:85px; border-radius:7px; object-fit:cover; border:1px solid #e0d8ce; margin-bottom:8px; }
  .up-status { display:flex; align-items:center; gap:4px; font-size:11px; font-weight:700; color:#16a34a; }
  .up-reupload { font-size:10px; color:#9ca3af; text-decoration:underline; cursor:pointer; margin-top:4px; background:none; border:none; font-family:inherit; }
  .up-error { font-size:10px; color:#dc2626; margin-top:4px; }
  .up-spin { font-size:13px; color:#e8622a; animation:spin .8s linear infinite; margin-bottom:6px; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .selfie-box { border:2px dashed #e0d8ce; border-radius:12px; background:white; padding:18px; display:flex; align-items:flex-start; gap:16px; cursor:pointer; transition:all .18s; margin-bottom:18px; }
  .selfie-box:hover, .selfie-box.drag { border-color:#e8622a; background:rgba(232,98,42,.025); }
  .selfie-box.done { border-style:solid; border-color:#16a34a; background:rgba(22,163,74,.03); }
  .selfie-av { width:60px; height:60px; border-radius:50%; flex-shrink:0; border:2px solid #e0d8ce; display:flex; align-items:center; justify-content:center; background:#ede7de; font-size:24px; overflow:hidden; }
  .selfie-av img { width:100%; height:100%; object-fit:cover; }
  .selfie-text { flex:1; }
  .selfie-title { font-size:13px; font-weight:700; color:#0f0e0c; margin-bottom:3px; }
  .selfie-desc { font-size:11px; color:#6b7280; line-height:1.55; margin-bottom:8px; }
  .selfie-tips { display:flex; flex-direction:column; gap:3px; margin-bottom:10px; }
  .selfie-tip { font-size:10px; color:#9ca3af; display:flex; align-items:center; gap:5px; }
  .selfie-actions { display:flex; gap:7px; }
  .sb-btn { padding:6px 12px; border-radius:7px; font-family:'DM Sans',sans-serif; font-size:10px; font-weight:700; cursor:pointer; border:1px solid; transition:all .14s; }
  .sb-cam { background:#e8622a; border-color:#e8622a; color:white; }
  .sb-upl { background:transparent; border-color:#e0d8ce; color:#6b7280; }
  .tips-card { background:rgba(37,99,235,.05); border:1px solid rgba(37,99,235,.2); border-radius:10px; padding:14px; margin-bottom:20px; }
  .tips-title { font-size:10px; font-weight:700; color:#2563eb; margin-bottom:8px; }
  .tips-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
  .tips-item { display:flex; align-items:flex-start; gap:6px; font-size:10px; color:#6b7280; line-height:1.5; }
  .security-note { background:white; border:1px solid #e0d8ce; border-radius:10px; padding:13px 16px; margin-bottom:24px; display:flex; align-items:flex-start; gap:11px; font-size:11px; color:#6b7280; line-height:1.6; }
  .err-banner { background:rgba(220,38,38,.06); border:1px solid rgba(220,38,38,.15); border-radius:10px; padding:12px 16px; font-size:0.82rem; color:#dc2626; margin-bottom:16px; }
  @media(max-width:640px) {
    .bah-nav { padding:0 20px; }
    .type-grid, .doc-grid, .upload-sides, .tips-grid { grid-template-columns:1fr !important; }
    .bah-steps { display:none; }
  }
`

export default function BecomeAHostPage() {
  const router = useRouter()
  const [step, setStep]         = useState(1)
  const [checking, setChecking] = useState(true)
  const [userId, setUserId]     = useState(null)

  // Step 1
  const [hostType, setHostType]         = useState('')
  const [displayName, setDisplayName]   = useState('')
  const [phone, setPhone]               = useState('')
  const [fieldErrors, setFieldErrors]   = useState({})

  // Step 2
  const [idType, setIdType] = useState('driver_license')
  const [uploads, setUploads] = useState({
    idFront:   emptySlot(),
    idBack:    emptySlot(),
    idPassport:emptySlot(),
    idSelfie:  emptySlot(),
  })

  const refs = {
    idFront:    useRef(null),
    idBack:     useRef(null),
    idPassport: useRef(null),
    idSelfie:   useRef(null),
  }

  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login?next=/become-a-host'); return }
      setUserId(user.id)
      supabase.from('users').select('user_role').eq('id', user.id).maybeSingle().then(({ data }) => {
        if (data?.user_role === 'host')         router.replace('/host/dashboard')
        else if (data?.user_role === 'pending_host') { setStep('pending'); setChecking(false) }
        else setChecking(false)
      })
    })
  }, [])

  // ── Validation ─────────────────────────────────────────────────
  function validateStep1() {
    const errs = {}
    if (!hostType) errs.hostType = 'Please select a host type.'
    if (!displayName.trim() || displayName.trim().length < 2) errs.displayName = 'Enter at least 2 characters.'
    if (displayName.trim().length > 100) errs.displayName = 'Max 100 characters.'
    if (!phone.trim() || !/^\+?[\d\s\-().]{7,20}$/.test(phone.trim())) errs.phone = 'Enter a valid phone number.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  function isStep2Valid() {
    if (idType === 'driver_license')
      return uploads.idFront.path && uploads.idBack.path && uploads.idSelfie.path
    return uploads.idPassport.path && uploads.idSelfie.path
  }

  // ── File upload ─────────────────────────────────────────────────
  async function uploadFile(slot, file) {
    const ext  = file.name.split('.').pop().toLowerCase() || 'jpg'
    const path = `${userId}/${slot}-${Date.now()}.${ext}`
    const preview = URL.createObjectURL(file)
    setUploads(prev => ({ ...prev, [slot]: { file, path: null, uploading: true, error: null, preview } }))

    const { data, error } = await supabase.storage
      .from('host-id-documents')
      .upload(path, file, { upsert: true })

    if (error) {
      setUploads(prev => ({ ...prev, [slot]: { file, path: null, uploading: false, error: error.message, preview } }))
      return
    }
    setUploads(prev => ({ ...prev, [slot]: { file, path: data.path, uploading: false, error: null, preview } }))
  }

  function handleFileChange(slot, e) {
    const file = e.target.files?.[0]
    if (!file) return
    uploadFile(slot, file)
    e.target.value = ''
  }

  function resetSlot(slot) {
    setUploads(prev => ({ ...prev, [slot]: emptySlot() }))
  }

  // ── Submit ──────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!isStep2Valid()) { setError('Please upload all required documents before submitting.'); return }
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/become-host', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host_type:      hostType,
        display_name:   displayName.trim(),
        phone:          phone.trim(),
        id_type:        idType,
        id_front_url:   uploads.idFront.path   || null,
        id_back_url:    uploads.idBack.path    || null,
        id_passport_url:uploads.idPassport.path|| null,
        id_selfie_url:  uploads.idSelfie.path  || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error || 'Something went wrong. Please try again.'); setSubmitting(false); return }
    setStep('submitted')
  }

  // ── Upload box component ────────────────────────────────────────
  function UploadBox({ slot, label, icon, title, sub }) {
    const u = uploads[slot]
    return (
      <div
        className={`upload-box${u.uploading ? ' uploading' : u.path ? ' done' : ''}`}
        onClick={() => !u.uploading && refs[slot].current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag') }}
        onDragLeave={e => e.currentTarget.classList.remove('drag')}
        onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('drag'); const f = e.dataTransfer.files[0]; if (f) uploadFile(slot, f) }}
      >
        {label && <span className="ub-corner-label">{label}</span>}
        {u.uploading ? (
          <>
            <div className="up-spin">⟳</div>
            <div className="ub-title">Uploading…</div>
          </>
        ) : u.path ? (
          <>
            {u.preview && <img src={u.preview} alt="" className="up-img" />}
            <div className="up-status">✓ Uploaded</div>
            <button className="up-reupload" onClick={e => { e.stopPropagation(); resetSlot(slot) }}>Re-upload</button>
          </>
        ) : (
          <>
            <div className="ub-icon">{icon}</div>
            <div className="ub-title">{title}</div>
            <div className="ub-sub">{sub}</div>
            <button className="ub-btn">📁 Upload</button>
          </>
        )}
        {u.error && <div className="up-error">{u.error}</div>}
        <input
          ref={refs[slot]}
          type="file"
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          onChange={e => handleFileChange(slot, e)}
        />
      </div>
    )
  }

  // ── Loading ─────────────────────────────────────────────────────
  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f0ea' }}>
      <div style={{ color: '#9ca3af', fontSize: '0.9rem', fontFamily: 'sans-serif' }}>Loading…</div>
    </div>
  )

  // ── Pending / Submitted state ───────────────────────────────────
  if (step === 'pending' || step === 'submitted') return (
    <>
      <style>{STYLES}</style>
      <nav className="bah-nav">
        <a href="/home" className="bah-logo">Snap<span>Reserve</span></a>
      </nav>
      <div className="bah-main" style={{ textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(217,119,6,.1)', border: '2px solid rgba(217,119,6,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 24px' }}>⏳</div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', fontWeight: 900, marginBottom: 12 }}>
          {step === 'submitted' ? 'Application submitted!' : 'Under review.'}
        </h1>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(217,119,6,.1)', border: '1px solid rgba(217,119,6,.25)', borderRadius: 100, padding: '5px 14px', fontSize: '0.78rem', fontWeight: 700, color: '#d97706', marginBottom: 20 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
          Awaiting Admin Review
        </div>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.75, maxWidth: 400, margin: '0 auto 32px' }}>
          {step === 'submitted'
            ? 'Your documents have been submitted. Our team will review your identity within 24–48 hours and get back to you by email.'
            : "Your host application and ID documents are currently being reviewed. We'll notify you once it's approved."
          }
        </p>
        <div style={{ background: 'white', border: '1px solid #e0d8ce', borderRadius: 12, padding: '14px 20px', display: 'inline-block', marginBottom: 28 }}>
          <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.15em', color: '#9ca3af', marginBottom: 4 }}>What happens next</div>
          <div style={{ fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.7, textAlign: 'left' }}>
            1. Admin reviews your ID documents (24–48h)<br />
            2. You receive an email with the decision<br />
            3. Upon approval — your host dashboard activates
          </div>
        </div>
        <div><a href="/dashboard" style={{ display: 'inline-block', padding: '12px 28px', background: '#e8622a', color: 'white', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>Back to Dashboard</a></div>
      </div>
    </>
  )

  // ── Main form ───────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>

      {/* Nav */}
      <nav className="bah-nav">
        <a href="/home" className="bah-logo">Snap<span>Reserve</span></a>
        <div className="bah-steps">
          <div className={`bah-step ${step >= 1 ? (step > 1 ? 'done' : 'active') : ''}`}>
            <div className="bah-dot">{step > 1 ? '✓' : '1'}</div>
            Application
          </div>
          <div className="bah-sep">›</div>
          <div className={`bah-step ${step === 2 ? 'active' : ''}`}>
            <div className="bah-dot">2</div>
            Identity Verification
          </div>
          <div className="bah-sep">›</div>
          <div className="bah-step">
            <div className="bah-dot">3</div>
            Review
          </div>
        </div>
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
          {step === 2 ? (
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontFamily: 'inherit', fontSize: 11 }}>← Back</button>
          ) : (
            <a href="/dashboard" style={{ color: '#9ca3af', textDecoration: 'none' }}>← Dashboard</a>
          )}
        </div>
      </nav>

      <div className="bah-main">

        {/* ─── STEP 1 ─── */}
        {step === 1 && (
          <>
            <div className="bah-eyebrow">Host Application — Step 1 of 2</div>
            <h1 className="bah-h">Tell us about<br /><em>your hosting.</em></h1>
            <p className="bah-sub">This takes about 2 minutes. You'll verify your identity in the next step.</p>

            {/* Host type */}
            <div style={{ marginBottom: 8 }}>
              <div className="field-label">What type of host are you? <span style={{ color: '#e8622a' }}>*</span></div>
            </div>
            <div className="type-grid">
              {HOST_TYPES.map(t => (
                <button
                  key={t.id}
                  className={`type-card${hostType === t.id ? ' sel' : ''}`}
                  onClick={() => { setHostType(t.id); setFieldErrors(e => ({ ...e, hostType: '' })) }}
                  type="button"
                >
                  <span className="tc-icon">{t.icon}</span>
                  <div className="tc-label">{t.label}</div>
                  <div className="tc-desc">{t.desc}</div>
                </button>
              ))}
            </div>
            {fieldErrors.hostType && <p className="field-err" style={{ marginTop: -16, marginBottom: 20 }}>{fieldErrors.hostType}</p>}

            {/* Display name */}
            <div style={{ marginBottom: 20 }}>
              <label className="field-label">
                {hostType === 'individual' ? 'Your hosting name' : 'Business or property name'} <span style={{ color: '#e8622a' }}>*</span>
              </label>
              <input
                className={`field-input${fieldErrors.displayName ? ' err' : ''}`}
                value={displayName}
                onChange={e => { setDisplayName(e.target.value); setFieldErrors(ev => ({ ...ev, displayName: '' })) }}
                placeholder={hostType === 'hotel' ? 'e.g. Grand Palace Hotel' : hostType === 'property_manager' ? 'e.g. Lakeside Properties LLC' : "e.g. Alex's Beachside Retreat"}
                maxLength={100}
              />
              <p className="field-hint">This is how you'll appear to guests on your listings.</p>
              {fieldErrors.displayName && <p className="field-err">{fieldErrors.displayName}</p>}
            </div>

            {/* Phone */}
            <div style={{ marginBottom: 36 }}>
              <label className="field-label">Phone number <span style={{ color: '#e8622a' }}>*</span></label>
              <input
                className={`field-input${fieldErrors.phone ? ' err' : ''}`}
                value={phone}
                onChange={e => { setPhone(e.target.value); setFieldErrors(ev => ({ ...ev, phone: '' })) }}
                placeholder="+1 (555) 000-0000"
                type="tel"
              />
              <p className="field-hint">For booking notifications only — never shown to guests.</p>
              {fieldErrors.phone && <p className="field-err">{fieldErrors.phone}</p>}
            </div>

            <button className="submit-btn" onClick={() => { if (validateStep1()) setStep(2) }}>
              Continue → Identity Verification
            </button>
          </>
        )}

        {/* ─── STEP 2: ID VERIFICATION ─── */}
        {step === 2 && (
          <>
            <div className="bah-eyebrow">Identity Verification — Step 2 of 2</div>
            <h1 className="bah-h">Verify your<br /><em>identity.</em></h1>
            <p className="bah-sub">To protect our guests and community, all hosts must verify their identity before going live. This only takes a couple of minutes.</p>

            {/* Why chips */}
            <div className="why-strip">
              <div className="why-chip">🔒 256-bit encrypted</div>
              <div className="why-chip">🙈 Never shared publicly</div>
              <div className="why-chip">✅ One-time only</div>
              <div className="why-chip">⚡ 24–48h review</div>
            </div>

            {/* ID type selector */}
            <div className="upload-section-label">Choose your ID type <span style={{ color: '#e8622a' }}>*</span></div>
            <div className="doc-grid">
              <div className={`doc-card${idType === 'driver_license' ? ' sel' : ''}`} onClick={() => setIdType('driver_license')}>
                <div className="doc-check">{idType === 'driver_license' ? '✓' : ''}</div>
                <span className="doc-icon">🪪</span>
                <div className="doc-title">Driver's License</div>
                <div className="doc-desc">US or international driving licence — front and back required</div>
              </div>
              <div className={`doc-card${idType === 'passport' ? ' sel' : ''}`} onClick={() => setIdType('passport')}>
                <div className="doc-check">{idType === 'passport' ? '✓' : ''}</div>
                <span className="doc-icon">📘</span>
                <div className="doc-title">Passport</div>
                <div className="doc-desc">Valid passport — photo/data page only required</div>
              </div>
            </div>

            {/* Upload panels */}
            {idType === 'driver_license' ? (
              <>
                <div className="upload-section-label">Upload your Driver's License <span style={{ color: '#e8622a' }}>*</span></div>
                <div className="upload-sides">
                  <UploadBox slot="idFront"   label="FRONT SIDE" icon="🪪" title="Front of License" sub="Photo must be clear, well-lit, all corners visible" />
                  <UploadBox slot="idBack"    label="BACK SIDE"  icon="🔄" title="Back of License"  sub="Barcode must be fully visible and unobscured" />
                </div>
              </>
            ) : (
              <>
                <div className="upload-section-label">Upload your Passport <span style={{ color: '#e8622a' }}>*</span></div>
                <div className="upload-sides single">
                  <UploadBox slot="idPassport" label="PHOTO / DATA PAGE" icon="📘" title="Passport photo page" sub="The page with your photo, name, date of birth, and MRZ lines at the bottom" />
                </div>
              </>
            )}

            {/* Selfie */}
            <div className="upload-section-label">Selfie with your ID <span style={{ color: '#e8622a' }}>*</span></div>
            {uploads.idSelfie.path ? (
              <div className="selfie-box done" style={{ cursor: 'default' }}>
                <div className="selfie-av">
                  {uploads.idSelfie.preview && <img src={uploads.idSelfie.preview} alt="" />}
                </div>
                <div className="selfie-text">
                  <div className="selfie-title" style={{ color: '#16a34a' }}>✓ Selfie uploaded</div>
                  <div className="selfie-desc">Looks good! Your selfie has been uploaded successfully.</div>
                  <button className="up-reupload" onClick={() => resetSlot('idSelfie')}>Re-upload</button>
                </div>
                <input ref={refs.idSelfie} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileChange('idSelfie', e)} />
              </div>
            ) : (
              <div
                className={`selfie-box${uploads.idSelfie.uploading ? '' : ''}`}
                onClick={() => refs.idSelfie.current?.click()}
              >
                <div className="selfie-av">🤳</div>
                <div className="selfie-text">
                  <div className="selfie-title">Hold up your ID next to your face</div>
                  <div className="selfie-desc">Take a photo holding your ID document next to your face so we can confirm it's really you.</div>
                  <div className="selfie-tips">
                    <div className="selfie-tip">📸 Good lighting — no shadows across face or ID</div>
                    <div className="selfie-tip">🪪 Full ID must be visible and readable</div>
                    <div className="selfie-tip">😐 Face must be clearly visible and unobscured</div>
                  </div>
                  {uploads.idSelfie.uploading ? (
                    <div style={{ fontSize: 11, color: '#e8622a', fontWeight: 600 }}>⟳ Uploading…</div>
                  ) : (
                    <div className="selfie-actions" onClick={e => e.stopPropagation()}>
                      <button className="sb-btn sb-cam" onClick={() => refs.idSelfie.current?.click()}>📷 Take Photo</button>
                      <button className="sb-btn sb-upl" onClick={() => refs.idSelfie.current?.click()}>📁 Upload File</button>
                    </div>
                  )}
                  {uploads.idSelfie.error && <div className="up-error">{uploads.idSelfie.error}</div>}
                </div>
                <input ref={refs.idSelfie} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileChange('idSelfie', e)} />
              </div>
            )}

            {/* Tips */}
            <div className="tips-card">
              <div className="tips-title">💡 Tips for a successful verification</div>
              <div className="tips-grid">
                <div className="tips-item"><span>☀️</span> Use natural or bright overhead light — avoid flash glare on the ID</div>
                <div className="tips-item"><span>📐</span> Place ID flat on a dark surface — all four corners must be visible</div>
                <div className="tips-item"><span>🔍</span> Make sure text and photo are sharp and in focus</div>
                <div className="tips-item"><span>📵</span> Do not use screenshots or photos of photos — original only</div>
              </div>
            </div>

            {/* Security note */}
            <div className="security-note">
              <span style={{ fontSize: 18, flexShrink: 0 }}>🔒</span>
              <div>Your documents are encrypted with 256-bit SSL and stored in a secure vault. They are <strong>never</strong> displayed publicly or shared with third parties. Only authorised SnapReserve admins can access them for verification purposes.</div>
            </div>

            {error && <div className="err-banner">{error}</div>}

            <button className="submit-btn" disabled={submitting || !isStep2Valid()} onClick={handleSubmit}>
              {submitting ? 'Submitting…' : '🔒 Submit for Verification'}
            </button>
            <p style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', marginTop: 10, lineHeight: 1.7 }}>
              By submitting you confirm all documents are genuine. Review typically takes 24–48 hours.
            </p>
          </>
        )}

      </div>
    </>
  )
}
