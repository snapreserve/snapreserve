export const metadata = {
  title: 'Privacy Policy — SnapReserve™',
}

export default function PrivacyPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@700&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:          #0D0D0D;
          --bg2:         #111111;
          --bg3:         #181818;
          --orange:      #E8622A;
          --orange-lt:   #F07D4A;
          --border:      rgba(255,255,255,0.07);
          --text:        #E8E4DF;
          --muted:       #6B6762;
          --subtle:      #2A2A2A;
          --blue:        rgba(96,165,250,0.85);
          --blue-bg:     rgba(96,165,250,0.06);
          --blue-border: rgba(96,165,250,0.2);
        }
        html { scroll-behavior: smooth; }
        body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 15px; line-height: 1.75; }

        /* ── Top Bar ── */
        .topbar { background: var(--bg2); border-bottom: 1px solid var(--border); padding: 14px 40px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
        .logo { font-weight: 700; font-size: 1rem; }
        .logo span { color: var(--orange); }
        .topbar-right { display: flex; align-items: center; gap: 16px; }
        .version-badge { font-family: 'DM Mono', monospace; font-size: 0.7rem; color: var(--muted); background: var(--subtle); border: 1px solid var(--border); border-radius: 6px; padding: 3px 10px; }
        .effective-date { font-size: 0.78rem; color: var(--muted); }

        /* ── Layout ── */
        .layout { display: grid; grid-template-columns: 260px 1fr; max-width: 1100px; margin: 0 auto; gap: 0; align-items: start; }

        /* ── Sidebar ── */
        .sidebar { position: sticky; top: 57px; height: calc(100vh - 57px); overflow-y: auto; padding: 36px 24px 36px 0; border-right: 1px solid var(--border); scrollbar-width: none; }
        .sidebar::-webkit-scrollbar { display: none; }
        .sidebar-title { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 16px; padding-left: 2px; }
        .sidebar-nav { list-style: none; }
        .sidebar-nav li { margin-bottom: 2px; }
        .sidebar-nav a { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px; font-size: 0.8rem; color: var(--muted); text-decoration: none; transition: all 0.15s; line-height: 1.3; }
        .sidebar-nav a:hover { background: rgba(255,255,255,0.04); color: var(--text); }

        /* ── Main Content ── */
        .content { padding: 48px 48px 80px; max-width: 780px; }

        /* Header */
        .doc-header { margin-bottom: 48px; }
        .doc-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--orange); margin-bottom: 10px; }
        .doc-title { font-family: 'Playfair Display', serif; font-size: 2.2rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 16px; }
        .doc-meta { display: flex; flex-wrap: wrap; gap: 20px; padding: 16px 20px; background: var(--bg3); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 24px; }
        .doc-meta-item { font-size: 0.78rem; }
        .doc-meta-item strong { color: var(--text); display: block; font-size: 0.7rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); margin-bottom: 2px; }

        /* Intro card */
        .intro-card { background: var(--blue-bg); border: 1px solid var(--blue-border); border-radius: 12px; padding: 18px 20px; margin-bottom: 40px; font-size: 0.88rem; color: var(--blue); line-height: 1.7; }

        /* Sections */
        .privacy-section { margin-bottom: 44px; scroll-margin-top: 80px; }
        .section-number { font-family: 'DM Mono', monospace; font-size: 0.68rem; color: var(--muted); margin-bottom: 4px; letter-spacing: 0.04em; }
        h2 { font-size: 1.1rem; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 16px; color: var(--text); padding-bottom: 10px; border-bottom: 1px solid var(--border); }
        h3 { font-size: 0.9rem; font-weight: 600; color: var(--text); margin: 20px 0 8px; }
        p { color: rgba(232,228,223,0.8); margin-bottom: 14px; font-size: 0.92rem; }
        ul, ol { padding-left: 20px; margin-bottom: 14px; }
        li { font-size: 0.92rem; color: rgba(232,228,223,0.8); margin-bottom: 6px; line-height: 1.65; }
        strong { color: var(--text); }
        a { color: var(--orange-lt); text-decoration: none; }
        a:hover { text-decoration: underline; }

        /* Highlight box */
        .highlight { background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; margin: 12px 0 16px; }

        /* Contact card */
        .contact-card { background: var(--bg3); border: 1px solid var(--border); border-radius: 16px; padding: 32px; margin-top: 48px; text-align: center; }
        .cc-title { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 700; color: var(--text); margin-bottom: 8px; }
        .cc-sub { font-size: 0.84rem; color: var(--muted); margin-bottom: 20px; }
        .cc-email { display: inline-block; background: var(--orange); color: white; padding: 11px 28px; border-radius: 100px; font-weight: 700; font-size: 0.88rem; text-decoration: none; }
        .cc-email:hover { opacity: 0.9; text-decoration: none; }

        /* Footer */
        .doc-footer { margin-top: 60px; padding-top: 28px; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--muted); line-height: 1.7; }
        .doc-footer strong { color: rgba(232,228,223,0.5); }

        @media (max-width: 768px) {
          .layout { grid-template-columns: 1fr; }
          .sidebar { display: none; }
          .content { padding: 32px 20px 60px; }
          .doc-title { font-size: 1.7rem; }
        }
        @media print {
          .topbar, .sidebar { display: none; }
          .layout { grid-template-columns: 1fr; }
          .content { padding: 0; max-width: 100%; }
          body { background: white; color: black; font-size: 11pt; }
        }
      `}</style>

      {/* TOP BAR */}
      <div className="topbar">
        <div className="logo">Snap<span>Reserve</span>™</div>
        <div className="topbar-right">
          <span className="version-badge">v1.1 — March 2026</span>
          <span className="effective-date">Last updated: March 5, 2026</span>
        </div>
      </div>

      <div className="layout">

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="sidebar-title">Table of Contents</div>
          <ul className="sidebar-nav">
            <li><a href="#collect">1. Information We Collect</a></li>
            <li><a href="#automatic">2. Information Collected Automatically</a></li>
            <li><a href="#use">3. How We Use Your Information</a></li>
            <li><a href="#share">4. How We Share Your Information</a></li>
            <li><a href="#cookies">5. Cookies</a></li>
            <li><a href="#security">6. Data Security</a></li>
            <li><a href="#retention">7. Data Retention</a></li>
            <li><a href="#rights">8. Your Rights</a></li>
            <li><a href="#children">9. Children&apos;s Privacy</a></li>
            <li><a href="#transfers">10. International Transfers</a></li>
            <li><a href="#changes">11. Changes to This Policy</a></li>
            <li><a href="#contact">12. Contact</a></li>
          </ul>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="content">

          {/* Document Header */}
          <div className="doc-header">
            <div className="doc-label">Legal Document</div>
            <h1 className="doc-title">Privacy Policy</h1>
            <div className="doc-meta">
              <div className="doc-meta-item"><strong>Platform</strong>SnapReserve™</div>
              <div className="doc-meta-item"><strong>Version</strong>1.1</div>
              <div className="doc-meta-item"><strong>Last Updated</strong>March 5, 2026</div>
              <div className="doc-meta-item"><strong>Jurisdiction</strong>United States</div>
            </div>
          </div>

          <div className="intro-card">
            At SnapReserve™, we take your privacy seriously. This policy explains what data we collect, how we use it, and your rights as a user of our platform at snapreserve.app.
          </div>

          {/* 1. INFORMATION WE COLLECT */}
          <div className="privacy-section" id="collect">
            <div className="section-number">Section 01</div>
            <h2>Information We Collect</h2>
            <p>We collect information you provide directly to us when you create an account, make a booking, list a property, or contact us for support.</p>
            <div className="highlight">
              <ul>
                <li><strong>Account information:</strong> Full name, email address, and password</li>
                <li><strong>Profile information:</strong> Phone number, profile photo, and host/guest preferences</li>
                <li><strong>Identity documents:</strong> Government-issued ID submitted during host verification</li>
                <li><strong>Booking information:</strong> Check-in/check-out dates, number of guests, and special requests</li>
                <li><strong>Payment information:</strong> Processed securely via Stripe — we do not store card details</li>
                <li><strong>Communications:</strong> Messages exchanged between guests and hosts on our platform</li>
              </ul>
            </div>
          </div>

          {/* 2. AUTOMATICALLY COLLECTED */}
          <div className="privacy-section" id="automatic">
            <div className="section-number">Section 02</div>
            <h2>Information Collected Automatically</h2>
            <p>When you use SnapReserve™, we automatically collect certain technical information to improve our service.</p>
            <ul>
              <li>IP address and device type</li>
              <li>Browser type and version</li>
              <li>Pages visited and time spent on the platform</li>
              <li>Search queries and listing interactions</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </div>

          {/* 3. HOW WE USE */}
          <div className="privacy-section" id="use">
            <div className="section-number">Section 03</div>
            <h2>How We Use Your Information</h2>
            <p>We use the information we collect to operate, improve, and personalise your experience on SnapReserve™.</p>
            <div className="highlight">
              <ul>
                <li>Process bookings and payments</li>
                <li>Facilitate communication between guests and hosts</li>
                <li>Send booking confirmations, receipts, and important updates</li>
                <li>Verify host identity and manage listing approvals</li>
                <li>Provide customer support</li>
                <li>Detect and prevent fraud or abuse</li>
                <li>Comply with legal obligations</li>
                <li>Improve our platform and develop new features</li>
              </ul>
            </div>
          </div>

          {/* 4. HOW WE SHARE */}
          <div className="privacy-section" id="share">
            <div className="section-number">Section 04</div>
            <h2>How We Share Your Information</h2>
            <p>We do not sell your personal information to third parties. We share information only in the following circumstances:</p>
            <ul>
              <li><strong>With other users:</strong> Guest names and basic profile info are shared with hosts upon booking confirmation, and vice versa</li>
              <li><strong>With service providers:</strong> We use Stripe for payments, Supabase for database storage, and Netlify for hosting — all bound by strict data protection agreements</li>
              <li><strong>For legal compliance:</strong> If required by law or to protect the rights and safety of our users</li>
              <li><strong>In connection with a transaction:</strong> If SnapReserve™ is involved in a merger, acquisition, or sale of assets, user data may be transferred as part of that transaction</li>
            </ul>
          </div>

          {/* 5. COOKIES */}
          <div className="privacy-section" id="cookies">
            <div className="section-number">Section 05</div>
            <h2>Cookies</h2>
            <p>SnapReserve™ uses cookies to maintain your session, remember your preferences, and improve platform performance. You can control cookies through your browser settings, though disabling them may affect functionality.</p>
            <p>We may use both session cookies (which expire when you close your browser) and persistent cookies (which remain on your device until deleted or expired) for authentication, security, and analytics purposes.</p>
          </div>

          {/* 6. DATA SECURITY */}
          <div className="privacy-section" id="security">
            <div className="section-number">Section 06</div>
            <h2>Data Security</h2>
            <p>We implement industry-standard security measures to protect your data, including encryption in transit (HTTPS), encrypted at-rest storage, multi-factor authentication for administrative access, and regular security reviews.</p>
            <p>However, no method of transmission over the internet is 100% secure. While we strive to protect your personal information, we cannot guarantee its absolute security.</p>
            <p>To report a security vulnerability or concern, contact us at <a href="mailto:security@snapreserve.app">security@snapreserve.app</a>.</p>
          </div>

          {/* 7. DATA RETENTION */}
          <div className="privacy-section" id="retention">
            <div className="section-number">Section 07</div>
            <h2>Data Retention</h2>
            <p>We retain your personal information for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting us at <a href="mailto:support@snapreserve.app">support@snapreserve.app</a>.</p>
            <p>Certain information may be retained for longer periods where required by law, to resolve disputes, or to enforce our agreements. Identity verification documents are retained only as long as necessary for verification purposes and applicable legal obligations.</p>
          </div>

          {/* 8. YOUR RIGHTS */}
          <div className="privacy-section" id="rights">
            <div className="section-number">Section 08</div>
            <h2>Your Rights</h2>
            <p>Depending on your location, you may have the following rights regarding your personal data:</p>
            <div className="highlight">
              <ul>
                <li><strong>Access:</strong> Request a copy of the data we hold about you</li>
                <li><strong>Correction:</strong> Ask us to correct inaccurate or incomplete data</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                <li><strong>Portability:</strong> Receive your data in a portable, machine-readable format</li>
                <li><strong>Restriction:</strong> Ask us to restrict processing of your data in certain circumstances</li>
                <li><strong>Objection:</strong> Object to how we process your data in certain circumstances</li>
              </ul>
            </div>
            <p>To exercise any of these rights, contact us at <a href="mailto:support@snapreserve.app">support@snapreserve.app</a>. We will respond to your request within 30 days.</p>
          </div>

          {/* 9. CHILDREN'S PRIVACY */}
          <div className="privacy-section" id="children">
            <div className="section-number">Section 09</div>
            <h2>Children&apos;s Privacy</h2>
            <p>SnapReserve™ is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with their information, please contact us immediately at <a href="mailto:support@snapreserve.app">support@snapreserve.app</a> and we will promptly delete such data.</p>
          </div>

          {/* 10. INTERNATIONAL TRANSFERS */}
          <div className="privacy-section" id="transfers">
            <div className="section-number">Section 10</div>
            <h2>International Transfers</h2>
            <p>SnapReserve™ is based in the United States. If you access our platform from outside the US, your data may be transferred to and processed in the United States, where data protection laws may differ from those in your country.</p>
            <p>By using SnapReserve™, you consent to the transfer of your data to the United States and to its processing in accordance with this Privacy Policy.</p>
          </div>

          {/* 11. CHANGES */}
          <div className="privacy-section" id="changes">
            <div className="section-number">Section 11</div>
            <h2>Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any significant changes by email or by posting a prominent notice on our platform, and we will update the "Last Updated" date at the top of this page.</p>
            <p>Your continued use of SnapReserve™ after changes take effect constitutes acceptance of the updated policy.</p>
          </div>

          {/* 12. CONTACT */}
          <div className="privacy-section" id="contact">
            <div className="section-number">Section 12</div>
            <h2>Contact</h2>
            <p>If you have questions about this Privacy Policy or how we handle your data, please contact us at:</p>
            <p>
              <strong>SnapReserve™</strong><br />
              <a href="mailto:support@snapreserve.app">support@snapreserve.app</a><br />
              snapreserve.app
            </p>
          </div>

          <div className="contact-card">
            <div className="cc-title">Questions about your privacy?</div>
            <div className="cc-sub">Our team is here to help. Reach out any time.</div>
            <a href="mailto:support@snapreserve.app" className="cc-email">support@snapreserve.app</a>
          </div>

          {/* Footer */}
          <div className="doc-footer">
            <p>© 2026 <strong>SnapReserve™</strong>. All rights reserved. This Privacy Policy governs your use of the SnapReserve™ platform at snapreserve.app.</p>
            <p style={{ marginTop: '8px' }}>Also see: <a href="/terms">Terms of Service</a> · <a href="/coming-soon?page=support">Support</a></p>
          </div>

        </main>
      </div>
    </>
  )
}
