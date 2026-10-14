import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import { socketEventSchema, type SocketEvent } from '../types/events'
import type { NftRecord, OrderRecord } from './types'
import { getMockNow, readMockState } from './store'

type SocketPeer = {
  userId: string | null
  token: string | null
  subscribed: boolean
  emit: (event: string, payload: unknown) => void
}

const socketPeers = new Set<SocketPeer>()

export function createMockSocketHandler(origin: string) {
  const socketUrl = new URL('/socket.io/', origin)
  socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  const escapedSocketOrigin = socketUrl.origin.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  )

  return ws
    .link(new RegExp(`^${escapedSocketOrigin}/$`))
    .addEventListener('connection', (connection) => {
      const { client } = toSocketIo(connection)
      const peer: SocketPeer = {
        userId: null,
        token: null,
        subscribed: false,
        emit: (event, payload) => client.emit(event, payload),
      }
      socketPeers.add(peer)

      client.on('mock:subscribe', (_message, token: unknown) => {
        if (token !== undefined && token !== null && typeof token !== 'string') {
          client.emit('mock:subscription-error', {
            code: 'UNAUTHENTICATED',
          })
          return
        }

        const state = readMockState()
        const session = state.session
        const sessionIsValid =
          typeof token === 'string' &&
          token === session.token &&
          session.userId !== null &&
          session.expiresAt !== null &&
          new Date(session.expiresAt).getTime() > new Date(getMockNow()).getTime()

        if (token && !sessionIsValid) {
          peer.subscribed = false
          peer.userId = null
          peer.token = null
          client.emit('mock:subscription-error', {
            code: session.expiresAt &&
              new Date(session.expiresAt).getTime() <= new Date(getMockNow()).getTime()
              ? 'SESSION_EXPIRED'
              : 'UNAUTHENTICATED',
          })
          return
        }

        peer.userId = sessionIsValid ? session.userId : null
        peer.token = sessionIsValid ? token : null
        peer.subscribed = true
        client.emit('mock:subscribed', { userId: peer.userId })
      })

      connection.client.addEventListener('close', () => {
        socketPeers.delete(peer)
      })
    })
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
