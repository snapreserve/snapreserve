export const metadata = {
  title: 'Payment and Fee Policy — SnapReserve™',
}

export default function PaymentPolicyPage() {
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
          --yellow: rgba(250,204,21,0.85); --yellow-bg: rgba(250,204,21,0.06); --yellow-border: rgba(250,204,21,0.2);
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
        .intro-card { background: var(--yellow-bg); border: 1px solid var(--yellow-border); border-radius: 12px; padding: 18px 20px; margin-bottom: 40px; font-size: 0.88rem; color: var(--yellow); line-height: 1.7; }
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
        .fee-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.88rem; }
        .fee-table th { text-align: left; padding: 10px 14px; background: var(--bg3); border: 1px solid var(--border); color: var(--muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 700; }
        .fee-table td { padding: 10px 14px; border: 1px solid var(--border); color: rgba(232,228,223,0.8); }
        .fee-table tr:hover td { background: rgba(255,255,255,0.02); }
        .contact-card { background: var(--bg3); border: 1px solid var(--border); border-radius: 16px; padding: 32px; margin-top: 48px; text-align: center; }
        .cc-title { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 700; color: var(--text); margin-bottom: 8px; }
        .cc-sub { font-size: 0.84rem; color: var(--muted); margin-bottom: 20px; }
        .cc-btn { display: inline-block; background: var(--orange); color: white; padding: 11px 24px; border-radius: 10px; font-size: 0.88rem; font-weight: 700; text-decoration: none; }
        @media (max-width: 768px) { .layout { grid-template-columns: 1fr; } .sidebar { display: none; } .content { padding: 32px 20px 60px; } .topbar { padding: 12px 20px; } }
      `}</style>

      <div className="topbar">
        <a href="/" className="logo"><img src="/logo.png" alt="SnapReserve" /></a>
        <div className="topbar-right">
          <span className="version-badge">v1.0</span>
          <span className="effective-date">Effective January 1, 2026</span>
        </div>
      </div>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-title">Contents</div>
          <ul className="sidebar-nav">
            {[
              ['#overview', 'Overview'],
              ['#service-fees', 'Service Fees'],
              ['#payment-processing', 'Payment Processing'],
              ['#host-payouts', 'Host Payouts'],
              ['#refunds', 'Refunds'],
              ['#taxes', 'Taxes'],
              ['#currency', 'Currency'],
              ['#fraud', 'Fraud Prevention'],
              ['#disputes', 'Payment Disputes'],
              ['#contact', 'Contact'],
            ].map(([href, label]) => (
              <li key={href}><a href={href}>{label}</a></li>
            ))}
          </ul>
        </aside>

        <main className="content">
          <div className="doc-header">
            <div className="doc-label">Legal Policy</div>
            <h1 className="doc-title">Payment and Fee Policy</h1>
            <div className="doc-meta">
              <div className="doc-meta-item"><strong>Effective</strong>January 1, 2026</div>
              <div className="doc-meta-item"><strong>Last Updated</strong>January 1, 2026</div>
              <div className="doc-meta-item"><strong>Applies To</strong>Guests and Hosts</div>
            </div>
            <div className="intro-card">
              This Payment and Fee Policy describes how SnapReserve™ processes payments, collects service fees, and distributes payouts to hosts. All financial transactions on the Platform are processed by Stripe, Inc. By using SnapReserve, you agree to Stripe's <a href="https://stripe.com/legal" target="_blank" rel="noopener noreferrer">Terms of Service</a> in addition to this policy.
            </div>
          </div>

          <div className="section" id="overview">
            <div className="section-number">01</div>
            <h2>Overview</h2>
            <p>SnapReserve acts as a limited payment agent on behalf of hosts for the purpose of collecting guest payments. When you pay for a booking, your payment is collected by SnapReserve and held until the applicable payout schedule is triggered. SnapReserve deducts its platform service fee before remitting the remainder to the host.</p>
            <p>All payments are processed in United States Dollars (USD) unless otherwise indicated. SnapReserve does not hold fractional banking licences and is not a bank, money transmitter, or payment institution.</p>
          </div>

          <div className="section" id="service-fees">
            <div className="section-number">02</div>
            <h2>Service Fees</h2>
            <p>SnapReserve charges service fees to both guests and hosts as described below. All fees are non-refundable except where expressly stated in the <a href="/refund-policy">Cancellation and Refund Policy</a>.</p>
            <h3>Guest Service Fee</h3>
            <p>Guests pay a service fee calculated as a percentage of the booking subtotal (nightly rate × nights). This fee is displayed transparently on the booking confirmation page before payment is completed.</p>
            <table className="fee-table">
              <thead>
                <tr>
                  <th>Booking Total</th>
                  <th>Guest Service Fee</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Up to $500</td><td>14%</td></tr>
                <tr><td>$501 – $2,000</td><td>12%</td></tr>
                <tr><td>$2,001 – $5,000</td><td>10%</td></tr>
                <tr><td>Over $5,000</td><td>8%</td></tr>
              </tbody>
            </table>
            <h3>Host Service Fee</h3>
            <p>Hosts pay a platform fee deducted from each payout. The standard host fee is <strong>3%</strong> of the booking subtotal. Fees may vary for hosts on special pricing agreements or volume programmes.</p>
            <div className="highlight">
              <strong>Fee Transparency:</strong> The total price shown to guests on the search and listing pages includes all service fees and applicable taxes. There are no hidden charges.
            </div>
          </div>

          <div className="section" id="payment-processing">
            <div className="section-number">03</div>
            <h2>Payment Processing</h2>
            <h3>Accepted Payment Methods</h3>
            <ul>
              <li>Major credit cards (Visa, Mastercard, American Express, Discover)</li>
              <li>Debit cards with billing address</li>
              <li>Apple Pay and Google Pay (where supported)</li>
            </ul>
            <h3>Payment Timing</h3>
            <p>For Instant Book reservations, payment is charged at the time of booking confirmation. For Request to Book listings, a payment authorisation hold is placed at submission and charged only if the host accepts within 24 hours.</p>
            <h3>Payment Security</h3>
            <p>All payment data is processed and stored by Stripe, Inc. SnapReserve does not store full card numbers, CVV codes, or sensitive payment instrument data. Payment processing complies with PCI DSS Level 1 standards.</p>
          </div>

          <div className="section" id="host-payouts">
            <div className="section-number">04</div>
            <h2>Host Payouts</h2>
            <h3>Payout Schedule</h3>
            <p>Host payouts are initiated <strong>24 hours after the guest's confirmed check-in</strong>. This delay allows for verification that the guest has arrived and the stay has commenced. Once initiated, funds typically arrive in the host's connected bank account within 1–5 business days, depending on their bank and payout method.</p>
            <h3>Payout Calculation</h3>
            <p>Host payout = (nightly rate × nights) + cleaning fee + any agreed additional charges − host service fee (3%) − any approved refunds or adjustments.</p>
            <h3>Payout Requirements</h3>
            <p>Hosts must connect a valid Stripe Connect account to receive payouts. Payouts are subject to Stripe's identity verification requirements. SnapReserve is not liable for delays caused by incomplete verification, bank errors, or incorrect payout details provided by the host.</p>
            <h3>Payout Holds</h3>
            <p>SnapReserve may place a hold on payouts in circumstances including: open guest disputes, suspected fraud, account investigation, or insufficient information for tax reporting. Hosts will be notified promptly of any hold and the steps required to resolve it.</p>
          </div>

          <div className="section" id="refunds">
            <div className="section-number">05</div>
            <h2>Refunds</h2>
            <p>Refunds are governed by the applicable cancellation policy and the <a href="/refund-policy">Cancellation and Refund Policy</a>. Key points:</p>
            <ul>
              <li>Approved refunds are returned to the original payment method within 5–10 business days</li>
              <li>SnapReserve service fees are non-refundable for cancellations made after the free cancellation window</li>
              <li>Partial refunds may be issued for complaints about materially inaccurate listings, subject to review</li>
              <li>Refunds cannot be issued more than 90 days after the original transaction date</li>
            </ul>
          </div>

          <div className="section" id="taxes">
            <div className="section-number">06</div>
            <h2>Taxes</h2>
            <h3>Occupancy and Tourist Taxes</h3>
            <p>In jurisdictions where SnapReserve is registered to collect and remit occupancy taxes (including hotel taxes, transient occupancy taxes, and tourist taxes), these amounts are included in the booking total and remitted by SnapReserve on behalf of the transaction parties.</p>
            <h3>Income Tax</h3>
            <p>Hosts are solely responsible for reporting and paying income taxes on earnings received through SnapReserve. SnapReserve will provide annual earnings summaries and, where required by law, issue tax forms (including IRS Form 1099-K for US hosts with gross payments exceeding applicable thresholds).</p>
            <h3>GST/VAT</h3>
            <p>Applicable goods and services or value-added taxes on SnapReserve service fees will be charged and remitted as required under the laws of the applicable jurisdiction.</p>
          </div>

          <div className="section" id="currency">
            <div className="section-number">07</div>
            <h2>Currency and Exchange</h2>
            <p>All transactions on SnapReserve are denominated in US Dollars (USD). If your bank or card issuer applies currency conversion, any resulting fees or exchange rate differences are your responsibility. SnapReserve does not offer multi-currency pricing at this time.</p>
          </div>

          <div className="section" id="fraud">
            <div className="section-number">08</div>
            <h2>Fraud Prevention</h2>
            <p>SnapReserve employs automated and manual fraud detection systems. Activities that may trigger a fraud review include:</p>
            <ul>
              <li>Multiple failed payment attempts</li>
              <li>Transactions from high-risk IP addresses or device fingerprints</li>
              <li>Unusual booking patterns inconsistent with normal use</li>
              <li>Discrepancies between billing address and IP location</li>
            </ul>
            <p>Accounts flagged for suspicious activity may have transactions paused pending review. SnapReserve is not liable for losses resulting from unauthorised use of your payment credentials. You must notify us immediately at <a href="mailto:security@snapreserve.app">security@snapreserve.app</a> if you suspect unauthorised transactions.</p>
          </div>

          <div className="section" id="disputes">
            <div className="section-number">09</div>
            <h2>Payment Disputes and Chargebacks</h2>
            <p>If you believe a charge is incorrect, contact SnapReserve support before initiating a chargeback with your card issuer. Initiating a chargeback without first seeking resolution through SnapReserve may result in account suspension and will not prevent us from pursuing recovery of legitimately charged amounts.</p>
            <p>SnapReserve will respond to card network chargeback inquiries on your behalf and provide documentation to support or contest claims as appropriate.</p>
          </div>

          <div className="contact-card" id="contact">
            <div className="cc-title">Billing questions?</div>
            <div className="cc-sub">For any payment, fee, or payout enquiries, our finance support team is ready to help.</div>
            <a href="mailto:support@snapreserve.app" className="cc-btn">Contact Finance Support</a>
          </div>
        </main>
      </div>
    </>
  )
}
