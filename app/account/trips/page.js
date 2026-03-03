'use client'
import { useState, useEffect } from 'react'

const STATUS_COLORS = {
  confirmed: { bg: 'rgba(22,163,74,0.08)', color: '#16A34A', label: 'Confirmed' },
  pending:   { bg: 'rgba(234,179,8,0.1)',  color: '#92400E', label: 'Pending' },
  cancelled: { bg: 'rgba(220,38,38,0.07)', color: '#DC2626', label: 'Cancelled' },
  completed: { bg: 'rgba(99,102,241,0.08)', color: '#4338CA', label: 'Completed' },
  disputed:  { bg: 'rgba(239,68,68,0.08)', color: '#B91C1C', label: 'Disputed' },
}

const POLICY_DESC = {
  flexible: 'Full refund up to 24 hrs before check-in.',
  moderate: 'Full refund 5+ days before; 50% within 2–4 days; no refund within 48 hrs.',
  strict:   '50% refund 7+ days before; no refund within 7 days.',
}

function fmt(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TripsPage() {
  const [filter, setFilter] = useState('upcoming')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelModal, setCancelModal] = useState(null) // booking to cancel
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelResult, setCancelResult] = useState(null)

  async function load(f) {
    setLoading(true)
    const res = await fetch(`/api/account/bookings?filter=${f}`)
    const data = await res.json()
    setBookings(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load(filter) }, [filter])

  function canCancel(b) {
    return ['pending', 'confirmed'].includes(b.status) && filter === 'upcoming'
  }

  async function handleCancel() {
    setCancelling(true)
    const res = await fetch(`/api/account/bookings/${cancelModal.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: cancelReason }),
    })
    const json = await res.json()
    setCancelling(false)
    if (!res.ok) {
      setCancelResult({ error: json.message ?? json.error })
    } else {
      setCancelResult({ refund: json.refund_amount })
      load(filter)
    }
  }

  function closeModal() {
    setCancelModal(null)
    setCancelReason('')
    setCancelResult(null)
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.7rem', fontWeight: 700, marginBottom: '6px' }}>
          My trips
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#6B5F54' }}>View and manage your bookings.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #E8E2D9', marginBottom: '28px' }}>
        {['upcoming', 'past'].map(tab => (
          <button key={tab} onClick={() => setFilter(tab)} style={{
            background: 'none', border: 'none', padding: '10px 20px', fontSize: '0.88rem',
            fontWeight: filter === tab ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
            color: filter === tab ? '#F4601A' : '#6B5F54',
            borderBottom: filter === tab ? '2px solid #F4601A' : '2px solid transparent',
            marginBottom: '-1px',
          }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: '#A89880', fontSize: '0.88rem' }}>Loading…</div>}

      {!loading && bookings.length === 0 && (
        <div style={{
          background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px',
          padding: '48px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🧳</div>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>No {filter} trips</div>
          <div style={{ fontSize: '0.84rem', color: '#A89880', marginBottom: '20px' }}>
            {filter === 'upcoming' ? "You don't have any upcoming bookings." : "Your past trips will appear here."}
          </div>
          <a href="/" style={{ background: '#F4601A', color: 'white', borderRadius: '10px', padding: '11px 24px', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700 }}>
            Browse properties
          </a>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {bookings.map(b => {
          const st = STATUS_COLORS[b.status] ?? STATUS_COLORS.pending
          return (
            <div key={b.id} style={{
              background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px',
              overflow: 'hidden', display: 'flex',
            }}>
              {/* Image */}
              {b.listings?.main_image_url && (
                <div style={{
                  width: '140px', flexShrink: 0, background: '#E8E2D9',
                  backgroundImage: `url(${b.listings.main_image_url})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }} />
              )}
              <div style={{ flex: 1, padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>
                    {b.listings?.title ?? 'Property'}
                  </div>
                  <span style={{
                    background: st.bg, color: st.color, borderRadius: '100px',
                    padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {st.label}
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#6B5F54', marginBottom: '12px' }}>
                  {b.listings?.city}, {b.listings?.country}
                </div>

                <div style={{ display: 'flex', gap: '24px', fontSize: '0.82rem', color: '#6B5F54', marginBottom: '12px' }}>
                  <span>{fmt(b.check_in)} → {fmt(b.check_out)}</span>
                  <span>{b.nights} night{b.nights !== 1 ? 's' : ''}</span>
                  <span>{b.guests} guest{b.guests !== 1 ? 's' : ''}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>
                    ${Number(b.total_amount).toFixed(2)} total
                  </div>
                  {canCancel(b) && (
                    <button onClick={() => setCancelModal(b)} style={{
                      background: 'none', border: '1px solid #DC2626', color: '#DC2626',
                      borderRadius: '8px', padding: '7px 14px', fontSize: '0.78rem',
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                      Cancel booking
                    </button>
                  )}
                  {b.status === 'cancelled' && b.refund_amount != null && (
                    <div style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 600 }}>
                      Refund: ${Number(b.refund_amount).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Cancel modal */}
      {cancelModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{
            background: 'white', borderRadius: '20px', padding: '32px',
            maxWidth: '480px', width: '100%',
          }}>
            {cancelResult ? (
              <div style={{ textAlign: 'center' }}>
                {cancelResult.error ? (
                  <>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</div>
                    <div style={{ fontWeight: 700, marginBottom: '8px' }}>Cancellation failed</div>
                    <p style={{ fontSize: '0.84rem', color: '#6B5F54', marginBottom: '20px' }}>{cancelResult.error}</p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>✓</div>
                    <div style={{ fontWeight: 700, marginBottom: '8px' }}>Booking cancelled</div>
                    <p style={{ fontSize: '0.84rem', color: '#6B5F54', marginBottom: '20px' }}>
                      {Number(cancelResult.refund) > 0
                        ? `You'll receive a refund of $${Number(cancelResult.refund).toFixed(2)}.`
                        : 'No refund is owed based on the cancellation policy.'}
                    </p>
                  </>
                )}
                <button onClick={closeModal} style={{
                  background: '#F4601A', color: 'white', border: 'none', borderRadius: '10px',
                  padding: '11px 24px', fontSize: '0.88rem', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>Close</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>
                  Cancel booking
                </h2>
                <p style={{ fontSize: '0.84rem', color: '#6B5F54', marginBottom: '16px' }}>
                  <strong>{cancelModal.listings?.title}</strong> · {fmt(cancelModal.check_in)} – {fmt(cancelModal.check_out)}
                </p>

                <div style={{ background: '#FFF8F5', border: '1px solid #F4E0D4', borderRadius: '10px', padding: '14px', marginBottom: '20px', fontSize: '0.82rem', color: '#92400E' }}>
                  <strong>Cancellation policy ({cancelModal.cancellation_policy}):</strong><br />
                  {POLICY_DESC[cancelModal.cancellation_policy]}
                </div>

                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B5F54', marginBottom: '6px' }}>
                  Reason (optional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="Let the host know why you're cancelling…"
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #E8E2D9',
                    borderRadius: '10px', fontSize: '0.84rem', fontFamily: 'inherit',
                    resize: 'vertical', marginBottom: '20px', outline: 'none',
                  }}
                />

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={closeModal} style={{
                    flex: 1, background: 'none', border: '1px solid #E8E2D9', borderRadius: '10px',
                    padding: '11px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#6B5F54',
                  }}>
                    Keep booking
                  </button>
                  <button onClick={handleCancel} disabled={cancelling} style={{
                    flex: 1, background: '#DC2626', color: 'white', border: 'none', borderRadius: '10px',
                    padding: '11px', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    opacity: cancelling ? 0.6 : 1,
                  }}>
                    {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
