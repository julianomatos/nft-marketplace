import type { NftFacets, NftSearchParams } from '@/types/contracts'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RangeSlider } from '@/components/ui/range-slider'
import type { Network } from '@/types/contracts'
import { compare } from '@/utils/eth'

type CatalogFilterPanelProps = {
  facets: NftFacets
  search: NftSearchParams
  priceDraft: [string, string]
  onPriceDraftChange: (value: [string, string]) => void
  onChange: (updates: Partial<NftSearchParams>) => void
}

function CatalogFilterPanel({
  facets,
  search,
  priceDraft,
  onPriceDraftChange,
  onChange,
}: CatalogFilterPanelProps) {
  function toggleCategory(categoryId: string, selected: boolean) {
    const categories = search.category ?? []
    const next = selected
      ? [...categories, categoryId]
      : categories.filter((id) => id !== categoryId)
    onChange({ category: next.length > 0 ? next : undefined })
  }

  function toggleNetwork(networkId: Network, selected: boolean) {
    const networks = search.network ?? []
    const next = selected
      ? [...networks, networkId]
      : networks.filter((id) => id !== networkId)
    onChange({ network: next.length > 0 ? next : undefined })
  }

  function applyPriceRange() {
    const [minPrice, maxPrice] = priceDraft
    onChange({
      minPrice:
        compare(minPrice, facets.priceRange.min) === 0
          ? undefined
          : minPrice,
      maxPrice:
        compare(maxPrice, facets.priceRange.max) === 0
          ? undefined
          : maxPrice,
    })
  }

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="mb-4 text-lg font-bold text-foreground">
          Coleções
        </legend>
        <div className="space-y-3">
          {facets.categories.map((category) => (
            <Checkbox
              checked={(search.category ?? []).includes(category.id)}
              key={category.id}
              label={
                <span className="flex w-full items-center justify-between gap-3">
                  <span>{category.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {category.count}
                  </span>
                </span>
              }
              onChange={(event) =>
                toggleCategory(category.id, event.currentTarget.checked)
              }
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-4 text-lg font-bold text-foreground">
          Faixa de preço
        </legend>
        <RangeSlider
          label="Preço"
          max={facets.priceRange.max}
          min={facets.priceRange.min}
          onValueChange={onPriceDraftChange}
          step="0.01"
          value={priceDraft}
        />
        <Button
          className="mt-4 w-full"
          onClick={applyPriceRange}
          type="button"
          variant="outline"
        >
          Aplicar
        </Button>
      </fieldset>

      <fieldset>
        <legend className="mb-4 text-lg font-bold text-foreground">Rede</legend>
        <div className="space-y-3">
          {facets.networks.map((network) => (
            <Checkbox
              checked={(search.network ?? []).includes(network.id)}
              key={network.id}
              label={
                <span className="flex w-full items-center justify-between gap-3">
                  <span>{network.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {network.count}
                  </span>
                </span>
              }
              onChange={(event) =>
                toggleNetwork(network.id, event.currentTarget.checked)
              }
            />
          ))}
        </div>
      </fieldset>
    </div>
  )
}

export { CatalogFilterPanel }
