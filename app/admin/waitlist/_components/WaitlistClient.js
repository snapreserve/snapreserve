'use client'
import { useState, useMemo } from 'react'

const STATUS_CONFIG = {
  pending:          { label: 'Pending',          color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  under_review:     { label: 'Under Review',     color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  approved:         { label: 'Approved',         color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  founder_assigned: { label: 'Founder',          color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  waitlisted:       { label: 'Waitlisted',       color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  rejected:         { label: 'Rejected',         color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  removed:          { label: 'Removed',          color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
  invited:          { label: 'Invited',          color: '#C084FC', bg: 'rgba(192,132,252,0.12)' },
}

const FILTER_PILLS = ['All', 'Pending', 'Under Review', 'Approved', 'Founder Assigned', 'Rejected', 'Removed', 'Invited']
const DETAIL_TABS  = ['Overview', 'Notes', 'Admin']

const REJECT_REASONS = [
  { value: 'not_qualified', label: 'Not qualified' },
  { value: 'duplicate',     label: 'Duplicate entry' },
  { value: 'spam',          label: 'Spam / fake' },
  { value: 'outside_market',label: 'Outside target market' },
  { value: 'other',         label: 'Other' },
]

const STYLES = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  .ws-shell { display:flex; height:100vh; overflow:hidden; background:var(--sr-bg); font-family:'DM Sans',sans-serif; color:var(--sr-text); }
  .ws-left  { flex:1; min-width:0; display:flex; flex-direction:column; overflow:hidden; }
  .ws-topbar { background:var(--sr-surface); border-bottom:1px solid var(--sr-border-solid); padding:14px 24px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; gap:12px; flex-wrap:wrap; }
  .ws-topbar h1 { font-size:1.1rem; font-weight:800; }
  .ws-topbar-right { display:flex; gap:8px; align-items:center; }

  /* Stats row */
  .ws-stats { display:flex; gap:8px; padding:12px 24px; flex-shrink:0; overflow-x:auto; }
  .ws-stat  { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:10px; padding:10px 14px; flex:1; min-width:76px; cursor:pointer; transition:border-color 0.13s; white-space:nowrap; }
  .ws-stat:hover { border-color:var(--sr-orange); }
  .ws-stat.active { border-color:var(--sr-orange); background:rgba(244,96,26,0.06); }
  .ws-stat-val { font-size:1.25rem; font-weight:800; line-height:1; }
  .ws-stat-lbl { font-size:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:var(--sr-sub); margin-top:4px; }

  /* Filters */
  .ws-filters { display:flex; gap:6px; padding:0 24px 11px; flex-shrink:0; flex-wrap:wrap; align-items:center; }
  .ws-pill { background:transparent; border:1px solid var(--sr-border-solid); border-radius:20px; padding:4px 13px; font-size:0.7rem; font-weight:700; color:var(--sr-muted); cursor:pointer; font-family:inherit; transition:all 0.13s; white-space:nowrap; }
  .ws-pill:hover { border-color:var(--sr-orange); color:var(--sr-orange); }
  .ws-pill.act { background:var(--sr-orange); border-color:var(--sr-orange); color:#fff; }
  .ws-secondary-filters { display:flex; gap:8px; padding:0 24px 11px; flex-shrink:0; flex-wrap:wrap; align-items:center; }
  .ws-filter-sel { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:8px; padding:5px 10px; font-size:0.76rem; color:var(--sr-text); font-family:inherit; outline:none; cursor:pointer; }
  .ws-filter-sel:focus { border-color:var(--sr-orange); }
  .ws-toggle { display:flex; align-items:center; gap:6px; font-size:0.72rem; color:var(--sr-muted); cursor:pointer; padding:4px 10px; border:1px solid var(--sr-border-solid); border-radius:8px; background:var(--sr-surface); font-family:inherit; transition:all 0.13s; }
  .ws-toggle.active { color:var(--sr-orange); border-color:rgba(244,96,26,0.4); background:rgba(244,96,26,0.06); }
  .ws-search { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:8px; padding:6px 12px; color:var(--sr-text); font-size:0.82rem; outline:none; min-width:180px; font-family:inherit; margin-left:auto; }
  .ws-search:focus { border-color:var(--sr-orange); }

  /* Bulk bar */
  .ws-bulk { display:flex; align-items:center; gap:8px; padding:8px 24px; flex-shrink:0; background:rgba(244,96,26,0.07); border-bottom:1px solid rgba(244,96,26,0.18); flex-wrap:wrap; }
  .ws-bulk-count { font-size:0.78rem; font-weight:700; color:var(--sr-orange); }

  /* Table */
  .ws-scroll { flex:1; overflow-y:auto; padding:0 24px 24px; }
  .ws-table  { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:12px; overflow:hidden; margin-top:12px; }
  .ws-row    { display:grid; grid-template-columns:24px 2fr 1.6fr 0.9fr 1fr 1fr 0.8fr 0.7fr; gap:8px; padding:10px 18px; border-bottom:1px solid var(--sr-border-solid); align-items:center; cursor:pointer; transition:background 0.1s; }
  .ws-row:last-child { border-bottom:none; }
  .ws-row.hdr { background:var(--sr-bg); cursor:default; }
  .ws-row.hdr span { font-size:0.62rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-sub); }
  .ws-row:not(.hdr):hover { background:rgba(244,96,26,0.04); }
  .ws-row.sel { background:rgba(244,96,26,0.07); border-left:3px solid var(--sr-orange); }
  .ws-row.removed-row { opacity:0.5; text-decoration:line-through; }
  .ws-empty { padding:60px 20px; text-align:center; color:var(--sr-sub); font-size:0.84rem; }
  .ws-cb { width:14px; height:14px; cursor:pointer; accent-color:var(--sr-orange); }
  .ws-name { font-size:0.83rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ws-sub  { font-size:0.68rem; color:var(--sr-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ws-email { font-size:0.78rem; color:#C084FC; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ws-badge { display:inline-flex; align-items:center; padding:2px 8px; border-radius:20px; font-size:0.64rem; font-weight:700; }
  .ws-date  { font-size:0.72rem; color:var(--sr-sub); }
  .ws-founder-icon { font-size:0.85rem; }

  /* Right panel */
  .ws-right       { width:440px; flex-shrink:0; border-left:1px solid var(--sr-border-solid); display:flex; flex-direction:column; overflow:hidden; background:var(--sr-surface); }
  .ws-panel-empty { flex:1; display:flex; align-items:center; justify-content:center; color:var(--sr-sub); font-size:0.84rem; text-align:center; padding:40px; }
  .ws-panel-hdr   { padding:14px 18px; border-bottom:1px solid var(--sr-border-solid); flex-shrink:0; }
  .ws-panel-name  { font-size:1rem; font-weight:800; }
  .ws-panel-email { font-size:0.8rem; color:#C084FC; margin-top:2px; }
  .ws-dtabs       { display:flex; border-bottom:1px solid var(--sr-border-solid); flex-shrink:0; }
  .ws-dtab        { flex:1; padding:9px 4px; font-size:0.6rem; font-weight:700; text-align:center; cursor:pointer; color:var(--sr-sub); border-bottom:2px solid transparent; font-family:inherit; background:none; border-top:none; border-left:none; border-right:none; transition:all 0.13s; text-transform:uppercase; letter-spacing:0.05em; }
  .ws-dtab.act    { color:var(--sr-orange); border-bottom-color:var(--sr-orange); }
  .ws-tcontent    { flex:1; overflow-y:auto; padding:18px; }

  /* Info rows */
  .ws-info-box    { background:var(--sr-bg); border-radius:10px; padding:4px 14px; margin-bottom:14px; }
  .ws-info-row    { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--sr-surface); font-size:0.82rem; }
  .ws-info-row:last-child { border-bottom:none; }
  .ws-info-lbl    { color:var(--sr-sub); font-size:0.74rem; }
  .ws-info-val    { color:var(--sr-text); font-weight:500; font-size:0.8rem; text-align:right; max-width:60%; word-break:break-word; }
  .ws-sec-title   { font-size:0.64rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-sub); margin-bottom:8px; margin-top:16px; }
  .ws-actions     { display:flex; gap:6px; flex-wrap:wrap; margin-top:14px; }
  .ws-btn         { padding:6px 12px; border-radius:8px; font-size:0.74rem; font-weight:700; cursor:pointer; border:1px solid transparent; font-family:inherit; transition:all 0.13s; }
  .ws-btn-approve { background:rgba(52,211,153,0.1); color:#34D399; border-color:rgba(52,211,153,0.3); }
  .ws-btn-approve:hover { background:rgba(52,211,153,0.2); }
  .ws-btn-reject  { background:rgba(248,113,113,0.1); color:#F87171; border-color:rgba(248,113,113,0.3); }
  .ws-btn-reject:hover  { background:rgba(248,113,113,0.2); }
  .ws-btn-remove  { background:rgba(239,68,68,0.08); color:#EF4444; border-color:rgba(239,68,68,0.2); }
  .ws-btn-remove:hover  { background:rgba(239,68,68,0.15); }
  .ws-btn-founder { background:rgba(245,158,11,0.1); color:#F59E0B; border-color:rgba(245,158,11,0.3); }
  .ws-btn-founder:hover { background:rgba(245,158,11,0.2); }
  .ws-btn-invite  { background:rgba(192,132,252,0.1); color:#C084FC; border-color:rgba(192,132,252,0.3); }
  .ws-btn-invite:hover  { background:rgba(192,132,252,0.2); }
  .ws-btn-ghost   { background:transparent; color:var(--sr-muted); border-color:var(--sr-border-solid); }
  .ws-btn-ghost:hover { background:rgba(255,255,255,0.06); color:var(--sr-text); }

  /* Notes timeline */
  .ws-tl { list-style:none; }
  .ws-tl-item { display:flex; gap:10px; padding-bottom:14px; position:relative; }
  .ws-tl-item::before { content:''; position:absolute; left:5px; top:14px; bottom:0; width:1px; background:var(--sr-border-solid); }
  .ws-tl-item:last-child::before { display:none; }
  .ws-tl-dot  { width:11px; height:11px; border-radius:50%; background:var(--sr-orange); flex-shrink:0; margin-top:3px; }
  .ws-tl-body { flex:1; }
  .ws-tl-meta { font-size:0.68rem; color:var(--sr-sub); margin-bottom:3px; }
  .ws-tl-txt  { font-size:0.8rem; color:var(--sr-text); line-height:1.45; }
  .ws-note-form { margin-top:16px; }
  .ws-textarea { width:100%; background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:10px 12px; color:var(--sr-text); font-size:0.84rem; resize:vertical; min-height:80px; outline:none; font-family:inherit; }
  .ws-textarea:focus { border-color:var(--sr-orange); }

  /* Modal */
  .ws-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; }
  .ws-modal   { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:16px; padding:28px; width:100%; max-width:480px; max-height:90vh; overflow-y:auto; }
  .ws-modal h2 { font-size:1rem; font-weight:800; margin-bottom:4px; }
  .ws-modal-sub { font-size:0.84rem; color:var(--sr-muted); margin-bottom:18px; }
  .ws-field    { margin-bottom:14px; }
  .ws-field-lbl { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:var(--sr-sub); margin-bottom:6px; }
  .ws-select  { width:100%; background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:10px 12px; color:var(--sr-text); font-size:0.85rem; outline:none; font-family:inherit; cursor:pointer; }
  .ws-select:focus { border-color:var(--sr-orange); }
  .ws-input   { width:100%; background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:10px 12px; color:var(--sr-text); font-size:0.85rem; outline:none; font-family:inherit; }
  .ws-input:focus { border-color:var(--sr-orange); }
  .ws-warning { background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.25); border-radius:8px; padding:10px 14px; font-size:0.82rem; color:#F87171; margin-bottom:14px; }
  .ws-mfooter { display:flex; gap:10px; margin-top:20px; justify-content:flex-end; }
  .ws-mbtn    { padding:8px 20px; border-radius:8px; font-size:0.84rem; font-weight:700; cursor:pointer; border:1px solid transparent; font-family:inherit; }
  .ws-mbtn-cancel { background:var(--sr-border-solid); color:var(--sr-muted); }
  .ws-mbtn-ok     { background:var(--sr-orange); color:#fff; }
  .ws-mbtn-ok.danger  { background:#EF4444; }
  .ws-mbtn-ok.success { background:#16A34A; }
  .ws-mbtn-ok:disabled { opacity:0.5; cursor:not-allowed; }

  /* Mono / admin tab */
  .ws-mono { font-size:0.74rem; font-family:monospace; color:var(--sr-orange); background:rgba(244,96,26,0.08); padding:2px 8px; border-radius:6px; word-break:break-all; }
  .ws-danger-zone { background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:14px; margin-top:20px; }
  .ws-danger-title { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#F87171; margin-bottom:10px; }

  /* Btn sizes */
  .ws-btn-sm { padding:5px 10px; font-size:0.7rem; }
  .ws-btn-export { background:var(--sr-border-solid); border:1px solid #3A3028; border-radius:8px; padding:6px 13px; color:var(--sr-text); font-size:0.76rem; font-weight:600; cursor:pointer; font-family:inherit; }
  .ws-btn-export:hover { border-color:var(--sr-orange); }

  .ws-toast    { position:fixed; bottom:24px; right:24px; background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:10px; padding:12px 18px; font-size:0.84rem; font-weight:600; z-index:200; }
  .ws-toast.ok  { border-color:rgba(74,222,128,0.4); color:#4ADE80; }
  .ws-toast.err { border-color:rgba(248,113,113,0.4); color:#F87171; }

  @media(max-width:1300px){ .ws-row { grid-template-columns:24px 2fr 1.6fr 0.9fr 1fr 0.8fr 0.7fr; } .ws-row>*:nth-child(8){display:none;} }
  @media(max-width:1100px){ .ws-row { grid-template-columns:24px 2fr 1.4fr 0.9fr 1fr 0.7fr; } .ws-row>*:nth-child(7){display:none;} }
  @media(max-width:900px) { .ws-right { display:none; } }
`

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span className="ws-badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function RoleBadge({ role }) {
  const colors = { host: ['var(--sr-ol)', 'var(--sr-orange)'], traveler: ['var(--sr-bluel)', 'var(--sr-blue)'], guest: ['var(--sr-bluel)', 'var(--sr-blue)'], both: ['rgba(192,132,252,0.12)', '#C084FC'] }
  const [bg, color] = colors[role] ?? ['rgba(156,163,175,0.12)', '#9CA3AF']
  return <span className="ws-badge" style={{ background: bg, color }}>{role || '—'}</span>
}

function pillStatus(pill) {
  const map = {
    'All': 'all',
    'Pending': 'pending',
    'Under Review': 'under_review',
    'Approved': 'approved',
    'Founder Assigned': 'founder_assigned',
    'Rejected': 'rejected',
    'Removed': 'removed',
    'Invited': 'invited',
  }
  return map[pill] ?? 'all'
}

export default function WaitlistClient({ initialEntries, total, initialStats, role, canAssignFounder }) {
  const [entries, setEntries]         = useState(initialEntries)
  const [stats, setStats]             = useState(initialStats)
  const [selected, setSelected]       = useState(null) // selected entry id
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [detailTab, setDetailTab]     = useState('Overview')
  const [detailData, setDetailData]   = useState(null) // { entry, notes }
  const [detailLoading, setDetailLoading] = useState(false)

  // Filters
  const [filter, setFilter]           = useState('All')
  const [roleFilter, setRoleFilter]   = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [founderEligOnly, setFounderEligOnly] = useState(false)
  const [search, setSearch]           = useState('')

  // Modals
  const [modal, setModal]             = useState(null) // { type, entry }
  const [modalNote, setModalNote]     = useState('')
  const [modalReason, setModalReason] = useState('')
  const [modalFounderRegion, setModalFounderRegion] = useState('')
  const [modalFounderSpot, setModalFounderSpot] = useState('')
  const [modalLoading, setModalLoading] = useState(false)

  // Notes
  const [newNote, setNewNote]         = useState('')
  const [noteLoading, setNoteLoading] = useState(false)

  const [toast, setToast]             = useState(null)

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Derived list
  const filtered = useMemo(() => {
    const statusVal = pillStatus(filter)
    return entries.filter(e => {
      if (statusVal !== 'all' && e.status !== statusVal) return false
      if (roleFilter !== 'all' && e.role !== roleFilter) return false
      if (countryFilter !== 'all' && e.country !== countryFilter) return false
      if (founderEligOnly && !e.founder_eligible) return false
      if (search) {
        const q = search.toLowerCase()
        if (!((e.email || '').toLowerCase().includes(q) ||
              (e.first_name || '').toLowerCase().includes(q) ||
              (e.last_name || '').toLowerCase().includes(q) ||
              (e.city || '').toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [entries, filter, roleFilter, countryFilter, founderEligOnly, search])

  const countries = useMemo(() => {
    const set = new Set(entries.map(e => e.country).filter(Boolean))
    return ['all', ...Array.from(set).sort()]
  }, [entries])

  // Row select / checkboxes
  function toggleRowCheck(id, e) {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(e => e.id)))
    }
  }

  // Open detail panel
  async function openEntry(entry) {
    if (selected === entry.id) { setSelected(null); setDetailData(null); return }
    setSelected(entry.id)
    setDetailTab('Overview')
    setDetailData(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/waitlist/${entry.id}`)
      const data = await res.json()
      setDetailData(data)
    } catch {
      setDetailData({ entry, notes: [] })
    } finally {
      setDetailLoading(false)
    }
  }

  // Mutate a single entry in state
  function patchEntry(id, patch) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
    if (detailData?.entry?.id === id) {
      setDetailData(prev => ({ ...prev, entry: { ...prev.entry, ...patch } }))
    }
  }

  // --- API calls ---
  async function callAction(id, action, extra = {}) {
    const res = await fetch(`/api/admin/waitlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Failed')
    return data.entry
  }

  async function handleApprove() {
    setModalLoading(true)
    try {
      const entry = await callAction(modal.entry.id, 'approve')
      patchEntry(modal.entry.id, entry)
      showToast('Entry approved')
      setModal(null)
    } catch (err) { showToast(err.message, 'err') }
    finally { setModalLoading(false) }
  }

  async function handleReject() {
    setModalLoading(true)
    try {
      const entry = await callAction(modal.entry.id, 'reject', { reason: modalReason })
      patchEntry(modal.entry.id, entry)
      showToast('Entry rejected')
      setModal(null)
    } catch (err) { showToast(err.message, 'err') }
    finally { setModalLoading(false) }
  }

  async function handleRemove() {
    setModalLoading(true)
    try {
      const entry = await callAction(modal.entry.id, 'remove')
      patchEntry(modal.entry.id, entry)
      showToast('Entry removed')
      setModal(null)
    } catch (err) { showToast(err.message, 'err') }
    finally { setModalLoading(false) }
  }

  async function handleAssignFounder() {
    setModalLoading(true)
    try {
      const entry = await callAction(modal.entry.id, 'assign_founder', {
        founder_region: modalFounderRegion,
        founder_spot_number: modalFounderSpot ? parseInt(modalFounderSpot) : null,
      })
      patchEntry(modal.entry.id, entry)
      showToast('Founder spot assigned')
      setModal(null)
    } catch (err) { showToast(err.message, 'err') }
    finally { setModalLoading(false) }
  }

  async function handleRevokeFounder() {
    setModalLoading(true)
    try {
      const entry = await callAction(modal.entry.id, 'revoke_founder')
      patchEntry(modal.entry.id, entry)
      showToast('Founder status revoked')
      setModal(null)
    } catch (err) { showToast(err.message, 'err') }
    finally { setModalLoading(false) }
  }

  async function handleSetFounderEligible(id, val) {
    try {
      const entry = await callAction(id, val ? 'set_founder_eligible' : 'unset_founder_eligible')
      patchEntry(id, entry)
      showToast(val ? 'Marked founder eligible' : 'Removed founder eligibility')
    } catch (err) { showToast(err.message, 'err') }
  }

  async function submitNote() {
    if (!newNote.trim() || !selected) return
    setNoteLoading(true)
    try {
      const res = await fetch(`/api/admin/waitlist/${selected}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setDetailData(prev => ({ ...prev, notes: [...(prev.notes ?? []), data.note] }))
      setNewNote('')
      showToast('Note added')
    } catch (err) { showToast(err.message, 'err') }
    finally { setNoteLoading(false) }
  }

  async function handleBulk(action) {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    try {
      const res = await fetch('/api/admin/waitlist/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      // Update local state
      let patch = {}
      if (action === 'approve') patch = { status: 'approved' }
      if (action === 'reject') patch = { status: 'rejected' }
      if (action === 'remove') patch = { status: 'removed', removed_at: new Date().toISOString() }
      if (action === 'set_founder_eligible') patch = { founder_eligible: true }
      setEntries(prev => prev.map(e => selectedIds.has(e.id) ? { ...e, ...patch } : e))
      setSelectedIds(new Set())
      showToast(`${data.affected} entries updated`)
    } catch (err) { showToast(err.message, 'err') }
  }

  function exportCSV() {
    const rows = [
      ['#','First Name','Last Name','Email','City','State','Country','Role','Property Type','Status','Founder Eligible','Founder Assigned','Founder Region','Founder Spot','Referral Code','Referred By','Signup Source','Signed up'],
      ...filtered.map((e, i) => [
        i+1, e.first_name||'', e.last_name||'', e.email, e.city||'', e.state||'', e.country||'',
        e.role||'', e.property_type||'', e.status||'pending',
        e.founder_eligible?'Yes':'No', e.founder_assigned?'Yes':'No',
        e.founder_region||'', e.founder_spot_number||'',
        e.referral_code||'', e.referred_by||'', e.signup_source||'',
        new Date(e.created_at).toLocaleString(),
      ])
    ]
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a    = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `waitlist-${new Date().toISOString().slice(0,10)}.csv`,
    })
    a.click()
  }

  function openModal(type, entry) {
    setModal({ type, entry })
    setModalNote('')
    setModalReason('')
    setModalFounderRegion(entry?.founder_region ?? '')
    setModalFounderSpot(entry?.founder_spot_number ?? '')
    setModalLoading(false)
  }

  const selEntry = detailData?.entry ?? entries.find(e => e.id === selected) ?? null

  return (
    <>
      <style>{STYLES}</style>

      <div className="ws-shell">
        {/* LEFT PANE */}
        <div className="ws-left">
          {/* Top bar */}
          <div className="ws-topbar">
            <h1>Waitlist Management</h1>
            <div className="ws-topbar-right">
              <button className="ws-btn-export" onClick={exportCSV}>Export CSV</button>
            </div>
          </div>

          {/* Stats row */}
          <div className="ws-stats">
            {[
              { key: 'total',          label: 'Total',     val: stats.total },
              { key: 'hosts',          label: 'Hosts',     val: stats.hosts },
              { key: 'travelers',      label: 'Travelers', val: stats.travelers },
              { key: 'both',           label: 'Both',      val: stats.both },
              { key: 'pending',        label: 'Pending',   val: stats.pending },
              { key: 'founderEligible',label: 'Eligible',  val: stats.founderEligible },
              { key: 'founderAssigned',label: 'Founder',   val: stats.founderAssigned },
              { key: 'intl',           label: 'Intl',      val: stats.intl },
              { key: 'invited',        label: 'Invited',   val: stats.invited },
            ].map(s => (
              <div
                key={s.key}
                className={`ws-stat${filter === s.key ? ' active' : ''}`}
                onClick={() => {
                  const pillMap = { hosts:'All', travelers:'All', both:'All', pending:'Pending', founderEligible:'All', founderAssigned:'Founder Assigned', intl:'All', invited:'Invited', total:'All' }
                  setFilter(pillMap[s.key] ?? 'All')
                  if (s.key === 'founderEligible') setFounderEligOnly(true)
                  if (s.key !== 'founderEligible') setFounderEligOnly(false)
                  if (s.key === 'hosts') setRoleFilter('host')
                  else if (s.key === 'travelers') setRoleFilter('traveler')
                  else if (s.key === 'both') setRoleFilter('both')
                  else if (s.key !== 'hosts' && s.key !== 'travelers' && s.key !== 'both') setRoleFilter('all')
                  if (s.key === 'intl') setCountryFilter('international')
                  else setCountryFilter('all')
                }}
              >
                <div className="ws-stat-val">{s.val}</div>
                <div className="ws-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter pills */}
          <div className="ws-filters">
            {FILTER_PILLS.map(p => (
              <button key={p} className={`ws-pill${filter === p ? ' act' : ''}`} onClick={() => setFilter(p)}>
                {p}
              </button>
            ))}
          </div>

          {/* Secondary filters */}
          <div className="ws-secondary-filters">
            <select className="ws-filter-sel" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="all">All roles</option>
              <option value="host">Host</option>
              <option value="traveler">Traveler</option>
              <option value="both">Both</option>
            </select>
            <select className="ws-filter-sel" value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
              {countries.map(c => <option key={c} value={c}>{c === 'all' ? 'All countries' : c}</option>)}
            </select>
            <button
              className={`ws-toggle${founderEligOnly ? ' active' : ''}`}
              onClick={() => setFounderEligOnly(p => !p)}
            >
              {founderEligOnly ? '✓' : ''} Founder Eligible Only
            </button>
            <input
              className="ws-search"
              placeholder="Search name, email, city…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="ws-bulk">
              <span className="ws-bulk-count">{selectedIds.size} selected</span>
              <button className="ws-btn ws-btn-approve ws-btn-sm" onClick={() => handleBulk('approve')}>Approve</button>
              <button className="ws-btn ws-btn-reject ws-btn-sm"  onClick={() => handleBulk('reject')}>Reject</button>
              <button className="ws-btn ws-btn-remove ws-btn-sm"  onClick={() => handleBulk('remove')}>Remove</button>
              {canAssignFounder && (
                <button className="ws-btn ws-btn-founder ws-btn-sm" onClick={() => handleBulk('set_founder_eligible')}>Mark Eligible</button>
              )}
              <button className="ws-btn-export ws-btn-sm" style={{marginLeft:'auto'}} onClick={exportCSV}>Export CSV</button>
            </div>
          )}

          {/* Table */}
          <div className="ws-scroll">
            <div style={{fontSize:'0.72rem',color:'var(--sr-sub)',marginBottom:4}}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </div>
            <div className="ws-table">
              <div className="ws-row hdr">
                <input type="checkbox" className="ws-cb" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                <span>Name / City</span>
                <span>Email</span>
                <span>Role</span>
                <span>Status</span>
                <span>Founder</span>
                <span>Signup Date</span>
                <span>Country</span>
              </div>

              {filtered.length === 0 ? (
                <div className="ws-empty">No entries match your filters.</div>
              ) : filtered.map(e => (
                <div
                  key={e.id}
                  className={`ws-row${selected === e.id ? ' sel' : ''}${e.status === 'removed' ? ' removed-row' : ''}`}
                  onClick={() => openEntry(e)}
                >
                  <input type="checkbox" className="ws-cb" checked={selectedIds.has(e.id)} onChange={ev => toggleRowCheck(e.id, ev)} />
                  <div style={{minWidth:0}}>
                    <div className="ws-name">{[e.first_name, e.last_name].filter(Boolean).join(' ') || <span style={{color:'var(--sr-sub)',fontStyle:'italic'}}>—</span>}</div>
                    {e.city && <div className="ws-sub">{e.city}{e.state ? `, ${e.state}` : ''}</div>}
                  </div>
                  <div className="ws-email">{e.email}</div>
                  <div><RoleBadge role={e.role} /></div>
                  <div><StatusBadge status={e.status || 'pending'} /></div>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                    {e.founder_eligible && <span className="ws-founder-icon" title="Founder Eligible">⭐</span>}
                    {e.founder_assigned && <span className="ws-founder-icon" title="Founder Assigned" style={{color:'#F59E0B'}}>🏅</span>}
                  </div>
                  <div className="ws-date">{fmtDate(e.created_at)}</div>
                  <div className="ws-sub">{e.country || 'US'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANE */}
        <div className="ws-right">
          {!selected ? (
            <div className="ws-panel-empty">
              <div>
                <div style={{fontSize:'1.5rem',marginBottom:8}}>👈</div>
                <div>Select an entry to view details</div>
              </div>
            </div>
          ) : (
            <>
              <div className="ws-panel-hdr">
                <div className="ws-panel-name">
                  {selEntry ? [selEntry.first_name, selEntry.last_name].filter(Boolean).join(' ') || '(no name)' : '…'}
                </div>
                {selEntry && <div className="ws-panel-email">{selEntry.email}</div>}
                {selEntry && <div style={{marginTop:6,display:'flex',gap:6,flexWrap:'wrap'}}>
                  <StatusBadge status={selEntry.status || 'pending'} />
                  {selEntry.founder_assigned && <span className="ws-badge" style={{background:'rgba(245,158,11,0.15)',color:'#F59E0B'}}>🏅 Founder</span>}
                </div>}
              </div>

              {/* Detail tabs */}
              <div className="ws-dtabs">
                {DETAIL_TABS.map(t => (
                  <button key={t} className={`ws-dtab${detailTab === t ? ' act' : ''}`} onClick={() => setDetailTab(t)}>
                    {t}
                  </button>
                ))}
              </div>

              <div className="ws-tcontent">
                {detailLoading ? (
                  <div style={{color:'var(--sr-sub)',fontSize:'0.84rem',textAlign:'center',paddingTop:40}}>Loading…</div>
                ) : !selEntry ? null : detailTab === 'Overview' ? (
                  <>
                    {/* Contact info */}
                    <div className="ws-sec-title" style={{marginTop:0}}>Contact</div>
                    <div className="ws-info-box">
                      <div className="ws-info-row"><span className="ws-info-lbl">Full Name</span><span className="ws-info-val">{[selEntry.first_name, selEntry.last_name].filter(Boolean).join(' ') || '—'}</span></div>
                      <div className="ws-info-row"><span className="ws-info-lbl">Email</span><span className="ws-info-val" style={{color:'#C084FC'}}>{selEntry.email}</span></div>
                      <div className="ws-info-row"><span className="ws-info-lbl">City</span><span className="ws-info-val">{selEntry.city || '—'}</span></div>
                      <div className="ws-info-row"><span className="ws-info-lbl">State</span><span className="ws-info-val">{selEntry.state || '—'}</span></div>
                      <div className="ws-info-row"><span className="ws-info-lbl">Country</span><span className="ws-info-val">{selEntry.country || '—'}</span></div>
                      <div className="ws-info-row"><span className="ws-info-lbl">Role</span><span className="ws-info-val"><RoleBadge role={selEntry.role} /></span></div>
                      <div className="ws-info-row"><span className="ws-info-lbl">Property Type</span><span className="ws-info-val">{selEntry.property_type || '—'}</span></div>
                      <div className="ws-info-row"><span className="ws-info-lbl">Interest</span><span className="ws-info-val">{selEntry.interest || '—'}</span></div>
                      <div className="ws-info-row"><span className="ws-info-lbl">Source</span><span className="ws-info-val">{selEntry.signup_source || '—'}</span></div>
                      <div className="ws-info-row"><span className="ws-info-lbl">Signed Up</span><span className="ws-info-val">{fmtDate(selEntry.created_at)}</span></div>
                    </div>

                    {/* Founder info */}
                    <div className="ws-sec-title">Founder Status</div>
                    <div className="ws-info-box">
                      <div className="ws-info-row"><span className="ws-info-lbl">Eligible</span><span className="ws-info-val" style={{color:selEntry.founder_eligible?'#F59E0B':'var(--sr-sub)'}}>{selEntry.founder_eligible ? 'Yes ⭐' : 'No'}</span></div>
                      <div className="ws-info-row"><span className="ws-info-lbl">Assigned</span><span className="ws-info-val" style={{color:selEntry.founder_assigned?'#F59E0B':'var(--sr-sub)'}}>{selEntry.founder_assigned ? 'Yes 🏅' : 'No'}</span></div>
                      <div className="ws-info-row"><span className="ws-info-lbl">Region</span><span className="ws-info-val">{selEntry.founder_region || '—'}</span></div>
                      <div className="ws-info-row"><span className="ws-info-lbl">Spot #</span><span className="ws-info-val">{selEntry.founder_spot_number ?? '—'}</span></div>
                    </div>

                    {/* Actions */}
                    <div className="ws-sec-title">Actions</div>
                    <div className="ws-actions">
                      {selEntry.status !== 'approved' && selEntry.status !== 'founder_assigned' && (
                        <button className="ws-btn ws-btn-approve" onClick={() => openModal('approve', selEntry)}>Approve</button>
                      )}
                      {selEntry.status !== 'rejected' && (
                        <button className="ws-btn ws-btn-reject" onClick={() => openModal('reject', selEntry)}>Reject</button>
                      )}
                      {selEntry.status !== 'removed' && (
                        <button className="ws-btn ws-btn-remove" onClick={() => openModal('remove', selEntry)}>Remove</button>
                      )}
                      {canAssignFounder && !selEntry.founder_assigned && (
                        <button className="ws-btn ws-btn-founder" onClick={() => openModal('assign_founder', selEntry)}>Assign Founder</button>
                      )}
                      {canAssignFounder && selEntry.founder_assigned && (
                        <button className="ws-btn ws-btn-ghost" onClick={() => openModal('revoke_founder', selEntry)}>Revoke Founder</button>
                      )}
                      {canAssignFounder && !selEntry.founder_eligible && !selEntry.founder_assigned && (
                        <button className="ws-btn ws-btn-ghost ws-btn-sm" onClick={() => handleSetFounderEligible(selEntry.id, true)}>Mark Eligible</button>
                      )}
                    </div>
                  </>
                ) : detailTab === 'Notes' ? (
                  <>
                    <div className="ws-sec-title" style={{marginTop:0}}>Admin Notes</div>
                    {(!detailData?.notes || detailData.notes.length === 0) ? (
                      <div style={{color:'var(--sr-sub)',fontSize:'0.82rem',padding:'20px 0'}}>No notes yet.</div>
                    ) : (
                      <ul className="ws-tl">
                        {detailData.notes.map(n => (
                          <li key={n.id} className="ws-tl-item">
                            <div className="ws-tl-dot" />
                            <div className="ws-tl-body">
                              <div className="ws-tl-meta">{n.admin_name} · {fmtDate(n.created_at)}</div>
                              <div className="ws-tl-txt">{n.note}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="ws-note-form">
                      <textarea
                        className="ws-textarea"
                        placeholder="Add a note…"
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                      />
                      <div style={{marginTop:8,display:'flex',justifyContent:'flex-end'}}>
                        <button
                          className="ws-btn ws-btn-approve"
                          disabled={!newNote.trim() || noteLoading}
                          onClick={submitNote}
                        >
                          {noteLoading ? 'Saving…' : 'Add Note'}
                        </button>
                      </div>
                    </div>
                  </>
                ) : detailTab === 'Admin' ? (
                  <>
                    <div className="ws-sec-title" style={{marginTop:0}}>Raw Fields</div>
                    <div className="ws-info-box">
                      <div className="ws-info-row"><span className="ws-info-lbl">Entry ID</span><span className="ws-info-val"><span className="ws-mono">{selEntry.id}</span></span></div>
                      <div className="ws-info-row"><span className="ws-info-lbl">Referral Code</span><span className="ws-info-val"><span className="ws-mono">{selEntry.referral_code || '—'}</span></span></div>
                      <div className="ws-info-row"><span className="ws-info-lbl">Referred By</span><span className="ws-info-val"><span className="ws-mono">{selEntry.referred_by || '—'}</span></span></div>
                      <div className="ws-info-row"><span className="ws-info-lbl">Removed At</span><span className="ws-info-val">{selEntry.removed_at ? fmtDate(selEntry.removed_at) : '—'}</span></div>
                      <div className="ws-info-row"><span className="ws-info-lbl">Admin Notes</span><span className="ws-info-val" style={{fontStyle:'italic',color:'var(--sr-muted)'}}>{selEntry.admin_notes || '—'}</span></div>
                    </div>

                    {role === 'super_admin' && (
                      <div className="ws-danger-zone">
                        <div className="ws-danger-title">Danger Zone</div>
                        <button className="ws-btn ws-btn-remove ws-btn-sm" onClick={() => openModal('remove', selEntry)}>
                          Hard Remove Entry
                        </button>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      {/* === MODALS === */}
      {modal && (
        <div className="ws-overlay" onClick={() => setModal(null)}>
          <div className="ws-modal" onClick={e => e.stopPropagation()}>

            {modal.type === 'approve' && (
              <>
                <h2>Approve Entry</h2>
                <div className="ws-modal-sub">Approve {modal.entry.email} — they will be marked as approved.</div>
                <div className="ws-mfooter">
                  <button className="ws-mbtn ws-mbtn-cancel" onClick={() => setModal(null)}>Cancel</button>
                  <button className="ws-mbtn ws-mbtn-ok success" disabled={modalLoading} onClick={handleApprove}>
                    {modalLoading ? 'Approving…' : 'Approve'}
                  </button>
                </div>
              </>
            )}

            {modal.type === 'reject' && (
              <>
                <h2>Reject Entry</h2>
                <div className="ws-modal-sub">Reject {modal.entry.email} from the waitlist.</div>
                <div className="ws-field">
                  <div className="ws-field-lbl">Reason</div>
                  <select className="ws-select" value={modalReason} onChange={e => setModalReason(e.target.value)}>
                    <option value="">Select reason…</option>
                    {REJECT_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="ws-mfooter">
                  <button className="ws-mbtn ws-mbtn-cancel" onClick={() => setModal(null)}>Cancel</button>
                  <button className="ws-mbtn ws-mbtn-ok danger" disabled={modalLoading} onClick={handleReject}>
                    {modalLoading ? 'Rejecting…' : 'Reject'}
                  </button>
                </div>
              </>
            )}

            {modal.type === 'remove' && (
              <>
                <h2>Remove Entry</h2>
                <div className="ws-warning">This will soft-delete the entry (marked as removed). The data is preserved.</div>
                <div className="ws-modal-sub">Remove {modal.entry.email} from the waitlist?</div>
                <div className="ws-mfooter">
                  <button className="ws-mbtn ws-mbtn-cancel" onClick={() => setModal(null)}>Cancel</button>
                  <button className="ws-mbtn ws-mbtn-ok danger" disabled={modalLoading} onClick={handleRemove}>
                    {modalLoading ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </>
            )}

            {modal.type === 'assign_founder' && (
              <>
                <h2>Assign Founder Spot</h2>
                <div className="ws-modal-sub">Assign a US Founder Host spot to {modal.entry.email}.</div>
                <div className="ws-field">
                  <div className="ws-field-lbl">Region</div>
                  <input className="ws-input" placeholder="e.g. Northeast, Southeast, West Coast…" value={modalFounderRegion} onChange={e => setModalFounderRegion(e.target.value)} />
                </div>
                <div className="ws-field">
                  <div className="ws-field-lbl">Spot Number</div>
                  <input className="ws-input" type="number" min="1" placeholder="e.g. 1" value={modalFounderSpot} onChange={e => setModalFounderSpot(e.target.value)} />
                </div>
                <div className="ws-mfooter">
                  <button className="ws-mbtn ws-mbtn-cancel" onClick={() => setModal(null)}>Cancel</button>
                  <button className="ws-mbtn ws-mbtn-ok" style={{background:'#F59E0B'}} disabled={modalLoading} onClick={handleAssignFounder}>
                    {modalLoading ? 'Assigning…' : 'Assign Founder Spot'}
                  </button>
                </div>
              </>
            )}

            {modal.type === 'revoke_founder' && (
              <>
                <h2>Revoke Founder Status</h2>
                <div className="ws-warning">This will remove the Founder Host designation from {modal.entry.email} and reset their status to Approved.</div>
                <div className="ws-mfooter">
                  <button className="ws-mbtn ws-mbtn-cancel" onClick={() => setModal(null)}>Cancel</button>
                  <button className="ws-mbtn ws-mbtn-ok danger" disabled={modalLoading} onClick={handleRevokeFounder}>
                    {modalLoading ? 'Revoking…' : 'Revoke Founder'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {toast && <div className={`ws-toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}
