'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const cityImages = {
  'New York': 'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=800&q=80',
  'Miami': 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=800&q=80',
  'Los Angeles': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&q=80',
  'Chicago': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&q=80',
  'New Orleans': 'https://images.unsplash.com/photo-1568869893270-a8d9f08dc84c?w=800&q=80',
}
const fallbackImages = [
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
]

const hotelChips = [
  { id: '5star', icon: '⭐', label: '5-Star' },
  { id: 'beach', icon: '🏖️', label: 'Beach Resort' },
  { id: 'city', icon: '🏙️', label: 'City Centre' },
  { id: 'spa', icon: '🧖', label: 'Spa & Wellness' },
  { id: 'family', icon: '👨‍👩‍👧', label: 'Family' },
  { id: 'business', icon: '💼', label: 'Business' },
]
const privateChips = [
  { id: 'entire_home', icon: '🏠', label: 'Entire Home' },
  { id: 'private_room', icon: '🛏️', label: 'Private Room' },
  { id: 'cabin', icon: '🌴', label: 'Cabins' },
  { id: 'beachfront', icon: '🏖️', label: 'Beachfront' },
  { id: 'farm_ranch', icon: '🌿', label: 'Farm Stay' },
  { id: 'mountain', icon: '⛰️', label: 'Mountain' },
]

const hotelSteps = [
  { icon: '🔍', num: '1', title: 'Search & filter', desc: 'Enter your destination and dates. Filter by star rating, price, amenities, and distance to landmarks.' },
  { icon: '🏨', num: '2', title: 'Choose your room', desc: 'Compare room types, view photos, read verified guest reviews, and select the rate that works for you.' },
  { icon: '✅', num: '3', title: 'Instant confirmation', desc: 'Book securely via Stripe. Receive immediate confirmation and manage your reservation in the app.' },
]
const privateSteps = [
  { icon: '🏠', num: '1', title: 'Discover unique spaces', desc: 'Browse homes listed by real hosts — from city apartments to countryside cabins and private villas.' },
  { icon: '💬', num: '2', title: 'Connect with your host', desc: 'Message hosts directly, ask questions, and get personalised local tips before you even pack your bags.' },
  { icon: '🛡️', num: '3', title: 'Book with confidence', desc: 'Every stay is protected by SnapGuarantee™ — secure payment and free cancellation on most listings.' },
]

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState('hotel')
  const [listings, setListings] = useState([])
  const [stats, setStats] = useState({ hotels: 0, private_stays: 0, cities: 0, hosts: 0 })
  const [activeChip, setActiveChip] = useState(null)
  const [destination, setDestination] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [userProfile, setUserProfile] = useState(null) // { full_name, avatar_url }
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const searchRef = useRef(null)
  const autocompleteService = useRef(null)
  const debounceRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => { fetchData() }, [])
  useEffect(() => { setActiveChip(null) }, [mode])
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setIsLoggedIn(false); return }
      setIsLoggedIn(true)
      supabase.from('users').select('user_role, full_name, avatar_url').eq('id', user.id).maybeSingle()
        .then(({ data }) => {
          setUserRole(data?.user_role ?? 'user')
          setUserProfile({ full_name: data?.full_name ?? '', avatar_url: data?.avatar_url ?? null })
        })
    })
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  async function handleLogout() {
    setDropdownOpen(false)
    await supabase.auth.signOut()
    router.push('/home')
  }

  async function fetchData() {
    const { data } = await supabase.from('listings').select('*').eq('is_active', true).order('rating', { ascending: false })
    const all = data || []
    setListings(all)
    const cities = [...new Set(all.map(l => l.city))].length
    const { count: hostCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_host', true)
    setStats({ hotels: all.filter(l => l.type === 'hotel').length, private_stays: all.filter(l => l.type === 'private_stay').length, cities, hosts: hostCount || 0 })
  }

  // Load Google Places
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY
    if (!apiKey) return
    if (window.google?.maps?.places) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService()
      return
    }
    if (document.querySelector('script[data-google-places]')) return
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.dataset.googlePlaces = '1'
    script.onload = () => {
      autocompleteService.current = new window.google.maps.places.AutocompleteService()
    }
    document.head.appendChild(script)
  }, [])

  function handleDestinationChange(val) {
    setDestination(val)
    setSelectedPlace(null)
    if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!window.google || !autocompleteService.current) {
        supabase.rpc('search_cities', { query: val, result_limit: 6 }).then(({ data }) => {
          if (data) {
            setSuggestions(data.map(d => ({ place_id: d.city_id, description: d.full_location, main_text: d.city, secondary_text: `${d.state ? d.state + ', ' : ''}${d.country}`, flag: d.flag_emoji })))
            setShowSuggestions(true)
          }
        })
        return
      }
      setSearchLoading(true)
      autocompleteService.current.getPlacePredictions({ input: val, types: ['(regions)'] }, (predictions, status) => {
        setSearchLoading(false)
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions.map(p => ({ place_id: p.place_id, description: p.description, main_text: p.structured_formatting.main_text, secondary_text: p.structured_formatting.secondary_text, flag: getFlagFromDescription(p.description) })))
          setShowSuggestions(true)
        } else { setSuggestions([]) }
      })
    }, 280)
  }

  function getFlagFromDescription(desc) {
    const flags = { 'United States':'🇺🇸','USA':'🇺🇸','UK':'🇬🇧','United Kingdom':'🇬🇧','France':'🇫🇷','Japan':'🇯🇵','UAE':'🇦🇪','Australia':'🇦🇺','Canada':'🇨🇦','Germany':'🇩🇪','Italy':'🇮🇹','Spain':'🇪🇸','Mexico':'🇲🇽','Brazil':'🇧🇷','Thailand':'🇹🇭','Portugal':'🇵🇹','Greece':'🇬🇷' }
    for (const [country, flag] of Object.entries(flags)) { if (desc.includes(country)) return flag }
    return '📍'
  }

  function selectSuggestion(s) {
    setDestination(s.description)
    setSelectedPlace(s)
    setSuggestions([])
    setShowSuggestions(false)
  }

  useEffect(() => {
    function handleClick(e) { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isHotel = mode === 'hotel'
  const accent = isHotel ? '#1A6EF4' : '#F4601A'
  const heroBg = isHotel
    ? 'radial-gradient(ellipse at 60% 0%, #e8f0ff 0%, #FAF8F5 55%)'
    : 'radial-gradient(ellipse at 60% 0%, #ffeade 0%, #FAF8F5 55%)'
  const chips = isHotel ? hotelChips : privateChips
  const steps = isHotel ? hotelSteps : privateSteps
  const filteredListings = listings.filter(l => l.type === mode).slice(0, 4)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; color:#1A1410; }

        .nav { background:rgba(250,248,245,0.92); backdrop-filter:blur(12px); border-bottom:1px solid rgba(0,0,0,0.07); position:sticky; top:0; z-index:100; }
        .nav-inner { max-width:1280px; margin:0 auto; padding:0 40px; height:64px; display:flex; align-items:center; justify-content:space-between; }
        .logo { font-family:'Playfair Display',serif; font-size:1.3rem; font-weight:900; text-decoration:none; color:#1A1410; }
        .logo span { color:#F4601A; }
        .nav-links { display:flex; gap:4px; }
        .nav-link { padding:8px 14px; border-radius:100px; font-size:0.83rem; font-weight:600; color:#6B5F54; text-decoration:none; transition:background 0.15s; }
        .nav-link:hover { background:rgba(0,0,0,0.06); }
        .nav-outline { padding:8px 18px; border-radius:100px; font-size:0.83rem; font-weight:700; border:1px solid #D4CEC5; color:#1A1410; text-decoration:none; }
        .nav-solid { padding:8px 18px; border-radius:100px; font-size:0.83rem; font-weight:700; background:#F4601A; color:white; text-decoration:none; }
        .nav-host-btn { padding:8px 18px; border-radius:100px; font-size:0.83rem; font-weight:700; background:#F4601A; color:white; text-decoration:none; border:none; cursor:pointer; font-family:inherit; transition:background 0.15s; }
        .nav-host-btn:hover { background:#FF7A35; }
        .nav-pending { padding:8px 16px; border-radius:100px; font-size:0.83rem; font-weight:600; background:rgba(217,119,6,0.1); color:#D97706; border:1px solid rgba(217,119,6,0.25); text-decoration:none; cursor:default; }
        /* Avatar + Dropdown */
        .nav-avatar-wrap { position:relative; }
        .nav-avatar { width:36px; height:36px; border-radius:50%; background:#F4601A; display:flex; align-items:center; justify-content:center; font-size:0.78rem; font-weight:800; color:white; cursor:pointer; border:2px solid transparent; transition:border-color 0.15s; flex-shrink:0; overflow:hidden; user-select:none; }
        .nav-avatar:hover { border-color:rgba(244,96,26,0.4); }
        .nav-avatar img { width:100%; height:100%; object-fit:cover; }
        .nav-dropdown { position:absolute; top:calc(100% + 10px); right:0; background:white; border:1px solid #E8E2D9; border-radius:16px; box-shadow:0 8px 32px rgba(0,0,0,0.12); min-width:200px; padding:8px; z-index:200; animation:dropIn 0.15s ease; }
        @keyframes dropIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .nav-dropdown-header { padding:10px 12px 8px; border-bottom:1px solid #F3F0EB; margin-bottom:4px; }
        .nav-dropdown-name { font-size:0.84rem; font-weight:700; color:#1A1410; }
        .nav-dropdown-role { font-size:0.72rem; color:#A89880; margin-top:2px; }
        .dd-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:10px; font-size:0.84rem; font-weight:600; color:#1A1410; text-decoration:none; cursor:pointer; transition:background 0.12s; border:none; background:none; width:100%; font-family:inherit; }
        .dd-item:hover { background:#FAF8F5; }
        .dd-item .dd-icon { font-size:1rem; width:20px; text-align:center; flex-shrink:0; }
        .dd-divider { border:none; border-top:1px solid #F3F0EB; margin:4px 0; }
        .dd-item.danger { color:#DC2626; }
        .dd-item.danger:hover { background:#FEF2F2; }

        .hero { padding:52px 40px 44px; text-align:center; transition:background 0.4s; }

        .toggle-wrap { display:flex; justify-content:center; margin-bottom:40px; }
        .toggle-pill { display:inline-flex; background:white; border-radius:100px; padding:5px; gap:4px; box-shadow:0 2px 16px rgba(0,0,0,0.1); }
        .toggle-btn { padding:11px 28px; border-radius:100px; font-size:0.88rem; font-weight:700; border:none; cursor:pointer; font-family:inherit; color:#6B5F54; background:transparent; transition:all 0.25s; }
        .toggle-btn.hotel-on { background:#1A6EF4; color:white; box-shadow:0 2px 12px rgba(26,110,244,0.4); }
        .toggle-btn.private-on { background:#F4601A; color:white; box-shadow:0 2px 12px rgba(244,96,26,0.4); }

        .hero-headline { font-family:'Playfair Display',serif; font-size:clamp(3rem,7vw,5.5rem); font-weight:900; line-height:1.05; letter-spacing:-2px; margin-bottom:8px; }
        .hero-headline .blue-accent { color:#1A6EF4; font-style:italic; display:block; text-decoration:underline; text-decoration-color:rgba(26,110,244,0.2); text-underline-offset:6px; }
        .hero-headline .orange-accent { color:#F4601A; font-style:italic; text-decoration:underline; text-decoration-color:rgba(244,96,26,0.2); text-underline-offset:6px; }
        .hero-sub { font-size:0.96rem; color:#6B5F54; margin-bottom:32px; line-height:1.7; }

        .search-box { background:white; border-radius:20px; box-shadow:0 4px 32px rgba(0,0,0,0.1); max-width:780px; margin:0 auto 18px; display:grid; grid-template-columns:1.8fr 1fr 1fr 1fr auto; overflow:visible; border:1px solid #E8E2D9; position:relative; }
        .search-field { padding:14px 18px; border-right:1px solid #E8E2D9; text-align:left; position:relative; }
        .search-field:first-child { border-radius:20px 0 0 20px; overflow:visible; }
        .sf-label { font-size:0.6rem; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:#A89880; margin-bottom:4px; }
        .sf-input { width:100%; border:none; outline:none; font-size:0.88rem; font-weight:600; color:#1A1410; background:transparent; font-family:inherit; }
        .sf-input::placeholder { color:#C4BAB0; font-weight:400; }
        .search-btn { border:none; padding:0 26px; font-size:0.88rem; font-weight:700; color:white; cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:8px; border-radius:0 20px 20px 0; transition:opacity 0.18s; }
        .search-btn:hover { opacity:0.9; }

        .chips-row { display:flex; justify-content:center; gap:8px; flex-wrap:wrap; max-width:780px; margin:0 auto; }
        .chip { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:100px; font-size:0.8rem; font-weight:700; border:1.5px solid #E8E2D9; background:white; cursor:pointer; transition:all 0.18s; color:#1A1410; font-family:inherit; }
        .chip:hover { border-color:rgba(0,0,0,0.2); box-shadow:0 2px 8px rgba(0,0,0,0.07); }
        .chip.active-hotel { background:#1A6EF4; color:white; border-color:#1A6EF4; }
        .chip.active-private { background:#F4601A; color:white; border-color:#F4601A; }

        .w { max-width:1280px; margin:0 auto; padding:0 40px; }

        .choose-section { padding:60px 0 0; }
        .choose-label { font-size:0.7rem; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; margin-bottom:12px; }
        .choose-title { font-family:'Playfair Display',serif; font-size:clamp(1.8rem,3vw,2.6rem); font-weight:700; line-height:1.15; margin-bottom:40px; }

        .cards-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .big-card { border-radius:22px; overflow:hidden; position:relative; height:340px; text-decoration:none; display:block; transition:transform 0.25s,box-shadow 0.25s; }
        .big-card:hover { transform:scale(1.012); box-shadow:0 20px 60px rgba(0,0,0,0.18); }
        .big-card img { width:100%; height:100%; object-fit:cover; }
        .bco { position:absolute; inset:0; }
        .bcc { position:absolute; inset:0; padding:24px; display:flex; flex-direction:column; justify-content:flex-end; }
        .type-badge { display:inline-flex; align-items:center; gap:6px; backdrop-filter:blur(10px); border-radius:100px; padding:5px 14px; font-size:0.66rem; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:white; margin-bottom:10px; width:fit-content; }
        .card-h { font-family:'Playfair Display',serif; font-size:1.65rem; font-weight:700; color:white; line-height:1.15; margin-bottom:8px; }
        .card-p { font-size:0.79rem; color:rgba(255,255,255,0.72); line-height:1.65; margin-bottom:16px; max-width:300px; }
        .stats-row { display:flex; gap:20px; margin-bottom:16px; }
        .sv { font-size:0.96rem; font-weight:800; color:white; }
        .sl { font-size:0.62rem; color:rgba(255,255,255,0.5); margin-top:1px; }
        .browse-btn { display:inline-flex; align-items:center; gap:8px; padding:11px 22px; border-radius:100px; font-size:0.84rem; font-weight:700; color:white; border:none; cursor:pointer; font-family:inherit; text-decoration:none; }

        .top-rated { padding:60px 0 0; }
        .section-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:22px; }
        .section-title { font-family:'Playfair Display',serif; font-size:1.7rem; font-weight:700; }
        .see-all { font-size:0.84rem; font-weight:700; text-decoration:none; }
        .see-all:hover { text-decoration:underline; }

        .listings-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
        .listing-card { background:white; border-radius:18px; overflow:hidden; border:1px solid #E8E2D9; transition:all 0.22s; text-decoration:none; color:inherit; display:block; }
        .listing-card:hover { transform:translateY(-4px); box-shadow:0 16px 48px rgba(0,0,0,0.1); }
        .card-img { height:200px; position:relative; overflow:hidden; background:#F3F0EB; }
        .card-img img { width:100%; height:100%; object-fit:cover; transition:transform 0.3s; }
        .listing-card:hover .card-img img { transform:scale(1.05); }
        .type-pill { position:absolute; top:12px; left:12px; padding:4px 10px; border-radius:100px; font-size:0.66rem; font-weight:700; }
        .instant-pill { position:absolute; top:12px; right:12px; background:white; padding:4px 10px; border-radius:100px; font-size:0.66rem; font-weight:700; color:#1A6EF4; }
        .card-body { padding:14px; }
        .card-name { font-weight:700; font-size:0.92rem; margin-bottom:3px; line-height:1.3; }
        .card-loc { font-size:0.75rem; color:#6B5F54; margin-bottom:10px; }
        .amenity-chips { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px; }
        .a-chip { font-size:0.63rem; background:#F3F0EB; color:#6B5F54; padding:2px 8px; border-radius:100px; font-weight:600; }
        .card-foot { display:flex; align-items:center; justify-content:space-between; }
        .card-price { font-size:0.94rem; font-weight:700; }
        .card-price small { font-size:0.71rem; font-weight:400; color:#A89880; }
        .card-rating { font-size:0.77rem; font-weight:600; color:#D97706; }

        .how { padding:60px 0; }
        .how-label { font-size:0.7rem; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; margin-bottom:26px; }
        .steps-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .step-card { background:white; border:1px solid #E8E2D9; border-radius:20px; padding:28px; position:relative; overflow:hidden; transition:all 0.2s; }
        .step-card:hover { box-shadow:0 8px 32px rgba(0,0,0,0.07); transform:translateY(-2px); }
        .step-num-bg { position:absolute; top:10px; right:14px; font-size:3.5rem; font-weight:900; color:rgba(0,0,0,0.04); font-family:'Playfair Display',serif; line-height:1; }
        .step-icon-box { width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:1.4rem; margin-bottom:16px; }
        .step-title { font-size:1rem; font-weight:700; margin-bottom:8px; }
        .step-desc { font-size:0.82rem; color:#6B5F54; line-height:1.7; }

        .footer { background:#0F0C09; padding:24px 40px 20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; }
        .footer-logo { font-family:'Playfair Display',serif; font-size:1.1rem; font-weight:700; color:white; }
        .footer-logo span { color:#F4601A; }
        .footer-links { display:flex; gap:22px; }
        .footer-links a { font-size:0.78rem; color:rgba(255,255,255,0.4); text-decoration:none; }
        .footer-links a:hover { color:rgba(255,255,255,0.7); }

        .autocomplete-drop { position:absolute; top:calc(100% + 8px); left:-1px; right:-1px; background:white; border-radius:16px; border:1px solid #E8E2D9; box-shadow:0 16px 48px rgba(0,0,0,0.14); z-index:9999; overflow:hidden; }
        .sug-item { display:flex; align-items:center; gap:12px; padding:10px 16px; cursor:pointer; transition:background 0.15s; }
        .sug-item:hover { background:#FAF8F5; }

        @media(max-width:1024px) { .listings-grid{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:768px) { .cards-row,.steps-grid{grid-template-columns:1fr;} .listings-grid{grid-template-columns:repeat(2,1fr);} .nav-links{display:none;} .hero,.w,.footer{padding-left:20px;padding-right:20px;} .nav-inner{padding:0 20px;} .big-card{height:280px;} .hero-headline{font-size:3rem;letter-spacing:-1px;} .search-box{grid-template-columns:1fr;border-radius:16px;} }
        @media(max-width:480px) { .listings-grid{grid-template-columns:1fr;} }
      `}</style>



      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/home" className="logo">Snap<span>Reserve™</span></a>
          <div className="nav-links">
            <a href="/listings?type=hotel" className="nav-link">Hotels</a>
            <a href="/listings?type=private_stay" className="nav-link">Private Stays</a>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {isLoggedIn ? (
              <>
                {/* Role-based host CTA */}
                {userRole === 'host' && (
                  <a href="/host/dashboard" className="nav-host-btn">Switch to Host</a>
                )}
                {userRole === 'pending_host' && (
                  <span className="nav-pending">⏳ Application Pending</span>
                )}
                {(userRole === 'user' || userRole === null) && (
                  <a href="/become-a-host" className="nav-link">Become a Host</a>
                )}

                {/* Profile avatar with dropdown */}
                <div className="nav-avatar-wrap" ref={dropdownRef}>
                  <div
                    className="nav-avatar"
                    onClick={() => setDropdownOpen(o => !o)}
                    role="button"
                    aria-label="Account menu"
                  >
                    {userProfile?.avatar_url?.startsWith('http')
                      ? <img src={userProfile.avatar_url} alt="avatar" />
                      : userProfile?.avatar_url
                        ? <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{userProfile.avatar_url}</span>
                        : (userProfile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?')
                    }
                  </div>

                  {dropdownOpen && (
                    <div className="nav-dropdown">
                      {userProfile?.full_name && (
                        <div className="nav-dropdown-header">
                          <div className="nav-dropdown-name">{userProfile.full_name}</div>
                          <div className="nav-dropdown-role">
                            {userRole === 'host' ? 'Approved Host' : userRole === 'pending_host' ? 'Application Pending' : 'Member'}
                          </div>
                        </div>
                      )}
                      <a href="/dashboard" className="dd-item" onClick={() => setDropdownOpen(false)}>
                        <span className="dd-icon">🔍</span> Explore Dashboard
                      </a>
                      <a href="/trips" className="dd-item" onClick={() => setDropdownOpen(false)}>
                        <span className="dd-icon">🧳</span> My Trips
                      </a>
                      {userRole === 'host' && (
                        <a href="/host/dashboard" className="dd-item" onClick={() => setDropdownOpen(false)}>
                          <span className="dd-icon">🏠</span> Host Dashboard
                        </a>
                      )}
                      <a href="/account/profile" className="dd-item" onClick={() => setDropdownOpen(false)}>
                        <span className="dd-icon">⚙️</span> Settings
                      </a>
                      <hr className="dd-divider" />
                      <button className="dd-item danger" onClick={handleLogout}>
                        <span className="dd-icon">↪</span> Log out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <a href="/login" className="nav-outline">Log in</a>
                <a href="/signup" className="nav-solid">Sign up</a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="hero" style={{ background: heroBg }}>

        {/* TOGGLE */}
        <div className="toggle-wrap">
          <div className="toggle-pill">
            <button className={`toggle-btn ${isHotel ? 'hotel-on' : ''}`} onClick={() => setMode('hotel')}>🏨 Hotel Bookings</button>
            <button className={`toggle-btn ${!isHotel ? 'private-on' : ''}`} onClick={() => setMode('private_stay')}>🏠 Private Stays</button>
          </div>
        </div>

        {/* HEADLINE */}
        {isHotel ? (
          <h1 className="hero-headline">
            Discover world-class<br />stays with
            <span className="blue-accent">SnapReserve.</span>
          </h1>
        ) : (
          <h1 className="hero-headline">
            A home away from <span className="orange-accent">home.</span>
          </h1>
        )}

        <p className="hero-sub">
          {isHotel ? 'Launching in the United States — best rates, instant booking.' : 'Discover 180,000+ unique homes, cabins, and villas hosted by real people.'}
        </p>

        {/* SEARCH BOX */}
        <div className="search-box" ref={searchRef}>
          <div className="search-field" style={{ position:'relative' }}>
            <div className="sf-label">{isHotel ? 'Destination' : 'Where to?'}</div>
            <input
              className="sf-input"
              placeholder={isHotel ? 'City or hotel name' : 'City, neighbourhood, landmark'}
              value={destination}
              onChange={e => handleDestinationChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              autoComplete="off"
            />
            {searchLoading && <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:'0.8rem', color:'#A89880' }}>...</div>}
            {showSuggestions && suggestions.length > 0 && (
              <div className="autocomplete-drop">
                <div style={{ padding:'10px 16px 6px', fontSize:'0.62rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:'#A89880' }}>Destinations</div>
                {suggestions.map((s, i) => (
                  <div key={i} className="sug-item" onClick={() => selectSuggestion(s)}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'#F3F0EB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', flexShrink:0 }}>
                      {s.flag || '📍'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:'0.88rem', color:'#1A1410', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.main_text}</div>
                      <div style={{ fontSize:'0.74rem', color:'#A89880', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.secondary_text}</div>
                    </div>
                    <div style={{ fontSize:'0.7rem', color:'#C4BAB0', flexShrink:0 }}>→</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="search-field">
            <div className="sf-label">Check in</div>
            <input className="sf-input" type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} style={{ colorScheme:'light' }} />
          </div>
          <div className="search-field">
            <div className="sf-label">Check out</div>
            <input className="sf-input" type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} style={{ colorScheme:'light' }} />
          </div>
          <div className="search-field" style={{ borderRight:'none' }}>
            <div className="sf-label">Guests</div>
            <input className="sf-input" placeholder={isHotel ? '2 adults' : '2 guests'} value={guests} onChange={e => setGuests(e.target.value)} />
          </div>
          <button className="search-btn" style={{ background: accent }}>🔍 Search</button>
        </div>

        {/* FILTER CHIPS */}
        <div className="chips-row">
          {chips.map(chip => (
            <button key={chip.id} className={`chip ${activeChip === chip.id ? (isHotel ? 'active-hotel' : 'active-private') : ''}`} onClick={() => setActiveChip(activeChip === chip.id ? null : chip.id)}>
              {chip.icon} {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TRUST BAR ── */}
      <div style={{ background: isHotel ? '#1C1A17' : '#0D1F52', padding:'16px 40px', transition:'background 0.4s' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'center', gap:60, flexWrap:'wrap' }}>
          {[
            { icon:'🔒', title:'Secure Booking', sub:'256-bit encryption, always' },
            { icon:'🛡️', title:'SnapGuarantee™', sub:'Full protection on every stay' },
            { icon:'💬', title:'24/7 Support', sub:'Real humans, real quick' },
            { icon:'🌍', title:'US Launch 🇺🇸', sub:'Global expansion coming soon' },
          ].map(item => (
            <div key={item.title} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ fontSize:'1.2rem', opacity:0.85 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize:'0.82rem', fontWeight:700, color:'white' }}>{item.title}</div>
                <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.45)', marginTop:1 }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="w">

        {/* CHOOSE YOUR WAY */}
        <div className="choose-section">
          <div className="choose-label" style={{ color: accent }}>Choose your way to stay</div>
          <h2 className="choose-title">Hotels or private hosts —<br />you decide</h2>

          <div className="cards-row">
            <a href="/listings?type=hotel" className="big-card" style={{ opacity: isHotel ? 1 : 0.42, transform: isHotel ? 'scale(1)' : 'scale(0.97)', transition:'all 0.3s', filter: isHotel ? 'none' : 'grayscale(40%)' }}>
              <img src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&q=80" alt="Hotel" />
              <div className="bco" style={{ background:'linear-gradient(to top, rgba(5,20,70,0.94) 0%, rgba(10,30,90,0.5) 55%, rgba(0,0,0,0.08) 100%)' }} />
              <div className="bcc">
                <div className="type-badge" style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.18)' }}>🏨 Hotel Bookings</div>
                <div className="card-h">Stay at world-class hotels</div>
                <div className="card-p">Search verified hotels, resorts, and boutique properties with transparent pricing and instant confirmation.</div>
                <div className="stats-row">
                  <div><div className="sv">🇺🇸</div><div className="sl">US launch</div></div>
                  <div><div className="sv">{stats.cities}+</div><div className="sl">Cities</div></div>
                  <div><div className="sv">4.8★</div><div className="sl">Avg. rating</div></div>
                </div>
                <div className="browse-btn" style={{ background:'#1A6EF4' }}>Browse Hotels →</div>
              </div>
            </a>

            <a href="/listings?type=private_stay" className="big-card" style={{ opacity: !isHotel ? 1 : 0.42, transform: !isHotel ? 'scale(1)' : 'scale(0.97)', transition:'all 0.3s', filter: !isHotel ? 'none' : 'grayscale(40%)' }}>
              <img src="https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=900&q=80" alt="Private stay" />
              <div className="bco" style={{ background:'linear-gradient(to top, rgba(40,18,5,0.93) 0%, rgba(50,25,5,0.48) 55%, rgba(0,0,0,0.08) 100%)' }} />
              <div className="bcc">
                <div className="type-badge" style={{ background:'rgba(244,96,26,0.28)', border:'1px solid rgba(244,96,26,0.45)' }}>🏠 Private Stays</div>
                <div className="card-h">Rent from real people</div>
                <div className="card-p">Discover unique homes, cozy apartments, and one-of-a-kind retreats listed by individual hosts.</div>
                <div className="stats-row">
                  <div><div className="sv">{stats.hosts}+</div><div className="sl">Private hosts</div></div>
                  <div><div className="sv">{stats.cities}+</div><div className="sl">Cities</div></div>
                  <div><div className="sv">4.9★</div><div className="sl">Avg. rating</div></div>
                </div>
                <div className="browse-btn" style={{ background:'#F4601A' }}>Browse Stays →</div>
              </div>
            </a>
          </div>
        </div>

        {/* TOP RATED */}
        <div className="top-rated">
          <div className="section-header">
            <h2 className="section-title">Top rated <span style={{ color: accent, fontStyle:'italic' }}>{isHotel ? 'hotels' : 'private stays'}</span></h2>
            <a href={`/listings?type=${mode}`} className="see-all" style={{ color: accent }}>See all →</a>
          </div>
          <div className="listings-grid">
            {filteredListings.length === 0 && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'48px', color:'#A89880' }}>Loading listings...</div>
            )}
            {filteredListings.map((listing, i) => {
              const img = cityImages[listing.city] || fallbackImages[i % fallbackImages.length]
              const amenities = listing.amenities ? listing.amenities.split(',').slice(0, 3) : []
              const pill = listing.type === 'hotel'
                ? { bg:'#EDF4FF', color:'#1A6EF4', label:'🏨 Hotel' }
                : { bg:'#FFF3ED', color:'#F4601A', label:'🏠 Private Stay' }
              return (
                <a key={listing.id} href={`/listings/${listing.id}`} className="listing-card">
                  <div className="card-img">
                    <img src={img} alt={listing.title} />
                    <div className="type-pill" style={{ background:pill.bg, color:pill.color }}>{pill.label}</div>
                    {listing.is_instant_book && <div className="instant-pill">⚡ Instant</div>}
                  </div>
                  <div className="card-body">
                    <div className="card-name">{listing.title}</div>
                    <div className="card-loc">📍 {listing.city}, {listing.state}</div>
                    {amenities.length > 0 && (
                      <div className="amenity-chips">{amenities.map(a => <span key={a} className="a-chip">{a.trim()}</span>)}</div>
                    )}
                    <div className="card-foot">
                      <div className="card-price" style={{ color: accent }}>${listing.price_per_night} <small>/night</small></div>
                      <div className="card-rating">★ {listing.rating} <span style={{ fontSize:'0.7rem', color:'#A89880' }}>({listing.review_count})</span></div>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="how">
          <div className="how-label" style={{ color: accent }}>
            {isHotel ? 'How hotel booking works' : 'How private stays work'}
          </div>
          <div className="steps-grid">
            {steps.map(step => (
              <div key={step.num} className="step-card">
                <div className="step-num-bg">{step.num}</div>
                <div className="step-icon-box" style={{ background: isHotel ? 'rgba(26,110,244,0.08)' : 'rgba(244,96,26,0.08)' }}>
                  {step.icon}
                </div>
                <div className="step-title">{step.title}</div>
                <div className="step-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TOP DESTINATIONS */}
      <div style={{ background:'#FAF8F5', padding:'0 40px 60px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div style={{ fontSize:'0.7rem', fontWeight:800, letterSpacing:'0.16em', textTransform:'uppercase', color: accent, marginBottom:10 }}>Browse by destination</div>
          <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:'1.9rem', fontWeight:700, marginBottom:24 }}>Top Destinations</h2>

          <div style={{ display:'grid', gridTemplateColumns:'1.45fr 1fr 1fr', gridTemplateRows:'1fr 1fr', gap:14, height:440 }}>
            <a href="/listings" style={{ gridRow:'1 / 3', borderRadius:20, overflow:'hidden', position:'relative', display:'block', textDecoration:'none', transition:'transform 0.25s' }}
              onMouseEnter={e => e.currentTarget.style.transform='scale(1.015)'}
              onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
              <img src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=80" alt="Europe" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.08) 60%)' }} />
              <div style={{ position:'absolute', bottom:22, left:22 }}>
                <div style={{ fontFamily:'Playfair Display,serif', fontSize:'1.3rem', fontWeight:700, color:'white', marginBottom:4 }}>Europe</div>
                <div style={{ fontSize:'0.74rem', color:'rgba(255,255,255,0.65)' }}>6,200+ properties · From $89/night</div>
              </div>
            </a>

            {[
              { name:'California', sub:'2,800+ · From $120/night', src:'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=700&q=80' },
              { name:'Dubai', sub:'1,400+ · From $140/night', src:'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=700&q=80' },
              { name:'Tokyo', sub:'3,100+ · From $95/night', src:'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=700&q=80' },
              { name:'Tropical Islands', sub:'1,200+ · From $110/night', src:'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=700&q=80' },
            ].map(d => (
              <a key={d.name} href="/listings" style={{ borderRadius:18, overflow:'hidden', position:'relative', display:'block', textDecoration:'none', transition:'transform 0.25s' }}
                onMouseEnter={e => e.currentTarget.style.transform='scale(1.015)'}
                onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
                <img src={d.src} alt={d.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.06) 55%)' }} />
                <div style={{ position:'absolute', bottom:16, left:16 }}>
                  <div style={{ fontFamily:'Playfair Display,serif', fontSize:'1rem', fontWeight:700, color:'white', marginBottom:3 }}>{d.name}</div>
                  <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.6)' }}>{d.sub}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* TWO HOST CTA CARDS */}
      <div style={{ background:'#FAF8F5', padding:'0 40px 64px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

          <div style={{ borderRadius:24, overflow:'hidden', position:'relative', padding:'48px 44px', background:'linear-gradient(135deg, #0A1F6E 0%, #1242B4 45%, #0D2E8F 100%)', minHeight:280, display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 75% 30%, rgba(59,130,246,0.3) 0%, transparent 60%)', pointerEvents:'none' }} />
            <div style={{ position:'relative' }}>
              <div style={{ fontSize:'2rem', marginBottom:20 }}>🏨</div>
              <div style={{ fontFamily:'Playfair Display,serif', fontSize:'1.5rem', fontWeight:700, color:'white', marginBottom:12, lineHeight:1.2 }}>List your hotel or property business</div>
              <div style={{ fontSize:'0.84rem', color:'rgba(255,255,255,0.5)', lineHeight:1.75, marginBottom:32, maxWidth:320 }}>Partner with SnapReserve™ to reach millions of travellers and manage bookings in real time via our hotel dashboard.</div>
            </div>
            <div style={{ display:'flex', gap:12, position:'relative', flexWrap:'wrap' }}>
              <a href="/list-property" style={{ background:'#2B6FEA', color:'white', padding:'12px 26px', borderRadius:100, fontWeight:700, fontSize:'0.88rem', textDecoration:'none' }}>Partner with Us</a>
              <a href="/coming-soon?page=support" style={{ background:'rgba(255,255,255,0.1)', color:'white', padding:'12px 26px', borderRadius:100, fontWeight:700, fontSize:'0.88rem', textDecoration:'none', border:'1px solid rgba(255,255,255,0.18)' }}>Learn More</a>
            </div>
          </div>

          <div style={{ borderRadius:24, overflow:'hidden', position:'relative', padding:'48px 44px', background:'linear-gradient(135deg, #150D06 0%, #241408 50%, #1A0E05 100%)', minHeight:280, display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 80% 50%, rgba(244,96,26,0.35) 0%, transparent 60%)', pointerEvents:'none' }} />
            <div style={{ position:'relative' }}>
              <div style={{ fontSize:'2rem', marginBottom:20 }}>🏠</div>
              <div style={{ fontFamily:'Playfair Display,serif', fontSize:'1.5rem', fontWeight:700, color:'white', marginBottom:12, lineHeight:1.2 }}>Your home could earn while you're away</div>
              <div style={{ fontSize:'0.84rem', color:'rgba(255,255,255,0.5)', lineHeight:1.75, marginBottom:32, maxWidth:320 }}>Join 180,000+ individual hosts on SnapReserve™ and turn your spare room, apartment, or villa into steady income.</div>
            </div>
            <div style={{ display:'flex', gap:12, position:'relative', flexWrap:'wrap' }}>
              {userRole === 'host' ? (
                <a href="/host/dashboard" style={{ background:'#F4601A', color:'white', padding:'12px 26px', borderRadius:100, fontWeight:700, fontSize:'0.88rem', textDecoration:'none' }}>Host Dashboard</a>
              ) : userRole === 'pending_host' ? (
                <span style={{ background:'rgba(217,119,6,0.15)', color:'#D97706', padding:'12px 26px', borderRadius:100, fontWeight:700, fontSize:'0.88rem', border:'1px solid rgba(217,119,6,0.3)', cursor:'default' }}>Application Pending ⏳</span>
              ) : (
                <a href="/become-a-host" style={{ background:'#F4601A', color:'white', padding:'12px 26px', borderRadius:100, fontWeight:700, fontSize:'0.88rem', textDecoration:'none' }}>Start Hosting</a>
              )}
              <a href="/coming-soon?page=support" style={{ background:'rgba(255,255,255,0.08)', color:'white', padding:'12px 26px', borderRadius:100, fontWeight:700, fontSize:'0.88rem', textDecoration:'none', border:'1px solid rgba(255,255,255,0.15)' }}>Learn More</a>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">Snap<span>Reserve™</span></div>
        <div className="footer-links">
          <a href="/coming-soon?page=support">Support</a>
          <a href="/terms">Terms</a>
          <a href="/refund-policy">Privacy</a>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {[
            { href:'https://instagram.com/snapreserve', label:'Instagram', icon:<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg> },
            { href:'https://twitter.com/snapreserve', label:'X', icon:<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
            { href:'https://tiktok.com/@snapreserve', label:'TikTok', icon:<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/></svg> },
            { href:'https://facebook.com/snapreserve', label:'Facebook', icon:<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
            { href:'https://linkedin.com/company/snapreserve', label:'LinkedIn', icon:<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
          ].map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" title={s.label}
              style={{ width:34, height:34, borderRadius:8, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.45)', transition:'all 0.18s', textDecoration:'none' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(244,96,26,0.15)'; e.currentTarget.style.color='#F4601A'; e.currentTarget.style.borderColor='rgba(244,96,26,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.color='rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)' }}>
              {s.icon}
            </a>
          ))}
        </div>
        <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.2)', width:'100%', textAlign:'center', marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          © 2026 SnapReserve™ · All rights reserved
        </div>
      </footer>
    </>
  )
}
