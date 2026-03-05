/**
 * SnapReserve Platform Fee — charged to hosts, NOT shown to guests.
 *
 * Hosts pay:
 *   7% of booking total  (platform_fee)
 *  +$1 fixed per booking  (platform_fixed_fee)
 *  = total_platform_fee
 *
 * Host payout = booking_total - total_platform_fee
 */

export const PLATFORM_FEE_PCT   = 0.07   // 7%
export const PLATFORM_FEE_FIXED = 1.00   // $1 per booking

/**
 * Calculate the full fee breakdown for a booking.
 * @param {number} totalAmount  — the guest's total payment (room + cleaning)
 * @returns {{ platformFee, platformFixedFee, totalPlatformFee, hostPayout }}
 */
export function calcPlatformFee(totalAmount) {
  const platformFee       = Math.round(totalAmount * PLATFORM_FEE_PCT * 100) / 100
  const platformFixedFee  = PLATFORM_FEE_FIXED
  const totalPlatformFee  = Math.round((platformFee + platformFixedFee) * 100) / 100
  const hostPayout        = Math.round((totalAmount - totalPlatformFee) * 100) / 100
  return { platformFee, platformFixedFee, totalPlatformFee, hostPayout }
}

/**
 * Calculate host payout from booking columns (handles both legacy and new bookings).
 * Legacy bookings used service_fee (guest-side); new bookings use platform_fee + platform_fixed_fee.
 * @param {{ total_amount, platform_fee, platform_fixed_fee, service_fee }} booking
 */
export function bookingHostPayout(booking) {
  const total = Number(booking.total_amount) || 0
  // New fee structure
  if (Number(booking.platform_fee) > 0 || Number(booking.platform_fixed_fee) > 0) {
    const fee = (Number(booking.platform_fee) || 0) + (Number(booking.platform_fixed_fee) || 0)
    return Math.max(0, Math.round((total - fee) * 100) / 100)
  }
  // Legacy: fall back to service_fee (old guest-side 3.2% approach)
  return Math.max(0, Math.round((total - (Number(booking.service_fee) || 0)) * 100) / 100)
}
