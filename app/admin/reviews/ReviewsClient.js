'use client'
import { useState, useEffect, useCallback } from 'react'

const STARS = n => '★'.repeat(n) + '☆'.repeat(5 - n)

export default function ReviewsClient({ initialReviews, initialTotal }) {
  const [reviews, setReviews]       = useState(initialReviews)
  const [total, setTotal]           = useState(initialTotal)
  const [filter, setFilter]         = useState('all')   // all | visible | hidden
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const [toast, setToast]           = useState(null)
  const [busy, setBusy]             = useState({})

  const limit = 25

  const load = useCallback(async (f, s, pg) => {
    setLoading(true)
    const params = new URLSearchParams({ filter: f, search: s, page: pg, limit })
    const res = await fetch(`/api/admin/reviews?${params}`)
    if (res.ok) {
      const data = await res.json()
      setReviews(data.reviews)
      setTotal(data.total)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(filter, search, page) }, [filter, search, page, load])

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function toggleHide(review) {
    const action = review.is_hidden ? 'unhide' : 'hide'
    setBusy(b => ({ ...b, [review.id]: true }))
    const res = await fetch(`/api/admin/reviews/${review.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setBusy(b => ({ ...b, [review.id]: false }))
    if (res.ok) {
      showToast(`Review ${action === 'hide' ? 'hidden' : 'restored'} and listing rating updated.`)
      load(filter, search, page)
    } else {
      const d = await res.json()
      showToast(d.error || 'Error', false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      <style>{`
        .topbar { background:var(--sr-surface); border-bottom:1px solid var(--sr-border-solid); padding:16px 32px; display:flex; align-items:center; justify-content:space-between; }
        .topbar h1 { font-size:1.05rem; font-weight:700; color:var(--sr-text); }
        .content { padding:24px 32px; }
        .toolbar { display:flex; gap:10px; margin-bottom:20px; align-items:center; flex-wrap:wrap; }
        .search-input { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:8px; padding:8px 14px; font-size:0.84rem; color:var(--sr-text); outline:none; width:280px; }
        .filter-btn { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:8px; padding:7px 14px; font-size:0.78rem; font-weight:600; color:var(--sr-muted); cursor:pointer; }
        .filter-btn.active { border-color:var(--sr-orange); color:var(--sr-orange); }
        .table-wrap { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:12px; overflow:hidden; }
        .table-row { display:grid; grid-template-columns:1.4fr 1fr 80px 80px 80px 80px 80px 110px; gap:12px; padding:13px 20px; border-bottom:1px solid var(--sr-border-solid); align-items:center; }
        .table-row:last-child { border-bottom:none; }
        .table-row.hdr { background:var(--sr-bg); }
        .table-row.hdr span { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-sub); }
        .listing-title { font-size:0.84rem; font-weight:600; color:var(--sr-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .listing-sub { font-size:0.72rem; color:var(--sr-muted); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .stars { color:#F59E0B; font-size:0.78rem; letter-spacing:-1px; }
        .comment-cell { font-size:0.76rem; color:var(--sr-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .badge { display:inline-flex; padding:2px 8px; border-radius:20px; font-size:0.66rem; font-weight:700; }
        .badge.visible { background:rgba(74,222,128,0.12); color:#4ADE80; }
        .badge.hidden  { background:rgba(248,113,113,0.12); color:#F87171; }
        .hide-btn { font-size:0.74rem; font-weight:600; padding:5px 12px; border-radius:6px; cursor:pointer; border:1px solid; }
        .hide-btn.show-action { border-color:#F87171; color:#F87171; background:none; }
        .hide-btn.hide-action { border-color:#4ADE80; color:#4ADE80; background:none; }
        .hide-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .empty { padding:48px; text-align:center; color:var(--sr-sub); font-size:0.86rem; }
        .pagination { display:flex; gap:8px; justify-content:flex-end; padding:16px 20px; align-items:center; font-size:0.78rem; color:var(--sr-muted); }
        .pg-btn { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:6px; padding:5px 12px; font-size:0.76rem; cursor:pointer; color:var(--sr-text); }
        .pg-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:10px; font-size:0.84rem; font-weight:600; z-index:9999; color:white; }
        .toast.ok  { background:#16A34A; }
        .toast.err { background:#DC2626; }
      `}</style>

      <div className="topbar">
        <h1>Reviews</h1>
        <span style={{ fontSize: '0.78rem', color: 'var(--sr-muted)' }}>{total} total</span>
      </div>

      <div className="content">
        <div className="toolbar">
          <input
            className="search-input"
            placeholder="Search listing or guest…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          {['all', 'visible', 'hidden'].map(f => (
            <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`}
              onClick={() => { setFilter(f); setPage(1) }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          <div className="table-row hdr">
            <span>Listing</span>
            <span>Guest · Comment</span>
            <span>Overall</span>
            <span>Clean</span>
            <span>Accuracy</span>
            <span>Comms</span>
            <span>Status</span>
            <span></span>
          </div>

          {loading ? (
            <div className="empty">Loading…</div>
          ) : reviews.length === 0 ? (
            <div className="empty">No reviews found.</div>
          ) : reviews.map(r => (
            <div key={r.id} className="table-row" style={r.is_hidden ? { opacity: 0.55 } : {}}>
              <div>
                <div className="listing-title">{r.listing_title || 'Untitled'}</div>
                <div className="listing-sub">{r.listing_city || '—'} · {r.guest_name}</div>
              </div>
              <div className="comment-cell" title={r.comment || ''}>{r.comment || <em style={{ color: 'var(--sr-sub)' }}>No comment</em>}</div>
              <div><span className="stars">{STARS(Math.round(r.rating))}</span><div style={{ fontSize: '0.68rem', color: 'var(--sr-muted)' }}>{Number(r.rating).toFixed(1)}</div></div>
              <div style={{ fontSize: '0.78rem', color: 'var(--sr-muted)' }}>{r.cleanliness ?? '—'}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--sr-muted)' }}>{r.accuracy ?? '—'}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--sr-muted)' }}>{r.communication ?? '—'}</div>
              <div>
                <span className={`badge ${r.is_hidden ? 'hidden' : 'visible'}`}>
                  {r.is_hidden ? 'Hidden' : 'Visible'}
                </span>
              </div>
              <div>
                <button
                  className={`hide-btn ${r.is_hidden ? 'hide-action' : 'show-action'}`}
                  disabled={!!busy[r.id]}
                  onClick={() => toggleHide(r)}
                >
                  {busy[r.id] ? '…' : r.is_hidden ? 'Restore' : 'Hide'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <span>Page {page} of {totalPages}</span>
            <button className="pg-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="pg-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toast.ok ? 'ok' : 'err'}`}>{toast.msg}</div>}
    </>
  )
}
