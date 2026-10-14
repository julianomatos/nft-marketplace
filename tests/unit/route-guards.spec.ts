import { expect, test } from '@playwright/test'
import { requireAuthenticated } from '../../src/utils/route-guards'

test('redirects guest guard requests to login with their return URL', () => {
  expect(() =>
    requireAuthenticated({
      context: { session: { status: 'guest' } },
      location: { href: '/carrinho?item=ape' },
    }),
  ).toThrow()

  try {
    requireAuthenticated({
      context: { session: { status: 'guest' } },
      location: { href: '/carrinho?item=ape' },
    })
  } catch (error) {
    expect(error).toMatchObject({
      options: {
        href: '/login?redirect=%2Fcarrinho%3Fitem%3Dape',
      },
    })
  }

  expect(() =>
    requireAuthenticated({
      context: {
        session: {
          status: 'authenticated',
          userId: 'collector-1',
          displayName: 'Collector',
        },
      },
      location: { href: '/perfil' },
    }),
  ).not.toThrow()
})
