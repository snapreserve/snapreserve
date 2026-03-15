export const metadata = {
  title: 'Community Standards and Safety Policy — SnapReserve™',
}

export default function CommunityStandardsPage() {
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
          --red: rgba(248,113,113,0.85); --red-bg: rgba(248,113,113,0.06); --red-border: rgba(248,113,113,0.2);
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
        .intro-card { background: var(--red-bg); border: 1px solid var(--red-border); border-radius: 12px; padding: 18px 20px; margin-bottom: 40px; font-size: 0.88rem; color: var(--red); line-height: 1.7; }
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
        .emergency-card { background: var(--red-bg); border: 1px solid var(--red-border); border-radius: 12px; padding: 18px 20px; margin: 16px 0; }
        .emergency-card strong { color: var(--red); }
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
              ['#overview', 'Our Community Values'],
              ['#respect', 'Respect and Inclusion'],
              ['#anti-discrimination', 'Non-Discrimination'],
              ['#harassment', 'Harassment Policy'],
              ['#safety', 'Safety Requirements'],
              ['#prohibited', 'Prohibited Activities'],
              ['#reviews', 'Reviews and Feedback'],
              ['#reporting', 'Reporting Violations'],
              ['#consequences', 'Consequences'],
              ['#emergency', 'Emergency Contacts'],
            ].map(([href, label]) => (
              <li key={href}><a href={href}>{label}</a></li>
            ))}
          </ul>
        </aside>

        <main className="content">
          <div className="doc-header">
            <div className="doc-label">Legal Policy</div>
            <h1 className="doc-title">Community Standards and Safety Policy</h1>
            <div className="doc-meta">
              <div className="doc-meta-item"><strong>Effective</strong>January 1, 2026</div>
              <div className="doc-meta-item"><strong>Last Updated</strong>January 1, 2026</div>
              <div className="doc-meta-item"><strong>Applies To</strong>All SnapReserve Users</div>
            </div>
            <div className="intro-card">
              SnapReserve is built on trust between guests and hosts. This Community Standards and Safety Policy sets the behavioural expectations for everyone on our platform. These standards apply to all interactions — in messaging, during stays, in reviews, and in any contact with SnapReserve staff. Violations may result in immediate account removal.
            </div>
          </div>

          <div className="section" id="overview">
            <div className="section-number">01</div>
            <h2>Our Community Values</h2>
            <p>SnapReserve is founded on three core community values:</p>
            <ul>
              <li><strong>Safety:</strong> Every stay should be physically safe for guests and hosts alike. We maintain zero tolerance for any threat to personal safety.</li>
              <li><strong>Respect:</strong> Guests and hosts deserve to be treated with dignity regardless of their background, identity, or circumstances.</li>
              <li><strong>Integrity:</strong> Honest communication and accurate representations are essential to a functioning marketplace.</li>
            </ul>
            <p>These values inform every policy decision we make and every enforcement action we take. We expect all community members to uphold them.</p>
          </div>

          <div className="section" id="respect">
            <div className="section-number">02</div>
            <h2>Respect and Inclusion</h2>
            <p>SnapReserve is a platform for everyone. We expect all users to treat each other with basic dignity and respect. This includes:</p>
            <ul>
              <li>Communicating politely and constructively through the SnapReserve messaging system</li>
              <li>Respecting the personal space, belongings, and privacy of others during stays</li>
              <li>Honouring cultural differences and not imposing personal preferences on others</li>
              <li>Refraining from any language or behaviour that demeans, intimidates, or humiliates others</li>
            </ul>
            <p>Both guests and hosts have the right to feel safe and welcome on our platform. SnapReserve will investigate all reported incidents of disrespectful behaviour and take appropriate action.</p>
          </div>

          <div className="section" id="anti-discrimination">
            <div className="section-number">03</div>
            <h2>Non-Discrimination Policy</h2>
            <p>SnapReserve is committed to a marketplace free of unlawful discrimination. Hosts may not refuse bookings or treat guests differently based on:</p>
            <ul>
              <li>Race, colour, ethnicity, or national origin</li>
              <li>Religion or religious practices</li>
              <li>Gender, gender identity, or gender expression</li>
              <li>Sexual orientation or relationship structure</li>
              <li>Disability or health condition</li>
              <li>Familial status or pregnancy</li>
              <li>Age (except where lawfully required, such as properties restricted to adults)</li>
              <li>Citizenship or immigration status, to the extent protected by law</li>
            </ul>
            <p>Hosts may apply neutral, non-discriminatory booking criteria such as requiring a verified identity, minimum account age, or verified reviews. House rules may restrict smoking, parties, or pets — these are property policies, not personal characteristics.</p>
            <p>Guests who believe they have experienced discriminatory treatment should file a report through the platform. SnapReserve investigates all discrimination complaints and may permanently ban hosts found to have engaged in unlawful discrimination.</p>
          </div>

          <div className="section" id="harassment">
            <div className="section-number">04</div>
            <h2>Harassment Policy</h2>
            <p>Harassment of any kind is prohibited on SnapReserve. Harassment includes, but is not limited to:</p>
            <ul>
              <li>Unwanted sexual advances, comments, or requests</li>
              <li>Persistent contact after being asked to stop</li>
              <li>Threatening, intimidating, or abusive language in messages or reviews</li>
              <li>Retaliatory reviews designed to harm rather than inform</li>
              <li>Doxxing — sharing or threatening to share another user's personal information</li>
              <li>Stalking or following a user across the platform or outside it</li>
            </ul>
            <h3>Zero-Tolerance Violations</h3>
            <p>The following behaviours result in immediate permanent account removal with no appeal:</p>
            <ul>
              <li>Sexual assault or coercion</li>
              <li>Physical violence or credible threats of violence</li>
              <li>Child sexual abuse material (CSAM) — reported immediately to the National Center for Missing and Exploited Children (NCMEC)</li>
              <li>Human trafficking or exploitation</li>
            </ul>
          </div>

          <div className="section" id="safety">
            <div className="section-number">05</div>
            <h2>Safety Requirements</h2>
            <h3>Host Safety Obligations</h3>
            <p>All hosts must ensure their properties meet basic safety standards before accepting guests:</p>
            <ul>
              <li>Functioning smoke detector on each habitable floor</li>
              <li>Carbon monoxide detector in properties with fuel-burning appliances</li>
              <li>At least one fire extinguisher, accessible and in-date</li>
              <li>Clear emergency exit routes</li>
              <li>First aid kit on premises</li>
              <li>Secure locks on all exterior doors and windows</li>
            </ul>
            <p>These requirements must be disclosed accurately in listings. SnapReserve may request verification at any time.</p>
            <h3>Privacy and Surveillance</h3>
            <p>Hosts may install exterior security cameras for property monitoring. <strong>Interior surveillance of any kind in private spaces (bedrooms, bathrooms, interior rooms not disclosed to guests) is strictly prohibited</strong> and constitutes grounds for immediate permanent removal from the platform and potential criminal referral.</p>
            <p>All disclosed exterior cameras must be listed in the property description and must not be used to record guests without their knowledge.</p>
          </div>

          <div className="section" id="prohibited">
            <div className="section-number">06</div>
            <h2>Prohibited Activities</h2>
            <p>The following activities are prohibited on or in connection with the SnapReserve platform by all users:</p>
            <ul>
              <li>Using the platform to facilitate the sale, distribution, or use of illegal substances</li>
              <li>Operating illegal businesses or unlicensed commercial activities at listed properties</li>
              <li>Using properties as venues for commercial escort services or prostitution</li>
              <li>Submitting false or fraudulent listings, bookings, or payment claims</li>
              <li>Creating fake reviews, purchasing reviews, or incentivising reviews</li>
              <li>Attempting to circumvent platform fees by conducting bookings outside SnapReserve</li>
              <li>Creating multiple accounts to evade a ban or suspension</li>
              <li>Accessing or attempting to access other users' accounts or platform systems without authorisation</li>
              <li>Scraping, copying, or republishing platform content for commercial purposes</li>
            </ul>
          </div>

          <div className="section" id="reviews">
            <div className="section-number">07</div>
            <h2>Reviews and Feedback</h2>
            <p>Reviews are a critical trust mechanism on SnapReserve. Our review policy:</p>
            <ul>
              <li>Reviews must be honest accounts of the reviewer's genuine experience</li>
              <li>Reviews may not be used to harass, defame, or make knowingly false statements about another user</li>
              <li>Hosts and guests may respond to reviews publicly through the platform</li>
              <li>SnapReserve does not edit review content but may remove reviews that violate this policy</li>
              <li>Reviews involving personal information, discriminatory language, or harassment may be removed</li>
              <li>Removed reviews are flagged in our systems; patterns of removal may trigger account review</li>
            </ul>
            <p>Reviews are not a substitute for reporting serious safety concerns. If a stay involved a safety incident, report it through the Trust &amp; Safety channel in addition to leaving a review.</p>
          </div>

          <div className="section" id="reporting">
            <div className="section-number">08</div>
            <h2>Reporting Violations</h2>
            <p>SnapReserve takes all reports seriously. You can report a violation through:</p>
            <ul>
              <li><strong>In-app reporting:</strong> Use the "Report" button on any listing, message, review, or booking</li>
              <li><strong>Email:</strong> <a href="mailto:trust@snapreserve.app">trust@snapreserve.app</a> for Trust &amp; Safety matters</li>
              <li><strong>Safety emergencies:</strong> Contact local emergency services (911 in the US) first, then notify SnapReserve</li>
            </ul>
            <p>Reports are reviewed by our Trust &amp; Safety team. We treat reporter identity as confidential and will not share your identity with the subject of the report without your consent, except where required by law.</p>
            <div className="highlight">
              <strong>Reporting in good faith:</strong> SnapReserve will not penalise users who make reports in good faith, even if the investigation does not confirm a violation. Knowingly false reports filed to harm another user are themselves a policy violation.
            </div>
          </div>

          <div className="section" id="consequences">
            <div className="section-number">09</div>
            <h2>Consequences of Violations</h2>
            <p>SnapReserve's enforcement team determines appropriate responses based on the severity, frequency, and nature of violations. Actions range from warnings to immediate permanent bans.</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', marginTop: '12px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 14px', background: '#181818', border: '1px solid rgba(255,255,255,0.07)', color: '#6B6762', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Severity</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', background: '#181818', border: '1px solid rgba(255,255,255,0.07)', color: '#6B6762', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Examples</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', background: '#181818', border: '1px solid rgba(255,255,255,0.07)', color: '#6B6762', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Response</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Minor', 'Late check-out, minor house rule breach', 'Warning, note on account'],
                  ['Moderate', 'Unreported damage, misrepresentation, rude behaviour', 'Temporary suspension, review required'],
                  ['Serious', 'Harassment, discrimination, fraudulent review', 'Extended suspension, possible permanent ban'],
                  ['Critical', 'Violence, assault, exploitation, surveillance', 'Immediate permanent ban, law enforcement referral'],
                ].map(([sev, ex, res]) => (
                  <tr key={sev}>
                    <td style={{ padding: '10px 14px', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(232,228,223,0.8)' }}><strong style={{ color: 'var(--text)' }}>{sev}</strong></td>
                    <td style={{ padding: '10px 14px', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(232,228,223,0.8)' }}>{ex}</td>
                    <td style={{ padding: '10px 14px', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(232,228,223,0.8)' }}>{res}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: '16px' }}>Users who are permanently banned may not create new accounts. Circumventing a ban by creating a new account will result in all associated accounts being banned and may lead to legal action.</p>
          </div>

          <div className="section" id="emergency">
            <div className="section-number">10</div>
            <h2>Emergency Contacts and Procedures</h2>
            <div className="emergency-card">
              <p><strong>If you are in immediate danger:</strong> Call 911 (US) or your local emergency number first. Do not wait to contact SnapReserve.</p>
            </div>
            <p>After ensuring your immediate safety, contact SnapReserve's Trust &amp; Safety team:</p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:trust@snapreserve.app">trust@snapreserve.app</a></li>
              <li><strong>In-app:</strong> Report button on your booking page</li>
            </ul>
            <p>For incidents involving minors or suspected human trafficking, contact the National Human Trafficking Hotline at <strong>1-888-373-7888</strong> in addition to local authorities and SnapReserve.</p>
            <p>SnapReserve maintains 24/7 on-call capacity for critical safety incidents involving active bookings.</p>
          </div>

          <div className="contact-card" id="contact">
            <div className="cc-title">Concerns about safety or conduct?</div>
            <div className="cc-sub">Our Trust &amp; Safety team reviews all reports. For urgent matters, email us directly — we respond to critical safety reports within 2 hours.</div>
            <a href="mailto:trust@snapreserve.app" className="cc-btn">Contact Trust &amp; Safety</a>
          </div>
        </main>
      </div>
    </>
  )
}
