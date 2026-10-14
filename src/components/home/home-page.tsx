import { useSearch } from '@tanstack/react-router'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { NftCard } from '@/components/home/nft-card'
import { HomeIntro } from '@/components/home/home-intro'
import { useNftCatalog } from '@/hooks/use-nft-catalog'
import { useFeaturedNfts } from '@/hooks/use-featured-nfts'
import { format } from '@/utils/eth'
import { nftSearchParamsSchema } from '@/types/contracts'

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
  const catalogQuery = useNftCatalog(search)
  const featuredQuery = useFeaturedNfts()
  const spotlight = featuredQuery.data?.featured
  const spotlightImage = spotlight?.images[0]

  return (
    <>
      <HomeIntro />
      <div className="kurio-container pb-12 md:pb-20">
        {spotlight && spotlightImage && (
          <section
            aria-labelledby="featured-nft-title"
            className="mb-10 border-y border-border-header py-5"
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

        <section aria-labelledby="catalog-title" id="catalog">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Coleção selecionada
              </p>
              <h2
                className="mt-2 text-xl font-bold text-foreground"
                id="catalog-title"
              >
                NFTs para descobrir
              </h2>
            </div>
            {catalogQuery.data && (
              <p className="text-xs text-muted-foreground">
                {catalogQuery.data.total} itens
              </p>
            )}
          </div>

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
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-8 md:gap-y-10">
                {catalogQuery.data.items.map((nft) => (
                  <NftCard key={nft.id} nft={nft} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}

export { HomePage }
