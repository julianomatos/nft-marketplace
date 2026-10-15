import { useState, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Expand, Heart, Star, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModalSurface } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { NftCard } from '@/components/home/nft-card'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { Skeleton } from '@/components/ui/skeleton'
import { useCatalogCardActions } from '@/hooks/use-catalog-card-actions'
import { useNftDetail } from '@/hooks/use-nft-detail'
import { useNftReviews } from '@/hooks/use-nft-reviews'
import { useRelatedNfts } from '@/hooks/use-related-nfts'
import type { Nft, NftEdition } from '@/types/contracts'
import { ApiClientError } from '@/utils/errors'

const networkLabels = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
} as const

function NftDetailRoute() {
  const { id } = useParams({ from: '/nft/$id' })
  return <NftDetailPage key={id} nftId={id} />
}

function NftDetailPage({ nftId }: { nftId: string }) {
  const nftQuery = useNftDetail(nftId)

  if (nftQuery.isPending) {
    return (
      <div
        aria-label="Carregando detalhes do NFT"
        className="kurio-container grid gap-8 py-8 lg:grid-cols-2"
        role="status"
      >
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    )
  }

  if (nftQuery.isError && !nftQuery.data) {
    if (
      nftQuery.error instanceof ApiClientError &&
      nftQuery.error.code === 'NOT_FOUND'
    ) {
      return (
        <section
          aria-labelledby="nft-not-found-title"
          className="kurio-container flex min-h-88 flex-col items-start justify-center py-12"
        >
          <p className="mb-4 text-sm font-bold uppercase tracking-wide text-highlight">
            KURIO · 404
          </p>
          <h1
            className="text-3xl font-bold leading-tight text-foreground sm:text-4xl"
            id="nft-not-found-title"
          >
            NFT não encontrado.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
            Este NFT pode ter sido removido ou o endereço pode estar incorreto.
          </p>
          <Button asChild className="mt-8">
            <Link hash="catalog" to="/">
              Voltar ao mercado
            </Link>
          </Button>
        </section>
      )
    }

    return (
      <div className="kurio-container py-12">
        <ErrorState
          description="Não foi possível carregar os detalhes deste NFT. Verifique sua conexão e tente novamente."
          onRetry={() => void nftQuery.refetch()}
          retrying={nftQuery.isFetching}
          title="Falha ao carregar o NFT"
        />
      </div>
    )
  }

  return (
    <>
      {nftQuery.isFetching && (
        <p aria-live="polite" className="kurio-container py-3 text-xs text-highlight" role="status">
          Atualizando detalhes do NFT…
        </p>
      )}
      {nftQuery.isError && (
        <div className="kurio-container py-4">
          <ErrorState
            description="Os detalhes atuais continuam disponíveis, mas não foi possível atualizá-los."
            onRetry={() => void nftQuery.refetch()}
            retrying={nftQuery.isFetching}
            title="Falha ao atualizar o NFT"
          />
        </div>
      )}
      {nftQuery.data && (
        <NftDetailContent key={nftQuery.data.id} nft={nftQuery.data} />
      )}
    </>
  )
}

function NftDetailContent({ nft }: { nft: Nft }) {
  const actions = useCatalogCardActions(nft)
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details')
  const reviewsQuery = useNftReviews(nft.id, activeTab === 'reviews')
  const relatedQuery = useRelatedNfts(nft.id)
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(
    null,
  )
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [feedback, setFeedback] = useState<{
    kind: 'success' | 'error'
    message: string
  } | null>(null)
  const selectedEdition =
    nft.editions.find(({ id }) => id === selectedEditionId) ??
    nft.editions.find(({ available }) => available > 0) ??
    nft.editions[0] ??
    null
  const image = nft.images[selectedImageIndex] ?? nft.images[0]
  const soldOut = !selectedEdition || selectedEdition.available === 0

  function selectEdition(edition: NftEdition) {
    setSelectedEditionId(edition.id)
    setQuantity((current) =>
      Math.min(current, Math.max(1, edition.available)),
    )
    setFeedback(null)
  }

  async function handleAddToCart() {
    setFeedback(null)
    try {
      const added = await actions.addToCart({
        editionId: selectedEdition?.id,
        quantity,
      })
      if (added) {
        setFeedback({
          kind: 'success',
          message: `${nft.name} adicionado ao carrinho.`,
        })
      }
    } catch (error) {
      setFeedback({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível adicionar este NFT ao carrinho.',
      })
    }
  }

  async function handleToggleFavorite() {
    setFeedback(null)
    try {
      const wasFavorite = actions.isFavorite
      const updated = await actions.toggleFavorite()
      if (updated) {
        setFeedback({
          kind: 'success',
          message: wasFavorite
            ? 'Removido da lista de interesse.'
            : 'Adicionado à lista de interesse.',
        })
      }
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        (error.status === 401 || error.code === 'SESSION_EXPIRED')
      ) {
        return
      }
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar a lista de interesse.'
      setFeedback({
        kind: 'error',
        message: errorMessage,
      })
    }
  }

  function handleBack() {
    if (window.history.length > 1) {
      window.history.back()
      return
    }
    void navigate({ to: '/' })
  }

  return (
    <div className="kurio-container py-6 pb-56 md:py-8 md:pb-12">
      <nav aria-label="Trilha de navegação" className="mb-6 text-xs text-muted-foreground">
        <Link
          className="hover:text-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          to="/"
        >
          Início
        </Link>
        <span aria-hidden="true" className="px-2">/</span>
        <Link
          className="hover:text-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          hash="catalog"
          to="/"
        >
          Mercado
        </Link>
        <span aria-hidden="true" className="px-2">/</span>
        <span aria-current="page">{nft.name}</span>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
        <section
          aria-label={`Galeria de ${nft.name}`}
          className="grid grid-cols-1 gap-3 bg-card p-3 md:grid-cols-[5rem_minmax(0,1fr)] md:gap-4 md:p-5"
        >
          {image ? (
            <>
              <div className="relative order-1 md:order-2">
                <img
                  alt={image.alt}
                  className="aspect-square w-full rounded-sm object-cover"
                  height={image.height}
                  fetchPriority="high"
                  loading="eager"
                  sizes="(min-width: 1024px) 50vw, calc(100vw - 2rem)"
                  src={image.url}
                  srcSet={image.responsiveSrcSet}
                  width={image.width}
                />
                <div className="absolute inset-x-3 top-3 flex justify-between md:hidden">
                  <Button
                    aria-label="Voltar"
                    className="rounded-full border border-border bg-background/90 text-foreground hover:bg-surface-raised"
                    onClick={handleBack}
                    size="icon-lg"
                    type="button"
                    variant="secondary"
                  >
                    <ArrowLeft aria-hidden="true" size={20} />
                  </Button>
                  <Button
                    aria-label={
                      actions.isFavorite
                        ? `Remover ${nft.name} dos favoritos`
                        : `Adicionar ${nft.name} aos favoritos`
                    }
                    aria-pressed={actions.isFavorite}
                    className="rounded-full border border-border bg-background/90 text-foreground hover:bg-surface-raised"
                    disabled={actions.favoritePending}
                    onClick={() => void handleToggleFavorite()}
                    size="icon-lg"
                    type="button"
                    variant="secondary"
                  >
                    <Heart
                      aria-hidden="true"
                      fill={actions.isFavorite ? 'currentColor' : 'none'}
                      size={20}
                    />
                  </Button>
                </div>
                <Button
                  aria-label={`Ampliar imagem de ${nft.name}`}
                  className="absolute bottom-3 right-3 rounded-full bg-background/90 text-foreground hover:bg-surface-raised md:bottom-auto md:top-3"
                  onClick={() => setZoomOpen(true)}
                  size="icon"
                  type="button"
                  variant="secondary"
                >
                  <Expand aria-hidden="true" size={18} />
                </Button>
              </div>
              <div
                aria-label="Miniaturas da galeria"
                className="order-2 flex gap-3 overflow-x-auto md:order-1 md:flex-col"
              >
                {nft.images.map((galleryImage, index) => (
                  <button
                    aria-label={`Exibir imagem ${index + 1} de ${nft.name}`}
                    aria-pressed={selectedImageIndex === index}
                    className={`size-16 shrink-0 overflow-hidden rounded-sm border-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:size-20 ${
                      selectedImageIndex === index
                        ? 'border-primary'
                        : 'border-transparent'
                    }`}
                    key={`${galleryImage.url}-${index}`}
                    onClick={() => setSelectedImageIndex(index)}
                    type="button"
                  >
                    <img
                      alt=""
                      className="size-full object-cover"
                      height={galleryImage.height}
                      loading="lazy"
                      sizes="80px"
                      src={galleryImage.thumbnailUrl}
                      width={galleryImage.width}
                    />
                  </button>
                ))}
              </div>
              <ModalSurface
                onOpenChange={setZoomOpen}
                open={zoomOpen}
                title={`Imagem ampliada: ${nft.name}`}
                variant="dialog"
              >
                <img
                  alt={image.alt}
                  className="max-h-[75vh] w-full object-contain"
                  height={image.height}
                  sizes="(min-width: 768px) 75vw, calc(100vw - 2rem)"
                  src={image.url}
                  srcSet={image.responsiveSrcSet}
                  width={image.width}
                />
              </ModalSurface>
            </>
          ) : (
            <div className="order-1 flex aspect-square items-center justify-center bg-surface-raised text-sm text-muted-foreground md:order-2">
              Imagem indisponível
            </div>
          )}
        </section>

        <section aria-labelledby="nft-detail-title">
          <h1
            className="text-2xl font-bold text-foreground md:text-3xl"
            id="nft-detail-title"
          >
            {nft.name}
          </h1>
          <p className="mt-3 border-b border-border-header pb-3 text-xl font-bold text-highlight">
            {nft.price} ETH
          </p>
          <div className="mt-3 flex items-center justify-between">
            <div
              aria-label={`Nota média ${nft.rating.average} de 5, ${nft.rating.count} avaliações`}
              className="hidden items-center gap-1 text-rating md:flex"
            >
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  aria-hidden="true"
                  className={
                    index < Math.round(nft.rating.average)
                      ? 'fill-current'
                      : ''
                  }
                  key={index}
                  size={15}
                />
              ))}
              <span className="ml-1 text-xs text-foreground">
                {nft.rating.count} avaliações de colecionadores
              </span>
            </div>
            <p className="inline-flex items-center gap-1 rounded-full border border-primary px-3 py-1 text-xs text-rating md:hidden">
              <Star aria-hidden="true" className="fill-current" size={14} />
              {nft.rating.average} ({nft.rating.count})
              <span className="sr-only">avaliações</span>
            </p>
            <Button
              aria-label={
                actions.isFavorite
                  ? `Remover ${nft.name} dos favoritos`
                  : `Adicionar ${nft.name} aos favoritos`
              }
              aria-pressed={actions.isFavorite}
              className="hidden md:inline-flex"
              disabled={actions.favoritePending}
              onClick={() => void handleToggleFavorite()}
              size="icon-lg"
              type="button"
              variant="outline"
            >
              <Heart
                aria-hidden="true"
                fill={actions.isFavorite ? 'currentColor' : 'none'}
                size={20}
              />
            </Button>
          </div>

          <div className="space-y-4 py-4 text-sm leading-6">
            <p>
              <span className="font-bold text-foreground">Sobre este NFT: </span>
              <span className="text-muted-foreground">{nft.description}</span>
            </p>
            <fieldset>
              <legend className="mb-2 font-bold text-foreground">
                Edição
              </legend>
              <div
                aria-label="Edições disponíveis"
                className="flex flex-wrap gap-2"
                role="radiogroup"
              >
                {nft.editions.map((edition) => {
                  const checked = selectedEdition?.id === edition.id
                  const unavailable = edition.available === 0
                  return (
                    <label
                      className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring ${
                        checked
                          ? 'border-primary text-highlight'
                          : 'border-border text-muted-foreground'
                      } ${unavailable ? 'cursor-not-allowed opacity-50' : 'hover:border-primary'}`}
                      key={edition.id}
                    >
                      <input
                        checked={checked}
                        className="size-3 accent-primary"
                        disabled={unavailable}
                        name={`edition-${nft.id}`}
                        onChange={() => selectEdition(edition)}
                        type="radio"
                        value={edition.id}
                      />
                      <span>
                        {edition.label}
                        {unavailable ? ' — Esgotada' : ''}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="inline font-bold text-foreground">ID do token: </dt>
                <dd className="inline text-muted-foreground">{nft.tokenId}</dd>
              </div>
              <div>
                <dt className="inline font-bold text-foreground">Coleção: </dt>
                <dd className="inline text-muted-foreground">{nft.collection}</dd>
              </div>
              <div>
                <dt className="inline font-bold text-foreground">Rede: </dt>
                <dd className="inline text-muted-foreground">
                  {networkLabels[nft.network]}
                </dd>
              </div>
              <div>
                <dt className="inline font-bold text-foreground">Categoria: </dt>
                <dd className="inline text-muted-foreground">{nft.category}</dd>
              </div>
              {nft.rarity && (
                <div>
                  <dt className="inline font-bold text-foreground">Raridade: </dt>
                  <dd className="inline text-muted-foreground">{nft.rarity}</dd>
                </div>
              )}
            </dl>

            {nft.attributes.length > 0 && (
              <div>
                <h2 className="font-bold text-foreground">Atributos</h2>
                <ul className="space-y-1">
                  {nft.attributes.map((attribute) => (
                    <li
                      className="flex flex-wrap gap-x-2"
                      key={attribute.traitType}
                    >
                      <span className="text-foreground">
                        {attribute.traitType}:
                      </span>
                      <span className="text-muted-foreground">
                        {attribute.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {selectedEdition && (
            <p className="mb-3 text-xs text-muted-foreground" role="status">
              {soldOut
                ? nft.editions.every(({ available }) => available === 0)
                  ? 'Todas as edições deste NFT estão esgotadas.'
                  : 'Esta edição está esgotada.'
                : `${selectedEdition.available} disponíveis nesta edição.`}
            </p>
          )}
          {!selectedEdition && (
            <p className="mb-3 text-xs text-muted-foreground" role="status">
              Nenhuma edição está disponível para este NFT.
            </p>
          )}
          <div className="hidden flex-wrap items-center justify-between gap-4 border-t border-border-header py-5 md:flex">
            <QuantityStepper
              disabled={soldOut || actions.addToCartPending}
              label="quantidade"
              max={Math.max(1, selectedEdition?.available ?? 1)}
              onValueChange={setQuantity}
              size="detail"
              value={quantity}
            />
            <p className="text-xl font-bold text-highlight">{nft.price} ETH</p>
          </div>
          <div className="hidden flex-wrap gap-3 md:flex">
            <Button
              className="min-w-40 flex-1 uppercase"
              disabled={soldOut || actions.addToCartPending}
              loading={actions.addToCartPending}
              loadingLabel="Adicionando ao carrinho"
              onClick={() => void handleAddToCart()}
              size="lg"
              type="button"
            >
              Comprar NFT
            </Button>
            <Button
              aria-label={`Adicionar ${nft.name} ao carrinho`}
              disabled={soldOut || actions.addToCartPending}
              onClick={() => void handleAddToCart()}
              size="icon-lg"
              type="button"
              variant="outline"
            >
              <ShoppingCart aria-hidden="true" />
            </Button>
          </div>
        </section>
      </div>

      <div
        aria-label="Ações de compra"
        className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-40 border-t border-border-header bg-card px-4 py-3 shadow-lg md:hidden"
        role="region"
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <QuantityStepper
            disabled={soldOut || actions.addToCartPending}
            label="quantidade"
            max={Math.max(1, selectedEdition?.available ?? 1)}
            onValueChange={setQuantity}
            value={quantity}
          />
          <p className="shrink-0 text-sm font-bold text-highlight">
            {nft.price} ETH
          </p>
          <Button
            aria-label="Comprar NFT"
            className="min-h-11 min-w-0 flex-1 rounded-full bg-primary-gradient px-3 text-xs uppercase"
            disabled={soldOut || actions.addToCartPending}
            loading={actions.addToCartPending}
            loadingLabel="Adicionando ao carrinho"
            onClick={() => void handleAddToCart()}
            type="button"
          >
            Comprar
          </Button>
          <Button
            aria-label={`Adicionar ${nft.name} ao carrinho`}
            className="size-11 shrink-0 rounded-full border-border bg-surface-raised"
            disabled={soldOut || actions.addToCartPending}
            onClick={() => void handleAddToCart()}
            size="icon-lg"
            type="button"
            variant="secondary"
          >
            <ShoppingCart aria-hidden="true" size={20} />
          </Button>
        </div>
      </div>
      {feedback && (
        <p
          aria-live={feedback.kind === 'error' ? 'assertive' : 'polite'}
          className={`kurio-container mt-2 text-sm ${
            feedback.kind === 'error' ? 'text-destructive' : 'text-highlight'
          }`}
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      )}

      <section className="mt-14" aria-label="Detalhes e avaliações">
        <div
          aria-label="Conteúdo do NFT"
          className="flex flex-wrap border-b border-border-header"
          role="tablist"
        >
          <button
            aria-controls="nft-details-panel"
            aria-selected={activeTab === 'details'}
            className={`min-h-11 border-b-2 px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              activeTab === 'details'
                ? 'border-primary text-highlight'
                : 'border-transparent text-foreground'
            }`}
            id="nft-details-tab"
            onKeyDown={(event) =>
              handleTabNavigation(event, setActiveTab)
            }
            onClick={() => setActiveTab('details')}
            role="tab"
            tabIndex={activeTab === 'details' ? 0 : -1}
            type="button"
          >
            Detalhes do NFT
          </button>
          <button
            aria-controls="nft-reviews-panel"
            aria-selected={activeTab === 'reviews'}
            className={`min-h-11 border-b-2 px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              activeTab === 'reviews'
                ? 'border-primary text-highlight'
                : 'border-transparent text-foreground'
            }`}
            id="nft-reviews-tab"
            onKeyDown={(event) =>
              handleTabNavigation(event, setActiveTab)
            }
            onClick={() => setActiveTab('reviews')}
            role="tab"
            tabIndex={activeTab === 'reviews' ? 0 : -1}
            type="button"
          >
            Avaliações de colecionadores ({nft.rating.count})
          </button>
        </div>
        {activeTab === 'details' ? (
          <div
            aria-labelledby="nft-details-tab"
            className="space-y-5 py-5 text-sm leading-7 text-muted-foreground"
            id="nft-details-panel"
            role="tabpanel"
            tabIndex={0}
          >
            <p>{nft.description}</p>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="font-bold text-foreground">Rede</dt>
                <dd>{networkLabels[nft.network]}</dd>
              </div>
              <div>
                <dt className="font-bold text-foreground">Coleção</dt>
                <dd>{nft.collection}</dd>
              </div>
              <div>
                <dt className="font-bold text-foreground">Categoria</dt>
                <dd>{nft.category}</dd>
              </div>
              {nft.attributes.map((attribute) => (
                <div key={attribute.traitType}>
                  <dt className="font-bold text-foreground">
                    {attribute.traitType}
                  </dt>
                  <dd>{attribute.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <div
            aria-labelledby="nft-reviews-tab"
            className="space-y-4 py-5"
            id="nft-reviews-panel"
            role="tabpanel"
            tabIndex={0}
          >
            {reviewsQuery.isPending ? (
              <div
                aria-label="Carregando avaliações"
                className="space-y-3"
                role="status"
              >
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : reviewsQuery.isError ? (
              <ErrorState
                description="Não foi possível carregar as avaliações. Tente novamente."
                onRetry={() => void reviewsQuery.refetch()}
                retrying={reviewsQuery.isFetching}
                title="Falha ao carregar avaliações"
              />
            ) : reviewsQuery.data.items.length === 0 ? (
              <EmptyState
                description="Este NFT ainda não recebeu avaliações."
                title="Nenhuma avaliação"
              />
            ) : (
              reviewsQuery.data.items.map((review) => (
                <article
                  className="border-b border-border py-4 last:border-b-0"
                  key={review.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold text-foreground">
                      {review.displayName}
                    </h3>
                    <div
                      aria-label={`Nota ${review.rating} de 5`}
                      className="flex items-center gap-1 text-rating"
                    >
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          aria-hidden="true"
                          className={
                            index < review.rating ? 'fill-current' : ''
                          }
                          key={index}
                          size={14}
                        />
                      ))}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {review.rating}/5
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {review.comment}
                  </p>
                  <time
                    className="mt-2 block text-xs text-subtle"
                    dateTime={review.createdAt}
                  >
                    {new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'medium',
                    }).format(new Date(review.createdAt))}
                  </time>
                </article>
              ))
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="related-nfts-title" className="mt-14">
        <h2
          className="border-b border-border-header pb-3 text-lg font-bold text-highlight"
          id="related-nfts-title"
        >
          Mais desta coleção
        </h2>
        {relatedQuery.isPending ? (
          <div
            aria-label="Carregando itens relacionados"
            className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4"
            role="status"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton className="aspect-square w-full" key={index} />
            ))}
          </div>
        ) : relatedQuery.isError ? (
          <div className="mt-5">
            <ErrorState
              description="Não foi possível carregar outros itens desta coleção."
              onRetry={() => void relatedQuery.refetch()}
              retrying={relatedQuery.isFetching}
              title="Falha ao carregar a coleção"
            />
          </div>
        ) : relatedQuery.data.items.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              description="Não há outros NFTs desta coleção para exibir."
              title="Coleção sem outros itens"
            />
          </div>
        ) : (
          <RelatedNftCarousel items={relatedQuery.data.items} />
        )}
      </section>

      <section
        aria-label="Compartilhar NFT"
        className="mt-10 flex flex-wrap items-center gap-3 text-sm"
      >
        <span className="font-bold text-foreground">
          Compartilhar este NFT:
        </span>
        {getShareLinks(nft).map(({ href, label }) => (
          <a
            className="inline-flex min-h-9 items-center rounded-sm border border-border px-3 text-highlight hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            href={href}
            key={label}
            rel="noopener noreferrer"
            target="_blank"
          >
            {label}
          </a>
        ))}
      </section>
    </div>
  )
}

function handleTabNavigation(
  event: KeyboardEvent<HTMLButtonElement>,
  setActiveTab: (tab: 'details' | 'reviews') => void,
) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()

  const nextTab =
    event.key === 'Home' || event.key === 'ArrowLeft'
      ? 'details'
      : 'reviews'
  setActiveTab(nextTab)
  document.getElementById(`nft-${nextTab}-tab`)?.focus()
}

function RelatedNftCarousel({ items }: { items: Nft[] }) {
  const [activeIndex, setActiveIndex] = useState(0)

  function scrollToItem(index: number) {
    const item = document.getElementById(`related-nft-${index}`)
    item?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'nearest',
      inline: 'start',
    })
    setActiveIndex(index)
  }

  return (
    <>
      <div
        aria-label="NFTs relacionados"
        className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3"
        onScroll={(event) => {
          const container = event.currentTarget
          const itemWidth = container.firstElementChild?.getBoundingClientRect().width
          if (!itemWidth) return
          setActiveIndex(
            Math.min(
              items.length - 1,
              Math.round(container.scrollLeft / (itemWidth + 16)),
            ),
          )
        }}
        role="region"
      >
        {items.map((nft, index) => (
          <div
            className="w-[72%] shrink-0 snap-start sm:w-[42%] lg:w-[calc((100%-4rem)/5)]"
            id={`related-nft-${index}`}
            key={nft.id}
          >
            <NftCard nft={nft} />
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div
          aria-label="Navegação dos NFTs relacionados"
          className="mt-3 flex justify-center gap-1"
          role="group"
        >
          {items.map((nft, index) => (
            <button
              aria-label={`Exibir ${nft.name}`}
              aria-pressed={activeIndex === index}
              className="flex size-8 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              key={nft.id}
              onClick={() => scrollToItem(index)}
              type="button"
            >
              <span
                aria-hidden="true"
                className={`size-2 rounded-full border border-primary ${
                  activeIndex === index ? 'bg-primary' : 'bg-transparent'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function getShareLinks(nft: Nft) {
  const shareUrl = new URL(window.location.href).toString()
  const text = encodeURIComponent(nft.name)
  const encodedUrl = encodeURIComponent(shareUrl)

  return [
    {
      label: 'X',
      href: `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
    },
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: 'E-mail',
      href: `mailto:?subject=${text}&body=${encodedUrl}`,
    },
  ]
}

export { NftDetailPage, NftDetailRoute }
