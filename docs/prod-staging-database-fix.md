# Prod admin portal pointing to staging database

**Symptom:** On production (snapreserve.app), the admin portal (or the whole site) shows data from the staging database.

**Cause:** The **production** deployment is using the **staging** Supabase project. The app does not switch database by domain — it uses whatever `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set for that build.

---

## Fix (Netlify)

1. Open your Netlify project → **Site configuration** → **Environment variables**.
2. Ensure the **Production** context (or the scope that your prod deploy uses) has:
   - `NEXT_PUBLIC_SUPABASE_URL` = your **production** Supabase project URL (e.g. `https://xxxxx.supabase.co`).
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your **production** Supabase anon (public) key.
3. Do **not** leave these blank in Production if they're only set in a shared "All" or "Staging" scope — Production needs its own values pointing to the prod Supabase project.
4. Trigger a **new production deploy** (redeploy) so the new env vars are baked into the build.

---

## If you use one Supabase for both

If you use a single Supabase project for both staging and prod (one DB), then both deployments can use the same URL/keys; you'd see the same data on both sites. To have prod use a **different** database, create a second Supabase project for production and set prod's env vars to that project's URL and anon key.
