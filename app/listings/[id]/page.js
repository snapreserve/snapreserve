import { supabase } from '@/lib/supabase'
import ReportButton from './ReportButton'
import BookingSidebar from './BookingSidebar'
import MessageHostButton from './MessageHostButton'

const cityImages = {
  'New York': 'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=1200&q=80',
  'Miami': 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=1200&q=80',
  'Los Angeles': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=1200&q=80',
  'Chicago': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1200&q=80',
  'New Orleans': 'https://images.unsplash.com/photo-1568869893270-a8d9f08dc84c?w=1200&q=80',
}

const tierColors = {
  Standard: { bg: '#F3F0EB', text: '#6B5F54', border: '#E8E2D9' },
  Deluxe: { bg: '#EDF4FF', text: '#1A6EF4', border: '#C3D9FF' },
  Premium: { bg: '#FFF3ED', text: '#F4601A', border: '#FECBAF' },
}

export default async function PropertyPage({ params, searchParams }) {
  const { id } = await params
  const { preview } = await searchParams

  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .eq('listing_id', id)
    .eq('is_available', true)
    .order('price_per_night', { ascending: true })

  const { data: host } = listing?.host_id ? await supabase
    .from('users')
    .select('*')
    .eq('id', listing.host_id)
    .single() : { data: null }

  if (!listing) {
    return (
      <div style={{textAlign:'center',padding:'80px',fontFamily:'sans-serif'}}>
        <h2>Property not found</h2>
        <a href="/listings" style={{color:'#F4601A'}}>← Back to listings</a>
      </div>
    )
  }

  const amenities = listing.amenities ? listing.amenities.split(',') : []
  const heroImg = cityImages[listing.city] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80'
  const serviceFeePct = 0.032

  return (
    <>
      {preview === '1' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#1A1712', borderBottom: '2px solid #F4601A',
          padding: '12px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: "'DM Sans',-apple-system,sans-serif",
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1rem' }}>👁️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#F5F0EB' }}>Preview mode — not yet live</div>
              <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.45)', marginTop: '1px' }}>This is how your listing will appear to guests once approved and published.</div>
            </div>
          </div>
          <a
            href="/host/dashboard"
            style={{ background: '#F4601A', border: 'none', color: 'white', borderRadius: '8px', padding: '8px 18px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block' }}
          >
            ← Back to dashboard
          </a>
        </div>
      )}
      <div style={preview === '1' ? { marginTop: '64px' } : {}}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: #FAF8F5; color: #1A1410; }

        .nav { display: flex; align-items: center; justify-content: space-between; padding: 0 48px; height: 68px; background: white; border-bottom: 1px solid #E8E2D9; position: sticky; top: 0; z-index: 100; }
        .logo { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 900; text-decoration: none; color: #1A1410; }
        .logo span { color: #F4601A; }
        .nav-btn { padding: 8px 20px; border-radius: 100px; font-size: 0.84rem; font-weight: 700; text-decoration: none; }
        .nav-btn.outline { border: 1px solid #D4CEC5; color: #1A1410; }
        .nav-btn.solid { background: #F4601A; color: white; }

        .hero { position: relative; height: 460px; overflow: hidden; }
        .hero img { width: 100%; height: 100%; object-fit: cover; }
        .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%); }
        .hero-back { position: absolute; top: 24px; left: 48px; background: white; border: none; border-radius: 100px; padding: 10px 20px; font-size: 0.84rem; font-weight: 700; cursor: pointer; text-decoration: none; color: #1A1410; display: flex; align-items: center; gap: 6px; }
        .hero-badges { position: absolute; bottom: 24px; left: 48px; display: flex; gap: 8px; }
        .hero-badge { padding: 6px 14px; border-radius: 100px; font-size: 0.76rem; font-weight: 700; }
        .hero-rating { position: absolute; bottom: 24px; right: 48px; background: white; border-radius: 12px; padding: 10px 16px; text-align: center; }
        .hr-num { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; color: #D97706; }
        .hr-stars { font-size: 0.72rem; color: #D97706; }
        .hr-count { font-size: 0.7rem; color: #6B5F54; }

        .main { max-width: 1200px; margin: 0 auto; padding: 40px 48px 80px; display: grid; grid-template-columns: 1fr 380px; gap: 40px; align-items: start; }

        .left {}
        .prop-title { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; margin-bottom: 8px; line-height: 1.2; }
        .prop-meta { display: flex; align-items: center; gap: 16px; font-size: 0.84rem; color: #6B5F54; margin-bottom: 24px; flex-wrap: wrap; }
        .prop-meta span { display: flex; align-items: center; gap: 4px; }

        .section { margin-bottom: 32px; }
        .section-title { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .description { font-size: 0.9rem; color: #4A3F35; line-height: 1.8; }

        .amenities-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .amenity { background: white; border: 1px solid #E8E2D9; border-radius: 10px; padding: 10px 14px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 6px; }

        .host-card { background: white; border: 1px solid #E8E2D9; border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; }
        .host-avatar { width: 56px; height: 56px; border-radius: 50%; background: #F3F0EB; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; overflow: hidden; flex-shrink: 0; }
        .host-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .host-name { font-weight: 700; font-size: 0.94rem; margin-bottom: 2px; }
        .host-meta { font-size: 0.76rem; color: #6B5F54; }
        .host-verified { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 700; color: #16A34A; background: rgba(22,163,74,0.08); border-radius: 100px; padding: 2px 8px; margin-top: 4px; }

        /* ROOMS */
        .rooms-list { display: flex; flex-direction: column; gap: 14px; }
        .room-card { background: white; border-radius: 16px; border: 2px solid #E8E2D9; padding: 20px; cursor: pointer; transition: all 0.2s; position: relative; }
        .room-card:hover { border-color: #F4601A; box-shadow: 0 4px 20px rgba(244,96,26,0.1); }
        .room-card.selected { border-color: #F4601A; background: #FFF9F6; }
        .room-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
        .room-tier { font-size: 0.68rem; font-weight: 700; padding: 3px 10px; border-radius: 100px; }
        .room-name { font-weight: 700; font-size: 1rem; margin-bottom: 4px; }
        .room-details { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
        .room-detail { font-size: 0.76rem; color: #6B5F54; display: flex; align-items: center; gap: 3px; }
        .room-amenities { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
        .room-amenity { font-size: 0.64rem; background: #F3F0EB; color: #6B5F54; padding: 2px 8px; border-radius: 100px; font-weight: 600; }
        .room-price { font-size: 1.1rem; font-weight: 700; color: #1A6EF4; }
        .room-price span { font-size: 0.76rem; font-weight: 400; color: #A89880; }
        .room-select-btn { width: 100%; background: #F4601A; border: none; border-radius: 10px; padding: 12px; font-size: 0.88rem; font-weight: 700; color: white; cursor: pointer; font-family: inherit; margin-top: 12px; transition: background 0.18s; text-decoration: none; display: block; text-align: center; }
        .room-select-btn:hover { background: #FF7A35; }

        /* BOOKING SIDEBAR */
        .sidebar { position: sticky; top: 88px; }
        .booking-card { background: white; border: 1px solid #E8E2D9; border-radius: 20px; padding: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
        .bc-price { font-family: 'Playfair Display', serif; font-size: 1.8rem; font-weight: 700; margin-bottom: 4px; }
        .bc-price span { font-size: 0.9rem; font-weight: 400; color: #6B5F54; font-family: inherit; }
        .bc-rating { font-size: 0.8rem; color: #D97706; margin-bottom: 20px; }

        .date-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #E8E2D9; border-radius: 12px; overflow: hidden; margin-bottom: 10px; }
        .date-field { padding: 12px 14px; }
        .date-field:first-child { border-right: 1px solid #E8E2D9; }
        .df-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #A89880; margin-bottom: 4px; }
        .df-input { width: 100%; border: none; outline: none; font-size: 0.84rem; font-weight: 600; font-family: inherit; cursor: pointer; color: #1A1410; }

        .guests-field { border: 1px solid #E8E2D9; border-radius: 12px; padding: 12px 14px; margin-bottom: 16px; }
        .guests-select { width: 100%; border: none; outline: none; font-size: 0.84rem; font-weight: 600; font-family: inherit; cursor: pointer; color: #1A1410; }

        .price-breakdown { margin-bottom: 16px; }
        .pb-row { display: flex; justify-content: space-between; font-size: 0.84rem; margin-bottom: 8px; }
        .pb-row.total { font-weight: 700; font-size: 0.94rem; padding-top: 12px; border-top: 1px solid #E8E2D9; margin-top: 4px; }
        .pb-label { color: #6B5F54; }
        .pb-fee { font-size: 0.72rem; color: #F4601A; font-weight: 600; }

        .book-btn { width: 100%; background: linear-gradient(135deg, #F4601A, #FF7A35); border: none; border-radius: 14px; padding: 16px; font-size: 1rem; font-weight: 700; color: white; cursor: pointer; font-family: inherit; margin-bottom: 10px; transition: all 0.2s; }
        .book-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(244,96,26,0.3); }
        .book-note { text-align: center; font-size: 0.72rem; color: #A89880; }
        .instant-note { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 0.76rem; font-weight: 600; color: #1A6EF4; margin-top: 8px; }

        .fee-highlight { background: linear-gradient(135deg, rgba(244,96,26,0.06), rgba(26,110,244,0.06)); border: 1px solid rgba(244,96,26,0.15); border-radius: 12px; padding: 12px 14px; margin-top: 14px; text-align: center; }
        .fh-title { font-size: 0.8rem; font-weight: 700; color: #F4601A; margin-bottom: 2px; }
        .fh-sub { font-size: 0.7rem; color: #6B5F54; }

        .divider { border: none; border-top: 1px solid #E8E2D9; margin: 24px 0; }

        .footer { background: #1A1410; color: #A89880; padding: 32px 48px; display: flex; align-items: center; justify-content: space-between; }
        .footer-logo { font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: #F5EFE8; }
        .footer-logo span { color: #F4601A; }

        @media (max-width: 900px) { .main { grid-template-columns: 1fr; } .sidebar { position: relative; top: 0; } .amenities-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 600px) { .main, .nav, .hero-back { padding-left: 20px; } .hero-badges, .hero-rating { left: 20px; } }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <a href="/" className="logo">Snap<span>Reserve</span></a>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/login" className="nav-btn outline">Log in</a>
          <a href="/signup" className="nav-btn solid">Sign up</a>
        </div>
      </nav>

      {/* HERO */}
      <div className="hero">
        <img src={heroImg} alt={listing.title} />
        <div className="hero-overlay" />
        <a href="/listings" className="hero-back">← Back to listings</a>
        <div className="hero-badges">
          <span className="hero-badge" style={{background:'white',color: listing.type === 'hotel' ? '#F4601A' : '#1A6EF4'}}>
            {listing.type === 'hotel' ? '🏨 Hotel' : '🏠 Private Stay'}
          </span>
          {listing.is_instant_book && (
            <span className="hero-badge" style={{background:'#1A6EF4',color:'white'}}>⚡ Instant Book</span>
          )}
        </div>
        <div className="hero-rating">
          <div className="hr-num">{listing.rating}</div>
          <div className="hr-stars">★★★★★</div>
          <div className="hr-count">{listing.review_count} reviews</div>
        </div>
      </div>

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

          {/* HOST */}
          <div className="section">
            <div className="host-card">
              <div className="host-avatar">
                {host?.avatar_url ? <img src={host.avatar_url} alt={host.full_name} /> : '👤'}
              </div>
              <div>
                <div className="host-name">Hosted by {host?.full_name || 'SnapReserve Host'}</div>
                <div className="host-meta">Member since 2026</div>
                {host?.is_verified && <div className="host-verified">✓ Verified host</div>}
              </div>
            </div>
            <div style={{ marginTop: '14px' }}>
              <MessageHostButton listingId={listing.id} />
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="section">
            <div className="section-title">📖 About this stay</div>
            <p className="description">{listing.description}</p>
          </div>

          <hr className="divider" />

          {/* ROOMS */}
          {rooms && rooms.length > 0 && (
            <div className="section">
              <div className="section-title">🛏️ Choose your room</div>
              <div className="rooms-list">
                {rooms.map((room) => {
                  const tier = tierColors[room.tier] || tierColors.Standard
                  const roomAmenities = room.amenities ? room.amenities.split(',').slice(0, 4) : []
                  const serviceFee = Math.round(room.price_per_night * serviceFeePct)

                  return (
                    <div key={room.id} className="room-card">
                      <div className="room-header">
                        <div>
                          <span className="room-tier" style={{background: tier.bg, color: tier.text, border: `1px solid ${tier.border}`}}>
                            {room.tier}
                          </span>
                          <div className="room-name" style={{marginTop:'8px'}}>{room.name}</div>
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
                      <div style={{fontSize:'0.76rem',color:'#6B5F54',marginBottom:'4px'}}>
                        + ${listing.cleaning_fee} cleaning · + ${serviceFee} service fee
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

          <hr className="divider" />

          {/* AMENITIES */}
          <div className="section">
            <div className="section-title">✨ Amenities</div>
            <div className="amenities-grid">
              {amenities.map(a => (
                <div key={a} className="amenity">
                  ✓ {a.trim()}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="sidebar">
          <BookingSidebar listing={listing} />
        </div>
      </div>

      <div style={{ maxWidth:'1180px', margin:'0 auto', padding:'0 48px 32px', textAlign:'right' }}>
        <ReportButton listingId={listing.id} />
      </div>

      <footer className="footer">
        <div className="footer-logo">Snap<span>Reserve</span></div>
        <div style={{fontSize:'0.74rem'}}>© 2026 SnapReserve · snapreserve.app</div>
      </footer>
      </div>
    </>
  )
}