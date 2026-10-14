import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

type TabItem = {
  value: string
  label: ReactNode
  content: ReactNode
}

type TabsProps = {
  ariaLabel: string
  items: TabItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

function Tabs({
  ariaLabel,
  items,
  value,
  defaultValue,
  onValueChange,
}: TabsProps) {
  const generatedId = useId()
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? items[0]?.value ?? '',
  )
  const selectedValue = value ?? internalValue

  if (items.length === 0) {
    throw new Error('Tabs requires at least one item.')
  }
  if (new Set(items.map((item) => item.value)).size !== items.length) {
    throw new Error('Tab values must be unique.')
  }
  if (!items.some((item) => item.value === selectedValue)) {
    throw new Error('The selected tab must match an item value.')
  }

  function selectTab(nextValue: string) {
    if (value === undefined) setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | undefined

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % items.length
    if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + items.length) % items.length
    }
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = items.length - 1
    if (nextIndex === undefined) return

    event.preventDefault()
    const nextValue = items[nextIndex].value
    selectTab(nextValue)
    tabRefs.current.get(nextValue)?.focus()
  }

  const selectedIndex = items.findIndex((item) => item.value === selectedValue)

  return (
    <div>
      <div
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        className="flex border-b border-border"
        role="tablist"
      >
        {items.map((item, index) => {
          const active = item.value === selectedValue
          const tabId = `${generatedId}-tab-${index}`
          const panelId = `${generatedId}-panel-${index}`

          return (
            <button
              aria-controls={panelId}
              aria-selected={active}
              className={`min-h-10 border-b-2 px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                active
                  ? 'border-primary font-bold text-highlight'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              id={tabId}
              key={item.value}
              onClick={() => selectTab(item.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              ref={(node) => {
                if (node) tabRefs.current.set(item.value, node)
                else tabRefs.current.delete(item.value)
              }}
              role="tab"
              tabIndex={active ? 0 : -1}
              type="button"
            >
              {item.label}
            </button>
          )
        })}
      </div>
      {items.map((item, index) => (
        <div
          aria-labelledby={`${generatedId}-tab-${index}`}
          className="py-4 focus-visible:outline-2 focus-visible:outline-ring"
          hidden={index !== selectedIndex}
          id={`${generatedId}-panel-${index}`}
          key={item.value}
          role="tabpanel"
          tabIndex={0}
        >
          {item.content}
        </div>
      ))}
    </div>
  )
}

export { Tabs, type TabItem, type TabsProps }
