'use client'
import { useState } from 'react'

export default function WaitlistClient({ entries, total }) {
  const [copied, setCopied] = useState(false)
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const usCount   = entries.filter(e => e.region === 'us' || !e.region).length
  const intlCount = entries.filter(e => e.region === 'international').length

  const filtered = entries.filter(e => {
    const matchRegion = region === 'all' || (region === 'us' ? (e.region === 'us' || !e.region) : e.region === 'international')
    const q = search.toLowerCase()
    const matchSearch = !q ||
      e.email.toLowerCase().includes(q) ||
      (e.first_name || '').toLowerCase().includes(q) ||
      (e.last_name  || '').toLowerCase().includes(q) ||
      (e.user_type  || '').toLowerCase().includes(q)
    return matchRegion && matchSearch
  })

  function copyEmails() {
    const text = filtered.map(e => e.email).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function exportCSV() {
    const rows = [
      ['First Name', 'Last Name', 'Email', 'Type', 'Region', 'Message', 'Signed up'],
      ...filtered.map(e => [
        e.first_name || '',
        e.last_name  || '',
        e.email,
        e.user_type  || '',
        e.region     || 'us',
        (e.message   || '').replace(/"/g, '""'),
        new Date(e.created_at).toLocaleString(),
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `waitlist-${region}-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const TYPE_SHORT = {
    'Traveler looking to book stays': 'Traveler',
    'Hotel owner / manager':          'Hotel Owner',
    'Private home / villa host':      'Host',
    'Investor / partner':             'Investor',
    'Just curious':                   'Curious',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

        .topbar { background:var(--sr-surface); border-bottom:1px solid var(--sr-border-solid); padding:16px 32px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
        .topbar-left { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .topbar h1 { font-size:1.05rem; font-weight:700; color:var(--sr-text); }
        .count-pill { background:rgba(192,132,252,0.12); color:#C084FC; font-size:0.72rem; font-weight:700; padding:4px 12px; border-radius:20px; }
        .topbar-actions { display:flex; gap:8px; }
        .btn { padding:8px 16px; border-radius:8px; font-size:0.78rem; font-weight:700; cursor:pointer; font-family:inherit; border:none; transition:all 0.15s; }
        .btn-ghost { background:rgba(255,255,255,0.06); color:var(--sr-muted); border:1px solid var(--sr-border-solid); }
        .btn-ghost:hover { background:rgba(255,255,255,0.1); color:var(--sr-text); }
        .btn-orange { background:var(--sr-orange); color:white; }
        .btn-orange:hover { background:#FF7A35; }

        .content { padding:28px 32px; }

        /* Tabs */
        .tabs { display:flex; gap:4px; margin-bottom:20px; background:#141210; border:1px solid var(--sr-border-solid); border-radius:10px; padding:4px; width:fit-content; }
        .tab { padding:7px 16px; border-radius:7px; font-size:0.78rem; font-weight:700; cursor:pointer; border:none; background:transparent; color:var(--sr-sub); font-family:inherit; transition:all 0.15s; display:flex; align-items:center; gap:6px; }
        .tab.active { background:var(--sr-surface); color:var(--sr-text); box-shadow:0 1px 4px rgba(0,0,0,0.3); }
        .tab-badge { background:rgba(255,255,255,0.1); border-radius:20px; padding:2px 7px; font-size:0.68rem; font-weight:700; }
        .tab.active .tab-badge { background:rgba(244,96,26,0.2); color:var(--sr-orange); }

        /* Controls */
        .controls { display:flex; gap:12px; align-items:center; margin-bottom:20px; flex-wrap:wrap; }
        .search-input { flex:1; min-width:220px; max-width:340px; background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:10px; padding:9px 16px; font-size:0.84rem; color:var(--sr-text); font-family:inherit; outline:none; }
        .search-input::placeholder { color:var(--sr-sub); }
        .search-input:focus { border-color:var(--sr-orange); }

        /* Launch box */
        .launch-box { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:12px; padding:22px 24px; margin-bottom:24px; }
        .launch-title { font-size:0.72rem; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:var(--sr-sub); margin-bottom:8px; }
        .launch-desc { font-size:0.83rem; color:var(--sr-muted); line-height:1.65; margin-bottom:14px; }
        .launch-actions { display:flex; gap:10px; flex-wrap:wrap; }

        /* Table */
        .table-wrap { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:12px; overflow:hidden; }
        .table-row { display:grid; grid-template-columns:180px 1fr 130px 110px 130px; gap:0; border-bottom:1px solid var(--sr-border-solid); }
        .table-row:last-child { border-bottom:none; }
        .table-row.hdr { background:#141210; }
        .th { padding:10px 16px; font-size:0.65rem; font-weight:800; text-transform:uppercase; letter-spacing:0.09em; color:var(--sr-sub); }
        .td { padding:14px 16px; font-size:0.83rem; color:var(--sr-text); display:flex; align-items:center; border-left:1px solid var(--sr-border-solid); }
        .td:first-child { border-left:none; }
        .td-name { flex-direction:column; align-items:flex-start; gap:2px; }
        .td-name .name { font-weight:600; font-size:0.84rem; }
        .td-name .type { font-size:0.7rem; color:var(--sr-muted); }
        .td-email a { color:#C084FC; text-decoration:none; font-size:0.82rem; }
        .td-email a:hover { text-decoration:underline; }
        .region-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:20px; font-size:0.7rem; font-weight:700; }
        .rb-us { background:rgba(59,130,246,0.12); color:#60A5FA; }
        .rb-intl { background:rgba(168,85,247,0.12); color:#C084FC; }
        .td-date { font-size:0.75rem; color:var(--sr-sub); }
        .msg-btn { background:none; border:1px solid var(--sr-border-solid); border-radius:6px; padding:3px 9px; font-size:0.7rem; color:var(--sr-muted); cursor:pointer; font-family:inherit; transition:all 0.15s; }
        .msg-btn:hover { border-color:var(--sr-orange); color:var(--sr-orange); }
        .msg-row { background:var(--sr-bg); border-bottom:1px solid var(--sr-border-solid); padding:12px 16px 14px 16px; }
        .msg-row:last-child { border-bottom:none; }
        .msg-text { font-size:0.81rem; color:var(--sr-muted); line-height:1.6; font-style:italic; }

        .empty-row { padding:56px 20px; text-align:center; color:var(--sr-sub); font-size:0.84rem; }

        @media(max-width:900px) { .table-row { grid-template-columns:1fr 1fr 100px; } .table-row > *:nth-child(3),.table-row > *:nth-child(4) { display:none; } }
        @media(max-width:768px) { .content{padding:20px;} .topbar{padding:14px 20px;} }
      `}</style>

      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-left">
          <h1>Waitlist</h1>
          <span className="count-pill">{total} signup{total !== 1 ? 's' : ''}</span>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={copyEmails}>
            {copied ? '✓ Copied!' : '📋 Copy emails'}
          </button>
          <button className="btn btn-orange" onClick={exportCSV}>
            📥 Export CSV
          </button>
        </div>
      </div>

      <div className="content">

        {/* Launch instructions */}
        <div className="launch-box">
          <div className="launch-title">📨 Sending launch emails</div>
          <div className="launch-desc">
            When you're ready to go live, export the CSV or copy all emails and paste into your email provider (Gmail, Mailchimp, Klaviyo, etc.) to send your launch announcement. Direct users to{' '}
            <strong style={{color:'var(--sr-text)'}}>snapreserve.app/signup</strong> to create an account and{' '}
            <strong style={{color:'var(--sr-text)'}}>snapreserve.app/become-a-host</strong> for hosts.
          </div>
          <div className="launch-actions">
            <button className="btn btn-ghost" onClick={copyEmails}>
              {copied ? '✓ Copied!' : '📋 Copy visible emails'}
            </button>
            <button className="btn btn-ghost" onClick={exportCSV}>
              📥 Download CSV
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab${region === 'all'  ? ' active' : ''}`} onClick={() => setRegion('all')}>
            All <span className="tab-badge">{total}</span>
          </button>
          <button className={`tab${region === 'us'   ? ' active' : ''}`} onClick={() => setRegion('us')}>
            🇺🇸 United States <span className="tab-badge">{usCount}</span>
          </button>
          <button className={`tab${region === 'international' ? ' active' : ''}`} onClick={() => setRegion('international')}>
            🌍 International <span className="tab-badge">{intlCount}</span>
          </button>
        </div>

        {/* Search */}
        <div className="controls">
          <input
            className="search-input"
            placeholder="Search name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span style={{ fontSize:'0.75rem', color:'var(--sr-sub)' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-row hdr">
            <span className="th">Name / Type</span>
            <span className="th">Email</span>
            <span className="th">Region</span>
            <span className="th">Message</span>
            <span className="th">Signed up</span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-row">
              {search ? 'No results for that search.' : 'No signups yet.'}
            </div>
          ) : filtered.map(e => (
            <>
              <div key={e.id} className="table-row">
                <div className="td td-name">
                  <span className="name">
                    {e.first_name || e.last_name
                      ? [e.first_name, e.last_name].filter(Boolean).join(' ')
                      : <span style={{color:'var(--sr-sub)',fontStyle:'italic'}}>—</span>
                    }
                  </span>
                  {e.user_type && <span className="type">{TYPE_SHORT[e.user_type] ?? e.user_type}</span>}
                </div>
                <div className="td td-email">
                  <a href={`mailto:${e.email}`}>{e.email}</a>
                </div>
                <div className="td">
                  <span className={`region-badge ${e.region === 'international' ? 'rb-intl' : 'rb-us'}`}>
                    {e.region === 'international' ? '🌍 Intl' : '🇺🇸 US'}
                  </span>
                </div>
                <div className="td">
                  {e.message
                    ? <button className="msg-btn" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                        {expanded === e.id ? 'Hide ▲' : 'View ▼'}
                      </button>
                    : <span style={{color:'#3A3028',fontSize:'0.72rem'}}>—</span>
                  }
                </div>
                <div className="td td-date">
                  {new Date(e.created_at).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}
                </div>
              </div>
              {expanded === e.id && e.message && (
                <div key={`${e.id}-msg`} className="msg-row">
                  <div className="msg-text">"{e.message}"</div>
                </div>
              )}
            </>
          ))}
        </div>
      </div>
    </>
  )
}
