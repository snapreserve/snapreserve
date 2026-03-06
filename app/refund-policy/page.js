export default function RefundPolicyPage() {
  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: var(--sr-bg); color: var(--sr-text); }
        .nav { display: flex; align-items: center; justify-content: space-between; padding: 0 48px; height: 68px; background: var(--sr-card); border-bottom: 1px solid var(--sr-border-solid,#E8E2D9); position: sticky; top: 0; z-index: 100; }
        .logo { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 900; text-decoration: none; color: var(--sr-text); }
        .logo span { color: #F4601A; }
        .main { max-width: 760px; margin: 0 auto; padding: 56px 48px 80px; }
        .badge { display: inline-block; background: rgba(244,96,26,0.08); border: 1px solid rgba(244,96,26,0.2); border-radius: 100px; padding: 5px 14px; font-size: 0.72rem; font-weight: 700; color: #F4601A; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; }
        h1 { font-family: 'Playfair Display', serif; font-size: 2.4rem; font-weight: 700; margin-bottom: 8px; line-height: 1.2; }
        .updated { font-size: 0.82rem; color: var(--sr-sub); margin-bottom: 40px; }
        .intro { font-size: 1rem; color: var(--sr-muted); line-height: 1.8; margin-bottom: 40px; padding: 20px 24px; background: var(--sr-card); border-radius: 16px; border: 1px solid var(--sr-border-solid,#E8E2D9); }
        h2 { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700; margin: 36px 0 12px; color: var(--sr-text); display: flex; align-items: center; gap: 8px; }
        p { font-size: 0.9rem; color: var(--sr-muted); line-height: 1.8; margin-bottom: 12px; }
        ul { padding-left: 20px; margin-bottom: 12px; }
        ul li { font-size: 0.9rem; color: var(--sr-muted); line-height: 1.8; margin-bottom: 4px; }
        .highlight { background: var(--sr-card); border: 1px solid var(--sr-border-solid,#E8E2D9); border-radius: 12px; padding: 16px 20px; margin: 16px 0; }
        .policy-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
        .policy-card { background: var(--sr-card); border: 1px solid var(--sr-border-solid,#E8E2D9); border-radius: 16px; padding: 20px; }
        .policy-name { font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #F4601A; margin-bottom: 8px; }
        .policy-title { font-size: 1rem; font-weight: 700; color: var(--sr-text); margin-bottom: 10px; }
        .policy-rule { font-size: 0.8rem; color: var(--sr-muted); line-height: 1.6; margin-bottom: 6px; }
        .contact-card { background: #1A1410; border-radius: 20px; padding: 32px; margin-top: 48px; text-align: center; }
        .cc-title { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700; color: white; margin-bottom: 8px; }
        .cc-sub { font-size: 0.86rem; color: rgba(255,255,255,0.5); margin-bottom: 20px; }
        .cc-email { display: inline-block; background: #F4601A; color: white; padding: 12px 28px; border-radius: 100px; font-weight: 700; font-size: 0.9rem; text-decoration: none; }
        .footer { background: var(--sr-bg); color: var(--sr-muted); padding: 32px 48px; display: flex; align-items: center; justify-content: space-between; margin-top: 80px; border-top: 1px solid var(--sr-border); }
        .footer-logo { font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: var(--sr-text); }
        .footer-logo span { color: #F4601A; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { font-size: 0.8rem; color: var(--sr-muted); text-decoration: none; }
        @media (max-width: 768px) { .main, .nav, .footer { padding-left: 20px; padding-right: 20px; } h1 { font-size: 1.8rem; } .policy-grid { grid-template-columns: 1fr; } }
      `}</style>

      <nav className="nav">
        <a href="/" className="logo">Snap<span>Reserve™</span></a>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/login" style={{padding:'8px 20px',borderRadius:'100px',fontSize:'0.84rem',fontWeight:'700',border:'1px solid var(--sr-border-solid,#D4CEC5)',color:'var(--sr-text)',textDecoration:'none'}}>Log in</a>
          <a href="/signup" style={{padding:'8px 20px',borderRadius:'100px',fontSize:'0.84rem',fontWeight:'700',background:'#F4601A',color:'white',textDecoration:'none'}}>Sign up</a>
        </div>
      </nav>

      <div className="main">
        <div className="badge">Legal</div>
        <h1>Refund Policy</h1>
        <div className="updated">Last updated: March 1, 2026</div>

        <div className="intro">
          Refunds on SnapReserve™ depend on the cancellation policy chosen by the host for each listing. Always review the cancellation policy on the listing page before booking.
        </div>

        <h2>📋 Cancellation Policies</h2>
        <p>Each listing on SnapReserve™ operates under one of three cancellation policies set by the host:</p>

        <div className="policy-grid">
          <div className="policy-card">
            <div className="policy-name">Flexible</div>
            <div className="policy-title">Full refund up to 24h before</div>
            <div className="policy-rule">✓ Full refund if cancelled 24+ hours before check-in</div>
            <div className="policy-rule">✗ No refund if cancelled within 24 hours of check-in</div>
            <div className="policy-rule">✗ No refund for no-shows</div>
          </div>
          <div className="policy-card">
            <div className="policy-name">Moderate</div>
            <div className="policy-title">Full refund up to 5 days before</div>
            <div className="policy-rule">✓ Full refund if cancelled 5+ days before check-in</div>
            <div className="policy-rule">◑ 50% refund if cancelled 1–5 days before check-in</div>
            <div className="policy-rule">✗ No refund if cancelled within 24 hours of check-in</div>
          </div>
          <div className="policy-card">
            <div className="policy-name">Strict</div>
            <div className="policy-title">50% refund up to 7 days before</div>
            <div className="policy-rule">◑ 50% refund if cancelled 7+ days before check-in</div>
            <div className="policy-rule">✗ No refund if cancelled within 7 days of check-in</div>
            <div className="policy-rule">✗ No refund for no-shows or early departures</div>
          </div>
        </div>

        <h2>🔁 Host-Initiated Cancellations</h2>
        <p>If a host cancels a confirmed booking, the guest is entitled to a full refund of the entire amount paid, including all fees. SnapReserve™ will process this refund automatically within 5–10 business days.</p>

        <h2>⚡ Extenuating Circumstances</h2>
        <p>In exceptional situations — such as natural disasters, government travel restrictions, or serious illness — SnapReserve™ may override the standard cancellation policy and offer a full or partial refund at our discretion. Supporting documentation may be required.</p>
        <div className="highlight">
          <ul>
            <li>Death or serious illness of the guest or an immediate family member</li>
            <li>Government-mandated travel restrictions or border closures</li>
            <li>Declared natural disasters or states of emergency at the destination</li>
            <li>Property rendered uninhabitable due to unforeseen circumstances</li>
          </ul>
        </div>

        <h2>💳 Refund Processing</h2>
        <p>Approved refunds are returned to the original payment method used at the time of booking. Processing times:</p>
        <ul>
          <li><strong>Credit / debit cards:</strong> 5–10 business days</li>
          <li><strong>Digital wallets:</strong> 2–5 business days</li>
        </ul>
        <p>SnapReserve™ does not charge a fee to process refunds. However, your bank or card issuer may have their own processing timelines.</p>

        <h2>🚫 Non-Refundable Fees</h2>
        <p>The following are non-refundable in all circumstances except host-initiated cancellations:</p>
        <ul>
          <li>Guest service fees charged by SnapReserve™</li>
          <li>Any optional add-ons or upgrades purchased separately</li>
        </ul>

        <h2>📞 Requesting a Refund</h2>
        <p>To request a refund, cancel your booking from the Trips section of your account. If you believe you are entitled to a refund outside of the standard policy (e.g. extenuating circumstances), contact our support team within 72 hours of your check-in date with relevant documentation.</p>

        <div className="contact-card">
          <div className="cc-title">Need help with a refund?</div>
          <div className="cc-sub">Our support team responds within 24 hours on business days.</div>
          <a href="mailto:support@snapreserve.app" className="cc-email">support@snapreserve.app</a>
        </div>
      </div>

      <footer className="footer">
        <div className="footer-logo">Snap<span>Reserve™</span></div>
        <div className="footer-links">
          <a href="/coming-soon?page=support">Support</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </div>
        <div style={{fontSize:'0.74rem'}}>© 2026 SnapReserve™ · snapreserve.app</div>
      </footer>
    </>
  )
}
