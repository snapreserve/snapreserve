'use client'
import { useState } from 'react'

const STATUS_CONFIG = {
  researching:  { label: 'Researching',  color: '#FCD34D', bg: 'rgba(234,179,8,0.12)' },
  coming_soon:  { label: 'Coming Soon',  color: '#60A5FA', bg: 'rgba(59,130,246,0.12)' },
  live:         { label: 'Live',         color: '#4ADE80', bg: 'rgba(74,222,128,0.12)' },
}

const COUNTRIES = [
  'Canada','United Kingdom','Australia','Germany','France','Netherlands','Spain','Italy',
  'Portugal','Sweden','Norway','Denmark','Switzerland','Austria','Belgium','Ireland',
  'New Zealand','Singapore','Japan','South Korea','UAE','Saudi Arabia','India','Brazil',
  'Mexico','Argentina','Colombia','Chile','South Africa','Nigeria','Kenya','Ghana',
  'Egypt','Israel','Turkey','Poland','Czech Republic','Hungary','Romania','Greece',
  'Other',
]

const QUARTERS = ['Q1 2026','Q2 2026','Q3 2026','Q4 2026','Q1 2027','Q2 2027','Q3 2027','Q4 2027']

const LAUNCH_PRIORITY_CONFIG = {
  high:   { label: 'High',   color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  medium: { label: 'Medium', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  low:    { label: 'Low',    color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
}

export default function IntlLeadsClient({ leads, total, topCountries, trend, expansion: initialExpansion, canEdit }) {
  const [tab, setTab]               = useState('leads')
  const [search, setSearch]         = useState('')
  const [countryFilter, setCountryFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [regionTagFilter, setRegionTagFilter] = useState('all')
  const [founderPotential, setFounderPotential] = useState(false)
  const [copied, setCopied]         = useState(false)
  const [expansion, setExpansion]   = useState(initialExpansion)
  const [editRow, setEditRow]       = useState(null) // null | { country, status, priority_rank, target_quarter, notes }
  const [editLeadRow, setEditLeadRow] = useState(null) // null | lead id being edited inline
  const [editLeadData, setEditLeadData] = useState({})
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState(null)
  const [localLeads, setLocalLeads] = useState(leads)

  const allCountries = ['all', ...Array.from(new Set(localLeads.map(l => l.country))).sort()]
  const allRegionTags = ['all', ...Array.from(new Set(localLeads.map(l => l.region_tag).filter(Boolean))).sort()]

  const filtered = localLeads.filter(l => {
    const matchCountry  = countryFilter   === 'all' || l.country       === countryFilter
    const matchRole     = roleFilter      === 'all' || l.role          === roleFilter
    const matchPriority = priorityFilter  === 'all' || l.launch_priority === priorityFilter
    const matchRegion   = regionTagFilter === 'all' || l.region_tag    === regionTagFilter
    const matchFounder  = !founderPotential || l.founder_potential
    const q = search.toLowerCase()
    const matchSearch   = !q || l.email.toLowerCase().includes(q) || l.country.toLowerCase().includes(q) || (l.region_tag || '').toLowerCase().includes(q)
    return matchCountry && matchRole && matchPriority && matchRegion && matchFounder && matchSearch
  })

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function copyEmails() {
    navigator.clipboard.writeText(filtered.map(l => l.email).join('\n')).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  async function saveLead(id) {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/intl-leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editLeadData),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed') }
      setLocalLeads(prev => prev.map(l => l.id === id ? { ...l, ...editLeadData } : l))
      setEditLeadRow(null)
      showToast('Lead updated')
    } catch (err) { showToast(err.message, 'error') }
    finally { setSaving(false) }
  }

  function exportCSV() {
    const rows = [
      ['Email','Country','Role','Source','Region Tag','Launch Priority','Founder Potential','Signed up'],
      ...filtered.map(l => [
        l.email, l.country, l.role, l.source, l.region_tag||'', l.launch_priority||'medium',
        l.founder_potential ? 'Yes' : 'No',
        new Date(l.created_at).toLocaleString(),
      ])
    ]
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a    = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `intl-leads-${new Date().toISOString().slice(0,10)}.csv`,
    })
    a.click()
  }

  async function saveExpansion(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res  = await fetch('/api/admin/country-expansion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editRow),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setExpansion(prev => {
        const idx = prev.findIndex(c => c.country === data.country.country)
        if (idx >= 0) { const next = [...prev]; next[idx] = data.country; return next }
        return [...prev, data.country].sort((a, b) => (a.priority_rank ?? 999) - (b.priority_rank ?? 999))
      })
      setEditRow(null)
      showToast(`${data.country.country} saved`)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function deleteExpansion(country) {
    if (!confirm(`Remove ${country} from the expansion list?`)) return
    const res  = await fetch('/api/admin/country-expansion', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country }),
    })
    if (res.ok) {
      setExpansion(prev => prev.filter(c => c.country !== country))
      showToast(`${country} removed`)
    }
  }

  const recentCount = localLeads.filter(l =>
    new Date(l.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length

  return (
    <>
      <style>{`
        .topbar{background:var(--sr-surface);border-bottom:1px solid var(--sr-border-solid);padding:16px 32px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
        .topbar h1{font-size:1.05rem;font-weight:700;color:var(--sr-text)}
        .topbar-actions{display:flex;gap:8px}
        .btn{padding:8px 16px;border-radius:8px;font-size:0.78rem;font-weight:700;cursor:pointer;font-family:inherit;border:none;transition:all 0.15s}
        .btn-ghost{background:rgba(255,255,255,0.06);color:var(--sr-muted);border:1px solid var(--sr-border-solid)}
        .btn-ghost:hover{background:rgba(255,255,255,0.1);color:var(--sr-text)}
        .btn-orange{background:var(--sr-orange);color:#fff}
        .btn-orange:hover{opacity:0.9}
        .btn-sm{padding:5px 12px;font-size:0.72rem}
        .btn-danger{background:rgba(239,68,68,0.12);color:#F87171;border:1px solid rgba(239,68,68,0.2)}
        .btn-danger:hover{background:rgba(239,68,68,0.2)}
        .content{padding:28px 32px}

        /* Stats */
        .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px}
        .stat-card{background:var(--sr-surface);border:1px solid var(--sr-border-solid);border-radius:12px;padding:18px 20px}
        .stat-label{font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--sr-sub);margin-bottom:6px}
        .stat-value{font-size:1.6rem;font-weight:800;color:var(--sr-text)}
        .stat-sub{font-size:0.72rem;color:var(--sr-muted);margin-top:4px}

        /* Top countries */
        .top-countries{background:var(--sr-surface);border:1px solid var(--sr-border-solid);border-radius:12px;padding:20px;margin-bottom:24px}
        .section-title{font-size:0.8rem;font-weight:700;color:var(--sr-text);margin-bottom:14px}
        .country-bar-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
        .country-bar-label{font-size:0.78rem;color:var(--sr-muted);width:140px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .country-bar-track{flex:1;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden}
        .country-bar-fill{height:100%;background:var(--sr-orange);border-radius:3px;transition:width 0.4s}
        .country-bar-count{font-size:0.72rem;font-weight:700;color:var(--sr-muted);width:28px;text-align:right}

        /* Tabs */
        .tabs{display:flex;gap:4px;margin-bottom:20px;background:var(--sr-bg);border:1px solid var(--sr-border-solid);border-radius:10px;padding:4px;width:fit-content}
        .tab{padding:7px 16px;border-radius:7px;font-size:0.78rem;font-weight:700;cursor:pointer;border:none;background:transparent;color:var(--sr-sub);font-family:inherit;transition:all 0.15s}
        .tab.active{background:var(--sr-surface);color:var(--sr-text);box-shadow:0 1px 4px rgba(0,0,0,0.3)}

        /* Controls */
        .controls{display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap}
        .search-input,.filter-select{background:var(--sr-surface);border:1px solid var(--sr-border-solid);border-radius:10px;padding:8px 14px;font-size:0.83rem;color:var(--sr-text);font-family:inherit;outline:none}
        .search-input{flex:1;min-width:200px;max-width:300px}
        .search-input::placeholder{color:var(--sr-sub)}
        .search-input:focus,.filter-select:focus{border-color:var(--sr-orange)}
        .result-count{font-size:0.74rem;color:var(--sr-sub)}

        /* Table */
        .table-wrap{background:var(--sr-surface);border:1px solid var(--sr-border-solid);border-radius:12px;overflow:hidden}
        .table-row{display:grid;grid-template-columns:1fr 160px 90px 100px 130px;border-bottom:1px solid var(--sr-border-solid)}
        .table-row:last-child{border-bottom:none}
        .table-row.hdr{background:var(--sr-bg)}
        .th{padding:10px 16px;font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:0.09em;color:var(--sr-sub)}
        .td{padding:12px 16px;font-size:0.82rem;color:var(--sr-text);display:flex;align-items:center;border-left:1px solid var(--sr-border-solid);overflow:hidden}
        .td:first-child{border-left:none}
        .td a{color:#C084FC;text-decoration:none;font-size:0.81rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .td a:hover{text-decoration:underline}
        .role-badge{display:inline-block;padding:3px 9px;border-radius:20px;font-size:0.7rem;font-weight:600}
        .rb-guest{background:rgba(59,130,246,0.12);color:#60A5FA}
        .rb-host{background:rgba(244,96,26,0.12);color:var(--sr-orange)}
        .td-date{font-size:0.74rem;color:var(--sr-sub)}
        .empty-row{padding:48px 20px;text-align:center;color:var(--sr-sub);font-size:0.84rem}

        /* Expansion table */
        .exp-table-row{display:grid;grid-template-columns:180px 120px 80px 120px 1fr 100px;border-bottom:1px solid var(--sr-border-solid)}
        .exp-table-row:last-child{border-bottom:none}
        .status-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:700}

        /* Edit form */
        .edit-form{background:var(--sr-bg);border:1px solid var(--sr-orange);border-radius:12px;padding:20px;margin-bottom:16px}
        .edit-form h3{font-size:0.85rem;font-weight:700;color:var(--sr-text);margin-bottom:14px}
        .form-grid{display:grid;grid-template-columns:1fr 1fr 80px 120px;gap:12px;margin-bottom:12px}
        .form-field{display:flex;flex-direction:column;gap:5px}
        .form-field label{font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--sr-sub)}
        .form-input,.form-select{background:var(--sr-surface);border:1px solid var(--sr-border-solid);border-radius:8px;padding:8px 12px;font-size:0.83rem;color:var(--sr-text);font-family:inherit;outline:none}
        .form-input:focus,.form-select:focus{border-color:var(--sr-orange)}
        .form-textarea{background:var(--sr-surface);border:1px solid var(--sr-border-solid);border-radius:8px;padding:8px 12px;font-size:0.82rem;color:var(--sr-text);font-family:inherit;outline:none;resize:vertical;min-height:60px;width:100%}
        .form-textarea:focus{border-color:var(--sr-orange)}
        .form-actions{display:flex;gap:8px;margin-top:4px}

        /* Toast */
        .toast{position:fixed;bottom:24px;right:24px;background:var(--sr-surface);border:1px solid var(--sr-border-solid);border-radius:10px;padding:12px 18px;font-size:0.84rem;font-weight:500;z-index:200;color:var(--sr-text)}
        .toast.success{border-color:rgba(74,222,128,0.4);color:#4ADE80}
        .toast.error{border-color:rgba(248,113,113,0.4);color:#F87171}

        @media(max-width:900px){.table-row{grid-template-columns:1fr 130px 90px}.table-row>*:nth-child(4),.table-row>*:nth-child(5){display:none}.exp-table-row{grid-template-columns:1fr 100px 1fr}.exp-table-row>*:nth-child(3),.exp-table-row>*:nth-child(4){display:none}.form-grid{grid-template-columns:1fr 1fr}}
        @media(max-width:768px){.content{padding:20px}.topbar{padding:14px 20px}.stats-grid{grid-template-columns:1fr 1fr}}
      `}</style>

      {/* Top bar */}
      <div className="topbar">
        <h1>International Expansion Leads</h1>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={copyEmails}>{copied ? '✓ Copied!' : '📋 Copy emails'}</button>
          <button className="btn btn-orange" onClick={exportCSV}>📥 Export CSV</button>
        </div>
      </div>

      <div className="content">

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Leads</div>
            <div className="stat-value">{total.toLocaleString()}</div>
            <div className="stat-sub">{allCountries.length - 1} countries</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Founder Potential</div>
            <div className="stat-value">{localLeads.filter(l => l.founder_potential).length}</div>
            <div className="stat-sub">marked leads</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Last 7 Days</div>
            <div className="stat-value">{recentCount}</div>
            <div className="stat-sub">new signups</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Top Country</div>
            <div className="stat-value" style={{fontSize:'1.1rem'}}>{topCountries[0]?.country ?? '—'}</div>
            <div className="stat-sub">{topCountries[0]?.count ?? 0} leads</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Hosts</div>
            <div className="stat-value">{localLeads.filter(l => l.role === 'host').length}</div>
            <div className="stat-sub">{localLeads.filter(l => l.role === 'guest').length} guests</div>
          </div>
        </div>

        {/* Top countries bar chart */}
        {topCountries.length > 0 && (
          <div className="top-countries">
            <div className="section-title">Top Countries</div>
            {topCountries.map(({ country, count }) => (
              <div key={country} className="country-bar-row">
                <div className="country-bar-label">{country}</div>
                <div className="country-bar-track">
                  <div
                    className="country-bar-fill"
                    style={{ width: `${Math.round((count / topCountries[0].count) * 100)}%` }}
                  />
                </div>
                <div className="country-bar-count">{count}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab${tab === 'leads' ? ' active' : ''}`} onClick={() => setTab('leads')}>
            Leads ({total})
          </button>
          <button className={`tab${tab === 'expansion' ? ' active' : ''}`} onClick={() => setTab('expansion')}>
            Country Prioritization ({expansion.length})
          </button>
        </div>

        {/* LEADS TAB */}
        {tab === 'leads' && (
          <>
            <div className="controls">
              <input
                className="search-input"
                placeholder="Search email, country, or region…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select className="filter-select" value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
                {allCountries.map(c => <option key={c} value={c}>{c === 'all' ? 'All countries' : c}</option>)}
              </select>
              <select className="filter-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="all">All roles</option>
                <option value="guest">Guest</option>
                <option value="host">Host</option>
              </select>
              <select className="filter-select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                <option value="all">All priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              {allRegionTags.length > 1 && (
                <select className="filter-select" value={regionTagFilter} onChange={e => setRegionTagFilter(e.target.value)}>
                  {allRegionTags.map(r => <option key={r} value={r}>{r === 'all' ? 'All regions' : r}</option>)}
                </select>
              )}
              <button
                onClick={() => setFounderPotential(p => !p)}
                style={{
                  padding:'5px 12px', borderRadius:8, fontSize:'0.72rem', fontWeight:700, cursor:'pointer',
                  border:'1px solid var(--sr-border-solid)', background: founderPotential ? 'rgba(245,158,11,0.15)' : 'var(--sr-surface)',
                  color: founderPotential ? '#F59E0B' : 'var(--sr-muted)', fontFamily:'inherit',
                }}
              >
                {founderPotential ? '⭐ Founder Only' : 'Founder Potential'}
              </button>
              <span className="result-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="table-wrap" style={{overflowX:'auto'}}>
              <div className="table-row" style={{gridTemplateColumns:'1fr 150px 80px 90px 110px 110px 80px 130px'}}>
                <span className="th">Email</span>
                <span className="th">Country</span>
                <span className="th">Role</span>
                <span className="th">Region Tag</span>
                <span className="th">Priority</span>
                <span className="th">Founder</span>
                <span className="th">Source</span>
                <span className="th">Signed up</span>
              </div>
              {filtered.length === 0 ? (
                <div className="empty-row">{search || countryFilter !== 'all' || roleFilter !== 'all' ? 'No results.' : 'No leads yet.'}</div>
              ) : filtered.map(l => {
                const priCfg = LAUNCH_PRIORITY_CONFIG[l.launch_priority] ?? LAUNCH_PRIORITY_CONFIG.medium
                if (editLeadRow === l.id) {
                  return (
                    <div key={l.id} style={{padding:'10px 16px',borderBottom:'1px solid var(--sr-border-solid)',background:'var(--sr-bg)',display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                      <input
                        className="form-input"
                        placeholder="Region tag"
                        value={editLeadData.region_tag ?? l.region_tag ?? ''}
                        onChange={e => setEditLeadData(d => ({ ...d, region_tag: e.target.value }))}
                        style={{width:120,marginBottom:0}}
                      />
                      <select
                        className="form-select"
                        value={editLeadData.launch_priority ?? l.launch_priority ?? 'medium'}
                        onChange={e => setEditLeadData(d => ({ ...d, launch_priority: e.target.value }))}
                        style={{width:100,marginBottom:0}}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      <label style={{display:'flex',alignItems:'center',gap:4,fontSize:'0.76rem',color:'var(--sr-text)',cursor:'pointer'}}>
                        <input
                          type="checkbox"
                          checked={editLeadData.founder_potential ?? l.founder_potential ?? false}
                          onChange={e => setEditLeadData(d => ({ ...d, founder_potential: e.target.checked }))}
                        />
                        Founder Potential
                      </label>
                      <button className="btn btn-orange btn-sm" disabled={saving} onClick={() => saveLead(l.id)}>{saving ? '…' : 'Save'}</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditLeadRow(null); setEditLeadData({}) }}>Cancel</button>
                    </div>
                  )
                }
                return (
                  <div key={l.id} className="table-row" style={{gridTemplateColumns:'1fr 150px 80px 90px 110px 110px 80px 130px'}}>
                    <div className="td"><a href={`mailto:${l.email}`}>{l.email}</a></div>
                    <div className="td">{l.country}</div>
                    <div className="td">
                      <span className={`role-badge ${l.role === 'host' ? 'rb-host' : 'rb-guest'}`}>{l.role}</span>
                    </div>
                    <div className="td" style={{fontSize:'0.74rem',color:'var(--sr-muted)'}}>{l.region_tag || <span style={{color:'#3A3028'}}>—</span>}</div>
                    <div className="td">
                      {l.launch_priority ? (
                        <span className="status-badge" style={{background:priCfg.bg,color:priCfg.color,fontSize:'0.65rem'}}>{priCfg.label}</span>
                      ) : <span style={{color:'#3A3028',fontSize:'0.72rem'}}>—</span>}
                    </div>
                    <div className="td" style={{fontSize:'0.8rem'}}>
                      {l.founder_potential ? <span style={{color:'#F59E0B'}}>⭐ Yes</span> : <span style={{color:'#3A3028'}}>—</span>}
                    </div>
                    <div className="td" style={{fontSize:'0.74rem',color:'var(--sr-sub)'}}>{l.source}</div>
                    <div className="td td-date" style={{display:'flex',alignItems:'center',gap:6,justifyContent:'space-between'}}>
                      <span>{new Date(l.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                      {canEdit && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setEditLeadRow(l.id); setEditLeadData({ region_tag: l.region_tag ?? '', launch_priority: l.launch_priority ?? 'medium', founder_potential: l.founder_potential ?? false }) }}
                          style={{padding:'2px 8px',fontSize:'0.65rem'}}
                        >Edit</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* EXPANSION TAB */}
        {tab === 'expansion' && (
          <>
            {canEdit && (
              <div style={{marginBottom:12}}>
                <button
                  className="btn btn-orange btn-sm"
                  onClick={() => setEditRow({ country:'', status:'researching', priority_rank:'', target_quarter:'', notes:'' })}
                >
                  + Add Country
                </button>
              </div>
            )}

            {editRow && (
              <form className="edit-form" onSubmit={saveExpansion}>
                <h3>{editRow.country ? `Editing: ${editRow.country}` : 'Add Country'}</h3>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Country</label>
                    <select
                      className="form-select"
                      required
                      value={editRow.country}
                      onChange={e => setEditRow(r => ({ ...r, country: e.target.value }))}
                    >
                      <option value="">Select…</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Status</label>
                    <select
                      className="form-select"
                      value={editRow.status}
                      onChange={e => setEditRow(r => ({ ...r, status: e.target.value }))}
                    >
                      <option value="researching">Researching</option>
                      <option value="coming_soon">Coming Soon</option>
                      <option value="live">Live</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Priority</label>
                    <input
                      className="form-input"
                      type="number"
                      min="1"
                      placeholder="1"
                      value={editRow.priority_rank}
                      onChange={e => setEditRow(r => ({ ...r, priority_rank: e.target.value ? parseInt(e.target.value) : '' }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>Target Quarter</label>
                    <select
                      className="form-select"
                      value={editRow.target_quarter ?? ''}
                      onChange={e => setEditRow(r => ({ ...r, target_quarter: e.target.value }))}
                    >
                      <option value="">—</option>
                      {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-field" style={{marginBottom:12}}>
                  <label>Notes</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Regulatory considerations, partner status, etc."
                    value={editRow.notes ?? ''}
                    onChange={e => setEditRow(r => ({ ...r, notes: e.target.value }))}
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-orange btn-sm" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditRow(null)}>Cancel</button>
                </div>
              </form>
            )}

            <div className="table-wrap">
              <div className="exp-table-row hdr">
                <span className="th">Country</span>
                <span className="th">Status</span>
                <span className="th">Priority</span>
                <span className="th">Target Quarter</span>
                <span className="th">Notes</span>
                <span className="th">Actions</span>
              </div>
              {expansion.length === 0 ? (
                <div className="empty-row">No countries added yet. Click "+ Add Country" to get started.</div>
              ) : expansion.map(c => {
                const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.researching
                // Lead count for this country
                const cnt = leads.filter(l => l.country === c.country).length
                return (
                  <div key={c.country} className="exp-table-row">
                    <div className="td">
                      <div>
                        <div style={{fontWeight:600,fontSize:'0.84rem'}}>{c.country}</div>
                        {cnt > 0 && <div style={{fontSize:'0.7rem',color:'var(--sr-sub)'}}>{cnt} lead{cnt !== 1 ? 's' : ''}</div>}
                      </div>
                    </div>
                    <div className="td">
                      <span className="status-badge" style={{background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                    </div>
                    <div className="td" style={{fontSize:'0.82rem',color:'var(--sr-sub)'}}>
                      {c.priority_rank ?? '—'}
                    </div>
                    <div className="td" style={{fontSize:'0.78rem',color:'var(--sr-muted)'}}>
                      {c.target_quarter ?? '—'}
                    </div>
                    <div className="td" style={{fontSize:'0.78rem',color:'var(--sr-muted)'}}>
                      {c.notes ?? <span style={{color:'#3A3028'}}>—</span>}
                    </div>
                    <div className="td" style={{gap:6}}>
                      {canEdit && (
                        <>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditRow({ ...c, priority_rank: c.priority_rank ?? '' })}
                          >Edit</button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => deleteExpansion(c.country)}
                          >Remove</button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}
