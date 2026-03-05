export default function TermsPage() {
  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: #FAF8F5; color: #1A1410; }
        .nav { display: flex; align-items: center; justify-content: space-between; padding: 0 48px; height: 68px; background: white; border-bottom: 1px solid #E8E2D9; position: sticky; top: 0; z-index: 100; }
        .logo { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 900; text-decoration: none; color: #1A1410; }
        .logo span { color: #F4601A; }
        .main { max-width: 760px; margin: 0 auto; padding: 56px 48px 80px; }
        .badge { display: inline-block; background: rgba(244,96,26,0.08); border: 1px solid rgba(244,96,26,0.2); border-radius: 100px; padding: 5px 14px; font-size: 0.72rem; font-weight: 700; color: #F4601A; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; }
        h1 { font-family: 'Playfair Display', serif; font-size: 2.4rem; font-weight: 700; margin-bottom: 8px; line-height: 1.2; }
        .updated { font-size: 0.82rem; color: #A89880; margin-bottom: 40px; }
        .intro { font-size: 1rem; color: #4A3F35; line-height: 1.8; margin-bottom: 40px; padding: 20px 24px; background: white; border-radius: 16px; border: 1px solid #E8E2D9; }
        h2 { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700; margin: 36px 0 12px; color: #1A1410; display: flex; align-items: center; gap: 8px; }
        p { font-size: 0.9rem; color: #4A3F35; line-height: 1.8; margin-bottom: 12px; }
        ul { padding-left: 20px; margin-bottom: 12px; }
        ul li { font-size: 0.9rem; color: #4A3F35; line-height: 1.8; margin-bottom: 4px; }
        .highlight { background: white; border: 1px solid #E8E2D9; border-radius: 12px; padding: 16px 20px; margin: 16px 0; }
        .contact-card { background: #1A1410; border-radius: 20px; padding: 32px; margin-top: 48px; text-align: center; }
        .cc-title { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700; color: white; margin-bottom: 8px; }
        .cc-sub { font-size: 0.86rem; color: rgba(255,255,255,0.5); margin-bottom: 20px; }
        .cc-email { display: inline-block; background: #F4601A; color: white; padding: 12px 28px; border-radius: 100px; font-weight: 700; font-size: 0.9rem; text-decoration: none; }
        .footer { background: #1A1410; color: #A89880; padding: 32px 48px; display: flex; align-items: center; justify-content: space-between; margin-top: 80px; }
        .footer-logo { font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: #F5EFE8; }
        .footer-logo span { color: #F4601A; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { font-size: 0.8rem; color: #A89880; text-decoration: none; }
        @media (max-width: 768px) { .main, .nav, .footer { padding-left: 20px; padding-right: 20px; } h1 { font-size: 1.8rem; } }
      `}</style>

      <nav className="nav">
        <a href="/" className="logo">Snap<span>Reserve™</span></a>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/login" style={{padding:'8px 20px',borderRadius:'100px',fontSize:'0.84rem',fontWeight:'700',border:'1px solid #D4CEC5',color:'#1A1410',textDecoration:'none'}}>Log in</a>
          <a href="/signup" style={{padding:'8px 20px',borderRadius:'100px',fontSize:'0.84rem',fontWeight:'700',background:'#F4601A',color:'white',textDecoration:'none'}}>Sign up</a>
        </div>
      </nav>

      <div className="main">
        <div className="badge">Legal</div>
        <h1>Terms of Service</h1>
        <div className="updated">Last updated: March 1, 2026</div>

        <div className="intro">
          By accessing or using SnapReserve™ at snapreserve.app, you agree to be bound by these Terms of Service. Please read them carefully before using our platform.
        </div>

        <h2>📌 Acceptance of Terms</h2>
        <p>These Terms of Service ("Terms") govern your use of the SnapReserve™ platform, including all features, content, and services offered at snapreserve.app. By creating an account or making a booking, you agree to these Terms in full.</p>
        <p>If you do not agree with any part of these Terms, you must not use our platform.</p>

        <h2>👤 Eligibility</h2>
        <p>You must be at least 18 years old to use SnapReserve™. By using our platform, you represent and warrant that you meet this age requirement and have the legal capacity to enter into a binding agreement.</p>

        <h2>🏠 Platform Role</h2>
        <p>SnapReserve™ is a marketplace that connects hosts and guests. SnapReserve™ does not own, operate, manage, or control any properties listed on the platform. We are not a party to any rental agreement between guests and hosts, and we make no representations about the quality, safety, or legality of any listed property.</p>
        <div className="highlight">
          <ul>
            <li>Hosts are solely responsible for the accuracy of their listings and the condition of their properties</li>
            <li>Guests are responsible for reviewing listing details, house rules, and cancellation policies before booking</li>
            <li>SnapReserve™ facilitates the transaction but does not guarantee the quality or safety of any property</li>
            <li>Hosts are responsible for maintaining appropriate insurance coverage for their property and complying with all applicable local laws and regulations</li>
          </ul>
        </div>

        <h2>📝 Accounts</h2>
        <p>You are responsible for maintaining the security of your account and all activity that occurs under it. You must notify us immediately of any unauthorised use. We reserve the right to suspend or terminate accounts that violate these Terms.</p>

        <h2>💳 Payments & Fees</h2>
        <p>All payments are processed securely through Stripe. By making a booking, you authorise SnapReserve™ to charge the listed amount to your payment method. SnapReserve™ charges a guest service fee on each booking, displayed transparently at checkout.</p>
        <div className="highlight">
          <ul>
            <li>Guest service fee: displayed at checkout (varies by booking value)</li>
            <li>Host service fee: 3.2% of the booking subtotal</li>
            <li>All fees are non-refundable unless the host cancels the booking</li>
          </ul>
        </div>

        <h2>❌ Cancellations</h2>
        <p>Cancellation terms depend on the policy set by the host for each listing (Flexible, Moderate, or Strict). Refunds are calculated in accordance with the applicable cancellation policy and our <a href="/refund-policy" style={{color:'#F4601A',fontWeight:600}}>Refund Policy</a>.</p>

        <h2>🚫 Prohibited Conduct</h2>
        <p>You agree not to use SnapReserve™ for any unlawful or abusive purpose. Prohibited activities include:</p>
        <ul>
          <li>Listing properties you do not have the right to rent</li>
          <li>Providing false or misleading information in listings or reviews</li>
          <li>Harassing, threatening, or discriminating against other users</li>
          <li>Circumventing the platform to complete bookings off-platform</li>
          <li>Attempting to access other users' accounts or our systems without authorisation</li>
        </ul>

        <h2>⭐ Reviews</h2>
        <p>Guests and hosts may leave reviews after a completed stay. Reviews must be honest, accurate, and respectful. SnapReserve™ reserves the right to remove reviews that violate our community guidelines.</p>

        <h2>📷 Intellectual Property</h2>
        <p>All content on SnapReserve™ — including logos, design, and software — is the property of SnapReserve™ or its licensors. By uploading listing photos or other content, you grant us a non-exclusive, worldwide licence to display that content on the platform.</p>

        <h2>⚖️ Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, SnapReserve™ shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform, including but not limited to property damage, personal injury, or financial loss resulting from a booking.</p>

        <h2>🔄 Changes to These Terms</h2>
        <p>We may update these Terms from time to time. Continued use of the platform after changes take effect constitutes your acceptance of the updated Terms. We will provide reasonable notice of material changes.</p>

        <h2>🌍 Governing Law</h2>
        <p>These Terms are governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.</p>

        <div className="contact-card">
          <div className="cc-title">Questions about our Terms?</div>
          <div className="cc-sub">Our legal team is happy to help clarify anything.</div>
          <a href="mailto:legal@snapreserve.app" className="cc-email">legal@snapreserve.app</a>
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
