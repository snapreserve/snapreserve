# Testing on iPad Pro 13" (12.9")

Use these viewport sizes to test the web app at **iPad Pro 12.9"** (often called 13") in browser DevTools or on a real device.

## Viewport dimensions (CSS pixels)

| Orientation | Width × Height | Notes |
|-------------|----------------|-------|
| **Portrait**  | 1024 × 1366 | Default when holding upright |
| **Landscape** | 1366 × 1024 | Common for Explore/booking flows |

(Safari on iPad Pro 12.9" uses these viewport sizes; device pixel ratio is 2.)

---

## 1. Chrome DevTools (desktop)

1. Run the app: `npm run dev` (or `npm run dev:ipad`).
2. Open http://localhost:3000 in Chrome.
3. **F12** → toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M).
4. Click the device dropdown → **Edit** → **Add custom device**:
   - **Device name:** iPad Pro 13"
   - **Width:** 1024
   - **Height:** 1366
   - **Device pixel ratio:** 2
5. Select **iPad Pro 13"** and refresh. Switch to **Landscape** (1366×1024) if needed.

---

## 2. Safari Responsive Design Mode (Mac)

1. **Develop** → **Enter Responsive Design Mode** (or Cmd+Option+R).
2. Set dimensions to **1024 × 1366** (portrait) or **1366 × 1024** (landscape).

---

## 3. Real iPad Pro 13"

- Open **staging.snapreserve.app** or **snapreserve.app** in Safari.
- Or, on the same Wi‑Fi as your Mac: use your dev server URL (e.g. `http://<your-mac-ip>:3000`) so the iPad hits the local app.

---

## Quick checklist

- [ ] Explore: filter chips and grid look correct in portrait and landscape.
- [ ] Listing detail: booking sidebar and gallery usable.
- [ ] Booking/checkout: Stripe Payment Element fits and is tappable.
- [ ] Confirmation page: readable and buttons work.
