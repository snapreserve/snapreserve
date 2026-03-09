# Staging vs Production — Keeping the site up to date

**Staging (testing)** and **Production (main site)** are two separate deployments. Test on staging first; when you’re happy, promote the same code to production.

---

## Rule: Only change testing — never touch prod directly

**All code and config changes are made only for the testing (staging) environment.** Production is updated only by promoting tested changes from staging (e.g. merge to `main` and deploy). Do not apply changes directly to production.

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
| **Supabase** | Same project is fine; or separate project for staging if you prefer |

The app uses **hostname** to show the “STAGING” banner, so even if an env var is wrong, the main domain never shows the test banner.

---

## 4. Making sure the website is up to date

- **Staging:** Deploys automatically when you push to the staging branch (if auto-deploy is on). To update: push to `staging` and wait for the build.
- **Production:** Should only be updated **after** you’ve tested on staging. To update prod: merge staging into `main` and push (or tag a release and deploy that). Then trigger a production deploy.

**One-line summary:** Test on staging → merge to main → deploy prod. That way prod always gets updates only after they’re validated on the testing site.
