import { Link, useRouterState } from '@tanstack/react-router'
import { LogIn, Search, ShoppingCart, UserRound } from 'lucide-react'
import kurioWordmark from '@/assets/kurio-wordmark.svg'
import { Badge } from '@/components/ui/badge'

export type SiteHeaderSession =
  | { status: 'guest' }
  | { status: 'authenticated'; displayName: string }

type SiteHeaderProps = {
  session: SiteHeaderSession
  cartCount?: number
}

function SiteHeader({ session, cartCount }: SiteHeaderProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isHome = pathname === '/'
  const isMarket = ['/nfts', '/carrinho', '/checkout', '/favoritos'].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
  const visibleCartCount =
    cartCount === undefined ? undefined : Math.max(0, Math.trunc(cartCount))

  const navClassName = (active: boolean) =>
    `relative flex h-full items-center border-b-2 px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
      active
        ? 'border-primary text-highlight'
        : 'border-transparent text-foreground hover:text-highlight'
    }`

  return (
    <header className="border-b border-border-header">
      <div className="mx-auto flex min-h-14 max-w-300 items-center justify-between gap-4 px-6 md:px-12">
        <Link
          aria-label="KURIO — início"
          className="shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          to="/"
        >
          <img alt="KURIO" className="h-6 w-18" src={kurioWordmark} />
        </Link>

        <nav aria-label="Navegação principal" className="hidden h-14 items-center md:flex">
          <Link className={navClassName(isHome)} to="/">
            Início
          </Link>
          <Link
            aria-current={isMarket ? 'page' : undefined}
            className={navClassName(isMarket)}
            hash="catalog"
            to="/"
          >
            Mercado
          </Link>
          <Link className={navClassName(false)} to="/indisponivel">
            Criadores
          </Link>
          <Link className={navClassName(false)} to="/indisponivel">
            Aprenda
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            aria-label="Buscar coleções"
            className="flex size-9 items-center justify-center text-foreground transition-colors hover:text-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            hash="catalog"
            to="/"
          >
            <Search aria-hidden="true" size={18} />
          </Link>
          <Link
            aria-label={
              visibleCartCount !== undefined && visibleCartCount > 0
                ? `Carrinho, ${visibleCartCount} ${
                    visibleCartCount === 1 ? 'item' : 'itens'
                  }`
                : 'Carrinho'
            }
            className="relative flex size-9 items-center justify-center text-foreground transition-colors hover:text-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            to="/indisponivel"
          >
            <ShoppingCart aria-hidden="true" size={18} />
            {visibleCartCount !== undefined && visibleCartCount > 0 && (
              <Badge className="absolute right-0 top-0 min-h-4 min-w-4 rounded-full px-1 text-[9px]">
                {visibleCartCount > 99 ? '99+' : visibleCartCount}
              </Badge>
            )}
          </Link>

          {session.status === 'guest' ? (
            <Link
              className="hidden min-h-8 items-center gap-1.5 rounded-sm bg-primary px-3 text-xs font-bold text-primary-foreground transition-colors hover:bg-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:inline-flex"
              to="/indisponivel"
            >
              <LogIn aria-hidden="true" size={14} />
              Entrar
            </Link>
          ) : (
            <details className="group relative">
              <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1.5 rounded-sm border border-border px-2 text-xs font-bold text-foreground hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                <UserRound aria-hidden="true" size={14} />
                <span className="max-w-24 truncate">{session.displayName}</span>
              </summary>
              <nav
                aria-label="Menu da conta"
                className="absolute right-0 top-full z-40 mt-2 min-w-44 border border-border bg-card p-2 shadow-lg"
              >
                {['Meu perfil', 'Carteiras', 'Favoritos'].map((label) => (
                  <Link
                    className="block px-3 py-2 text-xs text-foreground hover:bg-surface-raised hover:text-highlight focus-visible:outline-2 focus-visible:outline-ring"
                    key={label}
                    to="/indisponivel"
                  >
                    {label}
                  </Link>
                ))}
                <button
                  className="block w-full cursor-not-allowed px-3 py-2 text-left text-xs text-muted-foreground"
                  disabled
                  title="Sair ficará disponível quando a sessão estiver implementada."
                  type="button"
                >
                  Sair
                </button>
              </nav>
            </details>
          )}
        </div>
      </div>
    </header>
  )
}

export { SiteHeader }
