'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const AVATAR_EMOJIS = ['🏙️', '🌆', '🌇', '🌃', '🌉', '🗽', '🗼', '🏰', '🏯', '⛩️', '🌊', '🏝️', '🗻', '🌴', '🏔️', '🌁']

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [emojiSaving, setEmojiSaving] = useState(false)

  useEffect(() => {
    fetch('/api/account/profile')
      .then(r => r.json())
      .then(data => {
        if (!data || data.error) { setLoading(false); return }
        setProfile(data)
        setForm({ full_name: data.full_name ?? '', phone: data.phone ?? '' })
        setAvatarUrl(data.avatar_url ?? null)
        setLoading(false)
      })
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
    if (res.ok) {
      setAvatarUrl(emoji)
      setPickerOpen(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: form.full_name, phone: form.phone }),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) { setError(json.error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const isEmoji = avatarUrl && !avatarUrl.startsWith('http')
  const initials = form.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  if (loading) return <div style={{ color: '#A89880', fontSize: '0.9rem' }}>Loading…</div>

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.7rem', fontWeight: 700, marginBottom: '6px' }}>
          Profile
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#6B5F54' }}>
          Update your personal information.
        </p>
      </div>

      {/* Avatar picker */}
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
              cursor: 'pointer', overflow: 'hidden', position: 'relative',
              border: '3px solid white', boxShadow: pickerOpen ? '0 0 0 2px #F4601A' : '0 0 0 2px #E8E2D9',
              transition: 'box-shadow 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 0 2px #F4601A'}
            onMouseLeave={e => { if (!pickerOpen) e.currentTarget.style.boxShadow = '0 0 0 2px #E8E2D9' }}
          >
            {isEmoji ? (
              avatarUrl
            ) : avatarUrl?.startsWith('http') ? (
              <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '3px' }}>
            {form.full_name || profile?.email}
          </div>
          <button
            onClick={() => setPickerOpen(o => !o)}
            style={{
              background: 'none', border: '1px solid #E8E2D9', borderRadius: '8px',
              padding: '5px 14px', fontSize: '0.78rem', fontWeight: 600,
              color: '#6B5F54', cursor: 'pointer',
              fontFamily: 'inherit', marginBottom: '4px',
            }}
          >
            {pickerOpen ? 'Close picker' : 'Choose avatar'}
          </button>
          <div style={{ fontSize: '0.72rem', color: '#A89880' }}>Pick a city to represent you</div>
        </div>
      </div>

      {/* Emoji picker panel */}
      {pickerOpen && (
        <div style={{
          background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px',
          padding: '20px', marginBottom: '28px', maxWidth: '360px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A89880', marginBottom: '14px' }}>
            Choose your city
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
            {AVATAR_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleEmojiSelect(emoji)}
                disabled={emojiSaving}
                style={{
                  width: 38, height: 38, borderRadius: '10px', border: 'none',
                  background: avatarUrl === emoji ? '#FFF0E8' : '#F9F6F2',
                  outline: avatarUrl === emoji ? '2px solid #F4601A' : '2px solid transparent',
                  fontSize: '1.4rem', cursor: emojiSaving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.1s, outline 0.1s',
                  padding: 0,
                }}
                onMouseEnter={e => { if (avatarUrl !== emoji) e.currentTarget.style.background = '#F0EBE3' }}
                onMouseLeave={e => { if (avatarUrl !== emoji) e.currentTarget.style.background = '#F9F6F2' }}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
          {avatarUrl && (
            <button
              onClick={() => handleEmojiSelect('')}
              disabled={emojiSaving}
              style={{
                marginTop: '14px', background: 'none', border: 'none',
                fontSize: '0.75rem', color: '#A89880', cursor: 'pointer',
                fontFamily: 'inherit', padding: 0,
              }}
            >
              Remove avatar (use initials)
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '480px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B5F54', marginBottom: '6px' }}>
            Full name
          </label>
          <input
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            placeholder="Jane Smith"
            style={{ width: '100%', padding: '11px 14px', border: '1px solid #E8E2D9', borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit', background: 'white', outline: 'none' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B5F54', marginBottom: '6px' }}>
            Email address
          </label>
          <input
            value={profile?.email ?? ''}
            readOnly
            style={{ width: '100%', padding: '11px 14px', border: '1px solid #E8E2D9', borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit', background: '#F3F0EB', color: '#A89880' }}
          />
          <p style={{ fontSize: '0.72rem', color: '#A89880', marginTop: '5px' }}>To change your email, contact support.</p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B5F54', marginBottom: '6px' }}>
            Phone number
          </label>
          <input
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+1 (555) 000-0000"
            type="tel"
            style={{ width: '100%', padding: '11px 14px', border: '1px solid #E8E2D9', borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit', background: 'white', outline: 'none' }}
          />
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#DC2626' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button type="submit" disabled={saving} style={{ background: '#F4601A', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '0.9rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span style={{ fontSize: '0.84rem', color: '#16A34A', fontWeight: 600 }}>✓ Saved</span>}
        </div>
      </form>

      {/* Hosting status */}
      <div style={{ marginTop: '40px', background: profile?.is_host ? '#FFF8F5' : 'white', border: `1px solid ${profile?.is_host ? '#F4E0D4' : '#E8E2D9'}`, borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', maxWidth: '480px' }}>
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
        <a href={profile?.is_host ? '/host/dashboard' : '/become-a-host'} style={{ flexShrink: 0, background: profile?.is_host ? '#1A1410' : '#F4601A', color: 'white', borderRadius: '10px', padding: '10px 18px', fontSize: '0.84rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          {profile?.is_host ? 'Host dashboard' : 'Get started'}
        </a>
      </div>
    </div>
  )
}
