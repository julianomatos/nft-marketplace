import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Heart,
  Home,
  ScanLine,
  ShoppingCart,
  UserRound,
} from 'lucide-react'

const destinations = [
  {
    label: 'Início',
    icon: Home,
    activePaths: ['/'],
    column: 'col-start-1',
    to: '/' as const,
  },
  {
    label: 'Favoritos',
    icon: Heart,
    activePaths: ['/favoritos'],
    column: 'col-start-2',
    to: '/indisponivel' as const,
  },
  {
    label: 'Carrinho',
    icon: ShoppingCart,
    activePaths: ['/carrinho', '/pagamento', '/checkout', '/pedidos'],
    column: 'col-start-4',
    to: '/carrinho' as const,
  },
  {
    label: 'Perfil',
    icon: UserRound,
    activePaths: ['/perfil', '/carteiras'],
    column: 'col-start-5',
    to: '/indisponivel' as const,
  },
]

function MobileBottomNavigation() {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  async function focusCatalogSearch() {
    if (pathname !== '/') {
      await navigate({ to: '/', search: { page: 1 } })
    }
    document.getElementById('mobile-catalog-search')?.focus()
  }

  return (
    <nav
      aria-label="Navegação mobile"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border-header bg-card px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-center">
        {destinations.map(({ activePaths, column, icon: Icon, label, to }) => {
          const isActive = activePaths.some(
            (path) =>
              pathname === path ||
              (path !== '/' && pathname.startsWith(`${path}/`)),
          )

          return (
            <li className={column} key={label}>
              <Link
                aria-current={isActive ? 'page' : undefined}
                aria-label={label}
                className={`mx-auto flex size-12 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-highlight'
                }`}
                to={to}
              >
                <Icon aria-hidden="true" size={24} />
                <span className="sr-only">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      <button
        aria-label="Explorar coleções"
        className="absolute left-1/2 top-0 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-background bg-primary-gradient text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        onClick={() => void focusCatalogSearch()}
        type="button"
      >
        <ScanLine aria-hidden="true" size={32} />
      </button>
    </nav>
  )
}

export { MobileBottomNavigation }
