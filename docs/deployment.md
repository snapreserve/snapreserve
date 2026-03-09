# Staging vs Production — Keeping the site up to date

**Staging (testing)** and **Production (main site)** are two separate deployments. Test on staging first; when you’re happy, promote the same code to production.

---

## Rule: No production changes without explicit approval

**Do not make any changes to the production environment unless specifically approved.** Production data is different and must not be modified during testing.

- All development and testing happen on **staging** (website) and **testing builds** (app) only.
- **Website:** staging branch and staging deploy; production only when you approve.
- **App:** testing/internal build first; production (App Store / Play Store) only when you approve. Production app data is separate — do not point the app at prod during development.
- Do not merge to `main`, push to `main`, trigger production deploys, or ship production app builds without that approval.

---

## 1. What each environment is for

| | **Staging (testing)** | **Production (main)** |
|---|------------------------|------------------------|
| **URL** | e.g. `staging.snapreserve.app` | e.g. `snapreserve.app` |
| **Purpose** | Test new features and fixes before they go live | Live site for real users |
| **Banner** | Shows “STAGING – NOT LIVE” (by hostname) | No banner |
| **Stripe** | Use **test** keys (`sk_test_*`, `pk_test_*`) | Use **live** keys (`sk_live_*`, `pk_live_*`) |
| **Env var** | `NEXT_PUBLIC_APP_ENV=staging` | `NEXT_PUBLIC_APP_ENV=production` |
| **Redirect URL** | OAuth uses **current origin** so login always returns to the same site. Do **not** set `NEXT_PUBLIC_SITE_URL` to a different domain (e.g. prod must not use the staging URL). |

---

## 2. Recommended workflow (keep prod up to date safely)

1. **Do all development and testing on staging**
   - Push changes to your **staging** branch (e.g. `staging` or `develop`).
   - Your hosting (Vercel/Netlify) deploys that branch to **staging.snapreserve.app**.
   - Test there: payments (test cards), waitlist, admin, host flows, etc.

2. **When staging looks good, promote to production**
   - Merge **staging → main** (or your production branch).
   - Push to **main**. Your host deploys that to **snapreserve.app**.
   - Production is now running the same code you tested on staging.

3. **Keep branches in sync**
   - After releasing, optionally merge **main** back into **staging** so the next round of work starts from the latest prod.

---

## 3. Hosting setup (per environment)

Configure **two** deployments (or two environments in one project):

| Setting | Staging deployment | Production deployment |
|--------|--------------------|------------------------|
| **Branch** | `staging` (or `develop`) | `main` |
| **Domain** | `staging.snapreserve.app` | `snapreserve.app` |
| **`NEXT_PUBLIC_APP_ENV`** | `staging` | `production` |
| **Stripe keys** | Test keys | Live keys |
| **Supabase** | Staging Supabase URL + anon key | **Production** Supabase URL + anon key (see below) |

**Important:** Prod and staging must use **different** Supabase env vars if you have separate databases. If prod admin portal is showing staging data, see [Prod pointing to staging database](prod-staging-database-fix.md). The app does not switch DB by domain — it uses whatever `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set for that build. If your production site (e.g. Netlify “Production”) has the staging Supabase URL/keys, the prod admin portal (and entire site) will talk to the staging database.

The app uses **hostname** to show the “STAGING” banner, so even if an env var is wrong, the main domain never shows the test banner.

---

## 4. Making sure updates are implemented for staging first

All updates (code and database) should be applied to **staging** before production.

### Code (website / app)

- **Staging:** Push to your **staging** branch (e.g. `git push origin staging`). Your host deploys that branch to the staging site. All feature work and testing happen here.
- **Production:** Only after staging is verified, merge to `main` and deploy prod when you explicitly approve.

### Database (Supabase)

- **Staging DB first:** Run any new migrations against your **staging** Supabase project only.
  - In Supabase Dashboard: open your **staging** project → SQL Editor → run the migration SQL from `supabase/migrations/`.
  - Or with Supabase CLI linked to staging: `supabase db push` (ensure your CLI is using staging project env).
- **Production DB later:** Run the same migration(s) against the **production** Supabase project only when you promote that release to production.

**Checklist when adding a feature that touches the DB:**

1. Push code to `staging` branch.
2. Run new migrations on **staging** Supabase only.
3. Test on the staging site.
4. When ready for prod: merge to `main`, deploy prod, then run the same migrations on **production** Supabase.

---

## 5. Making sure the website is up to date

- **Staging:** Deploys automatically when you push to the staging branch (if auto-deploy is on). To update: push to `staging` and wait for the build.
- **Production:** Should only be updated **after** you’ve tested on staging. To update prod: merge staging into `main` and push (or tag a release and deploy that). Then trigger a production deploy.

**One-line summary:** Test on staging → merge to main → deploy prod. That way prod always gets updates only after they’re validated on the testing site.
