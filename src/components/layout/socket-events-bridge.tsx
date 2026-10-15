import { useEffect, useRef } from 'react'
import { queryKeys } from '@/hooks/queryKeys'
import { queryClient } from '@/lib/query-client'
import type { CartResponse } from '@/types/contracts'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/types/events'
import { mul } from '@/utils/eth'

type SocketEventsBridgeProps = {
  authUserId: string
  sessionToken: string
  onAnnouncement: (message: string) => void
}

function applyNftUpdateToValue(value: unknown, event: NftUpdatedEvent): unknown {
  if (!value || typeof value !== 'object') return value

  const record = value as Record<string, unknown>
  if (record.id === event.data.nftId && Array.isArray(record.editions)) {
    return {
      ...record,
      price: event.data.price,
      editions: record.editions.map((edition: Record<string, unknown>) => {
        const nextEdition = event.data.editions.find(
          (candidate) => candidate.id === edition.id,
        )
        return nextEdition
          ? { ...edition, available: nextEdition.available }
          : edition
      }),
      version: event.version,
    }
  }

  return value
}

function updateNftCacheForEvent(event: NftUpdatedEvent) {
  queryClient.setQueriesData({ queryKey: ['nfts'] }, (currentData) => {
    if (!currentData) return currentData

    if (Array.isArray(currentData)) {
      return currentData.map((entry) => applyNftUpdateToValue(entry, event))
    }

    if (typeof currentData === 'object') {
      const candidate = currentData as Record<string, unknown>
      if (Array.isArray(candidate.items)) {
        return {
          ...candidate,
          items: candidate.items.map((entry) => applyNftUpdateToValue(entry, event)),
        }
      }

      if (Array.isArray(candidate.hero)) {
        return {
          ...candidate,
          hero: candidate.hero.map((entry) => applyNftUpdateToValue(entry, event)),
        }
      }

      if ('featured' in candidate && candidate.featured && typeof candidate.featured === 'object') {
        return {
          ...candidate,
          featured: applyNftUpdateToValue(candidate.featured, event),
        }
      }
    }

    return currentData
  })
}

export function SocketEventsBridge({
  authUserId,
  sessionToken,
  onAnnouncement,
}: SocketEventsBridgeProps) {
  const processedEventIds = useRef(new Set<string>())
  const lastSeenNftVersions = useRef(new Map<string, number>())
  const lastSeenOrderVersions = useRef(new Map<string, number>())

  useEffect(() => {
    processedEventIds.current.clear()
    lastSeenNftVersions.current.clear()

    let active = true
    let socket: {
      on: (event: string, callback: (payload: unknown) => void) => void
      emit: (event: string, payload: unknown) => void
      connect: () => void
      disconnect: () => void
      removeAllListeners: () => void
    } | null = null

    const handleNftUpdated = (event: NftUpdatedEvent) => {
      if (!active) return
      if (processedEventIds.current.has(event.eventId)) return

      const lastVersion = lastSeenNftVersions.current.get(event.data.nftId) ?? 0
      if (event.version <= lastVersion) {
        processedEventIds.current.add(event.eventId)
        return
      }

      lastSeenNftVersions.current.set(event.data.nftId, event.version)
      processedEventIds.current.add(event.eventId)
      updateNftCacheForEvent(event)

      const availabilityText = event.data.editions.some(({ available }) => available === 0)
        ? 'Disponibilidade alterada no carrinho e no catálogo.'
        : `Preço atualizado para ${event.data.price} ETH.`
      onAnnouncement(availabilityText)

      const cartKey = queryKeys.user(authUserId).cart
      queryClient.setQueryData<CartResponse>(cartKey, (currentCart) => {
        if (!currentCart) return currentCart
        return {
          ...currentCart,
          items: currentCart.items.map((item) => {
            if (item.nftId !== event.data.nftId) return item
            const matchingEdition = event.data.editions.find(
              ({ id }) => id === item.editionId,
            )
            const nextAvailable = matchingEdition?.available ?? item.available
            const nextUnitPrice = event.data.price
            return {
              ...item,
              available: nextAvailable,
              unitPrice: nextUnitPrice,
              lineTotal: mul(nextUnitPrice, String(item.quantity)),
              nft: {
                ...item.nft,
                price: nextUnitPrice,
              },
            }
          }),
        }
      })

      queryClient.invalidateQueries({
        queryKey: ['user', authUserId, 'cart', 'quote'],
      })
    }

    const handleOrderUpdated = (event: OrderUpdatedEvent) => {
      if (!active) return
      if (event.userId !== authUserId) return
      if (processedEventIds.current.has(event.eventId)) return

      const lastVersion = lastSeenOrderVersions.current.get(event.data.orderId) ?? 0
      if (event.version <= lastVersion) {
        processedEventIds.current.add(event.eventId)
        return
      }

      lastSeenOrderVersions.current.set(event.data.orderId, event.version)
      processedEventIds.current.add(event.eventId)
      if (event.data.status === 'confirmed' || event.data.status === 'rejected') {
        window.sessionStorage.removeItem('kurio.pending-order-id')
      }

      queryClient.invalidateQueries({
        queryKey: ['user', authUserId, 'orders'],
      })
      queryClient.invalidateQueries({
        queryKey: ['user', authUserId, 'orders', event.data.orderId],
      })
    }

    ;(async () => {
      if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
        window.dispatchEvent(new Event('kurio:initialize-mock-controls'))
        const { mockBootstrapWindow } = await import('@/mocks/globals')
        const ready = mockBootstrapWindow().__KURIO_MOCKS_READY__
        if (ready) await ready
        const { whenSocketMockReady } = await import('@/mocks/socket-ready')
        await whenSocketMockReady()
      }
      if (!active) return
      const { io } = await import('socket.io-client')
      if (!active) return
      socket = io(window.location.origin, {
        autoConnect: false,
        path: '/socket.io/',
        transports: ['websocket'],
      })

      socket.on('connect', () => {
        socket?.emit('mock:subscribe', sessionToken)
      })
      socket.on('nft.updated', (payload: unknown) => {
        const event = payload as NftUpdatedEvent
        handleNftUpdated(event)
      })
      socket.on('order.updated', (payload: unknown) => {
        const event = payload as OrderUpdatedEvent
        handleOrderUpdated(event)
      })
      socket.connect()
    })()

    return () => {
      active = false
      onAnnouncement('')
      socket?.removeAllListeners()
      socket?.disconnect()
    }
  }, [authUserId, onAnnouncement, sessionToken])

  return null
}
