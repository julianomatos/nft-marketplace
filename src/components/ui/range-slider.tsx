import type { ChangeEvent, CSSProperties } from 'react'
import { clamp, compare, format, rangePercentage } from '@/utils/eth'

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
  if (
    compare(min, max) >= 0 ||
    compare(step, '0') <= 0 ||
    compare(value[0], min) < 0 ||
    compare(value[1], max) > 0 ||
    compare(value[0], value[1]) > 0
  ) {
    throw new RangeError('Range slider values must be finite and within bounds.')
  }

  const startPercent = rangePercentage(value[0], min, max)
  const endPercent = rangePercentage(value[1], min, max)
  const trackStyle: CSSProperties = {
    background: `linear-gradient(to right, var(--border) ${startPercent}%, var(--primary) ${startPercent}%, var(--primary) ${endPercent}%, var(--border) ${endPercent}%)`,
  }

  function handleLowerChange(event: ChangeEvent<HTMLInputElement>) {
    onValueChange([
      clamp(event.currentTarget.value, min, value[1]),
      value[1],
    ])
  }

  function handleUpperChange(event: ChangeEvent<HTMLInputElement>) {
    onValueChange([
      value[0],
      clamp(event.currentTarget.value, value[0], max),
    ])
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
        {label}: {format(value[0])} – {format(value[1])} {unit}
      </p>
    </div>
  )
}

export { RangeSlider, type RangeSliderProps }
