export default function HostAgreementPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: #FAF8F5; color: #1A1410; }

        .nav { display: flex; align-items: center; justify-content: space-between; padding: 0 48px; height: 68px; background: white; border-bottom: 1px solid #E8E2D9; position: sticky; top: 0; z-index: 100; }
        .logo { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 900; text-decoration: none; color: #1A1410; }
        .logo span { color: #F4601A; }

        .hero { background: #1A1410; padding: 56px 48px 48px; }
        .hero-inner { max-width: 760px; margin: 0 auto; }
        .hero-badge { display: inline-block; background: rgba(244,96,26,0.15); border: 1px solid rgba(244,96,26,0.3); border-radius: 100px; padding: 5px 14px; font-size: 0.7rem; font-weight: 700; color: #F4601A; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 18px; }
        .hero h1 { font-family: 'Playfair Display', serif; font-size: 2.6rem; font-weight: 700; color: white; line-height: 1.15; margin-bottom: 14px; }
        .hero-meta { font-size: 0.82rem; color: rgba(255,255,255,0.4); line-height: 1.7; }
        .hero-meta strong { color: rgba(255,255,255,0.65); }

        .layout { max-width: 1100px; margin: 0 auto; padding: 48px 48px 80px; display: grid; grid-template-columns: 220px 1fr; gap: 48px; align-items: start; }

        /* TOC sidebar */
        .toc { position: sticky; top: 88px; }
        .toc-title { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #A89880; margin-bottom: 12px; }
        .toc a { display: block; font-size: 0.78rem; color: #6B5F54; text-decoration: none; padding: 5px 0; border-left: 2px solid #E8E2D9; padding-left: 12px; line-height: 1.4; transition: all 0.15s; }
        .toc a:hover { color: #F4601A; border-left-color: #F4601A; }

        /* Content */
        .content { min-width: 0; }
        .intro-box { background: white; border: 1px solid #E8E2D9; border-radius: 16px; padding: 22px 24px; margin-bottom: 40px; font-size: 0.9rem; color: #4A3F35; line-height: 1.8; }
        .intro-box a { color: #F4601A; font-weight: 600; text-decoration: none; }

        .section { margin-bottom: 44px; scroll-margin-top: 88px; }
        .section-num { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #A89880; margin-bottom: 6px; }
        .section h2 { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700; color: #1A1410; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #E8E2D9; }
        p { font-size: 0.9rem; color: #4A3F35; line-height: 1.85; margin-bottom: 12px; }
        p:last-child { margin-bottom: 0; }

        h3 { font-size: 0.94rem; font-weight: 700; color: #1A1410; margin: 20px 0 8px; }

        ul, ol { padding-left: 22px; margin-bottom: 14px; }
        ul li, ol li { font-size: 0.9rem; color: #4A3F35; line-height: 1.85; margin-bottom: 5px; }

        .def-table { width: 100%; border-collapse: collapse; margin: 14px 0; }
        .def-table tr { border-bottom: 1px solid #E8E2D9; }
        .def-table tr:last-child { border-bottom: none; }
        .def-table td { padding: 11px 12px; font-size: 0.87rem; line-height: 1.7; color: #4A3F35; vertical-align: top; }
        .def-table td:first-child { font-weight: 700; color: #1A1410; width: 140px; white-space: nowrap; }

        .fee-box { background: rgba(244,96,26,0.04); border: 1.5px solid rgba(244,96,26,0.18); border-radius: 14px; padding: 0; margin: 16px 0; overflow: hidden; }
        .fee-box-title { background: rgba(244,96,26,0.08); padding: 10px 20px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #F4601A; }
        .fee-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid rgba(244,96,26,0.1); }
        .fee-row:last-child { border-bottom: none; }
        .fee-label { font-size: 0.87rem; color: #4A3F35; }
        .fee-value { font-size: 0.87rem; font-weight: 700; color: #1A1410; text-align: right; }

        .callout { border-radius: 12px; padding: 16px 20px; margin: 16px 0; font-size: 0.87rem; line-height: 1.75; }
        .callout-orange { background: rgba(244,96,26,0.06); border: 1px solid rgba(244,96,26,0.2); color: #7A3010; }
        .callout-blue { background: rgba(26,110,244,0.05); border: 1px solid rgba(26,110,244,0.18); color: #0A2F7A; }
        .callout-gray { background: white; border: 1px solid #E8E2D9; color: #4A3F35; }
        .callout strong { color: inherit; }

        .contact-card { background: #1A1410; border-radius: 20px; padding: 32px 36px; margin-top: 48px; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
        .cc-text h3 { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 700; color: white; margin: 0 0 6px; }
        .cc-text p { font-size: 0.84rem; color: rgba(255,255,255,0.45); margin: 0; }
        .cc-email { background: #F4601A; color: white; padding: 12px 26px; border-radius: 100px; font-weight: 700; font-size: 0.88rem; text-decoration: none; white-space: nowrap; }

        .footer { background: #1A1410; color: #A89880; padding: 28px 48px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 80px; }
        .footer-logo { font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: #F5EFE8; }
        .footer-logo span { color: #F4601A; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { font-size: 0.78rem; color: #A89880; text-decoration: none; }
        .footer-links a:hover { color: white; }

        @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .toc { display: none; } }
        @media (max-width: 640px) { .hero, .layout, .footer, .nav { padding-left: 20px; padding-right: 20px; } .hero h1 { font-size: 1.9rem; } .contact-card { flex-direction: column; } }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <a href="/home" className="logo">Snap<span>Reserve™</span></a>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/login" style={{padding:'8px 20px',borderRadius:'100px',fontSize:'0.84rem',fontWeight:'700',border:'1px solid #D4CEC5',color:'#1A1410',textDecoration:'none'}}>Log in</a>
          <a href="/signup" style={{padding:'8px 20px',borderRadius:'100px',fontSize:'0.84rem',fontWeight:'700',background:'#F4601A',color:'white',textDecoration:'none'}}>Sign up</a>
        </div>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-inner">
          <div className="hero-badge">Legal · Hosts</div>
          <h1>Host Agreement</h1>
          <div className="hero-meta">
            <strong>Effective Date: March 1, 2026</strong> &nbsp;·&nbsp; Last Updated: March 1, 2026<br />
            Applies to all individuals and entities listing properties on the SnapReserve™™ platform.
          </div>
        </div>
      </div>

      <div className="layout">
        {/* TABLE OF CONTENTS */}
        <nav className="toc">
          <div className="toc-title">Contents</div>
          <a href="#section-1">1. Agreement Overview</a>
          <a href="#section-2">2. Definitions</a>
          <a href="#section-3">3. Eligibility &amp; Account</a>
          <a href="#section-4">4. Listing Requirements</a>
          <a href="#section-5">5. Platform Fees</a>
          <a href="#section-6">6. Payment Processing</a>
          <a href="#section-7">7. Payout Terms</a>
          <a href="#section-8">8. Refunds &amp; Disputes</a>
          <a href="#section-9">9. Host Obligations</a>
          <a href="#section-10">10. Prohibited Conduct</a>
          <a href="#section-11">11. Suspension &amp; Termination</a>
          <a href="#section-12">12. Modifications to Fees</a>
          <a href="#section-13">13. Intellectual Property</a>
          <a href="#section-14">14. Indemnification</a>
          <a href="#section-15">15. Limitation of Liability</a>
          <a href="#section-16">16. Dispute Resolution</a>
          <a href="#section-17">17. Governing Law</a>
          <a href="#section-18">18. Miscellaneous</a>
        </nav>

        {/* CONTENT */}
        <div className="content">

          <div className="intro-box">
            This Host Agreement ("Agreement") is a legally binding contract between you ("Host") and SnapReserve™, Inc. ("SnapReserve™," "we," "our," or "us") governing your use of the SnapReserve™ platform to list, manage, and receive payment for accommodations. This Agreement supplements and incorporates by reference our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>. By listing a property on SnapReserve™, you confirm that you have read, understood, and agree to be bound by this Agreement in its entirety.
          </div>

          {/* 1 */}
          <div className="section" id="section-1">
            <div className="section-num">Section 1</div>
            <h2>Agreement Overview</h2>
            <p>SnapReserve™ operates an online marketplace that connects hosts who wish to list accommodations with guests seeking to book short-term stays. SnapReserve™ acts solely as an intermediary technology platform and is not a party to the accommodation transaction between Host and Guest. SnapReserve™ does not own, operate, manage, or control any listed property.</p>
            <p>By accessing the Host features of the platform, you enter into a direct contractual relationship with SnapReserve™ and acknowledge that SnapReserve™ is providing a platform service only. All obligations related to the provision of accommodation, compliance with applicable laws, and the guest experience rest solely with the Host.</p>
          </div>

          {/* 2 */}
          <div className="section" id="section-2">
            <div className="section-num">Section 2</div>
            <h2>Definitions</h2>
            <p>As used in this Agreement, the following terms have the meanings set forth below:</p>
            <table className="def-table">
              <tbody>
                <tr><td>"Platform"</td><td>The SnapReserve™ website, mobile applications, APIs, and all related services operated by SnapReserve™, Inc.</td></tr>
                <tr><td>"Host"</td><td>Any individual or legal entity that creates a listing on the Platform for the purpose of renting accommodation to Guests.</td></tr>
                <tr><td>"Guest"</td><td>Any individual who books accommodation through the Platform.</td></tr>
                <tr><td>"Listing"</td><td>A property, room, or accommodation offered for rent by a Host through the Platform, including all associated descriptions, photographs, pricing, and availability.</td></tr>
                <tr><td>"Booking"</td><td>A confirmed reservation made by a Guest for a Listing, resulting in a binding agreement between the Host and Guest.</td></tr>
                <tr><td>"Booking Subtotal"</td><td>The nightly rate multiplied by the number of nights, plus any Host-set additional fees such as cleaning fees, before the addition of Guest service fees, taxes, or third-party charges.</td></tr>
                <tr><td>"Host Fee"</td><td>The platform service fee charged by SnapReserve™ to the Host, calculated as a percentage of the Booking Subtotal.</td></tr>
                <tr><td>"Guest Service Fee"</td><td>A separate fee charged by SnapReserve™ directly to the Guest at the time of booking, which does not form part of the Host's payout calculation.</td></tr>
                <tr><td>"Payout"</td><td>The net amount transferred to the Host following a completed stay, equal to the Booking Subtotal minus the Host Fee and any applicable deductions.</td></tr>
                <tr><td>"Stripe"</td><td>Stripe, Inc., the third-party payment processor engaged by SnapReserve™ to facilitate payment collection and payout disbursement.</td></tr>
                <tr><td>"Chargeback"</td><td>A reversal of a payment transaction initiated by a Guest's payment card issuer or financial institution.</td></tr>
                <tr><td>"Dispute"</td><td>A formal challenge raised by a Guest or Host regarding the terms, quality, or fulfilment of a Booking.</td></tr>
              </tbody>
            </table>
          </div>

          {/* 3 */}
          <div className="section" id="section-3">
            <div className="section-num">Section 3</div>
            <h2>Eligibility &amp; Account Requirements</h2>
            <p>To register as a Host and create Listings on the Platform, you must satisfy all of the following requirements at all times during which your account is active:</p>
            <ul>
              <li>You are at least 18 years of age, or the age of majority in your jurisdiction if higher;</li>
              <li>You have the legal capacity to enter into binding contracts under applicable law;</li>
              <li>You hold the legal right to rent or sublease the property, whether as the owner, leaseholder with appropriate subletting rights, or an authorised property manager with documented authority to act;</li>
              <li>You have obtained all required local, state, and federal permits, licences, and registrations necessary to operate a short-term rental;</li>
              <li>You maintain adequate property insurance for the listed accommodation;</li>
              <li>You are not located in a jurisdiction where use of the Platform is prohibited by law; and</li>
              <li>You have not previously been suspended or permanently removed from the Platform.</li>
            </ul>
            <p>If you are registering on behalf of a company, partnership, or other legal entity, you represent and warrant that you have the authority to bind that entity to this Agreement, and references to "Host" shall include that entity.</p>
            <p>SnapReserve™ reserves the right to verify your eligibility at any time and to suspend or terminate your account if you fail to meet or cease to meet any of the above requirements.</p>
          </div>

          {/* 4 */}
          <div className="section" id="section-4">
            <div className="section-num">Section 4</div>
            <h2>Listing Requirements &amp; Approval</h2>
            <h3>4.1 Accuracy Obligations</h3>
            <p>All Listings must be accurate, complete, and not misleading. You are solely responsible for the content of your Listing, including but not limited to:</p>
            <ul>
              <li>Photographs that accurately represent the current condition and appearance of the property;</li>
              <li>Accurate descriptions of all amenities, features, and property characteristics;</li>
              <li>Correct guest capacity, bedroom counts, and bathroom counts;</li>
              <li>Clear disclosure of any shared spaces, shared access areas, or on-site hosts;</li>
              <li>House rules communicated to Guests prior to booking confirmation; and</li>
              <li>An up-to-date availability calendar maintained to prevent double-bookings.</li>
            </ul>
            <h3>4.2 Listing Approval</h3>
            <p>All new Listings are subject to review and approval by SnapReserve™ prior to becoming publicly visible on the Platform. SnapReserve™ may, at its sole discretion, request additional information, documentation, or photographs during the review process. Approval does not constitute an endorsement of the property or a warranty of its condition.</p>
            <h3>4.3 Ongoing Maintenance</h3>
            <p>You must keep your Listing information current at all times. Material changes to the property — including changes to amenities, structural features, or guest capacity — must be reflected in the Listing within 72 hours of the change occurring.</p>
          </div>

          {/* 5 */}
          <div className="section" id="section-5">
            <div className="section-num">Section 5</div>
            <h2>Platform Fees</h2>
            <h3>5.1 Host Service Fee</h3>
            <p>SnapReserve™ charges a Host service fee on each completed Booking. This fee is automatically deducted from the Booking Subtotal before Payout is disbursed to the Host.</p>

            <div className="fee-box">
              <div className="fee-box-title">Fee Schedule — Effective March 1, 2026</div>
              <div className="fee-row">
                <span className="fee-label">Host platform fee</span>
                <span className="fee-value">3.2% of Booking Subtotal</span>
              </div>
              <div className="fee-row">
                <span className="fee-label">Stripe payment processing fee (Host share)</span>
                <span className="fee-value">50% of applicable Stripe fee</span>
              </div>
              <div className="fee-row">
                <span className="fee-label">Guest service fee</span>
                <span className="fee-value">Charged to Guest separately — does not affect Host Payout</span>
              </div>
              <div className="fee-row">
                <span className="fee-label">Cancellation penalty (Host-initiated)</span>
                <span className="fee-value">Per Cancellation Policy; may include forfeiture of Host Fee</span>
              </div>
            </div>

            <h3>5.2 Guest Service Fee</h3>
            <p>In addition to the Host Fee, SnapReserve™ charges a separate Guest service fee to Guests at the time of booking. This fee is collected independently and does not reduce the Host's Payout or form part of the Booking Subtotal upon which the Host Fee is calculated.</p>

            <h3>5.3 Fee Calculation Example</h3>
            <div className="callout callout-gray">
              <p style={{marginBottom:'6px'}}><strong>Example:</strong> A Booking Subtotal of $1,000.00</p>
              <ul style={{marginBottom:0}}>
                <li>Host platform fee (3.2%): <strong>$32.00</strong></li>
                <li>Stripe fee (illustrative 2.9% + $0.30, Host's 50% share): <strong>≈$14.80</strong></li>
                <li><strong>Approximate Host Payout: $953.20</strong></li>
              </ul>
              <p style={{marginTop:'8px',marginBottom:0,fontSize:'0.82rem',color:'#A89880'}}>Actual Stripe fees vary by card type and location. This example is illustrative only.</p>
            </div>

            <h3>5.4 Taxes</h3>
            <p>SnapReserve™ may be required by law to collect and remit certain taxes on bookings in applicable jurisdictions. Any taxes collected by SnapReserve™ on behalf of tax authorities are separate from and in addition to the Host Fee and do not form part of the Host's Payout. Hosts are independently responsible for all income taxes, occupancy taxes, VAT, GST, and any other taxes owed on their rental income. See Section 9 (Host Obligations) for further detail.</p>
          </div>

          {/* 6 */}
          <div className="section" id="section-6">
            <div className="section-num">Section 6</div>
            <h2>Payment Processing</h2>
            <h3>6.1 Stripe as Payment Processor</h3>
            <p>All payment collection and Payout disbursement on the Platform is facilitated through Stripe, Inc. By listing on SnapReserve™, you agree to be bound by <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer" style={{color:'#F4601A',fontWeight:600}}>Stripe's Connected Account Agreement</a> and Stripe's applicable terms of service, which may be updated by Stripe from time to time. SnapReserve™ is not responsible for errors, delays, or failures caused by Stripe's systems.</p>
            <h3>6.2 Processing Fee Sharing</h3>
            <p>Stripe charges a payment processing fee on each transaction. This fee is shared equally between the Host and SnapReserve™, with each party bearing 50% of the applicable Stripe processing cost. The Host's share is deducted from the Payout prior to disbursement. SnapReserve™ will reflect the deducted processing amount in the Payout breakdown accessible via your host dashboard.</p>
            <h3>6.3 Currency</h3>
            <p>All transactions on the Platform are processed in United States Dollars (USD) unless otherwise specified. If a Guest pays in a foreign currency, any currency conversion is handled by Stripe at their applicable exchange rate, and any resulting conversion fees are the responsibility of the Host's share of processing costs or passed through as noted in your Stripe Connected Account agreement.</p>
            <h3>6.4 Failed Payments</h3>
            <p>If a Guest's payment fails after a Booking is confirmed, SnapReserve™ will notify both parties. SnapReserve™ is not obligated to remit a Payout to the Host for any Booking where payment was not successfully collected and settled. SnapReserve™ will make reasonable efforts to collect outstanding payments but does not guarantee collection.</p>
          </div>

          {/* 7 */}
          <div className="section" id="section-7">
            <div className="section-num">Section 7</div>
            <h2>Payout Terms</h2>
            <h3>7.1 Standard Payout Schedule</h3>
            <p>Subject to the conditions set forth in this Agreement, SnapReserve™ will initiate the disbursement of your Payout within 24 hours following the Guest's confirmed check-in. Actual receipt of funds is subject to Stripe processing timelines and your financial institution's settlement periods, which typically range from 1 to 5 business days.</p>
            <h3>7.2 Payout Holds and Delays</h3>
            <p>SnapReserve™ reserves the right to delay, withhold, or suspend a Payout in any of the following circumstances:</p>
            <ul>
              <li><strong>Active Dispute:</strong> A Guest has raised a dispute, complaint, or claim related to the Booking, pending resolution;</li>
              <li><strong>Chargeback Initiated:</strong> A chargeback or payment reversal has been filed by the Guest's card issuer or financial institution;</li>
              <li><strong>Fraud Review:</strong> The Booking or associated payment has been flagged for fraud review by SnapReserve™'s systems or by Stripe;</li>
              <li><strong>Regulatory Hold:</strong> A government authority, legal process, or regulatory requirement compels SnapReserve™ to withhold the Payout;</li>
              <li><strong>Account Breach:</strong> SnapReserve™ has reasonable grounds to believe the Host has violated this Agreement or the Terms of Service;</li>
              <li><strong>Identity Verification:</strong> Required identity or payout verification has not been completed by the Host; or</li>
              <li><strong>Outstanding Deductions:</strong> The Host has an outstanding negative balance on their account due to prior refunds, chargebacks, or penalties.</li>
            </ul>
            <div className="callout callout-orange">
              <strong>Important:</strong> Payouts subject to an active fraud review or chargeback investigation may be held for up to 90 days or until the matter is resolved, whichever occurs first. SnapReserve™ will notify you of the hold and the estimated resolution timeline where permitted by applicable law.
            </div>
            <h3>7.3 Payout Account Requirements</h3>
            <p>You must maintain a valid, verified payout account (bank account or debit card) connected through your Stripe Connected Account. SnapReserve™ is not responsible for misdirected funds resulting from incorrect payout account details provided by the Host. You agree to update your payout details promptly upon any change to your banking information.</p>
            <h3>7.4 Minimum Payout Threshold</h3>
            <p>SnapReserve™ may establish a minimum Payout threshold, below which funds are held and accumulated until the threshold is met. Current threshold information is available in your host dashboard settings.</p>
          </div>

          {/* 8 */}
          <div className="section" id="section-8">
            <div className="section-num">Section 8</div>
            <h2>Refunds, Disputes &amp; Chargebacks</h2>
            <h3>8.1 Cancellation Policy</h3>
            <p>Each Listing must have an associated cancellation policy selected from the options available on the Platform. Refunds to Guests for Host-approved or policy-triggered cancellations will be processed in accordance with the selected cancellation policy. The Host Fee is non-refundable in the event of a Guest cancellation once the cancellation-free window has expired.</p>
            <h3>8.2 Host-Initiated Cancellations</h3>
            <p>If a Host cancels a confirmed Booking:</p>
            <ul>
              <li>The Guest will receive a full refund of all amounts paid, including any Guest service fees;</li>
              <li>SnapReserve™ may apply a cancellation penalty to the Host's account, including deduction from future Payouts;</li>
              <li>The Host's listing ranking and visibility may be negatively impacted; and</li>
              <li>Repeated Host-initiated cancellations may result in listing suspension or permanent account termination.</li>
            </ul>
            <h3>8.3 Guest Disputes</h3>
            <p>If a Guest raises a dispute alleging material inaccuracies in the Listing, property damage, or a failure to provide the listed accommodation, SnapReserve™'s Trust &amp; Safety team will investigate the claim. During the investigation, the relevant Payout may be held. SnapReserve™'s determination following a good-faith investigation shall be final and binding on both parties, subject to applicable consumer protection laws.</p>
            <h3>8.4 Chargebacks</h3>
            <p>In the event of a chargeback filed by a Guest against a SnapReserve™ payment:</p>
            <ul>
              <li>SnapReserve™ will immediately hold the disputed Payout amount pending resolution;</li>
              <li>SnapReserve™ will notify the Host and may request supporting documentation (communications, check-in records, photographs) to contest the chargeback;</li>
              <li>If the chargeback is upheld by the card issuer, the disputed amount will be deducted from the Host's Payout or from any future Payouts owed to the Host; and</li>
              <li>If the Host's account balance is insufficient to cover the deduction, the Host authorises SnapReserve™ to recover the shortfall from future Payouts or to invoice the Host directly.</li>
            </ul>
            <div className="callout callout-orange">
              <strong>Note on Deductions:</strong> By listing on the Platform, you expressly authorise SnapReserve™ to deduct from your Payouts any amounts owed to SnapReserve™ or to Guests arising from refunds, chargebacks, penalties, or damages attributable to your Listings or conduct.
            </div>
            <h3>8.5 SnapReserve™'s Liability in Disputes</h3>
            <p>SnapReserve™ is not liable for losses arising from Guest disputes, chargebacks, or fraudulent bookings except where directly caused by SnapReserve™'s gross negligence or wilful misconduct. SnapReserve™ acts as a neutral facilitator and does not guarantee the outcome of any dispute resolution process.</p>
          </div>

          {/* 9 */}
          <div className="section" id="section-9">
            <div className="section-num">Section 9</div>
            <h2>Host Obligations</h2>
            <h3>9.1 Legal Compliance</h3>
            <p>You are solely responsible for ensuring that your Listing and all hosting activities comply with all applicable laws, regulations, ordinances, and rules, including without limitation:</p>
            <ul>
              <li>Local zoning laws and short-term rental regulations;</li>
              <li>Building codes, fire safety standards, and health regulations;</li>
              <li>Homeowners' Association (HOA) or condominium rules;</li>
              <li>Lease or mortgage terms that may restrict subletting or rental activities;</li>
              <li>Short-term rental permits, business licences, and registration requirements; and</li>
              <li>Anti-discrimination laws, including the Fair Housing Act and applicable state and local equivalents.</li>
            </ul>
            <p>SnapReserve™ does not provide legal advice and makes no representation that use of the Platform is permissible in your jurisdiction. You are strongly encouraged to seek independent legal counsel regarding local short-term rental regulations before listing.</p>
            <h3>9.2 Tax Obligations</h3>
            <p>You are solely responsible for determining, collecting, remitting, and reporting all taxes applicable to your rental income, including income tax, occupancy tax, transient lodging tax, sales tax, and any other applicable levies. Where SnapReserve™ is legally required to collect and remit occupancy taxes on your behalf, the amounts collected will be reflected in your Payout statement and will not form part of your gross Payout. SnapReserve™ expressly disclaims any responsibility for your individual tax obligations arising from use of the Platform.</p>
            <h3>9.3 Insurance</h3>
            <p>You must maintain adequate insurance coverage for your property at all times, including public liability insurance appropriate for short-term rental use. SnapReserve™'s SnapGuarantee™ programme (where applicable) is supplemental in nature and does not replace homeowner's insurance, renter's insurance, or commercial property insurance. SnapGuarantee is subject to its own terms, conditions, and coverage limits.</p>
            <h3>9.4 Property Standards</h3>
            <p>You must ensure that your property meets all applicable safety and habitability standards, including working smoke detectors, carbon monoxide detectors, fire extinguishers (where required), and secure locks on all entry points. Properties must be clean, safe, and in a condition materially consistent with the Listing at the time of each Guest's check-in.</p>
            <h3>9.5 Guest Communications</h3>
            <p>You are expected to respond to Guest enquiries in a timely manner and to provide accurate pre-arrival information including check-in instructions, property access details, and house rules. Failure to communicate adequately with Guests may result in negative reviews and may affect your Listing's visibility on the Platform.</p>
          </div>

          {/* 10 */}
          <div className="section" id="section-10">
            <div className="section-num">Section 10</div>
            <h2>Prohibited Conduct</h2>
            <p>The following conduct is strictly prohibited on the Platform. Violation of any of these prohibitions may result in immediate account suspension or permanent termination:</p>
            <ul>
              <li>Listing a property without the legal right to do so;</li>
              <li>Providing false or misleading information in a Listing, including fraudulent photographs or fabricated amenities;</li>
              <li>Facilitating, enabling, or knowingly permitting illegal activities at listed properties;</li>
              <li>Discriminating against Guests on the basis of race, colour, religion, national origin, sex, disability, sexual orientation, gender identity, familial status, or any other characteristic protected under applicable law;</li>
              <li>Attempting to circumvent the Platform by soliciting direct off-platform payments from Guests for bookings that originated through SnapReserve™;</li>
              <li>Manipulating reviews, ratings, or the Platform's ranking algorithms;</li>
              <li>Creating multiple accounts to evade suspension, bans, or other enforcement actions;</li>
              <li>Collecting Guest personal data obtained through the Platform for purposes other than fulfilling the Booking; and</li>
              <li>Using the Platform to facilitate commercial activities unrelated to accommodation rental.</li>
            </ul>
          </div>

          {/* 11 */}
          <div className="section" id="section-11">
            <div className="section-num">Section 11</div>
            <h2>Suspension &amp; Termination</h2>
            <h3>11.1 Termination by Host</h3>
            <p>You may deactivate your Listing or close your Host account at any time through your account settings. Termination by the Host does not affect any obligations arising from confirmed Bookings that have not yet been completed, including obligations to accommodate Guests and honour refund policies.</p>
            <h3>11.2 Suspension or Termination by SnapReserve™</h3>
            <p>SnapReserve™ may, at its sole discretion and with or without prior notice (depending on the nature and severity of the violation), suspend or permanently terminate your Listing or Host account in any of the following circumstances:</p>
            <ul>
              <li>Violation of this Agreement or the SnapReserve™ Terms of Service;</li>
              <li>Repeated or severe Guest complaints or consistently low review ratings;</li>
              <li>Confirmed fraudulent activity or misrepresentation;</li>
              <li>Failure to comply with applicable laws or regulatory requirements;</li>
              <li>Posing a risk to the safety, health, or wellbeing of Guests or third parties;</li>
              <li>Repeated Host-initiated cancellations of confirmed Bookings; or</li>
              <li>Any other conduct that SnapReserve™ reasonably determines to be harmful to the Platform, its users, or its reputation.</li>
            </ul>
            <h3>11.3 Effect of Termination</h3>
            <p>Upon termination: (a) all active Listings will be removed from public view; (b) pending Payouts will be processed in accordance with this Agreement less any amounts owed to SnapReserve™ or Guests; and (c) outstanding Bookings not yet completed at the time of termination will be handled in accordance with SnapReserve™'s Guest protection policies, which may include cancellation of those Bookings with full refunds to Guests.</p>
            <div className="callout callout-blue">
              <strong>Survival:</strong> Sections 5 (Platform Fees), 8 (Refunds &amp; Disputes), 9.2 (Tax Obligations), 14 (Indemnification), 15 (Limitation of Liability), 16 (Dispute Resolution), and 17 (Governing Law) survive any expiration or termination of this Agreement.
            </div>
          </div>

          {/* 12 */}
          <div className="section" id="section-12">
            <div className="section-num">Section 12</div>
            <h2>Modifications to Fees &amp; Terms</h2>
            <h3>12.1 Fee Changes</h3>
            <p>SnapReserve™ reserves the right to modify the Host Fee, Guest service fee, or any other fee charged through the Platform. SnapReserve™ will provide Hosts with not less than <strong>30 days' written notice</strong> prior to any fee modification taking effect. Notice will be delivered via the email address associated with your Host account and/or via a prominent notice within the host dashboard.</p>
            <p>Your continued use of the Platform to accept new Bookings after the effective date of a fee change constitutes your acceptance of the revised fee schedule. If you do not accept the revised fees, you must deactivate your Listing and cease accepting new Bookings prior to the effective date of the change. Fee changes do not apply retroactively to Bookings confirmed prior to the effective date.</p>
            <h3>12.2 Agreement Modifications</h3>
            <p>SnapReserve™ may update or modify this Agreement from time to time. We will notify you of material changes through the Platform or via email. The updated Agreement will specify the revised effective date. Continued use of the Platform following the effective date of any modification constitutes acceptance of the modified Agreement.</p>
          </div>

          {/* 13 */}
          <div className="section" id="section-13">
            <div className="section-num">Section 13</div>
            <h2>Intellectual Property</h2>
            <p>By submitting content to the Platform (including Listing descriptions, photographs, and other materials), you grant SnapReserve™ a non-exclusive, worldwide, royalty-free, sublicensable, and transferable licence to use, reproduce, display, distribute, modify, and create derivative works of such content for the purposes of operating, promoting, and improving the Platform. This licence continues for as long as the content remains on the Platform and for a reasonable period following removal to allow for technical and archival purposes.</p>
            <p>You represent and warrant that you own or have all necessary rights to the content you submit, that the content does not infringe the intellectual property rights of any third party, and that you have obtained all necessary consents for any individuals depicted in photographs.</p>
          </div>

          {/* 14 */}
          <div className="section" id="section-14">
            <div className="section-num">Section 14</div>
            <h2>Indemnification</h2>
            <p>To the maximum extent permitted by applicable law, you agree to indemnify, defend, and hold harmless SnapReserve™, Inc. and its officers, directors, employees, agents, licensors, and service providers from and against any and all claims, liabilities, damages, judgments, awards, losses, costs, expenses, and fees (including reasonable attorneys' fees) arising out of or relating to:</p>
            <ul>
              <li>Your use of the Platform or any breach of this Agreement;</li>
              <li>Your Listing, including any inaccuracies or omissions;</li>
              <li>Any Booking or accommodation provided to a Guest;</li>
              <li>Your violation of any applicable law, regulation, or third-party right, including intellectual property rights;</li>
              <li>Any claim by a Guest or third party arising from their stay at your property; or</li>
              <li>Your failure to obtain required permits, licences, or insurance.</li>
            </ul>
          </div>

          {/* 15 */}
          <div className="section" id="section-15">
            <div className="section-num">Section 15</div>
            <h2>Limitation of Liability</h2>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SNAPRESERVE, INC. AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND SERVICE PROVIDERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, LOSS OF DATA, LOSS OF GOODWILL, BUSINESS INTERRUPTION, OR ANY OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT OR YOUR USE OF THE PLATFORM, REGARDLESS OF THE THEORY OF LIABILITY AND EVEN IF SNAPRESERVE HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>
            <p>IN NO EVENT SHALL SNAPRESERVE'S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THIS AGREEMENT OR YOUR USE OF THE PLATFORM EXCEED THE GREATER OF: (A) THE TOTAL FEES PAID BY OR TO YOU THROUGH THE PLATFORM IN THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM; OR (B) ONE HUNDRED UNITED STATES DOLLARS (USD $100.00).</p>
            <p>THE LIMITATIONS IN THIS SECTION APPLY TO THE FULLEST EXTENT PERMITTED BY LAW AND SHALL NOT APPLY TO LIABILITY ARISING FROM DEATH OR PERSONAL INJURY CAUSED BY GROSS NEGLIGENCE OR WILFUL MISCONDUCT, OR ANY OTHER LIABILITY THAT CANNOT BE EXCLUDED OR LIMITED UNDER APPLICABLE LAW.</p>
          </div>

          {/* 16 */}
          <div className="section" id="section-16">
            <div className="section-num">Section 16</div>
            <h2>Dispute Resolution</h2>
            <h3>16.1 Informal Resolution</h3>
            <p>In the event of a dispute between you and SnapReserve™ arising out of or relating to this Agreement, both parties agree to first attempt to resolve the dispute informally by contacting SnapReserve™ at <strong>legal@snapreserve.app</strong>. SnapReserve™ will use reasonable efforts to resolve the dispute within 30 days of receiving written notice.</p>
            <h3>16.2 Binding Arbitration</h3>
            <p>If informal resolution is unsuccessful, any dispute, claim, or controversy arising out of or relating to this Agreement or the breach, termination, enforcement, interpretation, or validity thereof, shall be resolved by binding arbitration administered by the American Arbitration Association (AAA) in accordance with its Consumer Arbitration Rules. The arbitration shall be conducted in English. The arbitrator's award shall be final and binding and may be entered as a judgment in any court of competent jurisdiction.</p>
            <h3>16.3 Class Action Waiver</h3>
            <p>YOU AND SNAPRESERVE AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING. The arbitrator may not consolidate more than one person's claims and may not otherwise preside over any form of a representative or class proceeding.</p>
            <h3>16.4 Exceptions</h3>
            <p>Notwithstanding the foregoing, either party may seek emergency injunctive or equitable relief in a court of competent jurisdiction to prevent irreparable harm pending arbitration. This Section does not prevent either party from filing a claim in small claims court for disputes within the applicable jurisdictional limits.</p>
          </div>

          {/* 17 */}
          <div className="section" id="section-17">
            <div className="section-num">Section 17</div>
            <h2>Governing Law</h2>
            <p>This Agreement and any dispute or claim arising out of or in connection with it or its subject matter or formation shall be governed by and construed in accordance with the laws of the State of Delaware, United States of America, without regard to its conflict of law provisions.</p>
            <p>Subject to the arbitration provisions in Section 16, you consent to the exclusive jurisdiction of the federal and state courts located in the State of Delaware for the resolution of any disputes not subject to arbitration.</p>
          </div>

          {/* 18 */}
          <div className="section" id="section-18">
            <div className="section-num">Section 18</div>
            <h2>Miscellaneous</h2>
            <h3>18.1 Entire Agreement</h3>
            <p>This Agreement, together with the SnapReserve™ Terms of Service, Privacy Policy, and any other policies incorporated by reference, constitutes the entire agreement between you and SnapReserve™ with respect to the subject matter hereof and supersedes all prior and contemporaneous agreements, representations, and understandings.</p>
            <h3>18.2 Severability</h3>
            <p>If any provision of this Agreement is found to be invalid, illegal, or unenforceable under applicable law, that provision shall be modified to the minimum extent necessary to make it enforceable, or severed if modification is not possible, without affecting the validity and enforceability of the remaining provisions.</p>
            <h3>18.3 Waiver</h3>
            <p>No failure or delay by SnapReserve™ in exercising any right, power, or privilege under this Agreement shall operate as a waiver thereof. No single or partial exercise of any right, power, or privilege shall preclude any other or further exercise thereof.</p>
            <h3>18.4 Assignment</h3>
            <p>You may not assign, transfer, or delegate your rights or obligations under this Agreement without the prior written consent of SnapReserve™. SnapReserve™ may assign this Agreement, in whole or in part, to any affiliate or in connection with a merger, acquisition, or sale of all or substantially all of its assets, without your consent.</p>
            <h3>18.5 Notices</h3>
            <p>All notices from SnapReserve™ to you under this Agreement will be sent to the email address associated with your Host account or posted to the Platform. You are responsible for keeping your contact information current. Notices to SnapReserve™ should be sent to <strong>legal@snapreserve.app</strong>.</p>
            <h3>18.6 Language</h3>
            <p>This Agreement is made in the English language. If it is translated into any other language, the English version shall prevail in the event of any conflict.</p>
          </div>

          {/* CONTACT */}
          <div className="contact-card">
            <div className="cc-text">
              <h3>Questions about this Agreement?</h3>
              <p>Our host support team and legal team are available to assist.</p>
            </div>
            <a href="mailto:legal@snapreserve.app" className="cc-email">legal@snapreserve.app</a>
          </div>

        </div>
      </div>

      <footer className="footer">
        <div className="footer-logo">Snap<span>Reserve™</span></div>
        <div className="footer-links">
          <a href="/terms">Terms of Service</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/refund-policy">Refund Policy</a>
          <a href="/coming-soon?page=support">Support</a>
        </div>
        <div style={{fontSize:'0.74rem'}}>© 2026 SnapReserve™, Inc. · All rights reserved</div>
      </footer>
    </>
  )
}
