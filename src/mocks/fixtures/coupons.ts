import type { CouponRecord } from '../types'

export const coupons = [
  {
    code: 'KURIO10',
    status: 'valid',
    discountPercent: 10,
    expiresAt: '2026-12-31T23:59:59.000Z',
  },
  {
    code: 'EXPIRED20',
    status: 'expired',
    discountPercent: 20,
    expiresAt: '2026-07-01T00:00:00.000Z',
  },
] as const satisfies readonly CouponRecord[]

export const INVALID_COUPON_EXAMPLE = 'INVALID-COUPON'
