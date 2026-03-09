# Slack workspace setup — channel structure

Use this as a checklist to create and organize channels in your SnapReserve Slack workspace.

---

## 1. Create the channels

In Slack: **Right‑click your workspace name** → **Settings & administration** → **Manage apps** (or create channels from the **+** next to **Channels**).

Create these channels (names without `#`; Slack adds the #):

### GENERAL
| Channel name   | Purpose |
|----------------|--------|
| `general`      | Company-wide discussion, all-hands |
| `announcements`| Product/company announcements (post-only or limited) |
| `random`       | Off-topic, watercooler |

### PRODUCT
| Channel name       | Purpose |
|--------------------|--------|
| `product`          | Product strategy, roadmap, prioritization |
| `feature-requests` | User/stakeholder feature ideas and triage |
| `bug-reports`      | Bug reports and reproduction |

### ENGINEERING
| Channel name  | Purpose |
|---------------|--------|
| `engineering`  | Engineering-wide updates, architecture |
| `frontend`     | Web/frontend (Next.js, UI) |
| `backend`      | API, Supabase, services |
| `mobile-app`   | iOS/Android app development |
| `deployments`  | Deploy status, releases, rollbacks |

### INFRASTRUCTURE
| Channel name | Purpose |
|--------------|--------|
| `devops`     | CI/CD, hosting (Netlify/Vercel), infra |
| `security`   | Security incidents, auth, compliance |
| `alerts`     | Automated alerts (errors, uptime, etc.) |

### OPERATIONS
| Channel name     | Purpose |
|------------------|--------|
| `support`        | Customer support, tickets |
| `host-approvals` | Host onboarding/approval workflow |
| `listing-reviews`| Listing moderation, quality |
| `trust-safety`   | Trust & safety, appeals, policy |

---

## 2. Organize the sidebar with sections

1. In Slack, click **Channels** in the sidebar.
2. Click the **⋯** or **More** next to **Channels**.
3. Choose **Create section** (or **Organize sidebar**).
4. Create sections and drag channels into them, for example:

   - **GENERAL** → `#general`, `#announcements`, `#random`
   - **PRODUCT** → `#product`, `#feature-requests`, `#bug-reports`
   - **ENGINEERING** → `#engineering`, `#frontend`, `#backend`, `#mobile-app`, `#deployments`
   - **INFRASTRUCTURE** → `#devops`, `#security`, `#alerts`
   - **OPERATIONS** → `#support`, `#host-approvals`, `#listing-reviews`, `#trust-safety`

---

## 3. Optional: channel settings

- **#announcements**: Consider making it **post-only** for admins (channel settings → Permissions).
- **#alerts**: Good target for incoming webhooks (e.g. error tracking, deploy notifications).
- **#deployments**: Connect Netlify/Vercel or your CI to post deploy success/failure here.
- **#bug-reports**: Can be fed by a form or “Report bug” flow that posts here.

---

## 4. Reference list (for bots or integrations)

When adding Slack webhooks or a bot, use these channel IDs or names:

```
#general
#announcements
#random
#product
#feature-requests
#bug-reports
#engineering
#frontend
#backend
#mobile-app
#deployments
#devops
#security
#alerts
#support
#host-approvals
#listing-reviews
#trust-safety
```

To get channel IDs: right‑click a channel → **View channel details** → scroll to the bottom for the ID (or use Slack API).
