'use client'
import { useState } from 'react'

export default function WaitlistClient({ entries, total }) {
  const [copied, setCopied]   = useState(false)
  const [search, setSearch]   = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const roles = ['all', ...Array.from(new Set(entries.map(e => e.role).filter(Boolean)))]

  const filtered = entries.filter(e => {
    const matchRole = roleFilter === 'all' || e.role === roleFilter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (e.email        || '').toLowerCase().includes(q) ||
      (e.first_name   || '').toLowerCase().includes(q) ||
      (e.last_name    || '').toLowerCase().includes(q) ||
      (e.city         || '').toLowerCase().includes(q) ||
      (e.referral_code|| '').toLowerCase().includes(q)
    return matchRole && matchSearch
  })

  function copyEmails() {
    navigator.clipboard.writeText(filtered.map(e => e.email).join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function exportCSV() {
    const rows = [
      ['#', 'First Name', 'Last Name', 'Email', 'City', 'Role', 'Interest', 'Referral Code', 'Referred By', 'Signed up'],
      ...filtered.map((e, i) => [
        i + 1,
        e.first_name     || '',
        e.last_name      || '',
        e.email,
        e.city           || '',
        e.role           || '',
        e.interest       || '',
        e.referral_code  || '',
        e.referred_by    || '',
        new Date(e.created_at).toLocaleString(),
      ])
    ]
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `waitlist-v2-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <style>{`
        .topbar { background:var(--sr-surface); border-bottom:1px solid var(--sr-border-solid); padding:16px 32px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
        .topbar-left { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .topbar h1 { font-size:1.05rem; font-weight:700; color:var(--sr-text); }
        .count-pill { background:rgba(244,96,26,0.12); color:var(--sr-orange); font-size:0.72rem; font-weight:700; padding:4px 12px; border-radius:20px; }
        .topbar-actions { display:flex; gap:8px; }
        .btn { padding:8px 16px; border-radius:8px; font-size:0.78rem; font-weight:700; cursor:pointer; font-family:inherit; border:none; transition:all 0.15s; }
        .btn-ghost  { background:rgba(255,255,255,0.06); color:var(--sr-muted); border:1px solid var(--sr-border-solid); }
        .btn-ghost:hover { background:rgba(255,255,255,0.1); color:var(--sr-text); }
        .btn-orange { background:var(--sr-orange); color:white; }
        .btn-orange:hover { opacity:0.9; }

        .content { padding:28px 32px; }

        .controls { display:flex; gap:12px; align-items:center; margin-bottom:20px; flex-wrap:wrap; }
        .search-input { flex:1; min-width:220px; max-width:340px; background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:10px; padding:9px 16px; font-size:0.84rem; color:var(--sr-text); font-family:inherit; outline:none; }
        .search-input::placeholder { color:var(--sr-sub); }
        .search-input:focus { border-color:var(--sr-orange); }
        .filter-select { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:10px; padding:9px 14px; font-size:0.84rem; color:var(--sr-text); font-family:inherit; outline:none; cursor:pointer; }
        .filter-select:focus { border-color:var(--sr-orange); }
        .result-count { font-size:0.75rem; color:var(--sr-sub); }

        .table-wrap { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:12px; overflow:hidden; }
        .table-row { display:grid; grid-template-columns:180px 1fr 120px 140px 150px 130px; border-bottom:1px solid var(--sr-border-solid); }
        .table-row:last-child { border-bottom:none; }
        .table-row.hdr { background:var(--sr-bg); }
        .th { padding:10px 16px; font-size:0.65rem; font-weight:800; text-transform:uppercase; letter-spacing:0.09em; color:var(--sr-sub); }
        .td { padding:13px 16px; font-size:0.83rem; color:var(--sr-text); display:flex; align-items:center; border-left:1px solid var(--sr-border-solid); overflow:hidden; }
        .td:first-child { border-left:none; }
        .td-name { flex-direction:column; align-items:flex-start; gap:2px; }
        .td-name .name { font-weight:600; font-size:0.84rem; }
        .td-name .sub  { font-size:0.7rem; color:var(--sr-muted); }
        .td-email a  { color:#C084FC; text-decoration:none; font-size:0.81rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .td-email a:hover { text-decoration:underline; }
        .ref-code { font-size:0.75rem; font-family:monospace; color:var(--sr-orange); background:rgba(244,96,26,0.08); padding:2px 8px; border-radius:6px; }
        .tag { display:inline-block; padding:3px 9px; border-radius:20px; font-size:0.7rem; font-weight:600; }
        .tag-role { background:rgba(59,130,246,0.12); color:#60A5FA; }
        .td-date { font-size:0.75rem; color:var(--sr-sub); }
        .empty-row { padding:56px 20px; text-align:center; color:var(--sr-sub); font-size:0.84rem; }

        @media(max-width:1100px) { .table-row { grid-template-columns:160px 1fr 120px 140px 130px; } .table-row > *:nth-child(6) { display:none; } }
        @media(max-width:900px)  { .table-row { grid-template-columns:1fr 1fr 110px; } .table-row > *:nth-child(3),.table-row > *:nth-child(5),.table-row > *:nth-child(6) { display:none; } }
        @media(max-width:768px)  { .content{padding:20px;} .topbar{padding:14px 20px;} }
      `}</style>

      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-left">
          <h1>Waitlist v2</h1>
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

        {/* Controls */}
        <div className="controls">
          <input
            className="search-input"
            placeholder="Search name, email, city, or referral code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="filter-select"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            {roles.map(r => (
              <option key={r} value={r}>{r === 'all' ? 'All roles' : r}</option>
            ))}
          </select>
          <span className="result-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-row hdr">
            <span className="th">Name / City</span>
            <span className="th">Email</span>
            <span className="th">Role</span>
            <span className="th">Interest</span>
            <span className="th">Referral Code</span>
            <span className="th">Signed up</span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-row">
              {search || roleFilter !== 'all' ? 'No results for that filter.' : 'No signups yet.'}
            </div>
          ) : filtered.map(e => (
            <div key={e.id} className="table-row">
              <div className="td td-name">
                <span className="name">
                  {e.first_name || e.last_name
                    ? [e.first_name, e.last_name].filter(Boolean).join(' ')
                    : <span style={{color:'var(--sr-sub)',fontStyle:'italic'}}>—</span>
                  }
                </span>
                {e.city && <span className="sub">📍 {e.city}</span>}
              </div>
              <div className="td td-email">
                <a href={`mailto:${e.email}`}>{e.email}</a>
              </div>
              <div className="td">
                {e.role
                  ? <span className="tag tag-role">{e.role}</span>
                  : <span style={{color:'#3A3028',fontSize:'0.72rem'}}>—</span>
                }
              </div>
              <div className="td" style={{fontSize:'0.75rem',color:'var(--sr-muted)'}}>
                {e.interest || <span style={{color:'#3A3028'}}>—</span>}
              </div>
              <div className="td">
                {e.referral_code
                  ? <span className="ref-code">{e.referral_code}</span>
                  : <span style={{color:'#3A3028',fontSize:'0.72rem'}}>—</span>
                }
              </div>
              <div className="td td-date">
                {new Date(e.created_at).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
