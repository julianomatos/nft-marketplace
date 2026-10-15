import { Link, useRouterState } from '@tanstack/react-router'
import { CreditCard, Heart, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { useSession } from '@/hooks/use-session'

const profileNavItems = [
  { label: 'Dados do perfil', to: '/perfil', icon: UserRound },
  { label: 'Carteiras', to: '/carteiras', icon: CreditCard },
  { label: 'Lista de interesse', to: '/favoritos', icon: Heart },
] as const

type ProfileLayoutProps = {
  children: ReactNode
  description: string
  title: string
}

function ProfileLayout({ children, description, title }: ProfileLayoutProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <div className="kurio-container py-8 md:py-10">
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="rounded-sm border border-border bg-card p-3 md:p-4">
          <p className="mb-4 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-highlight">
            Conta
          </p>
          <nav aria-label="Perfil e conta" className="space-y-1">
            {profileNavItems.map(({ icon: Icon, label, to }) => {
              const isActive = pathname === to || pathname.startsWith(`${to}/`)
              return (
                <Link
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'flex items-center gap-3 rounded-sm px-3 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    isActive
                      ? 'border-l-4 border-primary bg-surface-raised text-highlight'
                      : 'border-l-4 border-transparent text-foreground hover:bg-surface-raised hover:text-highlight',
                  ].join(' ')}
                  key={label}
                  to={to}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="space-y-6">
          <header className="rounded-sm border border-border bg-card p-5 md:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-highlight">
              Minha conta
            </p>
            <h1 className="mt-3 text-3xl font-bold text-foreground">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </header>

          <div className="rounded-sm border border-border bg-card p-5 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function ProfileOverviewPage() {
  const sessionQuery = useSession()
  const user = sessionQuery.data?.authenticated ? sessionQuery.data.user : null

  return (
    <ProfileLayout
      description="Gerencie sua identidade digital, preferências e acesso à sua coleção."
      title="Dados do perfil"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-sm border border-border bg-surface-raised p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-highlight">
            Identidade
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {user?.displayName?.slice(0, 1) ?? 'K'}
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {user?.displayName ?? 'Colecionador'}
              </p>
              <p className="text-sm text-muted-foreground">
                @{user?.username ?? 'kurio-user'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-border bg-surface-raised p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-highlight">
            Contato
          </p>
          <dl className="mt-4 space-y-3 text-sm text-foreground">
            <div>
              <dt className="text-muted-foreground">E-mail</dt>
              <dd className="font-medium">{user?.email ?? 'colecionador@kurio.example.test'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ENS</dt>
              <dd className="font-medium">{user?.ensName ?? 'ana.kurio.eth'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 rounded-sm border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
        Esta área será preenchida com edição de perfil, avatar e alteração de senha no próximo passo do Epic 9.
      </div>
    </ProfileLayout>
  )
}

function WalletsPage() {
  return (
    <ProfileLayout
      description="Gerencie suas carteiras principais e secundárias para compras, recebimentos e confirmação de transações."
      title="Carteiras"
    >
      <div className="space-y-4">
        <div className="rounded-sm border border-border bg-surface-raised p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-highlight">
            Principal
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-foreground">MetaMask</p>
              <p className="text-sm text-muted-foreground">0x1111...1111</p>
            </div>
            <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
              Conectada
            </span>
          </div>
        </div>

        <div className="rounded-sm border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
          A adição, edição e validação de carteiras entram na próxima tarefa do Epic 9.
        </div>
      </div>
    </ProfileLayout>
  )
}

function FavoritesPage() {
  return (
    <ProfileLayout
      description="Acompanhe seus NFTs favoritos e retorne rapidamente para os itens que você mais deseja acompanhar."
      title="Lista de interesse"
    >
      <div className="rounded-sm border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
        Nenhum item foi salvo ainda. Explore o catálogo e marque seus favoritos para continuar aqui.
      </div>
    </ProfileLayout>
  )
}

export { FavoritesPage, ProfileOverviewPage, ProfileLayout, WalletsPage }
