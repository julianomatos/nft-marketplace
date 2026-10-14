import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, Home, Search, ShoppingCart, UserRound } from 'lucide-react'

const destinations = [
  { label: 'Início', icon: Home, to: '/' as const },
  { label: 'Favoritos', icon: Heart, to: '/indisponivel' as const },
  { label: 'Explorar', icon: Search, to: '/' as const },
  { label: 'Carrinho', icon: ShoppingCart, to: '/indisponivel' as const },
  { label: 'Perfil', icon: UserRound, to: '/indisponivel' as const },
]

function MobileBottomNavigation() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <nav
      aria-label="Navegação mobile"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-end justify-around">
        {destinations.map(({ icon: Icon, label, to }) => {
          const isActive = label === 'Início' && pathname === '/'

          return (
            <li className="flex-1" key={label}>
              <Link
                aria-current={isActive ? 'page' : undefined}
                aria-label={label}
                className={`mx-auto flex min-h-12 w-fit min-w-12 flex-col items-center justify-center gap-1 px-2 text-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  label === 'Explorar'
                    ? '-mt-7 size-14 rounded-full bg-primary text-primary-foreground shadow-lg'
                    : isActive
                      ? 'text-highlight'
                      : 'text-muted-foreground hover:text-highlight'
                }`}
                hash={label === 'Explorar' ? 'catalog' : undefined}
                to={to}
              >
                <Icon aria-hidden="true" size={20} />
                <span className={label === 'Explorar' ? 'sr-only' : undefined}>
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export { MobileBottomNavigation }
