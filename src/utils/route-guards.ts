import { redirect } from '@tanstack/react-router'
import type { RouterContext } from '../types/router'

const PRIVATE_ROUTE_PREFIXES = [
  '/carrinho',
  '/pagamento',
  '/checkout',
  '/pedidos',
  '/perfil',
  '/carteiras',
  '/favoritos',
] as const

type ProtectedRouteContext = {
  context: RouterContext
  location: { href: string; pathname?: string }
  sessionExpired?: boolean
}

function isPrivateRoute(pathname: string): boolean {
  return PRIVATE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function requireAuthenticated({
  context,
  location,
  sessionExpired,
}: ProtectedRouteContext): void {
  if (context.session.status === 'guest') {
    const target = new URL(location.href, 'http://kurio.local')
    const returnUrl = `${target.pathname}${target.search}${target.hash}`
    const search = new URLSearchParams({ redirect: returnUrl })
    if (sessionExpired) search.set('reason', 'expired')
    throw redirect({
      href: `/login?${search.toString()}`,
    })
  }
}

export { isPrivateRoute, requireAuthenticated, type ProtectedRouteContext }
