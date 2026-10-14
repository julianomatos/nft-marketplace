import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddToCart } from '@/hooks/use-add-to-cart'
import { useNftDetail } from '@/hooks/use-nft-detail'
import type { Nft, NftEdition } from '@/types/contracts'

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
  const actions = useAddToCart(nft)
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(
    null,
  )
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
  const image = nft.images[0]
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

  return (
    <div className="kurio-container py-6 pb-12 md:py-8">
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
        <section aria-label={`Galeria de ${nft.name}`} className="bg-card p-3 md:p-5">
          {image ? (
            <img
              alt={image.alt}
              className="aspect-square w-full rounded-sm object-cover"
              height={image.height}
              loading="eager"
              src={image.url}
              width={image.width}
            />
          ) : (
            <div className="flex aspect-square items-center justify-center bg-surface-raised text-sm text-muted-foreground">
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

          <div className="space-y-4 py-4 text-sm leading-6">
            <p>
              <span className="font-bold text-foreground">Sobre este NFT: </span>
              <span className="text-muted-foreground">{nft.description}</span>
            </p>
            <fieldset>
              <legend className="mb-2 font-bold text-foreground">
                Edição
              </legend>
              <div className="flex flex-wrap gap-2">
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
                      <span>{edition.label}</span>
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
              <dl className="space-y-1">
                <dt className="font-bold text-foreground">Atributos</dt>
                {nft.attributes.map((attribute) => (
                  <div className="flex flex-wrap gap-x-2" key={attribute.traitType}>
                    <dt className="text-foreground">{attribute.traitType}:</dt>
                    <dd className="text-muted-foreground">{attribute.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {selectedEdition && (
            <p className="mb-3 text-xs text-muted-foreground">
              {soldOut
                ? 'Esta edição está esgotada.'
                : `${selectedEdition.available} disponíveis nesta edição.`}
            </p>
          )}
          {!selectedEdition && (
            <p className="mb-3 text-xs text-muted-foreground" role="status">
              Nenhuma edição está disponível para este NFT.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-header py-5">
            <QuantityStepper
              disabled={soldOut || actions.addToCartPending}
              label="quantidade"
              max={Math.max(1, selectedEdition?.available ?? 1)}
              onValueChange={setQuantity}
              value={quantity}
            />
            <p className="text-xl font-bold text-highlight">{nft.price} ETH</p>
          </div>
          <div className="flex flex-wrap gap-3">
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
          {feedback && (
            <p
              aria-live={feedback.kind === 'error' ? 'assertive' : 'polite'}
              className={`mt-3 text-sm ${
                feedback.kind === 'error' ? 'text-destructive' : 'text-highlight'
              }`}
              role={feedback.kind === 'error' ? 'alert' : 'status'}
            >
              {feedback.message}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

export { NftDetailPage, NftDetailRoute }
