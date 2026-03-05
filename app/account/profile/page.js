'use client'
import { useState, useEffect } from 'react'

const AVATAR_EMOJIS = ['🏙️', '🌆', '🌇', '🌃', '🌉', '🗽', '🗼', '🏰', '🏯', '⛩️', '🌊', '🏝️', '🗻', '🌴', '🏔️', '🌁']

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
  'France', 'Spain', 'Italy', 'Netherlands', 'Japan', 'South Korea',
  'Singapore', 'United Arab Emirates', 'Saudi Arabia', 'Brazil', 'Mexico',
  'India', 'China', 'South Africa', 'Nigeria', 'Other',
]

const inputStyle = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #E8E2D9',
  borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit',
  background: 'white', outline: 'none', color: '#1A1410',
  transition: 'border-color 0.15s',
}
const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  color: '#6B5F54', marginBottom: '6px',
}

export default function ProfilePage() {
  const [profile, setProfile]     = useState(null)
  const [form, setForm]           = useState({
    first_name: '', last_name: '', phone: '', city: '', country: '',
  })
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
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
    setSaving(true)
    setError('')
    setSaved(false)

    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json.error || 'Failed to save'); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function Field({ label, name, type = 'text', readOnly = false, children }) {
    return (
      <div>
        <label style={labelStyle}>{label}</label>
        {children ?? (
          <input
            type={type}
            value={readOnly ? (profile?.email ?? '') : (form[name] ?? '')}
            onChange={readOnly ? undefined : e => setForm(f => ({ ...f, [name]: e.target.value }))}
            readOnly={readOnly}
            style={{ ...inputStyle, background: readOnly ? '#F3F0EB' : 'white', color: readOnly ? '#A89880' : '#1A1410' }}
            onFocus={e => { if (!readOnly) e.target.style.borderColor = '#F4601A' }}
            onBlur={e => { e.target.style.borderColor = '#E8E2D9' }}
          />
        )}
      </div>
    )
  }

  const isEmoji = avatarUrl && !avatarUrl.startsWith('http')
  const initials = [form.first_name?.[0], form.last_name?.[0]].filter(Boolean).join('').toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#A89880', fontSize: '0.9rem', padding: '40px 0' }}>
      <div style={{ width: 18, height: 18, border: '2px solid #E8E2D9', borderTopColor: '#F4601A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      Loading profile…
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.7rem', fontWeight: 700, marginBottom: '6px' }}>
          Profile &amp; Settings
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#6B5F54' }}>
          Manage your personal information and preferences.
        </p>
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            onClick={() => setPickerOpen(o => !o)}
            title="Choose avatar"
            style={{
              width: 80, height: 80, borderRadius: '50%',
              background: (isEmoji || avatarUrl?.startsWith('http')) ? 'transparent' : '#F4601A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isEmoji ? '2.2rem' : '1.5rem', fontWeight: 700, color: 'white',
              cursor: 'pointer', overflow: 'hidden',
              border: '3px solid white',
              boxShadow: pickerOpen ? '0 0 0 2px #F4601A' : '0 0 0 2px #E8E2D9',
              transition: 'box-shadow 0.15s',
            }}
          >
            {isEmoji ? avatarUrl
              : avatarUrl?.startsWith('http') ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '3px' }}>
            {[form.first_name, form.last_name].filter(Boolean).join(' ') || profile?.email}
          </div>
          <button
            onClick={() => setPickerOpen(o => !o)}
            style={{ background: 'none', border: '1px solid #E8E2D9', borderRadius: '8px', padding: '5px 14px', fontSize: '0.78rem', fontWeight: 600, color: '#6B5F54', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '4px' }}
          >
            {pickerOpen ? 'Close picker' : 'Choose avatar'}
          </button>
          <div style={{ fontSize: '0.72rem', color: '#A89880' }}>Pick a city emoji to represent you</div>
        </div>
      </div>

      {/* Emoji picker */}
      {pickerOpen && (
        <div style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px', padding: '20px', marginBottom: '28px', maxWidth: '360px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A89880', marginBottom: '14px' }}>Choose your city</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
            {AVATAR_EMOJIS.map(emoji => (
              <button key={emoji} onClick={() => handleEmojiSelect(emoji)} disabled={emojiSaving}
                style={{ width: 38, height: 38, borderRadius: '10px', border: 'none', background: avatarUrl === emoji ? '#FFF0E8' : '#F9F6F2', outline: avatarUrl === emoji ? '2px solid #F4601A' : '2px solid transparent', fontSize: '1.4rem', cursor: 'pointer', padding: 0 }}
              >{emoji}</button>
            ))}
          </div>
          {avatarUrl && (
            <button onClick={() => handleEmojiSelect('')} style={{ marginTop: '14px', background: 'none', border: 'none', fontSize: '0.75rem', color: '#A89880', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              Remove avatar (use initials)
            </button>
          )}
        </div>
      )}

      {/* Personal Information */}
      <div style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px', padding: '28px', maxWidth: '600px', marginBottom: '24px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A89880', marginBottom: '20px' }}>
          Personal Information
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* First / Last name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="First Name" name="first_name" />
            <Field label="Last Name"  name="last_name" />
          </div>

          <Field label="Email Address" name="email" readOnly>
            <input
              type="email"
              value={profile?.email ?? ''}
              readOnly
              style={{ ...inputStyle, background: '#F3F0EB', color: '#A89880' }}
            />
            <p style={{ fontSize: '0.72rem', color: '#A89880', marginTop: '4px' }}>
              To change your email, contact support.
            </p>
          </Field>

          <Field label="Phone Number" name="phone" type="tel" />

          {/* City / Country row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="City" name="city" />
            <div>
              <label style={labelStyle}>Country</label>
              <select
                value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B5F54' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
                onFocus={e => e.target.style.borderColor = '#F4601A'}
                onBlur={e => e.target.style.borderColor = '#E8E2D9'}
              >
                <option value="">Select country…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#DC2626' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingTop: '4px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{ background: '#F4601A', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '0.9rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {saved && <span style={{ fontSize: '0.84rem', color: '#16A34A', fontWeight: 600 }}>✓ Saved successfully</span>}
          </div>
        </form>
      </div>

      {/* Hosting status */}
      <div style={{ background: profile?.is_host ? '#FFF8F5' : 'white', border: `1px solid ${profile?.is_host ? '#F4E0D4' : '#E8E2D9'}`, borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', maxWidth: '600px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.96rem', marginBottom: '5px', color: '#1A1410' }}>
            {profile?.is_host ? '🏠 You\'re a host' : '🏠 Become a host'}
          </div>
          <p style={{ fontSize: '0.82rem', color: '#6B5F54', lineHeight: 1.6 }}>
            {profile?.is_host
              ? 'Manage your listings and bookings from your host dashboard.'
              : 'List your space and start earning. Switch back to guest mode at any time.'}
          </p>
        </div>
        <a
          href={profile?.is_host ? '/host/dashboard' : '/become-a-host'}
          style={{ flexShrink: 0, background: profile?.is_host ? '#1A1410' : '#F4601A', color: 'white', borderRadius: '10px', padding: '10px 18px', fontSize: '0.84rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {profile?.is_host ? 'Host dashboard' : 'Get started'}
        </a>
      </div>
    </div>
  )
}
