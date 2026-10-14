import { redirect } from '@tanstack/react-router'
import type { RouterContext } from '../types/router'

type ProtectedRouteContext = {
  context: RouterContext
  location: { href: string }
}

function requireAuthenticated({
  context,
  location,
}: ProtectedRouteContext): void {
  if (context.session.status === 'guest') {
    throw redirect({
      href: `/login?redirect=${encodeURIComponent(location.href)}`,
    })
  }
}

export { requireAuthenticated, type ProtectedRouteContext }
