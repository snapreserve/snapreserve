'use client'
import { useState, useEffect, useCallback } from 'react'

/* ── helpers ── */
function fmt$(n) {
  if (n == null) return '—'
  const num = Number(n)
  if (isNaN(num)) return '—'
  const abs = Math.abs(num)
  const prefix = num < 0 ? '-' : ''
  if (abs >= 1_000_000) return prefix + '$' + (abs / 1_000_000).toFixed(2) + 'M'
  if (abs >= 1_000)     return prefix + '$' + (abs / 1_000).toFixed(1) + 'K'
  return prefix + '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtFull$(n) {
  if (n == null || isNaN(Number(n))) return '—'
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function statusStyle(status, payStatus) {
  if (status === 'completed')                  return { bg: 'rgba(74,222,128,0.12)',  color: '#4ade80',  label: 'Completed' }
  if (status === 'confirmed')                  return { bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa',  label: 'Confirmed' }
  if (status === 'cancelled' || status === 'refunded') return { bg: 'rgba(248,113,113,0.12)', color: '#f87171', label: 'Refunded' }
  if (status === 'pending')                    return { bg: 'rgba(251,191,36,0.12)',  color: '#fcd34d',  label: 'Pending' }
  return { bg: 'rgba(168,162,158,0.12)', color: '#a8a29e', label: status || '—' }
}

const PRESETS = [
  { value: 'today',  label: 'Today' },
  { value: 'week',   label: 'This Week' },
  { value: 'month',  label: 'This Month' },
  { value: 'year',   label: 'This Year' },
  { value: 'custom', label: 'Custom' },
]

const EMPTY_METRICS = {
  gmv: 0, platform_revenue: 0, host_payouts: 0, total_refunds: 0,
  processing_fees: 0, net_revenue: 0, booking_count: 0, pending_count: 0, avg_booking_value: 0,
}

export default function FinanceClient() {
  const [preset,       setPreset]       = useState('month')
  const [customFrom,   setCustomFrom]   = useState('')
  const [customTo,     setCustomTo]     = useState('')
  const [hostFilter,   setHostFilter]   = useState('')
  const [metrics,      setMetrics]      = useState(EMPTY_METRICS)
  const [transactions, setTransactions] = useState([])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)
  const [loading,      setLoading]      = useState(true)
  const [exporting,    setExporting]    = useState(false)
  const [toast,        setToast]        = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const buildUrl = useCallback((extra = {}) => {
    const p = new URLSearchParams({ preset, page: String(page), ...extra })
    if (preset === 'custom' && customFrom) p.set('from', customFrom)
    if (preset === 'custom' && customTo)   p.set('to', customTo)
    return `/api/admin/finance?${p.toString()}`
  }, [preset, customFrom, customTo, page])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(buildUrl())
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setMetrics(data.metrics || EMPTY_METRICS)
      setTransactions(data.transactions || [])
      setTotal(data.total || 0)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [buildUrl])

  useEffect(() => { fetchData() }, [fetchData])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [preset, customFrom, customTo])

  async function handleExport() {
    setExporting(true)
    try {
      const url = buildUrl({ export: 'true', page: '1' })
      const res = await fetch(url)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `finance-${preset}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      showToast('CSV exported successfully')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(total / 50)

  const METRIC_CARDS = [
    { key: 'gmv',              label: 'Gross Booking Volume',  color: '#60a5fa', hint: 'Total value of all confirmed & completed bookings' },
    { key: 'platform_revenue', label: 'SnapReserve™ Revenue',   color: '#4ade80', hint: 'Sum of all service fees collected' },
    { key: 'host_payouts',     label: 'Host Payouts',          color: '#c084fc', hint: 'GMV minus SnapReserve™ service fees' },
    { key: 'total_refunds',    label: 'Refunds Issued',        color: '#f87171', hint: 'Total refund amounts on cancelled bookings' },
    { key: 'processing_fees',  label: 'Est. Processing Fees',  color: '#fcd34d', hint: 'Estimated Stripe fees (2.9% + $0.30/txn)' },
    { key: 'net_revenue',      label: 'Net Revenue',           color: '#34d399', hint: 'Platform revenue minus refunds and processing fees' },
  ]

  return (
    <>
      <style>{`
        .fin-topbar { background:var(--sr-surface); border-bottom:1px solid var(--sr-border-solid); padding:16px 32px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
        .fin-topbar h1 { font-size:1.05rem; font-weight:700; color:var(--sr-text); }
        .fin-body { padding:28px 32px; }
        .fin-filters { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:28px; }
        .fin-preset-btn { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:8px; padding:7px 14px; font-size:0.78rem; font-weight:600; color:var(--sr-muted); cursor:pointer; transition:all 0.15s; }
        .fin-preset-btn:hover { border-color:var(--sr-orange); color:var(--sr-text); }
        .fin-preset-btn.active { background:var(--sr-orange); border-color:var(--sr-orange); color:#fff; }
        .fin-date-input { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:8px; padding:7px 12px; font-size:0.78rem; color:var(--sr-text); outline:none; }
        .fin-export-btn { margin-left:auto; background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:8px; padding:7px 16px; font-size:0.78rem; font-weight:700; color:var(--sr-text); cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.15s; }
        .fin-export-btn:hover { border-color:var(--sr-orange); color:var(--sr-orange); }
        .fin-metrics { display:grid; grid-template-columns:repeat(6,1fr); gap:14px; margin-bottom:28px; }
        .fin-metric { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:12px; padding:18px 20px; position:relative; overflow:hidden; }
        .fin-metric-val { font-size:1.55rem; font-weight:800; line-height:1; margin-bottom:4px; }
        .fin-metric-label { font-size:0.68rem; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-muted); margin-bottom:6px; }
        .fin-metric-hint { font-size:0.67rem; color:var(--sr-sub); line-height:1.4; }
        .fin-metric-bar { position:absolute; bottom:0; left:0; right:0; height:3px; }
        .fin-sub-row { display:flex; gap:14px; margin-bottom:28px; flex-wrap:wrap; }
        .fin-stat { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:10px; padding:14px 18px; flex:1; min-width:140px; }
        .fin-stat-val { font-size:1.1rem; font-weight:800; color:var(--sr-text); }
        .fin-stat-label { font-size:0.68rem; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-sub); margin-top:3px; }
        .fin-table-wrap { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:12px; overflow:hidden; }
        .fin-table-hdr { padding:16px 24px; border-bottom:1px solid var(--sr-border-solid); display:flex; align-items:center; justify-content:space-between; }
        .fin-table-hdr h2 { font-size:0.88rem; font-weight:700; color:var(--sr-text); }
        .fin-table { width:100%; border-collapse:collapse; }
        .fin-table thead th { padding:10px 16px; text-align:left; font-size:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--sr-sub); border-bottom:1px solid var(--sr-border-solid); white-space:nowrap; }
        .fin-table tbody tr { border-bottom:1px solid var(--sr-border-solid); transition:background 0.1s; }
        .fin-table tbody tr:last-child { border-bottom:none; }
        .fin-table tbody tr:hover { background:var(--sr-border-mid); }
        .fin-table tbody td { padding:12px 16px; font-size:0.8rem; color:var(--sr-text); white-space:nowrap; }
        .fin-badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:0.67rem; font-weight:700; }
        .fin-pagination { display:flex; align-items:center; justify-content:space-between; padding:16px 24px; border-top:1px solid var(--sr-border-solid); }
        .fin-page-btn { background:var(--sr-border-solid); border:none; border-radius:7px; padding:6px 14px; font-size:0.78rem; font-weight:600; color:var(--sr-text); cursor:pointer; }
        .fin-page-btn:disabled { opacity:0.35; cursor:not-allowed; }
        .fin-empty { padding:60px; text-align:center; color:var(--sr-sub); font-size:0.86rem; }
        @media(max-width:1400px) { .fin-metrics { grid-template-columns:repeat(3,1fr); } }
        @media(max-width:900px)  { .fin-metrics { grid-template-columns:repeat(2,1fr); } .fin-body { padding:20px; } }
        @media(max-width:600px)  { .fin-metrics { grid-template-columns:1fr; } }
      `}</style>

      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background: toast.type === 'error' ? '#dc2626' : '#16a34a', color:'#fff', padding:'12px 20px', borderRadius:12, fontSize:'0.84rem', fontWeight:600, zIndex:9999, boxShadow:'0 4px 20px rgba(0,0,0,0.4)' }}>
          {toast.msg}
        </div>
      )}

      {/* Topbar */}
      <div className="fin-topbar">
        <h1>Finance &amp; Revenue</h1>
        <button onClick={handleExport} disabled={exporting || loading} className="fin-export-btn">
          {exporting ? '⏳ Exporting…' : '⬇ Export CSV'}
        </button>
      </div>

      <div className="fin-body">
        {/* Filters */}
        <div className="fin-filters">
          {PRESETS.map(p => (
            <button key={p.value} onClick={() => setPreset(p.value)} className={`fin-preset-btn${preset === p.value ? ' active' : ''}`}>
              {p.label}
            </button>
          ))}
          {preset === 'custom' && (
            <>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="fin-date-input" />
              <span style={{ color:'var(--sr-muted)', fontSize:'0.8rem' }}>→</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="fin-date-input" />
            </>
          )}
        </div>

        {/* Metric cards */}
        <div className="fin-metrics">
          {METRIC_CARDS.map(({ key, label, color, hint }) => (
            <div key={key} className="fin-metric">
              <div className="fin-metric-label">{label}</div>
              <div className="fin-metric-val" style={{ color }}>
                {loading ? <span style={{ opacity:0.4 }}>—</span> : fmt$(metrics[key])}
              </div>
              <div className="fin-metric-hint">{hint}</div>
              <div className="fin-metric-bar" style={{ background: color, opacity: 0.3 }} />
            </div>
          ))}
        </div>

        {/* Sub-stats row */}
        <div className="fin-sub-row">
          {[
            { label: 'Confirmed & Completed Bookings', val: loading ? '—' : metrics.booking_count?.toLocaleString() },
            { label: 'Pending Bookings',               val: loading ? '—' : metrics.pending_count?.toLocaleString() },
            { label: 'Avg. Booking Value',             val: loading ? '—' : fmt$(metrics.avg_booking_value) },
            { label: 'Total Transactions',             val: loading ? '—' : total.toLocaleString() },
          ].map(({ label, val }) => (
            <div key={label} className="fin-stat">
              <div className="fin-stat-val">{val}</div>
              <div className="fin-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Transactions table */}
        <div className="fin-table-wrap">
          <div className="fin-table-hdr">
            <h2>Transactions</h2>
            <span style={{ fontSize:'0.75rem', color:'var(--sr-sub)' }}>
              {loading ? 'Loading…' : `${total.toLocaleString()} booking${total !== 1 ? 's' : ''}`}
            </span>
          </div>

          <div style={{ overflowX:'auto' }}>
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Date</th>
                  <th>Property</th>
                  <th>Host</th>
                  <th>Guest</th>
                  <th>Nights</th>
                  <th>Booking Total</th>
                  <th>Service Fee</th>
                  <th>Host Payout</th>
                  <th>Refunded</th>
                  <th>Status</th>
                  <th>Stripe PI</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={12} className="fin-empty">Loading transactions…</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={12} className="fin-empty">No transactions for this period.</td></tr>
                ) : transactions.map(t => {
                  const ss = statusStyle(t.status, t.payment_status)
                  const hasRefund = Number(t.refund_amount) > 0
                  return (
                    <tr key={t.id}>
                      <td>
                        <span style={{ fontFamily:'monospace', fontSize:'0.75rem', color:'var(--sr-orange)', fontWeight:700 }}>{t.reference}</span>
                      </td>
                      <td style={{ color:'var(--sr-muted)' }}>{fmtDate(t.created_at)}</td>
                      <td style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis' }}>
                        <div style={{ fontWeight:600 }}>{t.listing_title}</div>
                        {t.listing_city && <div style={{ fontSize:'0.7rem', color:'var(--sr-sub)' }}>{t.listing_city}</div>}
                      </td>
                      <td style={{ color:'var(--sr-muted)' }}>{t.host_name}</td>
                      <td style={{ color:'var(--sr-muted)' }}>{t.guest_name}</td>
                      <td style={{ textAlign:'center', color:'var(--sr-muted)' }}>{t.nights ?? '—'}</td>
                      <td style={{ fontWeight:700 }}>{fmtFull$(t.total_amount)}</td>
                      <td style={{ color:'#4ade80', fontWeight:600 }}>{fmtFull$(t.service_fee)}</td>
                      <td style={{ color:'#c084fc', fontWeight:600 }}>{fmtFull$(t.host_payout)}</td>
                      <td style={{ color: hasRefund ? '#f87171' : 'var(--sr-muted)' }}>
                        {hasRefund ? fmtFull$(t.refund_amount) : '—'}
                      </td>
                      <td>
                        <span className="fin-badge" style={{ background: ss.bg, color: ss.color }}>{ss.label}</span>
                      </td>
                      <td style={{ color:'var(--sr-sub)', fontSize:'0.7rem', fontFamily:'monospace' }}>
                        {t.payment_intent_id ? t.payment_intent_id.slice(0,20) + '…' : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="fin-pagination">
              <button className="fin-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                ← Prev
              </button>
              <span style={{ fontSize:'0.78rem', color:'var(--sr-sub)' }}>
                Page {page} of {totalPages}
              </span>
              <button className="fin-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
