import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  context: { session: { status: 'guest' } },
  defaultPreload: 'intent',
  defaultPendingMs: 100,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
