'use client'
import { useState, useRef } from 'react'

const HOST_TYPE_LABELS = {
  hotel:            '🏨 Hotel or Resort',
  property_manager: '🏢 Property Manager',
  individual:       '🏠 Individual Host',
}

const AVATAR_COLORS = ['#1e3a8a','#7c3aed','#065f46','#b45309','#be123c','#0e7490','#6d28d9','#374151']

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(str) {
  let h = 0
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = Date.now() - d
  if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))}m ago`
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`
  if (diff < 172800000) return '1d ago'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtFull(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Rejection reasons ──────────────────────────────────────────────
const REJECTION_REASONS = [
  { key: 'blurry',     icon: '📸', title: 'ID photos are unclear or blurry',   desc: 'Text, photo, or barcode not clearly readable' },
  { key: 'mismatch',   icon: '👤', title: 'Name or details don\'t match',       desc: 'Name on ID doesn\'t match the application' },
  { key: 'expired',    icon: '📅', title: 'ID document is expired',             desc: 'The submitted document\'s expiry date has passed' },
  { key: 'face',       icon: '🤳', title: 'Selfie doesn\'t match ID photo',     desc: 'Face match confidence below required threshold' },
  { key: 'incomplete', icon: '📋', title: 'Incomplete submission',              desc: 'A required document side or file is missing' },
  { key: 'other',      icon: '✏️',  title: 'Other — write custom message',       desc: 'I\'ll explain the reason in my own words' },
]

const REASON_SUBJECT = {
  blurry:     'Your host application — ID photo quality',
  mismatch:   'Your host application — name mismatch',
  expired:    'Your host application — expired document',
  face:       'Your host application — selfie verification',
  incomplete: 'Your host application — incomplete submission',
  other:      'Your host application — update from SnapReserve™',
}

function buildRejectionBody(reasonKey, firstName, custom) {
  const bases = {
    blurry:     `We've reviewed your submitted documents but unfortunately could not verify your identity at this time.\n\nReason: The photos of your ID were unclear or blurry — text, photo, or barcode was not clearly readable.\n\nTo fix this: Re-upload in good lighting, lay your ID flat on a dark surface, and ensure all text is sharp. You can resubmit at any time.`,
    mismatch:   `We've reviewed your documents but found a discrepancy.\n\nReason: The name on your submitted ID does not match the name on your application.\n\nPlease check you submitted the correct ID, or reply here to clarify. If you've recently changed your name, please include supporting documentation.`,
    expired:    `Thank you for submitting your documents. Unfortunately we cannot proceed with an expired ID.\n\nReason: The document you submitted appears to have expired.\n\nPlease resubmit with a currently valid driver's license or passport.`,
    face:       `We reviewed your selfie but were unable to confirm the match with your ID photo.\n\nReason: The face match confidence was below our required threshold.\n\nTo fix this: Retake your selfie in bright, even lighting, face the camera directly, and ensure both your full face and the full ID are clearly visible.`,
    incomplete: `It looks like your submission was incomplete.\n\nReason: A required document or side was missing.\n\nPlease return to the verification page and upload all required photos. Reply here if you need help.`,
    other:      `We've reviewed your identity documents and unfortunately we were unable to approve your application at this time.`,
  }
  const base = bases[reasonKey] || bases.other
  const customPart = custom?.trim() ? `\n\n${custom.trim()}` : ''
  return `Hi ${firstName || 'there'},\n\n${base}${customPart}\n\nIf you have questions or additional information to share, please reply to this message — our team will get back to you within 24 hours.`
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .ha-shell { display:flex; height:100vh; overflow:hidden; background:var(--sr-bg); font-family:'DM Sans',sans-serif; color:var(--sr-text); }

  /* ── List pane ── */
  .ha-list { width:340px; flex-shrink:0; border-right:1px solid var(--sr-border-solid); display:flex; flex-direction:column; overflow:hidden; background:var(--sr-surface); }
  .ha-list-head { padding:16px 18px; border-bottom:1px solid var(--sr-border-solid); flex-shrink:0; }
  .ha-list-head h1 { font-size:0.95rem; font-weight:800; color:var(--sr-text); margin-bottom:2px; }
  .ha-list-sub { font-size:0.72rem; color:var(--sr-muted); }
  .ha-tabs { display:flex; border-bottom:1px solid var(--sr-border-solid); flex-shrink:0; }
  .ha-tab { flex:1; padding:9px 6px; font-size:0.65rem; font-weight:700; text-align:center; cursor:pointer; color:var(--sr-sub); border-bottom:2px solid transparent; font-family:inherit; background:none; border-top:none; border-left:none; border-right:none; transition:all .13s; text-transform:uppercase; letter-spacing:.06em; white-space:nowrap; }
  .ha-tab.act { color:var(--sr-orange); border-bottom-color:var(--sr-orange); }
  .ha-list-scroll { flex:1; overflow-y:auto; }
  .ha-item { padding:13px 16px; border-bottom:1px solid var(--sr-border-solid); cursor:pointer; transition:background .12s; display:flex; align-items:flex-start; gap:10px; }
  .ha-item:hover { background:rgba(255,255,255,.02); }
  .ha-item.sel { background:rgba(244,96,26,.08); border-left:2px solid var(--sr-orange); padding-left:14px; }
  .ha-av { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; color:#fff; }
  .ha-iname { font-size:0.82rem; font-weight:700; color:var(--sr-text); margin-bottom:1px; }
  .ha-itype { font-size:0.68rem; color:var(--sr-muted); margin-bottom:5px; }
  .ha-imeta { display:flex; align-items:center; gap:5px; flex-wrap:wrap; }
  .ha-badge { display:inline-flex; align-items:center; padding:2px 7px; border-radius:100px; font-size:0.62rem; font-weight:700; white-space:nowrap; }
  .b-pend { background:rgba(217,119,6,.12); color:#d97706; border:1px solid rgba(217,119,6,.25); }
  .b-appd { background:rgba(22,163,74,.12); color:#16a34a; border:1px solid rgba(22,163,74,.25); }
  .b-rejd { background:rgba(220,38,38,.12); color:#dc2626; border:1px solid rgba(220,38,38,.25); }
  .b-doc  { background:rgba(37,99,235,.12); color:#3b82f6; border:1px solid rgba(37,99,235,.25); }
  .b-replied { background:rgba(244,96,26,.12); color:var(--sr-orange); border:1px solid rgba(244,96,26,.25); }
  .ha-itime { font-size:0.65rem; color:var(--sr-sub); font-family:'DM Mono',monospace; margin-left:auto; white-space:nowrap; padding-top:2px; flex-shrink:0; }
  .ha-empty { padding:48px 20px; text-align:center; color:var(--sr-sub); font-size:0.82rem; }

  /* ── Detail pane ── */
  .ha-detail { flex:1; overflow:hidden; background:var(--sr-bg); display:flex; flex-direction:column; }
  .ha-empty-detail { flex:1; display:flex; align-items:center; justify-content:center; color:var(--sr-sub); font-size:0.84rem; }

  /* Detail header */
  .ha-dhead { padding:15px 22px; border-bottom:1px solid var(--sr-border-solid); background:var(--sr-surface); flex-shrink:0; display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .ha-dh-left { display:flex; align-items:center; gap:12px; min-width:0; }
  .ha-dh-name { font-size:1rem; font-weight:700; color:var(--sr-text); margin-bottom:2px; }
  .ha-dh-meta { font-size:0.7rem; color:var(--sr-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ha-dh-actions { display:flex; gap:8px; flex-shrink:0; }
  .ha-btn { padding:8px 16px; border-radius:8px; font-family:'DM Sans',sans-serif; font-size:0.75rem; font-weight:700; cursor:pointer; border:none; transition:all .15s; white-space:nowrap; }
  .ha-btn-approve { background:#16a34a; color:#fff; }
  .ha-btn-approve:hover { background:#15803d; box-shadow:0 4px 14px rgba(22,163,74,.3); }
  .ha-btn-reject { background:rgba(220,38,38,.12); border:1px solid rgba(220,38,38,.25); color:#dc2626; }
  .ha-btn-reject:hover { background:rgba(220,38,38,.2); }
  .ha-btn-msg { background:rgba(244,96,26,.1); border:1px solid rgba(244,96,26,.25); color:var(--sr-orange); }
  .ha-btn-msg:hover { background:rgba(244,96,26,.18); }

  /* Detail tabs */
  .ha-dtabs { display:flex; border-bottom:1px solid var(--sr-border-solid); background:var(--sr-surface); flex-shrink:0; padding:0 20px; }
  .ha-dtab { padding:10px 12px; font-size:0.72rem; font-weight:700; color:var(--sr-sub); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px; transition:all .13s; white-space:nowrap; display:flex; align-items:center; gap:5px; font-family:inherit; background:none; border-top:none; border-left:none; border-right:none; }
  .ha-dtab.act { color:var(--sr-orange); border-bottom-color:var(--sr-orange); }
  .ha-dtab-badge { background:var(--sr-orange); color:#fff; font-size:0.6rem; font-weight:700; padding:1px 5px; border-radius:100px; }

  /* Detail body */
  .ha-dbody { padding:22px 24px; flex:1; overflow-y:auto; }
  .ha-sec { margin-bottom:22px; }
  .ha-sec-title { font-size:0.63rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--sr-sub); margin-bottom:12px; display:flex; align-items:center; gap:8px; }
  .ha-sec-title::after { content:''; flex:1; height:1px; background:var(--sr-border-solid); }

  /* ID doc viewer */
  .id-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .id-grid.single { grid-template-columns:1fr; }
  .id-card { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:10px; overflow:hidden; }
  .id-card-lbl { padding:7px 12px; font-size:0.62rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--sr-sub); border-bottom:1px solid var(--sr-border-solid); }
  .id-card-img { height:130px; overflow:hidden; position:relative; cursor:zoom-in; }
  .id-card-img img { width:100%; height:100%; object-fit:cover; }
  .id-card-img .id-placeholder { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:2.5rem; background:var(--sr-bg); }
  .id-card-meta { padding:8px 12px; font-size:0.68rem; color:var(--sr-sub); font-family:'DM Mono',monospace; }

  /* Selfie row */
  .selfie-row { display:flex; align-items:center; gap:12px; background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:10px; padding:14px; }
  .selfie-img { width:72px; height:72px; border-radius:8px; overflow:hidden; flex-shrink:0; border:1.5px solid var(--sr-border-solid); display:flex; align-items:center; justify-content:center; font-size:1.8rem; background:var(--sr-bg); }
  .selfie-img img { width:100%; height:100%; object-fit:cover; }
  .selfie-text .st { font-size:0.82rem; font-weight:700; color:var(--sr-text); margin-bottom:2px; }
  .selfie-text .ss { font-size:0.72rem; color:var(--sr-muted); }

  /* Info rows */
  .info-row { display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid var(--sr-border-solid); font-size:0.8rem; }
  .info-row:last-child { border:none; }
  .info-lbl { color:var(--sr-muted); font-size:0.73rem; }
  .info-val { color:var(--sr-text); font-weight:600; font-family:'DM Mono',monospace; font-size:0.75rem; text-align:right; }

  /* Flags */
  .flag { display:flex; align-items:flex-start; gap:8px; padding:9px 12px; border-radius:8px; margin-bottom:7px; font-size:0.78rem; line-height:1.5; }
  .flag.ok   { background:rgba(22,163,74,.07);   border:1px solid rgba(22,163,74,.18);   color:#16a34a; }
  .flag.warn { background:rgba(217,119,6,.07);   border:1px solid rgba(217,119,6,.18);   color:#d97706; }
  .flag.miss { background:rgba(156,163,175,.07); border:1px solid rgba(156,163,175,.18); color:var(--sr-muted); }

  /* Admin notes */
  .notes-ta { width:100%; padding:10px 12px; background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:8px; font-family:'DM Sans',sans-serif; font-size:0.8rem; color:var(--sr-text); outline:none; resize:vertical; min-height:72px; transition:border-color .14s; }
  .notes-ta:focus { border-color:rgba(244,96,26,.4); }
  .notes-ta::placeholder { color:var(--sr-sub); }
  .notes-save { margin-top:7px; padding:6px 16px; background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:7px; color:var(--sr-muted); font-family:'DM Sans',sans-serif; font-size:0.78rem; font-weight:600; cursor:pointer; transition:all .14s; }
  .notes-save:hover { border-color:var(--sr-orange); color:var(--sr-text); }
  .notes-save:disabled { opacity:.5; cursor:not-allowed; }

  /* Decision row */
  .decision-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; }
  .ha-btn-lg { padding:12px; border-radius:9px; font-size:0.84rem; font-weight:700; width:100%; font-family:'DM Sans',sans-serif; cursor:pointer; border:none; transition:all .15s; }

  /* Messages panel */
  .ha-msgs-wrap { flex:1; display:flex; flex-direction:column; overflow:hidden; }
  .ha-thread { flex:1; overflow-y:auto; padding:18px 22px; display:flex; flex-direction:column; gap:14px; }
  .ha-msg-row { display:flex; gap:9px; }
  .ha-msg-row.admin { justify-content:flex-end; }
  .ha-msg-row.host  { justify-content:flex-start; }
  .ha-msg-av { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.6rem; font-weight:700; flex-shrink:0; color:#fff; }
  .ha-msg-bub { max-width:72%; padding:10px 13px; border-radius:12px; font-size:0.82rem; line-height:1.65; white-space:pre-wrap; }
  .ha-msg-row.admin .ha-msg-bub { background:rgba(244,96,26,.1); border:1px solid rgba(244,96,26,.22); color:var(--sr-text); border-bottom-right-radius:3px; }
  .ha-msg-row.host  .ha-msg-bub { background:var(--sr-surface); border:1px solid var(--sr-border-solid); color:var(--sr-text); border-bottom-left-radius:3px; }
  .ha-msg-sender { font-size:0.62rem; font-weight:700; opacity:.55; margin-bottom:4px; letter-spacing:.06em; text-transform:uppercase; }
  .ha-msg-time { font-size:0.62rem; opacity:.45; margin-top:4px; font-family:'DM Mono',monospace; text-align:right; }
  .ha-msg-sys { text-align:center; padding:6px 12px; border-radius:7px; font-size:0.74rem; font-weight:600; }
  .ha-msg-sys.info { background:rgba(37,99,235,.07); border:1px solid rgba(37,99,235,.15); color:#3b82f6; }
  .ha-msg-sys.warn { background:rgba(217,119,6,.07); border:1px solid rgba(217,119,6,.15); color:#d97706; }
  .ha-compose { border-top:1px solid var(--sr-border-solid); padding:12px 20px; background:var(--sr-surface); flex-shrink:0; }
  .ha-presets { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
  .ha-preset { padding:4px 10px; background:transparent; border:1px solid var(--sr-border-solid); border-radius:100px; font-size:0.72rem; color:var(--sr-muted); cursor:pointer; transition:all .14s; font-family:'DM Sans',sans-serif; }
  .ha-preset:hover { border-color:rgba(244,96,26,.4); color:var(--sr-orange); }
  .ha-compose-row { display:flex; gap:7px; align-items:flex-end; }
  .ha-compose-ta { flex:1; padding:9px 12px; background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; font-family:'DM Sans',sans-serif; font-size:0.82rem; color:var(--sr-text); outline:none; resize:none; min-height:40px; max-height:90px; transition:border-color .14s; }
  .ha-compose-ta:focus { border-color:rgba(244,96,26,.4); }
  .ha-compose-ta::placeholder { color:var(--sr-sub); }
  .ha-compose-send { padding:9px 16px; background:var(--sr-orange); border:none; border-radius:7px; color:#fff; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:700; cursor:pointer; transition:all .15s; white-space:nowrap; }
  .ha-compose-send:hover { background:#d4561f; }
  .ha-compose-send:disabled { opacity:.5; cursor:not-allowed; }

  /* Rejection modal */
  .ha-overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); backdrop-filter:blur(4px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
  .ha-modal { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:16px; width:100%; max-width:500px; max-height:90vh; overflow-y:auto; }
  .ha-modal-hd { padding:22px 24px 16px; border-bottom:1px solid var(--sr-border-solid); }
  .ha-modal-icon { font-size:1.6rem; margin-bottom:10px; }
  .ha-modal-hd h2 { font-size:1rem; font-weight:700; color:var(--sr-text); margin-bottom:4px; }
  .ha-modal-sub { font-size:0.82rem; color:var(--sr-muted); line-height:1.6; }
  .ha-modal-body { padding:16px 24px; }
  .ha-modal-section-lbl { font-size:0.62rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--sr-sub); margin-bottom:8px; display:block; }

  /* Reason cards */
  .reason-card { display:flex; align-items:flex-start; gap:10px; padding:10px 13px; border:1.5px solid var(--sr-border-solid); border-radius:9px; cursor:pointer; transition:all .15s; background:var(--sr-bg); margin-bottom:6px; }
  .reason-card:hover { border-color:rgba(244,96,26,.3); }
  .reason-card.on { border-color:var(--sr-orange); background:rgba(244,96,26,.05); }
  .rc-icon { font-size:1.2rem; flex-shrink:0; margin-top:1px; }
  .rc-body { flex:1; }
  .rc-title { font-size:0.82rem; font-weight:700; color:var(--sr-text); margin-bottom:2px; }
  .rc-desc  { font-size:0.7rem; color:var(--sr-muted); line-height:1.4; }
  .rc-radio { width:16px; height:16px; border-radius:50%; border:1.5px solid var(--sr-border-solid); display:flex; align-items:center; justify-content:center; font-size:0.55rem; flex-shrink:0; margin-top:2px; transition:all .15s; color:transparent; }
  .reason-card.on .rc-radio { background:var(--sr-orange); border-color:var(--sr-orange); color:#fff; }

  /* Message preview */
  .msg-preview { background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:9px; padding:13px; margin:12px 0; }
  .mp-to { font-size:0.65rem; color:var(--sr-sub); font-family:'DM Mono',monospace; margin-bottom:5px; }
  .mp-subj { font-size:0.84rem; font-weight:700; color:var(--sr-text); margin-bottom:7px; }
  .mp-body { font-size:0.76rem; color:var(--sr-muted); line-height:1.75; white-space:pre-wrap; }

  /* Modal footer */
  .ha-modal-ft { padding:16px 24px; border-top:1px solid var(--sr-border-solid); display:flex; gap:8px; justify-content:flex-end; }
  .ha-modal-cancel { padding:9px 20px; border-radius:8px; font-size:0.82rem; font-weight:600; border:1px solid var(--sr-border-solid); background:transparent; color:var(--sr-muted); cursor:pointer; font-family:'DM Sans',sans-serif; }
  .ha-modal-cancel:hover { color:var(--sr-text); }
  .ha-modal-ok { padding:9px 20px; border-radius:8px; font-size:0.82rem; font-weight:700; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; }
  .ha-modal-ok.approve { background:#16a34a; color:#fff; }
  .ha-modal-ok.approve:hover { background:#15803d; }
  .ha-modal-ok.reject { background:#dc2626; color:#fff; }
  .ha-modal-ok.reject:hover { background:#b91c1c; }
  .ha-modal-ok:disabled { opacity:.5; cursor:not-allowed; }

  /* Toast */
  .ha-toast { position:fixed; bottom:24px; right:24px; padding:11px 20px; border-radius:10px; font-size:0.84rem; font-weight:600; z-index:2000; animation:fadeUp .2s; }
  .ha-toast.ok  { background:#16a34a; color:#fff; }
  .ha-toast.err { background:#dc2626; color:#fff; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
`

export default function HostApplicationsClient({ applications: initial, role }) {
  const [applications, setApplications] = useState(initial)
  const [tab,          setTab]          = useState('pending')
  const [sel,          setSel]          = useState(null)
  const [notes,        setNotes]        = useState('')
  const [detailTab,    setDetailTab]    = useState('docs') // 'docs' | 'msgs'
  const [modal,        setModal]        = useState(null)   // 'approve' | 'reject' | null
  const [loading,      setLoading]      = useState(false)
  const [notesSaving,  setNotesSaving]  = useState(false)
  const [toast,        setToast]        = useState(null)

  // Messages tab
  const [appMsgs,    setAppMsgs]    = useState([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [adminDraft, setAdminDraft] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const threadEndRef = useRef(null)

  // Rejection modal state
  const [rejReasonKey, setRejReasonKey] = useState('blurry')
  const [rejCustom,    setRejCustom]    = useState('')

  const canManage = ['admin', 'super_admin'].includes(role)

  const filtered   = applications.filter(a => a.status === tab)
  const pendingCt  = applications.filter(a => a.status === 'pending').length
  const approvedCt = applications.filter(a => a.status === 'approved').length
  const rejectedCt = applications.filter(a => a.status === 'rejected').length

  // Track which apps have unread replies (at least one message with reply_body)
  const [appsWithReplies, setAppsWithReplies] = useState(new Set())

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function selectApp(app) {
    setSel(app)
    setNotes(app.id_admin_notes ?? '')
    setDetailTab('docs')
    setAppMsgs([])
    setAdminDraft('')
  }

  async function loadMessages() {
    if (!sel) return
    setMsgLoading(true)
    const res  = await fetch(`/api/admin/host-applications/${sel.id}/messages`)
    const data = await res.json()
    const msgs = data.messages || []
    setAppMsgs(msgs)
    setMsgLoading(false)
    if (msgs.some(m => m.reply_body)) {
      setAppsWithReplies(prev => new Set([...prev, sel.id]))
    }
    setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
  }

  function switchDetailTab(t) {
    setDetailTab(t)
    if (t === 'msgs' && appMsgs.length === 0) loadMessages()
  }

  async function sendAdminMessage(e) {
    e?.preventDefault()
    if (!adminDraft.trim() || !sel || sendingMsg) return
    setSendingMsg(true)
    const res  = await fetch(`/api/admin/host-applications/${sel.id}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: adminDraft.trim() }),
    })
    const data = await res.json()
    setSendingMsg(false)
    if (res.ok) {
      setAppMsgs(prev => [...prev, data.message])
      setAdminDraft('')
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } else {
      showToast(data.error || 'Failed to send.', false)
    }
  }

  async function saveNotes() {
    if (!sel) return
    setNotesSaving(true)
    await fetch(`/api/admin/host-applications/${sel.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'save_notes', notes }),
    })
    setApplications(prev => prev.map(a => a.id === sel.id ? { ...a, id_admin_notes: notes } : a))
    setSel(prev => prev ? { ...prev, id_admin_notes: notes } : prev)
    setNotesSaving(false)
    showToast('Notes saved.')
  }

  async function handleAction() {
    if (!modal || !sel) return
    setLoading(true)

    if (modal === 'approve') {
      const res  = await fetch(`/api/admin/host-applications/${sel.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'approve' }),
      })
      const json = await res.json()
      setLoading(false)
      if (!res.ok) { showToast(json.error || 'Something went wrong.', false); return }
      setApplications(prev => prev.map(a => a.id === sel.id ? { ...a, status: 'approved' } : a))
      setSel(prev => prev ? { ...prev, status: 'approved' } : prev)
      showToast('Host approved and activated.')
      setModal(null)
      return
    }

    if (modal === 'reject') {
      const firstName = sel.users?.full_name?.split(' ')[0] || 'there'
      const subject   = REASON_SUBJECT[rejReasonKey] || 'Your host application — update from SnapReserve™'
      const body      = buildRejectionBody(rejReasonKey, firstName, rejCustom)
      const reason    = REJECTION_REASONS.find(r => r.key === rejReasonKey)?.title || rejReasonKey

      const res  = await fetch(`/api/admin/host-applications/${sel.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'reject', rejection_reason: reason, rejection_subject: subject, rejection_body: body }),
      })
      const json = await res.json()
      setLoading(false)
      if (!res.ok) { showToast(json.error || 'Something went wrong.', false); return }
      setApplications(prev => prev.map(a => a.id === sel.id ? { ...a, status: 'rejected' } : a))
      setSel(prev => prev ? { ...prev, status: 'rejected' } : prev)
      showToast('Application rejected. Message sent to applicant.')
      setModal(null)
      setRejCustom('')
      setRejReasonKey('blurry')
    }
  }

  const TABS = [
    { key: 'pending',  label: `⏳ Pending (${pendingCt})` },
    { key: 'approved', label: `✓ Approved (${approvedCt})` },
    { key: 'rejected', label: `✗ Rejected (${rejectedCt})` },
  ]

  // Computed rejection preview
  const firstName     = sel?.users?.full_name?.split(' ')[0] || 'there'
  const rejSubject    = REASON_SUBJECT[rejReasonKey] || 'Your host application — update from SnapReserve™'
  const rejBodyPreview = buildRejectionBody(rejReasonKey, firstName, rejCustom)

  const hasReplies = sel && appsWithReplies.has(sel.id)

  return (
    <>
      <style>{STYLES}</style>
      <div className="ha-shell">

        {/* ── List pane ── */}
        <div className="ha-list">
          <div className="ha-list-head">
            <h1>Host Applications</h1>
            <div className="ha-list-sub">{pendingCt} awaiting review</div>
          </div>
          <div className="ha-tabs">
            {TABS.map(t => (
              <button key={t.key} className={`ha-tab${tab === t.key ? ' act' : ''}`} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="ha-list-scroll">
            {filtered.length === 0 ? (
              <div className="ha-empty">No {tab} applications.</div>
            ) : filtered.map(app => {
              const color    = avatarColor(app.users?.full_name || app.user_id)
              const docBadge = app.id_type === 'passport' ? '📘 Passport' : app.id_type === 'driver_license' ? '🪪 Driver\'s License' : null
              const hasReply = appsWithReplies.has(app.id)
              return (
                <div
                  key={app.id}
                  className={`ha-item${sel?.id === app.id ? ' sel' : ''}`}
                  onClick={() => selectApp(app)}
                >
                  <div className="ha-av" style={{ background: color }}>{initials(app.users?.full_name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ha-iname">{app.users?.full_name || '—'}</div>
                    <div className="ha-itype">{HOST_TYPE_LABELS[app.host_type] ?? app.host_type} · {app.display_name}</div>
                    <div className="ha-imeta">
                      <span className={`ha-badge ${app.status === 'pending' ? 'b-pend' : app.status === 'approved' ? 'b-appd' : 'b-rejd'}`}>
                        {app.status === 'pending' ? '⏳ Pending' : app.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                      </span>
                      {docBadge && <span className="ha-badge b-doc">{docBadge}</span>}
                      {hasReply && <span className="ha-badge b-replied">💬 Replied</span>}
                    </div>
                  </div>
                  <div className="ha-itime">{fmt(app.created_at)}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Detail pane ── */}
        <div className="ha-detail">
          {!sel ? (
            <div className="ha-empty-detail">Select an application to review</div>
          ) : (
            <>
              {/* Header */}
              <div className="ha-dhead">
                <div className="ha-dh-left">
                  <div className="ha-av" style={{ background: avatarColor(sel.users?.full_name || sel.user_id), width: 44, height: 44, fontSize: 15, flexShrink: 0 }}>
                    {initials(sel.users?.full_name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="ha-dh-name">{sel.users?.full_name || '—'}</div>
                    <div className="ha-dh-meta">{sel.users?.email} · Submitted {fmtFull(sel.created_at)}</div>
                  </div>
                  <span className={`ha-badge ${sel.status === 'pending' ? 'b-pend' : sel.status === 'approved' ? 'b-appd' : 'b-rejd'}`} style={{ flexShrink: 0 }}>
                    {sel.status === 'pending' ? '⏳ Pending' : sel.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                  </span>
                </div>
                {canManage && sel.status === 'pending' && (
                  <div className="ha-dh-actions">
                    <button className="ha-btn ha-btn-msg" onClick={() => switchDetailTab('msgs')}>💬 Message</button>
                    <button className="ha-btn ha-btn-reject" onClick={() => { setModal('reject'); setRejReasonKey('blurry'); setRejCustom('') }}>✗ Reject</button>
                    <button className="ha-btn ha-btn-approve" onClick={() => setModal('approve')}>✓ Approve Host</button>
                  </div>
                )}
                {sel.status !== 'pending' && (
                  <button className="ha-btn ha-btn-msg" onClick={() => switchDetailTab('msgs')}>💬 Messages</button>
                )}
              </div>

              {/* Detail tabs */}
              <div className="ha-dtabs">
                <button className={`ha-dtab${detailTab === 'docs' ? ' act' : ''}`} onClick={() => switchDetailTab('docs')}>
                  📄 Documents & Details
                </button>
                <button className={`ha-dtab${detailTab === 'msgs' ? ' act' : ''}`} onClick={() => switchDetailTab('msgs')}>
                  💬 Messages
                  {hasReplies && detailTab !== 'msgs' && <span className="ha-dtab-badge">Reply</span>}
                </button>
              </div>

              {/* ── Documents & Details tab ── */}
              {detailTab === 'docs' && (
                <div className="ha-dbody">

                  {/* ID Documents */}
                  <div className="ha-sec">
                    <div className="ha-sec-title">Submitted ID Documents</div>
                    {!sel.id_type ? (
                      <div className="flag miss">⚠ No ID documents submitted yet.</div>
                    ) : sel.id_type === 'driver_license' ? (
                      <div className="id-grid" style={{ marginBottom: 12 }}>
                        <div className="id-card">
                          <div className="id-card-lbl">🪪 Driver's License — Front</div>
                          <div className="id-card-img">
                            {sel.id_front_signed
                              ? <img src={sel.id_front_signed} alt="ID front" />
                              : <div className="id-placeholder">🪪</div>
                            }
                          </div>
                          <div className="id-card-meta">{sel.id_front_url ? '✓ Uploaded' : 'Not submitted'}</div>
                        </div>
                        <div className="id-card">
                          <div className="id-card-lbl">🔄 Driver's License — Back</div>
                          <div className="id-card-img">
                            {sel.id_back_signed
                              ? <img src={sel.id_back_signed} alt="ID back" />
                              : <div className="id-placeholder">🔄</div>
                            }
                          </div>
                          <div className="id-card-meta">{sel.id_back_url ? '✓ Uploaded' : 'Not submitted'}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="id-grid single" style={{ marginBottom: 12 }}>
                        <div className="id-card">
                          <div className="id-card-lbl">📘 Passport — Photo Page</div>
                          <div className="id-card-img">
                            {sel.id_passport_signed
                              ? <img src={sel.id_passport_signed} alt="Passport" />
                              : <div className="id-placeholder">📘</div>
                            }
                          </div>
                          <div className="id-card-meta">{sel.id_passport_url ? '✓ Uploaded' : 'Not submitted'}</div>
                        </div>
                      </div>
                    )}

                    {/* Selfie */}
                    {sel.id_type && (
                      <>
                        <div className="ha-sec-title" style={{ marginTop: 16 }}>Selfie with ID</div>
                        <div className="selfie-row">
                          <div className="selfie-img">
                            {sel.id_selfie_signed
                              ? <img src={sel.id_selfie_signed} alt="Selfie" />
                              : <span>🤳</span>
                            }
                          </div>
                          <div className="selfie-text">
                            <div className="st">{sel.id_selfie_url ? '✓ Selfie uploaded' : '⚠ Selfie not submitted'}</div>
                            <div className="ss">
                              {sel.id_selfie_url
                                ? 'Verify that the person in the selfie matches the ID photo and name on the application.'
                                : 'Applicant has not submitted a selfie with their ID yet.'
                              }
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Applicant details */}
                  <div className="ha-sec">
                    <div className="ha-sec-title">Applicant Details</div>
                    <div className="info-row"><span className="info-lbl">Full name</span><span className="info-val" style={{ fontFamily: 'inherit' }}>{sel.users?.full_name || '—'}</span></div>
                    <div className="info-row"><span className="info-lbl">Email</span><span className="info-val" style={{ fontFamily: 'inherit', fontSize: '0.72rem' }}>{sel.users?.email || '—'}</span></div>
                    <div className="info-row"><span className="info-lbl">Phone</span><span className="info-val">{sel.phone || '—'}</span></div>
                    <div className="info-row"><span className="info-lbl">Host type</span><span className="info-val" style={{ fontFamily: 'inherit' }}>{HOST_TYPE_LABELS[sel.host_type] ?? sel.host_type ?? '—'}</span></div>
                    <div className="info-row"><span className="info-lbl">Display name</span><span className="info-val" style={{ fontFamily: 'inherit' }}>{sel.display_name || '—'}</span></div>
                    <div className="info-row"><span className="info-lbl">ID type</span><span className="info-val" style={{ fontFamily: 'inherit' }}>{sel.id_type === 'driver_license' ? "Driver's License" : sel.id_type === 'passport' ? 'Passport' : 'Not submitted'}</span></div>
                    <div className="info-row"><span className="info-lbl">ID submitted</span><span className="info-val">{fmtFull(sel.id_submitted_at)}</span></div>
                    {sel.status === 'rejected' && sel.rejection_reason && (
                      <div className="info-row"><span className="info-lbl">Rejection reason</span><span className="info-val" style={{ fontFamily: 'inherit', color: '#dc2626' }}>{sel.rejection_reason}</span></div>
                    )}
                  </div>

                  {/* Checklist */}
                  <div className="ha-sec">
                    <div className="ha-sec-title">Verification Checklist</div>
                    <div className={`flag ${sel.id_type ? 'ok' : 'miss'}`}>{sel.id_type ? '✓' : '○'} ID type selected — {sel.id_type === 'driver_license' ? "Driver's License" : sel.id_type === 'passport' ? 'Passport' : 'None'}</div>
                    {sel.id_type === 'driver_license' && <>
                      <div className={`flag ${sel.id_front_url ? 'ok' : 'miss'}`}>{sel.id_front_url ? '✓' : '○'} License front uploaded</div>
                      <div className={`flag ${sel.id_back_url ? 'ok' : 'miss'}`}>{sel.id_back_url ? '✓' : '○'} License back uploaded</div>
                    </>}
                    {sel.id_type === 'passport' && (
                      <div className={`flag ${sel.id_passport_url ? 'ok' : 'miss'}`}>{sel.id_passport_url ? '✓' : '○'} Passport photo page uploaded</div>
                    )}
                    <div className={`flag ${sel.id_selfie_url ? 'ok' : 'miss'}`}>{sel.id_selfie_url ? '✓' : '○'} Selfie with ID uploaded</div>
                    <div className="flag warn">⚠ Manual review required — verify name, photo, and ID match the application</div>
                  </div>

                  {/* Admin notes */}
                  <div className="ha-sec">
                    <div className="ha-sec-title">Admin Notes</div>
                    <textarea
                      className="notes-ta"
                      placeholder="Add a private note about this application…"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                    <button className="notes-save" onClick={saveNotes} disabled={notesSaving}>
                      {notesSaving ? 'Saving…' : '💾 Save Note'}
                    </button>
                  </div>

                  {/* Decision */}
                  {canManage && sel.status === 'pending' && (
                    <div className="ha-sec">
                      <div className="ha-sec-title">Decision</div>
                      <div className="decision-grid">
                        <button className="ha-btn-lg ha-btn-approve" onClick={() => setModal('approve')}>✓ Approve &amp; Activate Host</button>
                        <button className="ha-btn-lg ha-btn-reject" style={{ background: 'rgba(220,38,38,.12)', border: '1px solid rgba(220,38,38,.25)', color: '#dc2626' }} onClick={() => { setModal('reject'); setRejReasonKey('blurry'); setRejCustom('') }}>✗ Reject &amp; Message Applicant</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Messages tab ── */}
              {detailTab === 'msgs' && (
                <div className="ha-msgs-wrap">
                  <div className="ha-thread">
                    {msgLoading ? (
                      <div style={{ textAlign: 'center', color: 'var(--sr-muted)', fontSize: '0.82rem', padding: '40px 0' }}>Loading…</div>
                    ) : (
                      <>
                        <div className="ha-msg-sys info">💬 Thread shared with {sel.users?.full_name || 'applicant'} — they can see all messages sent from here</div>
                        {appMsgs.length === 0 && (
                          <div className="ha-msg-sys warn">No messages yet. Reject the application to auto-send a rejection message, or write below to send a message directly.</div>
                        )}
                        {appMsgs.map(m => (
                          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Admin message */}
                            <div className="ha-msg-row admin">
                              <div className="ha-msg-bub">
                                <div className="ha-msg-sender" style={{ textAlign: 'right' }}>SnapReserve™ Team</div>
                                {m.subject && <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '4px' }}>{m.subject}</div>}
                                {m.body}
                                <div className="ha-msg-time">{fmtFull(m.created_at)}</div>
                              </div>
                              <div className="ha-msg-av" style={{ background: 'var(--sr-orange)' }}>SR</div>
                            </div>
                            {/* Applicant reply */}
                            {m.reply_body && (
                              <div className="ha-msg-row host">
                                <div className="ha-msg-av" style={{ background: avatarColor(sel.users?.full_name || sel.user_id) }}>
                                  {initials(sel.users?.full_name)}
                                </div>
                                <div className="ha-msg-bub">
                                  <div className="ha-msg-sender">{sel.users?.full_name || 'Applicant'}</div>
                                  {m.reply_body}
                                  <div className="ha-msg-time">{fmtFull(m.replied_at)}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        <div ref={threadEndRef} />
                      </>
                    )}
                  </div>

                  {/* Compose */}
                  <div className="ha-compose">
                    <div className="ha-presets">
                      {['📎 Request clearer photos', '⚠ Please clarify address', '✅ Documents now verified', '📞 Please call our team'].map(p => (
                        <button key={p} className="ha-preset" onClick={() => setAdminDraft(p.replace(/^[^\s]+\s/, ''))}>
                          {p}
                        </button>
                      ))}
                    </div>
                    <form className="ha-compose-row" onSubmit={sendAdminMessage}>
                      <textarea
                        className="ha-compose-ta"
                        value={adminDraft}
                        onChange={e => setAdminDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminMessage() } }}
                        placeholder={`Send a message to ${sel.users?.full_name?.split(' ')[0] || 'the applicant'}…`}
                        rows={2}
                      />
                      <button type="submit" className="ha-compose-send" disabled={sendingMsg || !adminDraft.trim()}>
                        {sendingMsg ? '…' : 'Send →'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Approve modal ── */}
      {modal === 'approve' && (
        <div className="ha-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="ha-modal">
            <div className="ha-modal-hd">
              <div className="ha-modal-icon">✅</div>
              <h2>Approve {sel?.users?.full_name ?? 'this host'}?</h2>
              <div className="ha-modal-sub">
                This will grant full host access to {sel?.users?.email}. They can create and publish listings immediately. An approval notification will be sent to their inbox.
              </div>
            </div>
            <div className="ha-modal-ft">
              <button className="ha-modal-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="ha-modal-ok approve" disabled={loading} onClick={handleAction}>
                {loading ? 'Processing…' : '✓ Approve & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection modal ── */}
      {modal === 'reject' && (
        <div className="ha-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="ha-modal">
            <div className="ha-modal-hd">
              <div className="ha-modal-icon">🚫</div>
              <h2>Reject {sel?.users?.full_name?.split(' ')[0] ?? 'this'}'s application?</h2>
              <div className="ha-modal-sub">
                Choose a reason below — it will be sent directly to their Messages inbox so they know exactly what happened and can reply if needed.
              </div>
            </div>
            <div className="ha-modal-body">
              <span className="ha-modal-section-lbl">Reason for rejection</span>
              {REJECTION_REASONS.map(r => (
                <div
                  key={r.key}
                  className={`reason-card${rejReasonKey === r.key ? ' on' : ''}`}
                  onClick={() => setRejReasonKey(r.key)}
                >
                  <span className="rc-icon">{r.icon}</span>
                  <div className="rc-body">
                    <div className="rc-title">{r.title}</div>
                    <div className="rc-desc">{r.desc}</div>
                  </div>
                  <div className="rc-radio">{rejReasonKey === r.key ? '✓' : ''}</div>
                </div>
              ))}

              <span className="ha-modal-section-lbl" style={{ marginTop: 14, display: 'block' }}>
                Additional message <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--sr-sub)' }}>(optional)</span>
              </span>
              <textarea
                style={{ width: '100%', padding: '9px 12px', background: 'var(--sr-bg)', border: '1px solid var(--sr-border-solid)', borderRadius: '8px', fontFamily: 'DM Sans,sans-serif', fontSize: '0.82rem', color: 'var(--sr-text)', outline: 'none', resize: 'vertical', minHeight: '72px', marginBottom: '14px' }}
                placeholder="Add specific resubmission instructions or any extra context…"
                value={rejCustom}
                onChange={e => setRejCustom(e.target.value)}
              />

              <span className="ha-modal-section-lbl">Message preview — sent to {sel?.users?.email}</span>
              <div className="msg-preview">
                <div className="mp-to">To: {sel?.users?.email} · SnapReserve™ Messages Inbox</div>
                <div className="mp-subj">{rejSubject}</div>
                <div className="mp-body">{rejBodyPreview}</div>
              </div>
            </div>
            <div className="ha-modal-ft">
              <button className="ha-modal-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="ha-modal-ok reject" disabled={loading} onClick={handleAction}>
                {loading ? 'Processing…' : '🚫 Reject & Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`ha-toast ${toast.ok ? 'ok' : 'err'}`}>{toast.msg}</div>}
    </>
  )
}
