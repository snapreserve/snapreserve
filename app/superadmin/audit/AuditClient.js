'use client'
import { useState, useMemo } from 'react'

const ACTION_COLORS = {
  'listing.approve': '#4ADE80',
  'listing.reject': '#F87171',
  'listing.request_changes': '#93C5FD',
  'listing.soft_delete': '#FCD34D',
  'listing.hard_deleted': '#F87171',
  'role.granted': '#C084FC',
  'role.revoked': '#F87171',
  'user.soft_deleted': '#FCD34D',
  'user.hard_deleted': '#F87171',
}

function actionColor(action) {
  return ACTION_COLORS[action] ?? '#A89880'
}

export default function AuditClient({ logs }) {
  const [filter, setFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const allRoles = useMemo(() => {
    const roles = [...new Set(logs.map(l => l.actor_role).filter(Boolean))]
    return roles
  }, [logs])

  const filtered = useMemo(() => {
    return logs.filter(l => {
      const matchFilter = !filter ||
        l.action?.includes(filter) ||
        l.actor_email?.includes(filter) ||
        l.target_id?.includes(filter) ||
        l.target_type?.includes(filter)
      const matchRole = roleFilter === 'all' || l.actor_role === roleFilter
      return matchFilter && matchRole
    })
  }, [logs, filter, roleFilter])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .topbar { background:#1A1712; border-bottom:1px solid #2A2420; padding:16px 32px; display:flex; align-items:center; justify-content:space-between; }
        .topbar h1 { font-size:1.05rem; font-weight:700; }
        .count { font-size:0.78rem; color:#A89880; }
        .content { padding:28px 32px; }
        .filters { display:flex; gap:12px; margin-bottom:20px; }
        .search-input { flex:1; background:#1A1712; border:1px solid #2A2420; border-radius:9px; padding:10px 14px; font-size:0.85rem; font-family:inherit; color:#F5F0EB; outline:none; }
        .search-input:focus { border-color:#F4601A; }
        .role-select { background:#1A1712; border:1px solid #2A2420; border-radius:9px; padding:10px 14px; font-size:0.85rem; font-family:inherit; color:#F5F0EB; outline:none; }
        .table-wrap { background:#1A1712; border:1px solid #2A2420; border-radius:14px; overflow:hidden; }
        .log-row { border-bottom:1px solid #2A2420; }
        .log-row:last-child { border-bottom:none; }
        .log-main { display:grid; grid-template-columns:160px 1fr 100px 120px 60px; gap:12px; padding:12px 20px; align-items:center; cursor:pointer; transition:background 0.12s; }
        .log-main:hover { background:#1F1C18; }
        .log-main.open { background:#1F1C18; }
        .hdr { background:#141210; }
        .hdr span { font-size:0.66rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6B5E52; }
        .action-text { font-size:0.82rem; font-weight:700; }
        .actor-text { font-size:0.8rem; color:#A89880; }
        .actor-role { font-size:0.67rem; font-weight:700; color:#6B5E52; margin-top:2px; }
        .target-text { font-size:0.78rem; color:#A89880; font-family:monospace; }
        .date-text { font-size:0.76rem; color:#6B5E52; }
        .chev { color:#6B5E52; font-size:0.8rem; }
        .detail-panel { padding:16px 20px; background:#0F0D0A; border-top:1px solid #2A2420; }
        .detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .dj { background:#1A1712; border-radius:8px; padding:12px; }
        .dj-label { font-size:0.63rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6B5E52; margin-bottom:6px; }
        .dj-val { font-size:0.76rem; color:#A89880; font-family:monospace; white-space:pre-wrap; word-break:break-all; max-height:160px; overflow:auto; }
        .ip-row { font-size:0.74rem; color:#6B5E52; margin-top:12px; }
        .empty { padding:56px; text-align:center; color:#6B5E52; font-size:0.84rem; }
        @media(max-width:1024px) { .log-main{grid-template-columns:1fr 80px 50px;} .log-main>*:nth-child(3),.log-main>*:nth-child(4){display:none;} .detail-grid{grid-template-columns:1fr;} }
        @media(max-width:768px) { .content{padding:20px;} .filters{flex-direction:column;} }
      `}</style>

      <div className="topbar">
        <h1>Audit Log</h1>
        <span className="count">{filtered.length} / {logs.length} events</span>
      </div>

      <div className="content">
        <div className="filters">
          <input
            className="search-input"
            placeholder="Filter by action, email, or target ID…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <select className="role-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">All roles</option>
            {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="table-wrap">
          <div className="log-main hdr">
            <span>Timestamp</span>
            <span>Actor / Action</span>
            <span>Target</span>
            <span>IP</span>
            <span></span>
          </div>

          {filtered.length === 0
            ? <div className="empty">No matching events</div>
            : filtered.map(log => {
              const isOpen = expanded === log.id
              return (
                <div key={log.id} className="log-row">
                  <div className={`log-main ${isOpen ? 'open' : ''}`} onClick={() => setExpanded(isOpen ? null : log.id)}>
                    <div className="date-text">
                      {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div>
                      <div className="action-text" style={{ color: actionColor(log.action) }}>{log.action}</div>
                      <div className="actor-text">{log.actor_email ?? '—'}</div>
                      <div className="actor-role">{log.actor_role ?? '—'}</div>
                    </div>
                    <div className="target-text">
                      {log.target_type && <div>{log.target_type}</div>}
                      {log.target_id && <div style={{ fontSize: '0.68rem' }}>{log.target_id.slice(0, 10)}…</div>}
                    </div>
                    <div className="date-text">{log.ip_address ?? '—'}</div>
                    <div className="chev">{isOpen ? '▲' : '▼'}</div>
                  </div>

                  {isOpen && (
                    <div className="detail-panel">
                      <div className="detail-grid">
                        <div className="dj">
                          <div className="dj-label">Before</div>
                          <div className="dj-val">{log.before_data ? JSON.stringify(log.before_data, null, 2) : 'null'}</div>
                        </div>
                        <div className="dj">
                          <div className="dj-label">After</div>
                          <div className="dj-val">{log.after_data ? JSON.stringify(log.after_data, null, 2) : 'null'}</div>
                        </div>
                      </div>
                      <div className="ip-row">
                        IP: {log.ip_address ?? '—'} · UA: {log.user_agent ? log.user_agent.slice(0, 80) : '—'}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          }
        </div>
      </div>
    </>
  )
}
