'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const STEPS = [
  { id: 1, label: 'Property type' },
  { id: 2, label: 'Location' },
  { id: 3, label: 'Basics' },
  { id: 4, label: 'Policies' },
  { id: 5, label: 'Amenities' },
  { id: 6, label: 'Photos' },
  { id: 7, label: 'Pricing' },
  { id: 8, label: 'Review & publish' },
]

// Hotel has an extra Room Types step after Location
const HOTEL_STEPS = [
  { id: 1, label: 'Property type' },
  { id: 2, label: 'Location' },
  { id: 3, label: 'Room types' },
  { id: 4, label: 'Basics' },
  { id: 5, label: 'Policies' },
  { id: 6, label: 'Amenities' },
  { id: 7, label: 'Photos' },
  { id: 8, label: 'Pricing' },
  { id: 9, label: 'Review & publish' },
]

const PRIVATE_TYPES = [
  { id: 'entire_home',   icon: '🏠', label: 'Entire home',      sub: 'Guests have the whole place' },
  { id: 'private_room',  icon: '🛏️', label: 'Private room',     sub: 'Own room, shared areas' },
  { id: 'cabin',         icon: '🌲', label: 'Cabin / Chalet',   sub: 'Woodland or mountain retreat' },
  { id: 'beachfront',    icon: '🏖️', label: 'Beachfront',       sub: 'On or steps from the beach' },
  { id: 'farm_ranch',    icon: '🌿', label: 'Farm / Ranch',     sub: 'Rural escape with outdoor space' },
  { id: 'unique_stay',   icon: '✨', label: 'Unique stay',      sub: 'Treehouse, boat, yurt or special' },
]

const HOTEL_TYPES = [
  { id: 'boutique_hotel',       icon: '🏨', label: 'Boutique Hotel',       sub: 'Small, stylish, independent' },
  { id: 'resort',               icon: '🌴', label: 'Resort',               sub: 'Full amenities and activities' },
  { id: 'bed_breakfast',        icon: '☕', label: 'Bed & Breakfast',      sub: 'Cosy with morning meals included' },
  { id: 'serviced_apartment',   icon: '🏢', label: 'Serviced Apartment',   sub: 'Self-contained with hotel services' },
  { id: 'hostel',               icon: '🎒', label: 'Hostel',               sub: 'Budget-friendly shared spaces' },
  { id: 'motel',                icon: '🚗', label: 'Motel',                sub: 'Drive-up convenience' },
]

const AMENITIES = [
  { id: 'wifi',        icon: '📶', label: 'WiFi' },
  { id: 'parking',     icon: '🅿️', label: 'Free parking' },
  { id: 'pool',        icon: '🏊', label: 'Pool' },
  { id: 'gym',         icon: '💪', label: 'Gym' },
  { id: 'ac',          icon: '❄️', label: 'Air conditioning' },
  { id: 'kitchen',     icon: '🍳', label: 'Kitchen' },
  { id: 'washer',      icon: '🧺', label: 'Washer/dryer' },
  { id: 'tv',          icon: '📺', label: 'TV / Streaming' },
  { id: 'breakfast',   icon: '🥐', label: 'Breakfast included' },
  { id: 'pet_friendly',icon: '🐾', label: 'Pet friendly' },
  { id: 'hot_tub',     icon: '🛁', label: 'Hot tub' },
  { id: 'fireplace',   icon: '🔥', label: 'Fireplace' },
  { id: 'bbq',         icon: '🍖', label: 'BBQ grill' },
  { id: 'workspace',   icon: '💼', label: 'Workspace' },
  { id: 'ev_charger',  icon: '⚡', label: 'EV charger' },
  { id: 'concierge',   icon: '🛎️', label: 'Concierge' },
]

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

const BETA_TERMS_VERSION = '1.0'

function ListPropertyInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState(null)
  const [step, setStep] = useState(1)
  const [hostType, setHostType] = useState('private_stay')
  const [saving, setSaving] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [draftId, setDraftId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [initialStatus, setInitialStatus] = useState(null)
  const [changeNotes, setChangeNotes] = useState([])
  const [previewing, setPreviewing] = useState(false)
  const [betaAcknowledged, setBetaAcknowledged] = useState(false)
  const fileInputRef = useRef(null)

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
    // Policies
    checkinStartTime: '15:00',
    checkinEndTime: '',
    checkoutTime: '11:00',
    cancellationPolicy: 'flexible',
    petPolicy: 'no_pets',
    smokingPolicy: 'no_smoking',
    quietHoursStart: '',
    quietHoursEnd: '',
    securityDeposit: '',
    minBookingAge: '18',
    extraGuestFee: '',
  })

  // Room types for hotel path
  const [roomTypes, setRoomTypes] = useState([])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)
      const editId = searchParams.get('edit')
      if (editId) {
        setDraftId(editId)
        setEditMode(true)
        const [{ data: listing }, { data: existingRooms }] = await Promise.all([
          supabase.from('listings').select('*').eq('id', editId).single(),
          supabase.from('rooms').select('*').eq('listing_id', editId).order('price_per_night', { ascending: true }),
        ])
        if (!listing) return
        setInitialStatus(listing.status)
        setHostType(listing.type || 'private_stay')
        setForm(prev => ({
          ...prev,
          propertyType:  listing.property_type || '',
          title:         listing.title || '',
          description:   listing.description || '',
          address:       listing.address || '',
          city:          listing.city || '',
          state:         listing.state || '',
          zip:           listing.zip_code || '',
          guests:        listing.max_guests || 2,
          bedrooms:      listing.bedrooms || 1,
          bathrooms:     listing.bathrooms || 1,
          beds:          listing.beds || 1,
          amenities:     listing.amenities ? listing.amenities.split(',').map(a => a.trim()).filter(Boolean) : [],
          rules:         listing.house_rules || '',
          pricePerNight: listing.price_per_night?.toString() || '',
          cleaningFee:   listing.cleaning_fee?.toString() || '',
          minNights:     listing.min_nights || 1,
          instantBook:   listing.is_instant_book || false,
          photoUrls:          Array.isArray(listing.images) ? listing.images : [],
          photos:             [],
          checkinStartTime:   listing.checkin_start_time   || '15:00',
          checkinEndTime:     listing.checkin_end_time     || '',
          checkoutTime:       listing.checkout_time        || '11:00',
          cancellationPolicy: listing.cancellation_policy  || 'flexible',
          petPolicy:          listing.pet_policy           || 'no_pets',
          smokingPolicy:      listing.smoking_policy       || 'no_smoking',
          quietHoursStart:    listing.quiet_hours_start    || '',
          quietHoursEnd:      listing.quiet_hours_end      || '',
          securityDeposit:    listing.security_deposit     != null ? String(listing.security_deposit) : '',
          minBookingAge:      listing.min_booking_age      != null ? String(listing.min_booking_age)  : '18',
          extraGuestFee:      listing.extra_guest_fee      != null ? String(listing.extra_guest_fee)  : '',
        }))
        // Load existing rooms for hotel listings
        if (existingRooms?.length) {
          setRoomTypes(existingRooms.map(r => ({
            id:             r.id,
            name:           r.name || '',
            tier:           r.tier || 'Standard',
            price:          r.price_per_night?.toString() || '',
            maxGuests:      r.max_guests?.toString() || '2',
            beds:           r.bed_type || '',
            view:           r.view_type || '',
            amenities:      r.amenities || '',
            unitsAvailable: r.units_available?.toString() || '1',
          })))
        }
        if (listing.status === 'changes_requested') {
          const { data: crs } = await supabase
            .from('listing_change_requests')
            .select('notes, admin_email, created_at')
            .eq('listing_id', editId).eq('status', 'open')
            .order('created_at', { ascending: false })
          setChangeNotes(crs || [])
        }
      }
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
    const urlToRemove = form.photoUrls[index]
    if (urlToRemove?.startsWith('blob:')) {
      const blobIndex = form.photoUrls.slice(0, index).filter(u => u.startsWith('blob:')).length
      update('photos', form.photos.filter((_, i) => i !== blobIndex))
    }
    update('photoUrls', form.photoUrls.filter((_, i) => i !== index))
  }

  async function handleSaveDraft(silent = false) {
    if (!silent) { setSaving(true); setDraftSaved(false) }
    let savedId = draftId
    try {
      const { data: hostRow, error: hostErr } = await supabase
        .from('hosts').select('id').eq('user_id', user.id).maybeSingle()
      if (hostErr || !hostRow) throw new Error('Host profile not found. Please contact support.')

      const payload = {
        host_id:         hostRow.id,
        status:          editMode ? (initialStatus || 'draft') : 'draft',
        type:            hostType,
        property_type:   form.propertyType || null,
        title:           form.title || null,
        description:     form.description || null,
        address:         form.address || null,
        city:            form.city || null,
        state:           form.state || null,
        zip_code:        form.zip || null,
        max_guests:      form.guests,
        bedrooms:        form.bedrooms,
        bathrooms:       form.bathrooms,
        amenities:       form.amenities.length > 0 ? form.amenities.join(', ') : null,
        house_rules:     form.rules || null,
        price_per_night: form.pricePerNight ? parseFloat(form.pricePerNight) : null,
        cleaning_fee:    form.cleaningFee ? parseFloat(form.cleaningFee) : 0,
        min_nights:      form.minNights,
        is_instant_book:     form.instantBook,
        is_active:           false,
        checkin_start_time:  form.checkinStartTime  || null,
        checkin_end_time:    form.checkinEndTime     || null,
        checkout_time:       form.checkoutTime       || null,
        cancellation_policy: form.cancellationPolicy || 'flexible',
        pet_policy:          form.petPolicy          || 'no_pets',
        smoking_policy:      form.smokingPolicy      || 'no_smoking',
        quiet_hours_start:   form.quietHoursStart    || null,
        quiet_hours_end:     form.quietHoursEnd      || null,
        security_deposit:    form.securityDeposit    ? parseFloat(form.securityDeposit)  : 0,
        min_booking_age:     form.minBookingAge      ? parseInt(form.minBookingAge)      : 18,
        extra_guest_fee:     form.extraGuestFee      ? parseFloat(form.extraGuestFee)    : 0,
      }

      let error
      if (savedId) {
        ;({ error } = await supabase.from('listings').update(payload).eq('id', savedId))
      } else {
        const { data, error: insertError } = await supabase
          .from('listings')
          .insert({ ...payload, rating: 0, review_count: 0 })
          .select('id')
          .single()
        error = insertError
        if (data?.id) { savedId = data.id; setDraftId(data.id) }
      }

      if (error) throw error

      // Save rooms for hotel listings
      if (savedId && hostType === 'hotel' && roomTypes.length > 0) {
        await saveRooms(savedId)
      }

      if (!silent) { setDraftSaved(true); setTimeout(() => setDraftSaved(false), 3000) }
    } catch (err) {
      if (!silent) alert(err?.message || 'Failed to save draft.')
    }
    if (!silent) setSaving(false)
    return savedId
  }

  // Shared room save helper — upserts rooms for a listing
  async function saveRooms(listingId) {
    for (const rt of roomTypes) {
      const roomPayload = {
        listing_id:      listingId,
        name:            rt.name,
        tier:            rt.tier || 'Standard',
        price_per_night: parseFloat(rt.price) || 0,
        max_guests:      parseInt(rt.maxGuests) || 2,
        bed_type:        rt.beds || null,
        view_type:       rt.view || null,
        amenities:       rt.amenities || null,
        units_available: parseInt(rt.unitsAvailable) || 1,
        is_available:    true,
      }
      if (rt.id) {
        // Existing room — update
        await supabase.from('rooms').update(roomPayload).eq('id', rt.id)
      } else {
        // New room — insert and store returned id
        const { data: inserted } = await supabase.from('rooms').insert(roomPayload).select('id').single()
        if (inserted?.id) rt.id = inserted.id
      }
    }
  }

  async function handlePreview() {
    setPreviewing(true)
    try {
      const id = await handleSaveDraft(true)
      if (id) window.open(`/listings/${id}?preview=1`, '_blank')
    } finally {
      setPreviewing(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const { data: hostRow, error: hostErr } = await supabase
        .from('hosts').select('id').eq('user_id', user.id).maybeSingle()
      if (hostErr || !hostRow) throw new Error('Host profile not found. Please contact support.')

      const listingPayload = {
        host_id:         hostRow.id,
        title:           form.title,
        description:     form.description,
        type:            hostType,
        property_type:   form.propertyType,
        address:         form.address,
        city:            form.city,
        state:           form.state,
        zip_code:        form.zip,
        max_guests:      form.guests,
        bedrooms:        form.bedrooms,
        bathrooms:       form.bathrooms,
        amenities:       form.amenities.join(', '),
        house_rules:     form.rules,
        price_per_night: parseFloat(form.pricePerNight),
        cleaning_fee:    parseFloat(form.cleaningFee) || 0,
        min_nights:      form.minNights,
        is_instant_book:     form.instantBook,
        is_active:           false,
        status:              'pending',
        checkin_start_time:  form.checkinStartTime  || null,
        checkin_end_time:    form.checkinEndTime     || null,
        checkout_time:       form.checkoutTime       || null,
        cancellation_policy: form.cancellationPolicy || 'flexible',
        pet_policy:          form.petPolicy          || 'no_pets',
        smoking_policy:      form.smokingPolicy      || 'no_smoking',
        quiet_hours_start:   form.quietHoursStart    || null,
        quiet_hours_end:     form.quietHoursEnd      || null,
        security_deposit:    form.securityDeposit    ? parseFloat(form.securityDeposit)  : 0,
        min_booking_age:     form.minBookingAge      ? parseInt(form.minBookingAge)      : 18,
        extra_guest_fee:     form.extraGuestFee      ? parseFloat(form.extraGuestFee)    : 0,
      }

      let listing, listingError
      if (draftId) {
        ;({ data: listing, error: listingError } = await supabase
          .from('listings').update(listingPayload).eq('id', draftId).select().single())
      } else {
        ;({ data: listing, error: listingError } = await supabase
          .from('listings').insert({ ...listingPayload, rating: 0, review_count: 0, images: [] }).select().single())
      }
      if (listingError) throw listingError

      const listingId = listing.id
      const uploadedImages = []
      for (const file of form.photos) {
        const ext = file.name.split('.').pop()
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const path = `listings/${listingId}/${filename}`
        const { error: uploadErr } = await supabase.storage.from('property-images').upload(path, file)
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from('property-images').getPublicUrl(path)
          uploadedImages.push({ path, url: publicUrl })
        }
      }

      const existingUrls = form.photoUrls.filter(u => !u.startsWith('blob:'))
      const allImageUrls = [...existingUrls, ...uploadedImages.map(i => i.url)]
      if (allImageUrls.length > 0 || editMode) {
        await supabase.from('listings').update({ images: allImageUrls }).eq('id', listingId)
      }
      if (uploadedImages.length > 0) {
        await supabase.from('listing_images').insert(
          uploadedImages.map((img, i) => ({
            listing_id:  listingId,
            path:        img.path,
            is_cover:    existingUrls.length === 0 && i === 0,
            sort_order:  existingUrls.length + i,
          }))
        )
      }

      // Save rooms for hotel listings
      if (hostType === 'hotel' && roomTypes.length > 0) {
        await saveRooms(listingId)
      }

      if (editMode) {
        if (initialStatus === 'changes_requested') {
          await fetch(`/api/host/listings/${listingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'resubmit' }),
          })
        }
      } else {
        const { data: profile } = await supabase
          .from('users').select('full_name, email').eq('id', user.id).single()
        await supabase.from('listing_approvals').insert({
          listing_id:    listingId,
          host_id:       user.id,
          host_name:     profile?.full_name || '',
          host_email:    profile?.email || user.email,
          listing_title: form.title,
          status:        'pending',
        })
        await supabase.from('users').update({ listing_status: 'pending' }).eq('id', user.id)
      }

      await supabase.from('beta_acknowledgments').insert({
        user_id:            user.id,
        listing_id:         listingId,
        beta_terms_version: BETA_TERMS_VERSION,
      })

      setSubmitted(true)
    } catch (err) {
      const msg = err?.message || err?.details || 'Something went wrong. Please try again.'
      alert(msg)
      console.error('[handleSubmit]', msg, err)
    }
    setSubmitting(false)
  }

  const types = hostType === 'private_stay' ? PRIVATE_TYPES : HOTEL_TYPES
  const steps = hostType === 'hotel' ? HOTEL_STEPS : STEPS
  const totalSteps = steps.length
  const reviewStep    = totalSteps       // last step
  const pricingStep   = totalSteps - 1
  const photosStep    = totalSteps - 2
  const amenitiesStep = totalSteps - 3
  const policiesStep  = totalSteps - 4
  const basicsStep    = hostType === 'hotel' ? 4 : 3
  const roomTypesStep = hostType === 'hotel' ? 3 : null
  const progressPct = Math.round(((step - 1) / (totalSteps - 1)) * 100)

  // ──────────────── SUCCESS SCREEN ────────────────
  if (submitted) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Syne:wght@400;500;600;700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Syne',sans-serif; background:#faf6f0; color:#3a1f0d; min-height:100vh; display:flex; align-items:center; justify-content:center; }
      `}</style>
      <div style={{ textAlign: 'center', padding: '48px 24px', maxWidth: '520px', margin: '0 auto' }}>
        <div style={{ width: '80px', height: '80px', background: editMode ? '#dcfce7' : 'rgba(232,98,42,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '2rem' }}>
          {editMode ? '✅' : '🎉'}
        </div>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.2rem', fontWeight: 700, marginBottom: '12px', color: '#3a1f0d' }}>
          {editMode ? 'Changes submitted!' : "You're almost live!"}
        </div>
        <div style={{ fontSize: '0.92rem', color: '#7a5c3a', lineHeight: 1.8, marginBottom: '32px' }}>
          {editMode
            ? <>Your changes to <strong style={{ color: '#3a1f0d' }}>"{form.title}"</strong> have been submitted. Our team will review them shortly.</>
            : <>Your listing <strong style={{ color: '#3a1f0d' }}>"{form.title}"</strong> has been submitted for review. We'll get back to you within 24 hours.</>
          }
        </div>
        <a href="/host/dashboard" style={{ background: '#e8622a', color: 'white', padding: '14px 36px', borderRadius: '100px', fontWeight: 700, fontSize: '0.94rem', textDecoration: 'none', display: 'inline-block', fontFamily: 'Syne, sans-serif' }}>
          Back to dashboard →
        </a>
      </div>
    </>
  )

  // ──────────────── MAIN FORM ────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Syne:wght@400;500;600;700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        :root {
          --cream: #faf6f0;
          --warm: #f5ede0;
          --orange: #e8622a;
          --brown: #3a1f0d;
          --mid: #7a5c3a;
          --border: #e8ddd0;
          --card: #ffffff;
        }
        body { font-family:'Syne',sans-serif; background:var(--cream); color:var(--brown); }

        /* TOPBAR */
        .topbar { display:flex; align-items:center; justify-content:space-between; padding:0 32px; height:62px; background:white; border-bottom:1px solid var(--border); position:sticky; top:0; z-index:100; }
        .logo { font-family:'Cormorant Garamond',serif; font-size:1.3rem; font-weight:700; color:var(--brown); text-decoration:none; }
        .logo em { color:var(--orange); font-style:normal; }
        .topbar-right { display:flex; align-items:center; gap:12px; }
        .save-btn { background:none; border:1.5px solid var(--border); color:var(--mid); padding:7px 16px; border-radius:8px; font-size:0.8rem; cursor:pointer; font-family:'Syne',sans-serif; font-weight:600; transition:all 0.18s; }
        .save-btn:hover:not(:disabled) { border-color:var(--mid); color:var(--brown); }
        .save-btn:disabled { opacity:0.55; cursor:not-allowed; }
        .preview-btn { background:none; border:1.5px solid rgba(232,98,42,0.4); color:var(--orange); padding:7px 16px; border-radius:8px; font-size:0.8rem; cursor:pointer; font-family:'Syne',sans-serif; font-weight:600; transition:all 0.18s; }
        .preview-btn:hover:not(:disabled) { border-color:var(--orange); background:rgba(232,98,42,0.05); }
        .exit-btn { background:var(--orange); color:white; border:none; padding:7px 18px; border-radius:8px; font-size:0.8rem; font-weight:700; cursor:pointer; font-family:'Syne',sans-serif; text-decoration:none; display:inline-block; }
        .exit-btn:hover { background:#d45520; }

        /* LAYOUT */
        .layout { display:flex; min-height:calc(100vh - 62px); }

        /* SIDEBAR */
        .sidebar { width:256px; background:white; border-right:1px solid var(--border); padding:28px 20px 20px; position:sticky; top:62px; height:calc(100vh - 62px); overflow-y:auto; flex-shrink:0; }

        /* HOST TYPE TABS */
        .host-tabs { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:28px; }
        .host-tab { background:var(--warm); border:1.5px solid var(--border); border-radius:10px; padding:10px 8px; text-align:center; cursor:pointer; transition:all 0.18s; }
        .host-tab.active { background:var(--orange); border-color:var(--orange); }
        .host-tab-icon { font-size:1.1rem; margin-bottom:3px; }
        .host-tab-label { font-size:0.7rem; font-weight:700; color:var(--mid); }
        .host-tab.active .host-tab-label { color:white; }

        /* PROGRESS */
        .progress-label { font-size:0.6rem; font-weight:700; color:#b8a898; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:10px; }
        .step-item { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; margin-bottom:2px; cursor:default; transition:background 0.15s; }
        .step-item.clickable { cursor:pointer; }
        .step-item.clickable:hover { background:var(--warm); }
        .step-item.active { background:rgba(232,98,42,0.08); }
        .step-num { width:22px; height:22px; border-radius:50%; border:1.5px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:0.65rem; font-weight:700; color:#b8a898; flex-shrink:0; transition:all 0.18s; }
        .step-num.done { background:#e8622a; border-color:#e8622a; color:white; }
        .step-num.active { border-color:var(--orange); color:var(--orange); }
        .step-label { font-size:0.78rem; color:#b8a898; font-weight:500; }
        .step-label.active { color:var(--brown); font-weight:700; }
        .step-label.done { color:var(--mid); }

        /* CONTENT */
        .content { flex:1; padding:40px 52px 100px; max-width:820px; }
        .step-badge { display:inline-flex; align-items:center; gap:6px; background:rgba(232,98,42,0.08); border:1px solid rgba(232,98,42,0.18); border-radius:100px; padding:4px 14px; font-size:0.7rem; font-weight:700; color:var(--orange); margin-bottom:18px; letter-spacing:0.04em; }
        .content h1 { font-family:'Cormorant Garamond',serif; font-size:2rem; font-weight:700; margin-bottom:8px; color:var(--brown); }
        .content .subtitle { font-size:0.88rem; color:var(--mid); line-height:1.75; margin-bottom:28px; }
        .divider { height:1px; background:var(--border); margin-bottom:28px; }
        .section-title { font-size:1rem; font-weight:700; margin-bottom:4px; color:var(--brown); }
        .section-sub { font-size:0.8rem; color:var(--mid); margin-bottom:18px; }

        /* TYPE GRID */
        .type-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:20px; }
        .type-card { background:white; border:2px solid var(--border); border-radius:12px; padding:18px 14px; cursor:pointer; transition:all 0.18s; text-align:center; }
        .type-card:hover { border-color:rgba(232,98,42,0.4); background:rgba(232,98,42,0.03); }
        .type-card.selected { border-color:var(--orange); background:rgba(232,98,42,0.06); }
        .type-icon { font-size:1.7rem; margin-bottom:8px; }
        .type-label { font-size:0.84rem; font-weight:700; margin-bottom:3px; color:var(--brown); }
        .type-sub { font-size:0.7rem; color:var(--mid); }

        /* FORM FIELDS */
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:16px; }
        .form-group { margin-bottom:14px; }
        .form-label { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--mid); margin-bottom:6px; display:block; }
        .form-input { width:100%; background:white; border:1.5px solid var(--border); border-radius:10px; padding:11px 14px; font-size:0.86rem; font-family:'Syne',sans-serif; outline:none; color:var(--brown); transition:border-color 0.18s; }
        .form-input:focus { border-color:var(--orange); }
        .form-textarea { width:100%; background:white; border:1.5px solid var(--border); border-radius:10px; padding:11px 14px; font-size:0.86rem; font-family:'Syne',sans-serif; outline:none; color:var(--brown); resize:vertical; min-height:100px; transition:border-color 0.18s; }
        .form-textarea:focus { border-color:var(--orange); }
        .form-select { width:100%; background:white; border:1.5px solid var(--border); border-radius:10px; padding:11px 14px; font-size:0.86rem; font-family:'Syne',sans-serif; outline:none; color:var(--brown); }

        /* COUNTER */
        .counter-row { display:flex; align-items:center; justify-content:space-between; padding:13px 0; border-bottom:1px solid var(--border); }
        .counter-label { font-size:0.86rem; font-weight:600; color:var(--brown); }
        .counter-sub { font-size:0.72rem; color:var(--mid); }
        .counter-ctrl { display:flex; align-items:center; gap:14px; }
        .counter-btn { width:30px; height:30px; border-radius:50%; border:1.5px solid var(--border); background:white; color:var(--brown); font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; font-family:'Syne',sans-serif; }
        .counter-btn:hover { border-color:var(--orange); color:var(--orange); }
        .counter-val { font-size:0.92rem; font-weight:700; min-width:20px; text-align:center; color:var(--brown); }

        /* AMENITIES */
        .amenities-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:20px; }
        .amenity-card { background:white; border:1.5px solid var(--border); border-radius:10px; padding:12px 8px; cursor:pointer; transition:all 0.15s; text-align:center; }
        .amenity-card:hover { border-color:rgba(232,98,42,0.35); }
        .amenity-card.selected { border-color:var(--orange); background:rgba(232,98,42,0.06); }
        .amenity-icon { font-size:1.15rem; margin-bottom:5px; }
        .amenity-label { font-size:0.68rem; font-weight:600; color:var(--mid); }
        .amenity-card.selected .amenity-label { color:var(--brown); }

        /* PHOTOS */
        .photo-upload-area { border:2px dashed var(--border); border-radius:14px; padding:40px; text-align:center; cursor:pointer; transition:all 0.2s; margin-bottom:18px; background:white; }
        .photo-upload-area:hover { border-color:rgba(232,98,42,0.45); background:rgba(232,98,42,0.02); }
        .upload-icon { font-size:2.2rem; margin-bottom:10px; }
        .upload-title { font-size:0.94rem; font-weight:700; margin-bottom:4px; color:var(--brown); }
        .upload-sub { font-size:0.76rem; color:var(--mid); }
        .photos-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:18px; }
        .photo-thumb { position:relative; border-radius:10px; overflow:hidden; height:96px; }
        .photo-thumb img { width:100%; height:100%; object-fit:cover; }
        .photo-remove { position:absolute; top:5px; right:5px; width:22px; height:22px; border-radius:50%; background:rgba(58,31,13,0.7); border:none; color:white; cursor:pointer; font-size:0.76rem; display:flex; align-items:center; justify-content:center; }

        /* PRICING */
        .price-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
        .price-symbol { font-size:1.2rem; font-weight:700; color:var(--mid); }
        .price-input { flex:1; background:white; border:1.5px solid var(--border); border-radius:10px; padding:12px 14px; font-size:1.1rem; font-weight:700; font-family:'Syne',sans-serif; outline:none; color:var(--brown); transition:border-color 0.18s; }
        .price-input:focus { border-color:var(--orange); }
        .toggle-row { display:flex; align-items:center; justify-content:space-between; padding:14px 0; border-bottom:1px solid var(--border); }
        .toggle-info h4 { font-size:0.9rem; font-weight:700; margin-bottom:2px; color:var(--brown); }
        .toggle-info p { font-size:0.74rem; color:var(--mid); }
        .toggle-switch { width:42px; height:22px; border-radius:100px; border:none; cursor:pointer; position:relative; transition:background 0.2s; flex-shrink:0; }
        .toggle-knob { position:absolute; top:2px; width:18px; height:18px; border-radius:50%; background:white; transition:transform 0.2s; box-shadow:0 1px 4px rgba(0,0,0,0.15); }

        /* REVIEW SECTIONS */
        .review-section { background:white; border:1px solid var(--border); border-radius:12px; padding:18px 20px; margin-bottom:14px; }
        .review-section h3 { font-size:0.72rem; font-weight:700; color:#b8a898; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:12px; }
        .review-row { display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid rgba(232,213,200,0.4); font-size:0.82rem; }
        .review-row:last-child { border-bottom:none; }
        .review-key { color:var(--mid); }
        .review-val { color:var(--brown); font-weight:600; }

        /* HINT */
        .hint { background:rgba(245,237,224,0.6); border:1px solid var(--border); border-radius:10px; padding:12px 14px; display:flex; align-items:flex-start; gap:10px; margin-top:18px; }
        .hint-icon { font-size:0.95rem; flex-shrink:0; margin-top:1px; }
        .hint-text { font-size:0.78rem; color:var(--mid); line-height:1.6; }
        .hint-text strong { color:var(--brown); }

        /* ROOM BUILDER */
        .room-builder { border:1.5px solid var(--border); border-radius:14px; overflow:hidden; margin-bottom:16px; background:white; }
        .room-builder-header { background:var(--warm); padding:14px 18px; display:flex; align-items:center; justify-content:space-between; }
        .room-builder-title { font-weight:700; font-size:0.9rem; color:var(--brown); }
        .room-builder-remove { background:none; border:none; color:var(--mid); cursor:pointer; font-size:0.8rem; font-family:'Syne',sans-serif; font-weight:600; }
        .room-builder-body { padding:18px; }

        /* POLICY FIELDS */
        .policy-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
        .policy-select { width:100%; background:white; border:1.5px solid var(--border); border-radius:10px; padding:11px 14px; font-size:0.86rem; font-family:'Syne',sans-serif; outline:none; color:var(--brown); transition:border-color 0.18s; }
        .policy-select:focus { border-color:var(--orange); }
        .policy-time-row { display:grid; grid-template-columns:1fr auto 1fr; gap:8px; align-items:center; margin-bottom:14px; }
        .time-sep { font-size:0.8rem; color:var(--mid); text-align:center; margin-top:24px; }

        /* VERIFICATION */
        .verify-card { background:white; border:1.5px solid var(--border); border-radius:12px; padding:16px 18px; display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .verify-left { display:flex; align-items:center; gap:12px; }
        .verify-icon { width:40px; height:40px; border-radius:10px; background:var(--warm); display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; }
        .verify-title { font-size:0.88rem; font-weight:700; margin-bottom:2px; color:var(--brown); }
        .verify-sub { font-size:0.72rem; color:var(--mid); }
        .verify-done { font-size:0.78rem; font-weight:700; color:#16a34a; }
        .verify-btn { background:var(--warm); border:1.5px solid var(--border); color:var(--brown); padding:7px 16px; border-radius:8px; font-size:0.78rem; font-weight:700; cursor:pointer; font-family:'Syne',sans-serif; transition:all 0.15s; }
        .verify-btn:hover { border-color:var(--orange); color:var(--orange); }

        /* BOTTOM BAR */
        .bottom-bar { position:fixed; bottom:0; left:256px; right:0; background:white; border-top:1px solid var(--border); padding:14px 52px; display:flex; justify-content:space-between; align-items:center; z-index:90; }
        .progress-bar-wrap { flex:1; max-width:320px; }
        .progress-bar-label { font-size:0.68rem; font-weight:700; color:var(--mid); margin-bottom:5px; letter-spacing:0.04em; }
        .progress-bar-track { height:4px; background:var(--warm); border-radius:4px; overflow:hidden; }
        .progress-bar-fill { height:100%; background:var(--orange); border-radius:4px; transition:width 0.35s; }
        .back-btn { background:none; border:1.5px solid var(--border); color:var(--mid); padding:10px 24px; border-radius:100px; font-size:0.86rem; font-weight:700; cursor:pointer; font-family:'Syne',sans-serif; transition:all 0.18s; }
        .back-btn:hover { border-color:var(--mid); color:var(--brown); }
        .next-btn { background:var(--orange); color:white; border:none; padding:10px 28px; border-radius:100px; font-size:0.86rem; font-weight:700; cursor:pointer; font-family:'Syne',sans-serif; transition:background 0.18s; }
        .next-btn:hover:not(:disabled) { background:#d45520; }
        .next-btn:disabled { opacity:0.45; cursor:not-allowed; }
        .btn-group { display:flex; align-items:center; gap:12px; }

        @media(max-width:900px) { .sidebar{display:none;} .bottom-bar{left:0;} .type-grid{grid-template-columns:repeat(2,1fr);} .amenities-grid{grid-template-columns:repeat(2,1fr);} .form-grid{grid-template-columns:1fr;} .content{padding:28px 24px 100px;} }
      `}</style>

      {/* TOPBAR */}
      <div className="topbar">
        <a href="/home" className="logo">Snap<em>Reserve™</em></a>
        <div className="topbar-right">
          <button className="save-btn" onClick={handleSaveDraft} disabled={saving}>
            {draftSaved ? '✓ Saved' : saving ? 'Saving…' : 'Save draft'}
          </button>
          <button className="preview-btn" onClick={handlePreview} disabled={previewing}>
            {previewing ? 'Opening…' : '👁 Preview'}
          </button>
          <a href="/host/dashboard" className="exit-btn">Exit</a>
        </div>
      </div>

      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="host-tabs">
            <div className={`host-tab ${hostType === 'private_stay' ? 'active' : ''}`} onClick={() => { setHostType('private_stay'); setStep(1) }}>
              <div className="host-tab-icon">🏠</div>
              <div className="host-tab-label">Private Stay</div>
            </div>
            <div className={`host-tab ${hostType === 'hotel' ? 'active' : ''}`} onClick={() => { setHostType('hotel'); setStep(1) }}>
              <div className="host-tab-icon">🏨</div>
              <div className="host-tab-label">Hotel</div>
            </div>
          </div>

          <div className="progress-label">Your progress</div>
          {steps.map(s => (
            <div
              key={s.id}
              className={`step-item ${step === s.id ? 'active' : ''} ${s.id < step ? 'clickable' : ''}`}
              onClick={() => s.id < step && setStep(s.id)}
            >
              <div className={`step-num ${s.id < step ? 'done' : s.id === step ? 'active' : ''}`}>
                {s.id < step ? '✓' : s.id}
              </div>
              <div className={`step-label ${s.id === step ? 'active' : s.id < step ? 'done' : ''}`}>{s.label}</div>
            </div>
          ))}
        </aside>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="content">
            <div className="step-badge">
              {hostType === 'private_stay' ? '🏠 Private Stay Host' : '🏨 Hotel Host'}
            </div>
            <h1>{editMode ? 'Edit your listing' : 'List your space on SnapReserve™™'}</h1>
            <p className="subtitle">{editMode ? 'Update your listing details, then submit your changes for review.' : hostType === 'hotel' ? 'List your hotel and start receiving bookings.' : 'Earn money from your space. Takes about 10 minutes to go live.'}</p>

            {/* Edit mode: change request notes */}
            {editMode && changeNotes.length > 0 && (
              <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', padding: '14px 16px', marginTop: '4px', marginBottom: '8px' }}>
                <div style={{ fontWeight: 700, color: '#3b82f6', fontSize: '0.82rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🔄 Admin requested the following changes
                </div>
                {changeNotes.map((cr, i) => (
                  <div key={i} style={{ fontSize: '0.82rem', color: 'var(--brown)', lineHeight: 1.65, paddingTop: i > 0 ? '8px' : 0, borderTop: i > 0 ? '1px solid var(--border)' : 'none', marginTop: i > 0 ? '8px' : 0 }}>
                    {cr.notes}
                    <div style={{ fontSize: '0.68rem', color: 'var(--mid)', marginTop: '2px' }}>
                      {new Date(cr.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="divider" />

            {/* ── STEP 1: Property Type ── */}
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

            {/* ── STEP 2: Location ── */}
            {step === 2 && (
              <div>
                <div className="section-title">Where is your property located?</div>
                <div className="section-sub">Your exact address is only shared with confirmed guests.</div>
                <div className="form-group">
                  <label className="form-label">Street address</label>
                  <input className="form-input" placeholder="123 Main Street" value={form.address} onChange={e => update('address', e.target.value)} />
                </div>
                <div className="form-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">City</label>
                    <input className="form-input" placeholder="City" value={form.city} onChange={e => update('city', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">State</label>
                    <select className="form-select" value={form.state} onChange={e => update('state', e.target.value)}>
                      <option value="">Select state</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Room Types (hotel only) ── */}
            {hostType === 'hotel' && step === 3 && (
              <div>
                <div className="section-title">Define your room types</div>
                <div className="section-sub">Add the different room categories your hotel offers. You can edit room details from your dashboard after publishing.</div>

                {roomTypes.map((room, idx) => (
                  <div key={idx} className="room-builder">
                    <div className="room-builder-header">
                      <div className="room-builder-title">Room {idx + 1}</div>
                      <button className="room-builder-remove" onClick={() => setRoomTypes(rt => rt.filter((_, i) => i !== idx))}>Remove</button>
                    </div>
                    <div className="room-builder-body">
                      <div className="form-grid" style={{ marginBottom: '12px' }}>
                        <div>
                          <label className="form-label">Room name</label>
                          <input className="form-input" placeholder="e.g. Deluxe King Suite" value={room.name || ''} onChange={e => setRoomTypes(rt => rt.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))} />
                        </div>
                        <div>
                          <label className="form-label">Tier</label>
                          <select className="form-select" value={room.tier || 'Standard'} onChange={e => setRoomTypes(rt => rt.map((r, i) => i === idx ? { ...r, tier: e.target.value } : r))}>
                            <option value="Standard">Standard</option>
                            <option value="Deluxe">Deluxe</option>
                            <option value="Premium">Premium</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Price / night (USD)</label>
                          <input className="form-input" type="number" placeholder="0.00" value={room.price || ''} onChange={e => setRoomTypes(rt => rt.map((r, i) => i === idx ? { ...r, price: e.target.value } : r))} />
                        </div>
                        <div>
                          <label className="form-label">Units available</label>
                          <input className="form-input" type="number" placeholder="1" value={room.units || ''} onChange={e => setRoomTypes(rt => rt.map((r, i) => i === idx ? { ...r, units: e.target.value } : r))} />
                        </div>
                        <div>
                          <label className="form-label">Bed type</label>
                          <input className="form-input" placeholder="e.g. King, Twin, Double" value={room.bedType || ''} onChange={e => setRoomTypes(rt => rt.map((r, i) => i === idx ? { ...r, bedType: e.target.value } : r))} />
                        </div>
                        <div>
                          <label className="form-label">Max guests</label>
                          <input className="form-input" type="number" placeholder="2" value={room.maxGuests || ''} onChange={e => setRoomTypes(rt => rt.map((r, i) => i === idx ? { ...r, maxGuests: e.target.value } : r))} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setRoomTypes(rt => [...rt, { name: '', tier: 'Standard', price: '', units: '1', bedType: '', maxGuests: '2' }])}
                  style={{ width: '100%', background: 'white', border: '2px dashed var(--border)', borderRadius: '12px', padding: '14px', font: '700 0.86rem/1 Syne, sans-serif', color: 'var(--mid)', cursor: 'pointer', transition: 'all 0.18s' }}
                  onMouseOver={e => { e.target.style.borderColor = 'var(--orange)'; e.target.style.color = 'var(--orange)' }}
                  onMouseOut={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--mid)' }}
                >
                  + Add room type
                </button>

                <div className="hint" style={{ marginTop: '16px' }}>
                  <div className="hint-icon">💡</div>
                  <div className="hint-text"><strong>No rooms yet?</strong> That's fine — you can add and manage room types from your host dashboard after your listing is approved.</div>
                </div>
              </div>
            )}

            {/* ── STEP: Basics (step 3 for private stay, step 4 for hotel) ── */}
            {step === basicsStep && (
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
                <div style={{ marginTop: '20px' }}>
                  <div className="section-title" style={{ marginBottom: '4px' }}>Capacity</div>
                  <div className="section-sub">How many guests can stay?</div>
                  {[
                    { label: 'Guests',    sub: 'Maximum guests allowed', key: 'guests' },
                    { label: 'Bedrooms',  sub: 'Number of bedrooms',      key: 'bedrooms' },
                    { label: 'Beds',      sub: 'Total number of beds',    key: 'beds' },
                    { label: 'Bathrooms', sub: 'Number of bathrooms',     key: 'bathrooms' },
                  ].map(item => (
                    <div key={item.key} className="counter-row">
                      <div>
                        <div className="counter-label">{item.label}</div>
                        <div className="counter-sub">{item.sub}</div>
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

            {/* ── STEP: Policies ── */}
            {step === policiesStep && (
              <div>
                <div className="section-title">Set your property policies</div>
                <div className="section-sub">These are shown to guests before booking and help avoid disputes.</div>

                {/* Check-in / Checkout times */}
                <div style={{ marginBottom: '24px' }}>
                  <div className="section-title" style={{ fontSize: '0.88rem', marginBottom: '10px' }}>Check-in & checkout</div>
                  <div className="policy-row">
                    <div>
                      <label className="form-label">Check-in start time</label>
                      <input className="form-input" type="time" value={form.checkinStartTime} onChange={e => update('checkinStartTime', e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Check-in end time <span style={{ color: 'var(--mid)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                      <input className="form-input" type="time" value={form.checkinEndTime} onChange={e => update('checkinEndTime', e.target.value)} />
                    </div>
                  </div>
                  <div style={{ maxWidth: '50%', paddingRight: '7px' }}>
                    <label className="form-label">Checkout time</label>
                    <input className="form-input" type="time" value={form.checkoutTime} onChange={e => update('checkoutTime', e.target.value)} />
                  </div>
                </div>

                {/* Cancellation Policy */}
                <div className="form-group">
                  <label className="form-label">Cancellation policy</label>
                  <select className="policy-select" value={form.cancellationPolicy} onChange={e => update('cancellationPolicy', e.target.value)}>
                    <option value="flexible">Flexible — full refund up to 24 hours before check-in</option>
                    <option value="moderate">Moderate — full refund up to 5 days before check-in</option>
                    <option value="strict">Strict — full refund up to 7–14 days before check-in</option>
                    <option value="non_refundable">Non-refundable — no refunds after booking</option>
                  </select>
                </div>

                {/* Pet & Smoking Policy */}
                <div className="policy-row">
                  <div>
                    <label className="form-label">Pet policy</label>
                    <select className="policy-select" value={form.petPolicy} onChange={e => update('petPolicy', e.target.value)}>
                      <option value="pets_allowed">Pets allowed</option>
                      <option value="small_pets">Small pets only</option>
                      <option value="no_pets">No pets</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Smoking policy</label>
                    <select className="policy-select" value={form.smokingPolicy} onChange={e => update('smokingPolicy', e.target.value)}>
                      <option value="smoking_allowed">Smoking allowed</option>
                      <option value="outside_only">Outside only</option>
                      <option value="no_smoking">No smoking</option>
                    </select>
                  </div>
                </div>

                {/* Quiet Hours */}
                <div style={{ marginBottom: '14px' }}>
                  <label className="form-label">Quiet hours <span style={{ color: 'var(--mid)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center' }}>
                    <input className="form-input" type="time" placeholder="Start" value={form.quietHoursStart} onChange={e => update('quietHoursStart', e.target.value)} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--mid)', textAlign: 'center' }}>to</span>
                    <input className="form-input" type="time" placeholder="End" value={form.quietHoursEnd} onChange={e => update('quietHoursEnd', e.target.value)} />
                  </div>
                </div>

                {/* Financial policies */}
                <div className="policy-row">
                  <div>
                    <label className="form-label">Security deposit (USD) <span style={{ color: 'var(--mid)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <div className="price-row" style={{ marginBottom: 0 }}>
                      <div className="price-symbol" style={{ fontSize: '0.9rem' }}>$</div>
                      <input className="form-input" type="number" min="0" placeholder="0.00" value={form.securityDeposit} onChange={e => update('securityDeposit', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Extra guest fee (USD) <span style={{ color: 'var(--mid)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(per person/night)</span></label>
                    <div className="price-row" style={{ marginBottom: 0 }}>
                      <div className="price-symbol" style={{ fontSize: '0.9rem' }}>$</div>
                      <input className="form-input" type="number" min="0" placeholder="0.00" value={form.extraGuestFee} onChange={e => update('extraGuestFee', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Min booking age */}
                <div style={{ maxWidth: '50%', paddingRight: '7px', marginBottom: '14px' }}>
                  <label className="form-label">Minimum booking age</label>
                  <input className="form-input" type="number" min="18" max="99" placeholder="18" value={form.minBookingAge} onChange={e => update('minBookingAge', e.target.value)} />
                </div>

                {/* House rules */}
                <div className="form-group">
                  <label className="form-label">House rules</label>
                  <textarea className="form-textarea" rows={4} placeholder="e.g. No parties or events. Quiet hours 10 PM – 7 AM. No shoes inside. Check-in is self-service via lockbox…" value={form.rules} onChange={e => update('rules', e.target.value)} />
                </div>
              </div>
            )}

            {/* ── STEP: Amenities ── */}
            {step === amenitiesStep && (
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
              </div>
            )}

            {/* ── STEP: Photos ── */}
            {step === photosStep && (
              <div>
                <div className="section-title">Add photos of your property</div>
                <div className="section-sub">Great photos = more bookings. Add at least 3, up to 20.</div>
                <div className="photo-upload-area" onClick={() => fileInputRef.current?.click()}>
                  <div className="upload-icon">📸</div>
                  <div className="upload-title">Click to upload photos</div>
                  <div className="upload-sub">JPG, PNG, WEBP — up to 10MB each</div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoUpload} />
                </div>
                {form.photoUrls.length > 0 && (
                  <div className="photos-grid">
                    {form.photoUrls.map((url, i) => (
                      <div key={i} className="photo-thumb">
                        <img src={url} alt={`Photo ${i + 1}`} />
                        <button className="photo-remove" onClick={() => removePhoto(i)}>×</button>
                        {i === 0 && <div style={{ position: 'absolute', bottom: '5px', left: '5px', background: 'var(--orange)', color: 'white', fontSize: '0.58rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px' }}>Cover</div>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="hint">
                  <div className="hint-icon">💡</div>
                  <div className="hint-text"><strong>Pro tip:</strong> Listings with 8+ photos get 3× more bookings. Include the exterior, every room, kitchen, bathrooms, and any outdoor areas.</div>
                </div>
              </div>
            )}

            {/* ── STEP: Pricing ── */}
            {step === pricingStep && (
              <div>
                <div className="section-title">Set your pricing</div>
                <div className="section-sub">You can always adjust these from your dashboard.</div>
                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label">Nightly rate (USD)</label>
                  <div className="price-row">
                    <div className="price-symbol">$</div>
                    <input className="price-input" type="number" placeholder="0.00" value={form.pricePerNight} onChange={e => update('pricePerNight', e.target.value)} />
                    <div style={{ fontSize: '0.8rem', color: 'var(--mid)', whiteSpace: 'nowrap' }}>per night</div>
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label">Cleaning fee (USD)</label>
                  <div className="price-row">
                    <div className="price-symbol">$</div>
                    <input className="price-input" type="number" placeholder="0.00" value={form.cleaningFee} onChange={e => update('cleaningFee', e.target.value)} />
                    <div style={{ fontSize: '0.8rem', color: 'var(--mid)', whiteSpace: 'nowrap' }}>one-time</div>
                  </div>
                </div>
                <div className="counter-row">
                  <div>
                    <div className="counter-label">Minimum stay</div>
                    <div className="counter-sub">Minimum number of nights</div>
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
                    style={{ background: form.instantBook ? 'var(--orange)' : 'var(--border)' }}
                    onClick={() => update('instantBook', !form.instantBook)}
                  >
                    <div className="toggle-knob" style={{ transform: form.instantBook ? 'translateX(20px)' : 'translateX(2px)' }} />
                  </button>
                </div>
                {form.pricePerNight && (() => {
                  const rate    = parseFloat(form.pricePerNight) || 0
                  const cFee    = parseFloat(form.cleaningFee)   || 0
                  const nights  = Math.max(1, form.minNights || 1)
                  // Sample calculation uses minimum stay — guests may book more nights
                  const total   = rate * nights + cFee
                  const pf      = Math.round(total * 0.08 * 100) / 100
                  const payout  = Math.round((total - pf - 1) * 100) / 100
                  // Per-night payout (for longer bookings): no fixed fee applied per-night
                  const payoutPerNight = Math.round((rate * (1 - 0.08)) * 100) / 100
                  return (
                    <div style={{ background: 'rgba(232,98,42,0.05)', border: '1px solid rgba(232,98,42,0.18)', borderRadius: '12px', padding: '16px 20px', marginTop: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Sample fee breakdown
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--mid)', background: 'rgba(232,98,42,0.1)', borderRadius: 20, padding: '2px 8px' }}>
                          based on minimum stay · {nights} night{nights !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--mid)', marginBottom: 5 }}>
                        <span>${rate.toFixed(2)} × {nights} night{nights !== 1 ? 's' : ''}{cFee > 0 ? ` + $${cFee.toFixed(2)} cleaning` : ''}</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#ef4444', marginBottom: 2 }}>
                        <span>Platform fee (7% of ${total.toFixed(2)})</span><span>−${pf.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#ef4444', marginBottom: 5 }}>
                        <span>Fixed fee per booking</span><span>−$1.00</span>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(232,98,42,0.2)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', fontWeight: 700, color: 'var(--orange)' }}>
                        <span>Your payout</span><span>${Math.max(0, payout).toFixed(2)}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--mid)', marginTop: 10, padding: '8px 10px', background: 'rgba(232,98,42,0.04)', borderRadius: 8, lineHeight: 1.6 }}>
                        Guests can book more than the minimum stay. The $1 fixed fee applies once per booking regardless of length.
                        Fees are not shown to guests.
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#a07050', marginTop: 8, lineHeight: 1.6 }}>
                        Hosts are responsible for complying with local and state tax regulations related to their bookings. SnapReserve™ does not collect or remit taxes on behalf of hosts at this time.
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* ── STEP: Review & Publish ── */}
            {step === reviewStep && (
              <div>
                <div className="section-title">Review your listing</div>
                <div className="section-sub">Check everything looks right before submitting for approval.</div>

                <div className="review-section">
                  <h3>Property details</h3>
                  <div className="review-row"><span className="review-key">Type</span><span className="review-val">{hostType === 'hotel' ? '🏨 Hotel' : '🏠 Private Stay'}</span></div>
                  <div className="review-row"><span className="review-key">Space type</span><span className="review-val">{types.find(t => t.id === form.propertyType)?.label || '—'}</span></div>
                  <div className="review-row"><span className="review-key">Title</span><span className="review-val">{form.title || '—'}</span></div>
                  <div className="review-row"><span className="review-key">Location</span><span className="review-val">{form.city && form.state ? `${form.city}, ${form.state}` : '—'}</span></div>
                  <div className="review-row"><span className="review-key">Capacity</span><span className="review-val">{form.guests} guests · {form.bedrooms} bed{form.bedrooms !== 1 ? 's' : ''} · {form.bathrooms} bath{form.bathrooms !== 1 ? 's' : ''}</span></div>
                </div>

                <div className="review-section">
                  <h3>Pricing</h3>
                  <div className="review-row"><span className="review-key">Nightly rate</span><span className="review-val">${form.pricePerNight || '0'}/night</span></div>
                  <div className="review-row"><span className="review-key">Cleaning fee</span><span className="review-val">${form.cleaningFee || '0'}</span></div>
                  <div className="review-row"><span className="review-key">Min nights</span><span className="review-val">{form.minNights} night{form.minNights !== 1 ? 's' : ''}</span></div>
                  <div className="review-row"><span className="review-key">Instant booking</span><span className="review-val">{form.instantBook ? '⚡ On' : 'Off'}</span></div>
                  <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '10px 14px', marginTop: 10, fontSize: '0.76rem', color: '#9a6060', lineHeight: 1.6 }}>
                    💡 <strong>Platform fee:</strong> SnapReserve™ deducts 7% of each booking total + $1 fixed from your payout.
                    Guests are not charged any extra fees.
                  </div>
                </div>

                <div className="review-section">
                  <h3>Photos & amenities</h3>
                  <div className="review-row"><span className="review-key">Photos</span><span className="review-val">{form.photoUrls.length} uploaded</span></div>
                  <div className="review-row"><span className="review-key">Amenities</span><span className="review-val">{form.amenities.length} selected</span></div>
                </div>

                <div style={{ background: 'rgba(232,98,42,0.04)', border: '1px solid rgba(232,98,42,0.15)', borderRadius: '12px', padding: '18px 20px', marginTop: '8px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--brown)', fontSize: '0.9rem' }}>📋 What happens next</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--mid)', lineHeight: 1.8 }}>
                    After you submit, our team will review your listing within <strong style={{ color: 'var(--brown)' }}>24 hours</strong>. We verify the details, check your photos, and make sure everything meets our quality standards.
                  </div>
                </div>

                {/* Beta Notice */}
                <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '12px', padding: '18px 20px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '1rem' }}>⚡</span>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1rem', fontWeight: 700, color: '#92400e' }}>
                      SnapReserve™™ Beta Notice
                    </div>
                  </div>
                  <ul style={{ paddingLeft: '4px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      'The platform is still under development and may experience occasional bugs or changes.',
                      'Booking, pricing, and availability tools may be updated during the beta period.',
                      'Hosts are responsible for ensuring their property complies with local laws and licensing requirements.',
                      'SnapReserve™ is currently operating as a limited beta release.',
                    ].map((item, i) => (
                      <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: 'var(--mid)', lineHeight: 1.6 }}>
                        <span style={{ color: '#d97706', flexShrink: 0 }}>•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Acknowledgment */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '14px 16px', background: betaAcknowledged ? 'rgba(22,163,74,0.04)' : 'white', border: `1.5px solid ${betaAcknowledged ? 'rgba(22,163,74,0.3)' : 'var(--border)'}`, borderRadius: '10px', transition: 'all 0.2s' }}>
                  <div style={{ position: 'relative', flexShrink: 0, marginTop: '1px' }}>
                    <input
                      type="checkbox"
                      checked={betaAcknowledged}
                      onChange={e => setBetaAcknowledged(e.target.checked)}
                      style={{ position: 'absolute', opacity: 0, width: '20px', height: '20px', cursor: 'pointer', margin: 0 }}
                    />
                    <div style={{ width: '20px', height: '20px', border: `2px solid ${betaAcknowledged ? '#16a34a' : 'var(--border)'}`, borderRadius: '5px', background: betaAcknowledged ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s', pointerEvents: 'none' }}>
                      {betaAcknowledged && <span style={{ color: 'white', fontSize: '0.72rem', fontWeight: 900 }}>✓</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: betaAcknowledged ? 'var(--brown)' : 'var(--mid)', lineHeight: 1.6, fontWeight: betaAcknowledged ? 600 : 400 }}>
                    I acknowledge that SnapReserve™ is currently in beta and agree to the terms above.
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* BOTTOM BAR */}
          <div className="bottom-bar">
            <div className="progress-bar-wrap">
              <div className="progress-bar-label">Step {step} of {totalSteps}</div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            <div className="btn-group">
              {step > 1
                ? <button className="back-btn" onClick={() => setStep(s => s - 1)}>← Back</button>
                : <div />
              }
              {step < totalSteps
                ? <button className="next-btn" onClick={() => setStep(s => s + 1)} disabled={step === 1 && !form.propertyType}>
                    Continue →
                  </button>
                : <button
                    className="next-btn"
                    onClick={handleSubmit}
                    disabled={submitting || !form.title || !form.pricePerNight || !betaAcknowledged}
                    title={!betaAcknowledged ? 'Please acknowledge the Beta Notice above' : ''}
                  >
                    {submitting ? 'Submitting…' : editMode ? '📤 Submit changes →' : '🚀 Submit for review →'}
                  </button>
              }
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function ListPropertyPage() {
  return <Suspense><ListPropertyInner /></Suspense>
}
