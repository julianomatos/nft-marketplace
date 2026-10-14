import { Link } from '@tanstack/react-router'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useFeaturedNfts } from '@/hooks/use-featured-nfts'

type HomeIntroProps = {
  background?: boolean
}

function HomeIntro({ background = false }: HomeIntroProps) {
  const featuredQuery = useFeaturedNfts()
  const heroNft = featuredQuery.data?.hero[0]
  const heroImage = heroNft?.images[0]

  if (featuredQuery.isPending) {
    return (
      <section
        aria-label="Carregando destaques"
        className="kurio-container py-6 md:py-8"
        id={background ? undefined : 'home-hero'}
      >
        <div className="grid min-h-[24rem] items-center gap-8 md:grid-cols-2">
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

  if (featuredQuery.isError || (heroNft !== undefined && !heroImage)) {
    return (
      <section className="kurio-container py-8" id={background ? undefined : 'home-hero'}>
        <ErrorState
          description="Não foi possível carregar os NFTs em destaque."
          onRetry={() => void featuredQuery.refetch()}
          retrying={featuredQuery.isFetching}
          title="Falha ao carregar os destaques"
        />
      </section>
    )
  }

  if (!heroNft || !heroImage) {
    return (
      <section className="kurio-container py-8" id={background ? undefined : 'home-hero'}>
        <EmptyState
          description="Novos destaques estarão disponíveis em breve."
          title="Nenhum destaque disponível"
        />
      </section>
    )
  }

  return (
    <section
      aria-labelledby="home-hero-title"
      className="kurio-container py-6 md:py-8"
      id={background ? undefined : 'home-hero'}
    >
      <div className="grid min-h-[24rem] items-center gap-8 md:grid-cols-[1fr_28rem] md:gap-12">
        <div className="flex flex-col items-start">
          <p className="mb-4 text-sm font-bold uppercase tracking-wide text-highlight">
            Bem-vindo à Kurio
          </p>
          <h1
            className="max-w-2xl text-3xl font-bold leading-tight text-foreground uppercase sm:text-4xl md:text-[2.7rem] md:leading-[1.6]"
            id="home-hero-title"
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
            src={heroImage.url}
            width={heroImage.width}
          />
        </div>
      </div>
    </section>
  )
}

export { HomeIntro }
