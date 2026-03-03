'use client'
import { useState } from "react"

const ORANGE = "#F4601A"
const DARK = "#1A1410"
const LIGHT = "#FAF8F5"
const MUTED = "#6B5F54"
const BORDER = "#E8E2D9"
const CARD = "#F3F0EB"
const GREEN = "#16A34A"
const GREEN_BG = "#F0FFF4"
const GREEN_BORDER = "#BBF7D0"
const YELLOW = "#D97706"
const YELLOW_BG = "#FFFBEB"
const RED = "#DC2626"
const RED_BG = "#FEF2F2"
const BLUE = "#1A6EF4"

const SERVICES = [
  {
    group: "Core Platform",
    items: [
      { name: "Website & Homepage",       status: "operational", uptime: "99.98%" },
      { name: "Search & Discovery",       status: "operational", uptime: "99.95%" },
      { name: "Booking Engine",           status: "operational", uptime: "99.99%" },
      { name: "User Authentication",      status: "operational", uptime: "100.0%" },
    ]
  },
  {
    group: "Host Tools",
    items: [
      { name: "Host Dashboard",           status: "operational", uptime: "99.96%" },
      { name: "Listing Management",       status: "degraded",    uptime: "98.12%" },
      { name: "Photo Upload (Storage)",   status: "operational", uptime: "99.91%" },
      { name: "Analytics & Reports",      status: "operational", uptime: "99.87%" },
    ]
  },
  {
    group: "Payments & Payouts",
    items: [
      { name: "Stripe Checkout",          status: "operational", uptime: "99.99%" },
      { name: "Host Payouts",             status: "operational", uptime: "99.97%" },
      { name: "Refund Processing",        status: "operational", uptime: "99.93%" },
    ]
  },
  {
    group: "Infrastructure",
    items: [
      { name: "API (Supabase)",           status: "operational", uptime: "99.99%" },
      { name: "Database",                 status: "operational", uptime: "100.0%" },
      { name: "CDN & Media Delivery",     status: "operational", uptime: "99.96%" },
      { name: "Email Notifications",      status: "operational", uptime: "99.88%" },
      { name: "Admin Panel",              status: "operational", uptime: "100.0%" },
    ]
  },
]

const INCIDENTS = [
  {
    id: "INC-2026-014",
    date: "Mar 3, 2026",
    title: "Elevated error rate on Listing Management",
    status: "investigating",
    severity: "minor",
    updates: [
      { time: "11:42 AM PST", label: "Investigating", msg: "We are investigating reports of slow response times when hosts save or update listing details. Booking functionality is not affected." },
      { time: "11:28 AM PST", label: "Identified",    msg: "Issue first detected via automated monitoring. Our engineering team is actively working on a fix." },
    ]
  },
  {
    id: "INC-2026-013",
    date: "Feb 28, 2026",
    title: "Brief API latency spike — resolved",
    status: "resolved",
    severity: "minor",
    updates: [
      { time: "3:14 PM PST", label: "Resolved",   msg: "The issue has been fully resolved. All API response times are back to normal. Root cause: a misconfigured query index on the listings table." },
      { time: "2:58 PM PST", label: "Monitoring", msg: "Fix deployed. Monitoring to confirm stability." },
      { time: "2:41 PM PST", label: "Identified", msg: "Elevated API latency identified. Affecting search queries. Working on fix." },
    ]
  },
]

const UPTIME_BARS = Array.from({ length: 90 }, (_, i) => {
  if (i === 89 || i === 88) return "degraded"
  if (i === 72 || i === 71) return "incident"
  return "operational"
})

function StatusBadge({ status, size = "md" }) {
  const configs = {
    operational:   { bg: GREEN_BG,  border: GREEN_BORDER, color: GREEN,  dot: GREEN,  label: "Operational"  },
    degraded:      { bg: YELLOW_BG, border: "#FDE68A",    color: YELLOW, dot: YELLOW, label: "Degraded"     },
    outage:        { bg: RED_BG,    border: "#FECACA",    color: RED,    dot: RED,    label: "Major Outage" },
    investigating: { bg: YELLOW_BG, border: "#FDE68A",    color: YELLOW, dot: YELLOW, label: "Investigating" },
    resolved:      { bg: GREEN_BG,  border: GREEN_BORDER, color: GREEN,  dot: GREEN,  label: "Resolved"     },
    monitoring:    { bg: "#EFF6FF", border: "#BFDBFE",    color: BLUE,   dot: BLUE,   label: "Monitoring"   },
  }
  const cfg = configs[status] || configs.operational
  const pad = size === "sm" ? "2px 8px" : "4px 12px"
  const fs  = size === "sm" ? 10 : 11

  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:100, padding:pad, fontSize:fs, fontWeight:700, color:cfg.color }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:cfg.dot, flexShrink:0, boxShadow: status==="operational" ? `0 0 0 2px ${cfg.dot}33` : "none" }}/>
      {cfg.label}
    </span>
  )
}

function UptimeBar({ bars }) {
  return (
    <div style={{ display:"flex", gap:2, alignItems:"flex-end", height:28 }}>
      {bars.map((s, i) => {
        const color = s === "operational" ? GREEN : s === "degraded" ? YELLOW : RED
        const h = s === "operational" ? 20 : s === "degraded" ? 14 : 10
        return (
          <div
            key={i}
            title={s}
            style={{ flex:1, height:h, background:color, borderRadius:2, opacity: i > 85 ? 1 : 0.55 + (i/85)*0.35, cursor:"pointer", transition:"height 0.15s" }}
            onMouseEnter={e => e.target.style.opacity = 1}
            onMouseLeave={e => e.target.style.opacity = i > 85 ? 1 : 0.55 + (i/85)*0.35}
          />
        )
      })}
    </div>
  )
}

export default function StatusPage() {
  const [expanded, setExpanded] = useState(null)

  const hasOutage   = SERVICES.some(g => g.items.some(s => s.status === "outage"))
  const hasDegraded = SERVICES.some(g => g.items.some(s => s.status === "degraded"))

  const overallStatus = hasOutage ? "outage" : hasDegraded ? "degraded" : "operational"
  const overallMessages = {
    operational: "All systems operational",
    degraded:    "Some systems experiencing issues",
    outage:      "Major outage in progress",
  }

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", background:LIGHT, minHeight:"100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
      `}</style>

      {/* NAV */}
      <nav style={{ background:"white", borderBottom:`1px solid ${BORDER}`, padding:"0 40px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <a href="https://snapreserve.app" style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:18, color:DARK, textDecoration:"none" }}>
            Snap<span style={{ color:ORANGE }}>Reserve™</span>
          </a>
          <span style={{ fontSize:11, color:MUTED, background:CARD, border:`1px solid ${BORDER}`, borderRadius:100, padding:"2px 10px", fontWeight:600 }}>Status</span>
        </div>
        <div style={{ display:"flex", gap:16, alignItems:"center" }}>
          <a href="https://snapreserve.app" style={{ fontSize:12, color:MUTED, textDecoration:"none", fontWeight:500 }}>← snapreserve.app</a>
          <a href="#subscribe" style={{ fontSize:12, color:MUTED, textDecoration:"none", fontWeight:500 }}>Subscribe to updates</a>
        </div>
      </nav>

      {/* HERO STATUS BANNER */}
      <div style={{ background: overallStatus === "operational" ? GREEN : overallStatus === "degraded" ? YELLOW : RED, padding:"36px 40px" }}>
        <div style={{ maxWidth:780, margin:"0 auto", display:"flex", alignItems:"center", gap:18 }}>
          <div style={{ width:52, height:52, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>
            {overallStatus === "operational" ? "✅" : overallStatus === "degraded" ? "⚠️" : "🔴"}
          </div>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:"white", marginBottom:4 }}>
              {overallMessages[overallStatus]}
            </div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.75)" }}>
              Last updated: March 3, 2026 at 11:48 AM PST · <span style={{ textDecoration:"underline", cursor:"pointer" }}>Subscribe to updates</span>
            </div>
          </div>
          <div style={{ marginLeft:"auto", background:"rgba(255,255,255,0.18)", borderRadius:12, padding:"12px 20px", textAlign:"center", flexShrink:0 }}>
            <div style={{ fontSize:22, fontWeight:700, color:"white" }}>99.97%</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>30-day uptime</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:780, margin:"0 auto", padding:"36px 40px 80px" }}>

        {/* ACTIVE INCIDENT ALERT */}
        {INCIDENTS.filter(i => i.status !== "resolved").map(inc => (
          <div key={inc.id} style={{ background:YELLOW_BG, border:`1.5px solid #FDE68A`, borderRadius:16, padding:"16px 20px", marginBottom:28, display:"flex", gap:14, alignItems:"flex-start" }}>
            <span style={{ fontSize:22, flexShrink:0 }}>⚠️</span>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <span style={{ fontSize:13, fontWeight:700, color:YELLOW }}>{inc.title}</span>
                <StatusBadge status={inc.status} size="sm"/>
              </div>
              <div style={{ fontSize:12, color:MUTED }}>{inc.updates[0].msg}</div>
              <div style={{ fontSize:11, color:MUTED, marginTop:6 }}>{inc.id} · {inc.date}</div>
            </div>
            <button
              onClick={() => setExpanded(expanded === inc.id ? null : inc.id)}
              style={{ padding:"6px 14px", borderRadius:100, border:`1px solid #FDE68A`, background:"white", fontSize:11, fontWeight:700, cursor:"pointer", color:YELLOW, flexShrink:0 }}
            >
              {expanded === inc.id ? "Collapse" : "View updates"}
            </button>
          </div>
        ))}

        {/* SERVICE STATUS GROUPS */}
        {SERVICES.map((group, gi) => (
          <div key={gi} style={{ marginBottom:28 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:DARK }}>{group.group}</h2>
              <StatusBadge
                status={group.items.some(s => s.status === "outage") ? "outage" : group.items.some(s => s.status === "degraded") ? "degraded" : "operational"}
                size="sm"
              />
            </div>
            <div style={{ background:"white", border:`1px solid ${BORDER}`, borderRadius:16, overflow:"hidden" }}>
              {group.items.map((item, ii) => (
                <div key={ii} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 20px", borderBottom: ii < group.items.length-1 ? `1px solid ${BORDER}` : "none" }}>
                  <span style={{ flex:1, fontSize:13, fontWeight:500, color:DARK }}>{item.name}</span>
                  <span style={{ fontSize:12, color:MUTED, fontFamily:"monospace", marginRight:8 }}>{item.uptime} uptime</span>
                  <StatusBadge status={item.status} size="sm"/>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 90-DAY UPTIME HISTORY */}
        <div style={{ marginBottom:36 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:DARK }}>90-Day Uptime History</h2>
            <div style={{ display:"flex", gap:14, alignItems:"center", fontSize:11, color:MUTED }}>
              {[["#16A34A","Operational"],["#D97706","Degraded"],["#DC2626","Outage"]].map(([c,l]) => (
                <span key={l} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ width:8, height:8, borderRadius:2, background:c }}/>
                  {l}
                </span>
              ))}
            </div>
          </div>
          <div style={{ background:"white", border:`1px solid ${BORDER}`, borderRadius:16, padding:"20px 20px 14px" }}>
            <UptimeBar bars={UPTIME_BARS}/>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontSize:11, color:MUTED }}>
              <span>90 days ago</span>
              <span style={{ color:GREEN, fontWeight:700 }}>99.97% uptime</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* INCIDENT HISTORY */}
        <div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:DARK, marginBottom:16 }}>Incident History</h2>

          {INCIDENTS.map((inc, i) => (
            <div key={i} style={{ background:"white", border:`1px solid ${BORDER}`, borderRadius:16, overflow:"hidden", marginBottom:12 }}>
              <div
                onClick={() => setExpanded(expanded === inc.id ? null : inc.id)}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 20px", cursor:"pointer" }}
              >
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:3 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:DARK }}>{inc.title}</span>
                    <StatusBadge status={inc.status} size="sm"/>
                    <span style={{ fontSize:10, color:MUTED, background:CARD, borderRadius:100, padding:"2px 8px" }}>{inc.severity}</span>
                  </div>
                  <div style={{ fontSize:11, color:MUTED }}>{inc.id} · {inc.date}</div>
                </div>
                <span style={{ fontSize:18, color:MUTED, transform: expanded===inc.id ? "rotate(180deg)" : "none", transition:"transform 0.2s" }}>▾</span>
              </div>

              {expanded === inc.id && (
                <div style={{ borderTop:`1px solid ${BORDER}`, padding:"0 20px 16px" }}>
                  {inc.updates.map((upd, ui) => (
                    <div key={ui} style={{ display:"flex", gap:16, paddingTop:16 }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                        <div style={{ width:10, height:10, borderRadius:"50%", background: upd.label==="Resolved" ? GREEN : upd.label==="Monitoring" ? BLUE : YELLOW, marginTop:2, flexShrink:0 }}/>
                        {ui < inc.updates.length-1 && <div style={{ width:2, flex:1, background:BORDER, marginTop:4 }}/>}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                          <span style={{ fontSize:11, fontWeight:700, color: upd.label==="Resolved" ? GREEN : upd.label==="Monitoring" ? BLUE : YELLOW }}>{upd.label}</span>
                          <span style={{ fontSize:11, color:MUTED }}>{upd.time}</span>
                        </div>
                        <p style={{ fontSize:12, color:MUTED, lineHeight:1.7 }}>{upd.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div style={{ textAlign:"center", marginTop:14 }}>
            <button style={{ padding:"9px 22px", borderRadius:100, border:`1.5px solid ${BORDER}`, background:"white", fontSize:12, fontWeight:700, cursor:"pointer", color:MUTED }}>
              View full incident history →
            </button>
          </div>
        </div>

        {/* SUBSCRIBE FOOTER CARD */}
        <div id="subscribe" style={{ marginTop:40, background:DARK, borderRadius:20, padding:"28px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:24 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:"white", marginBottom:6 }}>
              Get notified of incidents
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)", lineHeight:1.6 }}>
              Receive instant email or SMS alerts when a service goes down or recovers.
            </div>
          </div>
          <div style={{ display:"flex", gap:10, flexShrink:0 }}>
            <input
              placeholder="your@email.com"
              style={{ padding:"10px 16px", borderRadius:100, border:`1.5px solid rgba(255,255,255,0.1)`, background:"rgba(255,255,255,0.06)", color:"white", fontSize:12, outline:"none", width:200 }}
            />
            <button style={{ padding:"10px 22px", borderRadius:100, background:ORANGE, color:"white", border:"none", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
              Subscribe
            </button>
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <div style={{ borderTop:`1px solid ${BORDER}`, padding:"20px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"white" }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:14, color:DARK }}>
          Snap<span style={{ color:ORANGE }}>Reserve™</span>
          <span style={{ fontSize:10, fontWeight:400, color:MUTED, fontFamily:"sans-serif", marginLeft:10 }}>status.snapreserve.app</span>
        </div>
        <div style={{ display:"flex", gap:20, fontSize:11, color:MUTED }}>
          <a href="/privacy" style={{ color:MUTED, textDecoration:"none" }}>Privacy Policy</a>
          <a href="/terms" style={{ color:MUTED, textDecoration:"none" }}>Terms</a>
          <a href="mailto:support@snapreserve.app" style={{ color:MUTED, textDecoration:"none" }}>Contact Support</a>
          <a href="https://snapreserve.app" style={{ color:ORANGE, textDecoration:"none", fontWeight:700 }}>snapreserve.app →</a>
        </div>
      </div>
    </div>
  )
}
