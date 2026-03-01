import { supabase } from '../lib/supabase'
import Link from 'next/link'

const cityImages = {
  'New York': 'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=800&q=80',
  'Miami': 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=800&q=80',
  'Los Angeles': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&q=80',
  'Chicago': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&q=80',
  'New Orleans': 'https://images.unsplash.com/photo-1568869893270-a8d9f08dc84c?w=800&q=80',
}

const typeColors = {
  hotel: { bg: '#FFF3ED', text: '#F4601A', label: '🏨 Hotel' },
  private_stay: { bg: '#EDF4FF', text: '#1A6EF4', label: '🏠 Private Stay' },
}

export default async function Home() {
  const { data: listings, error } = await supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .order('rating', { ascending: false })

  const cities = [...new Set((listings || []).map(l => l.city))]

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; background: #FAF8F5; color: #1A1410; }
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        /* NAV */
        .nav { display: flex; align-items: center; justify-content: space-between; padding: 0 48px; height: 68px; background: white; border-bottom: 1px solid #E8E2D9; position: sticky; top: 0; z-index: 100; }
        .logo { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 900; text-decoration: none; color: #1A1410; }
        .logo span { color: #F4601A; }
        .nav-links { display: flex; align-items: center; gap: 8px; }
        .nav-link { padding: 8px 16px; border-radius: 100px; font-size: 0.84rem; font-weight: 600; color: #6B5F54; text-decoration: none; transition: all 0.18s; border: 1px solid transparent; }
        .nav-link:hover { background: #F3F0EB; }
        .nav-btn { padding: 8px 20px; border-radius: 100px; font-size: 0.84rem; font-weight: 700; text-decoration: none; transition: all 0.18s; }
        .nav-btn.outline { border: 1px solid #D4CEC5; color: #1A1410; }
        .nav-btn.outline:hover { border-color: #1A1410; }
        .nav-btn.solid { background: #F4601A; color: white; border: 1px solid #F4601A; }
        .nav-btn.solid:hover { background: #FF7A35; }

        /* HERO */
        .hero { background: linear-gradient(160deg, #fff9f6 0%, #fffbf8 50%, #f0f6ff 100%); padding: 80px 48px 64px; text-align: center; border-bottom: 1px solid #E8E2D9; position: relative; overflow: hidden; }
        .hero::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(circle, rgba(244,96,26,0.08) 1px, transparent 1px); background-size: 48px 48px; pointer-events: none; }
        .us-banner { display: inline-flex; align-items: center; gap: 8px; background: rgba(244,96,26,0.08); border: 1px solid rgba(244,96,26,0.2); border-radius: 100px; padding: 6px 18px; font-size: 0.74rem; font-weight: 700; color: #F4601A; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 0.06em; }
        .hero h1 { font-family: 'Playfair Display', serif; font-size: clamp(2.4rem, 5vw, 3.6rem); font-weight: 700; line-height: 1.1; letter-spacing: -1px; margin-bottom: 16px; }
        .hero h1 em { font-style: italic; color: #F4601A; }
        .hero-sub { font-size: 1rem; color: #6B5F54; max-width: 520px; margin: 0 auto 40px; line-height: 1.7; }

        /* SEARCH BOX */
        .search-box { background: white; border-radius: 20px; box-shadow: 0 8px 40px rgba(0,0,0,0.12); max-width: 860px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr 1fr auto; overflow: hidden; border: 1px solid #E8E2D9; }
        .search-field { padding: 20px 24px; border-right: 1px solid #E8E2D9; cursor: pointer; transition: background 0.15s; }
        .search-field:hover { background: #FAF8F5; }
        .sf-label { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #C4BAB0; margin-bottom: 4px; }
        .sf-input { width: 100%; border: none; outline: none; font-size: 0.9rem; font-weight: 600; color: #1A1410; background: transparent; font-family: inherit; cursor: pointer; }
        .sf-input::placeholder { color: #A89880; font-weight: 400; }
        .search-btn { background: #F4601A; border: none; padding: 0 32px; font-size: 0.9rem; font-weight: 700; color: white; cursor: pointer; font-family: inherit; transition: background 0.18s; display: flex; align-items: center; gap: 8px; }
        .search-btn:hover { background: #FF7A35; }

        /* MODE PILLS */
        .mode-pills { display: flex; justify-content: center; gap: 8px; margin-top: 28px; }
        .mode-pill { padding: 8px 20px; border-radius: 100px; font-size: 0.82rem; font-weight: 600; border: 1px solid #E8E2D9; background: white; color: #6B5F54; cursor: pointer; transition: all 0.18s; text-decoration: none; }
        .mode-pill.active, .mode-pill:hover { background: #1A6EF4; border-color: #1A6EF4; color: white; }

        /* MAIN */
        .main { max-width: 1280px; margin: 0 auto; padding: 48px 48px 80px; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .section-title { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; }
        .section-title span { color: #F4601A; }
        .see-all { font-size: 0.84rem; font-weight: 600; color: #F4601A; text-decoration: none; }
        .see-all:hover { text-decoration: underline; }

        /* CITIES */
        .cities-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 56px; }
        .city-card { border-radius: 16px; overflow: hidden; position: relative; cursor: pointer; height: 140px; text-decoration: none; }
        .city-card img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
        .city-card:hover img { transform: scale(1.06); }
        .city-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%); display: flex; align-items: flex-end; padding: 14px; }
        .city-name { font-weight: 700; font-size: 0.9rem; color: white; }

        /* LISTINGS GRID */
        .listings-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 56px; }
        .listing-card { background: white; border-radius: 18px; overflow: hidden; border: 1px solid #E8E2D9; transition: all 0.22s; cursor: pointer; text-decoration: none; color: inherit; display: block; }
        .listing-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,0.12); border-color: #D4CEC5; }
        .card-img { height: 200px; background: #F3F0EB; position: relative; overflow: hidden; }
        .card-img img { width: 100%; height: 100%; object-fit: cover; }
        .card-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; }
        .card-badge { position: absolute; top: 12px; left: 12px; padding: 4px 10px; border-radius: 100px; font-size: 0.68rem; font-weight: 700; }
        .instant-badge { position: absolute; top: 12px; right: 12px; background: white; padding: 4px 10px; border-radius: 100px; font-size: 0.68rem; font-weight: 700; color: #1A6EF4; }
        .card-body { padding: 16px; }
        .card-title { font-weight: 700; font-size: 0.94rem; margin-bottom: 4px; line-height: 1.3; }
        .card-location { font-size: 0.78rem; color: #6B5F54; margin-bottom: 10px; }
        .card-footer { display: flex; align-items: center; justify-content: space-between; }
        .card-price { font-size: 0.96rem; font-weight: 700; color: #1A6EF4; }
        .card-price span { font-size: 0.74rem; font-weight: 400; color: #A89880; }
        .card-rating { font-size: 0.78rem; font-weight: 600; color: #D97706; display: flex; align-items: center; gap: 3px; }
        .card-reviews { font-size: 0.7rem; color: #A89880; font-weight: 400; }
        .card-amenities { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
        .amenity-tag { font-size: 0.66rem; background: #F3F0EB; color: #6B5F54; padding: 2px 8px; border-radius: 100px; font-weight: 600; }

        /* STATS */
        .stats-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 56px; }
        .stat-card { background: white; border: 1px solid #E8E2D9; border-radius: 16px; padding: 24px; text-align: center; }
        .stat-num { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; color: #F4601A; margin-bottom: 4px; }
        .stat-label { font-size: 0.8rem; color: #6B5F54; }

        /* HOST CTA */
        .host-cta { background: linear-gradient(135deg, #1A1410 0%, #2C2018 100%); border-radius: 24px; padding: 48px; display: grid; grid-template-columns: 1fr auto; gap: 40px; align-items: center; margin-bottom: 56px; }
        .hc-title { font-family: 'Playfair Display', serif; font-size: 1.8rem; font-weight: 700; color: white; margin-bottom: 10px; }
        .hc-title em { font-style: italic; color: #F4601A; }
        .hc-sub { font-size: 0.9rem; color: rgba(255,255,255,0.5); line-height: 1.7; }
        .hc-btn { background: #F4601A; color: white; padding: 16px 32px; border-radius: 100px; font-weight: 700; font-size: 0.94rem; text-decoration: none; white-space: nowrap; transition: background 0.18s; }
        .hc-btn:hover { background: #FF7A35; }

        /* FOOTER */
        .footer { background: #1A1410; color: #A89880; padding: 40px 48px; display: flex; align-items: center; justify-content: space-between; }
        .footer-logo { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; color: #F5EFE8; }
        .footer-logo span { color: #F4601A; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { font-size: 0.8rem; color: #A89880; text-decoration: none; }
        .footer-links a:hover { color: #F5EFE8; }
        .footer-copy { font-size: 0.74rem; }

        @media (max-width: 1024px) { .listings-grid { grid-template-columns: repeat(3, 1fr); } .cities-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px) { .listings-grid { grid-template-columns: repeat(2, 1fr); } .search-box { grid-template-columns: 1fr; } .cities-grid { grid-template-columns: repeat(2, 1fr); } .stats-strip { grid-template-columns: repeat(2, 1fr); } .nav { padding: 0 20px; } .hero, .main { padding-left: 20px; padding-right: 20px; } .host-cta { grid-template-columns: 1fr; } }
        @media (max-width: 480px) { .listings-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <a href="/" className="logo">Snap<span>Reserve</span></a>
        <div className="nav-links">
          <a href="/listings" className="nav-link">Stays</a>
          <a href="/cars" className="nav-link">Cars</a>
          <a href="/experiences" className="nav-link">Experiences</a>
          <a href="/support" className="nav-link">Support</a>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/login" className="nav-btn outline">Log in</a>
          <a href="/signup" className="nav-btn solid">Sign up</a>
        </div>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="us-banner">🇺🇸 Now live in the United States</div>
        <h1>Discover world-class stays<br/>with <em>SnapReserve.</em></h1>
        <p className="hero-sub">Hotels, private homes, and unique stays across the US — all with our industry-lowest 3.2% fee.</p>

        <div className="search-box">
          <div className="search-field">
            <div className="sf-label">Destination</div>
            <input className="sf-input" placeholder="Where are you going?" />
          </div>
          <div className="search-field">
            <div className="sf-label">Check-in</div>
            <input className="sf-input" type="date" />
          </div>
          <div className="search-field" style={{borderRight:'none'}}>
            <div className="sf-label">Guests</div>
            <input className="sf-input" placeholder="2 guests" />
          </div>
          <button className="search-btn">
            🔍 Search
          </button>
        </div>

        <div className="mode-pills">
          <a href="/listings?type=hotel" className="mode-pill active">🏨 Hotels</a>
          <a href="/listings?type=private_stay" className="mode-pill">🏠 Private Stays</a>
          <a href="/cars" className="mode-pill">🚗 Cars · Soon</a>
          <a href="/experiences" className="mode-pill">✨ Experiences · Soon</a>
        </div>
      </div>

      <div className="main">

        {/* CITIES */}
        <div className="section-header">
          <h2 className="section-title">Explore by <span>city</span></h2>
        </div>
        <div className="cities-grid">
          {cities.map(city => (
            <a key={city} href={`/listings?city=${city}`} className="city-card">
              <img src={cityImages[city] || `https://source.unsplash.com/featured/?${city},city`} alt={city} />
              <div className="city-overlay">
                <div className="city-name">{city}</div>
              </div>
            </a>
          ))}
        </div>

        {/* STATS */}
        <div className="stats-strip">
          <div className="stat-card">
            <div className="stat-num">{listings?.length || 0}+</div>
            <div className="stat-label">Properties available</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{cities.length}</div>
            <div className="stat-label">US cities</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">3.2%</div>
            <div className="stat-label">Platform fee — lowest in industry</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">24/7</div>
            <div className="stat-label">Guest & host support</div>
          </div>
        </div>

        {/* LISTINGS */}
        <div className="section-header">
          <h2 className="section-title">Top rated <span>stays</span></h2>
          <a href="/listings" className="see-all">See all →</a>
        </div>

        <div className="listings-grid">
          {(listings || []).map((listing) => {
            const typeInfo = typeColors[listing.type] || typeColors.hotel
            const amenities = listing.amenities ? listing.amenities.split(',').slice(0, 3) : []
            const cityImg = cityImages[listing.city]
            const placeholderEmoji = listing.type === 'hotel' ? '🏨' : '🏠'

            return (
              <a key={listing.id} href={`/listings/${listing.id}`} className="listing-card">
                <div className="card-img">
                  {cityImg ? (
                    <img src={cityImg} alt={listing.title} />
                  ) : (
                    <div className="card-img-placeholder">{placeholderEmoji}</div>
                  )}
                  <div className="card-badge" style={{background: typeInfo.bg, color: typeInfo.text}}>
                    {typeInfo.label}
                  </div>
                  {listing.is_instant_book && (
                    <div className="instant-badge">⚡ Instant</div>
                  )}
                </div>
                <div className="card-body">
                  <div className="card-title">{listing.title}</div>
                  <div className="card-location">📍 {listing.city}, {listing.state}</div>
                  <div className="card-amenities">
                    {amenities.map(a => (
                      <span key={a} className="amenity-tag">{a.trim()}</span>
                    ))}
                  </div>
                  <div className="card-footer">
                    <div className="card-price">
                      ${listing.price_per_night} <span>/night</span>
                    </div>
                    <div className="card-rating">
                      ★ {listing.rating}
                      <span className="card-reviews">({listing.review_count})</span>
                    </div>
                  </div>
                </div>
              </a>
            )
          })}
        </div>

        {/* HOST CTA */}
        <div className="host-cta">
          <div>
            <div className="hc-title">Start earning with <em>SnapReserve</em></div>
            <div className="hc-sub">List your property and reach thousands of guests. Lowest platform fee in the industry at just 3.2%. You keep more of what you earn.</div>
          </div>
          <a href="/list-property" className="hc-btn">List your property →</a>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">Snap<span>Reserve</span></div>
        <div className="footer-links">
          <a href="/support">Support</a>
          <a href="/list-property">Host</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </div>
        <div className="footer-copy">© 2026 SnapReserve · snapreserve.app</div>
      </footer>
    </>
  )
}