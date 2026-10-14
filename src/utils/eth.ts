import Decimal from 'decimal.js'

const EthDecimal = Decimal.clone({ precision: 80 })
const DECIMAL_STRING_PATTERN = /^-?\d+(?:\.\d+)?$/

function toDecimal(value: string) {
  if (!DECIMAL_STRING_PATTERN.test(value)) {
    throw new RangeError('ETH values must be finite decimal strings.')
  }

  const decimal = new EthDecimal(value)
  if (!decimal.isFinite()) {
    throw new RangeError('ETH values must be finite decimal strings.')
  }
  return decimal
}

function add(left: string, right: string) {
  return toDecimal(left).plus(toDecimal(right)).toFixed()
}

function mul(left: string, right: string) {
  return toDecimal(left).mul(toDecimal(right)).toFixed()
}

function div(left: string, right: string) {
  const divisor = toDecimal(right)
  if (divisor.isZero()) {
    throw new RangeError('ETH division requires a non-zero divisor.')
  }
  return toDecimal(left).div(divisor).toFixed()
}

function sum(values: readonly string[]) {
  return values.reduce(
    (total, value) => total.plus(toDecimal(value)),
    new EthDecimal(0),
  ).toFixed()
}

function compare(left: string, right: string): -1 | 0 | 1 {
  const result = toDecimal(left).comparedTo(toDecimal(right))
  if (result === null) {
    throw new RangeError('ETH values must be finite decimal strings.')
  }
  if (result < 0) return -1
  if (result > 0) return 1
  if (result === 0) return 0
  throw new RangeError('ETH values must be finite decimal strings.')
}

function format(value: string) {
  toDecimal(value)
  return value
}

function clamp(value: string, min: string, max: string) {
  const decimalMin = toDecimal(min)
  const decimalMax = toDecimal(max)

  if (decimalMin.gt(decimalMax)) {
    throw new RangeError('ETH range minimum must not exceed its maximum.')
  }

  return EthDecimal.max(decimalMin, EthDecimal.min(toDecimal(value), decimalMax))
    .toFixed()
}

function rangePercentage(value: string, min: string, max: string) {
  const decimalValue = toDecimal(value)
  const decimalMin = toDecimal(min)
  const decimalMax = toDecimal(max)

  if (
    decimalMax.lte(decimalMin) ||
    decimalValue.lt(decimalMin) ||
    decimalValue.gt(decimalMax)
  ) {
    throw new RangeError('ETH range percentage values must be within bounds.')
  }

  return decimalValue
    .minus(decimalMin)
    .div(decimalMax.minus(decimalMin))
    .mul(100)
    .toFixed()
}

export { add, clamp, compare, div, format, mul, rangePercentage, sum }
