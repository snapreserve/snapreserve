'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const STATUS_CFG = {
  draft:              { label: 'Draft',             color: 'var(--sr-sub)',  bg: 'rgba(107,94,82,0.12)' },
  pending:            { label: 'Pending Review',    color: '#FCD34D',        bg: 'rgba(251,191,36,0.1)' },
  approved:           { label: 'Approved',          color: '#4ADE80',        bg: 'rgba(74,222,128,0.1)' },
  rejected:           { label: 'Rejected',          color: '#F87171',        bg: 'rgba(248,113,113,0.1)' },
  suspended:          { label: 'Suspended',         color: '#F87171',        bg: 'rgba(248,113,113,0.1)' },
  changes_requested:  { label: 'Changes Requested', color: '#93C5FD',        bg: 'rgba(96,165,250,0.1)' },
  pending_reapproval: { label: 'Pending Reapproval',color: '#FCD34D',        bg: 'rgba(251,191,36,0.1)' },
}

export default function HostListingsClient({ hostId, hostName, initialListings, initialTotal }) {
  const [listings, setListings]     = useState(initialListings)
  const [total, setTotal]           = useState(initialTotal)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const limit = 50

  const load = useCallback(async (sf, s, pg) => {
    setLoading(true)
    const p = new URLSearchParams({ status: sf, search: s, page: pg })
    const res = await fetch(`/api/admin/hosts/${hostId}/listings?${p}`)
    if (res.ok) { const d = await res.json(); setListings(d.listings); setTotal(d.total) }
    setLoading(false)
  }, [hostId])

  useEffect(() => { load(statusFilter, search, page) }, [statusFilter, search, page, load])

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      <style>{`
        .topbar{background:var(--sr-surface);border-bottom:1px solid var(--sr-border-solid);padding:16px 32px;display:flex;align-items:center;gap:16px;}
        .topbar h1{font-size:1.05rem;font-weight:700;color:var(--sr-text);}
        .content{padding:24px 32px;}
        .toolbar{display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;align-items:center;}
        .search-input{background:var(--sr-surface);border:1px solid var(--sr-border-solid);border-radius:8px;padding:7px 13px;font-size:0.83rem;color:var(--sr-text);outline:none;width:240px;}
        .filter-btn{background:var(--sr-surface);border:1px solid var(--sr-border-solid);border-radius:8px;padding:6px 13px;font-size:0.76rem;font-weight:600;color:var(--sr-muted);cursor:pointer;}
        .filter-btn.active{border-color:var(--sr-orange);color:var(--sr-orange);}
        .table-wrap{background:var(--sr-surface);border:1px solid var(--sr-border-solid);border-radius:12px;overflow:hidden;}
        .tr{display:grid;grid-template-columns:2fr 100px 80px 90px 90px 80px 90px;gap:12px;padding:12px 18px;border-bottom:1px solid var(--sr-border-solid);align-items:center;}
        .tr:last-child{border-bottom:none;}
        .tr.hdr{background:#141210;}
        .tr.hdr span{font-size:0.67rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--sr-sub);}
        .title-cell{font-size:0.83rem;font-weight:600;color:var(--sr-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .sub-cell{font-size:0.71rem;color:var(--sr-muted);margin-top:1px;}
        .badge{display:inline-flex;padding:2px 8px;border-radius:20px;font-size:0.66rem;font-weight:700;}
        .empty{padding:48px;text-align:center;color:var(--sr-sub);font-size:0.86rem;}
        .pagination{display:flex;gap:8px;justify-content:flex-end;padding:14px 18px;align-items:center;font-size:0.78rem;color:var(--sr-muted);}
        .pg-btn{background:var(--sr-surface);border:1px solid var(--sr-border-solid);border-radius:6px;padding:5px 12px;font-size:0.76rem;cursor:pointer;color:var(--sr-text);}
        .pg-btn:disabled{opacity:0.4;cursor:not-allowed;}
        .view-link{font-size:0.76rem;color:var(--sr-orange);text-decoration:none;font-weight:600;}
        .view-link:hover{text-decoration:underline;}
      `}</style>

      <div className="topbar">
        <Link href="/admin/hosts" style={{ fontSize: '0.82rem', color: 'var(--sr-muted)', textDecoration: 'none' }}>← Hosts</Link>
        <h1>{hostName} — Listings</h1>
        <span style={{ fontSize: '0.78rem', color: 'var(--sr-muted)', marginLeft: 'auto' }}>{total} total</span>
      </div>

      <div className="content">
        <div className="toolbar">
          <input className="search-input" placeholder="Search by title or city…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          {['all','pending','approved','suspended','rejected','draft'].map(f => (
            <button key={f} className={`filter-btn${statusFilter===f?' active':''}`} onClick={() => { setStatusFilter(f); setPage(1) }}>
              {f === 'all' ? 'All' : STATUS_CFG[f]?.label || f}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          <div className="tr hdr">
            <span>Listing</span>
            <span>Type</span>
            <span>Price/Night</span>
            <span>Rating</span>
            <span>Status</span>
            <span>Active</span>
            <span>Created</span>
          </div>
          {loading ? (
            <div className="empty">Loading…</div>
          ) : listings.length === 0 ? (
            <div className="empty">No listings found.</div>
          ) : listings.map(l => {
            const sc = STATUS_CFG[l.status] || { label: l.status, color: 'var(--sr-muted)', bg: 'transparent' }
            return (
              <div key={l.id} className="tr">
                <div>
                  <div className="title-cell">
                    <a href={`/listings/${l.id}`} target="_blank" style={{ color: 'var(--sr-text)', textDecoration: 'none' }}>{l.title || 'Untitled'}</a>
                  </div>
                  <div className="sub-cell">{[l.city, l.state].filter(Boolean).join(', ')}</div>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--sr-muted)' }}>{l.type === 'hotel' ? '🏨 Hotel' : '🏠 Private'}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sr-text)' }}>${Number(l.price_per_night||0).toFixed(0)}</div>
                <div style={{ fontSize: '0.78rem', color: '#F59E0B' }}>
                  {l.rating > 0 ? `★ ${Number(l.rating).toFixed(1)} (${l.review_count})` : <span style={{ color: 'var(--sr-sub)' }}>—</span>}
                </div>
                <div><span className="badge" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span></div>
                <div style={{ fontSize: '0.78rem', color: l.is_active ? '#4ADE80' : '#F87171', fontWeight: 600 }}>{l.is_active ? 'Yes' : 'No'}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--sr-muted)' }}>
                  {l.created_at ? new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </div>
              </div>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <span>Page {page} of {totalPages}</span>
            <button className="pg-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="pg-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </>
  )
}
