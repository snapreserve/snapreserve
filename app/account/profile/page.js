'use client'
import { useState, useEffect } from 'react'

const AVATAR_EMOJIS = ['🏙️', '🌆', '🌇', '🌃', '🌉', '🗽', '🗼', '🏰', '🏯', '⛩️', '🌊', '🏝️', '🗻', '🌴', '🏔️', '🌁']

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
  'France', 'Spain', 'Italy', 'Netherlands', 'Japan', 'South Korea',
  'Singapore', 'United Arab Emirates', 'Saudi Arabia', 'Brazil', 'Mexico',
  'India', 'China', 'South Africa', 'Nigeria', 'Other',
]

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  .pf-shell { display:grid; grid-template-columns:220px 1fr; gap:20px; align-items:start; max-width:900px; }
  .pf-card  { background:var(--sr-surface); border:1px solid var(--sr-border2); border-radius:16px; padding:24px; }
  .pf-form-card { background:var(--sr-surface); border:1px solid var(--sr-border2); border-radius:16px; padding:28px; }
  .pf-av   { width:72px; height:72px; border-radius:50%; background:var(--sr-orange); display:flex; align-items:center; justify-content:center; font-size:1.8rem; font-weight:700; color:#fff; margin:0 auto 12px; cursor:pointer; overflow:hidden; border:3px solid var(--sr-border2); transition:border-color .15s; }
  .pf-av:hover { border-color:var(--sr-orange); }
  .pf-name { font-size:0.96rem; font-weight:800; color:var(--sr-text); text-align:center; margin-bottom:2px; }
  .pf-since { font-size:0.7rem; color:var(--sr-sub); text-align:center; margin-bottom:14px; }
  .pf-badges { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-bottom:16px; }
  .pf-badge { padding:3px 10px; border-radius:100px; font-size:0.7rem; font-weight:700; }
  .pf-badge.verified  { background:rgba(52,211,153,0.1); color:#34D399; border:1px solid rgba(52,211,153,0.3); }
  .pf-badge.host      { background:rgba(244,96,26,0.1);  color:var(--sr-orange); border:1px solid rgba(244,96,26,0.25); }
  .pf-badge.traveler  { background:rgba(96,165,250,0.1); color:#60A5FA; border:1px solid rgba(96,165,250,0.3); }
  .pf-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px; }
  .pf-stat  { background:var(--sr-bg); border-radius:10px; padding:10px; text-align:center; }
  .pf-sv    { font-size:1.2rem; font-weight:800; color:var(--sr-text); line-height:1; }
  .pf-sl    { font-size:0.62rem; font-weight:600; color:var(--sr-sub); text-transform:uppercase; letter-spacing:.07em; margin-top:3px; }
  .pf-avatar-btn { width:100%; background:none; border:1px solid var(--sr-border2); border-radius:8px; padding:7px 12px; font-size:0.75rem; font-weight:600; color:var(--sr-muted); cursor:pointer; font-family:inherit; transition:all .14s; }
  .pf-avatar-btn:hover { border-color:var(--sr-orange); color:var(--sr-orange); }
  .pf-sec-title { font-size:0.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--sr-sub); margin-bottom:16px; }
  .pf-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .pf-field { display:flex; flex-direction:column; gap:5px; margin-bottom:16px; }
  .pf-label { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--sr-sub); }
  .pf-input { width:100%; padding:10px 13px; border:1.5px solid var(--sr-border2); border-radius:9px; font-size:0.88rem; font-family:inherit; background:var(--sr-bg); outline:none; color:var(--sr-text); transition:border-color .15s; }
  .pf-input:focus { border-color:var(--sr-orange); }
  .pf-input[readonly] { opacity:.55; cursor:default; }
  .pf-input-note { font-size:0.68rem; color:var(--sr-sub); margin-top:3px; }
  .pf-save { background:var(--sr-orange); color:#fff; border:none; border-radius:10px; padding:11px 26px; font-size:0.88rem; font-weight:700; cursor:pointer; font-family:inherit; transition:opacity .15s; }
  .pf-save:disabled { opacity:.5; cursor:not-allowed; }
  .pf-host-cta { display:flex; align-items:center; justify-content:space-between; gap:16px; background:var(--sr-surface); border:1px solid var(--sr-border2); border-radius:16px; padding:20px 24px; max-width:900px; margin-top:20px; }
  .pf-emoji-picker { background:var(--sr-surface); border:1px solid var(--sr-border2); border-radius:14px; padding:18px; margin-bottom:20px; max-width:900px; }
  .pf-emoji-grid { display:grid; grid-template-columns:repeat(8,1fr); gap:8px; }
  .pf-emoji-btn { width:38px; height:38px; border-radius:9px; border:2px solid transparent; background:var(--sr-bg); font-size:1.35rem; cursor:pointer; padding:0; transition:all .12s; }
  .pf-emoji-btn:hover { border-color:var(--sr-orange); }
  .pf-emoji-btn.sel { border-color:var(--sr-orange); background:rgba(244,96,26,0.08); }
  @media(max-width:720px) { .pf-shell { grid-template-columns:1fr; } .pf-grid2 { grid-template-columns:1fr; } }
`

export default function ProfilePage() {
  const [profile,     setProfile]     = useState(null)
  const [form,        setForm]        = useState({ first_name: '', last_name: '', phone: '', city: '', country: '' })
  const [avatarUrl,   setAvatarUrl]   = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState('')
  const [pickerOpen,  setPickerOpen]  = useState(false)
  const [emojiSaving, setEmojiSaving] = useState(false)

  useEffect(() => {
    fetch('/api/account/profile')
      .then(r => r.json())
      .then(data => {
        if (!data || data.error) { setLoading(false); return }
        setProfile(data)
        setForm({
          first_name: data.first_name ?? '',
          last_name:  data.last_name  ?? '',
          phone:      data.phone      ?? '',
          city:       data.city       ?? '',
          country:    data.country    ?? '',
        })
        setAvatarUrl(data.avatar_url ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleEmojiSelect(emoji) {
    if (emojiSaving) return
    setEmojiSaving(true)
    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: emoji }),
    })
    setEmojiSaving(false)
    if (res.ok) { setAvatarUrl(emoji); setPickerOpen(false) }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)
    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json.error || 'Failed to save'); return }
    setSaved(true)
    setProfile(p => ({ ...p, full_name: [form.first_name, form.last_name].filter(Boolean).join(' ') }))
    setTimeout(() => setSaved(false), 3000)
  }

  const isEmoji    = avatarUrl && !avatarUrl.startsWith('http')
  const initials   = [form.first_name?.[0], form.last_name?.[0]].filter(Boolean).join('').toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'
  const displayName = [form.first_name, form.last_name].filter(Boolean).join(' ') || profile?.email || 'My Account'
  const isVerified  = profile?.verification_status === 'verified'
  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--sr-sub)', fontSize: '0.9rem', padding: '40px 0' }}>
      <div style={{ width: 18, height: 18, border: '2px solid var(--sr-border2)', borderTopColor: 'var(--sr-orange)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      Loading profile…
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <>
      <style>{STYLES}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--sr-text)', marginBottom: 4, letterSpacing: '-0.02em' }}>
          Profile &amp; Settings
        </h1>
        <p style={{ fontSize: '0.84rem', color: 'var(--sr-sub)' }}>
          Manage your personal information and preferences.
        </p>
      </div>

      <div className="pf-shell">
        {/* Left: profile card */}
        <div className="pf-card">
          {/* Avatar */}
          <div
            className="pf-av"
            onClick={() => setPickerOpen(o => !o)}
            title="Choose avatar"
            style={{
              background: isEmoji || avatarUrl?.startsWith('http') ? 'transparent' : 'var(--sr-orange)',
              fontSize: isEmoji ? '2rem' : '1.4rem',
              boxShadow: pickerOpen ? '0 0 0 3px var(--sr-orange)' : undefined,
            }}
          >
            {isEmoji ? avatarUrl
              : avatarUrl?.startsWith('http') ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>

          <div className="pf-name">{displayName}</div>
          {memberSince && <div className="pf-since">Member since {memberSince}</div>}

          {/* Badges */}
          <div className="pf-badges">
            {isVerified && <span className="pf-badge verified">✓ Verified</span>}
            {profile?.is_host && <span className="pf-badge host">🏠 Host</span>}
            {(profile?.booking_count ?? 0) > 0 && <span className="pf-badge traveler">✈️ Traveler</span>}
          </div>

          {/* Stats */}
          <div className="pf-stats">
            <div className="pf-stat">
              <div className="pf-sv">{profile?.booking_count ?? 0}</div>
              <div className="pf-sl">Trips</div>
            </div>
            <div className="pf-stat">
              <div className="pf-sv">{profile?.saved_count ?? 0}</div>
              <div className="pf-sl">Saved</div>
            </div>
            <div className="pf-stat" style={{ gridColumn: '1/-1' }}>
              <div className="pf-sv">
                ${(profile?.total_spent ?? 0) >= 1000
                  ? `${((profile?.total_spent ?? 0) / 1000).toFixed(1)}k`
                  : (profile?.total_spent ?? 0)}
              </div>
              <div className="pf-sl">Total Spent</div>
            </div>
          </div>

          <button className="pf-avatar-btn" onClick={() => setPickerOpen(o => !o)}>
            {pickerOpen ? 'Close picker' : '🎨 Choose avatar'}
          </button>
        </div>

        {/* Right: form */}
        <div className="pf-form-card">
          <div className="pf-sec-title">Personal Information</div>
          <form onSubmit={handleSave}>
            <div className="pf-grid2">
              <div className="pf-field">
                <label className="pf-label">First Name</label>
                <input className="pf-input" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div className="pf-field">
                <label className="pf-label">Last Name</label>
                <input className="pf-input" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>

            <div className="pf-field">
              <label className="pf-label">Email Address</label>
              <input className="pf-input" type="email" value={profile?.email ?? ''} readOnly />
              <div className="pf-input-note">To change your email, contact support.</div>
            </div>

            <div className="pf-field">
              <label className="pf-label">Phone Number</label>
              <input className="pf-input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>

            <div className="pf-grid2">
              <div className="pf-field">
                <label className="pf-label">City</label>
                <input className="pf-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="pf-field">
                <label className="pf-label">Country</label>
                <select
                  className="pf-input"
                  value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Select country…</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#F87171', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button type="submit" disabled={saving} className="pf-save">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {saved && <span style={{ fontSize: '0.84rem', color: '#34D399', fontWeight: 600 }}>✓ Saved</span>}
            </div>
          </form>
        </div>
      </div>

      {/* Avatar emoji picker */}
      {pickerOpen && (
        <div className="pf-emoji-picker" style={{ marginTop: 20 }}>
          <div className="pf-sec-title">Choose your city emoji</div>
          <div className="pf-emoji-grid">
            {AVATAR_EMOJIS.map(emoji => (
              <button
                key={emoji}
                className={`pf-emoji-btn${avatarUrl === emoji ? ' sel' : ''}`}
                onClick={() => handleEmojiSelect(emoji)}
                disabled={emojiSaving}
              >
                {emoji}
              </button>
            ))}
          </div>
          {avatarUrl && (
            <button
              onClick={() => handleEmojiSelect('')}
              style={{ marginTop: 12, background: 'none', border: 'none', fontSize: '0.72rem', color: 'var(--sr-sub)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
            >
              Remove avatar (use initials)
            </button>
          )}
        </div>
      )}

      {/* Hosting CTA */}
      <div className="pf-host-cta">
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.96rem', marginBottom: 5, color: 'var(--sr-text)' }}>
            {profile?.is_host ? '🏠 You\'re a host' : '🏠 Become a host'}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--sr-muted)', lineHeight: 1.6 }}>
            {profile?.is_host
              ? 'Manage your listings and bookings from your host dashboard.'
              : 'List your space and start earning. Switch back to guest mode at any time.'}
          </p>
        </div>
        <a
          href={profile?.is_host ? '/host/dashboard' : '/become-a-host'}
          style={{ flexShrink: 0, background: profile?.is_host ? 'var(--sr-surface)' : 'var(--sr-orange)', color: profile?.is_host ? 'var(--sr-text)' : '#fff', border: `1px solid var(--sr-border2)`, borderRadius: '10px', padding: '10px 18px', fontSize: '0.84rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {profile?.is_host ? 'Host dashboard →' : 'Get started →'}
        </a>
      </div>
    </>
  )
}
