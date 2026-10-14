import Decimal from 'decimal.js'
import type { ChangeEvent, CSSProperties } from 'react'

type RangeSliderProps = {
  label: string
  min: string
  max: string
  step: string
  value: readonly [string, string]
  onValueChange: (value: [string, string]) => void
  unit?: string
}

function RangeSlider({
  label,
  min,
  max,
  step,
  value,
  onValueChange,
  unit = 'ETH',
}: RangeSliderProps) {
  const minValue = new Decimal(min)
  const maxValue = new Decimal(max)
  const stepValue = new Decimal(step)
  const lowerValue = new Decimal(value[0])
  const upperValue = new Decimal(value[1])
  const range = maxValue.minus(minValue)

  if (
    !minValue.isFinite() ||
    !maxValue.isFinite() ||
    !stepValue.isFinite() ||
    !lowerValue.isFinite() ||
    !upperValue.isFinite() ||
    range.lte(0) ||
    stepValue.lte(0) ||
    lowerValue.lt(minValue) ||
    upperValue.gt(maxValue) ||
    lowerValue.gt(upperValue)
  ) {
    throw new RangeError('Range slider values must be finite and within bounds.')
  }

  const startPercent = lowerValue.minus(minValue).div(range).mul(100).toFixed()
  const endPercent = upperValue.minus(minValue).div(range).mul(100).toFixed()
  const trackStyle: CSSProperties = {
    background: `linear-gradient(to right, var(--border) ${startPercent}%, var(--primary) ${startPercent}%, var(--primary) ${endPercent}%, var(--border) ${endPercent}%)`,
  }

  function handleLowerChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = Decimal.min(
      Decimal.max(new Decimal(event.currentTarget.value), minValue),
      upperValue,
    )
    onValueChange([nextValue.toFixed(), value[1]])
  }

  function handleUpperChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = Decimal.max(
      Decimal.min(new Decimal(event.currentTarget.value), maxValue),
      lowerValue,
    )
    onValueChange([value[0], nextValue.toFixed()])
  }

  return (
    <div aria-label={label} className="space-y-3" role="group">
      <div className="range-slider-track" style={trackStyle}>
        <input
          aria-label={`${label}: mínimo`}
          aria-valuetext={`${value[0]} ${unit}`}
          className="range-slider-input range-slider-input-lower"
          max={max}
          min={min}
          onChange={handleLowerChange}
          step={step}
          type="range"
          value={value[0]}
        />
        <input
          aria-label={`${label}: máximo`}
          aria-valuetext={`${value[1]} ${unit}`}
          className="range-slider-input range-slider-input-upper"
          max={max}
          min={min}
          onChange={handleUpperChange}
          step={step}
          type="range"
          value={value[1]}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {label}: {value[0]} – {value[1]} {unit}
      </p>
    </div>
  )
}

export { RangeSlider, type RangeSliderProps }
