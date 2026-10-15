import { socketEventSchema, type SocketEvent } from '../types/events'
import type { NftRecord, OrderRecord } from './types'
import { getMockNow, readMockState } from './store'

export type SocketPeer = {
  userId: string | null
  token: string | null
  subscribed: boolean
  emit: (event: string, payload: unknown) => void
}

const socketPeers = new Set<SocketPeer>()

export function addSocketPeer(peer: SocketPeer): void {
  socketPeers.add(peer)
}

export function removeSocketPeer(peer: SocketPeer): void {
  socketPeers.delete(peer)
}

export function emitMockSocketEvent(event: SocketEvent): void {
  const validatedEvent = socketEventSchema.parse(event)
  const currentSession = readMockState().session
  const sessionIsCurrent =
    currentSession.userId !== null &&
    currentSession.token !== null &&
    currentSession.expiresAt !== null &&
    new Date(currentSession.expiresAt).getTime() > new Date(getMockNow()).getTime()

  for (const peer of socketPeers) {
    if (!peer.subscribed) continue
    if (
      validatedEvent.type === 'order.updated' &&
      (
        peer.userId !== validatedEvent.userId ||
        !sessionIsCurrent ||
        peer.token !== currentSession.token
      )
    ) {
      continue
    }
    peer.emit(validatedEvent.type, validatedEvent)
  }
}

export function publishNftUpdated(nft: NftRecord): void {
  emitMockSocketEvent({
    eventId: `nft:${nft.id}:v${nft.version}`,
    type: 'nft.updated',
    resource: { kind: 'nft', id: nft.id },
    version: nft.version,
    timestamp: getMockNow(),
    data: {
      nftId: nft.id,
      price: nft.price,
      editions: nft.editions.map(({ id, available }) => ({ id, available })),
    },
  })
}

export function publishOrderUpdated(order: OrderRecord): void {
  if (order.status !== 'confirmed' && order.status !== 'rejected') {
    throw new Error(`Cannot publish a non-terminal order update: ${order.orderId}`)
  }

  emitMockSocketEvent({
    eventId: `order:${order.orderId}:v${order.version}`,
    type: 'order.updated',
    resource: { kind: 'order', id: order.orderId },
    version: order.version,
    timestamp: getMockNow(),
    userId: order.userId,
    data: {
      orderId: order.orderId,
      status: order.status,
      ...(order.transactionHash ? { transactionHash: order.transactionHash } : {}),
    },
  })
}
