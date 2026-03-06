'use client'
import { useState, useMemo } from 'react'

const SUSPENSION_REASONS = [
  { value: 'fraud',            label: 'Fraud or suspicious activity' },
  { value: 'policy_violation', label: 'Policy violation' },
  { value: 'spam',             label: 'Spam or fake listings' },
  { value: 'safety',           label: 'Safety issue' },
  { value: 'payment_abuse',    label: 'Payment abuse' },
  { value: 'other',            label: 'Other' },
]

const AVATAR_COLORS = [
  '#1e3a8a','#065f46','#78350f','#4c1d95','#831843',
  '#14532d','#7c2d12','#064e3b','#1e40af','#3f1f0a','#1a1f6e',
]

function avatarColor(id = '') {
  const sum = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}
function getInitials(name = '') {
  return name.split(' ').map(n => n[0] ?? '').slice(0, 2).join('').toUpperCase() || '?'
}
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtMoney(n) {
  if (!n && n !== 0) return '—'
  return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
}
function computeRisk(host) {
  if (host.suspended_at) return 82
  if (host.verification_status === 'rejected') return 65
  if (host.verification_status === 'pending') return 32
  const active = (host.listings ?? []).filter(l => l.is_active)
  const rated = (host.listings ?? []).filter(l => l.rating > 0)
  if (rated.length > 0) {
    const avg = rated.reduce((s, l) => s + l.rating, 0) / rated.length
    if (avg < 4.0) return 45
  }
  if (active.length === 0) return 25
  return Math.max(5, 18 - active.length * 2)
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box}
:root{
  --bg:#0f0e0c;--bg2:#151412;--bg3:#1a1916;--bg4:#212019;
  --border:#2a2825;--border2:#333230;
  --text:#e8e3dc;--muted:#7a7670;--sub:#4a4845;
  --orange:#e8622a;--orangelt:rgba(232,98,42,.12);--orangeborder:rgba(232,98,42,.25);
  --blue:#3b82f6;--bluelt:rgba(59,130,246,.12);--blueborder:rgba(59,130,246,.25);
  --green:#22c55e;--greenlt:rgba(34,197,94,.12);--greenborder:rgba(34,197,94,.25);
  --yellow:#f59e0b;--yellowlt:rgba(245,158,11,.12);--yellowborder:rgba(245,158,11,.25);
  --red:#ef4444;--redlt:rgba(239,68,68,.12);--redborder:rgba(239,68,68,.25);
  --purple:#a855f7;--purplelt:rgba(168,85,247,.12);--purpleborder:rgba(168,85,247,.25);
  --gold:#f59e0b;--goldlt:rgba(245,158,11,.12);--goldborder:rgba(245,158,11,.25);
}
.h-shell{display:flex;flex-direction:column;height:100vh;overflow:hidden;background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px}
/* Topbar */
.h-topbar{padding:0 24px;height:48px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.h-tb-path{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--sub)}
.h-current{color:var(--text);font-weight:600}
.h-tb-right{display:flex;align-items:center;gap:8px}
.h-tb-btn{width:30px;height:30px;border-radius:7px;border:1px solid var(--border);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--muted);transition:all .14s}
.h-tb-btn:hover{border-color:var(--border2);color:var(--text)}
/* Content */
.h-content{display:flex;flex:1;overflow:hidden}
.h-main{flex:1;overflow-y:auto;padding:20px 24px}
/* Page header */
.h-page-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.h-page-hd h1{font-size:18px;font-weight:700;color:var(--text);margin-bottom:2px}
.h-page-hd p{font-size:11px;color:var(--muted)}
.h-hd-btns{display:flex;gap:8px}
.h-hd-btn{padding:7px 14px;border-radius:7px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;cursor:pointer;transition:all .16s;display:flex;align-items:center;gap:6px}
.h-hd-btn.ghost{background:transparent;border:1px solid var(--border);color:var(--muted)}
.h-hd-btn.ghost:hover{border-color:var(--border2);color:var(--text)}
/* Stats */
.h-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:18px}
.h-stat{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;transition:border .15s}
.h-stat:hover{border-color:var(--border2)}
.h-stat-label{font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--sub);margin-bottom:8px}
.h-stat-val{font-size:24px;font-weight:700;color:var(--text);font-family:'DM Mono',monospace;line-height:1;margin-bottom:3px}
.h-stat-sub{font-size:10px;color:var(--muted)}
/* Filters */
.h-filters{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.h-search-wrap{position:relative;flex:0 0 260px}
.h-search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--sub)}
.h-search{width:100%;padding:8px 12px 8px 30px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:12px;color:var(--text);outline:none;transition:border .16s}
.h-search:focus{border-color:var(--border2)}
.h-search::placeholder{color:var(--sub)}
.h-pills{display:flex;gap:6px;flex-wrap:wrap}
.h-pill{padding:6px 12px;border-radius:100px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:5px;transition:all .14s}
.h-pill:hover{border-color:var(--border2);color:var(--text)}
.h-pill.active{background:var(--orangelt);border-color:var(--orangeborder);color:var(--orange)}
.h-pill .cnt{background:var(--bg3);padding:1px 6px;border-radius:100px;font-size:9px;font-weight:700}
.h-pill.active .cnt{background:var(--orangeborder);color:var(--orange)}
.h-filters-right{margin-left:auto}
.h-sort-btn{padding:7px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:7px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;cursor:pointer;color:var(--muted);transition:all .14s}
.h-sort-btn:hover{border-color:var(--border2);color:var(--text)}
/* Table */
.h-table{background:var(--bg2);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.h-thead{display:grid;grid-template-columns:2fr 1.2fr 1fr 1fr 1fr 1.4fr;border-bottom:1px solid var(--border);padding:0 16px}
.h-th{padding:10px 12px;font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--sub)}
.h-tbody{display:flex;flex-direction:column}
.h-tr{display:grid;grid-template-columns:2fr 1.2fr 1fr 1fr 1fr 1.4fr;border-bottom:1px solid var(--border);padding:0 16px;cursor:pointer;transition:background .12s}
.h-tr:last-child{border:none}
.h-tr:hover{background:var(--bg3)}
.h-tr.selected{background:var(--orangelt);border-left:2px solid var(--orange)}
.h-td{padding:12px;display:flex;align-items:center;font-size:12px}
/* Host cell */
.h-host-info{display:flex;align-items:center;gap:10px}
.h-avatar{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0}
.h-host-name{font-size:12px;font-weight:700;color:var(--text);line-height:1.2}
.h-host-email{font-size:10px;color:var(--muted);margin-top:1px}
.h-host-type{font-size:9px;font-weight:600;display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:100px;margin-top:3px}
.ht-hotel{background:var(--bluelt);color:var(--blue)}
.ht-private{background:var(--orangelt);color:var(--orange)}
/* Badges */
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:100px;font-size:10px;font-weight:700}
.b-verified{background:var(--greenlt);color:var(--green);border:1px solid var(--greenborder)}
.b-pending{background:var(--yellowlt);color:var(--yellow);border:1px solid var(--yellowborder)}
.b-rejected{background:var(--redlt);color:var(--red);border:1px solid var(--redborder)}
.b-unverified{background:var(--bg3);color:var(--sub);border:1px solid var(--border)}
.b-active{background:var(--greenlt);color:var(--green);border:1px solid var(--greenborder)}
.b-suspended{background:var(--redlt);color:var(--red);border:1px solid var(--redborder)}
.b-review{background:var(--yellowlt);color:var(--yellow);border:1px solid var(--yellowborder)}
.b-inactive{background:var(--bg3);color:var(--sub);border:1px solid var(--border)}
.b-snap{background:var(--orangelt);color:var(--orange);border:1px solid var(--orangeborder)}
.b-founder{background:var(--goldlt);color:var(--gold);border:1px solid var(--goldborder)}
.b-new{background:var(--bluelt);color:var(--blue);border:1px solid var(--blueborder)}
/* Action buttons */
.h-actions{display:flex;gap:5px;flex-wrap:wrap}
.a-btn{padding:5px 10px;border-radius:6px;font-family:'DM Sans',sans-serif;font-size:10px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--muted);transition:all .14s}
.a-btn:hover{border-color:var(--border2);color:var(--text)}
.a-btn.view{background:var(--bluelt);border-color:var(--blueborder);color:var(--blue)}
.a-btn.susp{background:var(--redlt);border-color:var(--redborder);color:var(--red)}
.a-btn.ok{background:var(--greenlt);border-color:var(--greenborder);color:var(--green)}
.a-btn.badge-g{background:var(--purplelt);border-color:var(--purpleborder);color:var(--purple)}
/* Pagination */
.h-pg{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-top:1px solid var(--border)}
.h-pg-info{font-size:11px;color:var(--muted)}
.h-pg-btns{display:flex;gap:4px}
.h-pg-btn{width:28px;height:28px;border-radius:6px;border:1px solid var(--border);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--muted);font-family:'DM Sans',sans-serif;transition:all .12s}
.h-pg-btn:hover{border-color:var(--border2);color:var(--text)}
.h-pg-btn.active{background:var(--orange);border-color:var(--orange);color:#fff}
.h-pg-btn:disabled{opacity:.3;cursor:default}
.h-empty{padding:48px;text-align:center;color:var(--sub);font-size:12px}
/* Detail panel */
.h-panel{width:380px;min-width:380px;height:100%;overflow-y:auto;background:var(--bg2);border-left:1px solid var(--border);flex-shrink:0;animation:slideIn .22s ease}
@keyframes slideIn{from{transform:translateX(16px);opacity:0}to{transform:translateX(0);opacity:1}}
.dp-hdr{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--bg2);z-index:2}
.dp-hdr-title{font-size:12px;font-weight:700;color:var(--text)}
.dp-close{width:26px;height:26px;border-radius:6px;border:1px solid var(--border);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px;transition:all .14s}
.dp-close:hover{border-color:var(--border2);color:var(--text)}
.dp-body{padding:16px}
/* Panel hero */
.dp-hero{display:flex;flex-direction:column;align-items:center;text-align:center;padding-bottom:16px;border-bottom:1px solid var(--border);margin-bottom:16px}
.dp-avatar{width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;margin-bottom:10px}
.dp-name{font-size:15px;font-weight:700;color:var(--text);margin-bottom:2px}
.dp-email{font-size:10px;color:var(--muted);margin-bottom:10px}
.dp-badges{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;margin-bottom:12px}
.dp-acts{display:flex;gap:7px;width:100%}
.dp-act-btn{flex:1;padding:8px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:10px;font-weight:600;cursor:pointer;border:1px solid var(--border);text-align:center;transition:all .16s;background:transparent;color:var(--muted)}
.dp-act-btn.green{background:var(--greenlt);border-color:var(--greenborder);color:var(--green)}
.dp-act-btn.green:hover{background:rgba(34,197,94,.22)}
.dp-act-btn.red{background:var(--redlt);border-color:var(--redborder);color:var(--red)}
.dp-act-btn.red:hover{background:rgba(239,68,68,.22)}
.dp-act-btn.blue{background:var(--bluelt);border-color:var(--blueborder);color:var(--blue)}
.dp-act-btn.blue:hover{background:rgba(59,130,246,.22)}
.dp-act-btn.purple{background:var(--purplelt);border-color:var(--purpleborder);color:var(--purple)}
/* Panel section */
.dp-sec{margin-bottom:18px}
.dp-sec-title{font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--sub);margin-bottom:10px;display:flex;align-items:center;gap:8px}
.dp-sec-title::after{content:'';flex:1;height:1px;background:var(--border)}
.dp-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)}
.dp-row:last-child{border:none}
.dp-row-lbl{font-size:11px;color:var(--muted)}
.dp-row-val{font-size:11px;font-weight:600;color:var(--text);font-family:'DM Mono',monospace;text-align:right}
/* Listing card */
.dp-listing{background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:6px;transition:border .14s}
.dp-listing:last-child{margin:0}
.dp-listing:hover{border-color:var(--border2)}
.dpl-name{font-size:11px;font-weight:700;color:var(--text);margin-bottom:2px}
.dpl-loc{font-size:10px;color:var(--muted)}
.dpl-stats{display:flex;gap:10px;margin-top:5px}
.dpl-stat{font-size:9px;color:var(--muted)}
.dpl-stat span{color:var(--text);font-weight:600;font-family:'DM Mono',monospace}
/* Earnings bar */
.dp-ebar{display:flex;align-items:flex-end;gap:4px;height:44px;margin-top:6px}
.dp-eb-b{flex:1;border-radius:3px 3px 0 0;background:var(--orangelt);border:1px solid var(--orangeborder);min-height:4px}
.dp-eb-lbls{display:flex;gap:4px;margin-top:3px}
.dp-eb-lbl{flex:1;text-align:center;font-size:8px;color:var(--sub)}
/* Risk bar */
.dp-risk-bar{height:6px;background:var(--bg3);border-radius:100px;overflow:hidden;margin-top:6px}
.dp-risk-fill{height:100%;border-radius:100px}
.dp-risk-low{background:var(--green)}
.dp-risk-med{background:var(--yellow)}
.dp-risk-high{background:var(--red)}
/* Booking row */
.dp-br{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)}
.dp-br:last-child{border:none}
.dp-br-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.dp-br-info{flex:1}
.dp-br-name{font-size:11px;font-weight:600;color:var(--text)}
.dp-br-date{font-size:9px;color:var(--muted)}
.dp-br-amt{font-size:11px;font-weight:700;color:var(--text);font-family:'DM Mono',monospace}
/* Activity */
.dp-act-item{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)}
.dp-act-item:last-child{border:none}
.dp-act-dot{width:6px;height:6px;border-radius:50%;margin-top:4px;flex-shrink:0}
.dp-act-txt{font-size:10px;color:var(--muted);line-height:1.5;flex:1}
.dp-act-txt strong{color:var(--text)}
.dp-act-time{font-size:9px;color:var(--sub);font-family:'DM Mono',monospace}
/* Panel loading */
.dp-loading{display:flex;align-items:center;justify-content:center;padding:40px;color:var(--sub);font-size:11px}
/* Modal */
.h-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:flex;align-items:center;justify-content:center}
.h-modal{background:#1a1916;border:1px solid var(--border);border-radius:14px;padding:24px;width:100%;max-width:480px}
.h-modal h2{font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px}
.h-modal-sub{font-size:12px;color:var(--muted);margin-bottom:14px}
.h-modal-field{margin-bottom:12px}
.h-modal-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--sub);margin-bottom:6px;display:block}
.h-modal-input{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-size:12px;outline:none;font-family:'DM Sans',sans-serif;transition:border .14s}
.h-modal-input:focus{border-color:var(--border2)}
textarea.h-modal-input{min-height:80px;resize:vertical}
select.h-modal-input{cursor:pointer}
.h-modal-footer{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}
.h-modal-cancel{padding:8px 16px;background:var(--bg3);border:1px solid var(--border);border-radius:7px;color:var(--muted);font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;cursor:pointer}
.h-modal-cancel:hover{color:var(--text)}
.h-modal-confirm{padding:8px 16px;background:var(--orange);border:none;border-radius:7px;color:#fff;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;cursor:pointer;transition:opacity .14s}
.h-modal-confirm:hover{opacity:.88}
.h-modal-confirm:disabled{opacity:.4;cursor:not-allowed}
.h-alert{padding:10px 12px;border-radius:8px;font-size:11px;margin-bottom:12px;line-height:1.55}
.h-alert.red{background:var(--redlt);border:1px solid var(--redborder);color:var(--red)}
.h-alert.green{background:var(--greenlt);border:1px solid var(--greenborder);color:var(--green)}
.h-alert.purple{background:var(--purplelt);border:1px solid var(--purpleborder);color:var(--purple)}
/* Toast */
.h-toast{position:fixed;bottom:24px;right:24px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:12px;font-weight:500;z-index:300;color:var(--text)}
.h-toast.success{border-color:rgba(34,197,94,.4);color:var(--green)}
.h-toast.error{border-color:rgba(239,68,68,.4);color:var(--red)}
/* Chat drawer */
.chat-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:200;display:flex;justify-content:flex-end}
.chat-drawer{width:420px;height:100%;background:var(--bg2);border-left:1px solid var(--border);display:flex;flex-direction:column;animation:slideIn .2s ease}
.chat-hdr{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:var(--bg3)}
.chat-hdr-info{flex:1;min-width:0}
.chat-hdr-name{font-size:13px;font-weight:700;color:var(--text)}
.chat-hdr-email{font-size:10px;color:var(--muted);margin-top:1px}
.chat-close{width:28px;height:28px;border-radius:6px;border:1px solid var(--border);background:transparent;cursor:pointer;color:var(--muted);font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .13s}
.chat-close:hover{border-color:var(--border2);color:var(--text)}
.chat-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
.chat-empty{text-align:center;color:var(--sub);font-size:11px;padding:40px 0}
.chat-loading{text-align:center;color:var(--sub);font-size:11px;padding:40px 0}
.chat-bubble{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px 14px}
.chat-bubble-meta{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.chat-sender{font-size:10px;font-weight:700;color:var(--blue)}
.chat-time{font-size:9px;color:var(--sub)}
.chat-subject{font-size:12px;font-weight:600;color:var(--text);margin-bottom:4px}
.chat-body{font-size:11px;color:var(--muted);line-height:1.55;white-space:pre-wrap}
.chat-type-tag{display:inline-flex;align-items:center;padding:2px 7px;border-radius:100px;font-size:9px;font-weight:700;margin-top:8px}
.chat-type-info{background:var(--bluelt);color:var(--blue);border:1px solid var(--blueborder)}
.chat-type-warning{background:var(--yellowlt);color:var(--yellow);border:1px solid var(--yellowborder)}
.chat-type-suspension{background:var(--redlt);color:var(--red);border:1px solid var(--redborder)}
.chat-type-reactivation{background:var(--greenlt);color:var(--green);border:1px solid var(--greenborder)}
.chat-compose{border-top:1px solid var(--border);padding:12px;flex-shrink:0;background:var(--bg3);display:flex;flex-direction:column;gap:8px}
.chat-compose-row{display:flex;gap:7px}
.chat-select{background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:7px 10px;color:var(--text);font-size:11px;outline:none;font-family:'DM Sans',sans-serif;cursor:pointer;flex-shrink:0}
.chat-select:focus{border-color:var(--border2)}
.chat-input{flex:1;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:7px 10px;color:var(--text);font-size:11px;outline:none;font-family:'DM Sans',sans-serif}
.chat-input:focus{border-color:var(--border2)}
.chat-textarea{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:8px 10px;color:var(--text);font-size:11px;outline:none;font-family:'DM Sans',sans-serif;resize:none;height:72px}
.chat-textarea:focus{border-color:var(--border2)}
.chat-send-row{display:flex;justify-content:flex-end}
.chat-send-btn{padding:7px 18px;background:var(--blue);border:none;border-radius:7px;color:#fff;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;cursor:pointer;transition:opacity .13s}
.chat-send-btn:disabled{opacity:.4;cursor:not-allowed}
.chat-send-btn:hover:not(:disabled){opacity:.88}
/* Scrollbar */
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:100px}
`

function VerBadge({ status }) {
  const map = {
    verified:   ['b-verified',   '✓ Verified'],
    pending:    ['b-pending',    '⏳ Pending'],
    rejected:   ['b-rejected',   '✗ Rejected'],
    unverified: ['b-unverified', '— Unverified'],
  }
  const [cls, label] = map[status] ?? ['b-unverified', '— Unverified']
  return <span className={`badge ${cls}`}>{label}</span>
}

function StatusBadge({ host }) {
  if (host.suspended_at) return <span className="badge b-suspended">⊘ Suspended</span>
  if (host.verification_status === 'pending') return <span className="badge b-review">◌ In Review</span>
  if (!host.users?.is_active) return <span className="badge b-inactive">○ Inactive</span>
  return <span className="badge b-active">● Active</span>
}

function SnapBadge({ host }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {host.is_snap_verified && <span className="badge b-snap">🛡 Verified</span>}
      {host.is_founder_host  && <span className="badge b-founder">🏅 Founder</span>}
      {!host.is_snap_verified && !host.is_founder_host && (() => {
        const active = (host.listings ?? []).filter(l => l.is_active).length
        if (active === 0) return <span style={{ fontSize: '10px', color: 'var(--sub)' }}>—</span>
        return <span className="badge b-new">🆕 New</span>
      })()}
    </div>
  )
}

function HostTypeBadge({ listings = [] }) {
  const isHotel = listings.some(l => l.type === 'hotel')
  return (
    <span className={`h-host-type ${isHotel ? 'ht-hotel' : 'ht-private'}`}>
      {isHotel ? '🏨 Hotel' : '🏠 Private'}
    </span>
  )
}

// ─── Detail Panel ───────────────────────────────────────────────────
function DetailPanel({ host, listings, stats, recentBookings, canManage, canReinstate, canGrantBadge, onAction, onChat }) {
  const name      = host.users?.full_name ?? '—'
  const email     = host.users?.email ?? '—'
  const isSusp    = !!host.suspended_at
  const isVerified = host.verification_status === 'verified'
  const active    = listings.filter(l => l.is_active)
  const risk      = computeRisk(host)
  const riskCls   = risk < 30 ? 'dp-risk-low' : risk < 60 ? 'dp-risk-med' : 'dp-risk-high'
  const riskLabel = risk < 30 ? 'Low' : risk < 60 ? 'Medium' : 'High'
  const months    = ['Sep','Oct','Nov','Dec','Jan','Feb','Mar']
  const rev       = stats?.revenue ?? 0
  const bars      = rev > 0
    ? [.3,.45,.55,.65,.75,.88,1].map(m => Math.round(rev * m / 7))
    : Array(7).fill(0)
  const maxBar = Math.max(...bars, 1)
  const rated     = listings.filter(l => l.rating > 0)
  const avgRating = rated.length > 0
    ? (rated.reduce((s, l) => s + l.rating, 0) / rated.length).toFixed(2)
    : null
  const location  = listings[0]
    ? [listings[0].city, listings[0].state].filter(Boolean).join(', ')
    : '—'

  return (
    <>
      {/* Hero */}
      <div className="dp-hero">
        <div className="dp-avatar" style={{ background: avatarColor(host.id) }}>
          {getInitials(name)}
        </div>
        <div className="dp-name">{name}</div>
        <div className="dp-email">{email}</div>
        <div className="dp-badges">
          <VerBadge status={host.verification_status} />
          {isSusp
            ? <span className="badge b-suspended">⊘ Suspended</span>
            : <span className="badge b-active">● Active</span>}
          {host.is_snap_verified && <span className="badge b-snap">🛡 Verified</span>}
          {host.is_founder_host && <span className="badge b-founder">🏅 Founder Host</span>}
        </div>
        <div className="dp-acts">
          {isSusp && canReinstate && (
            <button className="dp-act-btn green" onClick={() => onAction('reactivate', host)}>✓ Restore</button>
          )}
          {!isSusp && canManage && (
            <button className="dp-act-btn red" onClick={() => onAction('suspend', host)}>⊘ Suspend</button>
          )}
          <button className="dp-act-btn blue" onClick={() => onChat(host)}>💬 Chat</button>
          {!isVerified && canManage && (
            <button className="dp-act-btn green" onClick={() => onAction('verify', host)}>✓ Verify</button>
          )}
          {canGrantBadge && !host.is_snap_verified && !isSusp && (
            <button className="dp-act-btn purple" onClick={() => onAction('grant_snap_verified', host)}>🛡 Badge</button>
          )}
          {canGrantBadge && host.is_snap_verified && (
            <button className="dp-act-btn" onClick={() => onAction('revoke_snap_verified', host)}>Revoke</button>
          )}
          {canGrantBadge && !host.is_founder_host && (
            <button className="dp-act-btn" style={{ background: 'var(--goldlt)', borderColor: 'var(--goldborder)', color: 'var(--gold)' }} onClick={() => onAction('grant_founder_badge', host)}>🏅 Founder</button>
          )}
          {canGrantBadge && host.is_founder_host && (
            <button className="dp-act-btn" onClick={() => onAction('revoke_founder_badge', host)}>Revoke Founder</button>
          )}
        </div>
      </div>

      {/* Host Info */}
      <div className="dp-sec">
        <div className="dp-sec-title">Host Info</div>
        <div className="dp-row">
          <span className="dp-row-lbl">Host ID</span>
          <span className="dp-row-val">{host.id?.slice(0, 8)}…</span>
        </div>
        <div className="dp-row">
          <span className="dp-row-lbl">Type</span>
          <span className="dp-row-val">{listings.some(l => l.type === 'hotel') ? 'Hotel' : 'Private Stay'}</span>
        </div>
        <div className="dp-row">
          <span className="dp-row-lbl">Location</span>
          <span className="dp-row-val">{location}</span>
        </div>
        <div className="dp-row">
          <span className="dp-row-lbl">Joined</span>
          <span className="dp-row-val">{fmtDate(host.created_at)}</span>
        </div>
        <div className="dp-row">
          <span className="dp-row-lbl">Active Listings</span>
          <span className="dp-row-val">{active.length}</span>
        </div>
        <div className="dp-row">
          <span className="dp-row-lbl">Verification</span>
          <span className="dp-row-val">{host.verification_status ?? '—'}</span>
        </div>
        {isSusp && (
          <div className="dp-row">
            <span className="dp-row-lbl">Suspended</span>
            <span className="dp-row-val" style={{ color: 'var(--red)' }}>{fmtDate(host.suspended_at)}</span>
          </div>
        )}
      </div>

      {/* Performance */}
      <div className="dp-sec">
        <div className="dp-sec-title">Performance</div>
        <div className="dp-row">
          <span className="dp-row-lbl">Total Revenue</span>
          <span className="dp-row-val" style={{ color: 'var(--green)' }}>{stats ? fmtMoney(stats.revenue) : '—'}</span>
        </div>
        <div className="dp-row">
          <span className="dp-row-lbl">Confirmed Bookings</span>
          <span className="dp-row-val">{stats ? stats.count : '—'}</span>
        </div>
        <div className="dp-row">
          <span className="dp-row-lbl">Avg Rating</span>
          <span className="dp-row-val">{avgRating ? `★ ${avgRating}` : '—'}</span>
        </div>
        {rev > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 9, color: 'var(--sub)', marginBottom: 4 }}>Revenue trend</div>
            <div className="dp-ebar">
              {bars.map((v, i) => (
                <div key={i} className="dp-eb-b" style={{ height: Math.max(4, Math.round(v / maxBar * 40)) + 'px' }} />
              ))}
            </div>
            <div className="dp-eb-lbls">
              {months.map(m => <div key={m} className="dp-eb-lbl">{m}</div>)}
            </div>
          </div>
        )}
      </div>

      {/* Risk Score */}
      <div className="dp-sec">
        <div className="dp-sec-title">Risk Score</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Platform Risk</span>
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: risk < 30 ? 'var(--green)' : risk < 60 ? 'var(--yellow)' : 'var(--red)' }}>
            {risk}/100 · {riskLabel}
          </span>
        </div>
        <div className="dp-risk-bar">
          <div className={`dp-risk-fill ${riskCls}`} style={{ width: `${risk}%` }} />
        </div>
      </div>

      {/* Listings */}
      {listings.length > 0 && (
        <div className="dp-sec">
          <div className="dp-sec-title" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Listings ({listings.length})<span style={{ flex:1, height:1, background:'var(--border)', display:'inline-block', width:40 }} /></span>
            <a href={`/admin/hosts/${host.id}/listings`} target="_blank" style={{ fontSize: 10, color: 'var(--orange)', textDecoration: 'none', fontWeight: 700, flexShrink: 0 }}>View All →</a>
          </div>
          {listings.slice(0, 3).map(l => (
            <div key={l.id} className="dp-listing">
              <div className="dpl-name">{l.title ?? 'Untitled listing'}</div>
              <div className="dpl-loc">{[l.city, l.state].filter(Boolean).join(', ') || '—'}</div>
              <div className="dpl-stats">
                <span className="dpl-stat">Price: <span>{l.price_per_night ? `$${l.price_per_night}/night` : '—'}</span></span>
                <span className="dpl-stat">Rating: <span>{l.rating ? `★ ${l.rating}` : '—'}</span></span>
                <span className="dpl-stat">Status: <span>{l.status ?? '—'}</span></span>
              </div>
            </div>
          ))}
          {listings.length > 3 && (
            <div style={{ fontSize: 10, color: 'var(--sub)', paddingTop: 6 }}>+{listings.length - 3} more listing{listings.length - 3 !== 1 ? 's' : ''}</div>
          )}
        </div>
      )}

      {/* Recent Bookings */}
      <div className="dp-sec">
        <div className="dp-sec-title" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Recent Bookings<span style={{ flex:1, height:1, background:'var(--border)', display:'inline-block', width:20 }} /></span>
          <a href={`/admin/hosts/${host.id}/bookings`} target="_blank" style={{ fontSize: 10, color: 'var(--orange)', textDecoration: 'none', fontWeight: 700, flexShrink: 0 }}>View All →</a>
        </div>
        {recentBookings?.length > 0 ? (
          recentBookings.map((b, i) => (
            <div key={b.id ?? i} className="dp-br">
              <div className="dp-br-dot" style={{ background: b.status === 'confirmed' ? 'var(--green)' : 'var(--yellow)' }} />
              <div className="dp-br-info">
                <div className="dp-br-name">Guest Stay</div>
                <div className="dp-br-date">{fmtDate(b.check_in)}{b.check_out ? ` – ${fmtDate(b.check_out)}` : ''}</div>
              </div>
              <div className="dp-br-amt">{fmtMoney(b.total_amount)}</div>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 11, color: 'var(--sub)', padding: '6px 0' }}>No bookings yet</div>
        )}
      </div>

      {/* Activity */}
      <div className="dp-sec">
        <div className="dp-sec-title">Admin Activity</div>
        <div className="dp-act-item">
          <div className="dp-act-dot" style={{ background: 'var(--blue)' }} />
          <div className="dp-act-txt"><strong>Host registered</strong> — account created</div>
          <div className="dp-act-time">{fmtDate(host.created_at)}</div>
        </div>
        {isVerified && (
          <div className="dp-act-item">
            <div className="dp-act-dot" style={{ background: 'var(--green)' }} />
            <div className="dp-act-txt"><strong>Account verified</strong> by admin</div>
            <div className="dp-act-time">—</div>
          </div>
        )}
        {host.is_snap_verified && (
          <div className="dp-act-item">
            <div className="dp-act-dot" style={{ background: 'var(--orange)' }} />
            <div className="dp-act-txt"><strong>🛡 Verified badge granted</strong></div>
            <div className="dp-act-time">{fmtDate(host.snap_verified_at)}</div>
          </div>
        )}
        {isSusp && (
          <div className="dp-act-item">
            <div className="dp-act-dot" style={{ background: 'var(--red)' }} />
            <div className="dp-act-txt"><strong>Account suspended</strong> — {host.suspension_reason ?? 'policy'}</div>
            <div className="dp-act-time">{fmtDate(host.suspended_at)}</div>
          </div>
        )}
      </div>

      {/* Bottom links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <a href={`/admin/listings?host_id=${host.id}`} style={{ padding: 9, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)', fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600, textAlign: 'center', textDecoration: 'none', display: 'block' }}>
          📋 See Listings
        </a>
        <a href={`/admin/bookings?host_id=${host.id}`} style={{ padding: 9, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)', fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600, textAlign: 'center', textDecoration: 'none', display: 'block' }}>
          📅 See Bookings
        </a>
      </div>
    </>
  )
}

// ─── Main Component ──────────────────────────────────────────────────
export default function HostsClient({ initialHosts, role }) {
  const [hosts, setHosts]           = useState(initialHosts)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail]         = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [modal, setModal]           = useState(null)
  const [suspCategory, setSuspCategory] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [msgSubject, setMsgSubject] = useState('')
  const [msgBody, setMsgBody]       = useState('')
  const [msgType, setMsgType]       = useState('info')
  const [loading, setLoading]       = useState(false)
  const [toast, setToast]           = useState(null)
  // chat
  const [chatHost,    setChatHost]    = useState(null)
  const [chatMsgs,    setChatMsgs]    = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatSending, setChatSending] = useState(false)
  const [chatSubject, setChatSubject] = useState('')
  const [chatBody,    setChatBody]    = useState('')
  const [chatType,    setChatType]    = useState('info')

  const canManage    = ['admin', 'super_admin', 'trust_safety'].includes(role)
  const canReinstate = ['super_admin', 'trust_safety'].includes(role)
  const canGrantBadge = role === 'super_admin'

  const stats = useMemo(() => ({
    total:     hosts.length,
    verified:  hosts.filter(h => h.verification_status === 'verified').length,
    pending:   hosts.filter(h => h.verification_status === 'pending').length,
    suspended: hosts.filter(h => !!h.suspended_at).length,
    snap:      hosts.filter(h => h.is_snap_verified).length,
  }), [hosts])

  const filtered = useMemo(() => {
    let data = hosts
    if (filter === 'verified')  data = data.filter(h => h.verification_status === 'verified')
    else if (filter === 'pending')   data = data.filter(h => h.verification_status === 'pending')
    else if (filter === 'suspended') data = data.filter(h => !!h.suspended_at)
    else if (filter === 'hotel')     data = data.filter(h => (h.listings ?? []).some(l => l.type === 'hotel'))
    else if (filter === 'private')   data = data.filter(h => !(h.listings ?? []).some(l => l.type === 'hotel'))
    else if (filter === 'snap')      data = data.filter(h => h.is_snap_verified)
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(h =>
        h.users?.email?.toLowerCase().includes(q) ||
        h.users?.full_name?.toLowerCase().includes(q) ||
        h.id?.toLowerCase().includes(q)
      )
    }
    return data
  }, [hosts, filter, search])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function openPanel(host) {
    if (selectedId === host.id) { setSelectedId(null); setDetail(null); return }
    setSelectedId(host.id)
    setDetail(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/hosts/${host.id}`)
      if (res.ok) setDetail(await res.json())
    } catch {}
    setDetailLoading(false)
  }

  function openModal(action, host) {
    setSuspCategory(''); setAdminNotes('')
    setMsgSubject(''); setMsgBody(''); setMsgType('info')
    setModal({ action, host })
  }

  async function openChat(host) {
    setChatHost(host)
    setChatMsgs([])
    setChatSubject('')
    setChatBody('')
    setChatType('info')
    setChatLoading(true)
    try {
      const res = await fetch(`/api/admin/hosts/${host.id}/messages`)
      if (res.ok) setChatMsgs(await res.json())
    } catch {}
    setChatLoading(false)
  }

  async function sendChatMessage() {
    if (!chatSubject.trim() || !chatBody.trim()) return
    setChatSending(true)
    try {
      const res = await fetch(`/api/admin/hosts/${chatHost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', subject: chatSubject.trim(), message_body: chatBody.trim(), message_type: chatType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send')
      setChatMsgs(prev => [...prev, {
        id: Date.now(),
        type: chatType,
        subject: chatSubject.trim(),
        body: chatBody.trim(),
        created_at: new Date().toISOString(),
      }])
      setChatSubject('')
      setChatBody('')
      showToast('Message sent.')
    } catch (e) {
      showToast(e.message, 'error')
    }
    setChatSending(false)
  }

  async function confirmAction() {
    if (!modal) return
    if (modal.action === 'suspend' && (!suspCategory || !adminNotes.trim())) return
    if (modal.action === 'message' && (!msgSubject.trim() || !msgBody.trim())) return
    setLoading(true)
    try {
      let payload
      if (modal.action === 'message') {
        payload = { action: 'message', subject: msgSubject.trim(), message_body: msgBody.trim(), message_type: msgType }
      } else if (modal.action === 'suspend') {
        payload = { action: 'suspend', suspension_category: suspCategory, admin_notes: adminNotes.trim() }
      } else {
        payload = { action: modal.action }
      }
      const res = await fetch(`/api/admin/hosts/${modal.host.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')

      if (modal.action !== 'message') {
        setHosts(prev => prev.map(h => {
          if (h.id !== modal.host.id) return h
          if (modal.action === 'verify')               return { ...h, verification_status: 'verified' }
          if (modal.action === 'suspend')              return { ...h, suspended_at: new Date().toISOString() }
          if (modal.action === 'reactivate')           return { ...h, suspended_at: null }
          if (modal.action === 'grant_snap_verified')  return { ...h, is_snap_verified: true,  snap_verified_at: new Date().toISOString() }
          if (modal.action === 'revoke_snap_verified') return { ...h, is_snap_verified: false, snap_verified_at: null }
          if (modal.action === 'grant_founder_badge')  return { ...h, is_founder_host: true }
          if (modal.action === 'revoke_founder_badge') return { ...h, is_founder_host: false }
          return h
        }))
        if (selectedId === modal.host.id) {
          const r2 = await fetch(`/api/admin/hosts/${modal.host.id}`)
          if (r2.ok) setDetail(await r2.json())
        }
      }
      const msgs = { message: 'Message sent.', suspend: 'Host suspended.', reactivate: 'Host reinstated.', verify: 'Host verified.', grant_snap_verified: '🛡 Badge granted.', revoke_snap_verified: 'Badge revoked.', grant_founder_badge: '🏅 Founder badge granted.', revoke_founder_badge: 'Founder badge revoked.' }
      showToast(msgs[modal.action] ?? 'Done.')
      setModal(null)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const selectedHost = hosts.find(h => h.id === selectedId)

  const PILLS = [
    ['all',       'All',            stats.total],
    ['verified',  'Verified',       stats.verified],
    ['pending',   'Pending',        stats.pending],
    ['suspended', 'Suspended',      stats.suspended],
    ['hotel',     '🏨 Hotels',      null],
    ['private',   '🏠 Private',     null],
    ['snap',      '🛡 Snap Verified', stats.snap],
  ]

  return (
    <>
      <style>{CSS}</style>
      <div className="h-shell">

        {/* Topbar */}
        <div className="h-topbar">
          <div className="h-tb-path">
            Admin <span style={{ color: 'var(--sub)', margin: '0 5px' }}>/</span>
            <span className="h-current">Hosts</span>
          </div>
          <div className="h-tb-right">
            <button className="h-tb-btn">🔔</button>
            <button className="h-tb-btn">⚙️</button>
          </div>
        </div>

        {/* Content row */}
        <div className="h-content">

          {/* Main scrollable area */}
          <div className="h-main">

            {/* Page header */}
            <div className="h-page-hd">
              <div>
                <h1>Hosts</h1>
                <p>Manage all registered hosts, verifications, and listings</p>
              </div>
              <div className="h-hd-btns">
                <button className="h-hd-btn ghost" onClick={() => (window.location.href = '/api/admin/exports?type=hosts')}>
                  ⬇ Export CSV
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="h-stats">
              <div className="h-stat">
                <div className="h-stat-label">Total Hosts</div>
                <div className="h-stat-val">{stats.total.toLocaleString()}</div>
                <div className="h-stat-sub">All registered</div>
              </div>
              <div className="h-stat">
                <div className="h-stat-label">Verified</div>
                <div className="h-stat-val" style={{ color: 'var(--green)' }}>{stats.verified.toLocaleString()}</div>
                <div className="h-stat-sub">{stats.total > 0 ? Math.round(stats.verified / stats.total * 100) : 0}% of total</div>
              </div>
              <div className="h-stat">
                <div className="h-stat-label">Pending Review</div>
                <div className="h-stat-val" style={{ color: 'var(--yellow)' }}>{stats.pending.toLocaleString()}</div>
                <div className="h-stat-sub">Awaiting verification</div>
              </div>
              <div className="h-stat">
                <div className="h-stat-label">Suspended</div>
                <div className="h-stat-val" style={{ color: 'var(--red)' }}>{stats.suspended.toLocaleString()}</div>
                <div className="h-stat-sub">Currently inactive</div>
              </div>
              <div className="h-stat">
                <div className="h-stat-label">Snap Verified</div>
                <div className="h-stat-val" style={{ color: 'var(--orange)' }}>{stats.snap.toLocaleString()}</div>
                <div className="h-stat-sub">🛡 Badge holders</div>
              </div>
            </div>

            {/* Filters */}
            <div className="h-filters">
              <div className="h-search-wrap">
                <span className="h-search-icon">🔍</span>
                <input
                  className="h-search"
                  placeholder="Search by name, email, or ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="h-pills">
                {PILLS.map(([key, label, cnt]) => (
                  <button
                    key={key}
                    className={`h-pill${filter === key ? ' active' : ''}`}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                    {cnt !== null && <span className="cnt">{cnt}</span>}
                  </button>
                ))}
              </div>
              <div className="h-filters-right">
                <button className="h-sort-btn">Sort: Joined ↓</button>
              </div>
            </div>

            {/* Table */}
            <div className="h-table">
              <div className="h-thead">
                <div className="h-th">Host</div>
                <div className="h-th">Verification</div>
                <div className="h-th">Status</div>
                <div className="h-th">Badge</div>
                <div className="h-th">Joined</div>
                <div className="h-th">Actions</div>
              </div>
              <div className="h-tbody">
                {filtered.length === 0 ? (
                  <div className="h-empty">No hosts found</div>
                ) : filtered.map(h => (
                  <div
                    key={h.id}
                    className={`h-tr${selectedId === h.id ? ' selected' : ''}`}
                    onClick={() => openPanel(h)}
                  >
                    <div className="h-td">
                      <div className="h-host-info">
                        <div className="h-avatar" style={{ background: avatarColor(h.id) }}>
                          {getInitials(h.users?.full_name)}
                        </div>
                        <div>
                          <div className="h-host-name">{h.users?.full_name ?? '—'}</div>
                          <div className="h-host-email">{h.users?.email ?? h.user_id}</div>
                          <HostTypeBadge listings={h.listings ?? []} />
                        </div>
                      </div>
                    </div>
                    <div className="h-td"><VerBadge status={h.verification_status} /></div>
                    <div className="h-td"><StatusBadge host={h} /></div>
                    <div className="h-td"><SnapBadge host={h} /></div>
                    <div className="h-td">
                      <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: 'var(--muted)' }}>
                        {fmtDate(h.created_at)}
                      </span>
                    </div>
                    <div className="h-td">
                      <div className="h-actions" onClick={e => e.stopPropagation()}>
                        <button className="a-btn view" onClick={() => openPanel(h)}>View</button>
                        {canManage && h.verification_status !== 'verified' && !h.suspended_at && (
                          <button className="a-btn ok" onClick={() => openModal('verify', h)}>Verify</button>
                        )}
                        {canManage && !h.suspended_at && (
                          <button className="a-btn susp" onClick={() => openModal('suspend', h)}>Suspend</button>
                        )}
                        {canReinstate && h.suspended_at && (
                          <button className="a-btn ok" onClick={() => openModal('reactivate', h)}>Restore</button>
                        )}
                        {canGrantBadge && !h.is_snap_verified && !h.suspended_at && (
                          <button className="a-btn badge-g" onClick={() => openModal('grant_snap_verified', h)}>🛡 Badge</button>
                        )}
                        {canGrantBadge && h.is_snap_verified && (
                          <button className="a-btn" onClick={() => openModal('revoke_snap_verified', h)}>Revoke</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-pg">
                <div className="h-pg-info">
                  Showing <strong>{Math.min(filtered.length, 50)}</strong> of <strong>{filtered.length}</strong> hosts
                </div>
                <div className="h-pg-btns">
                  <button className="h-pg-btn" disabled>‹</button>
                  <button className="h-pg-btn active">1</button>
                  <button className="h-pg-btn">›</button>
                </div>
              </div>
            </div>

          </div>{/* /h-main */}

          {/* Detail panel */}
          {selectedId && (
            <div className="h-panel">
              <div className="dp-hdr">
                <div className="dp-hdr-title">Host Profile</div>
                <button className="dp-close" onClick={() => { setSelectedId(null); setDetail(null) }}>✕</button>
              </div>
              <div className="dp-body">
                {detailLoading ? (
                  <div className="dp-loading">Loading host data…</div>
                ) : detail ? (
                  <DetailPanel
                    host={detail.host}
                    listings={detail.listings}
                    stats={detail.stats}
                    recentBookings={detail.recentBookings}
                    canManage={canManage}
                    canReinstate={canReinstate}
                    canGrantBadge={canGrantBadge}
                    onAction={openModal}
                    onChat={openChat}
                  />
                ) : selectedHost ? (
                  <DetailPanel
                    host={selectedHost}
                    listings={selectedHost.listings ?? []}
                    stats={null}
                    recentBookings={[]}
                    canManage={canManage}
                    canReinstate={canReinstate}
                    canGrantBadge={canGrantBadge}
                    onAction={openModal}
                    onChat={openChat}
                  />
                ) : null}
              </div>
            </div>
          )}

        </div>{/* /h-content */}
      </div>{/* /h-shell */}

      {/* Modal */}
      {modal && (
        <div className="h-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="h-modal">
            {modal.action === 'message' ? (
              <>
                <h2>✉️ Message Host</h2>
                <p className="h-modal-sub">
                  To: <strong style={{ color: 'var(--text)' }}>{modal.host.users?.full_name ?? '—'}</strong>
                  {' '}({modal.host.users?.email ?? modal.host.email})
                </p>
                <div className="h-modal-field">
                  <label className="h-modal-label">Message type</label>
                  <select className="h-modal-input" value={msgType} onChange={e => setMsgType(e.target.value)}>
                    <option value="info">ℹ️ Info</option>
                    <option value="warning">⚠️ Warning</option>
                  </select>
                </div>
                <div className="h-modal-field">
                  <label className="h-modal-label">Subject *</label>
                  <input className="h-modal-input" value={msgSubject} onChange={e => setMsgSubject(e.target.value)} placeholder="Message subject…" />
                </div>
                <div className="h-modal-field">
                  <label className="h-modal-label">Message *</label>
                  <textarea className="h-modal-input" value={msgBody} onChange={e => setMsgBody(e.target.value)} placeholder="Write your message to the host…" />
                </div>
                <div className="h-modal-footer">
                  <button className="h-modal-cancel" onClick={() => setModal(null)}>Cancel</button>
                  <button
                    className="h-modal-confirm"
                    style={{ background: 'var(--blue)' }}
                    disabled={loading || !msgSubject.trim() || !msgBody.trim()}
                    onClick={confirmAction}
                  >
                    {loading ? 'Sending…' : '✉️ Send Message'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>
                  {modal.action === 'verify'               ? 'Verify Host'
                   : modal.action === 'suspend'            ? 'Suspend Host'
                   : modal.action === 'reactivate'         ? 'Reinstate Host'
                   : modal.action === 'grant_snap_verified'  ? '🛡 Grant Verified Host Badge'
                   : modal.action === 'revoke_snap_verified' ? 'Revoke Verified Host Badge'
                   : modal.action === 'grant_founder_badge'  ? '🏅 Grant Founder Host Badge'
                   : 'Revoke Founder Host Badge'}
                </h2>
                <p className="h-modal-sub">
                  {modal.host.users?.full_name ?? modal.host.full_name ?? '—'} · {modal.host.users?.email ?? modal.host.email}
                </p>

                {modal.action === 'suspend' && (
                  <>
                    <div className="h-alert red">All active listings will be disabled. A suspension notice will be sent to the host.</div>
                    <div className="h-modal-field">
                      <label className="h-modal-label">Reason *</label>
                      <select className="h-modal-input" value={suspCategory} onChange={e => setSuspCategory(e.target.value)}>
                        <option value="">— Select a reason —</option>
                        {SUSPENSION_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                    <div className="h-modal-field">
                      <label className="h-modal-label">Admin Notes *</label>
                      <textarea className="h-modal-input" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Document evidence (not shown to host)…" />
                    </div>
                  </>
                )}
                {modal.action === 'reactivate' && (
                  <div className="h-alert green">This will reinstate the host account and re-enable their suspended listings.</div>
                )}
                {modal.action === 'grant_snap_verified' && (
                  <div className="h-alert purple">
                    This displays <strong>🛡 SnapReserve™ Verified Host</strong> on all listings by this host.<br /><br />
                    <strong>Requirements:</strong> active listings for ≥6 months and no major violations or unresolved complaints.
                  </div>
                )}
                {modal.action === 'revoke_snap_verified' && (
                  <div className="h-alert red">This removes the Verified Host badge from all of this host's listings immediately.</div>
                )}
                {modal.action === 'grant_founder_badge' && (
                  <div className="h-alert" style={{ background: 'var(--goldlt)', border: '1px solid var(--goldborder)', color: 'var(--gold)' }}>
                    This grants the <strong>🏅 Founder Host</strong> badge to this host. It will be displayed permanently on all of their listings and on their host profile.
                  </div>
                )}
                {modal.action === 'revoke_founder_badge' && (
                  <div className="h-alert red">This removes the Founder Host badge from this host's profile and all their listings immediately.</div>
                )}

                <div className="h-modal-footer">
                  <button className="h-modal-cancel" onClick={() => setModal(null)}>Cancel</button>
                  <button
                    className="h-modal-confirm"
                    style={
                      modal.action === 'reactivate'           ? { background: 'var(--green)' } :
                      modal.action === 'grant_snap_verified'  ? { background: 'var(--purple)' } :
                      modal.action === 'revoke_snap_verified' ? { background: 'var(--bg3)', color: 'var(--muted)', border: '1px solid var(--border)' } :
                      modal.action === 'grant_founder_badge'  ? { background: 'var(--gold)' } :
                      modal.action === 'revoke_founder_badge' ? { background: 'var(--bg3)', color: 'var(--muted)', border: '1px solid var(--border)' } :
                      {}
                    }
                    disabled={loading || (modal.action === 'suspend' && (!suspCategory || !adminNotes.trim()))}
                    onClick={confirmAction}
                  >
                    {loading ? 'Processing…'
                      : modal.action === 'reactivate'          ? 'Reinstate Host'
                      : modal.action === 'grant_snap_verified'  ? '🛡 Grant Badge'
                      : modal.action === 'revoke_snap_verified' ? 'Revoke Badge'
                      : modal.action === 'grant_founder_badge'  ? '🏅 Grant Founder Badge'
                      : modal.action === 'revoke_founder_badge' ? 'Revoke Founder Badge'
                      : 'Confirm'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Chat drawer */}
      {chatHost && (
        <div className="chat-overlay" onClick={e => e.target === e.currentTarget && setChatHost(null)}>
          <div className="chat-drawer">
            <div className="chat-hdr">
              <div className="chat-hdr-info">
                <div className="chat-hdr-name">
                  💬 Chat with {chatHost.users?.full_name ?? 'Host'}
                </div>
                <div className="chat-hdr-email">{chatHost.users?.email}</div>
              </div>
              <button className="chat-close" onClick={() => setChatHost(null)}>✕</button>
            </div>

            <div className="chat-msgs">
              {chatLoading ? (
                <div className="chat-loading">Loading messages…</div>
              ) : chatMsgs.length === 0 ? (
                <div className="chat-empty">No messages yet. Send the first one below.</div>
              ) : chatMsgs.map(m => (
                <div key={m.id} className="chat-bubble">
                  <div className="chat-bubble-meta">
                    <span className="chat-sender">Support Team</span>
                    <span className="chat-time">{new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                  <div className="chat-subject">{m.subject}</div>
                  <div className="chat-body">{m.body}</div>
                  <span className={`chat-type-tag chat-type-${m.type ?? 'info'}`}>{m.type ?? 'info'}</span>
                </div>
              ))}
            </div>

            <div className="chat-compose">
              <div className="chat-compose-row">
                <select className="chat-select" value={chatType} onChange={e => setChatType(e.target.value)}>
                  <option value="info">ℹ️ Info</option>
                  <option value="warning">⚠️ Warning</option>
                </select>
                <input
                  className="chat-input"
                  placeholder="Subject…"
                  value={chatSubject}
                  onChange={e => setChatSubject(e.target.value)}
                />
              </div>
              <textarea
                className="chat-textarea"
                placeholder="Write your message to the host…"
                value={chatBody}
                onChange={e => setChatBody(e.target.value)}
              />
              <div className="chat-send-row">
                <button
                  className="chat-send-btn"
                  disabled={chatSending || !chatSubject.trim() || !chatBody.trim()}
                  onClick={sendChatMessage}
                >
                  {chatSending ? 'Sending…' : '↑ Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`h-toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}
