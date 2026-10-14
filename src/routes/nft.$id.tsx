import { createFileRoute } from '@tanstack/react-router'
import { NftDetailRoute } from '@/components/nft-detail/nft-detail-page'

export const Route = createFileRoute('/nft/$id')({
  component: NftDetailRoute,
})
