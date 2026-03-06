'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Build the affiliate quote URL — only non-PII booking metadata is passed.
// No personal data (name, email, payment info) is ever sent to the partner.
function buildInsuranceUrl(booking) {
  const base = process.env.NEXT_PUBLIC_TRAVEL_INSURANCE_URL || 'https://www.squaremouth.com'
  const params = new URLSearchParams({
    destination: [booking.listings?.city, booking.listings?.state].filter(Boolean).join(', '),
    check_in:    booking.check_in,
    check_out:   booking.check_out,
    nights:      String(booking.nights),
    guests:      String(booking.guests),
    trip_cost:   String(booking.total_amount),
    // Reference lets the partner attribute the referral — not used to retrieve PII
    ref:         booking.reference,
  })
  return `${base}?${params.toString()}`
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function ConfirmationContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('id')
  const paymentIntent = searchParams.get('payment_intent')
  const paymentStatus = searchParams.get('payment_intent_client_secret')

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [insuranceDismissed, setInsuranceDismissed] = useState(false)

  useEffect(() => {
    if (!bookingId) {
      setNotFound(true)
      setLoading(false)
      return
    }

    // Poll for up to 8 seconds (webhook may not have fired yet)
    let attempts = 0
    const MAX = 8

    async function fetchBooking() {
      attempts++
      const { data, error } = await supabase
        .from('bookings')
        .select('id, reference, status, payment_status, check_in, check_out, nights, guests, total_amount, price_per_night, cleaning_fee, service_fee, discount_amount, promo_code, created_at, listings(title, city, state)')
        .eq('id', bookingId)
        .single()

      if (error || !data) {
        if (attempts < MAX) {
          setTimeout(fetchBooking, 1000)
        } else {
          setNotFound(true)
          setLoading(false)
        }
        return
      }

      // If still pending and we have more attempts, wait for webhook
      if (data.status === 'pending' && attempts < MAX) {
        setTimeout(fetchBooking, 1000)
        return
      }

      setBooking(data)
      setLoading(false)
    }

    fetchBooking()
  }, [bookingId])

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: var(--sr-bg); color: var(--sr-text); }
        .nav { display: flex; align-items: center; justify-content: space-between; padding: 0 48px; height: 68px; background: var(--sr-card); border-bottom: 1px solid var(--sr-border-solid,#E8E2D9); }
        .logo { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 900; text-decoration: none; color: var(--sr-text); }
        .logo span { color: #F4601A; }
        .wrapper { max-width: 600px; margin: 48px auto; padding: 0 24px 80px; }
        .check-circle { width: 72px; height: 72px; background: linear-gradient(135deg,#16A34A,#22C55E); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 20px; box-shadow: 0 8px 24px rgba(22,163,74,0.25); }
        .conf-title { font-family: 'Playfair Display', serif; font-size: 1.8rem; font-weight: 700; text-align: center; margin-bottom: 6px; }
        .conf-sub { text-align: center; font-size: 0.9rem; color: var(--sr-muted); margin-bottom: 32px; }
        .ref-badge { background: var(--sr-surface); border: 1px solid var(--sr-border-solid,#E8E2D9); border-radius: 12px; padding: 14px 20px; text-align: center; margin-bottom: 24px; }
        .ref-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--sr-sub); margin-bottom: 4px; }
        .ref-code { font-family: 'Playfair Display', serif; font-size: 1.4rem; font-weight: 700; color: #F4601A; letter-spacing: 0.04em; }
        .card { background: var(--sr-card); border: 1px solid var(--sr-border-solid,#E8E2D9); border-radius: 20px; padding: 24px; margin-bottom: 16px; }
        .card-title { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--sr-sub); margin-bottom: 16px; }
        .info-row { display: flex; justify-content: space-between; align-items: flex-start; font-size: 0.88rem; margin-bottom: 12px; }
        .info-label { color: var(--sr-muted); }
        .info-value { font-weight: 600; text-align: right; }
        .divider { border: none; border-top: 1px solid var(--sr-border-solid,#E8E2D9); margin: 14px 0; }
        .total-row { display: flex; justify-content: space-between; font-weight: 700; font-size: 0.96rem; }
        .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 100px; font-size: 0.75rem; font-weight: 700; }
        .status-confirmed { background: rgba(22,163,74,0.1); color: #16A34A; }
        .status-pending { background: rgba(234,179,8,0.1); color: #B45309; }
        .actions { display: flex; gap: 12px; margin-top: 24px; }
        .btn-solid { flex: 1; padding: 14px; background: linear-gradient(135deg,#F4601A,#FF7A35); color: white; border: none; border-radius: 12px; font-size: 0.9rem; font-weight: 700; cursor: pointer; font-family: inherit; text-decoration: none; text-align: center; }
        .btn-outline { flex: 1; padding: 14px; background: transparent; color: var(--sr-text); border: 1px solid var(--sr-border-solid,#D4CEC5); border-radius: 12px; font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: inherit; text-decoration: none; text-align: center; }
        .spinner { width: 40px; height: 40px; border: 3px solid var(--sr-border-solid,#E8E2D9); border-top-color: #F4601A; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 60px auto 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-text { text-align: center; color: var(--sr-muted); font-size: 0.9rem; }
        .ins-card { background: #FFFDF5; border: 1px solid #EDD97A; border-radius: 20px; padding: 24px; margin-bottom: 16px; position: relative; }
        .ins-badge { position: absolute; top: 16px; right: 16px; background: #FEF9C3; border: 1px solid #EDD97A; border-radius: 100px; padding: 2px 10px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #92400E; }
        .ins-header { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
        .ins-icon { width: 44px; height: 44px; background: linear-gradient(135deg,#F59E0B,#FBBF24); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; }
        .ins-title { font-weight: 700; font-size: 1rem; color: #1A1410; margin-bottom: 3px; }
        .ins-sub { font-size: 0.82rem; color: #6B5F54; line-height: 1.5; }
        .ins-perks { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
        .ins-perk { background: white; border: 1px solid #E8E2D9; border-radius: 100px; padding: 4px 12px; font-size: 0.75rem; color: #4B3F35; font-weight: 500; }
        .ins-cta { width: 100%; padding: 13px; background: linear-gradient(135deg,#F59E0B,#FBBF24); color: #1A1410; border: none; border-radius: 12px; font-size: 0.9rem; font-weight: 700; cursor: pointer; font-family: inherit; text-decoration: none; display: block; text-align: center; margin-bottom: 10px; }
        .ins-cta:hover { opacity: 0.9; }
        .ins-disclaimer { font-size: 0.7rem; color: var(--sr-sub); text-align: center; line-height: 1.5; }
        .ins-dismiss { display: block; text-align: center; margin-top: 10px; font-size: 0.75rem; color: var(--sr-sub); background: none; border: none; cursor: pointer; font-family: inherit; }
        .ins-dismiss:hover { color: var(--sr-muted); }
        @media (max-width: 480px) { .nav { padding: 0 20px; } .actions { flex-direction: column; } }
      `}</style>

      <nav className="nav">
        <a href="/" className="logo">Snap<span>Reserve</span></a>
        <a href="/trips" style={{ fontSize: '0.84rem', color: 'var(--sr-muted)', textDecoration: 'none', fontWeight: 600 }}>
          My trips →
        </a>
      </nav>

      <div className="wrapper">
        {loading ? (
          <>
            <div className="spinner" />
            <p className="loading-text">Confirming your booking…</p>
          </>
        ) : notFound || !booking ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
            <h2 style={{ marginBottom: '8px' }}>Booking not found</h2>
            <p style={{ color: 'var(--sr-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
              We couldn't find this booking. If you were just charged, please contact support.
            </p>
            <a href="/trips" className="btn-solid" style={{ display: 'inline-block', padding: '12px 24px' }}>
              View my trips
            </a>
          </div>
        ) : (
          <>
            <div className="check-circle">✓</div>
            <h1 className="conf-title">
              {booking.status === 'confirmed' ? "You're booked!" : 'Booking received'}
            </h1>
            <p className="conf-sub">
              {booking.status === 'confirmed'
                ? 'Your reservation is confirmed. Have a wonderful stay!'
                : 'Your payment is being processed. You\'ll receive a confirmation shortly.'}
            </p>

            <div className="ref-badge">
              <div className="ref-label">Booking reference</div>
              <div className="ref-code">{booking.reference}</div>
            </div>

            {/* Property info */}
            <div className="card">
              <div className="card-title">Property</div>
              <div className="info-row">
                <span className="info-label">Property</span>
                <span className="info-value">{booking.listings?.title}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Location</span>
                <span className="info-value">{booking.listings?.city}, {booking.listings?.state}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Status</span>
                <span>
                  <span className={`status-pill ${booking.status === 'confirmed' ? 'status-confirmed' : 'status-pending'}`}>
                    {booking.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                  </span>
                </span>
              </div>
            </div>

            {/* Trip details */}
            <div className="card">
              <div className="card-title">Trip details</div>
              <div className="info-row">
                <span className="info-label">Check-in</span>
                <span className="info-value">{fmt(booking.check_in)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Checkout</span>
                <span className="info-value">{fmt(booking.check_out)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Duration</span>
                <span className="info-value">{booking.nights} night{booking.nights !== 1 ? 's' : ''}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Guests</span>
                <span className="info-value">{booking.guests} guest{booking.guests !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="card">
              <div className="card-title">Payment summary</div>
              <div className="info-row">
                <span className="info-label">
                  ${booking.price_per_night} × {booking.nights} night{booking.nights !== 1 ? 's' : ''}
                </span>
                <span className="info-value">
                  ${(booking.price_per_night * booking.nights).toLocaleString()}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Cleaning fee</span>
                <span className="info-value">${booking.cleaning_fee}</span>
              </div>
              {booking.discount_amount > 0 && (
                <div className="info-row" style={{ color: '#16A34A' }}>
                  <span className="info-label">🏷️ Promo ({booking.promo_code})</span>
                  <span className="info-value">−${Number(booking.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <hr className="divider" />
              <div className="total-row">
                <span>Total paid</span>
                <span>${booking.total_amount.toLocaleString()}</span>
              </div>
            </div>

            {/* Travel protection — affiliate referral only, no data stored */}
            {!insuranceDismissed && booking.status === 'confirmed' && (
              <div className="ins-card">
                <div className="ins-badge">Optional</div>

                <div className="ins-header">
                  <div className="ins-icon">🛡️</div>
                  <div>
                    <div className="ins-title">Protect your trip</div>
                    <div className="ins-sub">
                      Get a free quote for travel insurance from our trusted partner.
                    </div>
                  </div>
                </div>

                <div className="ins-perks">
                  <span className="ins-perk">✓ Trip cancellation</span>
                  <span className="ins-perk">✓ Medical expenses</span>
                  <span className="ins-perk">✓ Lost baggage</span>
                  <span className="ins-perk">✓ Travel delays</span>
                </div>

                <a
                  href={buildInsuranceUrl(booking)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ins-cta"
                >
                  Get a free quote →
                </a>

                <p className="ins-disclaimer">
                  Insurance provided by a third party. SnapReserve™ does not sell, underwrite,
                  or handle insurance claims. You will leave SnapReserve™ when clicking the link above.
                </p>

                <button className="ins-dismiss" onClick={() => setInsuranceDismissed(true)}>
                  No thanks
                </button>
              </div>
            )}

            <div className="actions">
              <a href="/trips" className="btn-solid">View my trips</a>
              <a href="/listings" className="btn-outline">Browse more</a>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '80px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        Loading…
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  )
}
