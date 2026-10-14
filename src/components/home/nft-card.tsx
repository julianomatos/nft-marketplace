import { useState } from 'react'
import { Heart, Eye, ShoppingCart } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useCatalogCardActions } from '@/hooks/use-catalog-card-actions'
import type { Nft } from '@/types/contracts'

type NftCardProps = {
  nft: Nft
}

function NftCard({ nft }: NftCardProps) {
  const [feedback, setFeedback] = useState('')
  const actions = useCatalogCardActions(nft)
  const image = nft.images[0]
  if (!image) return null

  async function handleFavorite() {
    setFeedback('')
    try {
      const nextState = !actions.isFavorite
      const updated = await actions.toggleFavorite()
      if (!updated) return
      setFeedback(
        nextState ? 'Adicionado à lista de interesse.' : 'Removido da lista de interesse.',
      )
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar a lista de interesse.',
      )
    }
  }

  async function handleAddToCart() {
    setFeedback('')
    try {
      const added = await actions.addToCart()
      if (!added) return
      setFeedback('NFT adicionado ao carrinho.')
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Não foi possível adicionar o NFT ao carrinho.',
      )
    }
  }

  return (
    <article className="group min-w-0">
      <div className="relative bg-card p-2 transition-colors group-hover:bg-primary/20 group-focus-within:bg-primary/20 md:p-3">
        {nft.rarity && (
          <span className="absolute left-2 top-2 z-10 bg-primary px-3 py-1 text-xs font-bold text-primary-foreground md:left-3 md:top-3">
            {nft.rarity}
          </span>
        )}
        <img
          alt={image.alt}
          className="aspect-square w-full object-cover"
          height={image.height}
          loading="lazy"
          src={image.url}
          width={image.width}
        />
        <div className="absolute inset-x-2 bottom-2 flex justify-center gap-2 opacity-100 transition-opacity md:inset-x-3 md:bottom-3 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <Button
            aria-label={
              actions.isFavorite
                ? `Remover ${nft.name} dos favoritos`
                : `Adicionar ${nft.name} aos favoritos`
            }
            aria-pressed={actions.isFavorite}
            disabled={actions.favoritePending}
            onClick={() => void handleFavorite()}
            size="icon-sm"
            type="button"
            variant="secondary"
          >
            <Heart
              aria-hidden="true"
              fill={actions.isFavorite ? 'currentColor' : 'none'}
              size={16}
            />
          </Button>
          <Button
            aria-label={`Adicionar ${nft.name} ao carrinho`}
            disabled={
              actions.addToCartPending ||
              !nft.editions.some(({ available }) => available > 0)
            }
            onClick={() => void handleAddToCart()}
            size="icon-sm"
            type="button"
            variant="secondary"
          >
            <ShoppingCart aria-hidden="true" size={16} />
          </Button>
          <Button
            asChild
            aria-label={`Ver ${nft.name}`}
            size="icon-sm"
            variant="secondary"
          >
            <Link to="/nft/$id" params={{ id: nft.id }}>
              <Eye aria-hidden="true" size={16} />
            </Link>
          </Button>
        </div>
      </div>
      <div className="pt-3">
        <h3 className="truncate text-sm text-foreground md:text-xs">
          {nft.name}
        </h3>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-sm font-bold text-highlight md:text-xs">
            {nft.price} ETH
          </p>
          {nft.compareAtPrice && (
            <p className="text-xs text-subtle line-through">
              {nft.compareAtPrice} ETH
            </p>
          )}
        </div>
        {feedback && (
          <p aria-live="polite" className="mt-2 text-xs text-highlight" role="status">
            {feedback}
          </p>
        )}
      </div>
    </article>
  )
}

export { NftCard }
