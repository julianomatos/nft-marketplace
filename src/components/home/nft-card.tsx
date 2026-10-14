import type { Nft } from '@/types/contracts'

type NftCardProps = {
  nft: Nft
}

function NftCard({ nft }: NftCardProps) {
  const image = nft.images[0]
  if (!image) return null

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
      </div>
    </article>
  )
}

export { NftCard }
