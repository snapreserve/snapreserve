'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const STATUS_CFG = {
  confirmed:  { label: 'Confirmed',  color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
  checked_in: { label: 'Checked In', color: 'var(--sr-orange)', bg: 'var(--sr-ol)' },
  completed:  { label: 'Completed',  color: '#4ADE80', bg: 'rgba(74,222,128,0.1)' },
  pending:    { label: 'Pending',    color: '#FCD34D', bg: 'rgba(251,191,36,0.1)' },
  cancelled:  { label: 'Cancelled',  color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
  refunded:   { label: 'Refunded',   color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
}

const PAYOUT_CFG = {
  released: { label: 'Released', color: '#4ADE80' },
  refunded: { label: 'Refunded', color: '#F87171' },
  pending:  { label: 'Pending',  color: '#FCD34D' },
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
}

export default function HostBookingsClient({ hostId, hostName, initialBookings, initialTotal, hostListings }) {
  const [bookings, setBookings]   = useState(initialBookings)
  const [total, setTotal]         = useState(initialTotal)
  const [statusFilter, setStatusFilter] = useState('all')
  const [listingId, setListingId] = useState('all')
  const [fromDate, setFromDate]   = useState('')
  const [toDate, setToDate]       = useState('')
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const limit = 50

  const load = useCallback(async (sf, lid, from, to, pg) => {
    setLoading(true)
    const p = new URLSearchParams({ status: sf, page: pg })
    if (lid !== 'all') p.set('listing_id', lid)
    if (from) p.set('from', from)
    if (to)   p.set('to', to)
    const res = await fetch(`/api/admin/hosts/${hostId}/bookings?${p}`)
    if (res.ok) { const d = await res.json(); setBookings(d.bookings); setTotal(d.total) }
    setLoading(false)
  }, [hostId])

  useEffect(() => { load(statusFilter, listingId, fromDate, toDate, page) }, [statusFilter, listingId, fromDate, toDate, page, load])

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      <style>{`
        .topbar{background:var(--sr-surface);border-bottom:1px solid var(--sr-border-solid);padding:16px 32px;display:flex;align-items:center;gap:16px;}
        .topbar h1{font-size:1.05rem;font-weight:700;color:var(--sr-text);}
        .content{padding:24px 32px;}
        .toolbar{display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;align-items:center;}
        .filter-btn{background:var(--sr-surface);border:1px solid var(--sr-border-solid);border-radius:8px;padding:6px 13px;font-size:0.76rem;font-weight:600;color:var(--sr-muted);cursor:pointer;}
        .filter-btn.active{border-color:var(--sr-orange);color:var(--sr-orange);}
        .select-input{background:var(--sr-surface);border:1px solid var(--sr-border-solid);border-radius:8px;padding:6px 12px;font-size:0.78rem;color:var(--sr-text);outline:none;}
        .date-input{background:var(--sr-surface);border:1px solid var(--sr-border-solid);border-radius:8px;padding:6px 10px;font-size:0.78rem;color:var(--sr-text);outline:none;width:130px;}
        .table-wrap{background:var(--sr-surface);border:1px solid var(--sr-border-solid);border-radius:12px;overflow:hidden;}
        .tr{display:grid;grid-template-columns:90px 1.8fr 1fr 90px 90px 90px 80px 90px 80px;gap:10px;padding:11px 16px;border-bottom:1px solid var(--sr-border-solid);align-items:center;font-size:0.79rem;}
        .tr:last-child{border-bottom:none;}
        .tr.hdr{background:var(--sr-bg);}
        .tr.hdr span{font-size:0.67rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--sr-sub);}
        .badge{display:inline-flex;padding:2px 8px;border-radius:20px;font-size:0.65rem;font-weight:700;}
        .empty{padding:48px;text-align:center;color:var(--sr-sub);font-size:0.86rem;}
        .pagination{display:flex;gap:8px;justify-content:flex-end;padding:14px 16px;align-items:center;font-size:0.78rem;color:var(--sr-muted);}
        .pg-btn{background:var(--sr-surface);border:1px solid var(--sr-border-solid);border-radius:6px;padding:5px 12px;font-size:0.76rem;cursor:pointer;color:var(--sr-text);}
        .pg-btn:disabled{opacity:0.4;cursor:not-allowed;}
      `}</style>

      <div className="topbar">
        <Link href="/admin/hosts" style={{ fontSize: '0.82rem', color: 'var(--sr-muted)', textDecoration: 'none' }}>← Hosts</Link>
        <h1>{hostName} — Bookings</h1>
        <span style={{ fontSize: '0.78rem', color: 'var(--sr-muted)', marginLeft: 'auto' }}>{total} total</span>
      </div>

      <div className="content">
        <div className="toolbar">
          {['all','confirmed','checked_in','completed','pending','cancelled'].map(f => (
            <button key={f} className={`filter-btn${statusFilter===f?' active':''}`} onClick={() => { setStatusFilter(f); setPage(1) }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          {hostListings.length > 0 && (
            <select className="select-input" value={listingId} onChange={e => { setListingId(e.target.value); setPage(1) }}>
              <option value="all">All Properties</option>
              {hostListings.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          )}
          <input type="date" className="date-input" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1) }} placeholder="From" />
          <input type="date" className="date-input" value={toDate}   onChange={e => { setToDate(e.target.value); setPage(1) }} placeholder="To" />
          {(fromDate || toDate) && (
            <button className="filter-btn" onClick={() => { setFromDate(''); setToDate(''); setPage(1) }}>Clear dates</button>
          )}
        </div>

        <div className="table-wrap">
          <div className="tr hdr">
            <span>Ref</span>
            <span>Property</span>
            <span>Guest</span>
            <span>Check-in</span>
            <span>Check-out</span>
            <span>Total</span>
            <span>Svc Fee</span>
            <span>Status</span>
            <span>Payout</span>
          </div>
          {loading ? (
            <div className="empty">Loading…</div>
          ) : bookings.length === 0 ? (
            <div className="empty">No bookings found.</div>
          ) : bookings.map(b => {
            const sc  = STATUS_CFG[b.status]  || { label: b.status,  color: 'var(--sr-muted)', bg: 'transparent' }
            const psc = PAYOUT_CFG[b.payout_status] || PAYOUT_CFG.pending
            const cancelLabel = b.cancelled_by ? ` (${b.cancelled_by})` : ''
            return (
              <div key={b.id} className="tr">
                <div style={{ fontFamily: 'monospace', fontSize: '0.74rem', color: 'var(--sr-orange)', fontWeight: 700 }}>{b.reference}</div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--sr-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.listing_title}</div>
                  <div style={{ fontSize: '0.69rem', color: 'var(--sr-muted)' }}>{b.listing_city}</div>
                </div>
                <div style={{ color: 'var(--sr-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.guest_name}</div>
                <div style={{ color: 'var(--sr-muted)' }}>{fmtDate(b.check_in)}</div>
                <div style={{ color: 'var(--sr-muted)' }}>{fmtDate(b.check_out)}</div>
                <div style={{ fontWeight: 600, color: 'var(--sr-text)' }}>${Number(b.total_amount||0).toFixed(2)}</div>
                <div style={{ color: 'var(--sr-muted)' }}>${Number(b.service_fee||0).toFixed(2)}</div>
                <div>
                  <span className="badge" style={{ background: sc.bg, color: sc.color }}>{sc.label}{cancelLabel}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: psc.color, fontWeight: 700 }}>{psc.label}</div>
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
