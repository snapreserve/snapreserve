'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function fmt(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtShort(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function relTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts)
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function daysUntil(d) {
  return Math.ceil((new Date(d + 'T12:00:00') - new Date()) / 86400000)
}
function nights(a, b) {
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000)
}
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning ☀️'
  if (h < 17) return 'Good afternoon 👋'
  return 'Good evening 🌙'
}
function statusCfg(s) {
  if (s === 'confirmed') return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: '✓ Confirmed' }
  if (s === 'completed') return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: '✓ Completed' }
  if (s === 'pending')   return { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: '⏳ Pending' }
  if (s === 'cancelled') return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: '✗ Cancelled' }
  return { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb', label: s }
}
const CITY_IMG = {
  'New York': 'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=600&q=75',
  'Miami': 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=600&q=75',
  'Los Angeles': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=600&q=75',
  'Chicago': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=600&q=75',
}
const FB_IMG = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=75'
function listingImg(l) { return l?.images?.[0] || CITY_IMG[l?.city] || FB_IMG }

function SuspensionBanner({ profile }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')
  const [show, setShow] = useState(false)
  async function submit(e) {
    e.preventDefault()
    if (text.trim().length < 20) { setErr('Please write at least 20 characters.'); return }
    setSending(true); setErr('')
    const res = await fetch('/api/appeals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appeal_text: text }) })
    const j = await res.json()
    setSending(false)
    if (!res.ok) { setErr(j.error ?? 'Failed to submit.'); return }
    setSent(true)
  }
  return (
    <div style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.22)', padding: '14px 24px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🚫</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#dc2626', marginBottom: 3 }}>Account suspended</div>
        <div style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.6, marginBottom: 9 }}>
          Your account is temporarily disabled. Contact <a href="mailto:support@snapreserve.app" style={{ color: '#2563eb' }}>support@snapreserve.app</a>.
        </div>
        {!sent ? (!show
          ? <button onClick={() => setShow(true)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#dc2626', padding: '6px 14px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>⚖️ Submit appeal</button>
          : <form onSubmit={submit} style={{ maxWidth: 460 }}>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Explain your situation (min 20 chars)…" style={{ width: '100%', background: 'white', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '8px 11px', fontSize: '0.8rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit', marginBottom: 7 }} />
              {err && <div style={{ color: '#dc2626', fontSize: '0.76rem', marginBottom: 6 }}>{err}</div>}
              <div style={{ display: 'flex', gap: 7 }}>
                <button type="submit" disabled={sending} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '7px 16px', borderRadius: 7, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', opacity: sending ? 0.6 : 1 }}>{sending ? 'Submitting…' : 'Submit'}</button>
                <button type="button" onClick={() => setShow(false)} style={{ background: 'transparent', border: '1px solid #e5e7eb', color: '#6b7280', padding: '7px 13px', borderRadius: 7, fontSize: '0.8rem', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>)
          : <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 7, padding: '8px 12px', fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>✅ Appeal submitted. We'll respond by email shortly.</div>
        }
      </div>
    </div>
  )
}

function NotifRow({ label, sub, defaultOn }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e5ddd4' }}>
      <div><div style={{ fontSize: '12.5px', fontWeight: 600, color: '#111827' }}>{label}</div><div style={{ fontSize: '10.5px', color: '#6b7280', marginTop: 1 }}>{sub}</div></div>
      <button onClick={() => setOn(v => !v)} style={{ width: 38, height: 21, borderRadius: 100, background: on ? '#2563eb' : '#d1d5db', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
        <div style={{ position: 'absolute', top: 2.5, left: on ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
      </button>
    </div>
  )
}

export default function CustomerDashboard() {
  const router = useRouter()
  const [nav, setNav] = useState('home')
  const [tripTab, setTripTab] = useState('upcoming')
  const [profile, setProfile] = useState(null)
  const [bookings, setBookings] = useState([])
  const [saved, setSaved] = useState([])
  const [loading, setLoading] = useState(true)
  // messages
  const [convs, setConvs] = useState([])
  const [userId, setUserId] = useState(null)
  const [activeConvId, setActiveConvId] = useState(null)
  const [thread, setThread] = useState(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [msgDraft, setMsgDraft] = useState('')
  const [msgSending, setMsgSending] = useState(false)
  const [msgsLoaded, setMsgsLoaded] = useState(false)
  const msgBottom = useRef(null)
  // profile form
  const [pf, setPf] = useState({ first_name: '', last_name: '', phone: '', city: '', country: '' })
  const [pfSaving, setPfSaving] = useState(false)
  const [pfSaved, setPfSaved] = useState(false)
  // countdown
  const [cd, setCd] = useState({ d: 0, h: 0, m: 0 })

  useEffect(() => { loadCore() }, [])

  async function loadCore() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login?next=/dashboard'); return }
    const [{ data: prof }, { data: bks }, { data: svd }] = await Promise.all([
      supabase.from('users').select('full_name,email,avatar_url,user_role,is_host,suspended_at,suspension_reason,suspension_category,is_active').eq('id', user.id).maybeSingle(),
      supabase.from('bookings').select('*,listings(id,title,city,state,type,images,price_per_night)').eq('guest_id', user.id).order('check_in', { ascending: true }),
      supabase.from('saved_listings').select('*,listings(id,title,city,state,type,images,price_per_night)').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])
    setProfile(prof); setBookings(bks || []); setSaved(svd || [])
    setLoading(false)
    if (prof) {
      const parts = (prof.full_name || '').split(' ')
      setPf({ first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '', phone: '', city: '', country: '' })
    }
  }

  const now = new Date()
  const upcoming = bookings.filter(b => ['confirmed', 'pending'].includes(b.status) && new Date(b.check_out + 'T23:59:59') >= now)
  const past = bookings.filter(b => b.status === 'completed' || (['confirmed', 'pending'].includes(b.status) && new Date(b.check_out + 'T23:59:59') < now))
  const cancelled = bookings.filter(b => b.status === 'cancelled')
  const nextTrip = upcoming[0]
  const totalSpent = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + Number(b.total_amount || 0), 0)
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  // isHost covers both owners (user_role='host') and team members (is_host=true)
  const isHost = profile?.user_role === 'host' || profile?.is_host === true
  const isPending = profile?.user_role === 'pending_host'
  const totalUnread = convs.reduce((s, c) => s + (c.guest_user_id === userId ? (c.guest_unread_count || 0) : (c.host_unread_count || 0)), 0)

  useEffect(() => {
    if (!nextTrip) return
    function tick() {
      const diff = new Date(nextTrip.check_in + 'T15:00:00') - new Date()
      if (diff > 0) setCd({ d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000) })
    }
    tick(); const t = setInterval(tick, 30000); return () => clearInterval(t)
  }, [nextTrip?.check_in])

  async function loadMessages() {
    if (msgsLoaded) return
    const res = await fetch('/api/messages'); const d = await res.json()
    setConvs(d.conversations || []); setUserId(d.userId); setMsgsLoaded(true)
  }
  async function openThread(id) {
    setActiveConvId(id); setThreadLoading(true)
    const res = await fetch(`/api/messages/${id}`); const d = await res.json()
    setThread(d); setThreadLoading(false)
    setTimeout(() => msgBottom.current?.scrollIntoView({ behavior: 'smooth' }), 80)
  }
  async function sendMsg(e) {
    e?.preventDefault()
    if (!msgDraft.trim() || msgSending || !activeConvId) return
    setMsgSending(true); const content = msgDraft.trim(); setMsgDraft('')
    const res = await fetch(`/api/messages/${activeConvId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
    if (res.ok) { const d = await res.json(); setThread(p => p ? { ...p, messages: [...(p.messages || []), d.message] } : p) }
    setMsgSending(false)
    setTimeout(() => msgBottom.current?.scrollIntoView({ behavior: 'smooth' }), 60)
  }
  async function saveProfile(e) {
    e.preventDefault(); setPfSaving(true)
    const full_name = [pf.first_name, pf.last_name].filter(Boolean).join(' ')
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('users').update({ full_name }).eq('id', user.id)
    setProfile(p => ({ ...p, full_name })); setPfSaving(false); setPfSaved(true)
    setTimeout(() => setPfSaved(false), 2500)
  }
  async function handleLogout() { await supabase.auth.signOut(); router.push('/home') }

  function goTo(page) {
    setNav(page)
    if (page === 'messages') loadMessages()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const CRUMBS = { home: 'Dashboard', trips: 'My Trips', saved: 'Saved Stays', messages: 'Messages', reviews: 'My Reviews', payments: 'Payments', profile: 'Profile & Settings' }
  const tabData = { upcoming, past, cancelled }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f0ea' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e5ddd4', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const AV = ({ size = 40, fs = 15, style = {} }) => (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fs, fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0, fontFamily: "'Playfair Display',serif", ...style }}>
      {profile?.avatar_url?.startsWith('http') ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile?.avatar_url ? <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{profile.avatar_url}</span> : initials}
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:#f5f0ea;color:#111827;display:flex;min-height:100vh;overflow-x:hidden}
        .sb{width:256px;min-height:100vh;background:#fff;border-right:1px solid #e5ddd4;display:flex;flex-direction:column;position:fixed;top:0;left:0;z-index:200}
        .sb-top{padding:18px 18px 14px;border-bottom:1px solid #e5ddd4}
        .sb-logo{font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#111827;text-decoration:none;display:block;margin-bottom:16px}
        .sb-logo span{color:#e8622a}
        .sb-user{display:flex;align-items:center;gap:10px;padding:10px;background:#f5f0ea;border-radius:11px;cursor:pointer;transition:background .15s}
        .sb-user:hover{background:#ede7de}
        .sb-uname{font-size:12px;font-weight:700;color:#111827;line-height:1.2}
        .sb-uemail{font-size:9.5px;color:#6b7280;margin-top:1px}
        .sb-verified{font-size:9px;font-weight:600;color:#15803d;margin-top:2px}
        .sb-nav{flex:1;padding:12px 10px;overflow-y:auto}
        .sb-sec{font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#9ca3af;padding:8px 8px 4px}
        .sb-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:9px;cursor:pointer;color:#6b7280;margin-bottom:1px;border:1px solid transparent;text-decoration:none;transition:all .14s;background:none;width:100%;font-family:inherit;font-size:13px;font-weight:500;text-align:left}
        .sb-item:hover{background:#f5f0ea;color:#111827}
        .sb-item.act{background:#eff6ff;border-color:#bfdbfe;color:#2563eb}
        .sb-icon{font-size:15px;width:20px;text-align:center;flex-shrink:0}
        .sb-badge{margin-left:auto;background:#2563eb;color:#fff;font-size:8px;font-weight:700;padding:2px 7px;border-radius:100px}
        .sb-footer{padding:12px;border-top:1px solid #e5ddd4}
        .sb-out{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:9px;cursor:pointer;color:#6b7280;font-size:13px;font-weight:500;transition:all .14s;background:none;border:none;width:100%;font-family:inherit}
        .sb-out:hover{background:#fef2f2;color:#dc2626}
        .main{margin-left:256px;flex:1;min-height:100vh;display:flex;flex-direction:column}
        .topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 28px;background:#fff;border-bottom:1px solid #e5ddd4;position:sticky;top:0;z-index:100}
        .tb-crumb{font-size:11.5px;color:#6b7280}
        .tb-crumb span{color:#111827;font-weight:600}
        .tb-right{display:flex;align-items:center;gap:8px}
        .tb-icon{width:34px;height:34px;border-radius:8px;border:1px solid #e5ddd4;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;color:#6b7280;transition:all .14s;position:relative}
        .tb-icon:hover{border-color:#d4c8bc;color:#111827}
        .tb-dot{position:absolute;top:5px;right:5px;width:6px;height:6px;border-radius:50%;background:#dc2626;border:1.5px solid #fff}
        .tb-cta{padding:7px 16px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:background .15s}
        .tb-cta:hover{background:#1d4ed8}
        .pg{padding:24px 28px 60px;flex:1;animation:pgFade .25s ease}
        @keyframes pgFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .ph{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px}
        .ph-title{font-family:'Playfair Display',serif;font-size:27px;font-weight:800;color:#111827;line-height:1}
        .ph-title em{font-style:italic;color:#2563eb}
        .ph-sub{font-size:12px;color:#6b7280;margin-top:3px}
        .ph-btn{padding:8px 18px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:none;background:#2563eb;color:#fff;text-decoration:none}
        .ph-btn:hover{background:#1d4ed8}
        .ph-btn.ghost{background:#fff;color:#6b7280;border:1px solid #e5ddd4}
        .ph-btn.ghost:hover{border-color:#d4c8bc;color:#111827}
        .card{background:#fff;border:1px solid #e5ddd4;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.04)}
        .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}
        .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:13px}
        .sc{background:#fff;border:1px solid #e5ddd4;border-radius:13px;padding:17px;transition:all .18s}
        .sc:hover{box-shadow:0 4px 18px rgba(0,0,0,.07);transform:translateY(-1px)}
        .sc-lbl{font-size:9.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#9ca3af;margin-bottom:8px}
        .sc-val{font-family:'Playfair Display',serif;font-size:29px;font-weight:800;color:#111827;line-height:1;margin-bottom:3px}
        .sc-sub{font-size:10.5px;color:#9ca3af}
        .sec-title{font-family:'Playfair Display',serif;font-size:18px;font-weight:800;color:#111827;margin-bottom:13px}
        .sec-title em{font-style:italic;color:#2563eb}
        .wb{background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#60a5fa 100%);border-radius:18px;padding:26px 30px;margin-bottom:18px;position:relative;overflow:hidden;display:flex;align-items:center;gap:18px}
        .wb-glow{position:absolute;top:-50px;right:-50px;width:190px;height:190px;border-radius:50%;background:rgba(255,255,255,.07);pointer-events:none}
        .wb-txt{position:relative;z-index:1;flex:1}
        .wb-greet{font-size:10.5px;font-weight:600;color:rgba(255,255,255,.65);margin-bottom:4px}
        .wb-name{font-family:'Playfair Display',serif;font-size:25px;font-weight:800;color:#fff;line-height:1;margin-bottom:4px}
        .wb-sub{font-size:12px;color:rgba(255,255,255,.65)}
        .wb-right{position:relative;z-index:1;display:flex;flex-direction:column;gap:8px;align-items:flex-end}
        .wb-badge{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:100px;padding:5px 13px;font-size:10.5px;font-weight:700;color:#fff}
        .wb-btn{padding:8px 19px;background:#fff;color:#2563eb;border:none;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s}
        .wb-btn:hover{background:#eff6ff}
        .nth{background:#fff;border:1px solid #e5ddd4;border-radius:18px;overflow:hidden;margin-bottom:16px;display:flex;box-shadow:0 4px 18px rgba(0,0,0,.07)}
        .nth-photo{width:250px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:68px;position:relative;background:linear-gradient(135deg,#1e3a8a,#2563eb,#60a5fa);overflow:hidden}
        .nth-photo img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
        .nth-body{flex:1;padding:22px 26px;display:flex;flex-direction:column;justify-content:space-between}
        .nth-eyebrow{font-size:8px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#2563eb;margin-bottom:6px;display:flex;align-items:center;gap:5px}
        .nth-eyebrow::before{content:'';width:13px;height:1px;background:#2563eb}
        .nth-name{font-family:'Playfair Display',serif;font-size:21px;font-weight:800;color:#111827;line-height:1.1;margin-bottom:4px}
        .nth-loc{font-size:11.5px;color:#6b7280;margin-bottom:13px}
        .nth-details{display:flex;gap:18px;margin-bottom:14px;flex-wrap:wrap}
        .nth-dl{font-size:8px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#9ca3af}
        .nth-dv{font-size:12px;font-weight:700;color:#111827}
        .nth-foot{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:9px}
        .nth-btns{display:flex;gap:7px}
        .nth-btn{padding:7px 13px;border-radius:7px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;cursor:pointer;transition:all .14s}
        .nth-btn.pri{background:#2563eb;color:#fff;border:none}
        .nth-btn.pri:hover{background:#1d4ed8}
        .nth-btn.ghost{background:transparent;color:#6b7280;border:1px solid #e5ddd4}
        .nth-btn.ghost:hover{border-color:#d4c8bc;color:#111827}
        .cd{display:flex;gap:9px;margin-bottom:4px}
        .cd-item{text-align:center;background:#eff6ff;border-radius:9px;padding:7px 10px;border:1px solid #bfdbfe;min-width:47px}
        .cd-num{font-family:'Playfair Display',serif;font-size:19px;font-weight:800;color:#2563eb;line-height:1}
        .cd-lbl{font-size:7px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#6b7280}
        .ql{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:20px}
        .ql-card{background:#fff;border:1px solid #e5ddd4;border-radius:12px;padding:17px;cursor:pointer;transition:all .18s;text-align:center}
        .ql-card:hover{border-color:#bfdbfe;box-shadow:0 4px 18px rgba(37,99,235,.07);transform:translateY(-2px)}
        .ql-icon{font-size:25px;margin-bottom:7px;display:block}
        .ql-label{font-size:11.5px;font-weight:700;color:#111827;margin-bottom:2px}
        .ql-sub{font-size:9.5px;color:#6b7280}
        .al-item{display:flex;align-items:flex-start;gap:11px;padding:11px 0;border-bottom:1px solid #e5ddd4}
        .al-item:last-child{border:none;padding-bottom:0}
        .al-icon{width:35px;height:35px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
        .al-title{font-size:12px;font-weight:600;color:#111827;margin-bottom:1px}
        .al-sub{font-size:10px;color:#6b7280;line-height:1.4}
        .al-time{font-size:9.5px;color:#9ca3af;flex-shrink:0}
        .tt-tabs{display:flex;border-bottom:2px solid #e5ddd4;margin-bottom:18px}
        .tt-tab{padding:9px 17px;font-size:12.5px;font-weight:600;color:#6b7280;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .15s;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit;display:flex;align-items:center;gap:5px}
        .tt-tab:hover{color:#111827}
        .tt-tab.act{color:#2563eb;border-bottom-color:#2563eb}
        .tt-cnt{background:#eff6ff;color:#2563eb;font-size:8.5px;font-weight:700;padding:2px 6px;border-radius:100px}
        .tc{background:#fff;border:1px solid #e5ddd4;border-radius:13px;overflow:hidden;display:flex;transition:all .2s;margin-bottom:11px}
        .tc:hover{box-shadow:0 4px 18px rgba(0,0,0,.07);transform:translateY(-1px);border-color:#d4c8bc}
        .tc-photo{width:185px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:50px;position:relative;overflow:hidden;background:linear-gradient(135deg,#1e3a8a,#2563eb)}
        .tc-photo img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
        .tc-body{flex:1;padding:17px 20px;display:flex;flex-direction:column;justify-content:space-between}
        .tc-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:7px;gap:9px}
        .tc-name{font-family:'Playfair Display',serif;font-size:16px;font-weight:800;color:#111827;line-height:1.15}
        .tc-loc{font-size:10px;color:#6b7280;margin-top:3px}
        .tc-details{display:flex;gap:16px;margin-bottom:11px;flex-wrap:wrap}
        .tc-dl{font-size:8px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af}
        .tc-dv{font-size:11.5px;font-weight:700;color:#111827}
        .tc-foot{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px}
        .tc-price{font-family:'Playfair Display',serif;font-size:16px;font-weight:800;color:#111827}
        .tc-price span{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:400;color:#6b7280}
        .tc-btns{display:flex;gap:6px;flex-wrap:wrap}
        .tc-btn{padding:6px 12px;border-radius:7px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;cursor:pointer;transition:all .14s;text-decoration:none;display:inline-flex;align-items:center}
        .tc-btn.pri{background:#2563eb;color:#fff;border:none}
        .tc-btn.pri:hover{background:#1d4ed8}
        .tc-btn.ghost{background:transparent;color:#6b7280;border:1px solid #e5ddd4}
        .tc-btn.ghost:hover{border-color:#d4c8bc;color:#111827}
        .sv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}
        .sv-card{background:#fff;border:1px solid #e5ddd4;border-radius:13px;overflow:hidden;cursor:pointer;transition:all .2s}
        .sv-card:hover{box-shadow:0 4px 18px rgba(0,0,0,.09);transform:translateY(-3px);border-color:#d4c8bc}
        .sv-photo{height:178px;position:relative;overflow:hidden;background:#f5f0ea;display:flex;align-items:center;justify-content:center;font-size:50px}
        .sv-photo img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;transition:transform .4s}
        .sv-card:hover .sv-photo img{transform:scale(1.05)}
        .sv-unsave{position:absolute;top:10px;right:10px;width:29px;height:29px;border-radius:50%;background:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;font-size:14px;z-index:1}
        .sv-type{position:absolute;top:10px;left:10px;background:#fff;border-radius:100px;padding:3px 9px;font-size:8px;font-weight:700;color:#111827;z-index:1}
        .sv-body{padding:12px}
        .sv-name{font-size:12.5px;font-weight:700;color:#111827;margin-bottom:2px}
        .sv-loc{font-size:10px;color:#6b7280;margin-bottom:8px}
        .sv-foot{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
        .sv-price{font-size:15px;font-weight:700;color:#2563eb}
        .sv-price span{font-size:10px;font-weight:400;color:#6b7280}
        .sv-rating{font-size:11px;font-weight:600;color:#111827}
        .sv-book{width:100%;padding:8px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:11.5px;font-weight:700;cursor:pointer;transition:background .15s}
        .sv-book:hover{background:#1d4ed8}
        .msg-layout{display:grid;grid-template-columns:275px 1fr;gap:0;background:#fff;border:1px solid #e5ddd4;border-radius:13px;overflow:hidden;height:560px}
        .msg-sb{border-right:1px solid #e5ddd4;display:flex;flex-direction:column}
        .msg-search{padding:12px;border-bottom:1px solid #e5ddd4}
        .msg-si{width:100%;padding:7px 11px;border:1px solid #e5ddd4;border-radius:8px;background:#f5f0ea;font-family:'DM Sans',sans-serif;font-size:11.5px;color:#111827;outline:none}
        .msg-si:focus{border-color:#bfdbfe;background:#fff}
        .msg-list{flex:1;overflow-y:auto}
        .msg-thread{display:flex;align-items:flex-start;gap:9px;padding:12px;border-bottom:1px solid #e5ddd4;cursor:pointer;transition:background .12s}
        .msg-thread:hover{background:#f5f0ea}
        .msg-thread.act{background:#eff6ff}
        .mt-av{width:37px;height:37px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
        .mt-name{font-size:11.5px;font-weight:700;color:#111827;margin-bottom:2px}
        .mt-preview{font-size:10px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:145px}
        .mt-time{font-size:8.5px;color:#9ca3af}
        .mt-unread{width:16px;height:16px;border-radius:50%;background:#2563eb;color:#fff;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center}
        .msg-main{display:flex;flex-direction:column}
        .msg-hdr{display:flex;align-items:center;gap:11px;padding:13px 18px;border-bottom:1px solid #e5ddd4}
        .msg-hdr-av{width:37px;height:37px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
        .msg-hdr-name{font-size:13px;font-weight:700;color:#111827}
        .msg-hdr-prop{font-size:10px;color:#6b7280}
        .msg-body{flex:1;padding:15px;overflow-y:auto;display:flex;flex-direction:column;gap:11px;background:#f5f0ea}
        .msg-bw{display:flex;gap:8px;align-items:flex-end}
        .msg-bw.me{flex-direction:row-reverse}
        .mb-av{width:27px;height:27px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0}
        .mb{max-width:66%;padding:9px 13px;border-radius:13px;font-size:12.5px;line-height:1.55}
        .mb.them{background:#fff;color:#111827;border-radius:13px 13px 13px 4px;box-shadow:0 1px 4px rgba(0,0,0,.07)}
        .mb.me{background:#2563eb;color:#fff;border-radius:13px 13px 4px 13px}
        .mb-time{font-size:8.5px;color:#9ca3af;margin-top:2px}
        .me .mb-time{color:rgba(255,255,255,.55);text-align:right}
        .msg-bar{display:flex;align-items:center;gap:8px;padding:12px 15px;border-top:1px solid #e5ddd4;background:#fff}
        .msg-input{flex:1;padding:8px 13px;border:1.5px solid #e5ddd4;border-radius:100px;background:#f5f0ea;font-family:'DM Sans',sans-serif;font-size:12.5px;color:#111827;outline:none;transition:all .15s}
        .msg-input:focus{border-color:#bfdbfe;background:#fff}
        .msg-send{width:35px;height:35px;border-radius:50%;background:#2563eb;border:none;color:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s}
        .msg-send:hover{background:#1d4ed8}
        .tr-row{display:flex;align-items:center;gap:10px;padding:12px 17px;border-bottom:1px solid #e5ddd4;transition:background .12s}
        .tr-row:hover{background:#f5f0ea}
        .tr-row:last-child{border:none}
        .tr-icon{width:33px;height:33px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
        .tr-name{font-size:12.5px;font-weight:600;color:#111827}
        .tr-sub{font-size:9.5px;color:#6b7280;margin-top:1px}
        .tr-amount{margin-left:auto;font-size:13px;font-weight:700}
        .tr-date{font-size:9.5px;color:#9ca3af;margin-left:8px;width:56px;flex-shrink:0;text-align:right}
        .pending-rv{background:#fffbeb;border:1px solid #fde68a;border-radius:13px;padding:15px 18px;display:flex;align-items:center;gap:11px;margin-bottom:11px;cursor:pointer;transition:all .15s}
        .pending-rv:hover{box-shadow:0 3px 14px rgba(0,0,0,.07);transform:translateY(-1px)}
        .pf-layout{display:grid;grid-template-columns:1fr 2fr;gap:16px}
        .pf-left{background:#fff;border:1px solid #e5ddd4;border-radius:13px;padding:22px;text-align:center}
        .pf-av-big{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#60a5fa);display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:30px;font-weight:800;color:#fff;margin:0 auto 11px;border:4px solid #fff;box-shadow:0 0 0 2px #bfdbfe;overflow:hidden}
        .pf-av-big img{width:100%;height:100%;object-fit:cover}
        .pf-name{font-family:'Playfair Display',serif;font-size:19px;font-weight:800;color:#111827;margin-bottom:4px}
        .pf-since{font-size:10px;color:#6b7280;margin-bottom:11px}
        .pf-badges{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-bottom:14px}
        .pf-badge{padding:3px 9px;border-radius:100px;font-size:9.5px;font-weight:700}
        .pf-badge.v{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
        .pf-badge.b{background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe}
        .pf-stats{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px}
        .pf-si{background:#f5f0ea;border-radius:9px;padding:10px;text-align:center}
        .pf-sv{font-family:'Playfair Display',serif;font-size:19px;font-weight:800;color:#111827}
        .pf-sl{font-size:9px;color:#6b7280;margin-top:1px}
        .pf-form{background:#fff;border:1px solid #e5ddd4;border-radius:13px;padding:22px}
        .pf-ftitle{font-size:13.5px;font-weight:700;color:#111827;margin-bottom:16px;padding-bottom:13px;border-bottom:1px solid #e5ddd4}
        .pf-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:11px}
        .pf-group{display:flex;flex-direction:column;gap:4px}
        .pf-label{font-size:8.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#9ca3af}
        .pf-input{padding:9px 11px;border:1.5px solid #e5ddd4;border-radius:8px;background:#f5f0ea;font-family:'DM Sans',sans-serif;font-size:12.5px;color:#111827;outline:none;transition:all .15s}
        .pf-input:focus{border-color:#bfdbfe;background:#fff;box-shadow:0 0 0 3px rgba(37,99,235,.05)}
        .pf-save{padding:8px 22px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:12.5px;font-weight:700;cursor:pointer;transition:all .15s}
        .pf-save:hover{background:#1d4ed8}
        .pf-stitle{font-size:12.5px;font-weight:700;color:#111827;margin:17px 0 11px;padding-top:17px;border-top:1px solid #e5ddd4;display:flex;align-items:center;justify-content:space-between}
        .hb{background:#111827;border-radius:11px;padding:11px 17px;display:flex;align-items:center;justify-content:space-between;gap:11px;margin-bottom:16px}
        .hb-text{font-size:12px;color:rgba(255,255,255,.55)}
        .hb-text strong{color:rgba(255,255,255,.9)}
        .hb-link{font-size:11px;font-weight:700;color:#e8622a;text-decoration:none;padding:6px 13px;border-radius:100px;border:1px solid rgba(232,98,42,.35);transition:all .14s}
        .hb-link:hover{background:rgba(232,98,42,.1)}
        .hcta{background:linear-gradient(135deg,#111827,#1e2d45);border-radius:16px;padding:32px 36px;display:flex;align-items:center;justify-content:space-between;gap:24px;position:relative;overflow:hidden}
        .hcta::before{content:'';position:absolute;top:-30px;right:-30px;width:160px;height:160px;background:radial-gradient(circle,rgba(232,98,42,.2),transparent 70%);pointer-events:none}
        .hcta-title{font-family:'Playfair Display',serif;font-size:1.35rem;font-weight:700;color:#fff;margin-bottom:5px;line-height:1.2}
        .hcta-sub{font-size:12px;color:rgba(255,255,255,.45);line-height:1.7;max-width:340px}
        .hcta-btn{background:#e8622a;color:#fff;border:none;border-radius:11px;padding:11px 24px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;transition:all .18s;text-decoration:none;display:inline-block}
        .hcta-btn:hover{background:#d4541e;transform:translateY(-1px)}
        .empty{text-align:center;padding:40px 20px;background:#fff;border:1px solid #e5ddd4;border-radius:13px}
        .empty-icon{font-size:2rem;margin-bottom:9px}
        .empty-title{font-size:14.5px;font-weight:700;margin-bottom:5px}
        .empty-sub{font-size:12px;color:#6b7280;margin-bottom:16px;line-height:1.6}
        .empty-btn{display:inline-block;padding:8px 20px;background:#2563eb;color:#fff;border-radius:100px;font-weight:700;font-size:12px;text-decoration:none;transition:background .15s}
        .empty-btn:hover{background:#1d4ed8}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#d4c8bc;border-radius:100px}
        @media(max-width:1100px){.sb{display:none}.main{margin-left:0}.g4,.ql{grid-template-columns:repeat(2,1fr)}.sv-grid{grid-template-columns:repeat(2,1fr)}.pf-layout,.g2{grid-template-columns:1fr}}
        @media(max-width:680px){.pg{padding:16px 14px 50px}.g4,.ql{grid-template-columns:1fr 1fr}.nth{flex-direction:column}.nth-photo{width:100%;height:150px}.tc{flex-direction:column}.tc-photo{width:100%;height:140px}.sv-grid{grid-template-columns:repeat(2,1fr)}.pf-grid{grid-template-columns:1fr}.msg-layout{grid-template-columns:1fr;height:auto}}
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside className="sb">
        <div className="sb-top">
          <a href="/home" className="sb-logo">Snap<span>Reserve</span>™</a>
          <div className="sb-user" onClick={() => goTo('profile')}>
            <AV size={40} fs={14} />
            <div>
              <div className="sb-uname">{profile?.full_name || 'My Account'}</div>
              <div className="sb-uemail">{profile?.email || ''}</div>
              <div className="sb-verified">✓ Verified guest</div>
            </div>
          </div>
        </div>
        <nav className="sb-nav">
          <div className="sb-sec">My Account</div>
          {[
            { id: 'home',     icon: '🏠', label: 'Dashboard' },
            { id: 'trips',    icon: '🧳', label: 'My Trips',    badge: upcoming.length || null },
            { id: 'saved',    icon: '♡',  label: 'Saved Stays' },
            { id: 'messages', icon: '💬', label: 'Messages',    badge: totalUnread || null },
          ].map(i => (
            <button key={i.id} className={`sb-item${nav === i.id ? ' act' : ''}`} onClick={() => goTo(i.id)}>
              <span className="sb-icon">{i.icon}</span>{i.label}
              {i.badge ? <span className="sb-badge">{i.badge}</span> : null}
            </button>
          ))}
          <div className="sb-sec">History & Reviews</div>
          <button className={`sb-item${nav === 'reviews' ? ' act' : ''}`} onClick={() => goTo('reviews')}>
            <span className="sb-icon">⭐</span>My Reviews
          </button>
          <div className="sb-sec">Account</div>
          <button className={`sb-item${nav === 'payments' ? ' act' : ''}`} onClick={() => goTo('payments')}>
            <span className="sb-icon">💳</span>Payments
          </button>
          <button className={`sb-item${nav === 'profile' ? ' act' : ''}`} onClick={() => goTo('profile')}>
            <span className="sb-icon">👤</span>Profile & Settings
          </button>
        </nav>
        <div className="sb-footer">
          <button className="sb-out" onClick={handleLogout}>🚪 Sign Out</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main">
        <div className="topbar">
          <div className="tb-crumb">My Account / <span>{CRUMBS[nav]}</span></div>
          <div className="tb-right">
            <div className="tb-icon" onClick={() => goTo('messages')} title="Messages">
              💬{totalUnread > 0 && <div className="tb-dot" />}
            </div>
            <div className="tb-icon" title="Notifications">🔔</div>
            <button className="tb-cta" onClick={() => router.push('/listings')}>🔍 Find a Stay</button>
          </div>
        </div>

        {(profile?.suspended_at || profile?.is_active === false) && <SuspensionBanner profile={profile} />}

        {/* ══ DASHBOARD HOME ══ */}
        {nav === 'home' && (
          <div className="pg">
            <div className="wb">
              <div className="wb-glow" />
              <AV size={56} fs={21} style={{ border: '3px solid rgba(255,255,255,.35)', background: 'rgba(255,255,255,.2)', position: 'relative', zIndex: 1 }} />
              <div className="wb-txt">
                <div className="wb-greet">{getGreeting()}</div>
                <div className="wb-name">Welcome back, {firstName}</div>
                <div className="wb-sub">
                  {upcoming.length > 0 ? `You have ${upcoming.length} upcoming trip${upcoming.length > 1 ? 's' : ''}${totalUnread > 0 ? ` and ${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : ''}.` : "Ready to plan your next adventure?"}
                </div>
              </div>
              <div className="wb-right">
                <div className="wb-badge">🛡️ SnapGuarantee™ Active</div>
                <button className="wb-btn" onClick={() => upcoming.length > 0 ? goTo('trips') : router.push('/listings')}>
                  {upcoming.length > 0 ? 'View My Trips →' : 'Browse Stays →'}
                </button>
              </div>
            </div>

            {isHost && (
              <div className="hb">
                <div className="hb-text"><strong>Explore mode</strong> — your host account is active in the background.</div>
                <a href="/host/dashboard" className="hb-link">Switch to Host →</a>
              </div>
            )}

            <div className="g4" style={{ marginBottom: 16 }}>
              <div className="sc"><div className="sc-lbl">🧳 Trips Taken</div><div className="sc-val">{bookings.filter(b => b.status !== 'cancelled').length}</div><div className="sc-sub">Across {[...new Set(bookings.map(b => b.listings?.city).filter(Boolean))].length} cities</div></div>
              <div className="sc"><div className="sc-lbl">⭐ Reviews</div><div className="sc-val">{past.filter(b => b.status === 'completed').length}</div><div className="sc-sub">Past stays</div></div>
              <div className="sc"><div className="sc-lbl">♡ Saved Stays</div><div className="sc-val">{saved.length}</div><div className="sc-sub">{saved.length > 0 ? 'In your wishlist' : 'Start saving'}</div></div>
              <div className="sc"><div className="sc-lbl">💰 Total Spent</div><div className="sc-val">${totalSpent >= 1000 ? `${(totalSpent / 1000).toFixed(1)}k` : totalSpent}</div><div className="sc-sub">Across all bookings</div></div>
            </div>

            {nextTrip && (
              <>
                <div className="sec-title" style={{ marginBottom: 11 }}>Next <em>trip</em></div>
                <div className="nth">
                  <div className="nth-photo">
                    {nextTrip.listings?.images?.[0] && <img src={nextTrip.listings.images[0]} alt="" />}
                    <span style={{ position: 'relative', zIndex: 1 }}>{nextTrip.listings?.type === 'hotel' ? '🏨' : '🏠'}</span>
                  </div>
                  <div className="nth-body">
                    <div>
                      <div className="nth-eyebrow">Upcoming Trip</div>
                      <div className="nth-name">{nextTrip.listings?.title || 'Property'}</div>
                      <div className="nth-loc">📍 {nextTrip.listings?.city}{nextTrip.listings?.state ? `, ${nextTrip.listings.state}` : ''}</div>
                      <div className="nth-details">
                        <div><div className="nth-dl">Check-in</div><div className="nth-dv">{fmt(nextTrip.check_in)}</div></div>
                        <div><div className="nth-dl">Check-out</div><div className="nth-dv">{fmt(nextTrip.check_out)}</div></div>
                        <div><div className="nth-dl">Nights</div><div className="nth-dv">{nights(nextTrip.check_in, nextTrip.check_out)}</div></div>
                        <div><div className="nth-dl">Guests</div><div className="nth-dv">{nextTrip.guests}</div></div>
                      </div>
                      {daysUntil(nextTrip.check_in) > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div className="nth-dl" style={{ marginBottom: 6 }}>Days Until Check-in</div>
                          <div className="cd">
                            <div className="cd-item"><div className="cd-num">{cd.d}</div><div className="cd-lbl">Days</div></div>
                            <div className="cd-item"><div className="cd-num">{cd.h}</div><div className="cd-lbl">Hours</div></div>
                            <div className="cd-item"><div className="cd-num">{cd.m}</div><div className="cd-lbl">Mins</div></div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="nth-foot">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ ...statusCfg(nextTrip.status), display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 11px', borderRadius: 100, fontSize: 10.5, fontWeight: 700, border: `1px solid ${statusCfg(nextTrip.status).border}` }}>
                          {statusCfg(nextTrip.status).label}
                        </span>
                        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 800 }}>
                          ${Number(nextTrip.total_amount).toLocaleString()} <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: 400, color: '#6b7280' }}>total</span>
                        </span>
                      </div>
                      <div className="nth-btns">
                        <button className="nth-btn ghost" onClick={() => goTo('messages')}>💬 Message</button>
                        <button className="nth-btn pri" onClick={() => goTo('trips')}>Manage →</button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="sec-title">Quick <em>actions</em></div>
            <div className="ql">
              <div className="ql-card" onClick={() => goTo('trips')}><span className="ql-icon">🧳</span><div className="ql-label">My Trips</div><div className="ql-sub">{upcoming.length > 0 ? `${upcoming.length} upcoming` : 'View all bookings'}</div></div>
              <div className="ql-card" onClick={() => goTo('saved')}><span className="ql-icon">♡</span><div className="ql-label">Saved Stays</div><div className="ql-sub">{saved.length > 0 ? `${saved.length} saved` : 'Start your wishlist'}</div></div>
              <div className="ql-card" onClick={() => goTo('messages')}><span className="ql-icon">💬</span><div className="ql-label">Messages</div><div className="ql-sub">{totalUnread > 0 ? `${totalUnread} unread` : 'No new messages'}</div></div>
              <div className="ql-card" onClick={() => goTo('reviews')}><span className="ql-icon">⭐</span><div className="ql-label">My Reviews</div><div className="ql-sub">{past.length > 0 ? `${past.length} past trip${past.length > 1 ? 's' : ''}` : 'After checkout'}</div></div>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="sec-title" style={{ fontSize: 15, marginBottom: 0 }}>Recent <em>activity</em></div>
              <div style={{ height: 1, background: '#e5ddd4', margin: '11px 0' }} />
              {bookings.length === 0 && saved.length === 0
                ? <div style={{ textAlign: 'center', padding: '22px 0', color: '#9ca3af', fontSize: 12 }}>No recent activity yet.</div>
                : <>
                  {bookings.slice(0, 3).map(b => (
                    <div key={b.id} className="al-item">
                      <div className="al-icon" style={{ background: b.status === 'confirmed' ? '#eff6ff' : b.status === 'cancelled' ? '#fef2f2' : '#f5f0ea' }}>
                        {b.status === 'confirmed' ? '✅' : b.status === 'cancelled' ? '✗' : '🧳'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="al-title">Booking {statusCfg(b.status).label.replace('✓ ', '').replace('⏳ ', '').replace('✗ ', '')} — {b.listings?.title || 'Property'}</div>
                        <div className="al-sub">{fmtShort(b.check_in)} – {fmtShort(b.check_out)} · ${Number(b.total_amount).toLocaleString()} · #{b.reference}</div>
                      </div>
                      <div className="al-time">{relTime(b.created_at)}</div>
                    </div>
                  ))}
                  {saved.slice(0, 2).map(s => (
                    <div key={s.id} className="al-item">
                      <div className="al-icon" style={{ background: '#fdf4ff' }}>♡</div>
                      <div style={{ flex: 1 }}>
                        <div className="al-title">Saved — {s.listings?.title || 'Property'}</div>
                        <div className="al-sub">Added to wishlist · {s.listings?.city}{s.listings?.state ? `, ${s.listings.state}` : ''}</div>
                      </div>
                      <div className="al-time">{relTime(s.created_at)}</div>
                    </div>
                  ))}
                </>
              }
            </div>
          </div>
        )}

        {/* ══ TRIPS ══ */}
        {nav === 'trips' && (
          <div className="pg">
            <div className="ph">
              <div><div className="ph-title">My <em>Trips</em></div><div className="ph-sub">All your bookings in one place</div></div>
              <button className="ph-btn" onClick={() => router.push('/listings')}>+ Find a Stay</button>
            </div>
            <div className="tt-tabs">
              {[{ id: 'upcoming', label: 'Upcoming' }, { id: 'past', label: 'Past' }, { id: 'cancelled', label: 'Cancelled' }].map(t => (
                <button key={t.id} className={`tt-tab${tripTab === t.id ? ' act' : ''}`} onClick={() => setTripTab(t.id)}>
                  {t.label}<span className="tt-cnt">{tabData[t.id].length}</span>
                </button>
              ))}
            </div>
            {tabData[tripTab].length === 0 ? (
              <div className="empty">
                <div className="empty-icon">{tripTab === 'upcoming' ? '🗓️' : tripTab === 'past' ? '🧳' : '✗'}</div>
                <div className="empty-title">No {tripTab} trips</div>
                <p className="empty-sub">{tripTab === 'upcoming' ? 'Your confirmed reservations will appear here.' : `Your ${tripTab} stays will show here.`}</p>
                {tripTab === 'upcoming' && <a href="/listings" className="empty-btn">Browse stays →</a>}
              </div>
            ) : tabData[tripTab].map(b => {
              const img = listingImg(b.listings)
              const cfg = statusCfg(b.status)
              return (
                <div key={b.id} className="tc">
                  <div className="tc-photo">
                    <img src={img} alt={b.listings?.title} />
                    <span style={{ position: 'relative', zIndex: 1, fontSize: 50 }}>{b.listings?.type === 'hotel' ? '🏨' : '🏠'}</span>
                  </div>
                  <div className="tc-body">
                    <div>
                      <div className="tc-header">
                        <div><div className="tc-name">{b.listings?.title || 'Property'}</div><div className="tc-loc">📍 {b.listings?.city}{b.listings?.state ? `, ${b.listings.state}` : ''}</div></div>
                        <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 11px', borderRadius: 100, fontSize: 10.5, fontWeight: 700 }}>{cfg.label}</span>
                      </div>
                      <div className="tc-details">
                        <div><div className="tc-dl">Check-in</div><div className="tc-dv">{fmt(b.check_in)}</div></div>
                        <div><div className="tc-dl">Check-out</div><div className="tc-dv">{fmt(b.check_out)}</div></div>
                        <div><div className="tc-dl">Guests</div><div className="tc-dv">{b.guests}</div></div>
                        <div><div className="tc-dl">Ref</div><div className="tc-dv">#{b.reference}</div></div>
                      </div>
                    </div>
                    <div className="tc-foot">
                      <div className="tc-price">${Number(b.total_amount).toLocaleString()} <span>total ({nights(b.check_in, b.check_out)} nights)</span></div>
                      <div className="tc-btns">
                        <button className="tc-btn ghost" onClick={() => goTo('messages')}>💬 Message</button>
                        {b.status === 'completed' && <button className="tc-btn ghost" onClick={() => goTo('reviews')}>⭐ Review</button>}
                        <a href={`/listings/${b.listing_id}`} className="tc-btn pri">View →</a>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ══ SAVED ══ */}
        {nav === 'saved' && (
          <div className="pg">
            <div className="ph">
              <div><div className="ph-title">Saved <em>Stays</em></div><div className="ph-sub">{saved.length} {saved.length === 1 ? 'property' : 'properties'} in your wishlist</div></div>
            </div>
            {saved.length === 0 ? (
              <div className="empty"><div className="empty-icon">❤️</div><div className="empty-title">Nothing saved yet</div><p className="empty-sub">Tap the heart on any listing to save it here.</p><a href="/listings" className="empty-btn">Explore stays →</a></div>
            ) : (
              <div className="sv-grid">
                {saved.map(s => {
                  const img = listingImg(s.listings)
                  return (
                    <div key={s.id} className="sv-card">
                      <div className="sv-photo">
                        <img src={img} alt={s.listings?.title} />
                        <span style={{ position: 'relative', zIndex: 1 }}>{s.listings?.type === 'hotel' ? '🏨' : '🏠'}</span>
                        <div className="sv-unsave">❤️</div>
                        <div className="sv-type">{s.listings?.type === 'hotel' ? '🏨 Hotel' : '🏠 Private Stay'}</div>
                      </div>
                      <div className="sv-body">
                        <div className="sv-name">{s.listings?.title || 'Property'}</div>
                        <div className="sv-loc">📍 {s.listings?.city}{s.listings?.state ? `, ${s.listings.state}` : ''}</div>
                        <div className="sv-foot">
                          <div className="sv-price">${s.listings?.price_per_night} <span>/night</span></div>
                        </div>
                        <a href={`/listings/${s.listing_id}`} style={{ display: 'block', textDecoration: 'none' }}>
                          <button className="sv-book">Book Now</button>
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ MESSAGES ══ */}
        {nav === 'messages' && (
          <div className="pg">
            <div className="ph">
              <div><div className="ph-title">My <em>Messages</em></div><div className="ph-sub">{totalUnread > 0 ? `${totalUnread} unread` : 'Your conversations'}</div></div>
            </div>
            {!msgsLoaded ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>Loading…</div>
            ) : (
              <div className="msg-layout">
                <div className="msg-sb">
                  <div className="msg-search"><input className="msg-si" placeholder="🔍  Search messages…" /></div>
                  <div className="msg-list">
                    {convs.length === 0
                      ? <div style={{ padding: '28px 14px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>No conversations yet.</div>
                      : convs.map(c => {
                        const unread = c.guest_user_id === userId ? c.guest_unread_count : c.host_unread_count
                        return (
                          <div key={c.id} className={`msg-thread${activeConvId === c.id ? ' act' : ''}`} onClick={() => openThread(c.id)}>
                            <div className="mt-av" style={{ background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)' }}>🏨</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="mt-name">{c.listing_title || 'Host'}</div>
                              <div className="mt-preview">{c.last_message_preview || 'No messages yet'}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 'auto', flexShrink: 0 }}>
                              <div className="mt-time">{c.last_message_at ? new Date(c.last_message_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</div>
                              {unread > 0 && <div className="mt-unread">{unread}</div>}
                            </div>
                          </div>
                        )
                      })
                    }
                  </div>
                </div>
                <div className="msg-main">
                  {!activeConvId
                    ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13, flexDirection: 'column', gap: 7 }}><span style={{ fontSize: 30 }}>💬</span>Select a conversation</div>
                    : threadLoading
                    ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Loading…</div>
                    : thread && <>
                        <div className="msg-hdr">
                          <div className="msg-hdr-av" style={{ background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)' }}>🏨</div>
                          <div><div className="msg-hdr-name">{thread.conversation?.listing_title || 'Host'}</div><div className="msg-hdr-prop">{thread.conversation?.listing_city ? `📍 ${thread.conversation.listing_city}` : ''}</div></div>
                        </div>
                        <div className="msg-body">
                          {(thread.messages || []).map(m => {
                            const isMe = m.sender_id === userId
                            return (
                              <div key={m.id} className={`msg-bw${isMe ? ' me' : ''}`}>
                                <div className="mb-av" style={{ background: isMe ? 'linear-gradient(135deg,#2563eb,#60a5fa)' : 'linear-gradient(135deg,#1e3a8a,#3b82f6)' }}>
                                  {isMe ? initials.slice(0, 1) : '🏨'}
                                </div>
                                <div>
                                  <div className={`mb ${isMe ? 'me' : 'them'}`}>{m.content}</div>
                                  <div className="mb-time">{new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                                </div>
                              </div>
                            )
                          })}
                          <div ref={msgBottom} />
                        </div>
                        <div className="msg-bar">
                          <input className="msg-input" placeholder="Type a message…" value={msgDraft} onChange={e => setMsgDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg(e)} />
                          <button className="msg-send" onClick={sendMsg} disabled={msgSending}>↑</button>
                        </div>
                      </>
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ REVIEWS ══ */}
        {nav === 'reviews' && (
          <div className="pg">
            <div className="ph">
              <div><div className="ph-title">My <em>Reviews</em></div><div className="ph-sub">Your feedback helps other travellers</div></div>
            </div>
            {past.filter(b => b.status === 'completed').length > 0 && (
              <>
                <div className="sec-title" style={{ marginBottom: 11 }}>Awaiting <em>Your Review</em></div>
                {past.filter(b => b.status === 'completed').slice(0, 3).map(b => (
                  <div key={b.id} className="pending-rv">
                    <span style={{ fontSize: 22, flexShrink: 0 }}>⭐</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#b45309' }}>How was {b.listings?.title || 'your stay'}?</div>
                      <div style={{ fontSize: 10.5, color: '#6b7280', marginTop: 2 }}>Checked out {fmt(b.check_out)} · {b.listings?.city}{b.listings?.state ? `, ${b.listings.state}` : ''}</div>
                    </div>
                    <a href={`/listings/${b.listing_id}`} style={{ padding: '7px 13px', background: '#b45309', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', flexShrink: 0 }}>Write Review</a>
                  </div>
                ))}
              </>
            )}
            {past.length === 0 && (
              <div className="empty"><div className="empty-icon">⭐</div><div className="empty-title">No trips to review yet</div><p className="empty-sub">After checking out from a stay, you can leave a review here.</p><a href="/listings" className="empty-btn">Browse stays →</a></div>
            )}
          </div>
        )}

        {/* ══ PAYMENTS ══ */}
        {nav === 'payments' && (
          <div className="pg">
            <div className="ph">
              <div><div className="ph-title">Payments & <em>Billing</em></div><div className="ph-sub">Manage payment methods and view history</div></div>
            </div>
            <div className="g2" style={{ marginBottom: 16 }}>
              <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 17px', borderBottom: '1px solid #e5ddd4' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>Payment Methods</div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}>+ Add New</span>
                </div>
                <div style={{ padding: '28px 17px', textAlign: 'center', color: '#9ca3af' }}>
                  <div style={{ fontSize: 28, marginBottom: 7 }}>💳</div>
                  <div style={{ fontSize: 12 }}>Payment methods coming soon.</div>
                </div>
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '13px 17px', borderBottom: '1px solid #e5ddd4', fontSize: 13.5, fontWeight: 700 }}>Billing Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  {[
                    { label: 'Total Spent', val: `$${totalSpent.toLocaleString()}` },
                    { label: 'Trips Booked', val: bookings.filter(b => b.status !== 'cancelled').length },
                    { label: 'Cancelled', val: cancelled.length },
                    { label: 'Avg. per Trip', val: bookings.filter(b => b.status !== 'cancelled').length ? `$${Math.round(totalSpent / bookings.filter(b => b.status !== 'cancelled').length).toLocaleString()}` : '—' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '15px 17px', borderRight: i % 2 === 0 ? '1px solid #e5ddd4' : 'none', borderBottom: i < 2 ? '1px solid #e5ddd4' : 'none' }}>
                      <div style={{ fontSize: 9.5, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 5 }}>{item.label}</div>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 23, fontWeight: 800 }}>{item.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 17px', borderBottom: '1px solid #e5ddd4' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Transaction History</div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}>Download CSV</span>
              </div>
              {bookings.length === 0
                ? <div style={{ padding: '28px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>No transactions yet.</div>
                : bookings.map(b => (
                  <div key={b.id} className="tr-row">
                    <div className="tr-icon" style={{ background: b.status === 'cancelled' ? '#fef2f2' : '#eff6ff' }}>{b.listings?.type === 'hotel' ? '🏨' : '🏠'}</div>
                    <div><div className="tr-name">{b.listings?.title || 'Property'}</div><div className="tr-sub">#{b.reference} · {fmtShort(b.check_in)} – {fmtShort(b.check_out)}</div></div>
                    <div className="tr-amount" style={{ color: b.status === 'cancelled' ? '#9ca3af' : '#111827', textDecoration: b.status === 'cancelled' ? 'line-through' : 'none' }}>−${Number(b.total_amount).toLocaleString()}</div>
                    <div className="tr-date">{new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ══ PROFILE ══ */}
        {nav === 'profile' && (
          <div className="pg">
            <div className="ph">
              <div><div className="ph-title">Profile & <em>Settings</em></div><div className="ph-sub">Manage your personal information and preferences</div></div>
            </div>
            <div className="pf-layout">
              <div>
                <div className="pf-left" style={{ marginBottom: 13 }}>
                  <div className="pf-av-big">
                    {profile?.avatar_url?.startsWith('http') ? <img src={profile.avatar_url} alt="" /> : profile?.avatar_url ? <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{profile.avatar_url}</span> : initials}
                  </div>
                  <div className="pf-name">{profile?.full_name || '—'}</div>
                  <div className="pf-since">Member since {new Date().getFullYear()}</div>
                  <div className="pf-badges">
                    <span className="pf-badge v">✓ Verified Guest</span>
                    <span className="pf-badge b">🛡️ SnapGuarantee™</span>
                  </div>
                  <div className="pf-stats">
                    <div className="pf-si"><div className="pf-sv">{bookings.filter(b => b.status !== 'cancelled').length}</div><div className="pf-sl">Trips</div></div>
                    <div className="pf-si"><div className="pf-sv">{past.filter(b => b.status === 'completed').length}</div><div className="pf-sl">Reviews</div></div>
                    <div className="pf-si"><div className="pf-sv">{saved.length}</div><div className="pf-sl">Saved</div></div>
                    <div className="pf-si"><div className="pf-sv">${totalSpent >= 1000 ? `${(totalSpent / 1000).toFixed(1)}k` : totalSpent}</div><div className="pf-sl">Spent</div></div>
                  </div>
                  <button className="pf-photo-btn" style={{ width: '100%', padding: 8, border: '1.5px solid #e5ddd4', borderRadius: 8, background: 'transparent', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#6b7280', cursor: 'pointer' }}>📷 Change Photo</button>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#dc2626', marginBottom: 9 }}>Account Actions</div>
                  <button style={{ width: '100%', padding: 8, border: '1.5px solid #fecaca', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 6 }}>Deactivate Account</button>
                  <button style={{ width: '100%', padding: 8, border: '1px solid #e5ddd4', borderRadius: 8, background: 'transparent', color: '#6b7280', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Download My Data</button>
                </div>
              </div>
              <div className="pf-form">
                <div className="pf-ftitle">Personal Information</div>
                <form onSubmit={saveProfile}>
                  <div className="pf-grid">
                    <div className="pf-group"><label className="pf-label">First Name</label><input className="pf-input" value={pf.first_name} onChange={e => setPf(p => ({ ...p, first_name: e.target.value }))} /></div>
                    <div className="pf-group"><label className="pf-label">Last Name</label><input className="pf-input" value={pf.last_name} onChange={e => setPf(p => ({ ...p, last_name: e.target.value }))} /></div>
                  </div>
                  <div className="pf-grid">
                    <div className="pf-group"><label className="pf-label">Email Address</label><input className="pf-input" type="email" value={pf.email || profile?.email || ''} readOnly style={{ opacity: 0.65 }} /></div>
                    <div className="pf-group"><label className="pf-label">Phone Number</label><input className="pf-input" value={pf.phone} onChange={e => setPf(p => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" /></div>
                  </div>
                  <div className="pf-grid">
                    <div className="pf-group"><label className="pf-label">City</label><input className="pf-input" value={pf.city} onChange={e => setPf(p => ({ ...p, city: e.target.value }))} /></div>
                    <div className="pf-group"><label className="pf-label">Country</label><input className="pf-input" value={pf.country} onChange={e => setPf(p => ({ ...p, country: e.target.value }))} /></div>
                  </div>
                  <button type="submit" className="pf-save" disabled={pfSaving}>{pfSaved ? '✓ Saved!' : pfSaving ? 'Saving…' : 'Save Changes'}</button>
                </form>
                <div className="pf-stitle">Notification Preferences <span style={{ fontSize: 10.5, fontWeight: 400, color: '#6b7280' }}>Control what you receive</span></div>
                {[
                  { label: 'Booking Confirmations', sub: 'Email when a booking is confirmed', def: true },
                  { label: 'New Messages',          sub: 'When a host sends you a message', def: true },
                  { label: 'Check-in Reminders',    sub: 'Reminders 24h and 48h before check-in', def: true },
                  { label: 'Review Reminders',      sub: 'Prompted to review after checkout', def: true },
                  { label: 'Promotional Emails',    sub: 'Deals, new destinations, platform news', def: false },
                ].map((item, i) => <NotifRow key={i} label={item.label} sub={item.sub} defaultOn={item.def} />)}
                <div className="pf-stitle">Security</div>
                <div className="pf-grid">
                  <div className="pf-group"><label className="pf-label">Current Password</label><input className="pf-input" type="password" placeholder="••••••••" /></div>
                  <div className="pf-group"><label className="pf-label">New Password</label><input className="pf-input" type="password" placeholder="New password" /></div>
                </div>
                <button className="pf-save">Update Password</button>
              </div>
            </div>
            {!isHost && !isPending && (
              <div className="hcta" style={{ marginTop: 18 }}>
                <div><div className="hcta-title">Your space could be earning.</div><div className="hcta-sub">Join thousands of hosts and turn your property into income — on your schedule.</div></div>
                <a href="/become-a-host" className="hcta-btn">Start hosting →</a>
              </div>
            )}
            {isPending && (
              <div style={{ background: 'rgba(217,119,6,.05)', border: '1px solid rgba(217,119,6,.2)', borderRadius: 13, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 13, marginTop: 16 }}>
                <span style={{ fontSize: '1.6rem' }}>⏳</span>
                <div><div style={{ fontWeight: 700, marginBottom: 3, fontSize: 13 }}>Host application under review</div><p style={{ fontSize: '0.8rem', color: '#92400E', lineHeight: 1.6 }}>Our team is reviewing your application. We'll notify you within 1–3 business days.</p></div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
