'use client'
import { useState, useMemo } from 'react'

const AVATAR_COLORS = ['#7C3AED','#0891B2','#059669','#D97706','#DC2626','#0EA5E9','#16A34A','#CA8A04','#E11D48','#9333EA']

const SUSP_REASONS = [
  { value: 'fraud',            label: 'Fraud or suspicious activity' },
  { value: 'policy_violation', label: 'Policy violation' },
  { value: 'spam',             label: 'Spam' },
  { value: 'safety',           label: 'Safety issue' },
  { value: 'payment_abuse',    label: 'Payment abuse' },
  { value: 'other',            label: 'Other' },
]

const FILTERS = ['All', 'Active', 'New', 'Suspended', 'Flagged', 'Repeat']
const TABS    = ['Overview', 'Bookings', 'Spend', 'Activity', 'Admin']

const BOOKING_STATUS = {
  confirmed:  { color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
  completed:  { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
  cancelled:  { color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
  pending:    { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)' },
  dispute:    { color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
  refunded:   { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
  checked_in: { color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  .gs-shell { display:flex; height:100vh; overflow:hidden; background:var(--sr-bg); font-family:'DM Sans',sans-serif; color:var(--sr-text); }
  .gs-left  { flex:1; min-width:0; display:flex; flex-direction:column; overflow:hidden; }
  .gs-topbar { background:var(--sr-surface); border-bottom:1px solid var(--sr-border-solid); padding:16px 24px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
  .gs-topbar h1 { font-size:1.1rem; font-weight:800; }
  /* stats */
  .gs-stats { display:flex; gap:10px; padding:16px 24px; flex-shrink:0; overflow-x:auto; }
  .gs-stat  { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:10px; padding:13px 16px; flex:1; min-width:96px; }
  .gs-stat-val { font-size:1.35rem; font-weight:800; line-height:1; }
  .gs-stat-lbl { font-size:0.67rem; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:var(--sr-sub); margin-top:5px; }
  /* filters */
  .gs-filters { display:flex; gap:8px; padding:0 24px 14px; flex-shrink:0; flex-wrap:wrap; align-items:center; }
  .gs-pill { background:transparent; border:1px solid var(--sr-border-solid); border-radius:20px; padding:5px 14px; font-size:0.73rem; font-weight:700; color:var(--sr-muted); cursor:pointer; font-family:inherit; transition:all 0.13s; white-space:nowrap; }
  .gs-pill:hover { border-color:var(--sr-orange); color:var(--sr-orange); }
  .gs-pill.act  { background:var(--sr-orange); border-color:var(--sr-orange); color:#fff; }
  .gs-search { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:8px; padding:7px 12px; color:var(--sr-text); font-size:0.82rem; outline:none; min-width:180px; font-family:inherit; margin-left:auto; }
  .gs-search:focus { border-color:var(--sr-orange); }
  /* table */
  .gs-scroll { flex:1; overflow-y:auto; padding:0 24px 24px; }
  .gs-table  { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:12px; overflow:hidden; }
  .gs-row    { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 1fr 1.2fr; gap:12px; padding:13px 20px; border-bottom:1px solid var(--sr-border-solid); align-items:center; cursor:pointer; transition:background 0.1s; }
  .gs-row:last-child { border-bottom:none; }
  .gs-row.hdr  { background:#141210; cursor:default; }
  .gs-row.hdr span { font-size:0.67rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-sub); }
  .gs-row:not(.hdr):hover { background:rgba(244,96,26,0.04); }
  .gs-row.sel  { background:rgba(244,96,26,0.07); border-left:3px solid var(--sr-orange); }
  .gs-empty    { padding:60px 20px; text-align:center; color:var(--sr-sub); font-size:0.84rem; }
  .gs-badge    { display:inline-flex; align-items:center; padding:3px 9px; border-radius:20px; font-size:0.67rem; font-weight:700; }
  /* right panel */
  .gs-right       { width:420px; flex-shrink:0; border-left:1px solid var(--sr-border-solid); display:flex; flex-direction:column; overflow:hidden; background:var(--sr-surface); }
  .gs-panel-hdr   { padding:16px 20px; border-bottom:1px solid var(--sr-border-solid); flex-shrink:0; display:flex; align-items:center; gap:12px; }
  .gs-tabs        { display:flex; border-bottom:1px solid var(--sr-border-solid); flex-shrink:0; }
  .gs-tab         { flex:1; padding:10px 4px; font-size:0.67rem; font-weight:700; text-align:center; cursor:pointer; color:var(--sr-sub); border-bottom:2px solid transparent; font-family:inherit; background:none; border-top:none; border-left:none; border-right:none; transition:all 0.13s; text-transform:uppercase; letter-spacing:0.05em; }
  .gs-tab.act     { color:var(--sr-orange); border-bottom-color:var(--sr-orange); }
  .gs-tcontent    { flex:1; overflow-y:auto; padding:20px; }
  .gs-loading     { display:flex; align-items:center; justify-content:center; height:160px; color:var(--sr-sub); font-size:0.84rem; }
  /* detail ui */
  .gs-section     { margin-bottom:20px; }
  .gs-sec-title   { font-size:0.67rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-sub); margin-bottom:10px; }
  .gs-grid2       { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .gs-info-box    { background:var(--sr-bg); border-radius:10px; padding:4px 14px; }
  .gs-info-row    { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--sr-surface); font-size:0.82rem; }
  .gs-info-row:last-child { border-bottom:none; }
  .gs-info-lbl    { color:var(--sr-sub); font-size:0.75rem; }
  .gs-info-val    { color:var(--sr-text); font-weight:500; font-size:0.8rem; text-align:right; max-width:58%; word-break:break-all; }
  .gs-stat-card   { background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:10px; padding:14px; text-align:center; }
  .gs-stat-card .v { font-size:1.25rem; font-weight:800; }
  .gs-stat-card .l { font-size:0.67rem; color:var(--sr-sub); font-weight:700; text-transform:uppercase; letter-spacing:0.07em; margin-top:4px; }
  /* booking cards */
  .gs-bcard     { background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:10px; padding:14px; margin-bottom:10px; }
  /* action buttons */
  .gs-actions   { display:flex; gap:8px; flex-wrap:wrap; }
  .gs-btn       { padding:7px 14px; border-radius:8px; font-size:0.78rem; font-weight:700; cursor:pointer; border:1px solid transparent; font-family:inherit; transition:all 0.13s; }
  .gs-btn-susp  { background:rgba(248,113,113,0.1); color:#F87171; border-color:rgba(248,113,113,0.3); }
  .gs-btn-susp:hover  { background:rgba(248,113,113,0.2); }
  .gs-btn-deact { background:rgba(107,94,82,0.15); color:var(--sr-muted); border-color:rgba(107,94,82,0.3); }
  .gs-btn-deact:hover { background:rgba(107,94,82,0.25); }
  .gs-btn-react { background:rgba(52,211,153,0.1); color:#34D399; border-color:rgba(52,211,153,0.3); }
  .gs-btn-react:hover { background:rgba(52,211,153,0.2); }
  /* bar chart */
  .gs-bar       { display:flex; align-items:flex-end; gap:6px; height:80px; margin:10px 0; }
  .gs-bar-col   { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; }
  .gs-bar-fill  { width:100%; border-radius:4px 4px 0 0; background:var(--sr-orange); opacity:0.8; transition:height 0.3s; }
  .gs-bar-lbl   { font-size:0.58rem; color:var(--sr-sub); text-align:center; white-space:nowrap; }
  /* risk */
  .gs-risk-bar  { height:6px; background:var(--sr-border-solid); border-radius:4px; overflow:hidden; margin-top:6px; }
  .gs-risk-fill { height:100%; border-radius:4px; }
  /* timeline */
  .gs-timeline      { list-style:none; }
  .gs-tl-item       { display:flex; gap:12px; padding-bottom:16px; position:relative; }
  .gs-tl-item::before { content:''; position:absolute; left:5px; top:16px; bottom:0; width:1px; background:var(--sr-border-solid); }
  .gs-tl-item:last-child::before { display:none; }
  .gs-tl-dot        { width:11px; height:11px; border-radius:50%; background:var(--sr-orange); flex-shrink:0; margin-top:3px; }
  .gs-tl-body       { flex:1; }
  /* modal */
  .gs-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; }
  .gs-modal   { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:16px; padding:28px; width:100%; max-width:500px; max-height:90vh; overflow-y:auto; }
  .gs-modal h2 { font-size:1rem; font-weight:800; margin-bottom:4px; }
  .gs-modal-sub { font-size:0.84rem; color:var(--sr-muted); margin-bottom:20px; }
  .gs-field      { margin-bottom:14px; }
  .gs-field-lbl  { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:var(--sr-sub); margin-bottom:6px; }
  .gs-field-lbl .req { color:#F87171; margin-left:2px; }
  .gs-select  { width:100%; background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:10px 12px; color:var(--sr-text); font-size:0.85rem; outline:none; font-family:inherit; cursor:pointer; }
  .gs-select:focus  { border-color:var(--sr-orange); }
  .gs-textarea { width:100%; background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:10px 12px; color:var(--sr-text); font-size:0.85rem; resize:vertical; min-height:90px; outline:none; font-family:inherit; }
  .gs-textarea:focus { border-color:var(--sr-orange); }
  .gs-input    { width:100%; background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:10px 12px; color:var(--sr-text); font-size:0.85rem; outline:none; font-family:inherit; }
  .gs-input:focus    { border-color:var(--sr-orange); }
  .gs-warning  { background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.25); border-radius:8px; padding:10px 14px; font-size:0.82rem; color:#F87171; margin-bottom:14px; }
  .gs-success  { background:rgba(52,211,153,0.06); border:1px solid rgba(52,211,153,0.2); border-radius:8px; padding:10px 14px; font-size:0.82rem; color:#34D399; margin-bottom:14px; }
  .gs-mfooter  { display:flex; gap:10px; margin-top:20px; justify-content:flex-end; }
  .gs-mbtn     { padding:8px 20px; border-radius:8px; font-size:0.84rem; font-weight:700; cursor:pointer; border:1px solid transparent; font-family:inherit; }
  .gs-mbtn-cancel  { background:var(--sr-border-solid); color:var(--sr-muted); border-color:#3A3028; }
  .gs-mbtn-ok      { background:var(--sr-orange); color:#fff; }
  .gs-mbtn-ok.danger  { background:#EF4444; }
  .gs-mbtn-ok.success { background:#16A34A; }
  .gs-mbtn-ok:disabled { opacity:0.5; cursor:not-allowed; }
  /* toast */
  .gs-toast    { position:fixed; bottom:24px; right:24px; background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:10px; padding:12px 18px; font-size:0.84rem; font-weight:600; z-index:200; }
  .gs-toast.ok  { border-color:rgba(74,222,128,0.4); color:#4ADE80; }
  .gs-toast.err { border-color:rgba(248,113,113,0.4); color:#F87171; }
  .gs-export-btn { background:var(--sr-border-solid); border:1px solid #3A3028; border-radius:8px; padding:7px 14px; color:var(--sr-text); font-size:0.78rem; font-weight:600; cursor:pointer; font-family:inherit; }
  .gs-export-btn:hover { border-color:var(--sr-orange); }
  @media(max-width:1100px) { .gs-row { grid-template-columns:2fr 1fr 1fr 1fr 1.2fr; } .gs-row>*:nth-child(5){display:none;} }
  @media(max-width:900px)  { .gs-right { display:none; } }
`

/* ── helpers ── */

function hashColor(s) {
  let h = 0
  for (const c of s ?? '') h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function initials(name, email) {
  const src = name?.trim() || email || '?'
  return src.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtMoney(n) {
  if (!n && n !== 0) return '—'
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function Avatar({ name, email, size = 34 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: hashColor(name ?? email ?? ''),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: '#fff', flexShrink: 0,
    }}>
      {initials(name, email)}
    </div>
  )
}

function riskScore(g) {
  if (!g) return 0
  let s = 0
  if (g.suspended_at) s += 55
  if (g.suspension_category === 'fraud') s += 40
  else if (g.suspension_category) s += 20
  if (!g.is_active && !g.suspended_at) s += 20
  return Math.min(s, 100)
}

function riskColor(score) {
  if (score >= 60) return '#F87171'
  if (score >= 30) return '#FBBF24'
  return '#34D399'
}

function guestStatus(g) {
  if (g.suspended_at) return { label: 'Suspended', color: '#F87171', bg: 'rgba(248,113,113,0.1)' }
  if (!g.is_active)   return { label: 'Inactive',  color: 'var(--sr-muted)', bg: 'rgba(107,94,82,0.15)' }
  return { label: 'Active', color: '#34D399', bg: 'rgba(52,211,153,0.1)' }
}

/* ── component ── */

export default function GuestsClient({ initialGuests, role }) {
  const [guests,        setGuests]        = useState(initialGuests)
  const [filter,        setFilter]        = useState('All')
  const [search,        setSearch]        = useState('')
  const [selected,      setSelected]      = useState(null)
  const [detail,        setDetail]        = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [tab,           setTab]           = useState('overview')
  const [modal,         setModal]         = useState(null)   // { action, guest }
  const [form,          setForm]          = useState({ suspCategory: '', adminNotes: '', deleteConfirm: '' })
  const [loading,       setLoading]       = useState(false)
  const [toast,         setToast]         = useState(null)

  const canManage    = ['admin', 'super_admin', 'trust_safety'].includes(role)
  const canReinstate = ['super_admin', 'trust_safety'].includes(role)

  /* ── stats ── */
  const stats = useMemo(() => {
    const week = 7 * 86400 * 1000
    const now  = Date.now()
    return {
      total:     guests.length,
      active:    guests.filter(g => g.is_active && !g.suspended_at).length,
      newThis:   guests.filter(g => now - new Date(g.created_at) < week).length,
      suspended: guests.filter(g => !!g.suspended_at).length,
      flagged:   guests.filter(g => !!g.suspension_category).length,
      totalSpent: guests.reduce((s, g) => s + (g.total_spent ?? 0), 0),
    }
  }, [guests])

  /* ── filtered list ── */
  const filtered = useMemo(() => {
    const week = 7 * 86400 * 1000
    const now  = Date.now()
    let list = [...guests]
    if (filter === 'Active')    list = list.filter(g => g.is_active && !g.suspended_at)
    else if (filter === 'New')  list = list.filter(g => now - new Date(g.created_at) < week)
    else if (filter === 'Suspended') list = list.filter(g => !!g.suspended_at)
    else if (filter === 'Flagged')   list = list.filter(g => !!g.suspension_category)
    else if (filter === 'Repeat')    list = list.filter(g => (g.booking_count ?? 0) > 1)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(g =>
        g.email?.toLowerCase().includes(q) ||
        g.full_name?.toLowerCase().includes(q)
      )
    }
    return list
  }, [guests, filter, search])

  /* ── monthly spend chart ── */
  const monthlySpend = useMemo(() => {
    if (!detail?.bookings?.length) return []
    const map = {}
    for (const b of detail.bookings) {
      const k = new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      map[k] = (map[k] ?? 0) + (b.total_amount ?? 0)
    }
    return Object.entries(map).slice(-6).map(([month, value]) => ({ month, value }))
  }, [detail])

  const maxSpend = Math.max(...monthlySpend.map(m => m.value), 1)

  /* ── hosts booked with ── */
  const hostsBooked = useMemo(() => {
    if (!detail?.bookings?.length) return []
    const map = {}
    for (const b of detail.bookings) {
      if (b.host) {
        if (!map[b.host.id]) map[b.host.id] = { ...b.host, count: 0, total: 0 }
        map[b.host.id].count++
        map[b.host.id].total += b.total_amount ?? 0
      }
    }
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [detail])

  /* ── payment methods ── */
  const payMethods = useMemo(() => {
    if (!detail?.bookings?.length) return []
    const map = {}
    for (const b of detail.bookings) {
      const k = b.payment_provider ?? 'card'
      map[k] = (map[k] ?? 0) + 1
    }
    return Object.entries(map).map(([method, count]) => ({ method, count }))
  }, [detail])

  /* ── handlers ── */

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function selectGuest(g) {
    if (selected?.id === g.id) { setSelected(null); setDetail(null); return }
    setSelected(g)
    setTab('overview')
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await fetch(`/api/admin/guests/${g.id}`)
      if (res.ok) setDetail(await res.json())
    } catch {}
    finally { setDetailLoading(false) }
  }

  function openModal(action, guest) {
    setForm({ suspCategory: '', adminNotes: '', deleteConfirm: '' })
    setModal({ action, guest: guest ?? selected })
  }

  async function confirmAction() {
    const { action, guest } = modal
    setLoading(true)
    try {
      const payload = { action }
      if (action === 'suspend') {
        payload.suspension_category = form.suspCategory
        payload.admin_notes         = form.adminNotes.trim()
      } else if (action === 'deactivate') {
        payload.admin_notes = form.adminNotes.trim()
      }

      const res  = await fetch(`/api/admin/guests/${guest.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')

      const now = new Date().toISOString()
      function applyAction(g) {
        if (action === 'suspend')     return { ...g, suspended_at: now, is_active: false, suspension_category: form.suspCategory }
        if (action === 'deactivate')  return { ...g, deleted_at:   now, is_active: false }
        if (action === 'reactivate')  return { ...g, suspended_at: null, is_active: true, suspension_category: null }
        return g
      }

      setGuests(prev => prev.map(g => g.id === guest.id ? applyAction(g) : g))
      if (selected?.id === guest.id) setSelected(applyAction)

      showToast(action === 'deactivate' ? 'Account deactivated.' : `Account ${action}d.`)
      setModal(null)
    } catch (e) {
      showToast(e.message, 'err')
    } finally {
      setLoading(false)
    }
  }

  const sel = selected  // shorthand for render

  /* ── render ── */
  return (
    <>
      <style>{STYLES}</style>
      <div className="gs-shell">

        {/* ── LEFT PANEL ── */}
        <div className="gs-left">

          {/* Topbar */}
          <div className="gs-topbar">
            <h1>Guests</h1>
            <button className="gs-export-btn" onClick={() => window.location.href = '/api/admin/exports?type=guests'}>
              Export CSV
            </button>
          </div>

          {/* Stats row */}
          <div className="gs-stats">
            {[
              { val: stats.total,                   lbl: 'Total Guests'  },
              { val: stats.active,                  lbl: 'Active'        },
              { val: stats.newThis,                 lbl: 'New (7d)'      },
              { val: stats.suspended, accent: true, lbl: 'Suspended'     },
              { val: stats.flagged,   accent: true, lbl: 'Flagged'       },
              { val: fmtMoney(stats.totalSpent),    lbl: 'Total Spent'   },
            ].map(({ val, lbl, accent }) => (
              <div className="gs-stat" key={lbl}>
                <div className="gs-stat-val" style={accent && val > 0 ? { color: '#F87171' } : {}}>{val}</div>
                <div className="gs-stat-lbl">{lbl}</div>
              </div>
            ))}
          </div>

          {/* Filter pills + search */}
          <div className="gs-filters">
            {FILTERS.map(f => (
              <button key={f} className={`gs-pill${filter === f ? ' act' : ''}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
            <input
              className="gs-search"
              placeholder="Search guests…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="gs-scroll">
            <div className="gs-table">
              <div className="gs-row hdr">
                <span>Guest / Customer</span>
                <span>Status</span>
                <span>Bookings</span>
                <span>Total Spent</span>
                <span>Joined</span>
                <span>Actions</span>
              </div>

              {filtered.length === 0 ? (
                <div className="gs-empty">No guests found</div>
              ) : filtered.map(g => {
                const badge = guestStatus(g)
                return (
                  <div
                    key={g.id}
                    className={`gs-row${sel?.id === g.id ? ' sel' : ''}`}
                    onClick={() => selectGuest(g)}
                  >
                    {/* Guest cell */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <Avatar name={g.full_name} email={g.email} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--sr-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {g.full_name ?? '—'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--sr-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {g.email}
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <span className="gs-badge" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                    </div>

                    {/* Bookings */}
                    <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{g.booking_count ?? 0}</div>

                    {/* Total Spent */}
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: g.total_spent > 0 ? 'var(--sr-text)' : 'var(--sr-sub)' }}>
                      {fmtMoney(g.total_spent)}
                    </div>

                    {/* Joined */}
                    <div style={{ fontSize: '0.76rem', color: 'var(--sr-muted)' }}>{fmtDate(g.created_at)}</div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 5 }} onClick={e => e.stopPropagation()}>
                      {canManage && !g.suspended_at && g.is_active && (
                        <button className="gs-btn gs-btn-susp" onClick={() => openModal('suspend', g)}>Suspend</button>
                      )}
                      {canReinstate && (!g.is_active || g.suspended_at) && (
                        <button className="gs-btn gs-btn-react" onClick={() => openModal('reactivate', g)}>Reinstate</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        {sel && (
          <div className="gs-right">

            {/* Panel header */}
            <div className="gs-panel-hdr">
              <Avatar name={sel.full_name} email={sel.email} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sel.full_name ?? sel.email}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--sr-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sel.email}
                </div>
              </div>
              <button
                onClick={() => { setSelected(null); setDetail(null) }}
                style={{ background: 'none', border: 'none', color: 'var(--sr-sub)', cursor: 'pointer', fontSize: '1.1rem', padding: '4px', lineHeight: 1, flexShrink: 0 }}
              >✕</button>
            </div>

            {/* Tabs */}
            <div className="gs-tabs">
              {TABS.map(t => (
                <button
                  key={t}
                  className={`gs-tab${tab === t.toLowerCase() ? ' act' : ''}`}
                  onClick={() => setTab(t.toLowerCase())}
                >{t}</button>
              ))}
            </div>

            {/* Tab content */}
            <div className="gs-tcontent">
              {detailLoading ? (
                <div className="gs-loading">Loading…</div>
              ) : (
                <>
                  {/* ── OVERVIEW ── */}
                  {tab === 'overview' && (
                    <div>
                      {/* Status badges */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                        {(() => { const b = guestStatus(sel); return <span className="gs-badge" style={{ background: b.bg, color: b.color }}>{b.label}</span> })()}
                        {sel.is_host && <span className="gs-badge" style={{ background: 'rgba(244,96,26,0.1)', color: 'var(--sr-orange)' }}>Host</span>}
                      </div>

                      {/* 4-stat grid */}
                      <div className="gs-grid2" style={{ marginBottom: 20 }}>
                        <div className="gs-stat-card">
                          <div className="v">{sel.booking_count ?? 0}</div>
                          <div className="l">Bookings</div>
                        </div>
                        <div className="gs-stat-card">
                          <div className="v">{fmtMoney(sel.total_spent)}</div>
                          <div className="l">Total Spent</div>
                        </div>
                        <div className="gs-stat-card">
                          <div className="v">
                            {sel.booking_count > 0 ? fmtMoney((sel.total_spent ?? 0) / sel.booking_count) : '—'}
                          </div>
                          <div className="l">Avg Booking</div>
                        </div>
                        <div className="gs-stat-card">
                          {(() => {
                            const score = riskScore(sel)
                            return (
                              <>
                                <div className="v" style={{ color: riskColor(score) }}>{score}</div>
                                <div className="l">Risk Score</div>
                              </>
                            )
                          })()}
                        </div>
                      </div>

                      {/* Action buttons */}
                      {(canManage || canReinstate) && (
                        <div className="gs-section">
                          <div className="gs-sec-title">Actions</div>
                          <div className="gs-actions">
                            {canManage && !sel.suspended_at && sel.is_active && <>
                              <button className="gs-btn gs-btn-susp" onClick={() => openModal('suspend', sel)}>Suspend</button>
                              <button className="gs-btn gs-btn-deact" onClick={() => openModal('deactivate', sel)}>Deactivate</button>
                            </>}
                            {canReinstate && (!sel.is_active || sel.suspended_at) && (
                              <button className="gs-btn gs-btn-react" onClick={() => openModal('reactivate', sel)}>Reinstate</button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Account details */}
                      <div className="gs-section">
                        <div className="gs-sec-title">Account Details</div>
                        <div className="gs-info-box">
                          {[
                            { lbl: 'User ID',    val: <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: 'var(--sr-muted)' }}>{sel.id.slice(0, 8)}…</span> },
                            { lbl: 'Email',      val: sel.email },
                            { lbl: 'Joined',     val: fmtDate(sel.created_at) },
                            { lbl: 'Account',    val: sel.is_host ? 'Host & Guest' : 'Guest' },
                            sel.suspended_at && { lbl: 'Suspended',   val: fmtDate(sel.suspended_at) },
                            sel.suspension_reason && { lbl: 'Susp. reason', val: sel.suspension_reason },
                          ].filter(Boolean).map(({ lbl, val }) => (
                            <div className="gs-info-row" key={lbl}>
                              <span className="gs-info-lbl">{lbl}</span>
                              <span className="gs-info-val">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Risk bar */}
                      <div className="gs-section">
                        <div className="gs-sec-title">Risk Indicator</div>
                        {(() => {
                          const score = riskScore(sel)
                          const color = riskColor(score)
                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--sr-muted)', marginBottom: 6 }}>
                                <span>Low Risk</span>
                                <span style={{ color, fontWeight: 700 }}>{score} / 100</span>
                                <span>High Risk</span>
                              </div>
                              <div className="gs-risk-bar">
                                <div className="gs-risk-fill" style={{ width: `${score}%`, background: color }} />
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  )}

                  {/* ── BOOKINGS ── */}
                  {tab === 'bookings' && (
                    <div>
                      {!detail?.bookings?.length ? (
                        <div style={{ textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.84rem', padding: '40px 0' }}>No bookings found</div>
                      ) : detail.bookings.map(b => {
                        const bs = BOOKING_STATUS[b.status] ?? { color: 'var(--sr-muted)', bg: 'rgba(107,94,82,0.1)' }
                        return (
                          <div className="gs-bcard" key={b.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--sr-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {b.listings?.title ?? 'Unknown Listing'}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--sr-muted)' }}>
                                  {[b.listings?.city, b.listings?.state].filter(Boolean).join(', ')}
                                </div>
                              </div>
                              <span className="gs-badge" style={{ background: bs.bg, color: bs.color, flexShrink: 0, marginLeft: 10 }}>
                                {b.status}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--sr-muted)' }}>
                              <span>{fmtDate(b.check_in)} → {fmtDate(b.check_out)}</span>
                              <span style={{ fontWeight: 600, color: 'var(--sr-text)' }}>{fmtMoney(b.total_amount)}</span>
                            </div>
                            {b.host && (
                              <div style={{ marginTop: 6, fontSize: '0.71rem', color: 'var(--sr-sub)' }}>
                                Host: {b.host.full_name ?? b.host.email}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ── SPEND ── */}
                  {tab === 'spend' && (
                    <div>
                      <div className="gs-section">
                        <div className="gs-sec-title">Spend Summary</div>
                        <div className="gs-grid2">
                          <div className="gs-stat-card">
                            <div className="v">{fmtMoney(sel.total_spent)}</div>
                            <div className="l">Total Spent</div>
                          </div>
                          <div className="gs-stat-card">
                            <div className="v">
                              {sel.booking_count > 0 ? fmtMoney((sel.total_spent ?? 0) / sel.booking_count) : '—'}
                            </div>
                            <div className="l">Avg / Booking</div>
                          </div>
                        </div>
                      </div>

                      {monthlySpend.length > 0 && (
                        <div className="gs-section">
                          <div className="gs-sec-title">Monthly Spend</div>
                          <div className="gs-bar">
                            {monthlySpend.map(({ month, value }) => (
                              <div className="gs-bar-col" key={month}>
                                <div className="gs-bar-fill" style={{ height: `${Math.max((value / maxSpend) * 64, 2)}px` }} />
                                <div className="gs-bar-lbl">{month}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {hostsBooked.length > 0 && (
                        <div className="gs-section">
                          <div className="gs-sec-title">Hosts Booked With</div>
                          <div className="gs-info-box">
                            {hostsBooked.map(h => (
                              <div className="gs-info-row" key={h.id}>
                                <span className="gs-info-lbl">{h.full_name ?? h.email}</span>
                                <span className="gs-info-val">{h.count} × {fmtMoney(h.total)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {payMethods.length > 0 && (
                        <div className="gs-section">
                          <div className="gs-sec-title">Payment Methods</div>
                          <div className="gs-info-box">
                            {payMethods.map(({ method, count }) => (
                              <div className="gs-info-row" key={method}>
                                <span className="gs-info-lbl" style={{ textTransform: 'capitalize' }}>{method}</span>
                                <span className="gs-info-val">{count}×</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!detail?.bookings?.length && (
                        <div style={{ textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.84rem', padding: '40px 0' }}>No spend data</div>
                      )}
                    </div>
                  )}

                  {/* ── ACTIVITY ── */}
                  {tab === 'activity' && (
                    <div>
                      {!detail?.auditLogs?.length ? (
                        <div style={{ textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.84rem', padding: '40px 0' }}>No activity recorded</div>
                      ) : (
                        <ul className="gs-timeline">
                          {detail.auditLogs.map(log => (
                            <li className="gs-tl-item" key={log.id}>
                              <div className="gs-tl-dot" />
                              <div className="gs-tl-body">
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sr-text)' }}>{log.action}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--sr-muted)', marginTop: 2 }}>by {log.actor_email}</div>
                                {log.admin_notes && (
                                  <div style={{ fontSize: '0.72rem', color: 'var(--sr-sub)', marginTop: 4, fontStyle: 'italic' }}>{log.admin_notes}</div>
                                )}
                                <div style={{ fontSize: '0.68rem', color: 'var(--sr-sub)', marginTop: 4 }}>{fmtDate(log.created_at)}</div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* ── ADMIN ── */}
                  {tab === 'admin' && (
                    <div>
                      <div className="gs-section">
                        <div className="gs-sec-title">Admin Controls</div>
                        {canManage || canReinstate ? (
                          <div className="gs-actions">
                            {canManage && !sel.suspended_at && sel.is_active && <>
                              <button className="gs-btn gs-btn-susp" onClick={() => openModal('suspend', sel)}>Suspend Account</button>
                              <button className="gs-btn gs-btn-deact" onClick={() => openModal('deactivate', sel)}>Deactivate Account</button>
                            </>}
                            {canReinstate && (!sel.is_active || sel.suspended_at) && (
                              <button className="gs-btn gs-btn-react" onClick={() => openModal('reactivate', sel)}>Reinstate Account</button>
                            )}
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.8rem', color: 'var(--sr-sub)' }}>Insufficient permissions.</p>
                        )}
                      </div>

                      <div className="gs-section">
                        <div className="gs-sec-title">Account Info</div>
                        <div className="gs-info-box">
                          {[
                            { lbl: 'User ID',  val: <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.68rem' }}>{sel.id}</span> },
                            { lbl: 'Active',   val: sel.is_active ? 'Yes' : 'No' },
                            detail?.guest?.admin_notes && { lbl: 'Admin notes', val: detail.guest.admin_notes },
                          ].filter(Boolean).map(({ lbl, val }) => (
                            <div className="gs-info-row" key={lbl}>
                              <span className="gs-info-lbl">{lbl}</span>
                              <span className="gs-info-val">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="gs-section">
                        <div className="gs-sec-title">Audit Log</div>
                        {!detail?.auditLogs?.length ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--sr-sub)' }}>No audit entries</div>
                        ) : (
                          <ul className="gs-timeline">
                            {detail.auditLogs.map(log => (
                              <li className="gs-tl-item" key={log.id}>
                                <div className="gs-tl-dot" style={{ background: '#4A3830' }} />
                                <div className="gs-tl-body">
                                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sr-text)' }}>{log.action}</div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--sr-muted)' }}>
                                    {log.actor_email} · {fmtDate(log.created_at)}
                                  </div>
                                  {log.admin_notes && (
                                    <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)', marginTop: 4 }}>{log.admin_notes}</div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      {modal && (
        <div className="gs-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="gs-modal">
            {modal.action === 'suspend' && <>
              <h2>Suspend Account</h2>
              <div className="gs-modal-sub">{modal.guest.full_name ?? modal.guest.email}</div>
              <div className="gs-warning">
                This will suspend the account and any hosted listings immediately. A notification will be sent to the user.
              </div>
              <div className="gs-field">
                <div className="gs-field-lbl">Reason <span className="req">*</span></div>
                <select
                  className="gs-select"
                  value={form.suspCategory}
                  onChange={e => setForm(f => ({ ...f, suspCategory: e.target.value }))}
                >
                  <option value="">— Select a reason —</option>
                  {SUSP_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="gs-field">
                <div className="gs-field-lbl">Internal notes <span className="req">*</span></div>
                <textarea
                  className="gs-textarea"
                  placeholder="Document the evidence or reasoning (not shown to user)…"
                  value={form.adminNotes}
                  onChange={e => setForm(f => ({ ...f, adminNotes: e.target.value }))}
                />
              </div>
            </>}

            {modal.action === 'deactivate' && <>
              <h2>Deactivate Account</h2>
              <div className="gs-modal-sub">{modal.guest.full_name ?? modal.guest.email}</div>
              <div className="gs-warning">
                This will soft-delete the account. The user loses access immediately. This action is logged.
              </div>
              <div className="gs-field">
                <div className="gs-field-lbl">Internal notes <span className="req">*</span></div>
                <textarea
                  className="gs-textarea"
                  placeholder="Reason for deactivation (internal)…"
                  value={form.adminNotes}
                  onChange={e => setForm(f => ({ ...f, adminNotes: e.target.value }))}
                />
              </div>
              <div className="gs-field">
                <div className="gs-field-lbl">Type DELETE to confirm <span className="req">*</span></div>
                <input
                  className="gs-input"
                  value={form.deleteConfirm}
                  onChange={e => setForm(f => ({ ...f, deleteConfirm: e.target.value }))}
                  placeholder="DELETE"
                />
              </div>
            </>}

            {modal.action === 'reactivate' && <>
              <h2>Reinstate Account</h2>
              <div className="gs-modal-sub">{modal.guest.full_name ?? modal.guest.email}</div>
              <div className="gs-success">
                This will restore account access and re-enable any previously-suspended listings.
              </div>
            </>}

            <div className="gs-mfooter">
              <button className="gs-mbtn gs-mbtn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button
                className={`gs-mbtn gs-mbtn-ok${modal.action === 'deactivate' ? ' danger' : modal.action === 'reactivate' ? ' success' : ''}`}
                disabled={
                  loading ||
                  (modal.action === 'suspend'    && (!form.suspCategory || !form.adminNotes.trim())) ||
                  (modal.action === 'deactivate' && (!form.adminNotes.trim() || form.deleteConfirm !== 'DELETE'))
                }
                onClick={confirmAction}
              >
                {loading ? 'Processing…' : modal.action === 'reactivate' ? 'Reinstate' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`gs-toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}
