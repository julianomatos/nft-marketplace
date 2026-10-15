import { readMockState, settleOrder } from './store'
import type { OrderRecord } from './types'
import { publishNftUpdated, publishOrderUpdated } from './socket-events'

export function settleMockOrder(
  orderId: string,
  outcome: 'confirmed' | 'rejected',
): OrderRecord {
  const previousState = readMockState()
  const order = settleOrder(orderId, outcome)
  const nextState = readMockState()

  for (const nft of nextState.nfts) {
    const previousNft = previousState.nfts.find((entry) => entry.id === nft.id)
    if (previousNft && nft.version > previousNft.version) {
      publishNftUpdated(nft)
    }
  }

  publishOrderUpdated(order)
  return order
}
