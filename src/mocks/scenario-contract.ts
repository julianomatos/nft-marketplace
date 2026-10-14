import { z } from 'zod'

export const MOCK_SCENARIOS = [
  'success',
  'empty',
  'design-cart',
  'expired-session',
  'network-error',
  'server-error',
  'unauthorized',
  'signup-conflict',
  'validation-error',
  'invalid-coupon',
  'expired-coupon',
  'price-changed',
  'sold-out',
  'timeout-after-order',
  'payment-confirmed',
  'payment-rejected',
  'variable-latency',
] as const

export const mockScenarioSchema = z.enum(MOCK_SCENARIOS)
export type MockScenario = z.infer<typeof mockScenarioSchema>

export function isMockScenario(value: unknown): value is MockScenario {
  return mockScenarioSchema.safeParse(value).success
}
