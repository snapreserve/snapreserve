'use client'
import { useState, useEffect } from 'react'

const BRAND_ICONS = { visa: '💳', mastercard: '💳', amex: '💳', discover: '💳' }

export default function PaymentsPage() {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [actionId, setActionId] = useState(null)

  useEffect(() => {
    fetch('/api/account/payment-methods').then(r => r.json()).then(data => {
      setMethods(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  async function handleSetDefault(id) {
    setActionId(id)
    await fetch(`/api/account/payment-methods/${id}`, { method: 'PATCH' })
    setMethods(m => m.map(pm => ({ ...pm, is_default: pm.id === id })))
    setActionId(null)
  }

  async function handleRemove(id) {
    if (!confirm('Remove this payment method?')) return
    setActionId(id)
    await fetch(`/api/account/payment-methods/${id}`, { method: 'DELETE' })
    setMethods(m => m.filter(pm => pm.id !== id))
    setActionId(null)
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.7rem', fontWeight: 700, marginBottom: '6px' }}>
          Payment methods
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#6B5F54' }}>
          Saved cards for fast checkout. Powered by Stripe — your card details are never stored on our servers.
        </p>
      </div>

      {loading && <div style={{ color: '#A89880', fontSize: '0.88rem' }}>Loading…</div>}

      {!loading && (
        <>
          {methods.length === 0 && !showAdd && (
            <div style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px', padding: '40px', textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>💳</div>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>No payment methods saved</div>
              <div style={{ fontSize: '0.84rem', color: '#A89880' }}>Add a card to speed up future bookings.</div>
            </div>
          )}

          {/* Saved methods */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {methods.map(pm => (
              <div key={pm.id} style={{
                background: 'white', border: `1px solid ${pm.is_default ? '#F4601A' : '#E8E2D9'}`,
                borderRadius: '14px', padding: '18px 20px', display: 'flex',
                alignItems: 'center', gap: '16px',
              }}>
                <span style={{ fontSize: '1.6rem' }}>{BRAND_ICONS[pm.card_brand] ?? '💳'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {pm.card_brand?.charAt(0).toUpperCase() + pm.card_brand?.slice(1)} ···· {pm.card_last4}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#A89880' }}>
                    Expires {pm.card_exp_month}/{pm.card_exp_year}
                    {pm.is_default && <span style={{ marginLeft: '8px', color: '#F4601A', fontWeight: 700 }}>Default</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!pm.is_default && (
                    <button onClick={() => handleSetDefault(pm.id)} disabled={actionId === pm.id} style={{
                      background: 'none', border: '1px solid #E8E2D9', borderRadius: '8px',
                      padding: '6px 12px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'inherit', color: '#6B5F54',
                    }}>Set default</button>
                  )}
                  <button onClick={() => handleRemove(pm.id)} disabled={actionId === pm.id} style={{
                    background: 'none', border: '1px solid #E8E2D9', borderRadius: '8px',
                    padding: '6px 12px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit', color: '#DC2626',
                  }}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          {/* Add payment method — Stripe integration note */}
          {showAdd ? (
            <div style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px', padding: '28px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>Add a payment method</h3>

              <div style={{ background: '#F3F0EB', borderRadius: '10px', padding: '16px', fontSize: '0.84rem', color: '#6B5F54', marginBottom: '20px' }}>
                <strong>Stripe integration required.</strong> To enable card collection, install the Stripe packages and add your keys:
                <pre style={{ marginTop: '10px', background: 'white', borderRadius: '8px', padding: '10px', fontSize: '0.76rem', overflow: 'auto' }}>
{`npm install stripe @stripe/stripe-js @stripe/react-stripe-js

# .env.local
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`}
                </pre>
                The API endpoint <code>/api/account/payment-methods</code> (POST) creates a Stripe SetupIntent
                and returns a <code>client_secret</code>. Use it with <code>{'<CardElement>'}</code> from
                <code>@stripe/react-stripe-js</code> to securely collect card details.
              </div>

              <button onClick={() => setShowAdd(false)} style={{
                background: 'none', border: '1px solid #E8E2D9', borderRadius: '10px',
                padding: '11px 20px', fontSize: '0.88rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', color: '#6B5F54',
              }}>
                Close
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} style={{
              background: 'white', border: '1px dashed #D4CEC5', borderRadius: '14px',
              padding: '18px 20px', width: '100%', fontSize: '0.88rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', color: '#6B5F54',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              + Add payment method
            </button>
          )}

          <p style={{ fontSize: '0.72rem', color: '#A89880', marginTop: '16px' }}>
            🔒 Card details are encrypted and handled by Stripe. SnapReserve never stores your card number or CVV.
          </p>
        </>
      )}
    </div>
  )
}
