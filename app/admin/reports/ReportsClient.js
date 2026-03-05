'use client'
import { useState, useCallback, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

function sb() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

const PRIORITY_CFG = {
  low:    { label: 'Low',    color: 'var(--sr-muted)', bg: 'rgba(168,152,128,0.12)' },
  normal: { label: 'Normal', color: '#93C5FD', bg: 'rgba(96,165,250,0.1)'  },
  high:   { label: 'High',   color: '#FCD34D', bg: 'rgba(251,191,36,0.1)'  },
  urgent: { label: 'Urgent', color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
}

const STATUS_CFG = {
  open:         { label: 'Open',         color: '#F87171', bg: 'rgba(248,113,113,0.1)'  },
  under_review: { label: 'Under Review', color: '#93C5FD', bg: 'rgba(96,165,250,0.1)'  },
  escalated:    { label: 'Escalated',    color: '#FCD34D', bg: 'rgba(251,191,36,0.1)'  },
  resolved:     { label: 'Resolved',     color: '#4ADE80', bg: 'rgba(74,222,128,0.1)'  },
  dismissed:    { label: 'Dismissed',    color: 'var(--sr-sub)', bg: 'rgba(107,94,82,0.15)'  },
}

const REASON_LABELS = {
  incorrect_info:        'Incorrect information',
  misleading_photos:     'Misleading photos',
  scam_fraud:            'Scam or fraud',
  safety_concern:        'Safety concern',
  inappropriate_content: 'Inappropriate content',
  other:                 'Other',
}

const ACTION_LABELS = {
  note_added:               'Note added',
  resolve:                  'Resolved',
  dismiss:                  'Dismissed',
  escalate:                 'Escalated',
  under_review:             'Marked under review',
  assign:                   'Assigned',
  set_priority:             'Priority updated',
  reopen:                   'Reopened',
  suspend_listing:          'Listing suspended',
  reactivate_listing:       'Listing reactivated',
  reject_permanently:       'Permanently rejected',
  go_live_listing:          'Listing set live',
  host_submitted_explanation: 'Host submitted explanation',
  message_sent:               'Message sent to host',
}

function Pill({ value, cfg }) {
  const c = cfg[value] || { label: value, color: 'var(--sr-muted)', bg: 'rgba(168,152,128,0.12)' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:'100px', fontSize:'0.68rem', fontWeight:700, background:c.bg, color:c.color }}>
      {c.label}
    </span>
  )
}

export default function ReportsClient({ initialReports, role }) {
  const [reports, setReports] = useState(initialReports)
  const [selected, setSelected] = useState(null)

  // Filters
  const [statusFilter,   setStatusFilter]   = useState('open')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [typeFilter,     setTypeFilter]     = useState('all')
  const [search,         setSearch]         = useState('')

  // Modal state
  const [modal,    setModal]    = useState(null) // { action, report }
  const [note,     setNote]     = useState('')
  const [loading,  setLoading]  = useState(false)

  const [toast, setToast] = useState(null)

  // Detail panel data (loaded per-report on select)
  const [reporterInfo,  setReporterInfo]  = useState(null)
  const [listingStatus, setListingStatus] = useState(null)
  const [notes,         setNotes]         = useState([])
  const [activity,      setActivity]      = useState([])
  const [noteInput,     setNoteInput]     = useState('')
  const [noteSending,   setNoteSending]   = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [hostMessages,  setHostMessages]  = useState([])
  const [msgInput,      setMsgInput]      = useState('')
  const [msgSubject,    setMsgSubject]    = useState('')
  const [msgSending,    setMsgSending]    = useState(false)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Load per-report detail when a report is selected
  useEffect(() => {
    if (!selected) return

    setReporterInfo(null)
    setListingStatus(null)
    setNotes([])
    setActivity([])
    setHostMessages([])
    setMsgInput('')
    setMsgSubject('')
    setDetailLoading(true)

    async function loadDetail() {
      const supabase = sb()

      const fetches = [
        // Reporter info
        supabase.from('users').select('email, full_name, created_at').eq('id', selected.reporter_id).maybeSingle(),
        // Admin notes
        fetch(`/api/admin/reports/${selected.id}/notes`).then(r => r.json()),
        // Activity timeline
        fetch(`/api/admin/reports/${selected.id}/activity`).then(r => r.json()),
        // Host messages for this listing
        fetch(`/api/admin/reports/${selected.id}/message`).then(r => r.json()),
      ]

      // Listing status (only for listing reports)
      if (selected.target_type === 'listing') {
        fetches.push(
          supabase
            .from('listings')
            .select('status, suspended_at, host_explanation, host_explanation_at')
            .eq('id', selected.target_id)
            .maybeSingle()
        )
      }

      const results = await Promise.allSettled(fetches)

      const reporterResult  = results[0]
      const notesResult     = results[1]
      const activityResult  = results[2]
      const messagesResult  = results[3]
      const listingResult   = results[4]

      if (reporterResult.status === 'fulfilled') setReporterInfo(reporterResult.value.data || null)
      if (notesResult.status === 'fulfilled' && notesResult.value.notes) setNotes(notesResult.value.notes)
      if (activityResult.status === 'fulfilled' && activityResult.value.activity) setActivity(activityResult.value.activity)
      if (messagesResult.status === 'fulfilled' && messagesResult.value.messages) setHostMessages(messagesResult.value.messages)
      if (listingResult?.status === 'fulfilled') setListingStatus(listingResult.value.data || null)

      setDetailLoading(false)
    }

    loadDetail()
  }, [selected?.id])

  async function sendNote() {
    if (!noteInput.trim() || !selected) return
    setNoteSending(true)
    try {
      const res = await fetch(`/api/admin/reports/${selected.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add note')
      setNoteInput('')
      // Refresh notes and activity
      const [nr, ar] = await Promise.all([
        fetch(`/api/admin/reports/${selected.id}/notes`).then(r => r.json()),
        fetch(`/api/admin/reports/${selected.id}/activity`).then(r => r.json()),
      ])
      if (nr.notes) setNotes(nr.notes)
      if (ar.activity) setActivity(ar.activity)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setNoteSending(false)
    }
  }

  async function sendMessage() {
    if (!msgInput.trim() || !selected) return
    setMsgSending(true)
    try {
      const res = await fetch(`/api/admin/reports/${selected.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: msgSubject.trim() || undefined, message: msgInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send message')
      setMsgInput('')
      setMsgSubject('')
      // Refresh messages and activity
      const [mr, ar] = await Promise.all([
        fetch(`/api/admin/reports/${selected.id}/message`).then(r => r.json()),
        fetch(`/api/admin/reports/${selected.id}/activity`).then(r => r.json()),
      ])
      if (mr.messages) setHostMessages(mr.messages)
      if (ar.activity) setActivity(ar.activity)
      showToast('Message sent to host.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setMsgSending(false)
    }
  }

  async function doAction(reportId, action, extra = {}) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, resolution_note: extra.note?.trim() || undefined, priority: extra.priority }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')

      const statusMap = {
        resolve:            'resolved',
        dismiss:            'dismissed',
        escalate:           'escalated',
        under_review:       'under_review',
        reopen:             'open',
        suspend_listing:    'under_review',
        reactivate_listing: null,
        reject_permanently: 'resolved',
        go_live_listing:    'resolved',
      }
      setReports(prev => prev.map(r => {
        if (r.id !== reportId) return r
        const updates = {}
        if (statusMap[action] !== null && statusMap[action] !== undefined) updates.status = statusMap[action]
        if (action === 'set_priority') updates.priority = extra.priority
        return { ...r, ...updates }
      }))

      const msgs = {
        resolve:            'Report resolved.',
        dismiss:            'Report dismissed.',
        escalate:           'Report escalated.',
        under_review:       'Marked as under review.',
        set_priority:       'Priority updated.',
        reopen:             'Report reopened.',
        suspend_listing:    'Listing suspended. Report kept open — it will resurface when the host responds.',
        reactivate_listing: 'Listing reactivated. You can now push it live or let the host do it.',
        reject_permanently: 'Listing permanently rejected.',
        go_live_listing:    'Listing is now live.',
      }
      showToast(msgs[action] || 'Done.')
      setModal(null)
      setNote('')

      // After suspension, refresh listingStatus so the reactivation buttons appear
      if (action === 'suspend_listing' && selected?.id === reportId) {
        setListingStatus(prev => prev ? { ...prev, status: 'suspended' } : prev)
      } else if (action === 'reactivate_listing' && selected?.id === reportId) {
        setListingStatus(prev => prev ? { ...prev, status: 'approved', host_explanation: null } : prev)
      } else if (action === 'go_live_listing' && selected?.id === reportId) {
        setListingStatus(prev => prev ? { ...prev, status: 'live' } : prev)
      } else if (selected?.id === reportId && (action === 'resolve' || action === 'dismiss' || action === 'reject_permanently')) {
        setSelected(null)
      }
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function fmt(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
  }
  function fmtTime(d) {
    if (!d) return '—'
    return new Date(d).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })
  }

  const stats = {
    open:         reports.filter(r => r.status === 'open').length,
    under_review: reports.filter(r => r.status === 'under_review').length,
    escalated:    reports.filter(r => r.status === 'escalated').length,
    resolved:     reports.filter(r => r.status === 'resolved').length,
    dismissed:    reports.filter(r => r.status === 'dismissed').length,
  }

  const filtered = reports.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false
    if (typeFilter !== 'all' && r.target_type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.reason?.includes(q) && !r.description?.toLowerCase().includes(q) && !r.target_id?.includes(q)) return false
    }
    return true
  })

  const isActionable = r => r.status === 'open' || r.status === 'under_review' || r.status === 'escalated'
  const canAdminAction = ['admin', 'super_admin'].includes(role)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { font-family:'DM Sans',-apple-system,sans-serif; }
        .topbar { background:var(--sr-surface); border-bottom:1px solid var(--sr-border-solid); padding:16px 32px; display:flex; align-items:center; justify-content:space-between; }
        .topbar h1 { font-size:1.05rem; font-weight:700; color:var(--sr-text); }
        .content { padding:28px 32px; }
        .stats-row { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:22px; }
        .stat { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:10px; padding:14px 16px; cursor:pointer; transition:border-color 0.15s; }
        .stat:hover { border-color:#3A3430; }
        .stat.active { border-color:var(--sr-orange); }
        .stat-num { font-size:1.5rem; font-weight:800; line-height:1; margin-bottom:3px; }
        .stat-label { font-size:0.68rem; color:var(--sr-muted); text-transform:uppercase; letter-spacing:0.06em; font-weight:600; }
        .toolbar { display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap; }
        .search-input { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:8px; padding:8px 14px; color:var(--sr-text); font-size:0.84rem; min-width:220px; outline:none; flex:1; }
        .search-input:focus { border-color:var(--sr-orange); }
        .filter-sel { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:8px; padding:8px 12px; color:var(--sr-text); font-size:0.83rem; outline:none; cursor:pointer; }
        .list { display:flex; flex-direction:column; gap:8px; }
        .card { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:12px; overflow:hidden; transition:border-color 0.15s; }
        .card:hover { border-color:#3A3430; }
        .card.open-card { border-color:var(--sr-orange); }
        .card-row { display:flex; align-items:center; gap:12px; padding:14px 18px; cursor:pointer; }
        .card-icon { width:38px; height:38px; border-radius:9px; background:var(--sr-border-solid); display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; }
        .card-body { flex:1; min-width:0; }
        .card-title { font-size:0.88rem; font-weight:700; color:var(--sr-text); margin-bottom:3px; }
        .card-meta { font-size:0.72rem; color:var(--sr-muted); display:flex; gap:10px; flex-wrap:wrap; }
        .card-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .chev { color:var(--sr-sub); font-size:0.75rem; }
        .detail { border-top:1px solid var(--sr-border-solid); padding:18px 20px; }
        .detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
        .di { background:var(--sr-bg); border-radius:8px; padding:11px 13px; }
        .di-label { font-size:0.62rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-sub); margin-bottom:4px; }
        .di-val { font-size:0.84rem; font-weight:600; color:var(--sr-text); word-break:break-all; }
        .desc-box { background:var(--sr-bg); border-radius:8px; padding:12px 14px; margin-bottom:14px; font-size:0.84rem; color:#D0C8BE; line-height:1.65; }
        .section-label { font-size:0.63rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-sub); margin-bottom:6px; }
        .action-bar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .btn { padding:8px 16px; border-radius:8px; font-size:0.8rem; font-weight:700; cursor:pointer; border:1px solid transparent; transition:all 0.15s; font-family:inherit; }
        .btn-review   { background:rgba(96,165,250,0.1);   color:#93C5FD; border-color:rgba(96,165,250,0.25);   }
        .btn-review:hover   { background:rgba(96,165,250,0.2); }
        .btn-escalate { background:rgba(251,191,36,0.08);  color:#FCD34D; border-color:rgba(251,191,36,0.2);    }
        .btn-escalate:hover { background:rgba(251,191,36,0.18); }
        .btn-resolve  { background:rgba(74,222,128,0.08);  color:#4ADE80; border-color:rgba(74,222,128,0.2);    }
        .btn-resolve:hover  { background:rgba(74,222,128,0.18); }
        .btn-dismiss  { background:rgba(107,94,82,0.15);   color:var(--sr-muted); border-color:rgba(107,94,82,0.3);     }
        .btn-dismiss:hover  { background:rgba(107,94,82,0.28); }
        .btn-suspend  { background:rgba(248,113,113,0.08); color:#F87171; border-color:rgba(248,113,113,0.2);   }
        .btn-suspend:hover  { background:rgba(248,113,113,0.18); }
        .btn-reactivate { background:rgba(74,222,128,0.08); color:#4ADE80; border-color:rgba(74,222,128,0.2); }
        .btn-reactivate:hover { background:rgba(74,222,128,0.18); }
        .btn-reject-perm { background:rgba(220,38,38,0.1); color:#F87171; border-color:rgba(220,38,38,0.3); }
        .btn-reject-perm:hover { background:rgba(220,38,38,0.2); }
        .btn-reopen { background:rgba(168,152,128,0.12); color:#D0C8BE; border-color:rgba(168,152,128,0.3); }
        .btn-reopen:hover { background:rgba(168,152,128,0.25); }
        .btn-go-live { background:rgba(74,222,128,0.12); color:#4ADE80; border-color:rgba(74,222,128,0.35); font-weight:800; }
        .btn-go-live:hover { background:rgba(74,222,128,0.22); }
        .btn:disabled { opacity:0.4; cursor:not-allowed; }
        .priority-sel { background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:7px; padding:6px 10px; color:var(--sr-text); font-size:0.78rem; outline:none; cursor:pointer; font-family:inherit; }
        .empty { text-align:center; padding:52px; color:var(--sr-sub); font-size:0.84rem; }
        /* Notes */
        .notes-thread { display:flex; flex-direction:column; gap:8px; margin-bottom:12px; max-height:220px; overflow-y:auto; }
        .note-item { background:var(--sr-bg); border-radius:8px; padding:10px 12px; }
        .note-author { font-size:0.68rem; font-weight:700; color:var(--sr-muted); margin-bottom:3px; }
        .note-body { font-size:0.82rem; color:#D0C8BE; line-height:1.6; }
        .note-input-row { display:flex; gap:8px; }
        .note-input { flex:1; background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:8px 12px; color:var(--sr-text); font-size:0.82rem; outline:none; font-family:inherit; resize:none; min-height:60px; }
        .note-input:focus { border-color:var(--sr-orange); }
        .btn-note { padding:8px 14px; background:var(--sr-orange); color:white; border:none; border-radius:8px; font-size:0.8rem; font-weight:700; cursor:pointer; font-family:inherit; align-self:flex-end; }
        .btn-note:disabled { opacity:0.4; cursor:not-allowed; }
        /* Timeline */
        .timeline { display:flex; flex-direction:column; gap:0; margin-bottom:14px; }
        .tl-item { display:flex; gap:10px; padding:6px 0; position:relative; }
        .tl-dot { width:8px; height:8px; border-radius:50%; background:#3A3430; flex-shrink:0; margin-top:5px; }
        .tl-line { position:absolute; left:3.5px; top:16px; bottom:0; width:1px; background:var(--sr-border-solid); }
        .tl-content { flex:1; }
        .tl-action { font-size:0.78rem; font-weight:700; color:var(--sr-text); }
        .tl-meta { font-size:0.68rem; color:var(--sr-sub); margin-top:1px; }
        .tl-detail { font-size:0.76rem; color:var(--sr-muted); margin-top:3px; font-style:italic; }
        /* Explanation box */
        .explanation-box { background:#1F1C17; border:1px solid rgba(251,191,36,0.25); border-radius:10px; padding:14px; margin-bottom:14px; }
        .explanation-title { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#FCD34D; margin-bottom:6px; }
        .explanation-body { font-size:0.84rem; color:#D0C8BE; line-height:1.65; }
        .explanation-date { font-size:0.68rem; color:var(--sr-sub); margin-top:6px; }
        /* Modal */
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; }
        .modal { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:16px; padding:26px; width:100%; max-width:420px; }
        .modal h2 { font-size:1rem; font-weight:700; color:var(--sr-text); margin-bottom:6px; }
        .modal-sub { font-size:0.82rem; color:var(--sr-muted); margin-bottom:16px; line-height:1.6; }
        .modal textarea { width:100%; background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:10px 12px; color:var(--sr-text); font-size:0.84rem; resize:vertical; min-height:80px; outline:none; font-family:inherit; box-sizing:border-box; }
        .modal textarea:focus { border-color:var(--sr-orange); }
        .modal-footer { display:flex; gap:8px; margin-top:16px; justify-content:flex-end; }
        .btn-cancel  { background:var(--sr-border-solid); color:var(--sr-muted); border:1px solid #3A3028; border-radius:8px; padding:8px 18px; font-size:0.84rem; font-weight:600; cursor:pointer; font-family:inherit; }
        .btn-confirm { background:var(--sr-orange); color:#fff; border:none; border-radius:8px; padding:8px 18px; font-size:0.84rem; font-weight:600; cursor:pointer; font-family:inherit; }
        .btn-confirm:disabled { opacity:0.5; cursor:not-allowed; }
        .toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:12px; font-size:0.85rem; font-weight:600; z-index:300; animation:fadeIn 0.2s; max-width:340px; }
        .toast.success { background:#16A34A; color:white; }
        .toast.error   { background:#DC2626; color:white; }
        .link-btn { background:none; border:1px solid var(--sr-border-solid); border-radius:7px; padding:5px 12px; color:var(--sr-orange); font-size:0.76rem; font-weight:700; cursor:pointer; font-family:inherit; text-decoration:none; display:inline-block; transition:border-color 0.15s; }
        .link-btn:hover { border-color:var(--sr-orange); }
        /* Host message thread */
        .msg-thread { display:flex; flex-direction:column; gap:8px; margin-bottom:12px; max-height:260px; overflow-y:auto; }
        .msg-item { background:var(--sr-bg); border-radius:8px; padding:10px 12px; border-left:2px solid var(--sr-orange); }
        .msg-subject { font-size:0.75rem; font-weight:700; color:var(--sr-orange); margin-bottom:2px; }
        .msg-body { font-size:0.82rem; color:#D0C8BE; line-height:1.6; white-space:pre-wrap; }
        .msg-meta { font-size:0.65rem; color:var(--sr-sub); margin-top:5px; display:flex; align-items:center; gap:6px; }
        .msg-unread { display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--sr-orange); }
        .msg-compose { display:flex; flex-direction:column; gap:6px; }
        .msg-subject-input { background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:7px 12px; color:var(--sr-text); font-size:0.8rem; outline:none; font-family:inherit; }
        .msg-subject-input:focus { border-color:var(--sr-orange); }
        .msg-body-input { background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:8px 12px; color:var(--sr-text); font-size:0.82rem; outline:none; font-family:inherit; resize:vertical; min-height:72px; }
        .msg-body-input:focus { border-color:var(--sr-orange); }
        .btn-send-msg { background:var(--sr-orange); color:white; border:none; border-radius:8px; padding:8px 16px; font-size:0.8rem; font-weight:700; cursor:pointer; font-family:inherit; align-self:flex-end; }
        .btn-send-msg:disabled { opacity:0.4; cursor:not-allowed; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @media(max-width:768px) { .content{padding:16px;} .stats-row{grid-template-columns:repeat(3,1fr);} .detail-grid{grid-template-columns:1fr;} }
      `}</style>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="topbar">
        <h1>Reports Queue</h1>
        <span style={{fontSize:'0.8rem',color:'var(--sr-muted)'}}>{filtered.length} showing</span>
      </div>

      <div className="content">
        {/* Stats */}
        <div className="stats-row">
          {[
            { key:'open',         label:'Open',         color:'#F87171' },
            { key:'under_review', label:'Under Review',  color:'#93C5FD' },
            { key:'escalated',    label:'Escalated',     color:'#FCD34D' },
            { key:'resolved',     label:'Resolved',      color:'#4ADE80' },
            { key:'dismissed',    label:'Dismissed',     color:'var(--sr-muted)' },
          ].map(s => (
            <div
              key={s.key}
              className={`stat ${statusFilter === s.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === s.key ? 'all' : s.key)}
            >
              <div className="stat-num" style={{color:s.color}}>{stats[s.key]}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="toolbar">
          <input
            className="search-input"
            placeholder="Search reason, description, target ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="filter-sel" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <select className="filter-sel" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          <select className="filter-sel" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            <option value="listing">Listing</option>
            <option value="user">User</option>
            <option value="booking">Booking</option>
            <option value="host">Host</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">No reports match the current filters.</div>
        ) : (
          <div className="list">
            {filtered.map(r => {
              const isOpen   = selected?.id === r.id
              const actionable = isActionable(r)
              const typeIcon = { listing:'🏠', user:'👤', booking:'📅', host:'🏢' }[r.target_type] || '📋'

              return (
                <div key={r.id} className={`card ${isOpen ? 'open-card' : ''}`}>
                  <div className="card-row" onClick={() => setSelected(isOpen ? null : r)}>
                    <div className="card-icon">{typeIcon}</div>
                    <div className="card-body">
                      <div className="card-title">{REASON_LABELS[r.reason] || r.reason}</div>
                      <div className="card-meta">
                        <span>{r.target_type}</span>
                        {r.description && <span>{r.description.slice(0, 60)}{r.description.length > 60 ? '…' : ''}</span>}
                        <span>{fmt(r.created_at)}</span>
                      </div>
                    </div>
                    <div className="card-right">
                      <Pill value={r.priority} cfg={PRIORITY_CFG} />
                      <Pill value={r.status}   cfg={STATUS_CFG}   />
                      <span className="chev">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="detail">
                      {detailLoading && (
                        <div style={{color:'var(--sr-sub)',fontSize:'0.8rem',marginBottom:'14px'}}>Loading details…</div>
                      )}

                      {/* Core info grid */}
                      <div className="detail-grid">
                        <div className="di">
                          <div className="di-label">Report ID</div>
                          <div className="di-val">{r.id.slice(0,16)}…</div>
                        </div>
                        <div className="di">
                          <div className="di-label">Target type</div>
                          <div className="di-val">{r.target_type}</div>
                        </div>
                        <div className="di">
                          <div className="di-label">Target</div>
                          <div className="di-val">
                            {r.target_type === 'listing' ? (
                              <span style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                                <a href={`/listings/${r.target_id}`} target="_blank" rel="noreferrer" className="link-btn">
                                  View listing ↗
                                </a>
                                <a href={`/admin/listings`} target="_blank" rel="noreferrer" className="link-btn">
                                  Admin listings ↗
                                </a>
                              </span>
                            ) : (
                              <span>{r.target_id.slice(0,16)}…</span>
                            )}
                          </div>
                        </div>
                        <div className="di">
                          <div className="di-label">Reason</div>
                          <div className="di-val">{REASON_LABELS[r.reason] || r.reason}</div>
                        </div>
                        <div className="di">
                          <div className="di-label">Reporter</div>
                          <div className="di-val" style={{fontSize:'0.78rem'}}>
                            {reporterInfo
                              ? <span>{reporterInfo.email}<br /><span style={{color:'var(--sr-sub)',fontSize:'0.68rem'}}>joined {fmt(reporterInfo.created_at)}</span></span>
                              : <span style={{color:'var(--sr-sub)'}}>loading…</span>
                            }
                          </div>
                        </div>
                        <div className="di">
                          <div className="di-label">Status</div>
                          <div className="di-val"><Pill value={r.status} cfg={STATUS_CFG} /></div>
                        </div>
                        <div className="di">
                          <div className="di-label">Reported</div>
                          <div className="di-val">{fmt(r.created_at)}</div>
                        </div>
                        {r.resolved_at && (
                          <div className="di">
                            <div className="di-label">Resolved</div>
                            <div className="di-val">{fmt(r.resolved_at)}</div>
                          </div>
                        )}
                      </div>

                      {/* Full description */}
                      {r.description && (
                        <div style={{marginBottom:'14px'}}>
                          <div className="section-label">Description</div>
                          <div className="desc-box">{r.description}</div>
                        </div>
                      )}

                      {/* Resolution note */}
                      {r.resolution_note && (
                        <div style={{marginBottom:'14px'}}>
                          <div className="section-label" style={{color:'#4ADE80'}}>Resolution note</div>
                          <div className="desc-box" style={{borderLeft:'2px solid #4ADE80'}}>{r.resolution_note}</div>
                        </div>
                      )}

                      {/* Listing suspension status */}
                      {r.target_type === 'listing' && listingStatus && (
                        <div style={{marginBottom:'14px'}}>
                          <div className="section-label">Listing status</div>
                          <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap',marginBottom:'8px'}}>
                            <Pill
                              value={listingStatus.status}
                              cfg={{
                                suspended:          { label: 'Suspended',    color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
                                pending_reapproval: { label: 'Under Review', color: '#FCD34D', bg: 'rgba(251,191,36,0.1)'   },
                                approved:           { label: 'Approved',     color: '#4ADE80', bg: 'rgba(74,222,128,0.1)'   },
                                live:               { label: 'Live',         color: '#4ADE80', bg: 'rgba(74,222,128,0.1)'   },
                                rejected:           { label: 'Rejected',     color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
                              }}
                            />
                          </div>

                          {/* Host explanation (if pending_reapproval) */}
                          {listingStatus.status === 'pending_reapproval' && listingStatus.host_explanation && (
                            <div className="explanation-box">
                              <div className="explanation-title">Host Explanation</div>
                              <div className="explanation-body">{listingStatus.host_explanation}</div>
                              <div className="explanation-date">Submitted {fmtTime(listingStatus.host_explanation_at)}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Priority selector */}
                      {actionable && (
                        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
                          <span style={{fontSize:'0.72rem',color:'var(--sr-sub)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>Priority:</span>
                          <select
                            className="priority-sel"
                            value={r.priority || 'normal'}
                            onChange={e => doAction(r.id, 'set_priority', { priority: e.target.value })}
                          >
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                      )}

                      {/* Action buttons */}
                      {actionable && (
                        <div className="action-bar" style={{marginBottom:'18px'}}>
                          {r.status !== 'under_review' && (
                            <button className="btn btn-review" onClick={() => doAction(r.id, 'under_review')} disabled={loading}>
                              🔍 Under Review
                            </button>
                          )}
                          {r.status !== 'escalated' && (
                            <button className="btn btn-escalate" onClick={() => doAction(r.id, 'escalate')} disabled={loading}>
                              ⬆ Escalate
                            </button>
                          )}
                          <button className="btn btn-resolve" onClick={() => { setNote(''); setModal({ action:'resolve', report:r }) }} disabled={loading}>
                            ✅ Resolve
                          </button>
                          <button className="btn btn-dismiss" onClick={() => { setNote(''); setModal({ action:'dismiss', report:r }) }} disabled={loading}>
                            ✕ Dismiss
                          </button>
                          {r.target_type === 'listing' && canAdminAction && (
                            <>
                              {/* Show Suspend if not suspended */}
                              {listingStatus?.status !== 'suspended' && listingStatus?.status !== 'pending_reapproval' && (
                                <button className="btn btn-suspend" onClick={() => { setNote(''); setModal({ action:'suspend_listing', report:r }) }} disabled={loading}>
                                  🚫 Suspend Listing
                                </button>
                              )}
                              {/* Show Reactivate if suspended or pending_reapproval */}
                              {(listingStatus?.status === 'suspended' || listingStatus?.status === 'pending_reapproval') && (
                                <button className="btn btn-reactivate" onClick={() => { setNote(''); setModal({ action:'reactivate_listing', report:r }) }} disabled={loading}>
                                  ✅ Reactivate
                                </button>
                              )}
                              {/* Show Reject Permanently if host submitted explanation */}
                              {listingStatus?.status === 'pending_reapproval' && (
                                <button className="btn btn-reject-perm" onClick={() => { setNote(''); setModal({ action:'reject_permanently', report:r }) }} disabled={loading}>
                                  🗑 Reject Permanently
                                </button>
                              )}
                              {/* Go Live — push listing directly to live after reactivation */}
                              {listingStatus?.status === 'approved' && (
                                <button className="btn btn-go-live" onClick={() => { setNote(''); setModal({ action:'go_live_listing', report:r }) }} disabled={loading}>
                                  🚀 Go Live
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {!actionable && (
                        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'18px',flexWrap:'wrap'}}>
                          <span style={{fontSize:'0.78rem',color:'var(--sr-sub)'}}>
                            This report has been {r.status}.
                          </span>
                          <button
                            className="btn btn-reopen"
                            onClick={() => doAction(r.id, 'reopen')}
                            disabled={loading}
                          >
                            ↩ Reopen
                          </button>
                        </div>
                      )}

                      {/* Admin notes thread */}
                      <div style={{marginBottom:'18px'}}>
                        <div className="section-label">Internal Notes</div>
                        {notes.length === 0 ? (
                          <div style={{fontSize:'0.78rem',color:'var(--sr-sub)',marginBottom:'8px'}}>No notes yet.</div>
                        ) : (
                          <div className="notes-thread">
                            {notes.map(n => (
                              <div key={n.id} className="note-item">
                                <div className="note-author">{n.author_email} · {fmtTime(n.created_at)}</div>
                                <div className="note-body">{n.note}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="note-input-row">
                          <textarea
                            className="note-input"
                            placeholder="Add internal note…"
                            value={noteInput}
                            onChange={e => setNoteInput(e.target.value)}
                          />
                          <button className="btn-note" onClick={sendNote} disabled={noteSending || !noteInput.trim()}>
                            {noteSending ? '…' : 'Add'}
                          </button>
                        </div>
                      </div>

                      {/* Message Host thread — only for listing reports */}
                      {r.target_type === 'listing' && (
                        <div style={{marginBottom:'18px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}}>
                            <div className="section-label" style={{margin:0}}>Host Messages</div>
                            {hostMessages.filter(m => !m.is_read).length > 0 && (
                              <span style={{fontSize:'0.65rem',fontWeight:700,color:'var(--sr-orange)'}}>
                                {hostMessages.filter(m => !m.is_read).length} unread
                              </span>
                            )}
                          </div>
                          {hostMessages.length > 0 && (
                            <div className="msg-thread">
                              {hostMessages.map(m => (
                                <div key={m.id} className="msg-item">
                                  {m.subject && <div className="msg-subject">{m.subject}</div>}
                                  <div className="msg-body">{m.body}</div>
                                  <div className="msg-meta">
                                    {!m.is_read && <span className="msg-unread" title="Host hasn't read this" />}
                                    <span>Sent {fmtTime(m.created_at)}</span>
                                  </div>
                                  {/* Host reply */}
                                  {m.reply_body && (
                                    <div style={{marginTop:'8px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'8px 10px'}}>
                                      <div style={{fontSize:'0.62rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'#4ADE80',marginBottom:'3px'}}>
                                        Host replied · {fmtTime(m.replied_at)}
                                      </div>
                                      <div style={{fontSize:'0.8rem',color:'#D0C8BE',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{m.reply_body}</div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="msg-compose">
                            <input
                              className="msg-subject-input"
                              placeholder="Subject (optional)"
                              value={msgSubject}
                              onChange={e => setMsgSubject(e.target.value)}
                            />
                            <textarea
                              className="msg-body-input"
                              placeholder="Write a message to the host…"
                              value={msgInput}
                              onChange={e => setMsgInput(e.target.value)}
                            />
                            <button
                              className="btn-send-msg"
                              onClick={sendMessage}
                              disabled={msgSending || !msgInput.trim()}
                            >
                              {msgSending ? 'Sending…' : 'Send to Host'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Activity timeline */}
                      {activity.length > 0 && (
                        <div>
                          <div className="section-label">Activity</div>
                          <div className="timeline">
                            {activity.map((a, i) => (
                              <div key={a.id} className="tl-item">
                                <div style={{position:'relative',width:'8px',flexShrink:0}}>
                                  <div className="tl-dot" />
                                  {i < activity.length - 1 && <div className="tl-line" />}
                                </div>
                                <div className="tl-content">
                                  <div className="tl-action">{ACTION_LABELS[a.action] || a.action}</div>
                                  <div className="tl-meta">{a.actor_email} · {fmtTime(a.created_at)}</div>
                                  {a.detail && <div className="tl-detail">"{a.detail}"</div>}
                                </div>
                              </div>
                            ))}
                          </div>
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

      {/* Confirmation modal */}
      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2>
              {modal.action === 'resolve'            && 'Resolve Report'}
              {modal.action === 'dismiss'            && 'Dismiss Report'}
              {modal.action === 'suspend_listing'    && 'Suspend Listing'}
              {modal.action === 'reactivate_listing' && 'Reactivate Listing'}
              {modal.action === 'reject_permanently' && 'Reject Permanently'}
              {modal.action === 'go_live_listing'    && 'Push Listing Live'}
            </h2>
            <div className="modal-sub">
              {modal.action === 'suspend_listing'    && 'The listing will be taken offline immediately. The host will be notified. This action is logged.'}
              {modal.action === 'reactivate_listing' && 'The listing will be restored (approved) and the host notified. You can then push it live.'}
              {modal.action === 'reject_permanently' && 'This will permanently remove the listing. This action cannot be undone.'}
              {modal.action === 'go_live_listing'    && 'The listing will be set to live immediately and the host will be notified. This report will be resolved.'}
              {(modal.action === 'resolve' || modal.action === 'dismiss') && `Target: ${modal.report.target_type} · ${REASON_LABELS[modal.report.reason] || modal.report.reason}`}
            </div>
            <textarea
              placeholder={
                modal.action === 'suspend_listing'    ? 'Suspension reason (shown to host)…' :
                modal.action === 'reactivate_listing' ? 'Optional note for host…' :
                modal.action === 'reject_permanently' ? 'Reason for permanent rejection…' :
                modal.action === 'go_live_listing'    ? 'Optional note for host…' :
                'Resolution note (optional)…'
              }
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="btn-confirm"
                disabled={loading}
                onClick={() => doAction(modal.report.id, modal.action, { note })}
                style={
                  modal.action === 'suspend_listing' || modal.action === 'reject_permanently'
                    ? { background: '#DC2626' }
                    : modal.action === 'reactivate_listing'
                    ? { background: '#16A34A' }
                    : modal.action === 'go_live_listing'
                    ? { background: '#16A34A' }
                    : {}
                }
              >
                {loading ? 'Processing…' :
                  modal.action === 'suspend_listing'    ? 'Suspend Listing' :
                  modal.action === 'reactivate_listing' ? 'Reactivate' :
                  modal.action === 'reject_permanently' ? 'Reject Permanently' :
                  modal.action === 'go_live_listing'    ? '🚀 Go Live' :
                  'Confirm'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
