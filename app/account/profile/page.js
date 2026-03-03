'use client'
import { useState, useEffect } from 'react'

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/account/profile')
      .then(r => r.json())
      .then(data => {
        setProfile(data)
        setForm({ full_name: data.full_name ?? '', phone: data.phone ?? '' })
        setLoading(false)
      })
  }, [])

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

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: '#F4601A', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '1.4rem', fontWeight: 700, color: 'white',
        }}>
          {form.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '3px' }}>
            {profile?.is_verified ? '✓ Verified account' : 'Account not yet verified'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#A89880' }}>
            Member since {new Date(profile?.created_at).getFullYear()}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '480px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B5F54', marginBottom: '6px' }}>
            Full name
          </label>
          <input
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            placeholder="Jane Smith"
            style={{
              width: '100%', padding: '11px 14px', border: '1px solid #E8E2D9',
              borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit',
              background: 'white', outline: 'none',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B5F54', marginBottom: '6px' }}>
            Email address
          </label>
          <input
            value={profile?.email ?? ''}
            readOnly
            style={{
              width: '100%', padding: '11px 14px', border: '1px solid #E8E2D9',
              borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit',
              background: '#F3F0EB', color: '#A89880',
            }}
          />
          <p style={{ fontSize: '0.72rem', color: '#A89880', marginTop: '5px' }}>
            To change your email address, contact support.
          </p>
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
            style={{
              width: '100%', padding: '11px 14px', border: '1px solid #E8E2D9',
              borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit',
              background: 'white', outline: 'none',
            }}
          />
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#DC2626' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button type="submit" disabled={saving} style={{
            background: '#F4601A', color: 'white', border: 'none', borderRadius: '10px',
            padding: '12px 28px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && (
            <span style={{ fontSize: '0.84rem', color: '#16A34A', fontWeight: 600 }}>
              ✓ Saved
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
