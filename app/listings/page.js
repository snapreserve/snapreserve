'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SharedHeader from '@/app/components/SharedHeader'

// Card themes for listings without real images
const CARD_THEMES = [
  { gradient: 'linear-gradient(135deg,#5a8aaa,#2a5a7a)', emoji: '🌊' },
  { gradient: 'linear-gradient(135deg,#8fb08f,#5a8a5a)', emoji: '🌴' },
  { gradient: 'linear-gradient(135deg,#c8a888,#a87848)', emoji: '🏔️' },
  { gradient: 'linear-gradient(135deg,#a898c8,#7868a8)', emoji: '🏙️' },
  { gradient: 'linear-gradient(135deg,#c8d898,#8ab860)', emoji: '🌿' },
  { gradient: 'linear-gradient(135deg,#d0c898,#b0a860)', emoji: '☀️' },
  { gradient: 'linear-gradient(135deg,#b8c8e8,#8898c8)', emoji: '🏖️' },
  { gradient: 'linear-gradient(135deg,#e8c8b8,#c89878)', emoji: '🌺' },
]

const TYPE_LABELS = {
  hotel:       'Hotel',
  private_stay:'Private Home',
  villa:       'Villa',
  cabin:       'Cabin',
}

// Row 1: Type filters (matches mobile)
const TYPE_PILLS = [
  { key: 'all',     label: 'All Stays' },
  { key: 'hotel',   label: 'Hotels' },
  { key: 'private', label: 'Private Stays' },
]

// Row 2: Location chips (matches mobile)
const LOCATION_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'new_york', label: 'New York City' },
  { key: 'los_angeles', label: 'Los Angeles' },
  { key: 'miami', label: 'Miami' },
  { key: 'chicago', label: 'Chicago' },
  { key: 'las_vegas', label: 'Las Vegas' },
  { key: 'san_francisco', label: 'San Francisco' },
  { key: 'nashville', label: 'Nashville' },
  { key: 'austin', label: 'Austin' },
  { key: 'boston', label: 'Boston' },
  { key: 'seattle', label: 'Seattle' },
]

// Row 3: Feature & price filters (matches mobile)
const FEATURE_PILLS = [
  { key: 'beach',     label: 'Beach' },
  { key: 'mountain',  label: 'Mountains' },
  { key: 'city',      label: 'City' },
  { key: 'countryside', label: 'Countryside' },
  { key: 'luxury',    label: 'Luxury' },
  { key: 'unique',    label: 'Unique Stay' },
  { key: 'under200',  label: 'Under $200' },
  { key: '200to500',  label: '$200-$500' },
  { key: '500plus',   label: '$500+' },
  { key: 'toprated',  label: 'Top Rated' },
  { key: 'instant',   label: 'Instant Book' },
]

const SORT_OPTIONS = [
  { key: 'top_rated', label: 'Top Rated' },
  { key: 'price_low',  label: 'Price: Low to High' },
  { key: 'price_high', label: 'Price: High to Low' },
  { key: 'newest',     label: 'Newest' },
]

function ListingsInner() {
  const searchParams = useSearchParams()
  const cityParam    = searchParams.get('city')    || ''
  const stateParam   = searchParams.get('state')   || ''
  const countryParam = searchParams.get('country') || ''

  const [listings,     setListings]     = useState([])
  const [filtered,     setFiltered]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [destination,  setDestination]  = useState(cityParam || '')
  const [typeFilter,   setTypeFilter]   = useState('all')       // all | hotel | private
  const [locationChip, setLocationChip] = useState('all')      // all | new_york | miami | ...
  const [featurePills, setFeaturePills] = useState([])         // beach, mountain, under200, etc.
  const [sortBy,       setSortBy]       = useState('top_rated')

  useEffect(() => {
    fetchListings()
  }, [])

  const LOCATION_MAP = {
    new_york:      ['new york', 'new york city', 'nyc'],
    los_angeles:   ['los angeles', 'la'],
    miami:         ['miami', 'miami beach'],
    chicago:       ['chicago'],
    las_vegas:     ['las vegas'],
    san_francisco: ['san francisco', 'sf'],
    nashville:     ['nashville'],
    austin:        ['austin'],
    boston:        ['boston'],
    seattle:       ['seattle'],
  }

  useEffect(() => { applyFilters() }, [listings, destination, typeFilter, locationChip, featurePills, sortBy, cityParam, stateParam, countryParam])

  async function fetchListings() {
    setLoading(true)
    const { data, error } = await supabase.from('listings').select('*').eq('is_active', true)
    if (!error) setListings(data || [])
    setLoading(false)
  }

  function applyFilters() {
    let r = [...listings]
    if (countryParam) r = r.filter(l => (l.country||'').toLowerCase() === countryParam.toLowerCase())
    if (stateParam)   r = r.filter(l => (l.state||'').toLowerCase()   === stateParam.toLowerCase())
    if (cityParam)    r = r.filter(l => (l.city||'').toLowerCase()    === cityParam.toLowerCase())
    if (destination.trim()) {
      const s = destination.trim().toLowerCase()
      r = r.filter(l => (l.title||'').toLowerCase().includes(s) || (l.city||'').toLowerCase().includes(s) || (l.state||'').toLowerCase().includes(s))
    }
    // Type filter
    if (typeFilter === 'hotel')      r = r.filter(l => l.property_type === 'hotel')
    if (typeFilter === 'private')    r = r.filter(l => l.property_type === 'private_stay')
    // Location chip
    if (locationChip !== 'all' && LOCATION_MAP[locationChip]) {
      const matches = LOCATION_MAP[locationChip]
      r = r.filter(l => matches.some(m => (l.city||'').toLowerCase().includes(m) || (l.state||'').toLowerCase().includes(m)))
    }
    // Feature chips
    featurePills.forEach(key => {
      if (key === 'toprated')   r = r.filter(l => (l.rating||0) >= 4.5)
      if (key === 'beach')      r = r.filter(l => Array.isArray(l.tags) && (l.tags.includes('beachfront') || l.tags.includes('beach')))
      if (key === 'mountain')   r = r.filter(l => Array.isArray(l.tags) && l.tags.includes('mountain'))
      if (key === 'city')       r = r.filter(l => Array.isArray(l.tags) && l.tags.includes('city'))
      if (key === 'countryside') r = r.filter(l => Array.isArray(l.tags) && (l.tags.includes('countryside') || l.tags.includes('farm')))
      if (key === 'luxury')     r = r.filter(l => Array.isArray(l.tags) && l.tags.includes('luxury'))
      if (key === 'unique')     r = r.filter(l => Array.isArray(l.tags) && l.tags.includes('unique_stay'))
      if (key === 'instant')    r = r.filter(l => l.is_instant_book)
      if (key === 'under200')   r = r.filter(l => (l.price_per_night||0) < 200)
      if (key === '200to500')   r = r.filter(l => { const p = l.price_per_night||0; return p >= 200 && p <= 500 })
      if (key === '500plus')    r = r.filter(l => (l.price_per_night||0) > 500)
    })
    // Sort
    if (sortBy === 'top_rated')  r.sort((a, b) => (b.rating||0) - (a.rating||0))
    if (sortBy === 'price_low')  r.sort((a, b) => (a.price_per_night||0) - (b.price_per_night||0))
    if (sortBy === 'price_high') r.sort((a, b) => (b.price_per_night||0) - (a.price_per_night||0))
    if (sortBy === 'newest')     r.sort((a, b) => new Date(b.created_at||0) - new Date(a.created_at||0))
    setFiltered(r)
  }

  function toggleFeaturePill(key) {
    setFeaturePills(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; color:var(--sr-text); background:var(--sr-bg); }

        /* ── HERO ── */
        .hero { padding:52px 40px 0; max-width:1280px; margin:0 auto; }
        .eyebrow { display:flex; align-items:center; gap:10px; font-size:0.65rem; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:#F4601A; margin-bottom:16px; }
        .eyebrow::before { content:''; width:24px; height:2px; background:#F4601A; flex-shrink:0; }
        .hero-title { font-family:'Playfair Display',serif; font-size:clamp(2.4rem,5vw,3.8rem); font-weight:900; line-height:1.05; letter-spacing:-1.5px; color:var(--sr-text); margin-bottom:14px; }
        .hero-title em { color:#F4601A; font-style:italic; }
        .hero-sub { font-size:0.92rem; color:var(--sr-muted); line-height:1.75; max-width:500px; margin-bottom:32px; }

        /* ── SEARCH BAR ── */
        .search-bar { background:var(--sr-card); border:1px solid var(--sr-border-solid,#E8E2D9); border-radius:18px; display:grid; grid-template-columns:2fr 1.2fr 1.2fr 1fr auto; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.07); margin-bottom:48px; }
        .sb-field { padding:14px 20px; border-right:1px solid var(--sr-border-solid,#E8E2D9); display:flex; flex-direction:column; justify-content:center; }
        .sb-field:last-of-type { border-right:none; }
        .sb-label { font-size:0.58rem; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:var(--sr-sub); margin-bottom:4px; }
        .sb-input { border:none; outline:none; font-size:0.9rem; font-weight:600; color:var(--sr-text); background:transparent; font-family:inherit; width:100%; }
        .sb-input::placeholder { color:var(--sr-sub); font-weight:400; }
        .sb-val { font-size:0.9rem; font-weight:600; color:var(--sr-text); }
        .sb-hint { font-size:0.72rem; color:var(--sr-sub); margin-top:2px; }
        .sb-btn { padding:0 28px; background:#F4601A; border:none; color:white; font-size:0.88rem; font-weight:700; cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:8px; transition:opacity 0.15s; white-space:nowrap; }
        .sb-btn:hover { opacity:0.88; }

        /* ── FILTER PILLS ── */
        .pills-wrap { border-top:1px solid var(--sr-border-solid,#E8E2D9); border-bottom:1px solid var(--sr-border-solid,#E8E2D9); background:var(--sr-card); }
        .pills-row { max-width:1280px; margin:0 auto; padding:14px 40px; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .pills-row-scroll { flex-wrap:nowrap; overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:4px; }
        .pills-row-scroll::-webkit-scrollbar { height:4px; }
        .pills-row-scroll::-webkit-scrollbar-thumb { background:var(--sr-border-solid,#E8E2D9); border-radius:4px; }
        .pill { padding:9px 18px; border-radius:100px; font-size:0.82rem; font-weight:600; border:1.5px solid var(--sr-border-solid,#E8E2D9); background:var(--sr-card); color:var(--sr-text); cursor:pointer; font-family:inherit; transition:all 0.15s; white-space:nowrap; flex-shrink:0; }
        .pill:hover { border-color:#F4601A; color:#F4601A; }
        .pill.active { background:#F4601A; color:white; border-color:#F4601A; }
        .pill-count { margin-left:auto; font-size:0.82rem; font-weight:600; color:#F4601A; }

        /* ── RESULTS ROW & SORT ── */
        .results-row { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:22px; }
        .results-info { font-size:0.82rem; color:var(--sr-muted); }
        .sort-wrap { display:flex; align-items:center; gap:8px; }
        .sort-wrap label { font-size:0.82rem; color:var(--sr-muted); }
        .sort-select { padding:8px 12px; border-radius:8px; border:1px solid var(--sr-border-solid,#E8E2D9); background:var(--sr-card); color:var(--sr-text); font-size:0.82rem; font-family:inherit; cursor:pointer; }

        /* ── GRID ── */
        .main { max-width:1280px; margin:0 auto; padding:36px 40px 80px; }
        .cards-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }

        /* ── CARD ── */
        .card { background:var(--sr-card); border-radius:16px; overflow:hidden; border:1px solid var(--sr-border-solid,#E8E2D9); text-decoration:none; color:inherit; display:block; transition:transform 0.2s,box-shadow 0.2s; }
        .card:hover { transform:translateY(-4px); box-shadow:0 16px 48px rgba(0,0,0,0.11); }
        .card-img { height:210px; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .card-img img { width:100%; height:100%; object-fit:cover; position:absolute; inset:0; }
        .card-emoji { font-size:5rem; line-height:1; position:relative; z-index:1; }
        .card-type { position:absolute; top:12px; left:12px; background:rgba(255,255,255,0.92); backdrop-filter:blur(4px); color:#1A1410; border-radius:100px; padding:4px 12px; font-size:0.7rem; font-weight:700; z-index:2; }
        .card-heart { position:absolute; top:10px; right:10px; width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.92); backdrop-filter:blur(4px); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:0.95rem; color:#1A1410; z-index:2; transition:all 0.15s; }
        .card-heart:hover { background:white; color:#F4601A; }
        .card-body { padding:16px; }
        .card-title { font-size:0.98rem; font-weight:700; color:var(--sr-text); margin-bottom:4px; line-height:1.3; }
        .card-loc { font-size:0.78rem; color:var(--sr-muted); margin-bottom:12px; display:flex; align-items:center; gap:3px; }
        .card-meta { display:flex; align-items:flex-end; justify-content:space-between; gap:8px; }
        .card-rating { font-size:0.78rem; font-weight:600; color:var(--sr-text); }
        .card-price { font-size:1.08rem; font-weight:800; color:var(--sr-text); text-align:right; }
        .card-price span { font-size:0.76rem; font-weight:400; color:var(--sr-sub); }
        .card-rooms { font-size:0.7rem; color:var(--sr-sub); text-align:right; margin-top:2px; }
        .snap-verified { display:inline-flex; align-items:center; gap:4px; font-size:0.67rem; font-weight:700; color:#A78BFA; background:linear-gradient(90deg,rgba(139,92,246,0.12),rgba(59,130,246,0.12)); border:1px solid rgba(139,92,246,0.25); border-radius:100px; padding:2px 9px; margin-top:6px; }
        .founder-badge { display:inline-flex; align-items:center; gap:4px; font-size:0.67rem; font-weight:700; color:#F59E0B; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.25); border-radius:100px; padding:2px 9px; margin-top:6px; margin-left:4px; }

        .empty { grid-column:1/-1; text-align:center; padding:80px 20px; }
        .empty-icon { font-size:2.8rem; margin-bottom:14px; }
        .empty-title { font-family:'Playfair Display',serif; font-size:1.4rem; font-weight:700; margin-bottom:8px; }
        .empty-sub { font-size:0.84rem; color:var(--sr-muted); }
        .loading-msg { grid-column:1/-1; text-align:center; padding:80px; color:var(--sr-muted); font-size:0.92rem; }

        /* ── FOOTER ── */
        .footer { background:var(--sr-bg); padding:24px 40px 20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; border-top:1px solid var(--sr-border); }
        .footer-logo { font-family:'Playfair Display',serif; font-size:1.1rem; font-weight:700; color:var(--sr-text); }
        .footer-logo span { color:#F4601A; }
        .footer-links { display:flex; gap:22px; }
        .footer-links a { font-size:0.78rem; color:var(--sr-muted); text-decoration:none; transition:color 0.15s; }
        .footer-links a:hover { color:var(--sr-text); }
        .footer-copy { font-size:0.72rem; color:var(--sr-sub); }

        @media(max-width:1024px) { .cards-grid{grid-template-columns:repeat(2,1fr);} .search-bar{grid-template-columns:1fr 1fr auto;} .sb-field:nth-child(3),.sb-field:nth-child(4){display:none;} }
        @media(max-width:768px) { .cards-grid{grid-template-columns:1fr 1fr;} .hero,.pills-row,.main,.footer{padding-left:20px;padding-right:20px;} .search-bar{grid-template-columns:1fr auto;border-radius:14px;} .sb-field:nth-child(2),.sb-field:nth-child(3),.sb-field:nth-child(4){display:none;} }
        @media(max-width:540px) { .cards-grid{grid-template-columns:1fr;} }
      `}</style>

      <SharedHeader />

      {/* HERO */}
      <div className="hero">
        <div className="eyebrow">Explore Stays</div>
        <h1 className="hero-title">Find your <em>stay</em></h1>
        <p className="hero-sub">Browse hotels and private stays across the United States. Filter by type, price, location, and amenities to find exactly what you're looking for.</p>

        {/* Search bar */}
        <div className="search-bar">
          <div className="sb-field">
            <span className="sb-label">Destination</span>
            <input
              className="sb-input"
              placeholder="Miami Beach, FL"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div className="sb-field">
            <span className="sb-label">Check-In</span>
            <span className="sb-val">Mar 15, 2026</span>
            <span className="sb-hint">Add dates</span>
          </div>
          <div className="sb-field">
            <span className="sb-label">Check-Out</span>
            <span className="sb-val">Mar 18, 2026</span>
            <span className="sb-hint">3 nights</span>
          </div>
          <div className="sb-field">
            <span className="sb-label">Guests</span>
            <span className="sb-val">2 guests</span>
          </div>
          <button className="sb-btn" onClick={applyFilters}>🔍 Search</button>
        </div>
      </div>

      {/* FILTER PILLS — 3 rows matching mobile */}
      <div className="pills-wrap">
        {/* Row 1: Type + count */}
        <div className="pills-row">
          {TYPE_PILLS.map(p => (
            <button
              key={p.key}
              className={`pill type-pill${typeFilter === p.key ? ' active' : ''}`}
              onClick={() => setTypeFilter(p.key)}
            >
              {p.label}
            </button>
          ))}
          <span className="pill-count">{filtered.length} properties</span>
        </div>
        {/* Row 2: Location chips */}
        <div className="pills-row pills-row-scroll">
          {LOCATION_CHIPS.map(p => (
            <button
              key={p.key}
              className={`pill location-pill${locationChip === p.key ? ' active' : ''}`}
              onClick={() => setLocationChip(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {/* Row 3: Feature & price */}
        <div className="pills-row pills-row-scroll">
          {FEATURE_PILLS.map(p => (
            <button
              key={p.key}
              className={`pill${featurePills.includes(p.key) ? ' active' : ''}`}
              onClick={() => toggleFeaturePill(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* GRID */}
      <div className="main">
        {!loading && (
          <div className="results-row">
            <span className="results-info">Showing {filtered.length} results</span>
            <div className="sort-wrap">
              <label htmlFor="sort-select">Sort:</label>
              <select
                id="sort-select"
                className="sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div className="cards-grid">
          {loading && <div className="loading-msg">Loading stays…</div>}

          {!loading && filtered.length === 0 && (
            <div className="empty">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">No stays found</div>
              <div className="empty-sub">Try adjusting your search or filters</div>
            </div>
          )}

          {!loading && filtered.map((listing, i) => {
            const theme     = CARD_THEMES[i % CARD_THEMES.length]
            const hasImg    = listing.images?.[0]
            const typeLabel = TYPE_LABELS[listing.property_type] || 'Stay'
            const roomInfo  = listing.property_type === 'hotel'
              ? (listing.room_count   ? `${listing.room_count} room types available` : null)
              : (listing.max_guests   ? `Up to ${listing.max_guests} guests`         : null)

            return (
              <a key={listing.id} href={`/listings/${listing.id}`} className="card">
                <div
                  className="card-img"
                  style={{ background: hasImg ? 'var(--sr-surface)' : theme.gradient }}
                >
                  {hasImg
                    ? <img src={listing.images[0]} alt={listing.title} />
                    : <span className="card-emoji">{theme.emoji}</span>
                  }
                  <span className="card-type">{typeLabel}</span>
                  <button className="card-heart" onClick={e => e.preventDefault()}>♡</button>
                </div>
                <div className="card-body">
                  {listing.editors_pick && (
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#FCD34D', marginBottom: 4 }}>⭐ Editor's Pick</div>
                  )}
                  <div className="card-title">{listing.title}</div>
                  <div className="card-loc">📍 {listing.city}, {listing.state}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
                    {listing.host_snap_verified && (
                      <div className="snap-verified">🛡 SnapReserve™ Verified Host</div>
                    )}
                    {listing.host_founder_badge && (
                      <div className="founder-badge">🏅 Founder Host</div>
                    )}
                  </div>
                  <div className="card-meta">
                    <div>
                      <div className="card-rating">★ {listing.rating} · {listing.review_count} reviews</div>
                    </div>
                    <div>
                      <div className="card-price">${listing.price_per_night} <span>/ night</span></div>
                      {roomInfo && <div className="card-rooms">{roomInfo}</div>}
                    </div>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <span className="footer-logo">Snap<span>Reserve</span>™</span>
        <div className="footer-links">
          <a href="/about">About</a>
          <a href="/listings">Explore</a>
          <a href="/contact">Contact</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
        <span className="footer-copy">© 2026 SnapReserve™. All rights reserved.</span>
      </footer>
    </>
  )
}

export default function ListingsPage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--sr-bg)',color:'var(--sr-muted)',fontFamily:'DM Sans,sans-serif'}}>
        Loading…
      </div>
    }>
      <ListingsInner />
    </Suspense>
  )
}
