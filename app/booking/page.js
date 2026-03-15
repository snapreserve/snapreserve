'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from '@/lib/supabase'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

// ── Payment form (rendered inside <Elements>) ─────────────────────────────────
function PaymentForm({ bookingId, total, onError }) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [cardError, setCardError] = useState(null)

  async function handlePay(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)
    setCardError(null)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking/confirmation?id=${bookingId}`,
      },
    })

    // Only reaches here if confirmPayment fails immediately
    if (error) {
      setCardError(error.message)
      setPaying(false)
    }
    // On success Stripe redirects automatically — nothing else needed
  }

  return (
    <form onSubmit={handlePay}>
      <div style={{ marginBottom: '20px' }}>
        <PaymentElement
          options={{
            layout: 'tabs',
            fields: { billingDetails: { name: 'auto' } },
          }}
        />
      </div>

      {cardError && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '10px',
          padding: '12px 16px',
          color: '#EF4444',
          fontSize: '0.85rem',
          marginBottom: '16px',
        }}>
          {cardError}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || paying}
        style={{
          width: '100%',
          background: paying ? '#A89880' : 'linear-gradient(135deg,#F4601A,#FF7A35)',
          border: 'none',
          borderRadius: '14px',
          padding: '16px',
          fontSize: '1rem',
          fontWeight: 700,
          color: 'white',
          cursor: paying ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.2s',
        }}
      >
        {paying ? 'Processing payment…' : `Pay $${total.toLocaleString()}`}
      </button>
      <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#A89880', marginTop: '10px' }}>
        🔒 Secured by Stripe · Your card info is never stored on our servers
      </p>
    </form>
  )
}

// ── Main booking page ─────────────────────────────────────────────────────────
function BookingPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const listingId = searchParams.get('listing')
  const checkin   = searchParams.get('checkin')
  const checkout  = searchParams.get('checkout')
  const guests    = searchParams.get('guests') || '1'
  const promoParam = searchParams.get('promo') || ''
  const roomParam  = searchParams.get('room') || null

  const [step, setStep]             = useState('summary')   // summary | loading | payment | error
  const [listing, setListing]       = useState(null)
  const [room, setRoom]             = useState(null)
  const [listingLoading, setListingLoading] = useState(true)
  const [clientSecret, setClientSecret]   = useState(null)
  const [bookingId, setBookingId]         = useState(null)
  const [breakdown, setBreakdown]         = useState(null)
  const [errorMsg, setErrorMsg]           = useState(null)

  // Promo code state
  const [promoInput,   setPromoInput]   = useState(promoParam)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError,   setPromoError]   = useState(null)
  const [appliedPromo, setAppliedPromo] = useState(null)

  // Load listing data (and room if roomParam is set)
  useEffect(() => {
    if (!listingId) {
      setErrorMsg('Invalid booking link.')
      setListingLoading(false)
      return
    }
    const fetchListing = supabase
      .from('listings')
      .select('id, title, city, state, property_type, price_per_night, cleaning_fee, max_guests, rating, review_count, is_instant_book')
      .eq('id', listingId)
      .single()

    const fetchRoom = roomParam
      ? supabase.from('rooms').select('id, name, tier, price_per_night, max_guests, bed_type, view_type, units_available').eq('id', roomParam).maybeSingle()
      : Promise.resolve({ data: null })

    Promise.all([fetchListing, fetchRoom]).then(([{ data: listingData, error }, { data: roomData }]) => {
      if (error || !listingData) setErrorMsg('Listing not found.')
      else {
        setListing(listingData)
        if (roomData) setRoom(roomData)
      }
      setListingLoading(false)
    })
  }, [listingId, roomParam])

  // Date + nights calculation
  const nights = checkin && checkout
    ? Math.max(0, Math.round((new Date(checkout) - new Date(checkin)) / 86400000))
    : 0

  function fmt(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  async function applyPromo() {
    const code = promoInput.trim()
    if (!code || !listingId) return
    setPromoLoading(true)
    setPromoError(null)
    setAppliedPromo(null)
    try {
      const res = await fetch('/api/promotions/validate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code, listing_id: listingId, nights, subtotal: localBreakdown?.subtotal || 0 }),
      })
      const data = await res.json()
      if (!res.ok) { setPromoError('Could not validate promo code.'); return }
      if (!data.valid) { setPromoError(data.error || 'Invalid promo code'); return }
      setAppliedPromo(data)
    } catch { setPromoError('Network error.') }
    finally { setPromoLoading(false) }
  }

  async function handleConfirm() {
    setStep('loading')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          check_in: checkin,
          check_out: checkout,
          guests: Number(guests),
          promo_code: appliedPromo?.code || null,
          room_id: room?.id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        if (res.status === 401) {
          // Not logged in — redirect to login
          router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
          return
        }
        setErrorMsg(data.error || 'Something went wrong.')
        setStep('error')
        return
      }
      setClientSecret(data.clientSecret)
      setBookingId(data.bookingId)
      setBreakdown(data.breakdown)
      setStep('payment')
    } catch {
      setErrorMsg('Network error. Please try again.')
      setStep('error')
    }
  }

  // Local breakdown before PaymentIntent is created
  const localBreakdown = listing && nights > 0 ? (() => {
    const pricePerNight  = room ? room.price_per_night : listing.price_per_night
    const subtotal       = pricePerNight * nights
    const cleaningFee    = listing.cleaning_fee || 0
    const discountAmount = appliedPromo ? appliedPromo.discount_amount : 0
    return { nights, pricePerNight, subtotal, cleaningFee, discountAmount, promoCode: appliedPromo?.code || null, total: subtotal + cleaningFee - discountAmount }
  })() : null

  const displayBreakdown = breakdown || localBreakdown

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: var(--sr-bg); color: var(--sr-text); }
        .nav { display: flex; align-items: center; justify-content: space-between; padding: 0 48px; height: 68px; background: var(--sr-card); border-bottom: 1px solid var(--sr-border-solid,#E8E2D9); }
        .logo { text-decoration: none; display: inline-flex; align-items: center; }
        .logo img { height: 26px; width: auto; }
        html[data-theme="light"] .logo img { filter: drop-shadow(0 0 3px rgba(0,0,0,0.45)); }
        .page { max-width: 960px; margin: 40px auto; padding: 0 24px 80px; display: grid; grid-template-columns: 1fr 380px; gap: 40px; align-items: start; }
        .left-col {}
        .card { background: var(--sr-card); border: 1px solid var(--sr-border-solid,#E8E2D9); border-radius: 20px; padding: 28px; margin-bottom: 20px; }
        .card-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .step-badge { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: #F4601A; color: white; border-radius: 50%; font-size: 0.75rem; font-weight: 700; }
        .step-badge.done { background: #16A34A; }

        .date-row { display: flex; gap: 16px; margin-bottom: 8px; }
        .date-box { flex: 1; background: var(--sr-surface); border: 1px solid var(--sr-border-solid,#E8E2D9); border-radius: 12px; padding: 12px 16px; }
        .date-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--sr-sub); margin-bottom: 4px; }
        .date-value { font-size: 0.9rem; font-weight: 600; }
        .guests-row { font-size: 0.84rem; color: var(--sr-muted); }

        .breakdown { }
        .br-row { display: flex; justify-content: space-between; font-size: 0.84rem; margin-bottom: 10px; color: var(--sr-muted); }
        .br-row.total { font-weight: 700; font-size: 0.96rem; padding-top: 12px; border-top: 1px solid var(--sr-border-solid,#E8E2D9); margin-top: 4px; color: var(--sr-text); }
        .br-label { }
        .br-fee-tag { font-size: 0.7rem; color: #F4601A; font-weight: 600; margin-left: 4px; }

        .confirm-btn { width: 100%; background: linear-gradient(135deg,#F4601A,#FF7A35); border: none; border-radius: 14px; padding: 16px; font-size: 1rem; font-weight: 700; color: white; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .confirm-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(244,96,26,0.3); }
        .confirm-note { text-align: center; font-size: 0.72rem; color: var(--sr-sub); margin-top: 10px; }

        .spinner { width: 40px; height: 40px; border: 3px solid var(--sr-border-solid,#E8E2D9); border-top-color: #F4601A; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 40px auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-text { text-align: center; color: var(--sr-muted); font-size: 0.9rem; padding-bottom: 40px; }

        .property-card { display: flex; gap: 16px; }
        .prop-thumb { width: 80px; height: 80px; border-radius: 12px; background: var(--sr-surface); flex-shrink: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 2rem; }
        .prop-info {}
        .prop-name { font-weight: 700; font-size: 0.94rem; margin-bottom: 4px; }
        .prop-meta { font-size: 0.78rem; color: var(--sr-muted); }
        .prop-rating { font-size: 0.78rem; color: #D97706; margin-top: 2px; }

        .error-state { text-align: center; padding: 60px 20px; }
        .error-icon { font-size: 3rem; margin-bottom: 16px; }
        .error-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; }
        .error-msg { font-size: 0.9rem; color: var(--sr-muted); margin-bottom: 24px; }
        .back-btn { display: inline-block; padding: 12px 24px; border-radius: 100px; background: #F4601A; color: white; font-weight: 700; font-size: 0.88rem; text-decoration: none; }

        .instant-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 0.76rem; font-weight: 600; color: #1A6EF4; margin-top: 8px; }

        @media (max-width: 768px) { .page { grid-template-columns: 1fr; } }
        @media (max-width: 480px) { .nav { padding: 0 20px; } .page { padding: 0 16px 60px; } }
      `}</style>

      <nav className="nav">
        <a href="/" className="logo"><img src="/logo.png" alt="SnapReserve" /></a>
        <a href={listingId ? `/listings/${listingId}` : '/listings'} style={{ fontSize: '0.84rem', color: 'var(--sr-muted)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back
        </a>
      </nav>

      {/* Error / listing not found */}
      {(errorMsg && step !== 'error') || (!listingLoading && !listing && !errorMsg) ? null : null}

      {listingLoading ? (
        <div style={{ padding: '80px', textAlign: 'center' }}>
          <div className="spinner" />
          <p className="loading-text">Loading booking details…</p>
        </div>
      ) : errorMsg && (step === 'error' || step === 'summary') ? (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <div className="error-title">Booking unavailable</div>
          <p className="error-msg">{errorMsg}</p>
          <a href="/listings" className="back-btn">Browse listings</a>
        </div>
      ) : (
        <div className="page">
          {/* LEFT COLUMN */}
          <div className="left-col">

            {/* Step 1 — Trip details */}
            <div className="card">
              <div className="card-title">
                <span className={`step-badge ${step !== 'summary' ? 'done' : ''}`}>
                  {step !== 'summary' ? '✓' : '1'}
                </span>
                Your trip
              </div>
              <div className="date-row">
                <div className="date-box">
                  <div className="date-label">Check-in</div>
                  <div className="date-value">{fmt(checkin)}</div>
                </div>
                <div className="date-box">
                  <div className="date-label">Checkout</div>
                  <div className="date-value">{fmt(checkout)}</div>
                </div>
              </div>
              <div className="guests-row">
                {nights} night{nights !== 1 ? 's' : ''} · {guests} guest{Number(guests) !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Step 2 — Payment */}
            <div className="card">
              <div className="card-title">
                <span className={`step-badge ${step === 'payment' ? '' : (step === 'summary' ? '' : 'done')}`}>2</span>
                Payment
              </div>

              {step === 'summary' && (
                <>
                  <button className="confirm-btn" onClick={handleConfirm}>
                    Confirm &amp; pay ${displayBreakdown?.total?.toLocaleString() ?? '…'}
                  </button>
                  <p className="confirm-note">
                    You'll enter your card details on the next step. Nothing is charged yet.
                  </p>
                </>
              )}

              {step === 'loading' && (
                <>
                  <div className="spinner" />
                  <p className="loading-text">Setting up secure payment…</p>
                </>
              )}

              {step === 'payment' && clientSecret && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#F4601A',
                        colorBackground: '#FFFFFF',
                        colorText: '#1A1410',
                        borderRadius: '10px',
                        fontFamily: 'DM Sans, -apple-system, sans-serif',
                      },
                    },
                  }}
                >
                  <PaymentForm
                    bookingId={bookingId}
                    total={breakdown?.total || displayBreakdown?.total || 0}
                  />
                </Elements>
              )}

              {step === 'error' && (
                <div style={{ padding: '20px 0' }}>
                  <p style={{ color: '#EF4444', fontSize: '0.9rem', marginBottom: '16px' }}>
                    {errorMsg}
                  </p>
                  <button
                    className="confirm-btn"
                    onClick={() => { setErrorMsg(null); setStep('summary') }}
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>

            {/* Policies */}
            <div style={{ fontSize: '0.78rem', color: 'var(--sr-sub)', lineHeight: 1.6 }}>
              By reserving, you agree to SnapReserve™'s{' '}
              <a href="/terms" style={{ color: '#F4601A' }}>Terms of Service</a> and{' '}
              <a href="/refund-policy" style={{ color: '#F4601A' }}>Refund Policy</a>.
              Host cancellation policy applies.
            </div>
          </div>

          {/* RIGHT COLUMN — price summary */}
          <div>
            {listing && (
              <div className="card">
                <div className="property-card" style={{ marginBottom: '20px' }}>
                  <div className="prop-thumb">{listing.property_type === 'hotel' ? '🏨' : '🏠'}</div>
                  <div className="prop-info">
                    <div className="prop-name">{listing.title}</div>
                    <div className="prop-meta">{listing.city}, {listing.state}</div>
                    {room && (
                      <div className="prop-meta" style={{ color: '#e8622a', fontWeight: 600 }}>
                        Room: {room.name}{room.tier ? ` · ${room.tier}` : ''}
                      </div>
                    )}
                    <div className="prop-rating">★ {listing.rating} · {listing.review_count} reviews</div>
                    {listing.is_instant_book && (
                      <div className="instant-badge">⚡ Instant book</div>
                    )}
                  </div>
                </div>

                {displayBreakdown && (
                  <div className="breakdown">
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sr-sub)', marginBottom: '14px' }}>
                      Price breakdown
                    </div>
                    <div className="br-row">
                      <span className="br-label">
                        ${displayBreakdown.pricePerNight} × {displayBreakdown.nights} night{displayBreakdown.nights !== 1 ? 's' : ''}
                      </span>
                      <span>${displayBreakdown.subtotal}</span>
                    </div>
                    <div className="br-row">
                      <span className="br-label">Cleaning fee</span>
                      <span>${displayBreakdown.cleaningFee}</span>
                    </div>
                    {displayBreakdown.discountAmount > 0 && (
                      <div className="br-row" style={{ color: '#16A34A' }}>
                        <span className="br-label">🏷️ Promo ({displayBreakdown.promoCode})</span>
                        <span>−${displayBreakdown.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="br-row total">
                      <span>Total</span>
                      <span>${displayBreakdown.total.toLocaleString()}</span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--sr-sub)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      ✓ Price includes all fees. No hidden charges.
                    </p>

                    {/* Promo code input */}
                    <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--sr-border-solid,#E8E2D9)' }}>
                      {appliedPromo ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: '10px', padding: '10px 14px' }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#16A34A' }}>✓ Promo applied</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--sr-text)', fontWeight: 600 }}>{appliedPromo.name}</div>
                          </div>
                          <button onClick={() => { setAppliedPromo(null); setPromoInput('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sr-sub)', fontSize: '0.78rem', fontFamily: 'inherit' }}>Remove</button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="Promo code"
                              value={promoInput}
                              onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null) }}
                              onKeyDown={e => e.key === 'Enter' && applyPromo()}
                              disabled={step !== 'summary'}
                              style={{ flex: 1, padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--sr-border-solid,#E8E2D9)', background: 'var(--sr-surface,#F5F0EB)', fontSize: '0.84rem', fontFamily: 'inherit', color: 'var(--sr-text)', outline: 'none' }}
                            />
                            <button
                              onClick={applyPromo}
                              disabled={promoLoading || !promoInput.trim() || step !== 'summary'}
                              style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid var(--sr-border-solid,#E8E2D9)', background: 'var(--sr-card)', fontSize: '0.82rem', fontWeight: 700, cursor: promoLoading || !promoInput.trim() ? 'not-allowed' : 'pointer', color: 'var(--sr-text)', fontFamily: 'inherit' }}
                            >
                              {promoLoading ? '…' : 'Apply'}
                            </button>
                          </div>
                          {promoError && <div style={{ fontSize: '0.74rem', color: '#EF4444', marginTop: '6px' }}>{promoError}</div>}
                        </>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '80px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E8E2D9', borderTopColor: '#F4601A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        Loading…
      </div>
    }>
      <BookingPageContent />
    </Suspense>
  )
}
