'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const STEPS = [
  { id: 1, label: 'Property type' },
  { id: 2, label: 'Basic details' },
  { id: 3, label: 'Amenities & rules' },
  { id: 4, label: 'Photos' },
  { id: 5, label: 'Pricing' },
  { id: 6, label: 'Verification' },
  { id: 7, label: 'Review & publish' },
]

const PRIVATE_TYPES = [
  { id: 'entire_home', icon: '🏠', label: 'Entire home', sub: 'Guests have the whole place' },
  { id: 'private_room', icon: '🛏️', label: 'Private room', sub: 'Own room, shared areas' },
  { id: 'cabin', icon: '🌲', label: 'Cabin / Chalet', sub: 'Woodland or mountain retreat' },
  { id: 'beachfront', icon: '🏖️', label: 'Beachfront', sub: 'On or steps from the beach' },
  { id: 'farm_ranch', icon: '🌿', label: 'Farm / Ranch', sub: 'Rural escape with outdoor space' },
  { id: 'unique_stay', icon: '✨', label: 'Unique stay', sub: 'Treehouse, boat, yurt or special' },
]

const HOTEL_TYPES = [
  { id: 'boutique_hotel', icon: '🏨', label: 'Boutique Hotel', sub: 'Small, stylish, independent' },
  { id: 'resort', icon: '🌴', label: 'Resort', sub: 'Full amenities and activities' },
  { id: 'bed_breakfast', icon: '☕', label: 'Bed & Breakfast', sub: 'Cosy with morning meals included' },
  { id: 'serviced_apartment', icon: '🏢', label: 'Serviced Apartment', sub: 'Self-contained with hotel services' },
  { id: 'hostel', icon: '🎒', label: 'Hostel', sub: 'Budget-friendly shared spaces' },
  { id: 'motel', icon: '🚗', label: 'Motel', sub: 'Drive-up convenience' },
]

const AMENITIES = [
  { id: 'wifi', icon: '📶', label: 'WiFi' },
  { id: 'parking', icon: '🅿️', label: 'Free parking' },
  { id: 'pool', icon: '🏊', label: 'Pool' },
  { id: 'gym', icon: '💪', label: 'Gym' },
  { id: 'ac', icon: '❄️', label: 'Air conditioning' },
  { id: 'kitchen', icon: '🍳', label: 'Kitchen' },
  { id: 'washer', icon: '🧺', label: 'Washer/dryer' },
  { id: 'tv', icon: '📺', label: 'TV / Streaming' },
  { id: 'breakfast', icon: '🥐', label: 'Breakfast included' },
  { id: 'pet_friendly', icon: '🐾', label: 'Pet friendly' },
  { id: 'hot_tub', icon: '🛁', label: 'Hot tub' },
  { id: 'fireplace', icon: '🔥', label: 'Fireplace' },
  { id: 'bbq', icon: '🍖', label: 'BBQ grill' },
  { id: 'workspace', icon: '💼', label: 'Workspace' },
  { id: 'ev_charger', icon: '⚡', label: 'EV charger' },
  { id: 'concierge', icon: '🛎️', label: 'Concierge' },
]

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

export default function ListPropertyPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [step, setStep] = useState(1)
  const [hostType, setHostType] = useState('private_stay') // 'private_stay' or 'hotel'
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef(null)

  // Form data
  const [form, setForm] = useState({
    propertyType: '',
    title: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    amenities: [],
    rules: '',
    photos: [],
    photoUrls: [],
    pricePerNight: '',
    cleaningFee: '',
    minNights: 1,
    instantBook: false,
    phoneVerified: false,
    idUploaded: false,
    idFile: null,
    stripeConnected: false,
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)
    })
  }, [])

  function update(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function toggleAmenity(id) {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(id)
        ? prev.amenities.filter(a => a !== id)
        : [...prev.amenities, id]
    }))
  }

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const previews = files.map(f => URL.createObjectURL(f))
    update('photos', [...form.photos, ...files])
    update('photoUrls', [...form.photoUrls, ...previews])
  }

  function removePhoto(index) {
    update('photos', form.photos.filter((_, i) => i !== index))
    update('photoUrls', form.photoUrls.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      // Upload photos to Supabase Storage
      let uploadedUrls = []
      for (const file of form.photos) {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { data, error } = await supabase.storage
          .from('property-images')
          .upload(path, file)
        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('property-images')
            .getPublicUrl(path)
          uploadedUrls.push(publicUrl)
        }
      }

      // Insert listing as pending
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
          host_id: user.id,
          title: form.title,
          description: form.description,
          type: hostType,
          property_type: form.propertyType,
          address: form.address,
          city: form.city,
          state: form.state,
          zip_code: form.zip,
          max_guests: form.guests,
          bedrooms: form.bedrooms,
          bathrooms: form.bathrooms,
          amenities: form.amenities.join(', '),
          house_rules: form.rules,
          price_per_night: parseFloat(form.pricePerNight),
          cleaning_fee: parseFloat(form.cleaningFee) || 0,
          min_nights: form.minNights,
          is_instant_book: form.instantBook,
          is_active: false,
          images: uploadedUrls,
          rating: 0,
          review_count: 0,
        })
        .select()
        .single()

      if (listingError) throw listingError

      // Get host info for approval record
      const { data: profile } = await supabase.from('users').select('full_name, email').eq('id', user.id).single()

      // Create approval request
      await supabase.from('listing_approvals').insert({
        listing_id: listing.id,
        host_id: user.id,
        host_name: profile?.full_name || '',
        host_email: profile?.email || user.email,
        listing_title: form.title,
        status: 'pending',
      })

      // Update user listing_status
      await supabase.from('users').update({ listing_status: 'pending' }).eq('id', user.id)

      setSubmitted(true)
    } catch (err) {
      alert('Something went wrong. Please try again.')
      console.error(err)
    }
    setSubmitting(false)
  }

  const types = hostType === 'private_stay' ? PRIVATE_TYPES : HOTEL_TYPES
  const completedSteps = step - 1

  if (submitted) return (
    <>
      <style>{`* { margin:0;padding:0;box-sizing:border-box; } body { font-family:'DM Sans',-apple-system,sans-serif; background:#0F0D0A; color:white; min-height:100vh; display:flex; align-items:center; justify-content:center; }`}</style>
      <div style={{textAlign:'center',padding:'40px 20px',maxWidth:'480px',margin:'0 auto'}}>
        <div style={{fontSize:'4rem',marginBottom:'20px'}}>🎉</div>
        <div style={{fontFamily:'Playfair Display,serif',fontSize:'2rem',fontWeight:700,marginBottom:'12px'}}>Submitted for review!</div>
        <div style={{fontSize:'0.92rem',color:'rgba(255,255,255,0.5)',lineHeight:1.8,marginBottom:'32px'}}>
          Your listing <strong style={{color:'white'}}>"{form.title}"</strong> has been submitted. We'll review it within 24 hours and notify you by email once it's approved and live on SnapReserve™.
        </div>
        <a href="/dashboard" style={{background:'#F4601A',color:'white',padding:'14px 32px',borderRadius:'100px',fontWeight:700,fontSize:'0.94rem',textDecoration:'none',display:'inline-block'}}>Back to dashboard →</a>
      </div>
    </>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; background:#0F0D0A; color:white; }

        /* TOPBAR */
        .topbar { display:flex; align-items:center; justify-content:space-between; padding:0 32px; height:64px; background:#1A1712; border-bottom:1px solid rgba(255,255,255,0.08); position:sticky; top:0; z-index:100; }
        .logo { font-family:'Playfair Display',serif; font-size:1.2rem; font-weight:900; color:white; text-decoration:none; }
        .logo span { color:#F4601A; }
        .topbar-right { display:flex; align-items:center; gap:16px; }
        .save-btn { background:none; border:1px solid rgba(255,255,255,0.15); color:rgba(255,255,255,0.6); padding:8px 18px; border-radius:8px; font-size:0.82rem; cursor:pointer; font-family:inherit; }
        .save-btn:hover { border-color:rgba(255,255,255,0.3); color:white; }
        .exit-btn { background:#F4601A; color:white; border:none; padding:8px 20px; border-radius:8px; font-size:0.82rem; font-weight:700; cursor:pointer; font-family:inherit; text-decoration:none; }

        /* LAYOUT */
        .layout { display:flex; min-height:calc(100vh - 64px); }

        /* SIDEBAR */
        .sidebar { width:200px; background:#1A1712; border-right:1px solid rgba(255,255,255,0.07); padding:24px 16px; position:sticky; top:64px; height:calc(100vh - 64px); }

        /* HOST TYPE TABS */
        .host-tabs { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:28px; }
        .host-tab { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 8px; text-align:center; cursor:pointer; transition:all 0.18s; }
        .host-tab.active { background:#F4601A; border-color:#F4601A; }
        .host-tab-icon { font-size:1.2rem; margin-bottom:4px; }
        .host-tab-label { font-size:0.72rem; font-weight:700; color:rgba(255,255,255,0.7); }
        .host-tab.active .host-tab-label { color:white; }

        /* PROGRESS */
        .progress-label { font-size:0.62rem; font-weight:700; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:12px; }
        .step-item { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:8px; margin-bottom:2px; cursor:pointer; transition:background 0.18s; }
        .step-item.active { background:rgba(244,96,26,0.15); }
        .step-num { width:24px; height:24px; border-radius:50%; border:2px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:700; color:rgba(255,255,255,0.4); flex-shrink:0; transition:all 0.2s; }
        .step-num.done { background:#16A34A; border-color:#16A34A; color:white; }
        .step-num.active { border-color:#F4601A; color:#F4601A; }
        .step-label { font-size:0.8rem; color:rgba(255,255,255,0.45); }
        .step-label.active { color:white; font-weight:600; }
        .step-label.done { color:rgba(255,255,255,0.5); }

        /* CONTENT */
        .content { flex:1; padding:40px 48px; max-width:860px; }
        .step-badge { display:inline-flex; align-items:center; gap:6px; background:rgba(244,96,26,0.1); border:1px solid rgba(244,96,26,0.2); border-radius:100px; padding:5px 14px; font-size:0.72rem; font-weight:700; color:#F4601A; margin-bottom:20px; }
        .content h1 { font-family:'Playfair Display',serif; font-size:2rem; font-weight:700; margin-bottom:8px; }
        .content .subtitle { font-size:0.9rem; color:rgba(255,255,255,0.5); line-height:1.7; margin-bottom:32px; }
        .divider { height:1px; background:rgba(255,255,255,0.08); margin-bottom:32px; }

        .section-title { font-size:1.1rem; font-weight:700; margin-bottom:6px; }
        .section-sub { font-size:0.82rem; color:rgba(255,255,255,0.45); margin-bottom:20px; }

        /* TYPE GRID */
        .type-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px; }
        .type-card { background:rgba(255,255,255,0.04); border:2px solid rgba(255,255,255,0.08); border-radius:12px; padding:20px 16px; cursor:pointer; transition:all 0.18s; text-align:center; }
        .type-card:hover { border-color:rgba(244,96,26,0.4); background:rgba(244,96,26,0.06); }
        .type-card.selected { border-color:#F4601A; background:rgba(244,96,26,0.12); }
        .type-icon { font-size:1.8rem; margin-bottom:8px; }
        .type-label { font-size:0.88rem; font-weight:700; margin-bottom:4px; }
        .type-sub { font-size:0.72rem; color:rgba(255,255,255,0.4); }

        /* FORM FIELDS */
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
        .form-group { margin-bottom:16px; }
        .form-label { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:rgba(255,255,255,0.45); margin-bottom:6px; display:block; }
        .form-input { width:100%; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:12px 14px; font-size:0.88rem; font-family:inherit; outline:none; color:white; transition:all 0.18s; }
        .form-input:focus { border-color:#F4601A; background:rgba(244,96,26,0.06); }
        .form-textarea { width:100%; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:12px 14px; font-size:0.88rem; font-family:inherit; outline:none; color:white; resize:vertical; min-height:100px; }
        .form-textarea:focus { border-color:#F4601A; }
        .form-select { width:100%; background:#1A1712; border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:12px 14px; font-size:0.88rem; font-family:inherit; outline:none; color:white; }

        /* COUNTER */
        .counter-row { display:flex; align-items:center; justify-content:space-between; padding:14px 0; border-bottom:1px solid rgba(255,255,255,0.06); }
        .counter-label { font-size:0.88rem; font-weight:600; }
        .counter-sub { font-size:0.76rem; color:rgba(255,255,255,0.35); }
        .counter-ctrl { display:flex; align-items:center; gap:14px; }
        .counter-btn { width:32px; height:32px; border-radius:50%; border:1px solid rgba(255,255,255,0.2); background:none; color:white; font-size:1.1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.18s; }
        .counter-btn:hover { border-color:#F4601A; color:#F4601A; }
        .counter-val { font-size:0.96rem; font-weight:700; min-width:20px; text-align:center; }

        /* AMENITIES */
        .amenities-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:24px; }
        .amenity-card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:12px; cursor:pointer; transition:all 0.18s; text-align:center; }
        .amenity-card:hover { border-color:rgba(244,96,26,0.3); }
        .amenity-card.selected { border-color:#F4601A; background:rgba(244,96,26,0.1); }
        .amenity-icon { font-size:1.2rem; margin-bottom:6px; }
        .amenity-label { font-size:0.72rem; font-weight:600; color:rgba(255,255,255,0.7); }
        .amenity-card.selected .amenity-label { color:white; }

        /* PHOTOS */
        .photo-upload-area { border:2px dashed rgba(255,255,255,0.15); border-radius:16px; padding:40px; text-align:center; cursor:pointer; transition:all 0.2s; margin-bottom:20px; }
        .photo-upload-area:hover { border-color:rgba(244,96,26,0.4); background:rgba(244,96,26,0.04); }
        .upload-icon { font-size:2.5rem; margin-bottom:12px; }
        .upload-title { font-size:0.96rem; font-weight:700; margin-bottom:4px; }
        .upload-sub { font-size:0.78rem; color:rgba(255,255,255,0.35); }
        .photos-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
        .photo-thumb { position:relative; border-radius:10px; overflow:hidden; height:100px; }
        .photo-thumb img { width:100%; height:100%; object-fit:cover; }
        .photo-remove { position:absolute; top:6px; right:6px; width:24px; height:24px; border-radius:50%; background:rgba(0,0,0,0.7); border:none; color:white; cursor:pointer; font-size:0.8rem; display:flex; align-items:center; justify-content:center; }

        /* PRICING */
        .price-row { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
        .price-symbol { font-size:1.3rem; font-weight:700; color:rgba(255,255,255,0.4); }
        .price-input { flex:1; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:14px 16px; font-size:1.2rem; font-weight:700; font-family:inherit; outline:none; color:white; }
        .price-input:focus { border-color:#F4601A; }
        .toggle-row { display:flex; align-items:center; justify-content:space-between; padding:16px 0; border-bottom:1px solid rgba(255,255,255,0.06); }
        .toggle-info h4 { font-size:0.92rem; font-weight:700; margin-bottom:2px; }
        .toggle-info p { font-size:0.76rem; color:rgba(255,255,255,0.4); }
        .toggle-switch { width:44px; height:24px; border-radius:100px; border:none; cursor:pointer; transition:all 0.2s; position:relative; background:${form.instantBook ? '#F4601A' : 'rgba(255,255,255,0.15)'}; }
        .toggle-knob { position:absolute; top:3px; width:18px; height:18px; border-radius:50%; background:white; transition:transform 0.2s; }

        /* VERIFICATION */
        .verify-card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px 20px; display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
        .verify-left { display:flex; align-items:center; gap:14px; }
        .verify-icon { width:42px; height:42px; border-radius:10px; background:rgba(255,255,255,0.07); display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0; }
        .verify-title { font-size:0.92rem; font-weight:700; margin-bottom:2px; }
        .verify-sub { font-size:0.74rem; color:rgba(255,255,255,0.4); }
        .verify-done { font-size:0.8rem; font-weight:700; color:#4ade80; }
        .verify-btn { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:white; padding:8px 18px; border-radius:8px; font-size:0.8rem; font-weight:700; cursor:pointer; font-family:inherit; transition:all 0.18s; }
        .verify-btn:hover { background:rgba(255,255,255,0.14); }

        /* REVIEW */
        .review-section { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:20px; margin-bottom:16px; }
        .review-section h3 { font-size:0.86rem; font-weight:700; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:14px; }
        .review-row { display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.84rem; }
        .review-row:last-child { border-bottom:none; }
        .review-key { color:rgba(255,255,255,0.45); }
        .review-val { color:white; font-weight:600; }

        /* HINT BOX */
        .hint { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:14px 16px; display:flex; align-items:flex-start; gap:10px; margin-top:20px; }
        .hint-icon { font-size:1rem; flex-shrink:0; margin-top:1px; }
        .hint-text { font-size:0.8rem; color:rgba(255,255,255,0.5); line-height:1.6; }
        .hint-text strong { color:rgba(255,255,255,0.8); }

        /* BOTTOM NAV */
        .bottom-nav { position:sticky; bottom:0; background:#1A1712; border-top:1px solid rgba(255,255,255,0.08); padding:16px 48px; display:flex; justify-content:space-between; align-items:center; }
        .back-btn { background:none; border:1px solid rgba(255,255,255,0.15); color:rgba(255,255,255,0.6); padding:12px 28px; border-radius:10px; font-size:0.88rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .back-btn:hover { border-color:rgba(255,255,255,0.3); color:white; }
        .next-btn { background:#F4601A; color:white; border:none; padding:12px 32px; border-radius:10px; font-size:0.88rem; font-weight:700; cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:8px; transition:background 0.18s; }
        .next-btn:hover { background:#FF7A35; }
        .next-btn:disabled { opacity:0.5; cursor:not-allowed; }

        @media(max-width:768px) { .sidebar{display:none;} .type-grid{grid-template-columns:repeat(2,1fr);} .amenities-grid{grid-template-columns:repeat(2,1fr);} .form-grid{grid-template-columns:1fr;} .content{padding:24px 20px;} .bottom-nav{padding:16px 20px;} }
      `}</style>

      {/* TOPBAR */}
      <div className="topbar">
        <a href="/" className="logo">Snap<span>Reserve™</span></a>
        <div className="topbar-right">
          <button className="save-btn">Save draft</button>
          <a href="/dashboard" className="exit-btn">Exit</a>
        </div>
      </div>

      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="host-tabs">
            <div className={`host-tab ${hostType === 'private_stay' ? 'active' : ''}`} onClick={() => setHostType('private_stay')}>
              <div className="host-tab-icon">🏠</div>
              <div className="host-tab-label">Private Stay</div>
            </div>
            <div className={`host-tab ${hostType === 'hotel' ? 'active' : ''}`} onClick={() => setHostType('hotel')}>
              <div className="host-tab-icon">🏨</div>
              <div className="host-tab-label">Hotel</div>
            </div>
          </div>

          <div className="progress-label">Your Progress</div>
          {STEPS.map(s => (
            <div key={s.id} className={`step-item ${step === s.id ? 'active' : ''}`} onClick={() => s.id < step && setStep(s.id)}>
              <div className={`step-num ${s.id < step ? 'done' : s.id === step ? 'active' : ''}`}>
                {s.id < step ? '✓' : s.id}
              </div>
              <div className={`step-label ${s.id === step ? 'active' : s.id < step ? 'done' : ''}`}>{s.label}</div>
            </div>
          ))}
        </aside>

        {/* CONTENT */}
        <div style={{flex:1,display:'flex',flexDirection:'column'}}>
          <div className="content">
            <div className="step-badge">
              {hostType === 'private_stay' ? '🏠 Private Stay Host' : '🏨 Hotel Host'}
            </div>
            <h1>List your space on SnapReserve™</h1>
            <p className="subtitle">Earn money from your home, apartment, villa, or unique space. Takes about 10 minutes to go live.</p>
            <div className="divider" />

            {/* STEP 1 — Property Type */}
            {step === 1 && (
              <div>
                <div className="section-title">What kind of space are you listing?</div>
                <div className="section-sub">Choose the type that best describes your property.</div>
                <div className="type-grid">
                  {types.map(t => (
                    <div key={t.id} className={`type-card ${form.propertyType === t.id ? 'selected' : ''}`} onClick={() => update('propertyType', t.id)}>
                      <div className="type-icon">{t.icon}</div>
                      <div className="type-label">{t.label}</div>
                      <div className="type-sub">{t.sub}</div>
                    </div>
                  ))}
                </div>
                <div className="hint">
                  <div className="hint-icon">💡</div>
                  <div className="hint-text"><strong>Not sure?</strong> Pick the closest match — you can update it from your dashboard anytime.</div>
                </div>
              </div>
            )}

            {/* STEP 2 — Basic Details */}
            {step === 2 && (
              <div>
                <div className="section-title">Tell us about your property</div>
                <div className="section-sub">This is what guests will see on your listing page.</div>

                <div className="form-group">
                  <label className="form-label">Listing title</label>
                  <input className="form-input" placeholder="e.g. Luxury beachfront villa with pool" value={form.title} onChange={e => update('title', e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" placeholder="Describe your space, what makes it special, nearby attractions..." value={form.description} onChange={e => update('description', e.target.value)} rows={4} />
                </div>

                <div className="form-group">
                  <label className="form-label">Street address</label>
                  <input className="form-input" placeholder="123 Main Street" value={form.address} onChange={e => update('address', e.target.value)} />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-input" placeholder="City" value={form.city} onChange={e => update('city', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <select className="form-select" value={form.state} onChange={e => update('state', e.target.value)}>
                      <option value="">Select state</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{marginTop:'24px'}}>
                  <div className="section-title" style={{marginBottom:'4px'}}>Capacity</div>
                  <div className="section-sub">How many guests can stay?</div>
                  {[
                    {label:'Guests', sub:'Maximum guests allowed', key:'guests'},
                    {label:'Bedrooms', sub:'Number of bedrooms', key:'bedrooms'},
                    {label:'Beds', sub:'Total number of beds', key:'beds'},
                    {label:'Bathrooms', sub:'Number of bathrooms', key:'bathrooms'},
                  ].map(item => (
                    <div key={item.key} className="counter-row">
                      <div>
                        <div className="counter-label">{item.label}</div>
                        <div style={{fontSize:'0.74rem',color:'rgba(255,255,255,0.35)'}}>{item.sub}</div>
                      </div>
                      <div className="counter-ctrl">
                        <button className="counter-btn" onClick={() => update(item.key, Math.max(1, form[item.key] - 1))}>−</button>
                        <div className="counter-val">{form[item.key]}</div>
                        <button className="counter-btn" onClick={() => update(item.key, form[item.key] + 1)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3 — Amenities */}
            {step === 3 && (
              <div>
                <div className="section-title">What amenities do you offer?</div>
                <div className="section-sub">Select everything that applies — guests filter by these.</div>
                <div className="amenities-grid">
                  {AMENITIES.map(a => (
                    <div key={a.id} className={`amenity-card ${form.amenities.includes(a.id) ? 'selected' : ''}`} onClick={() => toggleAmenity(a.id)}>
                      <div className="amenity-icon">{a.icon}</div>
                      <div className="amenity-label">{a.label}</div>
                    </div>
                  ))}
                </div>

                <div className="section-title" style={{marginTop:'28px',marginBottom:'4px'}}>House rules</div>
                <div className="section-sub">Any important rules guests must follow?</div>
                <textarea className="form-textarea" placeholder="e.g. No smoking, no parties, check-in after 3pm, checkout by 11am..." value={form.rules} onChange={e => update('rules', e.target.value)} rows={4} />
              </div>
            )}

            {/* STEP 4 — Photos */}
            {step === 4 && (
              <div>
                <div className="section-title">Add photos of your property</div>
                <div className="section-sub">Great photos = more bookings. Add at least 3, up to 20.</div>

                <div className="photo-upload-area" onClick={() => fileInputRef.current?.click()}>
                  <div className="upload-icon">📸</div>
                  <div className="upload-title">Click to upload photos</div>
                  <div className="upload-sub">JPG, PNG, WEBP — up to 10MB each</div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={handlePhotoUpload} />
                </div>

                {form.photoUrls.length > 0 && (
                  <div className="photos-grid">
                    {form.photoUrls.map((url, i) => (
                      <div key={i} className="photo-thumb">
                        <img src={url} alt={`Photo ${i+1}`} />
                        <button className="photo-remove" onClick={() => removePhoto(i)}>×</button>
                        {i === 0 && <div style={{position:'absolute',bottom:'6px',left:'6px',background:'#F4601A',color:'white',fontSize:'0.6rem',fontWeight:700,padding:'2px 8px',borderRadius:'100px'}}>Cover</div>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="hint">
                  <div className="hint-icon">💡</div>
                  <div className="hint-text"><strong>Pro tip:</strong> Listings with 8+ photos get 3x more bookings. Include the exterior, every room, kitchen, bathrooms, and any outdoor areas.</div>
                </div>
              </div>
            )}

            {/* STEP 5 — Pricing */}
            {step === 5 && (
              <div>
                <div className="section-title">Set your pricing</div>
                <div className="section-sub">You can always change these later from your dashboard.</div>

                <div style={{marginBottom:'24px'}}>
                  <label className="form-label">Nightly rate (USD)</label>
                  <div className="price-row">
                    <div className="price-symbol">$</div>
                    <input className="price-input" type="number" placeholder="0.00" value={form.pricePerNight} onChange={e => update('pricePerNight', e.target.value)} />
                    <div style={{fontSize:'0.82rem',color:'rgba(255,255,255,0.35)',whiteSpace:'nowrap'}}>per night</div>
                  </div>
                </div>

                <div style={{marginBottom:'24px'}}>
                  <label className="form-label">Cleaning fee (USD)</label>
                  <div className="price-row">
                    <div className="price-symbol">$</div>
                    <input className="price-input" type="number" placeholder="0.00" value={form.cleaningFee} onChange={e => update('cleaningFee', e.target.value)} />
                    <div style={{fontSize:'0.82rem',color:'rgba(255,255,255,0.35)',whiteSpace:'nowrap'}}>one-time</div>
                  </div>
                </div>

                <div className="counter-row">
                  <div>
                    <div className="counter-label">Minimum stay</div>
                    <div style={{fontSize:'0.74rem',color:'rgba(255,255,255,0.35)'}}>Minimum number of nights</div>
                  </div>
                  <div className="counter-ctrl">
                    <button className="counter-btn" onClick={() => update('minNights', Math.max(1, form.minNights - 1))}>−</button>
                    <div className="counter-val">{form.minNights}</div>
                    <button className="counter-btn" onClick={() => update('minNights', form.minNights + 1)}>+</button>
                  </div>
                </div>

                <div className="toggle-row">
                  <div className="toggle-info">
                    <h4>⚡ Instant booking</h4>
                    <p>Guests can book immediately without waiting for your approval</p>
                  </div>
                  <button
                    className="toggle-switch"
                    style={{background: form.instantBook ? '#F4601A' : 'rgba(255,255,255,0.15)'}}
                    onClick={() => update('instantBook', !form.instantBook)}
                  >
                    <div className="toggle-knob" style={{transform: form.instantBook ? 'translateX(20px)' : 'translateX(0)'}} />
                  </button>
                </div>

                {form.pricePerNight && (
                  <div style={{background:'rgba(244,96,26,0.06)',border:'1px solid rgba(244,96,26,0.15)',borderRadius:'12px',padding:'16px 20px',marginTop:'20px'}}>
                    <div style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.45)',marginBottom:'8px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em'}}>Your estimated earnings</div>
                    <div style={{fontSize:'1.6rem',fontWeight:700,color:'#F4601A'}}>${(form.pricePerNight * 0.968).toFixed(2)}<span style={{fontSize:'0.84rem',color:'rgba(255,255,255,0.4)',fontWeight:400}}> / night after 3.2% fee</span></div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 6 — Verification */}
            {step === 6 && (
              <div>
                <div className="section-title">Verify your identity</div>
                <div className="section-sub">Required before going live. Protects you and your guests, and builds your reputation from day one.</div>

                <div className="verify-card">
                  <div className="verify-left">
                    <div className="verify-icon">📧</div>
                    <div>
                      <div className="verify-title">Email verified</div>
                      <div className="verify-sub">{user?.email} — confirmed</div>
                    </div>
                  </div>
                  <div className="verify-done">✓ Done</div>
                </div>

                <div className="verify-card">
                  <div className="verify-left">
                    <div className="verify-icon">📱</div>
                    <div>
                      <div className="verify-title">Phone verified</div>
                      <div className="verify-sub">Add a phone number for SMS verification</div>
                    </div>
                  </div>
                  {form.phoneVerified
                    ? <div className="verify-done">✓ Done</div>
                    : <button className="verify-btn" onClick={() => update('phoneVerified', true)}>Verify →</button>
                  }
                </div>

                <div className="verify-card">
                  <div className="verify-left">
                    <div className="verify-icon">🪪</div>
                    <div>
                      <div className="verify-title">Government ID</div>
                      <div className="verify-sub">Passport or driving licence · Reviewed within 24h</div>
                    </div>
                  </div>
                  {form.idUploaded
                    ? <div className="verify-done">✓ Uploaded</div>
                    : (
                      <label style={{cursor:'pointer'}}>
                        <span className="verify-btn">Upload →</span>
                        <input type="file" accept="image/*,application/pdf" style={{display:'none'}} onChange={() => update('idUploaded', true)} />
                      </label>
                    )
                  }
                </div>

                <div className="verify-card">
                  <div className="verify-left">
                    <div className="verify-icon">🏦</div>
                    <div>
                      <div className="verify-title">Connect bank account</div>
                      <div className="verify-sub">Required for payouts. Powered by Stripe Connect — bank details never stored on SnapReserve™.</div>
                    </div>
                  </div>
                  {form.stripeConnected
                    ? <div className="verify-done">✓ Connected</div>
                    : <button className="verify-btn" onClick={() => update('stripeConnected', true)}>Connect →</button>
                  }
                </div>
              </div>
            )}

            {/* STEP 7 — Review & Publish */}
            {step === 7 && (
              <div>
                <div className="section-title">Review your listing</div>
                <div className="section-sub">Check everything looks right before submitting for approval.</div>

                <div className="review-section">
                  <h3>Property details</h3>
                  <div className="review-row"><span className="review-key">Type</span><span className="review-val">{hostType === 'hotel' ? '🏨 Hotel' : '🏠 Private Stay'}</span></div>
                  <div className="review-row"><span className="review-key">Space type</span><span className="review-val">{types.find(t => t.id === form.propertyType)?.label || '—'}</span></div>
                  <div className="review-row"><span className="review-key">Title</span><span className="review-val">{form.title || '—'}</span></div>
                  <div className="review-row"><span className="review-key">Location</span><span className="review-val">{form.city && form.state ? `${form.city}, ${form.state}` : '—'}</span></div>
                  <div className="review-row"><span className="review-key">Guests</span><span className="review-val">{form.guests} guests · {form.bedrooms} bed{form.bedrooms!==1?'s':''} · {form.bathrooms} bath{form.bathrooms!==1?'s':''}</span></div>
                </div>

                <div className="review-section">
                  <h3>Pricing</h3>
                  <div className="review-row"><span className="review-key">Nightly rate</span><span className="review-val">${form.pricePerNight || '0'}/night</span></div>
                  <div className="review-row"><span className="review-key">Cleaning fee</span><span className="review-val">${form.cleaningFee || '0'}</span></div>
                  <div className="review-row"><span className="review-key">Minimum nights</span><span className="review-val">{form.minNights} night{form.minNights!==1?'s':''}</span></div>
                  <div className="review-row"><span className="review-key">Instant booking</span><span className="review-val">{form.instantBook ? '⚡ Enabled' : 'Off'}</span></div>
                </div>

                <div className="review-section">
                  <h3>Photos & amenities</h3>
                  <div className="review-row"><span className="review-key">Photos</span><span className="review-val">{form.photos.length} photo{form.photos.length!==1?'s':''} uploaded</span></div>
                  <div className="review-row"><span className="review-key">Amenities</span><span className="review-val">{form.amenities.length} selected</span></div>
                </div>

                <div style={{background:'rgba(244,96,26,0.06)',border:'1px solid rgba(244,96,26,0.2)',borderRadius:'14px',padding:'20px',marginTop:'8px'}}>
                  <div style={{fontWeight:700,marginBottom:'6px'}}>📋 What happens next</div>
                  <div style={{fontSize:'0.82rem',color:'rgba(255,255,255,0.5)',lineHeight:1.8}}>
                    After you submit, our team will review your listing within <strong style={{color:'white'}}>24 hours</strong>. We verify the details, check your photos, and make sure everything meets our quality standards. You'll get an email when you're approved and your listing goes live.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM NAV */}
          <div className="bottom-nav">
            {step > 1
              ? <button className="back-btn" onClick={() => setStep(s => s - 1)}>← Back</button>
              : <div />
            }
            {step < 7
              ? <button className="next-btn" onClick={() => setStep(s => s + 1)} disabled={step === 1 && !form.propertyType}>
                  Choose & continue →
                </button>
              : <button className="next-btn" onClick={handleSubmit} disabled={submitting || !form.title || !form.pricePerNight}>
                  {submitting ? 'Submitting...' : '🚀 Submit for review →'}
                </button>
            }
          </div>
        </div>
      </div>
    </>
  )
}