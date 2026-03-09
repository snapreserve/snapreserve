# Admin portal login — troubleshooting

If you can’t log in to the admin portal, check the following (testing/staging only).

---

## 1. You’re redirected to login with no message

- **Cause:** Session expired or not logged in.
- **Fix:** Sign in with your admin email and password (or Google). You’ll then be sent to MFA verify if you’re going to `/admin`.

---

## 2. “This account does not have access to the admin portal”

- **Cause:** Your user has no row in `admin_roles`, or the row has `is_active = false`.
- **Fix:** A **super admin** must add you:
  - Super Admin → **Roles** (or **Permissions**): find your user by email and assign a role (e.g. `admin`, `support`, `finance`), or
  - Insert a row in the `admin_roles` table: `user_id` = your auth user id, `role` = e.g. `admin`, `is_active` = true.

---

## 3. After login you’re sent to MFA verify, then back to login or an error

- **Cause:** Admin requires **AAL2** (second factor). Either you haven’t set up MFA, or the session didn’t upgrade to AAL2 after entering the code.
- **Fix:**
  - If you’ve never set up MFA: complete **Admin MFA setup** when redirected there (scan QR with authenticator app).
  - If you already have MFA: enter the current 6-digit code on the MFA verify page. If it still fails, try signing out completely, then sign in again and complete MFA verify in one go.
  - Ensure you’re using the same browser and that cookies aren’t blocked for the site (same domain as the app).

---

## 4. You sign in but immediately get redirected back to login

- **Cause:** Often **no admin role** (see #2) or **MFA not at AAL2**. The middleware and API both require a valid session + AAL2 + an active `admin_roles` row.
- **Fix:** Confirm in the database that your user has an `admin_roles` row with `is_active = true`. Then sign in again and complete the MFA step without closing the tab.

---

## 5. Works in one browser or device but not another

- **Cause:** Session/cookies are per browser. MFA and admin role are per user.
- **Fix:** Sign in and complete MFA in that browser. If the other browser is on a different domain (e.g. staging vs prod), you need to sign in (and do MFA) there too.

---

## Quick checklist (for super admins)

When an admin can’t log in:

1. **admin_roles:** There is a row with their `user_id`, desired `role`, and `is_active = true`.
2. **MFA:** They have completed MFA setup (Super Admin can’t disable MFA for admin).
3. **Session:** They sign in, then complete “Two-factor verification” when redirected; only then does the session become AAL2 and allow admin access.

All changes in this doc apply to the **testing** environment only; production is updated only by promoting from staging.
