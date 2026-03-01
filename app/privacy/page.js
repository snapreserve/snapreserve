export default function PrivacyPage() {
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
        <h1>Privacy Policy</h1>
        <div className="updated">Last updated: March 1, 2026</div>

        <div className="intro">
          At SnapReserve™, we take your privacy seriously. This policy explains what data we collect, how we use it, and your rights as a user of our platform at snapreserve.app.
        </div>

        <h2>📋 Information We Collect</h2>
        <p>We collect information you provide directly to us when you create an account, make a booking, list a property, or contact us for support.</p>
        <div className="highlight">
          <ul>
            <li><strong>Account information:</strong> Full name, email address, and password</li>
            <li><strong>Profile information:</strong> Phone number, profile photo, and host/guest preferences</li>
            <li><strong>Booking information:</strong> Check-in/check-out dates, number of guests, and special requests</li>
            <li><strong>Payment information:</strong> Processed securely via Stripe — we do not store card details</li>
            <li><strong>Communications:</strong> Messages exchanged between guests and hosts on our platform</li>
          </ul>
        </div>

        <h2>📍 Information Collected Automatically</h2>
        <p>When you use SnapReserve™, we automatically collect certain technical information to improve our service.</p>
        <ul>
          <li>IP address and device type</li>
          <li>Browser type and version</li>
          <li>Pages visited and time spent on the platform</li>
          <li>Search queries and listing interactions</li>
          <li>Cookies and similar tracking technologies</li>
        </ul>

        <h2>🔒 How We Use Your Information</h2>
        <p>We use the information we collect to operate, improve, and personalise your experience on SnapReserve™.</p>
        <div className="highlight">
          <ul>
            <li>Process bookings and payments</li>
            <li>Facilitate communication between guests and hosts</li>
            <li>Send booking confirmations, receipts, and important updates</li>
            <li>Provide customer support</li>
            <li>Detect and prevent fraud or abuse</li>
            <li>Comply with legal obligations</li>
            <li>Improve our platform and develop new features</li>
          </ul>
        </div>

        <h2>🤝 How We Share Your Information</h2>
        <p>We do not sell your personal information to third parties. We share information only in the following circumstances:</p>
        <ul>
          <li><strong>With other users:</strong> Guest names and basic profile info are shared with hosts upon booking confirmation, and vice versa</li>
          <li><strong>With service providers:</strong> We use Stripe for payments, Supabase for database, and Netlify for hosting — all bound by strict data agreements</li>
          <li><strong>For legal compliance:</strong> If required by law or to protect the rights and safety of our users</li>
        </ul>

        <h2>🍪 Cookies</h2>
        <p>SnapReserve™ uses cookies to maintain your session, remember your preferences, and improve platform performance. You can control cookies through your browser settings, though disabling them may affect functionality.</p>

        <h2>🔐 Data Security</h2>
        <p>We implement industry-standard security measures to protect your data, including encryption in transit (HTTPS), encrypted storage, and regular security audits. However, no method of transmission over the internet is 100% secure.</p>

        <h2>📅 Data Retention</h2>
        <p>We retain your personal information for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting us at privacy@snapreserve.co.</p>

        <h2>👤 Your Rights</h2>
        <p>Depending on your location, you may have the following rights regarding your personal data:</p>
        <div className="highlight">
          <ul>
            <li><strong>Access:</strong> Request a copy of the data we hold about you</li>
            <li><strong>Correction:</strong> Ask us to correct inaccurate or incomplete data</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data</li>
            <li><strong>Portability:</strong> Receive your data in a portable format</li>
            <li><strong>Objection:</strong> Object to how we process your data in certain circumstances</li>
          </ul>
        </div>

        <h2>👶 Children's Privacy</h2>
        <p>SnapReserve™ is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with their information, please contact us immediately.</p>

        <h2>🌍 International Transfers</h2>
        <p>SnapReserve™ is based in the United States. If you access our platform from outside the US, your data may be transferred to and processed in the United States, where data protection laws may differ from those in your country.</p>

        <h2>📝 Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of any significant changes by email or by posting a prominent notice on our platform. Your continued use of SnapReserve™ after changes take effect constitutes acceptance of the updated policy.</p>

        <div className="contact-card">
          <div className="cc-title">Questions about your privacy?</div>
          <div className="cc-sub">Our team is here to help. Reach out any time.</div>
          <a href="mailto:privacy@snapreserve.co" className="cc-email">privacy@snapreserve.co</a>
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