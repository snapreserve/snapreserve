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

const CATEGORIES = [
  { key: 'cleanliness',   label: 'Cleanliness' },
  { key: 'accuracy',      label: 'Accuracy' },
  { key: 'communication', label: 'Communication' },
  { key: 'location',      label: 'Location' },
  { key: 'value',         label: 'Value' },
]

function fmt(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StarPicker({ value, onChange, size = 22 }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1,2,3,4,5].map(n => (
        <button key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontSize: size, color: n <= (hover || value) ? '#F59E0B' : '#D1C4B5', lineHeight: 1 }}
        >★</button>
      ))}
    </div>
  )
}

function HouseInfoCard({ listing }) {
  const [open, setOpen] = useState(false)
  const hasInfo = listing?.wifi_name || listing?.door_code || listing?.parking_instructions || listing?.welcome_message
  if (!hasInfo) return null
  return (
    <div style={{ marginTop: '12px', border: '1px solid #E8E2D9', borderRadius: '10px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: '#FFF8F5', border: 'none', borderBottom: open ? '1px solid #E8E2D9' : 'none', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 700, color: '#3a1f0d' }}
      >
        <span>🔑 House Info</span>
        <span style={{ fontSize: '0.72rem', color: '#A89880', fontWeight: 400 }}>{open ? 'Hide ▲' : 'Show ▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'white' }}>
          {listing.wifi_name && (
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A89880', marginBottom: '2px' }}>WiFi Network</div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#3a1f0d' }}>{listing.wifi_name}</div>
              {listing.wifi_password && <div style={{ fontSize: '0.78rem', color: '#6B5F54', marginTop: '2px' }}>Password: <span style={{ fontFamily: 'monospace', background: '#F5F0EB', padding: '1px 6px', borderRadius: '4px' }}>{listing.wifi_password}</span></div>}
            </div>
          )}
          {listing.door_code && (
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A89880', marginBottom: '2px' }}>Door Code</div>
              <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', fontWeight: 700, color: '#F4601A', background: '#FFF3EE', padding: '4px 10px', borderRadius: '6px', display: 'inline-block' }}>{listing.door_code}</div>
            </div>
          )}
          {listing.parking_instructions && (
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A89880', marginBottom: '2px' }}>Parking</div>
              <div style={{ fontSize: '0.82rem', color: '#3a1f0d', lineHeight: 1.6 }}>{listing.parking_instructions}</div>
            </div>
          )}
          {listing.welcome_message && (
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A89880', marginBottom: '2px' }}>Welcome Message</div>
              <div style={{ fontSize: '0.82rem', color: '#3a1f0d', lineHeight: 1.6, fontStyle: 'italic' }}>{listing.welcome_message}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TripsPage() {
  const [filter, setFilter]         = useState('upcoming')
  const [bookings, setBookings]     = useState([])
  const [hostBookings, setHostBookings] = useState([])
  const [loading, setLoading]       = useState(true)
  const [hostLoading, setHostLoading]   = useState(false)
  const [cancelModal, setCancelModal] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelResult, setCancelResult] = useState(null)

  // Review state
  const [reviewModal, setReviewModal] = useState(null)  // booking to review
  const [reviewedIds, setReviewedIds] = useState(new Set())
  const [reviewForm, setReviewForm]   = useState({ rating: 0, cleanliness: 0, accuracy: 0, communication: 0, location: 0, value: 0, comment: '' })
  const [submitting, setSubmitting]   = useState(false)
  const [reviewResult, setReviewResult] = useState(null)

  async function load(f) {
    setLoading(true)
    const res = await fetch(`/api/account/bookings?filter=${f}`)
    const data = await res.json()
    const bks = Array.isArray(data) ? data : []
    setBookings(bks)
    setLoading(false)
    // Check which completed bookings already have reviews
    const completedIds = bks.filter(b => b.status === 'completed').map(b => b.id)
    if (completedIds.length > 0) {
      const r = await fetch(`/api/account/reviews?booking_ids=${completedIds.join(',')}`)
      if (r.ok) {
        const d = await r.json()
        setReviewedIds(new Set(d.reviewed_booking_ids || []))
      }
    }
  }

  async function loadHostBookings() {
    setHostLoading(true)
    try {
      const res = await fetch('/api/host/bookings?status=upcoming&limit=50')
      const json = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(json.bookings)) setHostBookings(json.bookings)
      else setHostBookings([])
    } catch {
      setHostBookings([])
    } finally {
      setHostLoading(false)
    }
  }

  useEffect(() => { load(filter) }, [filter])
  useEffect(() => {
    if (filter === 'upcoming') loadHostBookings()
    else setHostBookings([])
  }, [filter])

  function canCancel(b) {
    return ['pending', 'confirmed'].includes(b.status) && filter === 'upcoming'
  }

  function canReview(b) {
    return b.status === 'completed' && !reviewedIds.has(b.id)
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

  function openReviewModal(b) {
    setReviewModal(b)
    setReviewForm({ rating: 0, cleanliness: 0, accuracy: 0, communication: 0, location: 0, value: 0, comment: '' })
    setReviewResult(null)
  }

  async function submitReview() {
    if (reviewForm.rating === 0) return
    setSubmitting(true)
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: reviewModal.id, ...reviewForm }),
    })
    const json = await res.json()
    setSubmitting(false)
    if (res.ok) {
      setReviewResult({ success: true })
      setReviewedIds(prev => new Set([...prev, reviewModal.id]))
    } else {
      setReviewResult({ error: json.error || 'Failed to submit review' })
    }
  }

  function closeCancel() { setCancelModal(null); setCancelReason(''); setCancelResult(null) }
  function closeReview() { setReviewModal(null); setReviewResult(null) }

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

      {!loading && bookings.length === 0 && (filter !== 'upcoming' || hostBookings.length === 0) && (
        <div style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
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

      {/* Upcoming at your properties (for hosts) */}
      {filter === 'upcoming' && (hostBookings.length > 0 || hostLoading) && (
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: '#1A1410' }}>Upcoming at your properties</h2>
          {hostLoading ? (
            <div style={{ color: '#A89880', fontSize: '0.88rem' }}>Loading…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {hostBookings.map(b => (
                <a key={b.id} href={`/host/bookings/${b.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ flex: 1, padding: '20px 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>{b.listing_title || 'Property'}</div>
                        <span style={{ background: 'rgba(22,163,74,0.08)', color: '#16A34A', borderRadius: '100px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                          {b.status === 'checked_in' ? 'Checked in' : 'Confirmed'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#6B5F54', marginBottom: '6px' }}>
                        Guest: {b.guest_name || b.guest_email || '—'}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#6B5F54', marginBottom: '12px' }}>
                        {b.listing_city}{b.listing_state ? `, ${b.listing_state}` : ''}
                      </div>
                      <div style={{ display: 'flex', gap: '24px', fontSize: '0.82rem', color: '#6B5F54', marginBottom: '12px' }}>
                        <span>{fmt(b.check_in)} → {fmt(b.check_out)}</span>
                        <span>{b.nights} night{b.nights !== 1 ? 's' : ''}</span>
                        <span>{b.guests} guest{b.guests !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>${Number(b.total_amount).toFixed(2)} total</div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F4601A' }}>View booking →</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {filter === 'upcoming' && hostBookings.length > 0 && bookings.length > 0 && (
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: '#1A1410' }}>Your trips (as guest)</h2>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {bookings.map(b => {
          const st = STATUS_COLORS[b.status] ?? STATUS_COLORS.pending
          const reviewed = reviewedIds.has(b.id)
          return (
            <div key={b.id} style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px', overflow: 'hidden', display: 'flex' }}>
              {b.listings?.main_image_url && (
                <div style={{ width: '140px', flexShrink: 0, background: '#E8E2D9', backgroundImage: `url(${b.listings.main_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              )}
              <div style={{ flex: 1, padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>{b.listings?.title ?? 'Property'}</div>
                  <span style={{ background: st.bg, color: st.color, borderRadius: '100px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
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

                {b.status === 'confirmed' && <HouseInfoCard listing={b.listings} />}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>
                    ${Number(b.total_amount).toFixed(2)} total
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {canReview(b) && (
                      <button onClick={() => openReviewModal(b)} style={{
                        background: '#F4601A', border: 'none', color: 'white',
                        borderRadius: '8px', padding: '7px 14px', fontSize: '0.78rem',
                        fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                        ★ Write a review
                      </button>
                    )}
                    {reviewed && (
                      <span style={{ fontSize: '0.76rem', color: '#16A34A', fontWeight: 600 }}>✓ Reviewed</span>
                    )}
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
            </div>
          )
        })}
      </div>

      {/* ── Review modal ─────────────────────────────────────────────── */}
      {reviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={e => e.target === e.currentTarget && closeReview()}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            {reviewResult?.success ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🌟</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px' }}>Thank you for your review!</div>
                <p style={{ fontSize: '0.84rem', color: '#6B5F54', marginBottom: '24px' }}>Your feedback helps other guests make great choices.</p>
                <button onClick={closeReview} style={{ background: '#F4601A', color: 'white', border: 'none', borderRadius: '10px', padding: '11px 28px', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', fontWeight: 700, marginBottom: '4px' }}>
                  Rate your stay
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#6B5F54', marginBottom: '24px' }}>
                  {reviewModal.listings?.title} · {fmt(reviewModal.check_in)} – {fmt(reviewModal.check_out)}
                </p>

                {/* Overall rating */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B5F54', marginBottom: '8px' }}>Overall rating *</div>
                  <StarPicker value={reviewForm.rating} onChange={v => setReviewForm(f => ({ ...f, rating: v }))} size={28} />
                  {reviewForm.rating > 0 && (
                    <div style={{ fontSize: '0.76rem', color: '#F4601A', marginTop: '4px', fontWeight: 600 }}>
                      {['','Poor','Fair','Good','Great','Excellent'][reviewForm.rating]}
                    </div>
                  )}
                </div>

                {/* Category ratings */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                  {CATEGORIES.map(cat => (
                    <div key={cat.key}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#6B5F54', marginBottom: '6px' }}>{cat.label}</div>
                      <StarPicker value={reviewForm[cat.key]} onChange={v => setReviewForm(f => ({ ...f, [cat.key]: v }))} size={18} />
                    </div>
                  ))}
                </div>

                {/* Comment */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B5F54', marginBottom: '6px' }}>Your review</div>
                  <textarea
                    value={reviewForm.comment}
                    onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                    rows={4}
                    placeholder="Share your experience…"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #E8E2D9', borderRadius: '10px', fontSize: '0.84rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
                  />
                </div>

                {reviewResult?.error && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', color: '#DC2626', fontSize: '0.82rem', marginBottom: '16px' }}>
                    {reviewResult.error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={closeReview} style={{ flex: 1, background: 'none', border: '1px solid #E8E2D9', borderRadius: '10px', padding: '11px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#6B5F54' }}>
                    Cancel
                  </button>
                  <button onClick={submitReview} disabled={submitting || reviewForm.rating === 0} style={{ flex: 2, background: reviewForm.rating === 0 ? '#E8E2D9' : '#F4601A', color: reviewForm.rating === 0 ? '#A89880' : 'white', border: 'none', borderRadius: '10px', padding: '11px', fontSize: '0.88rem', fontWeight: 700, cursor: reviewForm.rating === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? 'Submitting…' : 'Submit review'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Cancel modal ─────────────────────────────────────────────── */}
      {cancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={e => e.target === e.currentTarget && closeCancel()}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '480px', width: '100%' }}>
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
                <button onClick={closeCancel} style={{ background: '#F4601A', color: 'white', border: 'none', borderRadius: '10px', padding: '11px 24px', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
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
                <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3}
                  placeholder="Let the host know why you're cancelling…"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #E8E2D9', borderRadius: '10px', fontSize: '0.84rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: '20px', outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={closeCancel} style={{ flex: 1, background: 'none', border: '1px solid #E8E2D9', borderRadius: '10px', padding: '11px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#6B5F54' }}>
                    Keep booking
                  </button>
                  <button onClick={handleCancel} disabled={cancelling} style={{ flex: 1, background: '#DC2626', color: 'white', border: 'none', borderRadius: '10px', padding: '11px', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: cancelling ? 0.6 : 1 }}>
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
