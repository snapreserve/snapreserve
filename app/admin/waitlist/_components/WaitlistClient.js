'use client'
import { useState } from 'react'

export default function WaitlistClient({ entries, total }) {
  const [copied, setCopied] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = entries.filter(e =>
    e.email.toLowerCase().includes(search.toLowerCase())
  )

  function copyEmails() {
    const text = entries.map(e => e.email).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function exportCSV() {
    const rows = [
      ['Email', 'Signed up'],
      ...entries.map(e => [e.email, new Date(e.created_at).toLocaleString()])
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `waitlist-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .topbar { background:#1A1712; border-bottom:1px solid #2A2420; padding:16px 32px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
        .topbar-left { display:flex; align-items:center; gap:16px; }
        .topbar h1 { font-size:1.05rem; font-weight:700; color:#F5F0EB; }
        .count-pill { background:rgba(192,132,252,0.12); color:#C084FC; font-size:0.72rem; font-weight:700; padding:4px 12px; border-radius:20px; }
        .topbar-actions { display:flex; gap:8px; }
        .btn { padding:8px 16px; border-radius:8px; font-size:0.78rem; font-weight:700; cursor:pointer; font-family:inherit; border:none; transition:all 0.15s; }
        .btn-ghost { background:rgba(255,255,255,0.06); color:#A89880; border:1px solid #2A2420; }
        .btn-ghost:hover { background:rgba(255,255,255,0.1); color:#F5F0EB; }
        .btn-orange { background:#F4601A; color:white; }
        .btn-orange:hover { background:#FF7A35; }
        .btn-green { background:rgba(74,222,128,0.15); color:#4ADE80; border:1px solid rgba(74,222,128,0.2); }
        .content { padding:32px; }
        .search-wrap { margin-bottom:20px; }
        .search-input { width:100%; max-width:360px; background:#1A1712; border:1px solid #2A2420; border-radius:10px; padding:10px 16px; font-size:0.86rem; color:#F5F0EB; font-family:inherit; outline:none; }
        .search-input::placeholder { color:#6B5E52; }
        .search-input:focus { border-color:#F4601A; }
        .table-wrap { background:#1A1712; border:1px solid #2A2420; border-radius:12px; overflow:hidden; }
        .table-row { display:grid; grid-template-columns:1fr 200px; gap:12px; padding:13px 20px; border-bottom:1px solid #2A2420; align-items:center; }
        .table-row:last-child { border-bottom:none; }
        .table-row.hdr { background:#141210; }
        .table-row.hdr span { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6B5E52; }
        .email-text { font-size:0.86rem; font-weight:500; color:#F5F0EB; }
        .date-text { font-size:0.76rem; color:#A89880; }
        .empty-row { padding:48px; text-align:center; color:#6B5E52; font-size:0.84rem; }
        .launch-box { background:#1A1712; border:1px solid #2A2420; border-radius:12px; padding:24px; margin-bottom:24px; }
        .launch-title { font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6B5E52; margin-bottom:12px; }
        .launch-desc { font-size:0.84rem; color:#A89880; line-height:1.6; margin-bottom:16px; }
        .launch-actions { display:flex; gap:10px; flex-wrap:wrap; }
        @media(max-width:768px) { .content{padding:20px;} .table-row{grid-template-columns:1fr 120px;} }
      `}</style>

      <div className="topbar">
        <div className="topbar-left">
          <h1>Waitlist</h1>
          <span className="count-pill">{total} signup{total !== 1 ? 's' : ''}</span>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={copyEmails}>
            {copied ? '✓ Copied!' : 'Copy emails'}
          </button>
          <button className="btn btn-orange" onClick={exportCSV}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="content">

        {/* Launch email instructions */}
        <div className="launch-box">
          <div className="launch-title">📨 Sending launch emails</div>
          <div className="launch-desc">
            When you're ready to go live, export the CSV or copy all emails and paste into your email provider (Gmail, Mailchimp, Klaviyo, etc.) to send your launch announcement with a sign-up link to <strong style={{color:'#F5F0EB'}}>snapreserve.app/signup</strong>.
          </div>
          <div className="launch-actions">
            <button className="btn btn-ghost" onClick={copyEmails}>
              {copied ? '✓ Copied!' : '📋 Copy all emails'}
            </button>
            <button className="btn btn-ghost" onClick={exportCSV}>
              📥 Download CSV
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="search-wrap">
          <input
            className="search-input"
            placeholder="Search emails…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-row hdr">
            <span>Email address</span>
            <span>Signed up</span>
          </div>
          {filtered.length === 0
            ? <div className="empty-row">
                {search ? 'No results for that search.' : 'No waitlist signups yet.'}
              </div>
            : filtered.map(e => (
              <div key={e.id} className="table-row">
                <div className="email-text">{e.email}</div>
                <div className="date-text">
                  {new Date(e.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </>
  )
}
