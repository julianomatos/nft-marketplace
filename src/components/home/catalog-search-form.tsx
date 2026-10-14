import { Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'

type CatalogSearchFormProps = {
  inputId: string
  mobile?: boolean
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onOpenFilters?: () => void
  filtersDisabled?: boolean
}

function CatalogSearchForm({
  inputId,
  mobile = false,
  value,
  onChange,
  onSubmit,
  onOpenFilters,
  filtersDisabled = false,
}: CatalogSearchFormProps) {
  return (
    <form
      className={
        mobile
          ? 'flex gap-2'
          : 'hidden w-full max-w-md gap-2 lg:flex'
      }
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      role="search"
    >
      <label className="sr-only" htmlFor={inputId}>
        Buscar NFTs
      </label>
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
          size={16}
        />
        <input
          className={
            mobile
              ? 'min-h-12 w-full rounded-2xl border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
              : 'min-h-10 w-full border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
          }
          id={inputId}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder="Explorar coleções"
          type="search"
          value={value}
        />
      </div>
      {!mobile && (
        <Button aria-label="Buscar" size="icon" type="submit">
          <Search aria-hidden="true" size={18} />
        </Button>
      )}
      {mobile && (
        <Button
          aria-label="Abrir filtros"
          className="min-h-12 min-w-12 rounded-2xl bg-primary-gradient text-primary-foreground"
          disabled={filtersDisabled}
          onClick={onOpenFilters}
          size="icon"
          type="button"
        >
          <SlidersHorizontal aria-hidden="true" size={18} />
        </Button>
      )}
    </form>
  )
}

export { CatalogSearchForm }
