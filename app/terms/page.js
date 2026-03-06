export const metadata = {
  title: 'Terms of Service — SnapReserve™',
}

export default function TermsPage() {
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
          --new:         rgba(52,211,153,0.12);
          --new-border:  rgba(52,211,153,0.25);
          --new-text:    #34d399;
          --mod:         rgba(251,191,36,0.08);
          --mod-border:  rgba(251,191,36,0.25);
          --mod-text:    #fbbf24;
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
        .sidebar-nav a.new-section::after { content: 'NEW'; font-size: 0.55rem; font-weight: 700; letter-spacing: 0.08em; background: var(--new); color: var(--new-text); border: 1px solid var(--new-border); border-radius: 4px; padding: 1px 5px; margin-left: auto; flex-shrink: 0; }
        .sidebar-nav a.mod-section::after { content: 'UPDATED'; font-size: 0.55rem; font-weight: 700; letter-spacing: 0.08em; background: var(--mod); color: var(--mod-text); border: 1px solid var(--mod-border); border-radius: 4px; padding: 1px 5px; margin-left: auto; flex-shrink: 0; }

        /* ── Main Content ── */
        .content { padding: 48px 48px 80px; max-width: 780px; }

        /* Header */
        .doc-header { margin-bottom: 48px; }
        .doc-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--orange); margin-bottom: 10px; }
        .doc-title { font-family: 'Playfair Display', serif; font-size: 2.2rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 16px; }
        .doc-meta { display: flex; flex-wrap: wrap; gap: 20px; padding: 16px 20px; background: var(--bg3); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 24px; }
        .doc-meta-item { font-size: 0.78rem; }
        .doc-meta-item strong { color: var(--text); display: block; font-size: 0.7rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); margin-bottom: 2px; }

        /* Change legend */
        .change-legend { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 36px; padding: 14px 16px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 10px; font-size: 0.75rem; color: var(--muted); align-items: center; }
        .change-legend strong { color: var(--text); font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase; margin-right: 4px; }
        .legend-new { color: var(--new-text); }
        .legend-mod { color: var(--mod-text); }

        /* Sections */
        .tos-section { margin-bottom: 44px; scroll-margin-top: 80px; }
        .section-number { font-family: 'DM Mono', monospace; font-size: 0.68rem; color: var(--muted); margin-bottom: 4px; letter-spacing: 0.04em; }
        h2 { font-size: 1.1rem; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 16px; color: var(--text); padding-bottom: 10px; border-bottom: 1px solid var(--border); }
        h3 { font-size: 0.9rem; font-weight: 600; color: var(--text); margin: 20px 0 8px; }
        p { color: rgba(232,228,223,0.8); margin-bottom: 14px; font-size: 0.92rem; }
        ul, ol { padding-left: 20px; margin-bottom: 14px; }
        li { font-size: 0.92rem; color: rgba(232,228,223,0.8); margin-bottom: 6px; line-height: 1.65; }
        a { color: var(--orange-lt); text-decoration: none; }
        a:hover { text-decoration: underline; }

        /* Tags */
        .tag-new { display: inline-flex; align-items: center; gap: 5px; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--new-text); background: var(--new); border: 1px solid var(--new-border); border-radius: 5px; padding: 2px 8px; margin-left: 10px; vertical-align: middle; position: relative; top: -2px; }
        .tag-updated { display: inline-flex; align-items: center; gap: 5px; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mod-text); background: var(--mod); border: 1px solid var(--mod-border); border-radius: 5px; padding: 2px 8px; margin-left: 10px; vertical-align: middle; position: relative; top: -2px; }

        /* Callout boxes */
        .new-section-box { background: var(--new); border: 1px solid var(--new-border); border-left: 3px solid var(--new-text); border-radius: 0 10px 10px 0; padding: 16px 20px; margin-bottom: 16px; font-size: 0.8rem; color: rgba(52,211,153,0.9); }
        .new-section-box strong { color: var(--new-text); }
        .mod-section-box { background: var(--mod); border: 1px solid var(--mod-border); border-left: 3px solid var(--mod-text); border-radius: 0 10px 10px 0; padding: 12px 16px; margin-bottom: 16px; font-size: 0.78rem; color: rgba(251,191,36,0.85); }

        /* Fee table */
        .fee-table { width: 100%; border-collapse: collapse; margin: 16px 0 20px; font-size: 0.85rem; }
        .fee-table th { text-align: left; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); padding: 8px 14px; border-bottom: 1px solid var(--border); }
        .fee-table td { padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); color: rgba(232,228,223,0.85); vertical-align: top; }
        .fee-table tr:last-child td { border-bottom: none; }
        .fee-table tr:hover td { background: rgba(255,255,255,0.02); }
        .fee-highlight { font-family: 'DM Mono', monospace; font-size: 0.9rem; font-weight: 500; color: var(--orange-lt); }
        .fee-founder { font-family: 'DM Mono', monospace; font-size: 0.9rem; font-weight: 500; color: #34d399; }
        .fee-badge { display: inline-block; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 7px; border-radius: 4px; margin-left: 6px; }
        .fee-badge-founder { background: rgba(52,211,153,0.1); color: #34d399; border: 1px solid rgba(52,211,153,0.2); }
        .fee-badge-standard { background: rgba(232,98,42,0.1); color: var(--orange-lt); border: 1px solid rgba(232,98,42,0.2); }

        /* Beta notice */
        .beta-notice { display: flex; gap: 12px; align-items: flex-start; background: rgba(96,165,250,0.06); border: 1px solid rgba(96,165,250,0.2); border-radius: 10px; padding: 16px 18px; margin-bottom: 20px; font-size: 0.82rem; color: rgba(96,165,250,0.85); line-height: 1.6; }
        .beta-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 1px; }

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
          <span className="version-badge">v2.0 — March 2026</span>
          <span className="effective-date">Effective: March 5, 2026</span>
        </div>
      </div>

      <div className="layout">

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="sidebar-title">Table of Contents</div>
          <ul className="sidebar-nav">
            <li><a href="#acceptance">1. Acceptance of Terms</a></li>
            <li><a href="#beta" className="new-section">2. Beta Platform Notice</a></li>
            <li><a href="#eligibility">3. Eligibility</a></li>
            <li><a href="#accounts">4. User Accounts</a></li>
            <li><a href="#listings" className="mod-section">5. Listings &amp; Approval</a></li>
            <li><a href="#identity" className="new-section">6. Identity Verification</a></li>
            <li><a href="#fees" className="mod-section">7. Fees &amp; Payments</a></li>
            <li><a href="#payouts" className="new-section">8. Host Payout Policy</a></li>
            <li><a href="#taxes" className="new-section">9. Taxes</a></li>
            <li><a href="#reviews" className="mod-section">10. Reviews</a></li>
            <li><a href="#conduct">11. Prohibited Conduct</a></li>
            <li><a href="#ip">12. Intellectual Property</a></li>
            <li><a href="#privacy">13. Privacy</a></li>
            <li><a href="#disclaimers">14. Disclaimers</a></li>
            <li><a href="#liability">15. Limitation of Liability</a></li>
            <li><a href="#indemnification">16. Indemnification</a></li>
            <li><a href="#governing">17. Governing Law</a></li>
            <li><a href="#changes">18. Changes to Terms</a></li>
            <li><a href="#contact">19. Contact</a></li>
          </ul>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="content">

          {/* Document Header */}
          <div className="doc-header">
            <div className="doc-label">Legal Document</div>
            <h1 className="doc-title">Terms of Service</h1>
            <div className="doc-meta">
              <div className="doc-meta-item"><strong>Platform</strong>SnapReserve™</div>
              <div className="doc-meta-item"><strong>Version</strong>2.0</div>
              <div className="doc-meta-item"><strong>Effective Date</strong>March 5, 2026</div>
              <div className="doc-meta-item"><strong>Governing Law</strong>State of Delaware, USA</div>
            </div>
            <div className="change-legend">
              <strong>Change Log v2.0:</strong>
              <span className="legend-new">● New sections added</span>
              <span className="legend-mod">● Existing sections updated</span>
              &nbsp;— All other sections remain unchanged.
            </div>
          </div>

          {/* 1. ACCEPTANCE */}
          <div className="tos-section" id="acceptance">
            <div className="section-number">Section 01</div>
            <h2>Acceptance of Terms</h2>
            <p>By accessing or using the SnapReserve™ platform, website, or any associated services (collectively, the "Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Platform.</p>
            <p>These Terms constitute a legally binding agreement between you and SnapReserve™ ("we," "us," or "our"). You represent that you have the legal authority to enter into this agreement.</p>
          </div>

          {/* 2. BETA PLATFORM NOTICE */}
          <div className="tos-section" id="beta">
            <div className="section-number">Section 02</div>
            <h2>Beta Platform Notice <span className="tag-new">New</span></h2>
            <div className="new-section-box">
              <strong>New section added in v2.0</strong> — This section discloses the early-access nature of the Platform.
            </div>
            <div className="beta-notice">
              <div className="beta-icon">🚧</div>
              <div>SnapReserve™ may operate in an early-access or beta phase. During this period, certain features, policies, fees, and functionality may be incomplete, subject to change, or temporarily unavailable as the Platform evolves.</div>
            </div>
            <p>By using the Platform during this phase, you acknowledge and agree that:</p>
            <ul>
              <li>Features and functionality may be added, modified, or removed at any time without prior notice.</li>
              <li>Platform performance, availability, and reliability may vary during the early-access period.</li>
              <li>SnapReserve™ reserves the right to adjust platform policies, pricing structures, and terms as the Platform develops.</li>
              <li>Early access does not create any entitlement to specific features, pricing, or service levels beyond what is expressly stated in these Terms.</li>
            </ul>
            <p>SnapReserve™ will make reasonable efforts to communicate material changes to users in a timely manner.</p>
          </div>

          {/* 3. ELIGIBILITY */}
          <div className="tos-section" id="eligibility">
            <div className="section-number">Section 03</div>
            <h2>Eligibility</h2>
            <p>You must be at least 18 years of age to use the Platform. By using SnapReserve™, you represent and warrant that you meet this requirement and that all information you provide is accurate, current, and complete.</p>
          </div>

          {/* 4. ACCOUNTS */}
          <div className="tos-section" id="accounts">
            <div className="section-number">Section 04</div>
            <h2>User Accounts</h2>
            <p>To access certain features of the Platform, you may be required to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</p>
            <p>You agree to notify SnapReserve™ immediately of any unauthorized use of your account. SnapReserve™ will not be liable for any loss arising from unauthorized use of your account.</p>
          </div>

          {/* 5. LISTINGS */}
          <div className="tos-section" id="listings">
            <div className="section-number">Section 05</div>
            <h2>Listings &amp; Listing Approval Policy <span className="tag-updated">Updated</span></h2>
            <div className="mod-section-box">Updated in v2.0 — Listing Approval Policy added.</div>
            <p>Hosts may list properties on SnapReserve™ subject to these Terms and any applicable platform guidelines. Hosts are solely responsible for the accuracy, legality, and completeness of their listing content, including descriptions, photos, pricing, and availability.</p>
            <h3>Listing Approval</h3>
            <p>All listings submitted by hosts are subject to review by SnapReserve™ administrators prior to being made publicly visible on the Platform. Listings must meet SnapReserve™'s quality, safety, and content standards to be approved.</p>
            <ul>
              <li>SnapReserve™ reserves the right to approve, reject, or request modifications to any listing at its sole discretion.</li>
              <li>A listing will not go live on the Platform until it has been reviewed and approved by a SnapReserve™ administrator.</li>
              <li>SnapReserve™ may remove or suspend any listing that violates these Terms or platform guidelines at any time without prior notice.</li>
              <li>Submission of a listing does not guarantee approval or publication on the Platform.</li>
            </ul>
          </div>

          {/* 6. IDENTITY VERIFICATION */}
          <div className="tos-section" id="identity">
            <div className="section-number">Section 06</div>
            <h2>Identity Verification <span className="tag-new">New</span></h2>
            <div className="new-section-box">
              <strong>New section added in v2.0</strong> — Establishes SnapReserve™'s right to request identity verification.
            </div>
            <p>To maintain platform safety and trust, SnapReserve™ may request identity verification from hosts, guests, or both at any time. This may include, but is not limited to:</p>
            <ul>
              <li>Government-issued photo identification</li>
              <li>Address verification</li>
              <li>Business registration documentation (for commercial hosts)</li>
              <li>Additional background or screening checks as required by applicable law or platform policy</li>
            </ul>
            <p>Failure to complete a requested identity verification process may result in restricted access to the Platform, suspension of listings, or termination of your account. SnapReserve™ will handle all verification documents in accordance with its <a href="#privacy">Privacy Policy</a>.</p>
          </div>

          {/* 7. FEES */}
          <div className="tos-section" id="fees">
            <div className="section-number">Section 07</div>
            <h2>Fees &amp; Payments <span className="tag-updated">Updated</span></h2>
            <div className="mod-section-box">Updated in v2.0 — Fee structure revised. Standard host fee and Founder Host Program pricing added.</div>
            <p>SnapReserve™ charges service fees to facilitate transactions between hosts and guests on the Platform. All fees are automatically deducted from the booking subtotal prior to host payouts.</p>
            <h3>Platform Fee Structure</h3>
            <table className="fee-table">
              <thead>
                <tr>
                  <th>Host Type</th>
                  <th>Platform Fee</th>
                  <th>Per Booking Fee</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Standard Host <span className="fee-badge fee-badge-standard">Default</span></td>
                  <td><span className="fee-highlight">7%</span> of booking subtotal</td>
                  <td><span className="fee-highlight">$1.00</span></td>
                  <td>Applied to all eligible bookings</td>
                </tr>
                <tr>
                  <td>Founder Host <span className="fee-badge fee-badge-founder">Program</span></td>
                  <td><span className="fee-founder">6.5%</span> of booking subtotal</td>
                  <td><span className="fee-founder">$1.00</span></td>
                  <td>Available to eligible Founder Hosts only</td>
                </tr>
              </tbody>
            </table>
            <h3>Founder Host Program</h3>
            <p>Eligible Founder Hosts accepted into the SnapReserve™ Founder Host Program may receive a reduced platform fee of <strong>6.5% of the booking subtotal plus $1.00 per booking</strong>. Founder Host pricing is subject to eligibility requirements and program terms as determined by SnapReserve™.</p>
            <p>Participation in the Founder Host Program does not guarantee specific pricing terms in perpetuity. Pricing, features, and program terms may be adjusted over time in accordance with Section 2 (Beta Platform Notice) and Section 18 (Changes to Terms).</p>
            <h3>Payment Processing</h3>
            <p>All fees described above represent SnapReserve™ platform fees only. Payment processing fees charged by third-party payment processors (including but not limited to Stripe) may apply separately and are not included in the platform fee amounts stated above.</p>
            <p>SnapReserve™ reserves the right to modify its fee structure upon reasonable notice to users.</p>
          </div>

          {/* 8. HOST PAYOUT POLICY */}
          <div className="tos-section" id="payouts">
            <div className="section-number">Section 08</div>
            <h2>Host Payout Policy <span className="tag-new">New</span></h2>
            <div className="new-section-box">
              <strong>New section added in v2.0</strong> — Establishes how and when hosts receive payouts.
            </div>
            <p>SnapReserve™ facilitates host payouts through Stripe connected accounts. Hosts must complete Stripe's onboarding process and maintain a valid, active Stripe connected account to receive payouts through the Platform.</p>
            <h3>Payout Timing</h3>
            <p>Host payouts are processed after check-in or after the reservation period has begun, subject to any applicable hold periods or dispute resolution processes. SnapReserve™ does not guarantee specific payout timing and reserves the right to delay payouts in cases of suspected fraud, disputes, or required investigations.</p>
            <h3>Payout Calculation</h3>
            <p>Host payouts are calculated as the booking subtotal minus applicable SnapReserve™ platform fees and any third-party payment processing fees. SnapReserve™ will provide hosts with a breakdown of applicable deductions for each transaction.</p>
            <h3>Host Responsibilities</h3>
            <ul>
              <li>Hosts are responsible for maintaining accurate and current payout account information.</li>
              <li>SnapReserve™ is not responsible for delays or failures in payout processing caused by inaccurate account information provided by the host.</li>
              <li>Hosts are solely responsible for any fees or charges imposed by their financial institution in connection with receiving payouts.</li>
            </ul>
          </div>

          {/* 9. TAXES */}
          <div className="tos-section" id="taxes">
            <div className="section-number">Section 09</div>
            <h2>Taxes <span className="tag-new">New</span></h2>
            <div className="new-section-box">
              <strong>New section added in v2.0</strong> — Establishes tax responsibilities for hosts.
            </div>
            <p>Hosts using the SnapReserve™ Platform are solely responsible for determining and complying with all applicable tax obligations arising from their use of the Platform, including but not limited to the following:</p>
            <ul>
              <li>Lodging taxes</li>
              <li>Occupancy taxes</li>
              <li>Sales or value-added taxes</li>
              <li>Income taxes applicable to rental earnings</li>
              <li>Any other taxes, levies, or duties imposed by federal, state, or local authorities</li>
            </ul>
            <p><strong>SnapReserve™ does not collect, withhold, or remit taxes on behalf of hosts at this time.</strong> Hosts are solely responsible for collecting any applicable taxes from guests, reporting such taxes to the appropriate taxing authorities, and remitting all required tax payments in accordance with applicable law.</p>
            <p>SnapReserve™ recommends that hosts consult a qualified tax professional to understand their specific tax obligations. SnapReserve™ shall not be liable for any taxes, penalties, or interest arising from a host's failure to comply with applicable tax laws.</p>
          </div>

          {/* 10. REVIEWS */}
          <div className="tos-section" id="reviews">
            <div className="section-number">Section 10</div>
            <h2>Reviews <span className="tag-updated">Updated</span></h2>
            <div className="mod-section-box">Updated in v2.0 — Review moderation rights clarified.</div>
            <p>SnapReserve™ may allow guests and hosts to leave reviews of each other and of listings following a completed reservation. Reviews must be honest, accurate, and comply with SnapReserve™'s content guidelines.</p>
            <h3>Review Moderation</h3>
            <p>SnapReserve™ reserves the right, at its sole discretion, to moderate, edit, or permanently remove any review that:</p>
            <ul>
              <li>Contains false, misleading, or defamatory statements</li>
              <li>Includes discriminatory, hateful, or offensive language</li>
              <li>Violates any applicable law or third-party rights</li>
              <li>Contains personal information or confidential details</li>
              <li>Is determined to be fraudulent, incentivized, or otherwise in violation of platform rules</li>
              <li>Otherwise violates these Terms or SnapReserve™'s community guidelines</li>
            </ul>
            <p>SnapReserve™ does not guarantee that all reviews will be displayed, and the removal of a review does not constitute an endorsement of the subject of that review. Users who submit reviews that violate these Terms may have their account suspended or terminated.</p>
          </div>

          {/* 11. PROHIBITED CONDUCT */}
          <div className="tos-section" id="conduct">
            <div className="section-number">Section 11</div>
            <h2>Prohibited Conduct</h2>
            <p>You agree not to engage in any of the following prohibited activities when using the Platform:</p>
            <ul>
              <li>Violating any applicable local, state, national, or international law or regulation</li>
              <li>Submitting false, misleading, or fraudulent information</li>
              <li>Harassing, threatening, or intimidating other users</li>
              <li>Attempting to circumvent SnapReserve™'s fee structure or payment systems</li>
              <li>Scraping, crawling, or otherwise harvesting data from the Platform without authorization</li>
              <li>Introducing malicious code, viruses, or other harmful software to the Platform</li>
              <li>Using the Platform for any unlawful or unauthorized purpose</li>
            </ul>
          </div>

          {/* 12. INTELLECTUAL PROPERTY */}
          <div className="tos-section" id="ip">
            <div className="section-number">Section 12</div>
            <h2>Intellectual Property</h2>
            <p>All content, trademarks, logos, and intellectual property on the Platform, including the SnapReserve™ name and mark, are owned by or licensed to SnapReserve™. You may not use, reproduce, or distribute any Platform content without express written permission from SnapReserve™.</p>
            <p>By submitting content to the Platform (including listing photos, descriptions, and reviews), you grant SnapReserve™ a non-exclusive, royalty-free, worldwide license to use, display, and distribute such content in connection with the operation of the Platform.</p>
          </div>

          {/* 13. PRIVACY */}
          <div className="tos-section" id="privacy">
            <div className="section-number">Section 13</div>
            <h2>Privacy</h2>
            <p>Your use of the Platform is subject to SnapReserve™'s Privacy Policy, which is incorporated into these Terms by reference. By using the Platform, you consent to the collection, use, and disclosure of your information as described in the Privacy Policy.</p>
          </div>

          {/* 14. DISCLAIMERS */}
          <div className="tos-section" id="disclaimers">
            <div className="section-number">Section 14</div>
            <h2>Disclaimers</h2>
            <p>The Platform is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied. SnapReserve™ does not warrant that the Platform will be uninterrupted, error-free, or free of viruses or other harmful components.</p>
            <p>SnapReserve™ is a marketplace platform and is not a party to agreements between hosts and guests. SnapReserve™ does not endorse or guarantee any listing, host, or guest on the Platform.</p>
          </div>

          {/* 15. LIMITATION OF LIABILITY */}
          <div className="tos-section" id="liability">
            <div className="section-number">Section 15</div>
            <h2>Limitation of Liability</h2>
            <p>To the fullest extent permitted by applicable law, SnapReserve™ shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Platform, even if SnapReserve™ has been advised of the possibility of such damages.</p>
            <p>SnapReserve™'s total liability to you for any claim arising from or related to these Terms or the Platform shall not exceed the fees paid by you to SnapReserve™ in the twelve (12) months preceding the claim.</p>
          </div>

          {/* 16. INDEMNIFICATION */}
          <div className="tos-section" id="indemnification">
            <div className="section-number">Section 16</div>
            <h2>Indemnification</h2>
            <p>You agree to indemnify, defend, and hold harmless SnapReserve™ and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising from your use of the Platform, your violation of these Terms, or your violation of any rights of another party.</p>
          </div>

          {/* 17. GOVERNING LAW */}
          <div className="tos-section" id="governing">
            <div className="section-number">Section 17</div>
            <h2>Governing Law</h2>
            <p>These Terms are governed by and construed in accordance with the laws of the United States and the State of Delaware, without regard to conflict of law principles. Any dispute arising from or related to these Terms or the Platform shall be subject to the exclusive jurisdiction of the state and federal courts located in the State of Delaware.</p>
          </div>

          {/* 18. CHANGES */}
          <div className="tos-section" id="changes">
            <div className="section-number">Section 18</div>
            <h2>Changes to Terms</h2>
            <p>SnapReserve™ reserves the right to modify these Terms at any time. We will provide notice of material changes by updating the "Effective Date" at the top of this page and, where appropriate, by notifying users via email or Platform notification. Your continued use of the Platform following the posting of revised Terms constitutes your acceptance of those changes.</p>
          </div>

          {/* 19. CONTACT */}
          <div className="tos-section" id="contact">
            <div className="section-number">Section 19</div>
            <h2>Contact</h2>
            <p>If you have any questions about these Terms, please contact us at:</p>
            <p>
              <strong style={{ color: 'var(--text)' }}>SnapReserve™</strong><br />
              <a href="mailto:legal@snapreserve.app">legal@snapreserve.app</a><br />
              snapreserve.app
            </p>
          </div>

          {/* Footer */}
          <div className="doc-footer">
            <p>© 2026 <strong>SnapReserve™</strong>. All rights reserved. This document is a Terms of Service prepared for the SnapReserve™ platform. It does not constitute legal advice. SnapReserve™ recommends review by qualified legal counsel prior to publication.</p>
            <p style={{ marginTop: '8px' }}>Governed by the laws of the <strong>United States and the State of Delaware</strong>.</p>
          </div>

        </main>
      </div>
    </>
  )
}
