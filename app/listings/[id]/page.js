import { createAdminClient } from '@/lib/supabase-admin'
import { getUserSession } from '@/lib/get-user-session'
import ReportButton from './ReportButton'
import BookingSidebar from './BookingSidebar'
import MessageHostButton from './MessageHostButton'
import Footer from '@/app/components/Footer'

const cityImages = {
  'New York': 'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=1200&q=80',
  'Miami': 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=1200&q=80',
  'Los Angeles': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=1200&q=80',
  'Chicago': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1200&q=80',
  'New Orleans': 'https://images.unsplash.com/photo-1568869893270-a8d9f08dc84c?w=1200&q=80',
}

const tierColors = {
  Standard: { bg: '#f5ede0', text: '#7a5c3a', border: '#e8ddd0' },
  Deluxe:   { bg: '#edf4ff', text: '#1a5fd4', border: '#c3d9ff' },
  Premium:  { bg: '#fff3ed', text: '#e8622a', border: '#fecbaf' },
}

export default async function PropertyPage({ params, searchParams }) {
  const { id } = await params
  const { preview } = await searchParams

  const admin = createAdminClient()

  const [{ data: listing }, { data: rooms }, { user }] = await Promise.all([
    admin.from('listings').select('*').eq('id', id).single(),
    admin.from('rooms').select('*').eq('listing_id', id).eq('is_available', true).order('price_per_night', { ascending: true }),
    getUserSession(),
  ])

  // Fetch up to 6 visible reviews for this listing
  const { data: rawReviews } = await admin
    .from('reviews')
    .select('id, guest_id, rating, cleanliness, accuracy, communication, location, value, comment, host_reply, created_at')
    .eq('listing_id', id)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(6)

  // Mask guest names
  const reviewGuestIds = [...new Set((rawReviews || []).map(r => r.guest_id).filter(Boolean))]
  const { data: reviewGuests } = reviewGuestIds.length
    ? await admin.from('users').select('id, full_name').in('id', reviewGuestIds)
    : { data: [] }
  const reviewGuestMap = Object.fromEntries((reviewGuests || []).map(g => {
    const parts = (g.full_name || '').trim().split(/\s+/)
    const display = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] || 'Guest'
    return [g.id, display]
  }))
  const reviews = (rawReviews || []).map(r => ({
    ...r,
    guest_name: reviewGuestMap[r.guest_id] || 'Guest',
    rating: Number(r.rating),
  }))

  // Fetch host info via hosts table join
  const { data: hostRow } = listing?.host_id
    ? await admin.from('hosts').select('user_id, is_founder_host').eq('id', listing.host_id).maybeSingle()
    : { data: null }
  const isFounderHost = !!hostRow?.is_founder_host
  const { data: host } = hostRow?.user_id
    ? await admin.from('users').select('*').eq('id', hostRow.user_id).single()
    : { data: null }

  // Fetch current user's profile for nav avatar
  const { data: currentUserProfile } = user
    ? await admin.from('users').select('full_name, avatar_url').eq('id', user.id).maybeSingle()
    : { data: null }

  if (!listing) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', fontFamily: 'Syne, sans-serif', background: '#faf6f0', minHeight: '100vh' }}>
        <h2 style={{ color: '#3a1f0d' }}>Property not found</h2>
        <a href="/listings" style={{ color: '#e8622a' }}>← Back to listings</a>
      </div>
    )
  }

  function fmt12(t) {
    if (!t) return null
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  const checkinStartFmt = fmt12(listing.checkin_start_time) || '3:00 PM'
  const checkinEndFmt   = fmt12(listing.checkin_end_time)
  const checkinDisplay  = checkinEndFmt ? `${checkinStartFmt} – ${checkinEndFmt}` : `After ${checkinStartFmt}`
  const checkoutDisplay = listing.checkout_time ? `Before ${fmt12(listing.checkout_time)}` : 'Before 11:00 AM'

  const CANCEL_LABELS = {
    flexible:       'Flexible — full refund up to 24 hours before check-in',
    moderate:       'Moderate — full refund up to 5 days before check-in',
    strict:         'Strict — full refund 7–14 days before check-in',
    non_refundable: 'Non-refundable — no refunds after booking',
  }
  const PET_LABELS = {
    pets_allowed: 'Pets allowed',
    small_pets:   'Small pets only',
    no_pets:      'No pets',
  }
  const SMOKE_LABELS = {
    smoking_allowed: 'Smoking allowed',
    outside_only:    'Outside only',
    no_smoking:      'No smoking',
  }
  const cancelLabel = CANCEL_LABELS[listing.cancellation_policy] || CANCEL_LABELS.flexible
  const petLabel    = PET_LABELS[listing.pet_policy]             || PET_LABELS.no_pets
  const smokeLabel  = SMOKE_LABELS[listing.smoking_policy]       || SMOKE_LABELS.no_smoking
  const quietDisplay = (listing.quiet_hours_start && listing.quiet_hours_end)
    ? `${fmt12(listing.quiet_hours_start)} – ${fmt12(listing.quiet_hours_end)}`
    : null

  const amenities = listing.amenities ? listing.amenities.split(',') : []
  const uploadedImages = Array.isArray(listing.images) ? listing.images.filter(Boolean) : []
  const heroImg = uploadedImages[0] || cityImages[listing.city] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80'
  const thumb1 = uploadedImages[1] || null
  const thumb2 = uploadedImages[2] || null
  const extraGallery = uploadedImages.slice(3)
  const serviceFeePct = 0.032

  // Nav user display
  const userInitials = currentUserProfile?.full_name
    ? currentUserProfile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?'
  const userAvatar = currentUserProfile?.avatar_url || null

  return (
    <>
      {preview === '1' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#3a1f0d', borderBottom: '2px solid #e8622a',
          padding: '12px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'Syne, sans-serif',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1rem' }}>👁️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#faf6f0' }}>Preview mode — not yet live</div>
              <div style={{ fontSize: '0.74rem', color: 'rgba(250,246,240,0.5)', marginTop: '1px' }}>This is how your listing will appear to guests once approved.</div>
            </div>
          </div>
          <a href="/host/dashboard" style={{ background: '#e8622a', border: 'none', color: 'white', borderRadius: '8px', padding: '8px 18px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block' }}>
            ← Back to dashboard
          </a>
        </div>
      )}

      <div style={preview === '1' ? { marginTop: '64px' } : {}}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Syne:wght@400;500;600;700;800&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          :root {
            --cream: #faf6f0;
            --warm: #f5ede0;
            --orange: #e8622a;
            --brown: #3a1f0d;
            --mid: #7a5c3a;
            --border: #e8ddd0;
            --card: #ffffff;
          }
          body { font-family: 'Syne', sans-serif; background: var(--cream); color: var(--brown); }

          /* NAV */
          .nav { display: flex; align-items: center; justify-content: space-between; padding: 0 48px; height: 68px; background: white; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; }
          .logo { font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; font-weight: 700; text-decoration: none; color: var(--brown); }
          .logo em { color: var(--orange); font-style: normal; }
          .nav-btn { padding: 8px 20px; border-radius: 100px; font-size: 0.84rem; font-weight: 600; text-decoration: none; font-family: 'Syne', sans-serif; }
          .nav-btn.outline { border: 1.5px solid var(--border); color: var(--brown); }
          .nav-btn.outline:hover { border-color: var(--mid); }
          .nav-btn.solid { background: var(--orange); color: white; }
          .nav-btn.solid:hover { background: #d45520; }
          .user-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--orange); display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; color: white; text-decoration: none; overflow: hidden; flex-shrink: 0; }
          .user-avatar img { width: 100%; height: 100%; object-fit: cover; }

          /* GALLERY */
          .gallery-grid { display: grid; grid-template-columns: 1fr 340px; gap: 8px; max-width: 1280px; margin: 0 auto; padding: 24px 48px 0; }
          .gallery-main { border-radius: 16px; overflow: hidden; height: 480px; position: relative; }
          .gallery-main img { width: 100%; height: 100%; object-fit: cover; }
          .gallery-thumbs { display: flex; flex-direction: column; gap: 8px; }
          .gallery-thumb { border-radius: 12px; overflow: hidden; flex: 1; position: relative; }
          .gallery-thumb img { width: 100%; height: 100%; object-fit: cover; }
          .gallery-more-overlay { position: absolute; inset: 0; background: rgba(58,31,13,0.55); display: flex; align-items: center; justify-content: center; }
          .gallery-more-overlay span { color: white; font-weight: 700; font-size: 1rem; font-family: 'Syne', sans-serif; }
          .gallery-strip { max-width: 1280px; margin: 8px auto 0; padding: 0 48px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
          .gallery-strip-thumb { height: 110px; border-radius: 10px; overflow: hidden; }
          .gallery-strip-thumb img { width: 100%; height: 100%; object-fit: cover; }

          /* BREADCRUMB */
          .breadcrumb { max-width: 1280px; margin: 20px auto 0; padding: 0 48px; display: flex; align-items: center; gap: 8px; font-size: 0.78rem; color: var(--mid); }
          .breadcrumb a { color: var(--mid); text-decoration: none; }
          .breadcrumb a:hover { color: var(--orange); }
          .breadcrumb span { color: var(--brown); font-weight: 600; }

          /* MAIN */
          .main { max-width: 1280px; margin: 0 auto; padding: 28px 48px 80px; display: grid; grid-template-columns: 1fr 380px; gap: 48px; align-items: start; }
          .left {}
          .prop-title { font-family: 'Cormorant Garamond', serif; font-size: 2.4rem; font-weight: 700; margin-bottom: 10px; line-height: 1.15; color: var(--brown); }
          .prop-meta { display: flex; align-items: center; gap: 16px; font-size: 0.82rem; color: var(--mid); margin-bottom: 8px; flex-wrap: wrap; }
          .prop-meta span { display: flex; align-items: center; gap: 4px; }
          .rating-row { display: flex; align-items: center; gap: 12px; font-size: 0.84rem; margin-bottom: 24px; }
          .rating-stars { color: #d97706; font-weight: 700; }
          .type-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 100px; font-size: 0.74rem; font-weight: 700; }
          .instant-badge { background: rgba(26,110,244,0.1); color: #1a5fd4; }
          .hotel-badge { background: rgba(232,98,42,0.1); color: var(--orange); }
          .stay-badge { background: rgba(58,31,13,0.08); color: var(--brown); }

          .section { margin-bottom: 36px; }
          .section-title { font-family: 'Cormorant Garamond', serif; font-size: 1.35rem; font-weight: 700; margin-bottom: 14px; color: var(--brown); }
          .description { font-size: 0.9rem; color: #5a3e2a; line-height: 1.85; }

          /* HOST */
          .host-card { background: white; border: 1px solid var(--border); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; }
          .host-avatar { width: 56px; height: 56px; border-radius: 50%; background: var(--warm); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; overflow: hidden; flex-shrink: 0; }
          .host-avatar img { width: 100%; height: 100%; object-fit: cover; }
          .host-name { font-weight: 700; font-size: 0.94rem; margin-bottom: 2px; color: var(--brown); }
          .host-meta { font-size: 0.76rem; color: var(--mid); }
          .host-verified { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 700; color: #16a34a; background: rgba(22,163,74,0.08); border-radius: 100px; padding: 2px 8px; margin-top: 4px; }
          .snap-verified { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 700; color: #7c3aed; background: linear-gradient(90deg,rgba(139,92,246,0.1),rgba(59,130,246,0.1)); border: 1px solid rgba(139,92,246,0.25); border-radius: 100px; padding: 2px 10px; margin-top: 5px; }

          /* AMENITIES */
          .amenities-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .amenity { background: white; border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 6px; color: var(--brown); }

          /* ROOMS */
          .rooms-list { display: flex; flex-direction: column; gap: 14px; }
          .room-card { background: white; border-radius: 16px; border: 2px solid var(--border); padding: 20px; cursor: pointer; transition: all 0.2s; position: relative; }
          .room-card:hover { border-color: var(--orange); box-shadow: 0 4px 20px rgba(232,98,42,0.1); }
          .room-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
          .room-tier { font-size: 0.68rem; font-weight: 700; padding: 3px 10px; border-radius: 100px; }
          .room-name { font-family: 'Cormorant Garamond', serif; font-weight: 700; font-size: 1.05rem; margin-bottom: 4px; margin-top: 6px; color: var(--brown); }
          .room-details { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
          .room-detail { font-size: 0.76rem; color: var(--mid); display: flex; align-items: center; gap: 3px; }
          .room-amenities { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
          .room-amenity { font-size: 0.64rem; background: var(--warm); color: var(--mid); padding: 2px 8px; border-radius: 100px; font-weight: 600; }
          .room-price { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-weight: 700; color: var(--orange); }
          .room-price span { font-size: 0.78rem; font-weight: 400; color: var(--mid); font-family: 'Syne', sans-serif; }
          .room-select-btn { width: 100%; background: var(--orange); border: none; border-radius: 10px; padding: 12px; font-size: 0.88rem; font-weight: 700; color: white; cursor: pointer; font-family: 'Syne', sans-serif; margin-top: 12px; transition: background 0.18s; text-decoration: none; display: block; text-align: center; }
          .room-select-btn:hover { background: #d45520; }

          /* SIDEBAR */
          .sidebar { position: sticky; top: 88px; }
          .booking-card { background: white; border: 1px solid var(--border); border-radius: 20px; padding: 24px; box-shadow: 0 8px 32px rgba(58,31,13,0.08); }
          .bc-price { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 700; margin-bottom: 4px; color: var(--brown); }
          .bc-price span { font-size: 0.9rem; font-weight: 400; color: var(--mid); font-family: 'Syne', sans-serif; }
          .bc-rating { font-size: 0.8rem; color: #d97706; margin-bottom: 20px; }

          .date-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1.5px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 10px; }
          .date-field { padding: 12px 14px; }
          .date-field:first-child { border-right: 1.5px solid var(--border); }
          .df-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--mid); margin-bottom: 4px; }
          .df-input { width: 100%; border: none; outline: none; font-size: 0.84rem; font-weight: 600; font-family: 'Syne', sans-serif; cursor: pointer; color: var(--brown); background: transparent; }

          .guests-field { border: 1.5px solid var(--border); border-radius: 12px; padding: 12px 14px; margin-bottom: 16px; }
          .guests-select { width: 100%; border: none; outline: none; font-size: 0.84rem; font-weight: 600; font-family: 'Syne', sans-serif; cursor: pointer; color: var(--brown); background: transparent; }

          .price-breakdown { margin-bottom: 16px; }
          .pb-row { display: flex; justify-content: space-between; font-size: 0.84rem; margin-bottom: 8px; color: var(--brown); }
          .pb-row.total { font-weight: 700; font-size: 0.94rem; padding-top: 12px; border-top: 1px solid var(--border); margin-top: 4px; }
          .pb-label { color: var(--mid); }
          .pb-fee { font-size: 0.72rem; color: var(--orange); font-weight: 600; }

          .book-btn { width: 100%; background: var(--orange); border: none; border-radius: 14px; padding: 16px; font-size: 1rem; font-weight: 700; color: white; cursor: pointer; font-family: 'Syne', sans-serif; margin-bottom: 10px; transition: all 0.2s; }
          .book-btn:hover { background: #d45520; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(232,98,42,0.25); }
          .book-note { text-align: center; font-size: 0.72rem; color: var(--mid); }
          .instant-note { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 0.76rem; font-weight: 600; color: #1a5fd4; margin-top: 8px; }

          .fee-highlight { background: var(--warm); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; margin-top: 14px; text-align: center; }
          .fh-title { font-size: 0.8rem; font-weight: 700; color: var(--orange); margin-bottom: 2px; }
          .fh-sub { font-size: 0.7rem; color: var(--mid); }

          .divider { border: none; border-top: 1px solid var(--border); margin: 28px 0; }

          /* REVIEWS */
          .reviews-section { margin-bottom: 36px; }
          .review-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
          .review-score { font-family: 'Cormorant Garamond', serif; font-size: 3rem; font-weight: 700; color: var(--brown); line-height: 1; }
          .review-stars { color: #d97706; font-size: 1.1rem; }
          .review-count { font-size: 0.84rem; color: var(--mid); }
          .review-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .review-card { background: white; border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
          .rc-author { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
          .rc-avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--warm); display: flex; align-items: center; justify-content: center; font-size: 0.88rem; font-weight: 700; color: var(--orange); flex-shrink: 0; }
          .rc-name { font-weight: 700; font-size: 0.88rem; color: var(--brown); }
          .rc-date { font-size: 0.72rem; color: var(--mid); }
          .rc-stars { color: #d97706; font-size: 0.8rem; margin-bottom: 8px; }
          .rc-text { font-size: 0.82rem; color: #5a3e2a; line-height: 1.75; }

          /* POLICIES */
          .policies-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
          .policy-card { background: white; border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
          .policy-icon { font-size: 1.4rem; margin-bottom: 8px; }
          .policy-title { font-weight: 700; font-size: 0.88rem; color: var(--brown); margin-bottom: 4px; }
          .policy-val { font-size: 0.8rem; color: var(--mid); }

@media (max-width: 1100px) { .main { grid-template-columns: 1fr; } .sidebar { position: relative; top: 0; } .amenities-grid { grid-template-columns: repeat(2,1fr); } .review-cards { grid-template-columns: 1fr; } .policies-grid { grid-template-columns: 1fr 1fr; } }
          @media (max-width: 768px) { .nav, .gallery-grid, .breadcrumb, .main { padding-left: 20px; padding-right: 20px; } .gallery-grid { grid-template-columns: 1fr; } .gallery-thumbs { flex-direction: row; height: 140px; } .prop-title { font-size: 1.8rem; } .gallery-strip { padding: 0 20px; } }
          @media (max-width: 600px) { .policies-grid { grid-template-columns: 1fr; } }
        `}</style>

        {/* NAV */}
        <nav className="nav">
          <a href="/home" className="logo">Snap<em>Reserve™</em></a>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {user ? (
              <>
                <a href="/dashboard" className="nav-btn outline" style={{ fontSize: '0.82rem' }}>Dashboard</a>
                <a href="/dashboard" className="user-avatar">
                  {userAvatar
                    ? <img src={userAvatar} alt="Profile" />
                    : userInitials
                  }
                </a>
              </>
            ) : (
              <>
                <a href="/login" className="nav-btn outline">Log in</a>
                <a href="/signup" className="nav-btn solid">Sign up</a>
              </>
            )}
          </div>
        </nav>

        {/* GALLERY */}
        <div className="gallery-grid">
          <div className="gallery-main">
            <img src={heroImg} alt={listing.title} />
          </div>
          {(thumb1 || thumb2) && (
            <div className="gallery-thumbs">
              {thumb1 && (
                <div className="gallery-thumb">
                  <img src={thumb1} alt={`${listing.title} photo 2`} />
                </div>
              )}
              {thumb2 && (
                <div className="gallery-thumb" style={{ position: 'relative' }}>
                  <img src={thumb2} alt={`${listing.title} photo 3`} />
                  {uploadedImages.length > 3 && (
                    <div className="gallery-more-overlay">
                      <span>+{uploadedImages.length - 3} more</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {extraGallery.length > 0 && (
          <div className="gallery-strip">
            {extraGallery.slice(0, 4).map((url, i) => (
              <div key={i} className="gallery-strip-thumb">
                <img src={url} alt={`${listing.title} photo ${i + 4}`} />
              </div>
            ))}
          </div>
        )}

        {/* BREADCRUMB — geographic hierarchy */}
        {(() => {
          const sep = <span style={{ color: '#c8b8a8' }}>›</span>
          const country = listing.country || null
          const state   = listing.state   || null
          const city    = listing.city    || null
          const crumbs  = []
          let q = ''
          if (country) {
            q += `country=${encodeURIComponent(country)}`
            crumbs.push({ label: country, href: `/listings?${q}` })
          }
          if (state) {
            q += `&state=${encodeURIComponent(state)}`
            crumbs.push({ label: state, href: `/listings?${q}` })
          }
          if (city) {
            q += `&city=${encodeURIComponent(city)}`
            crumbs.push({ label: city, href: `/listings?${q}` })
          }
          return (
            <div className="breadcrumb">
              <a href="/listings">Listings</a>
              {crumbs.map(c => (
                <span key={c.label} style={{ display: 'contents' }}>
                  {sep}
                  <a href={c.href}>{c.label}</a>
                </span>
              ))}
              {sep}
              <span>{listing.title}</span>
            </div>
          )
        })()}

        <div className="main">
          {/* LEFT COLUMN */}
          <div className="left">
            <h1 className="prop-title">{listing.title}</h1>
            <div className="prop-meta">
              <span>📍 {listing.city}, {listing.state}</span>
              <span>👥 Up to {listing.max_guests} guests</span>
              <span>🛏️ {listing.bedrooms} bedroom{listing.bedrooms !== 1 ? 's' : ''}</span>
              <span>🚿 {listing.bathrooms} bathroom{listing.bathrooms !== 1 ? 's' : ''}</span>
            </div>
            <div className="rating-row">
              {listing.rating > 0 && (
                <span className="rating-stars">★ {listing.rating} · <span style={{ color: '#7a5c3a', fontWeight: 400 }}>{listing.review_count} review{listing.review_count !== 1 ? 's' : ''}</span></span>
              )}
              <span className={`type-badge ${listing.type === 'hotel' ? 'hotel-badge' : 'stay-badge'}`}>
                {listing.type === 'hotel' ? '🏨 Hotel' : '🏠 Private Stay'}
              </span>
              {listing.is_instant_book && (
                <span className="type-badge instant-badge">⚡ Instant Book</span>
              )}
              {listing.host_snap_verified && (
                <span className="snap-verified">🛡 SnapReserve™ Verified Host</span>
              )}
              {isFounderHost && (
                <span className="snap-verified" style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }}>🏅 Founder Host</span>
              )}
            </div>

            {/* HOST */}
            <div className="section">
              <div className="host-card">
                <div className="host-avatar">
                  {host?.avatar_url ? <img src={host.avatar_url} alt={host.full_name} /> : '👤'}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="host-name">Hosted by {host?.full_name || 'SnapReserve™ Host'}</div>
                  <div className="host-meta">Member since 2026</div>
                  {host?.is_verified && <div className="host-verified">✓ Verified host</div>}
                  {listing.host_snap_verified && (
                    <div className="snap-verified">🛡 Verified by SnapReserve™</div>
                  )}
                  {isFounderHost && (
                    <div className="snap-verified" style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)', marginTop: 4 }}>🏅 Founder Host</div>
                  )}
                </div>
                <MessageHostButton listingId={listing.id} />
              </div>
            </div>

            <hr className="divider" />

            {/* DESCRIPTION */}
            <div className="section">
              <div className="section-title">About this stay</div>
              <p className="description">{listing.description}</p>
            </div>

            <hr className="divider" />

            {/* ROOMS (hotel only) */}
            {rooms && rooms.length > 0 && (
              <div className="section">
                <div className="section-title">Choose your room</div>
                <div className="rooms-list">
                  {rooms.map((room) => {
                    const tier = tierColors[room.tier] || tierColors.Standard
                    const roomAmenities = room.amenities ? room.amenities.split(',').slice(0, 4) : []
                    const serviceFee = Math.round(room.price_per_night * serviceFeePct)
                    return (
                      <div key={room.id} className="room-card">
                        <div className="room-header">
                          <div>
                            <span className="room-tier" style={{ background: tier.bg, color: tier.text, border: `1px solid ${tier.border}` }}>
                              {room.tier}
                            </span>
                            <div className="room-name">{room.name}</div>
                          </div>
                          <div className="room-price">
                            ${room.price_per_night} <span>/night</span>
                          </div>
                        </div>
                        <div className="room-details">
                          {room.bed_type && <span className="room-detail">🛏️ {room.bed_type}</span>}
                          {room.view_type && <span className="room-detail">🪟 {room.view_type}</span>}
                          {room.max_guests && <span className="room-detail">👥 Up to {room.max_guests} guests</span>}
                          {room.room_size && <span className="room-detail">📐 {room.room_size} sq ft</span>}
                          {room.units_available && <span className="room-detail">✅ {room.units_available} available</span>}
                        </div>
                        <div className="room-amenities">
                          {roomAmenities.map(a => (
                            <span key={a} className="room-amenity">{a.trim()}</span>
                          ))}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#9a7a5a', marginBottom: '4px' }}>
                          + ${listing.cleaning_fee || 0} cleaning · + ${serviceFee} service fee
                        </div>
                        <a href={`/booking?listing=${listing.id}&room=${room.id}`} className="room-select-btn">
                          Select this room →
                        </a>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {rooms && rooms.length > 0 && <hr className="divider" />}

            {/* REVIEWS */}
            {reviews.length > 0 && (
              <div className="section">
                <div className="review-header">
                  <div className="review-score">
                    {listing.rating > 0 ? listing.rating.toFixed(1) : '—'}
                  </div>
                  <div>
                    <div className="review-stars">{'★'.repeat(Math.round(listing.rating || 0))}{'☆'.repeat(5 - Math.round(listing.rating || 0))}</div>
                    <div className="review-count">{listing.review_count} review{listing.review_count !== 1 ? 's' : ''}</div>
                  </div>
                </div>

                {/* Category breakdown */}
                {(() => {
                  const cats = [
                    { key: 'cleanliness',   label: 'Cleanliness' },
                    { key: 'accuracy',      label: 'Accuracy' },
                    { key: 'communication', label: 'Communication' },
                    { key: 'location',      label: 'Location' },
                    { key: 'value',         label: 'Value' },
                  ]
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                      {cats.map(cat => {
                        const vals = reviews.map(r => r[cat.key]).filter(Boolean)
                        if (vals.length === 0) return null
                        const avg = vals.reduce((s, v) => s + v, 0) / vals.length
                        return (
                          <div key={cat.key} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--mid)', fontWeight: 600, marginBottom: '4px' }}>{cat.label}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '4px', background: 'var(--warm)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${(avg / 5) * 100}%`, height: '100%', background: '#d97706', borderRadius: '2px' }} />
                              </div>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brown)' }}>{avg.toFixed(1)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                <div className="review-cards">
                  {reviews.map(r => (
                    <div key={r.id} className="review-card">
                      <div className="rc-author">
                        <div className="rc-avatar">{r.guest_name[0]}</div>
                        <div>
                          <div className="rc-name">{r.guest_name}</div>
                          <div className="rc-date">
                            {new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <div className="rc-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                      {r.comment && <p className="rc-text">{r.comment}</p>}
                      {r.host_reply && (
                        <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--warm)', borderRadius: '10px', borderLeft: '3px solid var(--orange)' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--mid)', marginBottom: '4px' }}>HOST RESPONSE</div>
                          <p style={{ fontSize: '0.8rem', color: 'var(--brown)', lineHeight: 1.7 }}>{r.host_reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {listing.review_count > 6 && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--mid)', marginTop: '14px', textAlign: 'center' }}>
                    Showing 6 of {listing.review_count} reviews
                  </p>
                )}
              </div>
            )}

            {reviews.length > 0 && <hr className="divider" />}

            {/* AMENITIES */}
            {amenities.length > 0 && (
              <div className="section">
                <div className="section-title">Amenities</div>
                <div className="amenities-grid">
                  {amenities.map(a => (
                    <div key={a} className="amenity">
                      ✓ {a.trim()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <hr className="divider" />

            {/* POLICIES */}
            <div className="section">
              <div className="section-title">Policies</div>

              {/* Times + Min stay row */}
              <div className="policies-grid" style={{ marginBottom: '12px' }}>
                <div className="policy-card">
                  <div className="policy-icon">🕐</div>
                  <div className="policy-title">Check-in</div>
                  <div className="policy-val">{checkinDisplay}</div>
                </div>
                <div className="policy-card">
                  <div className="policy-icon">🚪</div>
                  <div className="policy-title">Checkout</div>
                  <div className="policy-val">{checkoutDisplay}</div>
                </div>
                <div className="policy-card">
                  <div className="policy-icon">🌙</div>
                  <div className="policy-title">Min. stay</div>
                  <div className="policy-val">{listing.min_nights || 1} night{(listing.min_nights || 1) !== 1 ? 's' : ''}</div>
                </div>
              </div>

              {/* Extended policies row */}
              <div className="policies-grid">
                <div className="policy-card">
                  <div className="policy-icon">🔄</div>
                  <div className="policy-title">Cancellation</div>
                  <div className="policy-val">{cancelLabel.split(' — ')[0]}</div>
                  <div style={{ fontSize: '0.72rem', color: '#9a7a5a', marginTop: '3px', lineHeight: 1.5 }}>{cancelLabel.split(' — ')[1]}</div>
                </div>
                <div className="policy-card">
                  <div className="policy-icon">🐾</div>
                  <div className="policy-title">Pets</div>
                  <div className="policy-val">{petLabel}</div>
                </div>
                <div className="policy-card">
                  <div className="policy-icon">🚭</div>
                  <div className="policy-title">Smoking</div>
                  <div className="policy-val">{smokeLabel}</div>
                </div>
                {quietDisplay && (
                  <div className="policy-card">
                    <div className="policy-icon">🔇</div>
                    <div className="policy-title">Quiet hours</div>
                    <div className="policy-val">{quietDisplay}</div>
                  </div>
                )}
                {listing.min_booking_age > 18 && (
                  <div className="policy-card">
                    <div className="policy-icon">🪪</div>
                    <div className="policy-title">Minimum age</div>
                    <div className="policy-val">{listing.min_booking_age}+</div>
                  </div>
                )}
                {listing.security_deposit > 0 && (
                  <div className="policy-card">
                    <div className="policy-icon">🔒</div>
                    <div className="policy-title">Security deposit</div>
                    <div className="policy-val">${listing.security_deposit}</div>
                  </div>
                )}
                {listing.extra_guest_fee > 0 && (
                  <div className="policy-card">
                    <div className="policy-icon">👥</div>
                    <div className="policy-title">Extra guest fee</div>
                    <div className="policy-val">${listing.extra_guest_fee}/person/night</div>
                  </div>
                )}
              </div>

              {listing.house_rules && (
                <div style={{ marginTop: '12px', background: 'white', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--brown)', marginBottom: '8px' }}>📋 House rules</div>
                  <p style={{ fontSize: '0.84rem', color: '#5a3e2a', lineHeight: 1.8 }}>{listing.house_rules}</p>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right', marginTop: '-12px' }}>
              <ReportButton listingId={listing.id} />
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="sidebar">
            <BookingSidebar listing={listing} />
          </div>
        </div>

        <Footer darkBg={false} />
      </div>
    </>
  )
}
