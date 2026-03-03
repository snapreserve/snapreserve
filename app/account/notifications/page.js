'use client'
import { useState, useEffect } from 'react'

const PREFS = [
  {
    section: 'Activity',
    items: [
      { key: 'booking_confirmations', label: 'Booking confirmations', desc: 'Get notified when a booking is confirmed or cancelled.' },
      { key: 'booking_reminders',     label: 'Trip reminders',         desc: 'Reminders 3 days before your check-in.' },
      { key: 'messages',              label: 'New messages',           desc: 'When a host sends you a message.' },
      { key: 'account_updates',       label: 'Account updates',        desc: 'Password changes, security alerts, and policy updates.' },
    ],
  },
  {
    section: 'Offers',
    items: [
      { key: 'promotions', label: 'Promotions & deals', desc: 'Special offers, discounts, and travel inspiration.' },
    ],
  },
]

const METHODS = [
  { key: 'method_email', label: 'Email', icon: '✉️' },
  { key: 'method_sms',   label: 'SMS',   icon: '📱' },
]

function Toggle({ on, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: '44px', height: '24px', borderRadius: '100px', border: 'none',
        background: on ? '#F4601A' : '#D4CEC5', cursor: 'pointer',
        position: 'relative', flexShrink: 0, transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: '3px',
        left: on ? '23px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%', background: 'white',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/account/notifications').then(r => r.json()).then(setPrefs)
  }, [])

  async function handleToggle(key, value) {
    const updated = { ...prefs, [key]: value }
    setPrefs(updated)
    setSaving(true)
    setSaved(false)
    await fetch('/api/account/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!prefs) return <div style={{ color: '#A89880', fontSize: '0.88rem' }}>Loading…</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.7rem', fontWeight: 700, marginBottom: '6px' }}>
            Notifications
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#6B5F54' }}>Choose what you hear about and how.</p>
        </div>
        {(saving || saved) && (
          <div style={{ fontSize: '0.78rem', color: saved ? '#16A34A' : '#A89880', fontWeight: 600, paddingTop: '4px' }}>
            {saved ? '✓ Saved' : 'Saving…'}
          </div>
        )}
      </div>

      {/* Delivery methods */}
      <div style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#A89880', marginBottom: '16px' }}>
          How you receive them
        </div>
        <div style={{ display: 'flex', gap: '32px' }}>
          {METHODS.map(m => (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{m.label}</div>
              </div>
              <Toggle on={!!prefs[m.key]} onChange={v => handleToggle(m.key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Preference sections */}
      {PREFS.map(section => (
        <div key={section.section} style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#A89880', marginBottom: '16px' }}>
            {section.section}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {section.items.map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '2px' }}>{item.label}</div>
                  <div style={{ fontSize: '0.76rem', color: '#A89880' }}>{item.desc}</div>
                </div>
                <Toggle on={!!prefs[item.key]} onChange={v => handleToggle(item.key, v)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
