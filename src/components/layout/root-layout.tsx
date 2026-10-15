import {
  Outlet,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { MobileBottomNavigation } from '@/components/layout/mobile-bottom-navigation'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { HomeIntro } from '@/components/home/home-intro'
import { Button } from '@/components/ui/button'
import { queryKeys } from '@/hooks/queryKeys'
import { useSession } from '@/hooks/use-session'
import { queryClient } from '@/lib/query-client'
import {
  getSessionToken,
  SESSION_CHANGED_EVENT,
  SESSION_EXPIRED_EVENT,
  setSessionToken,
} from '@/services/api-client'
import { saveAuthReturnContext } from '@/utils/auth-return-context'
import type { CartResponse } from '@/types/contracts'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/types/events'
import type { RouterSession } from '@/types/router'
import { mul } from '@/utils/eth'

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

function AuthBackground({ pathname }: { pathname: string }) {
  if (pathname === '/indisponivel') {
    return (
      <section className="kurio-container py-8 md:py-12">
        <div className="flex min-h-88 flex-col items-start justify-center border-y border-border py-12">
          <p className="mb-4 text-sm font-bold uppercase tracking-wide text-highlight">
            KURIO · Aviso
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Esta funcionalidade ainda não está disponível.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            Nenhuma ação foi realizada. Volte ao início para continuar explorando
            a demonstração.
          </p>
        </div>
      </section>
    )
  }

  return <HomeIntro background />
}

function RootLayout() {
  const router = useRouter()
  const sessionQuery = useSession()
  const handledSessionExpiry = useRef(false)
  const [, refreshSession] = useReducer((revision: number) => revision + 1, 0)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isAuthRoute = pathname === '/login' || pathname === '/signup'
  const sessionToken = getSessionToken()
  const [backgroundPath, setBackgroundPath] = useState(
    isAuthRoute ? '/' : pathname,
  )
  const session = useMemo<RouterSession>(() => {
    const data = sessionQuery.data
    return sessionToken && data?.authenticated
      ? {
          status: 'authenticated',
          userId: data.user.id,
          displayName: data.user.displayName,
        }
      : { status: 'guest' }
  }, [sessionQuery.data, sessionToken])

  useEffect(
    () =>
      router.subscribe('onResolved', () => {
        const resolvedPath = router.state.location.pathname
        if (resolvedPath !== '/login' && resolvedPath !== '/signup') {
          setBackgroundPath(resolvedPath)
        }
      }),
    [router],
  )

  useEffect(() => {
    const currentSession = router.options.context.session
    if (
      currentSession.status === session.status &&
      (currentSession.status === 'guest' ||
        (session.status === 'authenticated' &&
          currentSession.userId === session.userId &&
          currentSession.displayName === session.displayName))
    ) {
      return
    }

    router.update({ context: { session } })
    void router.invalidate()
  }, [router, session])

  useEffect(() => {
    if (session.status === 'authenticated') {
      handledSessionExpiry.current = false
    }
  }, [session.status])

  useEffect(() => {
    function handleSessionChanged() {
      refreshSession()
    }

    window.addEventListener(SESSION_CHANGED_EVENT, handleSessionChanged)
    return () =>
      window.removeEventListener(SESSION_CHANGED_EVENT, handleSessionChanged)
  }, [])

  const processedEventIds = useRef(new Set<string>())
  const lastSeenNftVersions = useRef(new Map<string, number>())
  const lastSeenOrderVersions = useRef(new Map<string, number>())
  const [liveAnnouncement, setLiveAnnouncement] = useState('')
  const authUserId = session.status === 'authenticated' ? session.userId : null

  useEffect(() => {
    if (session.status !== 'authenticated' || !sessionToken || !authUserId) {
      return
    }

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
      setLiveAnnouncement(availabilityText)

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
      const { io } = await import('socket.io-client')
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
      setLiveAnnouncement('')
      socket?.removeAllListeners()
      socket?.disconnect()
    }
  }, [authUserId, session.status, sessionToken])

  useEffect(() => {
    function handleSessionExpired() {
      if (handledSessionExpiry.current) return
      handledSessionExpiry.current = true
      const currentLocation = router.state.location
      const returnTarget = saveAuthReturnContext(currentLocation.href)
      queryClient.clear()
      setSessionToken(null)
      router.update({ context: { session: { status: 'guest' } } })
      void router.navigate({
        to: '/login',
        search: {
          redirect: returnTarget ?? undefined,
          reason: 'expired',
        },
      })
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [router])

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24 text-foreground antialiased md:pb-0">
      <a
        className="sr-only z-100 bg-primary px-4 py-2 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#main-content"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader session={session} />
      <main id="main-content" className="flex-1">
        {sessionQuery.isError && (
          <div
            aria-live="assertive"
            className="kurio-container flex items-center justify-between gap-4 py-3 text-sm text-destructive"
            role="alert"
          >
            <span>
              {sessionQuery.error instanceof Error
                ? sessionQuery.error.message
                : 'Não foi possível recuperar sua sessão.'}
            </span>
            <Button
              onClick={() => void sessionQuery.refetch()}
              size="sm"
              type="button"
              variant="outline"
            >
              Tentar novamente
            </Button>
          </div>
        )}
        {isAuthRoute && (
          <div
            aria-hidden="true"
            className="pointer-events-none hidden md:block"
            inert
          >
            <AuthBackground pathname={backgroundPath} />
          </div>
        )}
        <div aria-live="polite" className="sr-only" role="status">
          {liveAnnouncement}
        </div>
        <Outlet />
      </main>
      <SiteFooter />
      <MobileBottomNavigation />
    </div>
  )
}

export { RootLayout }
