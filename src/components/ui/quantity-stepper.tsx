import { Minus, Plus } from 'lucide-react'
import { Button } from './button'

type QuantityStepperProps = {
  value: number
  onValueChange: (value: number) => void
  label: string
  min?: number
  max?: number
  disabled?: boolean
  size?: 'compact' | 'detail'
}

function QuantityStepper({
  value,
  onValueChange,
  label,
  min = 1,
  max,
  disabled = false,
  size = 'compact',
}: QuantityStepperProps) {
  if (!Number.isInteger(value) || !Number.isInteger(min) || min < 1) {
    throw new RangeError('Quantity and minimum must be positive integers.')
  }
  if (max !== undefined && (!Number.isInteger(max) || max < min)) {
    throw new RangeError('Maximum quantity must be an integer no smaller than min.')
  }
  if (value < min || (max !== undefined && value > max)) {
    throw new RangeError('Quantity must be within the configured bounds.')
  }

  const isDetail = size === 'detail'
  const buttonClassName = isDetail
    ? 'size-12 rounded-full bg-primary text-primary-foreground hover:bg-highlight'
    : 'rounded-full'

  return (
    <div
      aria-label={label}
      className={`inline-flex items-center ${isDetail ? 'gap-4' : 'gap-3'}`}
      role="group"
    >
      <Button
        aria-label={`Diminuir ${label}`}
        disabled={disabled || value <= min}
        onClick={() => onValueChange(value - 1)}
        className={buttonClassName}
        size={isDetail ? 'icon-lg' : 'icon-sm'}
        type="button"
        variant={isDetail ? 'default' : 'outline'}
      >
        <Minus aria-hidden="true" size={isDetail ? 20 : 14} />
      </Button>
      <output
        aria-live="polite"
        className={`text-center ${isDetail ? 'min-w-8 text-lg' : 'min-w-6 text-sm'}`}
      >
        {value}
      </output>
      <Button
        aria-label={`Aumentar ${label}`}
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={() => onValueChange(value + 1)}
        className={buttonClassName}
        size={isDetail ? 'icon-lg' : 'icon-sm'}
        type="button"
        variant={isDetail ? 'default' : 'outline'}
      >
        <Plus aria-hidden="true" size={isDetail ? 20 : 14} />
      </Button>
    </div>
  )
}

export { QuantityStepper, type QuantityStepperProps }
