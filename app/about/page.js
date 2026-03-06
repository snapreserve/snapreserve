import SharedHeader from '@/app/components/SharedHeader'

export const metadata = { title: 'About — SnapReserve™', description: 'Learn about SnapReserve™ — the modern booking platform connecting travelers with hotels and private stays.' }

export default function AboutPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; color:var(--sr-text); background:var(--sr-bg); }

        /* LAYOUT */
        .w { max-width:1280px; margin:0 auto; padding:0 40px; }

        /* HERO */
        .ab-hero { background:linear-gradient(135deg,var(--sr-text) 0%,#2D1F14 100%); padding:90px 40px; overflow:hidden; position:relative; }
        .ab-hero-inner { max-width:1280px; margin:0 auto; display:grid; grid-template-columns:1fr 400px; gap:60px; align-items:center; position:relative; z-index:2; }
        .ab-eyebrow { font-size:0.68rem; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:#F4601A; margin-bottom:18px; }
        .ab-title { font-family:'Playfair Display',serif; font-size:clamp(3rem,6vw,4.5rem); font-weight:900; color:var(--sr-bg); line-height:1.05; letter-spacing:-2px; margin-bottom:20px; }
        .ab-title em { color:#F4601A; font-style:italic; }
        .ab-body { font-size:0.95rem; color:rgba(250,248,245,0.65); line-height:1.8; margin-bottom:28px; max-width:500px; }
        .ab-btns { display:flex; gap:12px; flex-wrap:wrap; }
        .btn-primary { padding:13px 28px; background:#F4601A; color:white; border:none; border-radius:100px; font-size:0.88rem; font-weight:700; cursor:pointer; font-family:inherit; text-decoration:none; display:inline-block; transition:opacity 0.15s; }
        .btn-primary:hover { opacity:0.88; }
        .btn-ghost { padding:13px 28px; background:rgba(255,255,255,0.08); color:var(--sr-bg); border:1px solid rgba(255,255,255,0.2); border-radius:100px; font-size:0.88rem; font-weight:700; cursor:pointer; font-family:inherit; text-decoration:none; display:inline-block; transition:all 0.15s; }
        .btn-ghost:hover { background:rgba(255,255,255,0.15); }
        .ab-float { display:flex; flex-direction:column; gap:14px; }
        .ab-stat { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:18px 22px; backdrop-filter:blur(8px); }
        .ab-stat.accent { background:rgba(244,96,26,0.12); border-color:rgba(244,96,26,0.25); }
        .abs-val { font-family:'Playfair Display',serif; font-size:1.8rem; font-weight:900; color:var(--sr-bg); line-height:1; margin-bottom:4px; }
        .abs-lbl { font-size:0.82rem; font-weight:700; color:var(--sr-bg); margin-bottom:2px; }
        .abs-sub { font-size:0.72rem; color:rgba(250,248,245,0.5); }
        .ab-bg-letter { position:absolute; top:-30px; right:-20px; font-family:'Playfair Display',serif; font-size:28rem; font-weight:900; color:rgba(255,255,255,0.03); line-height:1; user-select:none; pointer-events:none; }

        /* SECTION COMMON */
        .section { padding:72px 40px; }
        .section.alt { background:var(--sr-surface); }
        .eyebrow { font-size:0.68rem; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:#F4601A; display:flex; align-items:center; gap:8px; margin-bottom:14px; }
        .eyebrow::before { content:''; width:28px; height:2px; background:#F4601A; flex-shrink:0; }
        .section-title { font-family:'Playfair Display',serif; font-size:clamp(1.8rem,3vw,2.6rem); font-weight:700; line-height:1.15; margin-bottom:18px; }
        .section-title em { color:#F4601A; font-style:italic; }
        .section-body { font-size:0.92rem; color:var(--sr-muted); line-height:1.8; margin-bottom:14px; }

        /* MISSION */
        .mission-inner { max-width:1280px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr; gap:60px; align-items:start; }
        .miss-card { background:var(--sr-card); border:1px solid var(--sr-border2); border-radius:18px; padding:22px; display:flex; gap:16px; align-items:flex-start; margin-bottom:14px; }
        .miss-card:last-child { margin-bottom:0; }
        .mc-icon { font-size:1.4rem; flex-shrink:0; margin-top:2px; }
        .mc-title { font-size:0.9rem; font-weight:700; color:var(--sr-text); margin-bottom:6px; }
        .mc-body { font-size:0.82rem; color:var(--sr-muted); line-height:1.7; }

        /* FOUNDER */
        .founder-inner { max-width:1280px; margin:0 auto; display:grid; grid-template-columns:360px 1fr; gap:60px; align-items:start; }
        .f-frame { background:linear-gradient(135deg,#F4601A,#c0440e); border-radius:22px; padding:32px; text-align:center; }
        .f-initials { width:80px; height:80px; border-radius:50%; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:1.6rem; font-weight:900; color:white; margin:0 auto 16px; font-family:'Playfair Display',serif; }
        .f-nameplate { }
        .fn-name { font-size:1.1rem; font-weight:700; color:white; margin-bottom:4px; }
        .fn-role { font-size:0.75rem; color:rgba(255,255,255,0.7); }
        .f-eyebrow { font-size:0.68rem; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:#F4601A; margin-bottom:10px; }
        .f-title { font-family:'Playfair Display',serif; font-size:2.4rem; font-weight:900; line-height:1.1; margin-bottom:20px; }
        .f-title em { color:#F4601A; font-style:italic; }
        .f-quote { font-family:'Playfair Display',serif; font-size:1.05rem; font-style:italic; color:var(--sr-text); border-left:3px solid #F4601A; padding-left:18px; margin-bottom:20px; line-height:1.6; }
        .f-body { font-size:0.9rem; color:var(--sr-muted); line-height:1.8; margin-bottom:14px; }
        .f-sig { font-family:'Playfair Display',serif; font-size:1.3rem; font-style:italic; color:var(--sr-text); margin-top:20px; }
        .f-sig-role { font-size:0.72rem; font-weight:600; color:#A89880; margin-top:4px; letter-spacing:0.05em; }

        /* VALUES */
        .values-grid { max-width:1280px; margin:0 auto; display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
        .val-card { background:var(--sr-card); border:1px solid var(--sr-border2); border-radius:18px; padding:28px; transition:box-shadow 0.2s; }
        .val-card:hover { box-shadow:0 8px 32px rgba(0,0,0,0.07); }
        .val-num { font-size:0.65rem; font-weight:800; letter-spacing:0.14em; color:#F4601A; margin-bottom:10px; }
        .val-title { font-size:0.95rem; font-weight:700; color:var(--sr-text); margin-bottom:8px; }
        .val-body { font-size:0.82rem; color:var(--sr-muted); line-height:1.7; }

        /* PROMISE STRIP */
        .promise-strip { background:linear-gradient(135deg,var(--sr-text),#2D1F14); padding:72px 40px; text-align:center; }
        .ps-eyebrow { font-size:0.68rem; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:#F4601A; margin-bottom:14px; }
        .ps-title { font-family:'Playfair Display',serif; font-size:clamp(2rem,4vw,3rem); font-weight:900; color:var(--sr-bg); margin-bottom:14px; line-height:1.1; }
        .ps-title em { color:#F4601A; font-style:italic; }
        .ps-body { font-size:0.92rem; color:rgba(250,248,245,0.6); max-width:480px; margin:0 auto 28px; line-height:1.8; }
        .ps-btns { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-bottom:20px; }
        .btn-white { padding:13px 28px; background:var(--sr-card); color:var(--sr-text); border:none; border-radius:100px; font-size:0.88rem; font-weight:700; cursor:pointer; font-family:inherit; text-decoration:none; display:inline-block; transition:opacity 0.15s; }
        .btn-white:hover { opacity:0.9; }
        .btn-outline-white { padding:13px 28px; background:transparent; color:white; border:2px solid rgba(255,255,255,0.35); border-radius:100px; font-size:0.88rem; font-weight:700; cursor:pointer; font-family:inherit; text-decoration:none; display:inline-block; transition:all 0.15s; }
        .btn-outline-white:hover { background:rgba(255,255,255,0.1); }
        .ps-sub { font-size:0.72rem; color:rgba(250,248,245,0.35); letter-spacing:0.05em; }

        /* FOOTER */
        .footer { background:#0F0C09; padding:24px 40px 20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; }
        .footer-logo { font-family:'Playfair Display',serif; font-size:1.1rem; font-weight:700; color:white; }
        .footer-logo span { color:#F4601A; }
        .footer-links { display:flex; gap:22px; }
        .footer-links a { font-size:0.78rem; color:rgba(255,255,255,0.4); text-decoration:none; cursor:pointer; transition:color 0.15s; }
        .footer-links a:hover { color:rgba(255,255,255,0.7); }
        .footer-copy { font-size:0.72rem; color:rgba(255,255,255,0.25); }

        @media(max-width:1024px) { .values-grid{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:768px) {
          .ab-hero-inner,.mission-inner,.founder-inner { grid-template-columns:1fr; gap:32px; }
          .ab-float { flex-direction:row; flex-wrap:wrap; }
          .ab-stat { flex:1 1 160px; }
          .values-grid { grid-template-columns:1fr; }
          .w,.section,.footer { padding-left:20px; padding-right:20px; }
          .ab-hero { padding:60px 20px; }
        }
      `}</style>

      <SharedHeader />

      {/* HERO */}
      <section className="ab-hero">
        <div className="ab-bg-letter">S</div>
        <div className="ab-hero-inner">
          <div>
            <div className="ab-eyebrow">Our Story</div>
            <h1 className="ab-title">About<br /><em>SnapReserve™</em></h1>
            <p className="ab-body">A modern booking platform that connects travelers with <strong style={{color:'var(--sr-bg)'}}>hotels and private stays</strong> in one place — while giving hosts the tools they actually deserve.</p>
            <div className="ab-btns">
              <a href="/signup" className="btn-primary">Sign Up Now →</a>
              <a href="/become-a-host" className="btn-ghost">Become a Host</a>
            </div>
          </div>
          <div className="ab-float">
            <div className="ab-stat accent">
              <div className="abs-val">2</div>
              <div className="abs-lbl">Property Types</div>
              <div className="abs-sub">Hotels &amp; Private Stays</div>
            </div>
            <div className="ab-stat">
              <div className="abs-val">🇺🇸</div>
              <div className="abs-lbl">United States</div>
              <div className="abs-sub">International coming soon</div>
            </div>
            <div className="ab-stat">
              <div className="abs-val">2026</div>
              <div className="abs-lbl">Founded</div>
              <div className="abs-sub">Launching Soon</div>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section className="section">
        <div className="mission-inner">
          <div>
            <div className="eyebrow">Our Mission</div>
            <h2 className="section-title">Simplify how people<br /><em>discover</em> &amp; book</h2>
            <p className="section-body">SnapReserve™ was built around one belief — finding and booking a place to stay should feel effortless for travelers, and managing listings should feel powerful for hosts.</p>
            <p className="section-body">Whether you're a hotel owner with multiple room categories or a homeowner with a villa to share, SnapReserve™ is built specifically for your needs.</p>
          </div>
          <div>
            <div className="miss-card">
              <span className="mc-icon">🏨</span>
              <div>
                <div className="mc-title">Hotels &amp; Private Stays — Together</div>
                <div className="mc-body">The only platform handling multi-room-type hotel listings and private home rentals under the same roof, with flows built for each property type.</div>
              </div>
            </div>
            <div className="miss-card">
              <span className="mc-icon">📊</span>
              <div>
                <div className="mc-title">Host Tools That Actually Work</div>
                <div className="mc-body">Real-time dashboard, smart pricing, per-room occupancy tracking, instant confirmation, and direct guest messaging — everything in one place.</div>
              </div>
            </div>
            <div className="miss-card">
              <span className="mc-icon">✨</span>
              <div>
                <div className="mc-title">A Better Guest Experience</div>
                <div className="mc-body">Filter by room type, browse real photos, read verified reviews, and book with confidence — knowing exactly what you're getting before you arrive.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER */}
      <section className="section alt">
        <div className="founder-inner">
          <div>
            <div className="f-frame">
              <div className="f-initials">DN</div>
              <div className="f-nameplate">
                <div className="fn-name">Danish Noorani</div>
                <div className="fn-role">Founder &amp; CEO, SnapReserve™™</div>
              </div>
            </div>
          </div>
          <div>
            <div className="f-eyebrow">The Founder</div>
            <h2 className="f-title">Built by<br /><em>Danish</em> Noorani</h2>
            <blockquote className="f-quote">"Travelers deserve better discovery. Hosts deserve better tools. SnapReserve™ is the platform that respects both."</blockquote>
            <p className="f-body">Danish Noorani founded SnapReserve™ with a clear vision: to build a booking platform that treats hotels like the businesses they are — not like oversized vacation homes — while making private stays just as easy to discover and book.</p>
            <p className="f-body">From the host dashboard to the guest listing flow, every feature was designed with intentionality. The goal is simple: fewer friction points, more unforgettable stays.</p>
            <div className="f-sig">Danish Noorani</div>
            <div className="f-sig-role">Founder &amp; CEO · SnapReserve™™</div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="section">
        <div style={{textAlign:'center', marginBottom:'44px'}}>
          <div className="eyebrow" style={{justifyContent:'center'}}>What We Stand For</div>
          <h2 className="section-title" style={{marginBottom:0}}>Our <em>values</em></h2>
        </div>
        <div className="values-grid">
          {[
            { n:'01', title:'Simplicity Over Complexity',    body:'Booking or listing should take minutes. We strip away the unnecessary and keep only what matters.' },
            { n:'02', title:'Hosts Are Partners',            body:'We build for hosts, not just around them. Their tools get the same care as the guest experience.' },
            { n:'03', title:'Honesty in Every Detail',       body:'No hidden fees. No misleading photos. No price surprises at checkout. Transparency for everyone.' },
            { n:'04', title:'Built for Real Property Types', body:'A hotel with 48 rooms is not the same as a spare bedroom. SnapReserve™ respects the difference.' },
            { n:'05', title:'Travelers Come First',          body:'Every guest interaction should feel smooth and delightful. We obsess over the experience.' },
            { n:'06', title:'Growth Through Trust',          body:'Verified reviews, secure payments, transparent profiles. Trust is earned — and we design for it.' },
          ].map(({ n, title, body }) => (
            <div key={n} className="val-card">
              <div className="val-num">{n}</div>
              <div className="val-title">{title}</div>
              <div className="val-body">{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROMISE STRIP */}
      <section className="promise-strip">
        <div className="ps-eyebrow">Join SnapReserve™</div>
        <h2 className="ps-title">Ready to <em>experience</em><br />the difference?</h2>
        <p className="ps-body">Launching soon. Early access spots are limited — sign up now and be first through the door.</p>
        <div className="ps-btns">
          <a href="/signup" className="btn-white">Sign Up Now →</a>
          <a href="/become-a-host" className="btn-outline-white">List Your Property</a>
        </div>
        <div className="ps-sub">snapreserve.app · Currently serving the United States · International coming soon</div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <span className="footer-logo">Snap<span>Reserve</span>™</span>
        <div className="footer-links">
          <a href="/about">About</a>
          <a href="/become-a-host">For Hosts</a>
          <a href="/listings">Explore</a>
          <a href="/contact">Contact</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
        <span className="footer-copy">© 2026 SnapReserve™. All rights reserved.</span>
      </footer>
    </>
  )
}
