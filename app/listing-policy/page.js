export const metadata = {
  title: 'Listing Content Policy — SnapReserve™',
}

export default function ListingPolicyPage() {
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
          --purple: rgba(196,132,252,0.85); --purple-bg: rgba(196,132,252,0.06); --purple-border: rgba(196,132,252,0.2);
        }
        html { scroll-behavior: smooth; }
        body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 15px; line-height: 1.75; }
        .topbar { background: var(--bg2); border-bottom: 1px solid var(--border); padding: 14px 40px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
        .logo { text-decoration: none; display:inline-flex; align-items:center; }
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
        .intro-card { background: var(--purple-bg); border: 1px solid var(--purple-border); border-radius: 12px; padding: 18px 20px; margin-bottom: 40px; font-size: 0.88rem; color: var(--purple); line-height: 1.7; }
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
              ['#accuracy', 'Accuracy Requirements'],
              ['#photos', 'Photo Guidelines'],
              ['#prohibited', 'Prohibited Content'],
              ['#pricing', 'Pricing Accuracy'],
              ['#intellectual-property', 'Intellectual Property'],
              ['#enforcement', 'Enforcement'],
              ['#review', 'Review and Appeals'],
              ['#contact', 'Contact'],
            ].map(([href, label]) => (
              <li key={href}><a href={href}>{label}</a></li>
            ))}
          </ul>
        </aside>

        <main className="content">
          <div className="doc-header">
            <div className="doc-label">Legal Policy</div>
            <h1 className="doc-title">Listing Content Policy</h1>
            <div className="doc-meta">
              <div className="doc-meta-item"><strong>Effective</strong>January 1, 2026</div>
              <div className="doc-meta-item"><strong>Last Updated</strong>January 1, 2026</div>
              <div className="doc-meta-item"><strong>Applies To</strong>All SnapReserve Hosts</div>
            </div>
            <div className="intro-card">
              This Listing Content Policy sets the standards all hosts must meet when creating and maintaining listings on SnapReserve™. The accuracy and quality of listing content is fundamental to guest trust and platform integrity. Violations may result in listing removal or account suspension.
            </div>
          </div>

          <div className="section" id="overview">
            <div className="section-number">01</div>
            <h2>Overview</h2>
            <p>SnapReserve reviews all listing submissions before they are made publicly available. Listings that pass initial review are subject to ongoing monitoring and may be re-reviewed at any time, including in response to guest complaints, reported inaccuracies, or automated content quality checks.</p>
            <p>Hosts are solely responsible for the accuracy and completeness of their listing content, including descriptions, photos, pricing, amenities, house rules, and availability calendars. SnapReserve provides the platform and review process but cannot independently verify every claim made in a listing.</p>
          </div>

          <div className="section" id="accuracy">
            <div className="section-number">02</div>
            <h2>Accuracy Requirements</h2>
            <h3>Property Description</h3>
            <p>All descriptions must accurately represent the property as it will be experienced by guests. Hosts must disclose:</p>
            <ul>
              <li>The actual property type (entire home, private room, shared room)</li>
              <li>Correct number of bedrooms, beds, and bathrooms</li>
              <li>Maximum occupancy</li>
              <li>Presence of shared spaces (kitchen, bathroom, common areas)</li>
              <li>Known limitations or deficiencies (noise from nearby construction, limited parking, etc.)</li>
              <li>Pets on the premises, even in pet-free listings</li>
              <li>Surveillance or security cameras in any area of the property (exterior cameras must be disclosed; interior cameras in private spaces are strictly prohibited)</li>
            </ul>
            <h3>Amenities</h3>
            <p>Only amenities that are reliably available during every stay should be listed. Hosts must promptly update listings if an amenity becomes temporarily or permanently unavailable. Listing amenities that are absent or non-functional at the time of a guest's stay constitutes misrepresentation.</p>
            <h3>Location</h3>
            <p>The property location must be accurately represented within the SnapReserve mapping system. Deliberately placing a property pin in an incorrect location is a violation of this policy.</p>
          </div>

          <div className="section" id="photos">
            <div className="section-number">03</div>
            <h2>Photo Guidelines</h2>
            <h3>Required Standards</h3>
            <ul>
              <li>Photos must be clear, well-lit, and taken in the last 12 months</li>
              <li>Minimum resolution of 1024×683 pixels</li>
              <li>Photos must accurately represent the space guests will occupy</li>
              <li>The cover photo must show the primary living or bedroom area of the listing</li>
              <li>At least 5 photos required; 10 or more strongly recommended</li>
            </ul>
            <h3>Prohibited in Photos</h3>
            <ul>
              <li>Excessive digital enhancement, AI-generated images, or misleading filters</li>
              <li>Watermarks from other booking platforms</li>
              <li>Images that do not depict the actual property (stock photos, model homes)</li>
              <li>Identifiable faces of guests or third parties without their consent</li>
              <li>Nudity or sexually explicit content</li>
            </ul>
            <h3>Photo Ownership</h3>
            <p>By uploading photos, you confirm you own or have rights to use them and grant SnapReserve a non-exclusive, royalty-free licence to display them in connection with your listing on the Platform and in SnapReserve marketing materials.</p>
          </div>

          <div className="section" id="prohibited">
            <div className="section-number">04</div>
            <h2>Prohibited Content</h2>
            <p>The following content is prohibited in listings and will result in immediate removal and may result in account suspension:</p>
            <ul>
              <li><strong>Fraudulent listings:</strong> Properties that do not exist, are unavailable, or are listed without the owner's permission</li>
              <li><strong>Discriminatory language:</strong> Any text that unlawfully discriminates on the basis of race, colour, religion, national origin, sex, disability, sexual orientation, familial status, or any other protected characteristic</li>
              <li><strong>Misleading pricing:</strong> Hidden fees, bait-and-switch pricing, or prices that materially differ from what is displayed to guests</li>
              <li><strong>Dangerous properties:</strong> Listings that lack functioning smoke detectors, carbon monoxide detectors, fire extinguishers, or other basic safety equipment as required by applicable law</li>
              <li><strong>Illegal rentals:</strong> Short-term rental of properties in jurisdictions where such rentals are prohibited without disclosure of the applicable limitation</li>
              <li><strong>Hate symbols or extremist content</strong> in photos or descriptions</li>
              <li><strong>Contact information in descriptions</strong> intended to circumvent the SnapReserve platform (phone numbers, personal email addresses, other booking platform links)</li>
            </ul>
          </div>

          <div className="section" id="pricing">
            <div className="section-number">05</div>
            <h2>Pricing Accuracy</h2>
            <p>All fees associated with a booking must be disclosed before the guest confirms their reservation. Hosts may set the following fees in their listing:</p>
            <ul>
              <li>Nightly rate (required)</li>
              <li>Cleaning fee (optional)</li>
              <li>Additional guest fee per person above a stated threshold (optional)</li>
              <li>Security deposit (optional, subject to SnapReserve policy)</li>
            </ul>
            <p>Hosts may not request additional payments outside the SnapReserve platform. Any additional charges agreed upon during a stay must be processed through the platform's change-request feature.</p>
            <div className="highlight">
              <strong>Price manipulation:</strong> Temporarily raising prices immediately before or during platform promotional periods (such as discounts or special offers) and then restoring them is prohibited and may result in listing suspension.
            </div>
          </div>

          <div className="section" id="intellectual-property">
            <div className="section-number">06</div>
            <h2>Intellectual Property</h2>
            <p>Hosts must not include in their listings any content that infringes the intellectual property rights of third parties, including:</p>
            <ul>
              <li>Copyrighted photos, artwork, or written content used without permission</li>
              <li>Registered trademarks used in a way likely to cause consumer confusion</li>
              <li>Content that violates third-party privacy rights or data protection laws</li>
            </ul>
            <p>SnapReserve will respond to valid DMCA takedown notices. To submit a copyright infringement claim, contact <a href="mailto:legal@snapreserve.app">legal@snapreserve.app</a> with the required statutory information.</p>
          </div>

          <div className="section" id="enforcement">
            <div className="section-number">07</div>
            <h2>Enforcement Actions</h2>
            <p>SnapReserve may take the following actions in response to listing policy violations, depending on severity and frequency:</p>
            <ul>
              <li><strong>Warning:</strong> Notification to correct the issue within a specified timeframe</li>
              <li><strong>Content removal:</strong> Removal of specific offending content while the listing remains live</li>
              <li><strong>Listing suspension:</strong> Temporary removal of the listing pending host explanation or correction</li>
              <li><strong>Listing rejection:</strong> Permanent removal of the listing from the platform</li>
              <li><strong>Account suspension:</strong> Suspension of all listings and host privileges pending investigation</li>
              <li><strong>Account termination:</strong> Permanent ban for severe or repeated violations</li>
            </ul>
            <p>SnapReserve will generally provide notice and an opportunity to remedy before taking permanent enforcement action, except where the violation poses an immediate safety risk or involves fraud.</p>
          </div>

          <div className="section" id="review">
            <div className="section-number">08</div>
            <h2>Review and Appeals</h2>
            <p>Hosts whose listings are suspended or removed may submit an explanation or appeal through the host portal. Appeals must be submitted within <strong>14 days</strong> of the enforcement action. SnapReserve will review the appeal and provide a decision within 10 business days.</p>
            <p>Hosts who believe a guest complaint was inaccurate or retaliatory may also submit a counter-complaint through the same process. SnapReserve will review evidence from both parties before making a determination.</p>
          </div>

          <div className="contact-card" id="contact">
            <div className="cc-title">Listing policy questions?</div>
            <div className="cc-sub">Contact our host support team for guidance on listing content, photo standards, or to appeal an enforcement decision.</div>
            <a href="mailto:support@snapreserve.app" className="cc-btn">Contact Host Support</a>
          </div>
        </main>
      </div>
    </>
  )
}
