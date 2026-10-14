import { expect, test } from '@playwright/test'
import {
  add,
  clamp,
  compare,
  format,
  mul,
  rangePercentage,
  sum,
} from '../src/utils/eth'

test('calculates ETH values without binary floating-point loss', () => {
  expect(add('0.1', '0.2')).toBe('0.3')
  expect(mul('1.19', '2')).toBe('2.38')
  expect(sum(['2.38', '8.34', '16.11', '0.016'])).toBe('26.846')
  expect(sum([])).toBe('0')
})

test('compares decimal strings by value and preserves API formatting', () => {
  expect(compare('0.1', '0.10')).toBe(0)
  expect(compare('0.09', '0.1')).toBe(-1)
  expect(compare('1.01', '1.001')).toBe(1)
  expect(format('1.2300')).toBe('1.2300')
  expect(format('1.2345678901234567890123456789')).toBe(
    '1.2345678901234567890123456789',
  )
})

test('clamps range values and calculates slider percentages with decimals', () => {
  expect(clamp('0.1', '0.2', '1')).toBe('0.2')
  expect(clamp('1.2', '0.2', '1')).toBe('1')
  expect(rangePercentage('0.3', '0.2', '1.2')).toBe('10')
})

test('rejects non-finite amounts and invalid range bounds', () => {
  expect(() => format('Infinity')).toThrow(RangeError)
  expect(() => format('1e-7')).toThrow(RangeError)
  expect(() => compare('NaN', '0')).toThrow()
  expect(() => clamp('0.5', '1', '0')).toThrow(RangeError)
  expect(() => rangePercentage('0.5', '0.5', '0.5')).toThrow(RangeError)
})
