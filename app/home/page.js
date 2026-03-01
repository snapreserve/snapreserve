'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

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

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState('hotel')
  const [listings, setListings] = useState([])
  const [cities, setCities] = useState([])
  const [stats, setStats] = useState({ hotels: 0, private_stays: 0, cities: 0, hosts: 0 })
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    // Check admin access
    const access = sessionStorage.getItem('admin_access')
    if (access !== 'true') {
      router.push('/')
      return
    }
    setAuthorized(true)

    async function fetchData() {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false })
      setListings(data || [])
      setCities([...new Set((data || []).map(l => l.city))])

      const { count: hotelTotal } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true).eq('type', 'hotel')

      const { count: privateTotal } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true).eq('type', 'private_stay')

      const { count: hostCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_host', true)

      const allCities = data ? [...new Set(data.map(l => l.city))].length : 0
      setStats({ hotels: hotelTotal || 0, private_stays: privateTotal || 0, cities: allCities, hosts: hostCount || 0 })
    }
    fetchData()
  }, [])

  const isHotel = mode === 'hotel'
  const accentColor = isHotel ? '#1A6EF4' : '#F4601A'
  const heroBg = isHotel
    ? 'linear-gradient(160deg, #f0f6ff 0%, #fffbf8 50%, #fff9f6 100%)'
    : 'linear-gradient(160deg, #fff9f6 0%, #fffbf8 50%, #f0f6ff 100%)'
  const heroTitle = isHotel ? 'Discover world-class hotels with' : 'Find your perfect home away from home with'
  const heroSub = isHotel
    ? 'Luxury hotels and boutique stays across the US — all with our industry-lowest 3.2% fee.'
    : 'Private homes, villas, and unique stays across the US — all with our industry-lowest 3.2% fee.'
  const filteredListings = listings.filter(l => l.type === mode)
  const currentCount = isHotel ? stats.hotels : stats.private_stays

  if (!authorized) return null

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: #FAF8F5; color: #1A1410; }
        .admin-bar { background: #1A1410; color: rgba(255,255,255,0.6); font-size: 0.76rem; padding: 8px 48px; display: flex; align-items: center; justify-content: space-between; }
        .admin-bar span { color: #F4601A; font-weight: 700; }
        .admin-bar a { color: rgba(255,255,255,0.4); text-decoration: none; font-size: 0.72rem; }
        .admin-bar a:hover { color: white; }
        .nav { display: flex; align-items: center; justify-content: space-between; padding: 0 48px; height: 68px; background: white; border-bottom: 1px solid #E8E2D9; position: sticky; top: 0; z-index: 100; }
        .logo { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 900; text-decoration: none; color: #1A1410; }
        .logo span { color: #F4601A; }
        .nav-links { display: flex; align-items: center; gap: 8px; }
        .nav-link { padding: 8px 16px; border-radius: 100px; font-size: 0.84rem; font-weight: 600; color: #6B5F54; text-decoration: none; }
        .nav-link:hover { background: #F3F0EB; }
        .nav-btn { padding: 8px 20px; border-radius: 100px; font-size: 0.84rem; font-weight: 700; text-decoration: none; }
        .nav-btn.outline { border: 1px solid #D4CEC5; color: #1A1410; }
        .nav-btn.solid { background: #F4601A; color: white; }
        .toggle-wrap { display: flex; justify-content: center; padding: 20px; background: white; border-bottom: 1px solid #E8E2D9; }
        .toggle { display: inline-flex; background: #F3F0EB; border-radius: 100px; padding: 4px; }
        .toggle-btn { padding: 10px 28px; border-radius: 100px; font-size: 0.9rem; font-weight: 700; border: none; cursor: pointer; font-family: inherit; transition: all 0.25s; color: #6B5F54; background: transparent; }
        .toggle-btn.hotel-active { background: #1A6EF4; color: white; box-shadow: 0 2px 12px rgba(26,110,244,0.35); }
        .toggle-btn.private-active { background: #F4601A; color: white; box-shadow: 0 2px 12px rgba(244,96,26,0.35); }
        .hero { padding: 64px 48px 56px; text-align: center; border-bottom: 1px solid #E8E2D9; transition: background 0.4s; }
        .us-banner { display: inline-flex; align-items: center; gap: 8px; background: rgba(244,96,26,0.08); border: 1px solid rgba(244,96,26,0.2); border-radius: 100px; padding: 6px 18px; font-size: 0.74rem; font-weight: 700; color: #F4601A; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 0.06em; }
        .hero h1 { font-family: 'Playfair Display', serif; font-size: clamp(2rem, 4vw, 3.2rem); font-weight: 700; line-height: 1.15; letter-spacing: -1px; margin-bottom: 16px; max-width: 700px; margin-left: auto; margin-right: auto; }
        .hero-sub { font-size: 1rem; color: #6B5F54; max-width: 520px; margin: 0 auto 40px; line-height: 1.7; }
        .search-box { background: white; border-radius: 20px; box-shadow: 0 8px 40px rgba(0,0,0,0.12); max-width: 860px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr 1fr auto; overflow: hidden; border: 1px solid #E8E2D9; }
        .search-field { padding: 20px 24px; border-right: 1px solid #E8E2D9; }
        .sf-label { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #C4BAB0; margin-bottom: 4px; }
        .sf-input { width: 100%; border: none; outline: none; font-size: 0.9rem; font-weight: 600; color: #1A1410; background: transparent; font-family: inherit; }
        .sf-input::placeholder { color: #A89880; font-weight: 400; }
        .search-btn { border: none; padding: 0 32px; font-size: 0.9rem; font-weight: 700; color: white; cursor: pointer; font-family: inherit; }
        .main { max-width: 1280px; margin: 0 auto; padding: 48px 48px 80px; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .section-title { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; }
        .see-all { font-size: 0.84rem; font-weight: 600; text-decoration: none; }
        .cities-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 56px; }
        .city-card { border-radius: 16px; overflow: hidden; position: relative; cursor: pointer; height: 140px; text-decoration: none; }
        .city-card img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
        .city-card:hover img { transform: scale(1.06); }
        .city-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%); display: flex; align-items: flex-end; padding: 14px; }
        .city-name { font-weight: 700; font-size: 0.9rem; color: white; }
        .listings-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 56px; }
        .listing-card { background: white; border-radius: 18px; overflow: hidden; border: 1px solid #E8E2D9; transition: all 0.22s; text-decoration: none; color: inherit; display: block; }
        .listing-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,0.12); }
        .card-img { height: 200px; background: #F3F0EB; position: relative; overflow: hidden; }
        .card-img img { width: 100%; height: 100%; object-fit: cover; }
        .card-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; }
        .card-badge { position: absolute; top: 12px; left: 12px; padding: 4px 10px; border-radius: 100px; font-size: 0.68rem; font-weight: 700; }
        .instant-badge { position: absolute; top: 12px; right: 12px; background: white; padding: 4px 10px; border-radius: 100px; font-size: 0.68rem; font-weight: 700; color: #1A6EF4; }
        .card-body { padding: 16px; }
        .card-title { font-weight: 700; font-size: 0.94rem; margin-bottom: 4px; }
        .card-location { font-size: 0.78rem; color: #6B5F54; margin-bottom: 10px; }
        .card-footer { display: flex; align-items: center; justify-content: space-between; }
        .card-price { font-size: 0.96rem; font-weight: 700; }
        .card-price span { font-size: 0.74rem; font-weight: 400; color: #A89880; }
        .card-rating { font-size: 0.78rem; font-weight: 600; color: #D97706; }
        .card-amenities { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
        .amenity-tag { font-size: 0.66rem; background: #F3F0EB; color: #6B5F54; padding: 2px 8px; border-radius: 100px; font-weight: 600; }
        .stats-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 56px; }
        .stat-card { background: white; border: 1px solid #E8E2D9; border-radius: 16px; padding: 24px; text-align: center; }
        .stat-num { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; margin-bottom: 4px; }
        .stat-label { font-size: 0.8rem; color: #6B5F54; }
        .host-cta { background: linear-gradient(135deg, #1A1410 0%, #2C2018 100%); border-radius: 24px; padding: 48px; display: grid; grid-template-columns: 1fr auto; gap: 40px; align-items: center; margin-bottom: 56px; }
        .hc-title { font-family: 'Playfair Display', serif; font-size: 1.8rem; font-weight: 700; color: white; margin-bottom: 10px; }
        .hc-title em { font-style: italic; color: #F4601A; }
        .hc-sub { font-size: 0.9rem; color: rgba(255,255,255,0.5); line-height: 1.7; }
        .hc-btn { background: #F4601A; color: white; padding: 16px 32px; border-radius: 100px; font-weight: 700; font-size: 0.94rem; text-decoration: none; white-space: nowrap; }
        .footer { background: #1A1410; color: #A89880; padding: 40px 48px; display: flex; align-items: center; justify-content: space-between; }
        .footer-logo { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; color: #F5EFE8; }
        .footer-logo span { color: #F4601A; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { font-size: 0.8rem; color: #A89880; text-decoration: none; }
        @media (max-width: 1024px) { .listings-grid { grid-template-columns: repeat(3,1fr); } .cities-grid { grid-template-columns: repeat(3,1fr); } }
        @media (max-width: 768px) { .listings-grid { grid-template-columns: repeat(2,1fr); } .search-box { grid-template-columns: 1fr; } .cities-grid { grid-template-columns: repeat(2,1fr); } .stats-strip { grid-template-columns: repeat(2,1fr); } .nav, .hero, .main, .admin-bar { padding-left: 20px; padding-right: 20px; } .host-cta { grid-template-columns: 1fr; } }
      `}</style>

      {/* ADMIN PREVIEW BAR */}
      <div className="admin-bar">
        <div>🔒 <span>Admin Preview Mode</span> — this site is not visible to the public</div>
        <a href="/" onClick={() => sessionStorage.removeItem('admin_access')}>Exit preview</a>
      </div>

      <nav className="nav">
        <a href="/home" className="logo">Snap<span>Reserve™</span></a>
        <div className="nav-links">
          <a href="/listings" className="nav-link">Stays</a>
          <a href="/coming-soon?page=cars" className="nav-link">Cars</a>
          <a href="/coming-soon?page=experiences" className="nav-link">Experiences</a>
          <a href="/coming-soon?page=support" className="nav-link">Support</a>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/login" className="nav-btn outline">Log in</a>
          <a href="/signup" className="nav-btn solid">Sign up</a>
        </div>
      </nav>

      <div className="toggle-wrap">
        <div className="toggle">
          <button className={`toggle-btn ${isHotel ? 'hotel-active' : ''}`} onClick={() => setMode('hotel')}>🏨 Hotel Bookings</button>
          <button className={`toggle-btn ${!isHotel ? 'private-active' : ''}`} onClick={() => setMode('private_stay')}>🏠 Private Stays</button>
        </div>
      </div>

      <div className="hero" style={{background: heroBg}}>
        <div className="us-banner">🇺🇸 Now live in the United States</div>
        <h1>{heroTitle}<br/><em style={{color: accentColor, fontStyle:'italic'}}>SnapReserve™.</em></h1>
        <p className="hero-sub">{heroSub}</p>
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
          <button className="search-btn" style={{background: accentColor}}>🔍 Search</button>
        </div>
      </div>

      <div className="main">
        <div className="section-header">
          <h2 className="section-title">Explore by <span style={{color: accentColor}}>city</span></h2>
        </div>
        <div className="cities-grid">
          {cities.map(city => (
            <a key={city} href={`/listings?city=${city}&type=${mode}`} className="city-card">
              <img src={cityImages[city]} alt={city} />
              <div className="city-overlay"><div className="city-name">{city}</div></div>
            </a>
          ))}
        </div>

        <div className="stats-strip">
          <div className="stat-card">
            <div className="stat-num" style={{color: accentColor}}>{currentCount}+</div>
            <div className="stat-label">{isHotel ? 'Hotels' : 'Private stays'} available</div>
          </div>
          <div className="stat-card">
            <div className="stat-num" style={{color: accentColor}}>{stats.cities}</div>
            <div className="stat-label">US cities</div>
          </div>
          <div className="stat-card">
            <div className="stat-num" style={{color: accentColor}}>3.2%</div>
            <div className="stat-label">Platform fee — lowest in industry</div>
          </div>
          <div className="stat-card">
            <div className="stat-num" style={{color: accentColor}}>{stats.hosts}+</div>
            <div className="stat-label">Verified hosts</div>
          </div>
        </div>

        <div className="section-header">
          <h2 className="section-title">Top rated <span style={{color: accentColor}}>{isHotel ? 'hotels' : 'private stays'}</span></h2>
          <a href={`/listings?type=${mode}`} className="see-all" style={{color: accentColor}}>See all →</a>
        </div>

        <div className="listings-grid">
          {filteredListings.length === 0 && <div style={{gridColumn:'1/-1',textAlign:'center',padding:'60px',color:'#A89880'}}>Loading...</div>}
          {filteredListings.map((listing) => {
            const typeInfo = typeColors[listing.type] || typeColors.hotel
            const amenities = listing.amenities ? listing.amenities.split(',').slice(0, 3) : []
            const cityImg = cityImages[listing.city]
            return (
              <a key={listing.id} href={`/listings/${listing.id}`} className="listing-card">
                <div className="card-img">
                  {cityImg ? <img src={cityImg} alt={listing.title} /> : <div className="card-img-placeholder">{isHotel ? '🏨' : '🏠'}</div>}
                  <div className="card-badge" style={{background: typeInfo.bg, color: typeInfo.text}}>{typeInfo.label}</div>
                  {listing.is_instant_book && <div className="instant-badge">⚡ Instant</div>}
                </div>
                <div className="card-body">
                  <div className="card-title">{listing.title}</div>
                  <div className="card-location">📍 {listing.city}, {listing.state}</div>
                  <div className="card-amenities">{amenities.map(a => <span key={a} className="amenity-tag">{a.trim()}</span>)}</div>
                  <div className="card-footer">
                    <div className="card-price" style={{color: accentColor}}>${listing.price_per_night} <span>/night</span></div>
                    <div className="card-rating">★ {listing.rating} <span style={{fontSize:'0.7rem',color:'#A89880'}}>({listing.review_count})</span></div>
                  </div>
                </div>
              </a>
            )
          })}
        </div>

        <div className="host-cta">
          <div>
            <div className="hc-title">Start earning with <em>SnapReserve™</em></div>
            <div className="hc-sub">List your property and reach thousands of guests. Lowest platform fee in the industry at just 3.2%.</div>
          </div>
          <a href="/list-property" className="hc-btn">List your property →</a>
        </div>
      </div>

      <footer className="footer">
        <div className="footer-logo">Snap<span>Reserve™</span></div>
        <div className="footer-links">
          <a href="/coming-soon?page=support">Support</a>
          <a href="/list-property">Host</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </div>
        <div style={{fontSize:'0.74rem'}}>© 2026 SnapReserve™ · snapreserve.app</div>
      </footer>
    </>
  )
}