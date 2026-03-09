'use client'
import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

function supabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

const STATUS_TABS = [
  { key: 'all',                label: 'All',              icon: '📋' },
  { key: 'pending',            label: 'Pending',          icon: '⏳' },
  { key: 'changes_requested',  label: 'Changes Req.',     icon: '🔄' },
  { key: 'pending_reapproval', label: 'Reapproval',       icon: '🔍' },
  { key: 'approved',           label: 'Approved',         icon: '✅' },
  { key: 'rejected',           label: 'Rejected',         icon: '❌' },
  { key: 'suspended',          label: 'Suspended',        icon: '⛔' },
]

export default function ListingApprovalsPage() {
  const [approvals, setApprovals]               = useState([])
  const [changeRequestsMap, setChangeRequestsMap] = useState({})
  const [loading, setLoading]                   = useState(true)
  const [activeTab, setActiveTab]               = useState('pending')
  const [selected, setSelected]                 = useState(null)
  const [myRole, setMyRole]                     = useState(null)

  // Rejection
  const [rejectionReason, setRejectionReason]   = useState('')

  // Request-changes inline form
  const [requestTarget, setRequestTarget]       = useState(null) // listing_id
  const [requestNotes, setRequestNotes]         = useState('')

  // Edit form
  const [editTarget, setEditTarget]             = useState(null) // listing_id
  const [editFields, setEditFields]             = useState({})

  const [search, setSearch]   = useState('')
  const [acting, setActing]   = useState(false)
  const [toast, setToast]     = useState(null)

  // Images: { [listingId]: { loading: bool, items: [] } }
  const [imagesMap, setImagesMap] = useState({})

  // Follow-ups: { [listingId]: { loading: bool, items: [], unread: number } }
  const [followupsMap, setFollowupsMap] = useState({})
  // Unread counts fetched on load: { [listingId]: number }
  const [unreadCounts, setUnreadCounts] = useState({})

  // Image lightbox
  const [lightbox, setLightbox] = useState(null) // image url

  const loadData = useCallback(async () => {
    setLoading(true)
    const sb = supabase()

    // Fetch current user's admin role
    const { data: { user: me } } = await sb.auth.getUser()
    if (me) {
      const { data: roleRow } = await sb.from('admin_roles').select('role').eq('user_id', me.id).maybeSingle()
      setMyRole(roleRow?.role ?? null)
    }

    const [{ data: listings }, { data: crs }, { data: fus }] = await Promise.all([
      sb.from('listings')
        .select('*, hosts(id, user_id, users(full_name, email))')
        .order('created_at', { ascending: false })
        .limit(300),
      sb.from('listing_change_requests')
        .select('listing_id, notes, admin_email, created_at, status')
        .order('created_at', { ascending: false }),
      fetch('/api/admin/listings/followup-counts').then(r => r.ok ? r.json() : { counts: [] }).then(j => ({ data: j.counts || [] })),
    ])

    // Normalise listings into the shape the UI expects
    const normalised = (listings || []).map(l => ({
      id:               l.id,
      listing_id:       l.id,
      status:           l.status || 'draft',
      listing_title:    l.title || 'Untitled',
      host_name:        l.hosts?.users?.full_name || '—',
      host_email:       l.hosts?.users?.email || '—',
      submitted_at:     l.created_at,
      reviewed_at:      l.updated_at,
      rejection_reason: l.rejection_reason || null,
      listings:         l,
    }))
    setApprovals(normalised)

    const crMap = {}
    ;(crs || []).forEach(cr => {
      if (!crMap[cr.listing_id]) crMap[cr.listing_id] = []
      crMap[cr.listing_id].push(cr)
    })
    setChangeRequestsMap(crMap)

    const ucMap = {}
    ;(fus || []).forEach(({ listing_id, unread }) => { ucMap[listing_id] = unread })
    setUnreadCounts(ucMap)

    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function fetchImages(listingId) {
    if (imagesMap[listingId]) return // already loaded
    setImagesMap(prev => ({ ...prev, [listingId]: { loading: true, items: [] } }))
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/images`)
      const json = await res.json()
      setImagesMap(prev => ({ ...prev, [listingId]: { loading: false, items: json.images || [] } }))
    } catch {
      setImagesMap(prev => ({ ...prev, [listingId]: { loading: false, items: [] } }))
    }
  }

  async function fetchFollowups(listingId) {
    setFollowupsMap(prev => ({ ...prev, [listingId]: { loading: true, items: [] } }))
    try {
      const res  = await fetch(`/api/admin/listings/${listingId}/followups`)
      const json = await res.json()
      setFollowupsMap(prev => ({ ...prev, [listingId]: { loading: false, items: json.followups || [] } }))
      // Clear unread badge now that we've read them
      setUnreadCounts(prev => ({ ...prev, [listingId]: 0 }))
    } catch {
      setFollowupsMap(prev => ({ ...prev, [listingId]: { loading: false, items: [] } }))
    }
  }

  const [editorsPickToggling, setEditorsPickToggling] = useState(null)

  async function doAction(listingId, action, extra = {}) {
    setActing(true)
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: extra.reason, notes: extra.notes }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Action failed')
      const messages = {
        approve:          'Listing approved — host can now go live.',
        reject:           'Listing rejected.',
        request_changes:  'Changes requested. Host has been notified.',
      }
      showToast(messages[action] || 'Done.')
      setSelected(null)
      setRejectionReason('')
      setRequestTarget(null)
      setRequestNotes('')
      await loadData()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setActing(false)
    }
  }

  async function doSetEditorsPick(listingId, value) {
    if (editorsPickToggling === listingId) return
    setEditorsPickToggling(listingId)
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_editors_pick', editors_pick: value }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update')
      showToast(value ? "Editor's Pick enabled" : "Editor's Pick removed")
      setApprovals(prev => prev.map(x => x.listing_id === listingId ? { ...x, listings: { ...x.listings, editors_pick: value } } : x))
      if (selected?.listing_id === listingId) setSelected(prev => prev ? { ...prev, listings: { ...prev.listings, editors_pick: value } } : null)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setEditorsPickToggling(null)
    }
  }

  const HOTEL_SUBCATS = [
    { value: 'boutique_hotel',      label: 'Boutique Hotel' },
    { value: 'chain_hotel',         label: 'Chain Hotel' },
    { value: 'resort',              label: 'Resort' },
    { value: 'business_hotel',      label: 'Business Hotel' },
    { value: 'budget_hotel',        label: 'Budget Hotel' },
    { value: 'luxury_hotel',        label: 'Luxury Hotel' },
    { value: 'bed_breakfast',       label: 'Bed & Breakfast' },
    { value: 'extended_stay_hotel', label: 'Extended Stay Hotel' },
    { value: 'airport_hotel',       label: 'Airport Hotel' },
    { value: 'hostel',              label: 'Hostel' },
    { value: 'motel',               label: 'Motel' },
    { value: 'themed_hotel',        label: 'Themed Hotel' },
    { value: 'historic_hotel',      label: 'Historic Hotel' },
    { value: 'spa_hotel',           label: 'Spa Hotel' },
  ]
  const PRIVATE_SUBCATS = [
    { value: 'apartment',      label: 'Apartment' },
    { value: 'house',          label: 'House' },
    { value: 'secondary_unit', label: 'Secondary Unit' },
    { value: 'unique_space',   label: 'Unique Space' },
    { value: 'bed_breakfast',  label: 'Bed & Breakfast' },
  ]

  const ALL_SUBCATS = [...HOTEL_SUBCATS, ...PRIVATE_SUBCATS]
  function subcatLabel(val) {
    if (!val) return '—'
    return ALL_SUBCATS.find(s => s.value === val)?.label ?? val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  function openEdit(a) {
    const l = a.listings
    setEditTarget(a.listing_id)
    setEditFields({
      title:                l?.title                ?? '',
      description:          l?.description          ?? '',
      price_per_night:      l?.price_per_night      ?? '',
      cleaning_fee:         l?.cleaning_fee         ?? '',
      max_guests:           l?.max_guests           ?? '',
      bedrooms:             l?.bedrooms             ?? '',
      bathrooms:            l?.bathrooms            ?? '',
      city:                 l?.city                 ?? '',
      state:                l?.state                ?? '',
      country:              l?.country              ?? '',
      property_type:        l?.property_type        ?? '',
      property_subcategory: l?.property_subcategory ?? '',
      min_nights:           l?.min_nights           ?? '',
      house_rules:          l?.house_rules          ?? '',
      amenities:            l?.amenities            ?? '',
    })
  }

  async function doEdit(listingId) {
    setActing(true)
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', fields: editFields }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Edit failed')
      showToast('Listing updated successfully.')
      setEditTarget(null)
      setEditFields({})
      await loadData()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setActing(false)
    }
  }

  function fmt(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const stats = {
    all:                 approvals.length,
    pending:             approvals.filter(a => a.status === 'pending').length,
    changes_requested:   approvals.filter(a => a.status === 'changes_requested').length,
    pending_reapproval:  approvals.filter(a => a.status === 'pending_reapproval').length,
    approved:            approvals.filter(a => a.status === 'approved').length,
    rejected:            approvals.filter(a => a.status === 'rejected').length,
    suspended:           approvals.filter(a => a.status === 'suspended').length,
  }
  const filtered = approvals
    .filter(a => activeTab === 'all' || a.status === activeTab)
    .filter(a => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        a.listing_title?.toLowerCase().includes(q) ||
        a.host_name?.toLowerCase().includes(q) ||
        a.host_email?.toLowerCase().includes(q) ||
        a.listings?.city?.toLowerCase().includes(q) ||
        a.listings?.state?.toLowerCase().includes(q)
      )
    })

  function ActionButtons({ a }) {
    const isPending    = a.status === 'pending'
    const isChanges    = a.status === 'changes_requested'
    const isRejected   = a.status === 'rejected'
    const isSuspended  = a.status === 'suspended'
    const isReapproval = a.status === 'pending_reapproval'
    const showActions  = isPending || isChanges || isRejected || isSuspended || isReapproval
    if (!showActions) return null

    const imgState   = imagesMap[a.listing_id]
    const imgCount   = imgState?.items?.length ?? 0
    const imgLoading = imgState?.loading ?? true
    const tooFewPhotos = !imgLoading && imgCount < 5

    const showRequestForm = requestTarget === a.listing_id

    return (
      <div>
        {tooFewPhotos && !isRejected && (
          <div style={{background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.25)',borderRadius:'10px',padding:'10px 14px',marginBottom:'12px',fontSize:'0.82rem',color:'#FCD34D',display:'flex',alignItems:'center',gap:'8px'}}>
            <span>⚠️</span> Host must upload at least 5 photos before approval. ({imgCount} uploaded)
          </div>
        )}
        <div className="action-row">
          <button className="btn-approve" onClick={() => doAction(a.listing_id, 'approve')} disabled={acting || (!isRejected && !isSuspended && !isReapproval && tooFewPhotos)}>
            {acting ? 'Processing…' : (isRejected || isSuspended || isReapproval) ? '✅ Approve' : '✅ Approve'}
          </button>

          {!isRejected && !isSuspended && (
            <button
              className="btn-changes"
              onClick={() => {
                if (showRequestForm) { setRequestTarget(null); setRequestNotes('') }
                else { setRequestTarget(a.listing_id); setRequestNotes('') }
              }}
              disabled={acting}
            >
              🔄 {showRequestForm ? 'Cancel' : 'Request Changes'}
            </button>
          )}

          {!isRejected && !isSuspended && (
            <div className="reject-wrap">
              <input
                className="reject-input"
                placeholder="Rejection reason (optional)…"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
              <button
                className="btn-reject"
                onClick={() => doAction(a.listing_id, 'reject', { reason: rejectionReason })}
                disabled={acting}
              >
                ❌ Reject
              </button>
            </div>
          )}
        </div>

        {showRequestForm && (
          <div className="request-form">
            <div className="rf-label">Notes for host <span style={{color:'#F87171'}}>*</span></div>
            <textarea
              className="rf-textarea"
              placeholder="Explain exactly what needs to be fixed — e.g. photos are too dark, description needs more detail, price seems incorrect…"
              value={requestNotes}
              onChange={e => setRequestNotes(e.target.value)}
              rows={4}
              autoFocus
            />
            <div style={{display:'flex',gap:'8px',marginTop:'10px'}}>
              <button
                className="btn-send-request"
                onClick={() => doAction(a.listing_id, 'request_changes', { notes: requestNotes })}
                disabled={acting || !requestNotes.trim()}
              >
                {acting ? 'Sending…' : '📤 Send request to host'}
              </button>
              <button
                className="btn-cancel-request"
                onClick={() => { setRequestTarget(null); setRequestNotes('') }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .topbar { background:var(--sr-surface); border-bottom:1px solid var(--sr-border-solid); padding:16px 32px; display:flex; align-items:center; justify-content:space-between; }
        .topbar h1 { font-size:1.05rem; font-weight:700; color:var(--sr-text); }
        .refresh-btn { background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); color:var(--sr-muted); padding:7px 16px; border-radius:8px; font-size:0.8rem; cursor:pointer; font-family:inherit; }
        .refresh-btn:hover { color:var(--sr-text); }
        .content { padding:28px 32px; }
        .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
        .stat { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:12px; padding:18px 20px; }
        .stat-num { font-size:1.7rem; font-weight:800; line-height:1; margin-bottom:4px; }
        .stat-label { font-size:0.72rem; color:var(--sr-muted); text-transform:uppercase; letter-spacing:0.06em; font-weight:600; }
        .search-input { width:100%; background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:10px; padding:11px 16px; font-size:0.86rem; font-family:inherit; color:var(--sr-text); outline:none; margin-bottom:16px; }
        .search-input:focus { border-color:var(--sr-orange); }
        .search-input::placeholder { color:var(--sr-sub); }
        .tabs { display:flex; gap:4px; background:rgba(255,255,255,0.05); border-radius:10px; padding:4px; margin-bottom:20px; flex-wrap:wrap; }
        .tab { padding:8px 20px; border-radius:7px; font-size:0.84rem; font-weight:600; border:none; cursor:pointer; font-family:inherit; color:var(--sr-muted); background:transparent; transition:all 0.15s; display:flex; align-items:center; gap:6px; }
        .tab.active { background:var(--sr-orange); color:white; }
        .tab-badge { background:rgba(255,255,255,0.2); font-size:0.65rem; font-weight:800; padding:1px 7px; border-radius:100px; }
        .list { display:flex; flex-direction:column; gap:10px; }
        .card { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:12px; padding:18px 22px; cursor:pointer; transition:all 0.15s; }
        .card:hover { border-color:#3A3430; }
        .card.open { border-color:var(--sr-orange); background:rgba(244,96,26,0.04); }
        .card-top { display:flex; align-items:center; gap:14px; }
        .card-icon { width:44px; height:44px; border-radius:10px; background:var(--sr-border-solid); display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0; }
        .card-info { flex:1; min-width:0; }
        .card-title { font-weight:700; font-size:0.92rem; color:var(--sr-text); margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .card-meta { font-size:0.74rem; color:var(--sr-muted); display:flex; gap:12px; flex-wrap:wrap; }
        .card-right { display:flex; align-items:center; gap:8px; }
        .pill { padding:3px 12px; border-radius:100px; font-size:0.68rem; font-weight:700; text-transform:uppercase; }
        .pill.pending { background:rgba(251,191,36,0.1); color:#FCD34D; }
        .pill.approved { background:rgba(74,222,128,0.1); color:#4ADE80; }
        .pill.rejected { background:rgba(248,113,113,0.1); color:#F87171; }
        .pill.changes_requested { background:rgba(96,165,250,0.1); color:#93C5FD; }
        .pill.live { background:rgba(74,222,128,0.15); color:#4ADE80; }
        .chev { color:var(--sr-sub); font-size:0.8rem; margin-left:4px; }
        .detail { border-top:1px solid var(--sr-border-solid); margin-top:16px; padding-top:18px; }
        .detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
        .di { background:var(--sr-bg); border-radius:8px; padding:12px; }
        .di-label { font-size:0.63rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-sub); margin-bottom:4px; }
        .di-val { font-size:0.86rem; font-weight:600; color:var(--sr-text); }
        .desc-box { background:var(--sr-bg); border-radius:8px; padding:12px; margin-bottom:16px; }
        .desc-box p { font-size:0.82rem; color:var(--sr-muted); line-height:1.7; }

        /* Images */
        .images-section { margin-bottom:16px; }
        .images-label { font-size:0.63rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-sub); margin-bottom:8px; }
        .images-row { display:flex; gap:8px; flex-wrap:wrap; }
        .img-thumb { width:100px; height:72px; border-radius:8px; overflow:hidden; cursor:pointer; border:1px solid rgba(255,255,255,0.08); transition:all 0.15s; flex-shrink:0; }
        .img-thumb:hover { border-color:var(--sr-orange); transform:scale(1.03); }
        .img-thumb img { width:100%; height:100%; object-fit:cover; }
        .preview-link { display:inline-flex; align-items:center; gap:6px; background:rgba(244,96,26,0.08); border:1px solid rgba(244,96,26,0.2); color:var(--sr-orange); padding:7px 14px; border-radius:8px; font-size:0.78rem; font-weight:700; text-decoration:none; margin-bottom:16px; transition:background 0.15s; }
        .preview-link:hover { background:rgba(244,96,26,0.15); }

        /* Actions */
        .action-row { display:flex; gap:10px; align-items:flex-start; flex-wrap:wrap; margin-bottom:0; }
        .btn-approve { background:#16A34A; color:white; border:none; border-radius:9px; padding:11px 22px; font-size:0.87rem; font-weight:700; cursor:pointer; font-family:inherit; transition:background 0.15s; white-space:nowrap; }
        .btn-approve:hover { background:#15803D; }
        .btn-approve:disabled { opacity:0.5; cursor:not-allowed; }
        .btn-changes { background:rgba(96,165,250,0.1); border:1px solid rgba(96,165,250,0.2); color:#93C5FD; border-radius:9px; padding:11px 22px; font-size:0.87rem; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .btn-changes:hover { background:rgba(96,165,250,0.2); }
        .btn-changes:disabled { opacity:0.5; cursor:not-allowed; }
        .reject-wrap { flex:1; min-width:240px; display:flex; gap:8px; }
        .reject-input { flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:9px; padding:10px 13px; font-size:0.83rem; font-family:inherit; color:var(--sr-text); outline:none; }
        .reject-input:focus { border-color:#F87171; }
        .btn-reject { background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.25); color:#F87171; border-radius:9px; padding:10px 18px; font-size:0.87rem; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .btn-reject:hover { background:rgba(248,113,113,0.2); }
        .btn-reject:disabled { opacity:0.5; cursor:not-allowed; }

        /* Request changes form */
        .request-form { margin-top:14px; background:var(--sr-bg); border:1px solid rgba(96,165,250,0.2); border-radius:10px; padding:16px; }
        .rf-label { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#93C5FD; margin-bottom:8px; }
        .rf-textarea { width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(96,165,250,0.2); border-radius:8px; padding:12px; font-size:0.84rem; font-family:inherit; color:var(--sr-text); outline:none; resize:vertical; min-height:90px; }
        .rf-textarea:focus { border-color:#93C5FD; }
        .btn-send-request { background:#93C5FD; color:var(--sr-bg); border:none; border-radius:8px; padding:10px 20px; font-size:0.84rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .btn-send-request:disabled { opacity:0.5; cursor:not-allowed; }
        .btn-cancel-request { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:var(--sr-muted); border-radius:8px; padding:10px 16px; font-size:0.84rem; font-weight:600; cursor:pointer; font-family:inherit; }

        /* Change request history */
        .cr-history { background:rgba(96,165,250,0.04); border:1px solid rgba(96,165,250,0.15); border-radius:10px; padding:14px; margin-bottom:16px; }
        .cr-history-title { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#93C5FD; margin-bottom:10px; }
        .cr-item { padding-bottom:10px; margin-bottom:10px; border-bottom:1px solid rgba(96,165,250,0.1); }
        .cr-item:last-child { border-bottom:none; margin-bottom:0; padding-bottom:0; }
        .cr-notes { font-size:0.84rem; color:var(--sr-text); line-height:1.65; margin-bottom:4px; }
        .cr-meta { font-size:0.72rem; color:var(--sr-sub); }

        /* Edit form */
        .btn-edit-listing { background:rgba(167,139,250,0.1); border:1px solid rgba(167,139,250,0.25); color:#a78bfa; border-radius:9px; padding:10px 20px; font-size:0.85rem; font-weight:700; cursor:pointer; font-family:inherit; margin-bottom:14px; }
        .btn-edit-listing:hover { background:rgba(167,139,250,0.2); }
        .edit-form { background:rgba(167,139,250,0.05); border:1px solid rgba(167,139,250,0.2); border-radius:12px; padding:18px; margin-bottom:16px; }
        .edit-form-title { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#a78bfa; margin-bottom:14px; }
        .edit-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .edit-field { display:flex; flex-direction:column; gap:4px; }
        .edit-label { font-size:0.65rem; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:var(--sr-sub); }
        .edit-input { background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:9px 12px; font-size:0.84rem; font-family:inherit; color:var(--sr-text); outline:none; }
        .edit-input:focus { border-color:#a78bfa; }
        .edit-textarea { background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:10px 12px; font-size:0.84rem; font-family:inherit; color:var(--sr-text); outline:none; resize:vertical; width:100%; }
        .edit-textarea:focus { border-color:#a78bfa; }
        .btn-save-edit { background:#a78bfa; color:#0f0d0a; border:none; border-radius:9px; padding:11px 22px; font-size:0.87rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .btn-save-edit:disabled { opacity:0.5; cursor:not-allowed; }
        .btn-cancel-edit { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:var(--sr-muted); border-radius:9px; padding:11px 16px; font-size:0.84rem; font-weight:600; cursor:pointer; font-family:inherit; }

        /* Status panels */
        .info-approved { background:rgba(74,222,128,0.06); border:1px solid rgba(74,222,128,0.15); border-radius:10px; padding:14px; display:flex; align-items:center; gap:10px; }
        .info-rejected { background:rgba(248,113,113,0.06); border:1px solid rgba(248,113,113,0.15); border-radius:10px; padding:14px; }
        .empty { text-align:center; padding:56px; color:var(--sr-sub); }
        .empty-icon { font-size:2.2rem; margin-bottom:10px; }
        .toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:12px; font-size:0.86rem; font-weight:600; z-index:9999; animation:fadeIn 0.2s; max-width:360px; }
        .toast.success { background:#16A34A; color:white; }
        .toast.error { background:#DC2626; color:white; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        /* Lightbox */
        .lightbox { position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:9999; display:flex; align-items:center; justify-content:center; cursor:zoom-out; }
        .lightbox img { max-width:90vw; max-height:88vh; border-radius:10px; object-fit:contain; }
        .lightbox-close { position:fixed; top:20px; right:24px; color:white; font-size:1.6rem; cursor:pointer; background:none; border:none; line-height:1; }

        @media(max-width:768px) { .content{padding:20px;} .stats-row{grid-template-columns:repeat(2,1fr);} .detail-grid{grid-template-columns:1fr;} .card-meta{display:none;} .topbar{padding:14px 20px;} .action-row{flex-direction:column;} .reject-wrap{min-width:unset;} }
      `}</style>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox} alt="Listing photo" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div className="topbar">
        <h1>Listing Approvals</h1>
        <button className="refresh-btn" onClick={loadData}>↻ Refresh</button>
      </div>

      <div className="content">
        <div className="stats-row">
          <div className="stat"><div className="stat-num" style={{color:'var(--sr-text)'}}>{stats.all}</div><div className="stat-label">Total Listings</div></div>
          <div className="stat"><div className="stat-num" style={{color:'#FCD34D'}}>{stats.pending}</div><div className="stat-label">Pending Review</div></div>
          <div className="stat"><div className="stat-num" style={{color:'#4ADE80'}}>{stats.approved}</div><div className="stat-label">Approved</div></div>
          <div className="stat"><div className="stat-num" style={{color:'#F87171'}}>{stats.rejected + stats.suspended}</div><div className="stat-label">Rejected / Suspended</div></div>
        </div>

        <input
          className="search-input"
          placeholder="Search by title, host, city…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="tabs">
          {STATUS_TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              className={`tab ${activeTab === key ? 'active' : ''}`}
              onClick={() => { setActiveTab(key); setSelected(null); setRequestTarget(null) }}
            >
              {icon} {label}
              {stats[key] > 0 && (
                <span className="tab-badge">{stats[key]}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty"><div className="empty-icon">⏳</div><div>Loading...</div></div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">{STATUS_TABS.find(t => t.key === activeTab)?.icon}</div>
            <div>No {activeTab.replace('_', ' ')} submissions</div>
          </div>
        ) : (
          <div className="list">
            {filtered.map(a => {
              const isOpen = selected?.id === a.id
              const images = Array.isArray(a.listings?.images) ? a.listings.images.filter(Boolean) : []
              const crHistory = changeRequestsMap[a.listing_id] || []

              const fuUnread = unreadCounts[a.listing_id] || 0

              return (
                <div key={a.id} className={`card ${isOpen ? 'open' : ''}`}>
                  <div className="card-top" onClick={() => { const opening = !isOpen; setSelected(opening ? a : null); if (opening) { fetchImages(a.listing_id); fetchFollowups(a.listing_id) } }}>
                    <div className="card-icon">{a.listings?.property_type === 'hotel' ? '🏨' : '🏠'}</div>
                    <div className="card-info">
                      <div className="card-title">{a.listing_title || 'Untitled'}</div>
                      <div className="card-meta">
                        <span>👤 {a.host_name || '—'}</span>
                        <span>📧 {a.host_email}</span>
                        {a.listings?.city && <span>📍 {a.listings.city}{a.listings.state ? `, ${a.listings.state}` : ''}</span>}
                        <span>🕐 {fmt(a.submitted_at)}</span>
                      </div>
                    </div>
                    <div className="card-right">
                      {fuUnread > 0 && (
                        <span style={{background:'var(--sr-orange)',color:'white',borderRadius:'100px',fontSize:'0.65rem',fontWeight:800,padding:'2px 8px',lineHeight:'1.4'}}>
                          💬 {fuUnread} new
                        </span>
                      )}
                      <span className={`pill ${a.status}`}>{a.status.replace(/_/g, ' ')}</span>
                      <span className="chev">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="detail">
                      {/* Preview link */}
                      <a
                        href={`/listings/${a.listing_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="preview-link"
                      >
                        👁 Preview as guest →
                      </a>

                      {/* Editor's Pick — Admin / Super Admin only */}
                      {(myRole === 'admin' || myRole === 'super_admin') && (
                        <div style={{ marginBottom: 16 }}>
                          <div className="di-label" style={{ marginBottom: 8 }}>Editor's Pick</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button
                              type="button"
                              onClick={() => doSetEditorsPick(a.listing_id, true)}
                              disabled={editorsPickToggling === a.listing_id}
                              style={{
                                padding: '8px 18px',
                                borderRadius: 8,
                                border: a.listings?.editors_pick ? '2px solid #FCD34D' : '1px solid var(--sr-border)',
                                background: a.listings?.editors_pick ? 'rgba(252,211,77,0.2)' : 'var(--sr-bg)',
                                color: a.listings?.editors_pick ? '#FCD34D' : 'var(--sr-muted)',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: editorsPickToggling === a.listing_id ? 'not-allowed' : 'pointer',
                                opacity: editorsPickToggling === a.listing_id ? 0.6 : 1,
                              }}
                            >
                              ON
                            </button>
                            <button
                              type="button"
                              onClick={() => doSetEditorsPick(a.listing_id, false)}
                              disabled={editorsPickToggling === a.listing_id}
                              style={{
                                padding: '8px 18px',
                                borderRadius: 8,
                                border: !a.listings?.editors_pick ? '2px solid var(--sr-border)' : '1px solid var(--sr-border)',
                                background: !a.listings?.editors_pick ? 'var(--sr-card2)' : 'var(--sr-bg)',
                                color: !a.listings?.editors_pick ? 'var(--sr-text)' : 'var(--sr-muted)',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: editorsPickToggling === a.listing_id ? 'not-allowed' : 'pointer',
                                opacity: editorsPickToggling === a.listing_id ? 0.6 : 1,
                              }}
                            >
                              OFF
                            </button>
                            {editorsPickToggling === a.listing_id && <span style={{ fontSize: '0.78rem', color: 'var(--sr-sub)' }}>Updating…</span>}
                          </div>
                        </div>
                      )}

                      {/* Detail grid */}
                      <div className="detail-grid">
                        <div className="di"><div className="di-label">Title</div><div className="di-val">{a.listings?.title || a.listing_title || '—'}</div></div>
                        <div className="di"><div className="di-label">Property Type</div><div className="di-val">{a.listings?.property_type === 'hotel' ? '🏨 Hotel' : '🏠 Private Stay'}</div></div>
                        <div className="di"><div className="di-label">Subcategory</div><div className="di-val">{subcatLabel(a.listings?.property_subcategory)}</div></div>
                        <div className="di"><div className="di-label">Location</div><div className="di-val">{a.listings?.city || '—'}{a.listings?.state ? `, ${a.listings.state}` : ''}{a.listings?.zip_code ? ` ${a.listings.zip_code}` : ''}</div></div>
                        <div className="di"><div className="di-label">Price / night</div><div className="di-val">{a.listings?.price_per_night ? `$${a.listings.price_per_night}` : '—'}</div></div>
                        <div className="di"><div className="di-label">Cleaning fee</div><div className="di-val">{a.listings?.cleaning_fee != null ? `$${a.listings.cleaning_fee}` : '—'}</div></div>
                        <div className="di"><div className="di-label">Max guests</div><div className="di-val">{a.listings?.max_guests ?? '—'}</div></div>
                        <div className="di"><div className="di-label">Bedrooms / Baths</div><div className="di-val">{a.listings?.bedrooms ?? '—'} bd · {a.listings?.bathrooms ?? '—'} ba</div></div>
                        <div className="di"><div className="di-label">Min nights</div><div className="di-val">{a.listings?.min_nights ?? '—'}</div></div>
                        <div className="di"><div className="di-label">Instant book</div><div className="di-val">{a.listings?.is_instant_book ? '⚡ Yes' : 'No'}</div></div>
                        <div className="di"><div className="di-label">Host</div><div className="di-val">{a.host_name || '—'}</div></div>
                        <div className="di"><div className="di-label">Submitted</div><div className="di-val">{fmt(a.submitted_at)}</div></div>
                      </div>

                      {a.listings?.amenities && (
                        <div className="desc-box">
                          <div className="di-label" style={{marginBottom:'6px'}}>Amenities</div>
                          <p>{a.listings.amenities}</p>
                        </div>
                      )}

                      {a.listings?.description && (
                        <div className="desc-box">
                          <div className="di-label" style={{marginBottom:'6px'}}>Description</div>
                          <p>{a.listings.description}</p>
                        </div>
                      )}

                      {a.listings?.house_rules && (
                        <div className="desc-box">
                          <div className="di-label" style={{marginBottom:'6px'}}>House rules</div>
                          <p>{a.listings.house_rules}</p>
                        </div>
                      )}

                      {/* Images */}
                      {(() => {
                        const imgState = imagesMap[a.listing_id]
                        const imgs = imgState?.items ?? []
                        const cover = imgs.find(i => i.is_cover) ?? imgs[0]
                        const rest  = imgs.filter(i => i !== cover)
                        return (
                          <div className="images-section">
                            <div className="images-label">
                              Photos {imgState?.loading ? '(loading…)' : `(${imgs.length})`}
                            </div>
                            {imgState?.loading && (
                              <div style={{color:'var(--sr-sub)',fontSize:'0.8rem',padding:'12px 0'}}>Loading images…</div>
                            )}
                            {!imgState?.loading && imgs.length === 0 && (
                              <div style={{color:'#F87171',fontSize:'0.8rem',padding:'12px 0'}}>No photos uploaded yet.</div>
                            )}
                            {cover && (
                              <div
                                style={{width:'100%',height:'260px',borderRadius:'10px',overflow:'hidden',marginBottom:'8px',cursor:'zoom-in',border:'1px solid rgba(255,255,255,0.08)'}}
                                onClick={e => { e.stopPropagation(); setLightbox(cover.url) }}
                              >
                                <img src={cover.url} alt="Cover" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                              </div>
                            )}
                            {rest.length > 0 && (
                              <div className="images-row">
                                {rest.map((img, i) => (
                                  <div key={img.id} className="img-thumb" onClick={e => { e.stopPropagation(); setLightbox(img.url) }}>
                                    <img src={img.url} alt={`Photo ${i + 2}`} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      {/* Change request history */}
                      {crHistory.length > 0 && (
                        <div className="cr-history">
                          <div className="cr-history-title">🔄 Change request history ({crHistory.length})</div>
                          {crHistory.map((cr, i) => (
                            <div key={i} className="cr-item">
                              <div className="cr-notes">{cr.notes}</div>
                              <div className="cr-meta">
                                {fmt(cr.created_at)} · by {cr.admin_email}
                                {cr.status === 'resolved' && <span style={{color:'#4ADE80',marginLeft:'8px'}}>✓ Resolved</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Host follow-up messages */}
                      {(() => {
                        const fuState = followupsMap[a.listing_id]
                        const fus = fuState?.items || []
                        if (fuState?.loading) return (
                          <div style={{fontSize:'0.8rem',color:'var(--sr-sub)',padding:'10px 0'}}>Loading messages…</div>
                        )
                        if (!fus.length) return null
                        return (
                          <div style={{background:'rgba(244,96,26,0.05)',border:'1px solid rgba(244,96,26,0.2)',borderRadius:'10px',padding:'14px',marginBottom:'16px'}}>
                            <div style={{fontSize:'0.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--sr-orange)',marginBottom:'10px'}}>
                              💬 Host messages ({fus.length})
                            </div>
                            {fus.map((fu, i) => (
                              <div key={fu.id} style={{borderBottom: i < fus.length - 1 ? '1px solid rgba(244,96,26,0.12)' : 'none', paddingBottom: i < fus.length - 1 ? '10px' : 0, marginBottom: i < fus.length - 1 ? '10px' : 0}}>
                                <div style={{fontSize:'0.84rem',color:'var(--sr-text)',lineHeight:'1.65'}}>{fu.message}</div>
                                <div style={{fontSize:'0.72rem',color:'var(--sr-sub)',marginTop:'4px',display:'flex',alignItems:'center',gap:'8px'}}>
                                  {fmt(fu.created_at)}
                                  {fu.read_by_admin && <span style={{color:'#4ADE80'}}>✓ Read</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()}

                      {/* Super admin edit form */}
                      {myRole === 'super_admin' && editTarget === a.listing_id ? (
                        <div className="edit-form">
                          <div className="edit-form-title">✏️ Edit Listing — Super Admin</div>
                          <div className="edit-grid">
                            {[
                              { label: 'Title',           key: 'title',           type: 'text' },
                              { label: 'City',            key: 'city',            type: 'text' },
                              { label: 'State',           key: 'state',           type: 'text' },
                              { label: 'Country',         key: 'country',         type: 'text' },
                              { label: 'Price / night',   key: 'price_per_night', type: 'number' },
                              { label: 'Cleaning fee',    key: 'cleaning_fee',    type: 'number' },
                              { label: 'Max guests',      key: 'max_guests',      type: 'number' },
                              { label: 'Bedrooms',        key: 'bedrooms',        type: 'number' },
                              { label: 'Bathrooms',       key: 'bathrooms',       type: 'number' },
                              { label: 'Min nights',      key: 'min_nights',      type: 'number' },
                            ].map(({ label, key, type }) => (
                              <div key={key} className="edit-field">
                                <label className="edit-label">{label}</label>
                                <input
                                  className="edit-input"
                                  type={type}
                                  value={editFields[key] ?? ''}
                                  onChange={e => setEditFields(p => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                                />
                              </div>
                            ))}
                            <div className="edit-field">
                              <label className="edit-label">Property Type <span style={{color:'#f87171'}}>*</span></label>
                              <select
                                className="edit-input"
                                value={editFields.property_type ?? ''}
                                onChange={e => setEditFields(p => ({ ...p, property_type: e.target.value, property_subcategory: '' }))}
                              >
                                <option value="">— select —</option>
                                <option value="hotel">🏨 Hotel</option>
                                <option value="private_stay">🏠 Private Stay</option>
                              </select>
                            </div>
                            <div className="edit-field">
                              <label className="edit-label">Subcategory <span style={{color:'var(--sr-sub)',fontWeight:400}}>optional</span></label>
                              <select
                                className="edit-input"
                                value={editFields.property_subcategory ?? ''}
                                onChange={e => setEditFields(p => ({ ...p, property_subcategory: e.target.value }))}
                                disabled={!editFields.property_type}
                              >
                                <option value="">— none —</option>
                                {(editFields.property_type === 'hotel' ? HOTEL_SUBCATS : PRIVATE_SUBCATS).map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="edit-field" style={{marginTop:'10px'}}>
                            <label className="edit-label">Description</label>
                            <textarea className="edit-textarea" rows={4} value={editFields.description ?? ''} onChange={e => setEditFields(p => ({ ...p, description: e.target.value }))} />
                          </div>
                          <div className="edit-field" style={{marginTop:'10px'}}>
                            <label className="edit-label">House Rules</label>
                            <textarea className="edit-textarea" rows={3} value={editFields.house_rules ?? ''} onChange={e => setEditFields(p => ({ ...p, house_rules: e.target.value }))} />
                          </div>
                          <div style={{display:'flex',gap:'8px',marginTop:'14px'}}>
                            <button className="btn-save-edit" onClick={() => doEdit(a.listing_id)} disabled={acting}>
                              {acting ? 'Saving…' : '💾 Save Changes'}
                            </button>
                            <button className="btn-cancel-edit" onClick={() => { setEditTarget(null); setEditFields({}) }}>Cancel</button>
                          </div>
                        </div>
                      ) : myRole === 'super_admin' ? (
                        <button className="btn-edit-listing" onClick={() => openEdit(a)}>✏️ Edit Listing</button>
                      ) : null}

                      {/* Action buttons for pending + changes_requested */}
                      {ActionButtons({ a })}

                      {/* Approved panel */}
                      {a.status === 'approved' && (
                        <div className="info-approved">
                          <div style={{fontSize:'1.2rem'}}>✅</div>
                          <div>
                            <div style={{fontSize:'0.86rem',fontWeight:700,color:'#4ADE80'}}>Approved — waiting for host to go live</div>
                            {a.reviewed_at && <div style={{fontSize:'0.74rem',color:'var(--sr-muted)'}}>Reviewed {fmt(a.reviewed_at)}</div>}
                          </div>
                          <a href={`/listings/${a.listing_id}`} target="_blank" rel="noreferrer" style={{marginLeft:'auto',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ADE80',padding:'6px 14px',borderRadius:'8px',fontSize:'0.76rem',fontWeight:700,textDecoration:'none'}}>Preview →</a>
                        </div>
                      )}

                      {/* Rejected panel */}
                      {a.status === 'rejected' && (
                        <div className="info-rejected">
                          <div style={{fontSize:'0.72rem',fontWeight:700,color:'#F87171',textTransform:'uppercase',marginBottom:'4px'}}>Rejection reason</div>
                          <div style={{fontSize:'0.84rem',color:'var(--sr-muted)'}}>{a.rejection_reason || '—'}</div>
                          {a.reviewed_at && <div style={{fontSize:'0.73rem',color:'var(--sr-sub)',marginTop:'6px'}}>Reviewed {fmt(a.reviewed_at)}</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
