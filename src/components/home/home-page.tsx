import { useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { ModalSurface } from '@/components/ui/dialog'
import { CatalogSearchForm } from '@/components/home/catalog-search-form'
import { NftCard } from '@/components/home/nft-card'
import { CatalogFilterPanel } from '@/components/home/catalog-filter-panel'
import { HomeIntro } from '@/components/home/home-intro'
import { useNftCatalog } from '@/hooks/use-nft-catalog'
import { useFeaturedNfts } from '@/hooks/use-featured-nfts'
import { format } from '@/utils/eth'
import {
  nftSearchParamsSchema,
  nftSortSchema,
  type NftSearchParams,
} from '@/types/contracts'
import { updateNftSearchParams } from '@/utils/search-params'
import { homePromoBanners, mintJournalTeasers } from '@/content/home-copy'
import { compare } from '@/utils/eth'

function CatalogSkeleton() {
  return (
    <div
      aria-label="Carregando catálogo"
      className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-8 md:gap-y-10"
      role="status"
    >
      {Array.from({ length: 9 }, (_, index) => (
        <div className="min-w-0" key={index}>
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="mt-3 h-4 w-4/5" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
      ))}
      <span className="sr-only">Carregando NFTs</span>
    </div>
  )
}

function HomePage() {
  const search = nftSearchParamsSchema.parse(useSearch({ from: '/' }))
  const navigate = useNavigate({ from: '/' })
  const [searchDraftState, setSearchDraftState] = useState<{
    query: string
    value: string
  } | null>(null)
  const [priceDraftState, setPriceDraftState] = useState<{
    key: string
    value: [string, string]
  } | null>(null)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const catalogQuery = useNftCatalog(search)
  const featuredQuery = useFeaturedNfts()
  const spotlight = featuredQuery.data?.featured
  const spotlightImage = spotlight?.images[0]
  const facets = catalogQuery.data?.facets
  const searchQuery = search.q ?? ''
  const searchDraft =
    searchDraftState?.query === searchQuery
      ? searchDraftState.value
      : searchQuery
  const priceRange = facets?.priceRange
  const priceDraftKey = priceRange
    ? [
        search.minPrice ?? '',
        search.maxPrice ?? '',
        priceRange.min,
        priceRange.max,
      ].join('|')
    : ''
  const priceDraft =
    priceDraftState?.key === priceDraftKey && priceDraftKey
      ? priceDraftState.value
      : getPriceDraft(search, priceRange)

  function updateSearch(updates: Partial<NftSearchParams>) {
    void navigate({
      search: (current) =>
        updateNftSearchParams(nftSearchParamsSchema.parse(current), updates),
    })
  }

  function updateSearchDraft(value: string) {
    setSearchDraftState({ query: searchQuery, value })
  }

  function updatePriceDraft(value: [string, string]) {
    setPriceDraftState({ key: priceDraftKey, value })
  }

  function clearFilters() {
    updateSearch({
      q: undefined,
      feed: 'all',
      category: undefined,
      network: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      sort: 'recent',
    })
  }

  return (
    <>
      <div className="kurio-container pt-4 lg:hidden">
        <CatalogSearchForm
          filtersDisabled={!facets}
          inputId="mobile-catalog-search"
          mobile
          onChange={updateSearchDraft}
          onOpenFilters={() => setFilterDrawerOpen(true)}
          onSubmit={() => updateSearch({ q: searchDraft.trim() || undefined })}
          value={searchDraft}
        />
      </div>
      <HomeIntro />
      <div className="kurio-container flex flex-col pb-12 md:pb-20">
        {spotlight && spotlightImage && (
          <section
            aria-labelledby="featured-nft-title"
            className="order-2 mb-10 border-y border-border-header py-5 md:order-1"
          >
            <h2
              className="mb-4 text-lg font-bold uppercase text-highlight"
              id="featured-nft-title"
            >
              NFT em destaque
            </h2>
            <div className="flex items-center gap-4">
              <img
                alt={spotlightImage.alt}
                className="size-28 shrink-0 object-cover md:size-40"
                height={spotlightImage.height}
                loading="lazy"
                src={spotlightImage.url}
                width={spotlightImage.width}
              />
              <div>
                <p className="text-sm font-bold text-foreground">
                  {spotlight.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {spotlight.collection}
                </p>
                <p className="mt-3 text-lg font-bold text-highlight">
                  {format(spotlight.price)} ETH
                </p>
              </div>
            </div>
          </section>
        )}

        <section
          aria-label="Destaques editoriais"
          className="order-3 mb-12 space-y-5 md:order-2"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {homePromoBanners.map((banner) => (
              <article
                className="border border-border-header bg-card p-5 md:p-7"
                key={banner.title}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-highlight">
                  {banner.eyebrow}
                </p>
                <h2 className="mt-3 text-lg font-bold text-foreground">
                  {banner.title}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  {banner.description}
                </p>
                <Link
                  className="mt-4 inline-flex min-h-8 items-center text-xs font-bold text-highlight underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  to="/indisponivel"
                >
                  {banner.linkLabel} →
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="catalog-title"
          className="order-1 md:order-3"
          id="catalog"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Descubra no seu ritmo
              </p>
              <h2
                className="mt-2 text-xl font-bold text-foreground"
                id="catalog-title"
              >
                NFTs para descobrir
              </h2>
            </div>
            <CatalogSearchForm
              inputId="desktop-catalog-search"
              onChange={updateSearchDraft}
              onSubmit={() =>
                updateSearch({ q: searchDraft.trim() || undefined })
              }
              value={searchDraft}
            />
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="Feeds">
            {([
              ['all', 'Todos'],
              ['new', 'Novos'],
              ['trending', 'Em alta'],
            ] as const).map(([feed, label]) => (
              <Button
                aria-pressed={(search.feed ?? 'all') === feed}
                key={feed}
                onClick={() => updateSearch({ feed })}
                type="button"
                variant={(search.feed ?? 'all') === feed ? 'default' : 'outline'}
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              {catalogQuery.data ? `${catalogQuery.data.total} itens` : ' '}
            </p>
            <Select
              containerClassName="w-full max-w-56"
              label="Ordenar por"
              onChange={(event) =>
                updateSearch({
                  sort: nftSortSchema.parse(event.currentTarget.value),
                })
              }
              value={search.sort}
            >
              <option value="recent">Mais recentes</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
              <option value="popular">Mais populares</option>
            </Select>
          </div>

          {facets && (
            <>
              <ModalSurface
                onOpenChange={setFilterDrawerOpen}
                open={filterDrawerOpen}
                title="Filtrar NFTs"
                variant="drawer"
              >
                <CatalogFilterPanel
                  facets={facets}
                  onChange={updateSearch}
                  onPriceDraftChange={updatePriceDraft}
                  priceDraft={priceDraft}
                  search={search}
                />
                <Button
                  className="mt-8 w-full"
                  onClick={() => setFilterDrawerOpen(false)}
                  type="button"
                >
                  Ver resultados
                </Button>
              </ModalSurface>
              <div className="flex items-start gap-10">
                <aside
                  aria-label="Filtros do catálogo"
                  className="hidden w-[19rem] shrink-0 lg:block"
                >
                  <CatalogFilterPanel
                    facets={facets}
                    onChange={updateSearch}
                    onPriceDraftChange={updatePriceDraft}
                    priceDraft={priceDraft}
                    search={search}
                  />
                </aside>
                <div className="min-w-0 flex-1">
                  {hasActiveFilters(search) && (
                    <div className="mb-5 flex justify-end">
                      <Button
                        onClick={clearFilters}
                        type="button"
                        variant="ghost"
                      >
                        Limpar filtros
                      </Button>
                    </div>
                  )}

                  {catalogQuery.isPending ? (
                    <CatalogSkeleton />
                  ) : catalogQuery.isError ? (
                    <ErrorState
                      description="Não foi possível carregar o catálogo. Verifique sua conexão e tente novamente."
                      onRetry={() => void catalogQuery.refetch()}
                      retrying={catalogQuery.isFetching}
                      title="Falha ao carregar o catálogo"
                    />
                  ) : catalogQuery.data.items.length === 0 ? (
                    <EmptyState
                      description="Ainda não há NFTs para exibir. Tente novamente mais tarde."
                      title="Nenhum NFT encontrado"
                    />
                  ) : (
                    <>
                      {catalogQuery.isFetching && (
                        <p aria-live="polite" className="mb-3 text-xs text-highlight">
                          Atualizando catálogo…
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-2 md:gap-x-8 md:gap-y-10 xl:grid-cols-3">
                        {catalogQuery.data.items.map((nft, index) => (
                          <div
                            className={
                              index % 2 === 1
                                ? 'mt-8 min-w-0 md:mt-0'
                                : 'min-w-0'
                            }
                            key={nft.id}
                          >
                            <NftCard nft={nft} />
                          </div>
                        ))}
                      </div>
                      <div className="mt-10 flex justify-center">
                        <Pagination
                          label="Catálogo de NFTs"
                          onPageChange={(page) => updateSearch({ page })}
                          page={catalogQuery.data.page}
                          totalPages={catalogQuery.data.totalPages}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {!facets && (
            <div aria-hidden="true" className="space-y-3 lg:hidden">
              <Skeleton className="h-11 w-full" />
            </div>
          )}
          {!facets && catalogQuery.isPending && <CatalogSkeleton />}
          {!facets && catalogQuery.isError && (
            <ErrorState
              description="Não foi possível carregar o catálogo. Verifique sua conexão e tente novamente."
              onRetry={() => void catalogQuery.refetch()}
              retrying={catalogQuery.isFetching}
              title="Falha ao carregar o catálogo"
            />
          )}
        </section>

        <section
          aria-labelledby="mint-journal-title"
          className="order-4 mt-16"
        >
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-border-header pb-3">
            <h2
              className="text-xl font-bold text-foreground"
              id="mint-journal-title"
            >
              Diário da Cunhagem
            </h2>
            <Link
              className="text-xs font-bold text-highlight underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              to="/indisponivel"
            >
              Ver diário →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {mintJournalTeasers.map((teaser) => (
              <article
                className="border border-border-header bg-card p-5"
                key={teaser.title}
              >
                <p className="text-xs uppercase tracking-wide text-highlight">
                  {teaser.category}
                </p>
                <h3 className="mt-3 text-sm font-bold text-foreground">
                  {teaser.title}
                </h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {teaser.summary}
                </p>
                <Link
                  className="mt-4 inline-flex min-h-8 items-center text-xs font-bold text-highlight underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  to="/indisponivel"
                >
                  Ler matéria →
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

function hasActiveFilters(search: NftSearchParams) {
  return Boolean(
    search.q ||
      (search.feed && search.feed !== 'all') ||
      search.category?.length ||
      search.network?.length ||
      search.minPrice ||
      search.maxPrice ||
      search.sort !== 'recent',
  )
}

function getPriceDraft(
  search: NftSearchParams,
  priceRange: { min: string; max: string } | undefined,
): [string, string] {
  if (!priceRange) return ['0', '0']
  const min = search.minPrice ?? priceRange.min
  const max = search.maxPrice ?? priceRange.max
  if (compare(min, priceRange.min) < 0 || compare(min, priceRange.max) > 0) {
    return [priceRange.min, priceRange.max]
  }
  if (compare(max, priceRange.min) < 0 || compare(max, priceRange.max) > 0) {
    return [priceRange.min, priceRange.max]
  }
  return compare(min, max) <= 0
    ? [min, max]
    : [priceRange.min, priceRange.max]
}

export { HomePage }
