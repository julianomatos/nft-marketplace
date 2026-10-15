import { useRef, useState, type UIEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useFeaturedNfts } from '@/hooks/use-featured-nfts'
import { queryKeys } from '@/hooks/queryKeys'
import type { FeaturedNftsResponse } from '@/types/contracts'

type HomeIntroProps = {
  background?: boolean
  featuredNfts?: FeaturedNftsResponse
}

function HomeIntro({ background = false, featuredNfts }: HomeIntroProps) {
  const featuredQuery = useFeaturedNfts({ enabled: !featuredNfts })
  const queryClient = useQueryClient()
  const heroNfts = featuredNfts?.hero ?? featuredQuery.data?.hero ?? []
  const heroNft = heroNfts[0]
  const heroImage = heroNft?.images[0]
  const [activeSlide, setActiveSlide] = useState(0)
  const slidesRef = useRef<HTMLUListElement>(null)
  const isPending = !featuredNfts && featuredQuery.isPending
  const isError = !featuredNfts && featuredQuery.isError

  if (isPending) {
    return (
      <section
        aria-label="Carregando destaques"
        className="kurio-container py-4 md:py-8"
        id={background ? undefined : 'home-hero'}
      >
        <div className="mb-4 flex gap-2 md:hidden">
          <Skeleton className="h-12 flex-1 rounded-2xl" />
          <Skeleton className="size-12 rounded-2xl" />
        </div>
        <Skeleton className="aspect-[1.65] w-full rounded-3xl md:hidden" />
        <div className="hidden min-h-[24rem] items-center gap-8 md:grid md:grid-cols-2">
          <div className="space-y-5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-24 w-full max-w-xl" />
            <Skeleton className="h-14 w-full max-w-md" />
            <Skeleton className="h-11 w-32" />
          </div>
          <Skeleton className="aspect-square w-full max-w-[28rem] justify-self-end" />
        </div>
      </section>
    )
  }

  if (isError || (heroNft !== undefined && !heroImage)) {
    return (
      <section
        className="kurio-container py-8"
        id={background ? undefined : 'home-hero'}
      >
        <ErrorState
          description="Não foi possível carregar os NFTs em destaque."
          onRetry={() => {
            if (featuredNfts) {
              void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.featured })
            } else {
              void featuredQuery.refetch()
            }
          }}
          retrying={featuredQuery.isFetching}
          title="Falha ao carregar os destaques"
        />
      </section>
    )
  }

  if (!heroNft || !heroImage) {
    return (
      <section
        className="kurio-container py-8"
        id={background ? undefined : 'home-hero'}
      >
        <EmptyState
          description="Novos destaques estarão disponíveis em breve."
          title="Nenhum destaque disponível"
        />
      </section>
    )
  }

  return (
    <section
      aria-label="Destaques"
      className="kurio-container py-4 md:py-8"
      id={background ? undefined : 'home-hero'}
    >
      <div className="md:hidden">
        <ul
          aria-label="Destaques da Kurio"
          aria-roledescription="carrossel"
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={handleSlidesScroll}
          ref={slidesRef}
        >
          {heroNfts.map((nft, index) => {
            const image = nft.images[0]
            if (!image) return null
            const thumbnailNft = heroNfts[(index + 1) % heroNfts.length]
            const thumbnail = thumbnailNft.images[0]

            return (
              <li
                aria-label={`Destaque ${index + 1} de ${heroNfts.length}: ${nft.name}`}
                aria-roledescription="slide"
                className="relative flex min-h-44 min-w-full snap-center items-center overflow-hidden rounded-3xl bg-hero-gradient-mobile p-4"
                key={nft.id}
              >
                <div className="relative z-10 w-[58%]">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-foreground">
                    Bem-vindo à Kurio
                  </p>
                  {index === 0 ? (
                    <h1
                      className="mt-2 text-sm font-bold leading-5 text-foreground"
                      id="home-hero-title"
                    >
                      Seja dono da cultura digital
                    </h1>
                  ) : (
                    <p className="mt-2 text-sm font-bold leading-5 text-foreground">
                      Seja dono da cultura digital
                    </p>
                  )}
                  <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                    Descubra NFTs selecionados de criadores do mundo todo.
                  </p>
                  <Link
                    className="mt-1 inline-flex min-h-6 items-center text-[10px] font-bold uppercase text-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    hash="catalog"
                    to="/"
                  >
                    Explorar →
                  </Link>
                </div>
                <img
                  alt={image.alt}
                  className="absolute right-2 top-2 h-[calc(100%-1rem)] w-[48%] rounded-2xl object-cover"
                  height={image.height}
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  sizes="(min-width: 768px) 468px, 48vw"
                  src={image.url}
                  srcSet={image.responsiveSrcSet}
                  width={image.width}
                />
                {thumbnail && (
                  <img
                    alt=""
                    aria-hidden="true"
                    className="absolute bottom-3 right-[38%] z-10 size-12 rounded-xl border-2 border-card object-cover"
                    height={thumbnail.height}
                    loading="lazy"
                    sizes="48px"
                    src={thumbnail.url}
                    srcSet={thumbnail.responsiveSrcSet}
                    width={thumbnail.width}
                  />
                )}
              </li>
            )
          })}
        </ul>
        <div
          aria-label="Selecionar destaque"
          className="mt-1 flex justify-center"
          role="group"
        >
          {heroNfts.map((nft, index) => (
            <button
              aria-label={`Exibir destaque ${index + 1}: ${nft.name}`}
              aria-pressed={activeSlide === index}
              className="flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring"
              key={nft.id}
              onClick={() => {
                const target = slidesRef.current?.children.item(index)
                if (target instanceof HTMLElement) {
                  slidesRef.current?.scrollTo({
                    left: target.offsetLeft,
                    behavior: 'smooth',
                  })
                }
              }}
              type="button"
            >
              <span
                aria-hidden="true"
                className={
                  activeSlide === index
                    ? 'size-2 rounded-full bg-primary'
                    : 'size-2 rounded-full border border-primary'
                }
              />
            </button>
          ))}
        </div>
      </div>

      <div className="hidden min-h-[24rem] items-center gap-8 md:grid md:grid-cols-[1fr_28rem] md:gap-12">
        <div className="flex flex-col items-start">
          <p className="mb-4 text-sm font-bold uppercase tracking-wide text-highlight">
            Bem-vindo à Kurio
          </p>
          <h1
            className="max-w-2xl text-3xl font-bold leading-tight text-foreground uppercase sm:text-4xl md:text-[2.7rem] md:leading-[1.6]"
            id="home-hero-desktop-title"
          >
            Seja dono do futuro da arte digital
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Descubra NFTs selecionados de criadores emergentes e consagrados.
            Colecione arte digital rara e faça parte da cultura da internet.
          </p>
          <Button asChild className="mt-7 uppercase" size="lg">
            <Link hash="catalog" to="/">
              Explorar
            </Link>
          </Button>
        </div>
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-card md:justify-self-end">
          <img
            alt={heroImage.alt}
            className="h-full w-full object-cover"
            height={heroImage.height}
            fetchPriority="high"
            loading="eager"
            sizes="(min-width: 768px) 468px, 48vw"
            src={heroImage.url}
            srcSet={heroImage.responsiveSrcSet}
            width={heroImage.width}
          />
        </div>
      </div>
    </section>
  )

  function handleSlidesScroll(event: UIEvent<HTMLUListElement>) {
    const slides = event.currentTarget
    const nextSlide = Math.round(slides.scrollLeft / slides.clientWidth)
    setActiveSlide((current) => (current === nextSlide ? current : nextSlide))
  }
}

export { HomeIntro }
