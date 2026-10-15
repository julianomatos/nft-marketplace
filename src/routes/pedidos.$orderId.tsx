import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { queryKeys } from '@/hooks/queryKeys'
import { useSession } from '@/hooks/use-session'
import { apiClient } from '@/services/api-client'
import { API_ENDPOINTS } from '@/types/endpoints'
import type { GetOrderResponse } from '@/types/contracts'
import { format } from '@/utils/eth'

export const Route = createFileRoute('/pedidos/$orderId')({
  component: function OrderReceiptPage() {
    const { orderId } = Route.useParams()
    const sessionQuery = useSession()
    const userId = sessionQuery.data?.authenticated ? sessionQuery.data.user.id : undefined

    const orderQuery = useQuery({
      enabled: !!userId,
      queryKey: userId ? queryKeys.user(userId).order(orderId) : ['orders', orderId],
      queryFn: async ({ signal }) => {
        const response = await apiClient.get<GetOrderResponse>(
          API_ENDPOINTS.orders.detail(orderId),
          { signal },
        )
        return response.data
      },
      refetchInterval: (query) =>
        query.state.data?.status === 'pending' ? 5_000 : false,
    })

    const order = orderQuery.data

    if (orderQuery.isPending) {
      return (
        <div className="kurio-container py-8 md:py-12">
          <div className="mx-auto max-w-3xl rounded-sm border border-border bg-card p-6">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="mt-6 h-8 w-56 animate-pulse rounded bg-muted" />
            <div className="mt-8 space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
              <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      )
    }

    if (orderQuery.isError || !order) {
      return (
        <div className="kurio-container py-8 md:py-12">
          <div className="mx-auto max-w-xl rounded-sm border border-border bg-card p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
              Pedido
            </p>
            <h1 className="mt-3 text-3xl font-bold text-foreground">
              Não foi possível carregar o recibo
            </h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Não conseguimos localizar este pedido ou a informação não está disponível agora.
            </p>
            <div className="mt-6 flex gap-3">
              <Button asChild type="button">
                <Link to="/pagamento">Voltar ao checkout</Link>
              </Button>
              <Button asChild variant="outline" type="button">
                <Link to="/">Ir ao início</Link>
              </Button>
            </div>
          </div>
        </div>
      )
    }

    const statusContent = {
      pending: {
        icon: <Clock3 aria-hidden="true" className="text-highlight" size={20} />,
        title: 'Pedido em processamento',
        description: 'Aguardando confirmação da rede e do provedor de pagamento.',
        tone: 'text-highlight',
      },
      confirmed: {
        icon: <CheckCircle2 aria-hidden="true" className="text-success" size={20} />,
        title: 'Pedido confirmado',
        description: 'Seu pedido foi validado e está pronto para acompanhamento.',
        tone: 'text-success',
      },
      rejected: {
        icon: <AlertCircle aria-hidden="true" className="text-destructive" size={20} />,
        title: 'Pedido não confirmado',
        description: 'A compra não foi concluída e os itens permaneceram no carrinho.',
        tone: 'text-destructive',
      },
    }[order.status]

    return (
      <div className="kurio-container py-8 pb-24 md:py-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center gap-3">
            <Button asChild size="icon-sm" type="button" variant="outline">
              <Link to="/">
                <ArrowLeft aria-hidden="true" size={16} />
                <span className="sr-only">Voltar ao início</span>
              </Link>
            </Button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
                Recibo
              </p>
              <h1 className="mt-2 text-3xl font-bold text-foreground">{statusContent.title}</h1>
            </div>
          </div>

          <section className="rounded-sm border border-border bg-card p-6">
            <div className={`mb-4 flex items-center gap-3 ${statusContent.tone}`}>
              {statusContent.icon}
              <span className="text-sm font-bold uppercase tracking-[0.18em]">
                #{order.orderId}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{statusContent.description}</p>

            {order.status === 'confirmed' && order.explorerUrl && (
              <div className="mt-4">
                <a
                  className="inline-flex items-center text-sm font-medium text-highlight underline-offset-4 hover:underline"
                  href={order.explorerUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Ver transação na rede
                </a>
              </div>
            )}
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.75fr)]">
            <div className="rounded-sm border border-border bg-card p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
                Itens
              </p>
              <div className="mt-4 space-y-4">
                {order.items.map((item) => (
                  <div
                    className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-b-0 last:pb-0"
                    key={`${item.nftId}-${item.edition}`}
                  >
                    <div>
                      <p className="font-bold text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Edição {item.edition} · {item.quantity} unidade{item.quantity > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right text-sm text-foreground">
                      <p>{format(item.unitPrice)} ETH</p>
                      <p className="mt-1 font-medium text-muted-foreground">
                        {format(item.subtotal)} ETH
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-sm border border-border bg-card p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
                Resumo
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">{format(order.subtotal)} ETH</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Desconto</span>
                  <span className="font-medium text-foreground">{format(order.discount)} ETH</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Taxa da rede</span>
                  <span className="font-medium text-foreground">{format(order.fee)} ETH</span>
                </div>
                <div className="border-t border-border pt-3 text-base font-bold text-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span>Total</span>
                    <span className="text-highlight">{format(order.total)} ETH</span>
                  </div>
                </div>
              </div>
            </aside>
          </section>

          {order.status === 'rejected' && (
            <div className="flex flex-wrap gap-3">
              <Button asChild type="button">
                <Link to="/pagamento">Tentar novamente</Link>
              </Button>
              <Button asChild variant="outline" type="button">
                <Link to="/carrinho">Voltar ao carrinho</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  },
})
