export const metadata = {
  title: 'Guest Booking Policy — SnapReserve™',
}

export default function GuestPolicyPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@700&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0D0D0D; --bg2: #111111; --bg3: #181818;
          --orange: #E8622A; --orange-lt: #F07D4A;
          --border: rgba(255,255,255,0.07);
          --text: #E8E4DF; --muted: #6B6762; --subtle: #2A2A2A;
          --green: rgba(74,222,128,0.85); --green-bg: rgba(74,222,128,0.06); --green-border: rgba(74,222,128,0.2);
        }
        html { scroll-behavior: smooth; }
        body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 15px; line-height: 1.75; }
        .topbar { background: var(--bg2); border-bottom: 1px solid var(--border); padding: 14px 40px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
        .logo { text-decoration: none; display: inline-flex; align-items: center; }
        .logo img { height: 24px; width: auto; }
        .topbar-right { display: flex; align-items: center; gap: 16px; }
        .version-badge { font-family: 'DM Mono', monospace; font-size: 0.7rem; color: var(--muted); background: var(--subtle); border: 1px solid var(--border); border-radius: 6px; padding: 3px 10px; }
        .effective-date { font-size: 0.78rem; color: var(--muted); }
        .layout { display: grid; grid-template-columns: 260px 1fr; max-width: 1100px; margin: 0 auto; gap: 0; align-items: start; }
        .sidebar { position: sticky; top: 57px; height: calc(100vh - 57px); overflow-y: auto; padding: 36px 24px 36px 0; border-right: 1px solid var(--border); scrollbar-width: none; }
        .sidebar::-webkit-scrollbar { display: none; }
        .sidebar-title { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 16px; padding-left: 2px; }
        .sidebar-nav { list-style: none; }
        .sidebar-nav li { margin-bottom: 2px; }
        .sidebar-nav a { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px; font-size: 0.8rem; color: var(--muted); text-decoration: none; transition: all 0.15s; line-height: 1.3; }
        .sidebar-nav a:hover { background: rgba(255,255,255,0.04); color: var(--text); }
        .content { padding: 48px 48px 80px; max-width: 780px; }
        .doc-header { margin-bottom: 48px; }
        .doc-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--orange); margin-bottom: 10px; }
        .doc-title { font-family: 'Playfair Display', serif; font-size: 2.2rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 16px; }
        .doc-meta { display: flex; flex-wrap: wrap; gap: 20px; padding: 16px 20px; background: var(--bg3); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 24px; }
        .doc-meta-item { font-size: 0.78rem; }
        .doc-meta-item strong { color: var(--text); display: block; font-size: 0.7rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); margin-bottom: 2px; }
        .intro-card { background: var(--green-bg); border: 1px solid var(--green-border); border-radius: 12px; padding: 18px 20px; margin-bottom: 40px; font-size: 0.88rem; color: var(--green); line-height: 1.7; }
        .section { margin-bottom: 44px; scroll-margin-top: 80px; }
        .section-number { font-family: 'DM Mono', monospace; font-size: 0.68rem; color: var(--muted); margin-bottom: 4px; letter-spacing: 0.04em; }
        h2 { font-size: 1.1rem; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 16px; color: var(--text); padding-bottom: 10px; border-bottom: 1px solid var(--border); }
        h3 { font-size: 0.9rem; font-weight: 600; color: var(--text); margin: 20px 0 8px; }
        p { color: rgba(232,228,223,0.8); margin-bottom: 14px; font-size: 0.92rem; }
        ul, ol { padding-left: 20px; margin-bottom: 14px; }
        li { font-size: 0.92rem; color: rgba(232,228,223,0.8); margin-bottom: 6px; line-height: 1.65; }
        strong { color: var(--text); }
        a { color: var(--orange-lt); text-decoration: none; }
        a:hover { text-decoration: underline; }
        .highlight { background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; margin: 12px 0 16px; }
        .contact-card { background: var(--bg3); border: 1px solid var(--border); border-radius: 16px; padding: 32px; margin-top: 48px; text-align: center; }
        .cc-title { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 700; color: var(--text); margin-bottom: 8px; }
        .cc-sub { font-size: 0.84rem; color: var(--muted); margin-bottom: 20px; }
        .cc-btn { display: inline-block; background: var(--orange); color: white; padding: 11px 24px; border-radius: 10px; font-size: 0.88rem; font-weight: 700; text-decoration: none; }
        @media (max-width: 768px) { .layout { grid-template-columns: 1fr; } .sidebar { display: none; } .content { padding: 32px 20px 60px; } .topbar { padding: 12px 20px; } }
      `}</style>

      {/* Top bar */}
      <div className="topbar">
        <a href="/" className="logo"><img src="/logo.png" alt="SnapReserve" /></a>
        <div className="topbar-right">
          <span className="version-badge">v1.0</span>
          <span className="effective-date">Effective January 1, 2026</span>
        </div>
      </div>

      <div className="layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-title">Contents</div>
          <ul className="sidebar-nav">
            {[
              ['#overview', 'Overview'],
              ['#booking-process', 'Booking Process'],
              ['#guest-responsibilities', 'Guest Responsibilities'],
              ['#check-in-out', 'Check-In & Check-Out'],
              ['#property-care', 'Property Care'],
              ['#cancellations', 'Cancellations'],
              ['#prohibited-conduct', 'Prohibited Conduct'],
              ['#liability', 'Liability'],
              ['#disputes', 'Dispute Resolution'],
              ['#contact', 'Contact'],
            ].map(([href, label]) => (
              <li key={href}><a href={href}>{label}</a></li>
            ))}
          </ul>
        </aside>

        {/* Main content */}
        <main className="content">
          <div className="doc-header">
            <div className="doc-label">Legal Policy</div>
            <h1 className="doc-title">Guest Booking Policy</h1>
            <div className="doc-meta">
              <div className="doc-meta-item"><strong>Effective</strong>January 1, 2026</div>
              <div className="doc-meta-item"><strong>Last Updated</strong>January 1, 2026</div>
              <div className="doc-meta-item"><strong>Applies To</strong>All SnapReserve Guests</div>
            </div>
            <div className="intro-card">
              This Guest Booking Policy governs all reservations made through SnapReserve™ ("Platform"). By completing a booking, you agree to these terms in addition to our <a href="/terms">Terms of Service</a> and <a href="/refund-policy">Cancellation and Refund Policy</a>. Please read this document carefully before making a reservation.
            </div>
          </div>

          {/* 1. Overview */}
          <div className="section" id="overview">
            <div className="section-number">01</div>
            <h2>Overview</h2>
            <p>SnapReserve operates as a two-sided marketplace connecting guests with independent hosts offering short-term rental accommodations. SnapReserve is not the host, owner, or operator of any listed property. We facilitate transactions, provide payment processing, and enforce platform policies, but the contractual relationship for the stay itself is between you (the guest) and the host.</p>
            <p>All bookings are subject to availability and host approval (for properties requiring manual confirmation). Your reservation is not confirmed until you receive a written booking confirmation from SnapReserve.</p>
          </div>

          {/* 2. Booking Process */}
          <div className="section" id="booking-process">
            <div className="section-number">02</div>
            <h2>Booking Process</h2>
            <h3>Making a Reservation</h3>
            <p>When you submit a booking request, you are making a binding offer to reserve the property for the specified dates and number of guests. A Stripe payment is initiated at the time of submission. Your card is charged immediately upon completing the payment step.</p>
            <h3>How Booking Confirmation Works</h3>
            <p>All SnapReserve bookings are confirmed automatically once your payment is successfully processed. There is no manual host acceptance step — your booking moves from <strong>Pending</strong> to <strong>Confirmed</strong> the moment Stripe confirms your payment. If payment fails, the booking is automatically cancelled and no charge is applied.</p>
            <h3>Booking Confirmation</h3>
            <p>A confirmation email containing your booking reference, check-in instructions, and host contact details will be sent to your registered email address. You must receive this confirmation before considering your booking active.</p>
            <h3>Guest Count Accuracy</h3>
            <p>You must accurately disclose the number of guests at the time of booking. Exceeding the maximum occupancy stated in the listing may result in cancellation of your stay without refund.</p>
          </div>

          {/* 3. Guest Responsibilities */}
          <div className="section" id="guest-responsibilities">
            <div className="section-number">03</div>
            <h2>Guest Responsibilities</h2>
            <p>As a guest, you are responsible for:</p>
            <ul>
              <li>Reading the full listing description, house rules, and amenity details before booking</li>
              <li>Communicating accurate check-in and check-out times with the host in advance</li>
              <li>Respecting all house rules communicated by the host and displayed on the listing page</li>
              <li>Ensuring all members of your party comply with platform policies and house rules</li>
              <li>Promptly reporting any pre-existing damage to the host upon arrival</li>
              <li>Treating the host, property, and neighbourhood with respect</li>
              <li>Complying with local laws, ordinances, and noise regulations</li>
            </ul>
            <p>You are the primary account holder responsible for all members of your party. Any violation of platform policies by your guests is treated as a violation by you.</p>
          </div>

          {/* 4. Check-In & Check-Out */}
          <div className="section" id="check-in-out">
            <div className="section-number">04</div>
            <h2>Check-In and Check-Out</h2>
            <h3>Check-In</h3>
            <p>Check-in times are specified in the listing. Early check-in or late check-out may be available at the host's discretion. Requests must be made directly through the SnapReserve messaging system. Unauthorised early arrival or refusal to vacate at check-out may result in additional charges.</p>
            <h3>Check-Out</h3>
            <p>You must vacate the property by the stated check-out time. Failure to do so allows the host to charge a late check-out fee as specified in the listing, or to involve SnapReserve support for removal if necessary.</p>
            <h3>No-Shows</h3>
            <p>If you do not check in and have not notified the host or SnapReserve, the booking will be treated as a no-show after 24 hours past the scheduled check-in time. No-shows are subject to the host's cancellation policy and typically forfeit the full reservation amount.</p>
          </div>

          {/* 5. Property Care */}
          <div className="section" id="property-care">
            <div className="section-number">05</div>
            <h2>Property Care and Damage</h2>
            <p>Guests are expected to leave the property in the same condition as found, reasonable wear and tear excepted. You are financially liable for any damage caused by you or your party during the stay.</p>
            <h3>Damage Reporting</h3>
            <p>Hosts must report any damage within 72 hours of your check-out date. You will be notified if a damage claim is filed and have the opportunity to respond. SnapReserve facilitates the dispute resolution process but does not independently verify damage claims.</p>
            <h3>Security Deposits</h3>
            <p>Some listings require a security deposit authorised (but not charged) at booking. If no damage claim is filed within 72 hours of check-out, the authorisation is released. SnapReserve does not hold security deposit funds on behalf of either party.</p>
            <div className="highlight">
              <strong>Important:</strong> Any intentional damage, theft, or vandalism is grounds for immediate account suspension and may result in legal action. SnapReserve will cooperate fully with law enforcement investigations.
            </div>
          </div>

          {/* 6. Cancellations */}
          <div className="section" id="cancellations">
            <div className="section-number">06</div>
            <h2>Cancellations and Refunds</h2>
            <p>Cancellations are governed by the <a href="/refund-policy">Cancellation and Refund Policy</a>. Each listing displays the applicable cancellation policy (Flexible, Moderate, or Strict) on the booking page. Review this policy carefully before confirming your reservation.</p>
            <h3>Guest-Initiated Cancellation</h3>
            <p>To cancel a booking, log in to your account and navigate to Trips. Cancellations initiated through SnapReserve are effective immediately. Refunds, if applicable, are processed within 5–10 business days to the original payment method.</p>
            <h3>Host-Initiated Cancellation</h3>
            <p>If a host cancels your confirmed booking, you are entitled to a full refund of all amounts paid. SnapReserve will also assist you in finding alternative accommodations and may, at its discretion, provide travel credit as compensation.</p>
            <h3>Extenuating Circumstances</h3>
            <p>Cancellations due to documented extenuating circumstances (natural disasters, government travel bans, serious illness) may qualify for refund outside the standard policy. Contact support with documentation within 48 hours of the qualifying event.</p>
          </div>

          {/* 7. Prohibited Conduct */}
          <div className="section" id="prohibited-conduct">
            <div className="section-number">07</div>
            <h2>Prohibited Conduct</h2>
            <p>The following are strictly prohibited at all SnapReserve properties:</p>
            <ul>
              <li>Hosting unauthorised events, parties, or gatherings beyond the stated occupancy limit</li>
              <li>Using the property for any commercial purpose, including but not limited to filming, business operations, or subletting</li>
              <li>Smoking, vaping, or use of controlled substances in non-smoking properties</li>
              <li>Bringing undisclosed pets to pet-free properties</li>
              <li>Tampering with safety equipment, locks, or security devices</li>
              <li>Creating noise disturbances that violate local ordinances or community rules</li>
              <li>Allowing access to the property to persons not listed on the booking</li>
              <li>Engaging in discriminatory, harassing, or threatening behaviour toward hosts or neighbours</li>
            </ul>
            <p>Violations of this conduct policy may result in immediate eviction, cancellation without refund, account suspension, and reporting to relevant authorities.</p>
          </div>

          {/* 8. Liability */}
          <div className="section" id="liability">
            <div className="section-number">08</div>
            <h2>Limitation of Liability</h2>
            <p>SnapReserve acts as a platform intermediary and is not liable for:</p>
            <ul>
              <li>The accuracy of listing descriptions, photos, or amenity information provided by hosts</li>
              <li>Personal injury, property damage, or loss occurring during a stay</li>
              <li>Failure of property amenities or services (Wi-Fi, appliances, utilities) not caused by SnapReserve</li>
              <li>Acts or omissions of hosts, third-party service providers, or other guests</li>
              <li>Force majeure events including natural disasters, civil unrest, or government actions</li>
            </ul>
            <p>SnapReserve's aggregate liability to any guest shall not exceed the total fees paid to SnapReserve (excluding amounts paid to hosts) in the 12 months preceding the claim.</p>
            <p>Nothing in this policy limits liability for fraud, gross negligence, or wilful misconduct by SnapReserve or its employees.</p>
          </div>

          {/* 9. Dispute Resolution */}
          <div className="section" id="disputes">
            <div className="section-number">09</div>
            <h2>Dispute Resolution</h2>
            <p>In the event of a dispute between a guest and host, SnapReserve provides a structured resolution process:</p>
            <ol>
              <li><strong>Direct Resolution (Days 1–3):</strong> Contact the host directly through the SnapReserve messaging system. Most issues are resolved at this stage.</li>
              <li><strong>SnapReserve Mediation (Days 4–14):</strong> If unresolved, submit a formal dispute through your account dashboard. Our Trust &amp; Safety team will review evidence from both parties.</li>
              <li><strong>Final Determination:</strong> SnapReserve's decision is binding on both parties under the platform agreement. Disputes involving refunds above $5,000 may be referred to binding arbitration.</li>
            </ol>
            <p>Disputes must be filed within 14 days of the checkout date. Claims filed after this period will not be considered.</p>
            <p>For disputes involving criminal conduct, contact local law enforcement directly. SnapReserve will cooperate with law enforcement as required by applicable law.</p>
          </div>

          <div className="contact-card" id="contact">
            <div className="cc-title">Questions about your booking?</div>
            <div className="cc-sub">Our support team is available 7 days a week to help with any booking questions or concerns.</div>
            <a href="mailto:support@snapreserve.app" className="cc-btn">Contact Support</a>
          </div>
        </main>
      </div>
    </>
  )
}
