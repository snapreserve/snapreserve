'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
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

export default function ListingsPage() {
  const [listings, setListings] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [priceFilter, setPriceFilter] = useState('all')
  const [sortBy, setSortBy] = useState('rating')

  useEffect(() => {
    fetchListings()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [listings, search, typeFilter, priceFilter, sortBy])

  async function fetchListings() {
    setLoading(true)
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('is_active', true)
    if (!error) setListings(data || [])
    setLoading(false)
  }

  function applyFilters() {
    let result = [...listings]

    if (search) {
      const s = search.toLowerCase()
      result = result.filter(l =>
        l.title.toLowerCase().includes(s) ||
        l.city.toLowerCase().includes(s) ||
        l.state.toLowerCase().includes(s)
      )
    }

    if (typeFilter !== 'all') {
      result = result.filter(l => l.type === typeFilter)
    }

    if (priceFilter === 'under200') result = result.filter(l => l.price_per_night < 200)
    if (priceFilter === '200to500') result = result.filter(l => l.price_per_night >= 200 && l.price_per_night <= 500)
    if (priceFilter === 'over500') result = result.filter(l => l.price_per_night > 500)

    if (sortBy === 'rating') result.sort((a, b) => b.rating - a.rating)
    if (sortBy === 'price_asc') result.sort((a, b) => a.price_per_night - b.price_per_night)
    if (sortBy === 'price_desc') result.sort((a, b) => b.price_per_night - a.price_per_night)
    if (sortBy === 'reviews') result.sort((a, b) => b.review_count - a.review_count)

    setFiltered(result)
  }

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: #FAF8F5; color: #1A1410; }

        .nav { display: flex; align-items: center; justify-content: space-between; padding: 0 48px; height: 68px; background: white; border-bottom: 1px solid #E8E2D9; position: sticky; top: 0; z-index: 100; }
        .logo { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 900; text-decoration: none; color: #1A1410; }
        .logo span { color: #F4601A; }
        .nav-links { display: flex; gap: 8px; }
        .nav-link { padding: 8px 16px; border-radius: 100px; font-size: 0.84rem; font-weight: 600; color: #6B5F54; text-decoration: none; }
        .nav-link:hover { background: #F3F0EB; }
        .nav-btn { padding: 8px 20px; border-radius: 100px; font-size: 0.84rem; font-weight: 700; text-decoration: none; }
        .nav-btn.outline { border: 1px solid #D4CEC5; color: #1A1410; }
        .nav-btn.solid { background: #F4601A; color: white; }

        .page-header { background: white; border-bottom: 1px solid #E8E2D9; padding: 24px 48px; }
        .ph-title { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; margin-bottom: 16px; }
        .ph-title span { color: #F4601A; }

        .filters { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .search-input { flex: 1; min-width: 200px; max-width: 320px; background: #FAF8F5; border: 1px solid #E8E2D9; border-radius: 12px; padding: 10px 16px; font-size: 0.86rem; font-family: inherit; outline: none; color: #1A1410; }
        .search-input:focus { border-color: #F4601A; }
        .filter-select { background: #FAF8F5; border: 1px solid #E8E2D9; border-radius: 12px; padding: 10px 16px; font-size: 0.84rem; font-family: inherit; outline: none; color: #1A1410; cursor: pointer; }
        .filter-select:focus { border-color: #F4601A; }
        .results-count { font-size: 0.82rem; color: #6B5F54; margin-left: auto; }

        .main { max-width: 1280px; margin: 0 auto; padding: 32px 48px 80px; }

        .listings-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
        .listing-card { background: white; border-radius: 18px; overflow: hidden; border: 1px solid #E8E2D9; transition: all 0.22s; text-decoration: none; color: inherit; display: block; }
        .listing-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,0.12); }
        .card-img { height: 200px; background: #F3F0EB; position: relative; overflow: hidden; }
        .card-img img { width: 100%; height: 100%; object-fit: cover; }
        .card-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; }
        .card-badge { position: absolute; top: 12px; left: 12px; padding: 4px 10px; border-radius: 100px; font-size: 0.68rem; font-weight: 700; }
        .instant-badge { position: absolute; top: 12px; right: 12px; background: white; padding: 4px 10px; border-radius: 100px; font-size: 0.68rem; font-weight: 700; color: #1A6EF4; }
        .card-body { padding: 16px; }
        .card-title { font-weight: 700; font-size: 0.94rem; margin-bottom: 4px; line-height: 1.3; }
        .card-location { font-size: 0.78rem; color: #6B5F54; margin-bottom: 10px; }
        .card-amenities { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
        .amenity-tag { font-size: 0.66rem; background: #F3F0EB; color: #6B5F54; padding: 2px 8px; border-radius: 100px; font-weight: 600; }
        .card-footer { display: flex; align-items: center; justify-content: space-between; }
        .card-price { font-size: 0.96rem; font-weight: 700; color: #1A6EF4; }
        .card-price span { font-size: 0.74rem; font-weight: 400; color: #A89880; }
        .card-rating { font-size: 0.78rem; font-weight: 600; color: #D97706; }
        .card-reviews { font-size: 0.7rem; color: #A89880; }

        .empty-state { text-align: center; padding: 80px 20px; grid-column: 1/-1; }
        .empty-icon { font-size: 3rem; margin-bottom: 16px; }
        .empty-title { font-family: 'Playfair Display', serif; font-size: 1.4rem; font-weight: 700; margin-bottom: 8px; }
        .empty-sub { font-size: 0.86rem; color: #6B5F54; }

        .loading { text-align: center; padding: 80px; grid-column: 1/-1; font-size: 1rem; color: #6B5F54; }

        .footer { background: #1A1410; color: #A89880; padding: 32px 48px; display: flex; align-items: center; justify-content: space-between; margin-top: 80px; }
        .footer-logo { font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: #F5EFE8; }
        .footer-logo span { color: #F4601A; }

        @media (max-width: 1024px) { .listings-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px) { .listings-grid { grid-template-columns: repeat(2, 1fr); } .nav, .page-header, .main { padding-left: 20px; padding-right: 20px; } }
        @media (max-width: 480px) { .listings-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <a href="/home" className="logo">Snap<span>Reserve</span></a>
        <div className="nav-links">
          <a href="/listings" className="nav-link">Stays</a>
          <a href="/coming-soon?page=support" className="nav-link">Support</a>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/login" className="nav-btn outline">Log in</a>
          <a href="/signup" className="nav-btn solid">Sign up</a>
        </div>
      </nav>

      {/* FILTERS HEADER */}
      <div className="page-header">
        <div className="ph-title">All <span>stays</span></div>
        <div className="filters">
          <input
            className="search-input"
            placeholder="🔍 Search by city or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            <option value="hotel">Hotels only</option>
            <option value="private_stay">Private stays only</option>
          </select>
          <select className="filter-select" value={priceFilter} onChange={e => setPriceFilter(e.target.value)}>
            <option value="all">Any price</option>
            <option value="under200">Under $200/night</option>
            <option value="200to500">$200–$500/night</option>
            <option value="over500">$500+/night</option>
          </select>
          <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="rating">Top rated</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="reviews">Most reviewed</option>
          </select>
          <div className="results-count">{filtered.length} properties found</div>
        </div>
      </div>

      <div className="main">
        <div className="listings-grid">
          {loading && <div className="loading">Loading stays...</div>}

          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">No stays found</div>
              <div className="empty-sub">Try adjusting your search or filters</div>
            </div>
          )}

          {!loading && filtered.map((listing) => {
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
                      ★ {listing.rating} <span className="card-reviews">({listing.review_count})</span>
                    </div>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      </div>

      <footer className="footer">
        <div className="footer-logo">Snap<span>Reserve</span></div>
        <div style={{fontSize:'0.74rem'}}>© 2026 SnapReserve · snapreserve.app</div>
      </footer>
    </>
  )
}