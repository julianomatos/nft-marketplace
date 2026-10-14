import { expect, test } from '@playwright/test'
import {
  isPrivateRoute,
  requireAuthenticated,
} from '../../src/utils/route-guards'
import { getSafeInternalRedirect } from '../../src/utils/auth-return-context'

test('recognizes planned private route roots and nested routes', () => {
  expect(isPrivateRoute('/carrinho')).toBe(true)
  expect(isPrivateRoute('/pagamento/confirmar')).toBe(true)
  expect(isPrivateRoute('/pedidos/order-1')).toBe(true)
  expect(isPrivateRoute('/perfil/favoritos')).toBe(true)
  expect(isPrivateRoute('/nft/emerald-ape')).toBe(false)
})

test('redirects guests to login with the exact return path and query', () => {
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

test('marks an expired session in the login redirect and rejects unsafe destinations', () => {
  try {
    requireAuthenticated({
      context: { session: { status: 'guest' } },
      location: { href: '/pagamento?step=review' },
      sessionExpired: true,
    })
  } catch (error) {
    expect(error).toMatchObject({
      options: {
        href: '/login?redirect=%2Fpagamento%3Fstep%3Dreview&reason=expired',
      },
    })
  }

  expect(getSafeInternalRedirect('/perfil?tab=wallets#form')).toBe(
    '/perfil?tab=wallets#form',
  )
  expect(getSafeInternalRedirect('https://evil.example')).toBeNull()
  expect(getSafeInternalRedirect('//evil.example')).toBeNull()
  expect(getSafeInternalRedirect('/login')).toBeNull()
})
