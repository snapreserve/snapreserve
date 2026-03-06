'use client'
import { useState, useMemo } from 'react'

/* ── helpers ── */
const AVATAR_COLORS = [
  '#1e3a8a','#065f46','#78350f','#4c1d95','#831843',
  '#14532d','#7c2d12','#064e3b','#1e40af','#0f766e','#9f1239',
]
function avatarColor(str = '') {
  const sum = str.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}
function getInitials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}
function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  return Math.max(0, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000))
}
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtShort(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtMoney(n) {
  if (n == null || n === '') return '—'
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const STATUS_CFG = {
  confirmed:  { label: 'Confirmed',   cls: 'b-confirmed',  dot: '#22c55e' },
  pending:    { label: 'Pending',     cls: 'b-pending',    dot: '#f59e0b' },
  cancelled:  { label: 'Cancelled',   cls: 'b-cancelled',  dot: '#ef4444' },
  completed:  { label: 'Completed',   cls: 'b-completed',  dot: '#7a7670' },
  dispute:    { label: 'Dispute',     cls: 'b-dispute',    dot: '#a855f7' },
  refunded:   { label: 'Refunded',    cls: 'b-refunded',   dot: '#06b6d4' },
  checked_in: { label: 'Checked In',  cls: 'b-checkin',    dot: '#3b82f6' },
}
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { label: status ?? '—', cls: 'b-pending', dot: '#f59e0b' }
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
}

const TYPE_EMOJI = { hotel: '🏨', private: '🏠', villa: '🌴', cabin: '🏔️' }
const TYPE_BG    = { hotel: '#1e3a8a', private: '#065f46', villa: '#14532d', cabin: '#78350f' }
function listingEmoji(t) { return TYPE_EMOJI[t?.toLowerCase()] ?? '🏠' }
function listingBg(t)    { return TYPE_BG[t?.toLowerCase()]    ?? '#1e3a8a' }

/* ── CSS ── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600;700&display=swap');
:root{
  --bg:#0f0e0c;--bg2:#151412;--bg3:#1a1916;--bg4:#212019;
  --border:#2a2825;--border2:#383533;
  --text:#e8e3dc;--muted:#7a7670;--sub:#4a4845;
  --orange:#e8622a;--orangelt:rgba(232,98,42,.12);--orangeborder:rgba(232,98,42,.28);
  --blue:#3b82f6;--bluelt:rgba(59,130,246,.12);--blueborder:rgba(59,130,246,.28);
  --green:#22c55e;--greenlt:rgba(34,197,94,.12);--greenborder:rgba(34,197,94,.28);
  --yellow:#f59e0b;--yellowlt:rgba(245,158,11,.12);--yellowborder:rgba(245,158,11,.28);
  --red:#ef4444;--redlt:rgba(239,68,68,.12);--redborder:rgba(239,68,68,.28);
  --purple:#a855f7;--purplelt:rgba(168,85,247,.12);--purpleborder:rgba(168,85,247,.28);
  --cyan:#06b6d4;--cyanlt:rgba(6,182,212,.12);--cyanborder:rgba(6,182,212,.28);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
.b-shell{display:flex;flex-direction:column;height:100vh;overflow:hidden;font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);font-size:13px}
/* topbar */
.b-topbar{height:48px;padding:0 24px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.b-path{font-size:11px;color:var(--sub);display:flex;align-items:center;gap:6px}
.b-path b{color:var(--text);font-weight:600}
.b-topright{display:flex;gap:8px}
.b-icon-btn{width:30px;height:30px;border-radius:7px;border:1px solid var(--border);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--muted);transition:all .14s}
.b-icon-btn:hover{border-color:var(--border2);color:var(--text)}
/* body */
.b-body{flex:1;display:flex;overflow:hidden}
.b-main{flex:1;overflow-y:auto;padding:20px 24px;min-width:0}
/* page header */
.b-page-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.b-page-title{font-size:18px;font-weight:700;color:var(--text);margin-bottom:2px}
.b-page-sub{font-size:11px;color:var(--muted)}
/* stats */
.b-stats{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:18px}
.b-stat{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:13px 15px;transition:border-color .14s}
.b-stat:hover{border-color:var(--border2)}
.b-stat-lbl{font-size:8px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--sub);margin-bottom:7px}
.b-stat-val{font-size:20px;font-weight:700;font-family:'DM Mono',monospace;line-height:1}
/* filters */
.b-filters{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.b-search-w{position:relative;flex:0 0 260px}
.b-s-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--sub)}
.b-s-input{width:100%;padding:7px 12px 7px 30px;background:var(--bg2);border:1px solid var(--border);border-radius:7px;font-family:'DM Sans',sans-serif;font-size:12px;color:var(--text);outline:none;transition:all .15s}
.b-s-input:focus{border-color:var(--border2);background:var(--bg3)}
.b-s-input::placeholder{color:var(--sub)}
.b-pill{padding:5px 11px;border-radius:100px;font-size:10px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:'DM Sans',sans-serif;display:inline-flex;align-items:center;gap:4px;transition:all .13s}
.b-pill:hover{border-color:var(--border2);color:var(--text)}
.b-pill.on{background:var(--orangelt);border-color:var(--orangeborder);color:var(--orange)}
.b-pill-n{background:var(--bg4);padding:1px 5px;border-radius:100px;font-size:8px;font-weight:700}
.b-pill.on .b-pill-n{background:var(--orangeborder)}
.b-csv-btn{padding:6px 13px;background:var(--bg2);border:1px solid var(--border);border-radius:7px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;cursor:pointer;color:var(--muted);transition:all .13s}
.b-csv-btn:hover{border-color:var(--border2);color:var(--text)}
/* table */
.b-tbl{background:var(--bg2);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.b-tbl-head{display:grid;grid-template-columns:2.2fr 1.4fr 1fr 0.7fr 1fr 1.1fr 1.2fr;border-bottom:1px solid var(--border);padding:0 16px}
.b-th{padding:9px 10px;font-size:8px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--sub)}
.b-tbl-body{display:flex;flex-direction:column}
.b-tr{display:grid;grid-template-columns:2.2fr 1.4fr 1fr 0.7fr 1fr 1.1fr 1.2fr;border-bottom:1px solid var(--border);padding:0 16px;cursor:pointer;transition:background .12s}
.b-tr:last-child{border:none}
.b-tr:hover{background:rgba(255,255,255,.02)}
.b-tr.sel{background:var(--orangelt);border-left:2px solid var(--orange)}
.b-td{padding:11px 10px;display:flex;align-items:center;font-size:11px;min-width:0}
/* listing cell */
.b-listing-cell{display:flex;align-items:center;gap:10px;min-width:0}
.b-lc-thumb{width:36px;height:36px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px}
.b-lc-name{font-size:11px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.b-lc-ref{font-size:9px;color:var(--muted);font-family:'DM Mono',monospace;margin-top:1px}
.b-lc-type{font-size:8px;font-weight:600;padding:1px 6px;border-radius:100px;display:inline-flex;align-items:center;gap:2px;margin-top:2px}
.lct-hotel{background:var(--bluelt);color:var(--blue)}
.lct-priv{background:var(--orangelt);color:var(--orange)}
/* guest cell */
.b-guest-cell{display:flex;align-items:center;gap:8px;min-width:0}
.b-gc-av{width:26px;height:26px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700}
.b-gc-name{font-size:11px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.b-gc-email{font-size:9px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* badges */
.badge{display:inline-flex;align-items:center;gap:3px;padding:3px 7px;border-radius:100px;font-size:9px;font-weight:700;white-space:nowrap}
.b-confirmed{background:var(--greenlt);color:var(--green);border:1px solid var(--greenborder)}
.b-pending{background:var(--yellowlt);color:var(--yellow);border:1px solid var(--yellowborder)}
.b-cancelled{background:var(--redlt);color:var(--red);border:1px solid var(--redborder)}
.b-completed{background:var(--bg3);color:var(--muted);border:1px solid var(--border)}
.b-dispute{background:var(--purplelt);color:var(--purple);border:1px solid var(--purpleborder)}
.b-refunded{background:var(--cyanlt);color:var(--cyan);border:1px solid var(--cyanborder)}
.b-checkin{background:var(--bluelt);color:var(--blue);border:1px solid var(--blueborder)}
/* action btns */
.b-act-btns{display:flex;gap:5px}
.b-a-btn{padding:4px 8px;border-radius:5px;font-family:'DM Sans',sans-serif;font-size:9px;font-weight:600;cursor:pointer;transition:all .13s;border:1px solid var(--border);background:transparent;color:var(--muted)}
.b-a-btn:hover{border-color:var(--border2);color:var(--text)}
.b-a-btn.view{background:var(--bluelt);border-color:var(--blueborder);color:var(--blue)}
.b-a-btn.b-flag{background:var(--redlt);border-color:var(--redborder);color:var(--red)}
.b-a-btn.b-cancel-sm{background:var(--redlt);border-color:var(--redborder);color:var(--red)}
/* pagination */
.b-pag{display:flex;align-items:center;justify-content:space-between;padding:11px 16px;border-top:1px solid var(--border)}
.b-pag-info{font-size:10px;color:var(--muted)}
.b-empty{padding:48px;text-align:center;color:var(--sub);font-size:0.84rem}
/* detail panel */
.b-panel{width:420px;flex-shrink:0;background:var(--bg2);border-left:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;animation:dpIn .2s ease}
@keyframes dpIn{from{transform:translateX(16px);opacity:0}to{transform:translateX(0);opacity:1}}
.b-panel-hd{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.b-panel-hd-title{font-size:12px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px}
.b-panel-ref{font-size:10px;font-family:'DM Mono',monospace;color:var(--muted)}
.b-panel-close{width:24px;height:24px;border-radius:5px;border:1px solid var(--border);background:transparent;cursor:pointer;color:var(--muted);font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .13s}
.b-panel-close:hover{border-color:var(--border2);color:var(--text)}
.b-panel-tabs{display:flex;border-bottom:1px solid var(--border);padding:0 18px;flex-shrink:0;gap:0}
.b-panel-tab{padding:10px 12px;font-size:11px;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;border:none;background:none;transition:all .13s;font-family:'DM Sans',sans-serif;margin-bottom:-1px}
.b-panel-tab:hover{color:var(--text)}
.b-panel-tab.on{color:var(--orange);border-bottom:2px solid var(--orange)}
.b-panel-body{flex:1;overflow-y:auto;padding:18px}
.b-panel-loading{text-align:center;color:var(--sub);padding:40px 0;font-size:0.88rem}
/* panel sections */
.b-dp-hero{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px}
.b-dph-prop{display:flex;align-items:center;gap:12px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border)}
.b-dph-thumb{width:48px;height:48px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.b-dph-name{font-size:13px;font-weight:700;color:var(--text);margin-bottom:3px}
.b-dph-loc{font-size:10px;color:var(--muted)}
.b-dph-badges{display:flex;gap:5px;flex-wrap:wrap}
.b-info-chip{background:var(--bg4);color:var(--muted);border:1px solid var(--border);font-size:9px;font-weight:600;padding:3px 7px;border-radius:100px;display:inline-flex;align-items:center;gap:3px}
.b-dph-host{display:flex;align-items:center;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}
.b-dph-hav{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0}
.b-dph-hname{font-size:11px;font-weight:600;color:var(--text)}
.b-dph-hrole{font-size:9px;color:var(--muted)}
.b-dp-sec{margin-bottom:18px}
.b-dp-sec-ttl{font-size:8px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--sub);margin-bottom:10px;display:flex;align-items:center;gap:7px}
.b-dp-sec-ttl::after{content:'';flex:1;height:1px;background:var(--border)}
.b-dp-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)}
.b-dp-row:last-child{border:none}
.b-dp-rl{font-size:11px;color:var(--muted)}
.b-dp-rv{font-size:11px;font-weight:600;color:var(--text);font-family:'DM Mono',monospace;text-align:right}
/* admin actions */
.b-aa-row{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.b-aa-btn{flex:1;min-width:80px;padding:8px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:10px;font-weight:600;cursor:pointer;transition:all .15s;text-align:center;border:1px solid var(--border);background:transparent;color:var(--muted)}
.b-aa-btn:hover{border-color:var(--border2);color:var(--text)}
.b-aa-btn.aa-refund{background:var(--cyanlt);border-color:var(--cyanborder);color:var(--cyan)}
.b-aa-btn.aa-cancel{background:var(--redlt);border-color:var(--redborder);color:var(--red)}
.b-aa-btn.aa-flag{background:var(--purplelt);border-color:var(--purpleborder);color:var(--purple)}
/* note / flag boxes */
.b-note-box{background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;font-size:11px;color:var(--muted);line-height:1.65}
.b-flag-box{background:var(--redlt);border:1px solid var(--redborder);border-radius:8px;padding:10px;font-size:11px;color:var(--red);line-height:1.65;margin-bottom:12px}
/* payment */
.b-pay-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)}
.b-pay-row:last-child{border:none}
.b-pay-lbl{font-size:11px;color:var(--muted)}
.b-pay-val{font-size:11px;font-weight:600;color:var(--text);font-family:'DM Mono',monospace}
.b-pay-total{background:var(--bg3);border-radius:8px;padding:10px 12px;margin-top:8px;display:flex;align-items:center;justify-content:space-between}
.b-pay-total-lbl{font-size:11px;font-weight:700;color:var(--text)}
.b-pay-total-val{font-size:15px;font-weight:700;color:var(--green);font-family:'DM Mono',monospace}
/* timeline */
.b-timeline{display:flex;flex-direction:column}
.b-tl-item{display:flex;gap:12px}
.b-tl-left{display:flex;flex-direction:column;align-items:center;width:24px;flex-shrink:0}
.b-tl-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:3px;border:2px solid var(--bg3)}
.b-tl-line{flex:1;width:1px;background:var(--border);margin:4px 0}
.b-tl-item:last-child .b-tl-line{display:none}
.b-tl-content{padding-bottom:14px;flex:1}
.b-tl-event{font-size:11px;font-weight:600;color:var(--text);margin-bottom:1px}
.b-tl-detail{font-size:10px;color:var(--muted);line-height:1.5}
.b-tl-time{font-size:9px;color:var(--sub);font-family:'DM Mono',monospace;margin-top:2px}
/* link btns */
.b-link-btn{padding:9px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--muted);font-family:'DM Sans',sans-serif;font-size:10px;font-weight:600;cursor:pointer;transition:all .13s;width:100%}
.b-link-btn:hover{color:var(--text);border-color:var(--border2)}
/* modal */
.b-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}
.b-modal{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:28px;width:100%;max-width:440px}
.b-modal h2{font-size:1rem;font-weight:700;color:var(--text);margin-bottom:8px}
.b-modal p{font-size:0.84rem;color:var(--muted);margin-bottom:16px}
.b-modal textarea{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:0.85rem;resize:vertical;min-height:80px;outline:none;font-family:'DM Sans',sans-serif}
.b-modal textarea:focus{border-color:var(--orange)}
.b-modal-footer{display:flex;gap:10px;margin-top:16px;justify-content:flex-end}
.b-m-cancel-btn{background:var(--bg3);color:var(--muted);border:1px solid var(--border);border-radius:8px;padding:8px 18px;font-size:0.84rem;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
.b-m-confirm-btn{background:var(--red);color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:0.84rem;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
.b-m-confirm-btn:disabled{opacity:0.5;cursor:not-allowed}
/* toast */
.b-toast{position:fixed;bottom:24px;right:24px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px 18px;font-size:0.84rem;font-weight:500;z-index:10000;color:var(--text)}
.b-toast.success{border-color:rgba(34,197,94,0.4);color:var(--green)}
.b-toast.error{border-color:rgba(239,68,68,0.4);color:var(--red)}
/* scrollbars */
.b-main::-webkit-scrollbar,.b-panel-body::-webkit-scrollbar{width:3px}
.b-main::-webkit-scrollbar-track,.b-panel-body::-webkit-scrollbar-track{background:transparent}
.b-main::-webkit-scrollbar-thumb,.b-panel-body::-webkit-scrollbar-thumb{background:var(--border2);border-radius:100px}
`

export default function BookingsClient({ initialBookings, role }) {
  const [bookings, setBookings] = useState(initialBookings)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [selectedId, setSelectedId]   = useState(null)
  const [panelData, setPanelData]     = useState(null)
  const [panelLoading, setPanelLoading] = useState(false)
  const [activeTab, setActiveTab]     = useState('overview')
  const [cancelModal, setCancelModal] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling]   = useState(false)
  const [toast, setToast] = useState(null)

  const canCancel = role === 'admin' || role === 'super_admin'

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── computed stats ── */
  const stats = useMemo(() => {
    const confirmed = bookings.filter(b => b.status === 'confirmed').length
    const pending   = bookings.filter(b => b.status === 'pending').length
    const cancelled = bookings.filter(b => b.status === 'cancelled').length
    const dispute   = bookings.filter(b => b.status === 'dispute').length
    const gmv = bookings
      .filter(b => ['confirmed', 'completed', 'checked_in'].includes(b.status))
      .reduce((s, b) => s + (parseFloat(b.total_amount) || 0), 0)
    return { total: bookings.length, confirmed, pending, cancelled, dispute, gmv }
  }, [bookings])

  const counts = useMemo(() => {
    const c = {}
    bookings.forEach(b => { c[b.status] = (c[b.status] || 0) + 1 })
    return c
  }, [bookings])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return bookings.filter(b => {
      const matchQ = !q || (
        b.listings?.title?.toLowerCase().includes(q) ||
        b.reference?.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.guest?.email?.toLowerCase().includes(q) ||
        b.guest?.full_name?.toLowerCase().includes(q)
      )
      const matchF = filter === 'all' || b.status === filter
      return matchQ && matchF
    })
  }, [bookings, search, filter])

  /* ── panel ── */
  async function openPanel(bookingId) {
    setSelectedId(bookingId)
    setActiveTab('overview')
    setPanelLoading(true)
    setPanelData(null)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`)
      if (res.ok) setPanelData(await res.json())
    } catch (_) {}
    finally { setPanelLoading(false) }
  }

  function closePanel() { setSelectedId(null); setPanelData(null) }

  /* ── cancel ── */
  async function confirmCancel() {
    if (!cancelModal || !cancelReason.trim()) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/admin/bookings/${cancelModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason: cancelReason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      setBookings(prev => prev.map(b => b.id === cancelModal.id ? { ...b, status: 'cancelled' } : b))
      if (selectedId === cancelModal.id) setPanelData(prev => prev ? { ...prev, status: 'cancelled' } : null)
      showToast('Booking cancelled')
      setCancelModal(null)
    } catch (e) {
      showToast(e.message, 'error')
    } finally { setCancelling(false) }
  }

  const panelBooking = panelData ?? bookings.find(b => b.id === selectedId)

  const FILTERS = [
    { key: 'all',        label: 'All',        count: bookings.length },
    { key: 'confirmed',  label: 'Confirmed',  count: counts.confirmed },
    { key: 'pending',    label: 'Pending',    count: counts.pending },
    { key: 'checked_in', label: 'Checked In', count: counts.checked_in },
    { key: 'cancelled',  label: 'Cancelled',  count: counts.cancelled },
    { key: 'dispute',    label: '⚠ Dispute',  count: counts.dispute },
    { key: 'refunded',   label: 'Refunded',   count: counts.refunded },
    { key: 'completed',  label: 'Completed',  count: counts.completed },
  ]

  return (
    <>
      <style>{CSS}</style>
      <div className="b-shell">

        {/* Topbar */}
        <div className="b-topbar">
          <div className="b-path">Admin <span style={{ margin: '0 4px', color: 'var(--sub)' }}>/</span> <b>Bookings</b></div>
          <div className="b-topright">
            <button className="b-icon-btn" title="Export CSV" onClick={() => window.location.href = '/api/admin/exports?type=bookings'}>⬇</button>
          </div>
        </div>

        <div className="b-body">

          {/* ── Main ── */}
          <div className="b-main">

            {/* Page header */}
            <div className="b-page-hd">
              <div>
                <h1 className="b-page-title">Bookings</h1>
                <p className="b-page-sub">Full booking ledger — all hosts, guests, and transactions</p>
              </div>
            </div>

            {/* Stats */}
            <div className="b-stats">
              {[
                { label: 'Total Bookings', val: stats.total.toLocaleString(),     color: 'var(--text)' },
                { label: 'Confirmed',      val: stats.confirmed.toLocaleString(), color: 'var(--green)' },
                { label: 'Pending',        val: stats.pending.toLocaleString(),   color: 'var(--yellow)' },
                { label: 'Cancelled',      val: stats.cancelled.toLocaleString(), color: 'var(--red)' },
                { label: 'In Dispute',     val: stats.dispute.toLocaleString(),   color: 'var(--purple)' },
                { label: 'GMV (Total)',    val: fmtMoney(stats.gmv),              color: 'var(--orange)' },
              ].map(s => (
                <div key={s.label} className="b-stat">
                  <div className="b-stat-lbl">{s.label}</div>
                  <div className="b-stat-val" style={{ color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="b-filters">
              <div className="b-search-w">
                <span className="b-s-icon">🔍</span>
                <input
                  className="b-s-input"
                  placeholder="Search listing, guest email, or booking ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`b-pill${filter === f.key ? ' on' : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                  {f.count > 0 && <span className="b-pill-n">{f.count}</span>}
                </button>
              ))}
              <div style={{ marginLeft: 'auto' }}>
                <button className="b-csv-btn" onClick={() => window.location.href = '/api/admin/exports?type=bookings'}>
                  ⬇ Export CSV
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="b-tbl">
              <div className="b-tbl-head">
                <div className="b-th">Listing</div>
                <div className="b-th">Guest</div>
                <div className="b-th">Dates</div>
                <div className="b-th">Nights</div>
                <div className="b-th">Total</div>
                <div className="b-th">Status</div>
                <div className="b-th">Actions</div>
              </div>
              <div className="b-tbl-body">
                {filtered.length === 0 ? (
                  <div className="b-empty">No bookings found</div>
                ) : filtered.map(b => {
                  const nights    = b.nights ?? nightsBetween(b.check_in, b.check_out)
                  const guestName = b.guest?.full_name ?? 'Unknown Guest'
                  const guestEmail = b.guest?.email ?? '—'
                  return (
                    <div
                      key={b.id}
                      className={`b-tr${selectedId === b.id ? ' sel' : ''}`}
                      onClick={() => openPanel(b.id)}
                    >
                      {/* Listing */}
                      <div className="b-td">
                        <div className="b-listing-cell">
                          <div className="b-lc-thumb" style={{ background: listingBg(b.listings?.type) }}>
                            {listingEmoji(b.listings?.type)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="b-lc-name">{b.listings?.title ?? 'Unknown Listing'}</div>
                            <div className="b-lc-ref">{b.reference ?? b.id.slice(0, 8)}</div>
                            <span className={`b-lc-type ${b.listings?.type === 'hotel' ? 'lct-hotel' : 'lct-priv'}`}>
                              {b.listings?.type === 'hotel' ? '🏨 Hotel' : '🏠 Private'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Guest */}
                      <div className="b-td">
                        <div className="b-guest-cell">
                          <div className="b-gc-av" style={{ background: avatarColor(b.guest_id), color: '#fff' }}>
                            {getInitials(guestName)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="b-gc-name">{guestName}</div>
                            <div className="b-gc-email">{guestEmail}</div>
                          </div>
                        </div>
                      </div>
                      {/* Dates */}
                      <div className="b-td">
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '10px', color: 'var(--muted)' }}>
                          {fmtShort(b.check_in)}<br />→ {fmtShort(b.check_out)}
                        </span>
                      </div>
                      {/* Nights */}
                      <div className="b-td">
                        <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>{nights}n</span>
                      </div>
                      {/* Total */}
                      <div className="b-td">
                        <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmtMoney(b.total_amount)}</span>
                      </div>
                      {/* Status */}
                      <div className="b-td"><StatusBadge status={b.status} /></div>
                      {/* Actions */}
                      <div className="b-td">
                        <div className="b-act-btns">
                          <button className="b-a-btn view" onClick={e => { e.stopPropagation(); openPanel(b.id) }}>View</button>
                          {b.status === 'dispute' && (
                            <button className="b-a-btn b-flag" onClick={e => { e.stopPropagation(); openPanel(b.id) }}>Review</button>
                          )}
                          {canCancel && !['cancelled', 'completed', 'dispute', 'refunded'].includes(b.status) && (
                            <button className="b-a-btn b-cancel-sm" onClick={e => { e.stopPropagation(); setCancelReason(''); setCancelModal(b) }}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="b-pag">
                <div className="b-pag-info">
                  Showing <strong>{filtered.length}</strong> of <strong>{bookings.length}</strong> bookings
                </div>
              </div>
            </div>
          </div>

          {/* ── Detail Panel ── */}
          {selectedId && (
            <div className="b-panel">
              <div className="b-panel-hd">
                <div className="b-panel-hd-title">
                  Booking Detail
                  <span className="b-panel-ref">{panelBooking?.reference ?? selectedId?.slice(0, 8)}</span>
                </div>
                <button className="b-panel-close" onClick={closePanel}>✕</button>
              </div>
              <div className="b-panel-tabs">
                {['overview', 'payment', 'timeline', 'messages', 'admin'].map(tab => (
                  <button
                    key={tab}
                    className={`b-panel-tab${activeTab === tab ? ' on' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              <div className="b-panel-body">
                {panelLoading && !panelBooking
                  ? <div className="b-panel-loading">Loading…</div>
                  : panelBooking
                    ? <PanelContent
                        booking={panelBooking}
                        tab={activeTab}
                        canCancel={canCancel}
                        onCancel={() => { setCancelReason(''); setCancelModal(panelBooking) }}
                      />
                    : null
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Cancel Modal ── */}
      {cancelModal && (
        <div className="b-overlay" onClick={e => e.target === e.currentTarget && !cancelling && setCancelModal(null)}>
          <div className="b-modal">
            <h2>Cancel Booking</h2>
            <p>{cancelModal.listings?.title ?? 'Booking'} · {cancelModal.reference ?? cancelModal.id?.slice(0, 8)}</p>
            <textarea
              placeholder="Reason for cancellation (required)…"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            />
            <div className="b-modal-footer">
              <button className="b-m-cancel-btn" onClick={() => setCancelModal(null)} disabled={cancelling}>Back</button>
              <button className="b-m-confirm-btn" disabled={cancelling || !cancelReason.trim()} onClick={confirmCancel}>
                {cancelling ? 'Cancelling…' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`b-toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}

/* ── Panel Content ── */
function PanelContent({ booking: b, tab, canCancel, onCancel }) {
  const nights       = b.nights ?? nightsBetween(b.check_in, b.check_out)
  const serviceFee   = parseFloat(b.service_fee   ?? 0)
  const cleaningFee  = parseFloat(b.cleaning_fee  ?? 0)
  const totalAmount  = parseFloat(b.total_amount  ?? 0)
  const pricePerNight = parseFloat(b.price_per_night ?? b.listings?.price_per_night ?? 0)
  const platformFee  = serviceFee
  const hostPayout   = Math.max(0, totalAmount - serviceFee)
  const baseCost     = pricePerNight * nights
  const taxes        = Math.max(0, totalAmount - baseCost - cleaningFee - serviceFee)

  const guestName  = b.guest?.full_name ?? 'Unknown Guest'
  const guestEmail = b.guest?.email ?? '—'
  const hostName   = b.host?.full_name ?? 'Unknown Host'
  const hostEmail  = b.host?.email ?? '—'

  if (tab === 'overview') return (
    <div>
      {/* Hero */}
      <div className="b-dp-hero">
        <div className="b-dph-prop">
          <div className="b-dph-thumb" style={{ background: listingBg(b.listings?.type) }}>
            {listingEmoji(b.listings?.type)}
          </div>
          <div>
            <div className="b-dph-name">{b.listings?.title ?? 'Unknown Listing'}</div>
            <div className="b-dph-loc">📍 {[b.listings?.city, b.listings?.state].filter(Boolean).join(', ') || '—'}</div>
            <div style={{ marginTop: '6px' }}><StatusBadge status={b.status} /></div>
          </div>
        </div>
        <div className="b-dph-badges">
          <span className="b-info-chip">📅 {fmtShort(b.check_in)} → {fmtShort(b.check_out)}</span>
          <span className="b-info-chip">🌙 {nights} night{nights !== 1 ? 's' : ''}</span>
          <span className="b-info-chip">👥 {b.guests ?? '—'} guest{b.guests !== 1 ? 's' : ''}</span>
        </div>
        <div className="b-dph-host">
          <div className="b-dph-hav" style={{ background: avatarColor(b.host_id ?? ''), color: '#fff' }}>
            {getInitials(hostName)}
          </div>
          <div>
            <div className="b-dph-hname">Host: {hostName}</div>
            <div className="b-dph-hrole">{hostEmail}</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span className={`b-lc-type ${b.listings?.type === 'hotel' ? 'lct-hotel' : 'lct-priv'}`}>
              {b.listings?.type === 'hotel' ? '🏨 Hotel' : '🏠 Private'}
            </span>
          </div>
        </div>
      </div>

      {/* Flag */}
      {b.admin_cancel_reason && (
        <div className="b-flag-box">⚠️ Admin cancelled: {b.admin_cancel_reason}</div>
      )}

      {/* Actions */}
      <div className="b-aa-row">
        {canCancel && !['cancelled', 'completed', 'refunded'].includes(b.status) && (
          <button className="b-aa-btn aa-cancel" onClick={onCancel}>✗ Cancel</button>
        )}
        <button className="b-aa-btn aa-flag">🚩 Flag</button>
      </div>

      <div className="b-dp-sec">
        <div className="b-dp-sec-ttl">Guest Details</div>
        {[
          ['Name',    guestName],
          ['Email',   guestEmail],
          ['Guests',  b.guests ?? '—'],
          ['Payment', b.payment_provider ?? '—'],
          ['Created', fmtDate(b.created_at)],
        ].map(([l, v]) => (
          <div key={l} className="b-dp-row">
            <span className="b-dp-rl">{l}</span>
            <span className="b-dp-rv" style={{ fontFamily: 'inherit' }}>{v}</span>
          </div>
        ))}
      </div>

      <div className="b-dp-sec">
        <div className="b-dp-sec-ttl">Booking Details</div>
        {[
          ['Booking ID',   b.reference ?? b.id?.slice(0, 8)],
          ['Check-in',     fmtDate(b.check_in)],
          ['Check-out',    fmtDate(b.check_out)],
          ['Duration',     `${nights} night${nights !== 1 ? 's' : ''}`],
          ['Cancellation', b.cancellation_policy ?? '—'],
          ['Type',         b.listings?.type === 'hotel' ? 'Hotel' : 'Private Stay'],
        ].map(([l, v]) => (
          <div key={l} className="b-dp-row">
            <span className="b-dp-rl">{l}</span>
            <span className="b-dp-rv">{v}</span>
          </div>
        ))}
      </div>

      {b.special_requests && (
        <div className="b-dp-sec">
          <div className="b-dp-sec-ttl">Special Requests</div>
          <div className="b-note-box">{b.special_requests}</div>
        </div>
      )}
    </div>
  )

  if (tab === 'payment') return (
    <div>
      <div className="b-aa-row">
        <button className="b-aa-btn aa-refund">↩ Issue Refund</button>
        <button className="b-aa-btn aa-flag">🔍 Audit</button>
      </div>
      <div className="b-dp-sec">
        <div className="b-dp-sec-ttl">Payment Breakdown</div>
        {pricePerNight > 0 && (
          <div className="b-pay-row">
            <span className="b-pay-lbl">Room rate ({nights} × {fmtMoney(pricePerNight)}/night)</span>
            <span className="b-pay-val">{fmtMoney(baseCost)}</span>
          </div>
        )}
        {cleaningFee > 0 && (
          <div className="b-pay-row">
            <span className="b-pay-lbl">Cleaning fee</span>
            <span className="b-pay-val">{fmtMoney(cleaningFee)}</span>
          </div>
        )}
        {serviceFee > 0 && (
          <div className="b-pay-row">
            <span className="b-pay-lbl">Service fee (SnapReserve™)</span>
            <span className="b-pay-val">{fmtMoney(serviceFee)}</span>
          </div>
        )}
        {taxes > 0 && (
          <div className="b-pay-row">
            <span className="b-pay-lbl">Taxes &amp; fees</span>
            <span className="b-pay-val">{fmtMoney(taxes)}</span>
          </div>
        )}
        <div className="b-pay-total">
          <span className="b-pay-total-lbl">Guest Total Charged</span>
          <span className="b-pay-total-val">{fmtMoney(totalAmount)}</span>
        </div>
      </div>
      <div className="b-dp-sec">
        <div className="b-dp-sec-ttl">Payout Split</div>
        {[
          ['Host payout',    fmtMoney(hostPayout),  'var(--green)'],
          ['Platform fee',   fmtMoney(platformFee), 'var(--orange)'],
          ['Payment method', b.payment_provider ?? '—', 'var(--text)'],
          ['Payment status', b.payment_status ?? '—',  'var(--text)'],
        ].map(([l, v, c]) => (
          <div key={l} className="b-dp-row">
            <span className="b-dp-rl">{l}</span>
            <span className="b-dp-rv" style={{ color: c }}>{v}</span>
          </div>
        ))}
      </div>
      <div className="b-dp-sec">
        <div className="b-dp-sec-ttl">Transaction Log</div>
        {[
          ['Booked',         fmtDate(b.created_at)],
          ['Payment ID',     b.payment_intent_id ?? '—'],
          ['Refund amount',  b.refund_amount ? fmtMoney(b.refund_amount) : '—'],
          ['Stripe refund',  b.stripe_refund_id ?? '—'],
        ].map(([l, v]) => (
          <div key={l} className="b-dp-row">
            <span className="b-dp-rl">{l}</span>
            <span className="b-dp-rv" style={{ fontSize: '10px' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (tab === 'timeline') {
    const events = [
      { dot: 'var(--blue)',   event: 'Booking Created',   detail: `Guest booked via ${b.payment_provider ?? 'online'}`,      time: fmtDate(b.created_at) },
      { dot: 'var(--green)',  event: 'Payment Authorised', detail: `${fmtMoney(totalAmount)} charged to guest`,               time: fmtDate(b.created_at) },
      ...(b.status === 'checked_in' || b.status === 'completed' ? [{ dot: 'var(--green)',  event: 'Guest Checked In',    detail: `Check-in at ${b.listings?.title ?? 'listing'}`,    time: fmtDate(b.check_in) }] : []),
      ...(b.status === 'completed'  ? [{ dot: 'var(--muted)',  event: 'Guest Checked Out',   detail: 'Stay completed',                                        time: fmtDate(b.check_out) },
                                        { dot: 'var(--green)',  event: 'Payout Released',     detail: `${fmtMoney(hostPayout)} sent to host`,                  time: fmtDate(b.check_out) + ' +24h' }] : []),
      ...(b.status === 'dispute'    ? [{ dot: 'var(--red)',    event: 'Dispute Filed',        detail: 'Guest filed complaint',                                  time: '—' },
                                        { dot: 'var(--purple)', event: 'Payout Held',          detail: 'Host payout frozen pending review',                     time: '—' }] : []),
      ...(b.status === 'cancelled'  ? [{ dot: 'var(--red)',    event: 'Booking Cancelled',    detail: b.admin_cancel_reason ?? b.cancellation_reason ?? 'Cancelled', time: fmtDate(b.admin_cancelled_at) }] : []),
      ...(b.status === 'refunded'   ? [{ dot: 'var(--cyan)',   event: 'Refund Issued',        detail: fmtMoney(b.refund_amount ?? totalAmount) + ' refunded',   time: '—' }] : []),
      ...(['confirmed', 'pending'].includes(b.status) ? [{ dot: 'var(--sub)', event: 'Check-in Upcoming', detail: `Scheduled ${fmtDate(b.check_in)}`, time: 'Upcoming' }] : []),
    ]
    return (
      <div className="b-dp-sec" style={{ marginBottom: 0 }}>
        <div className="b-dp-sec-ttl">Booking Timeline</div>
        <div className="b-timeline">
          {events.map((e, i) => (
            <div key={i} className="b-tl-item">
              <div className="b-tl-left">
                <div className="b-tl-dot" style={{ background: e.dot }} />
                <div className="b-tl-line" />
              </div>
              <div className="b-tl-content">
                <div className="b-tl-event">{e.event}</div>
                <div className="b-tl-detail">{e.detail}</div>
                <div className="b-tl-time">{e.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (tab === 'messages') return (
    <div>
      <div className="b-dp-sec">
        <div className="b-dp-sec-ttl">Guest ↔ Host Messages</div>
        <div className="b-note-box" style={{ textAlign: 'center', color: 'var(--sub)', padding: '24px' }}>
          Message history not available in admin view.
        </div>
      </div>
    </div>
  )

  if (tab === 'admin') return (
    <div>
      <div className="b-aa-row">
        {canCancel && !['cancelled', 'completed', 'refunded'].includes(b.status) && (
          <button className="b-aa-btn aa-cancel" onClick={onCancel}>✗ Cancel</button>
        )}
        <button className="b-aa-btn aa-flag">🚩 Flag</button>
      </div>
      {b.admin_cancel_reason && (
        <div className="b-flag-box">⚠️ Admin cancelled: {b.admin_cancel_reason}</div>
      )}
      <div className="b-dp-sec">
        <div className="b-dp-sec-ttl">Audit Log</div>
        {[
          ['Booking ID',    b.id],
          ['Reference',     b.reference ?? '—'],
          ['Created',       fmtDate(b.created_at)],
          ['Payment ID',    b.payment_intent_id ?? '—'],
          ['Cancelled at',  b.admin_cancelled_at ? fmtDate(b.admin_cancelled_at) : '—'],
          ['Cancel reason', b.admin_cancel_reason ?? '—'],
        ].map(([l, v]) => (
          <div key={l} className="b-dp-row">
            <span className="b-dp-rl">{l}</span>
            <span className="b-dp-rv" style={{ fontSize: '10px' }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
        <button className="b-link-btn">👤 View Guest</button>
        <button className="b-link-btn">🏠 View Host</button>
      </div>
    </div>
  )

  return null
}
