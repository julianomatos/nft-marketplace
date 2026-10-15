import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { TicketPercent, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { useCart } from '@/hooks/use-cart'
import { ApiClientError } from '@/utils/errors'
import { format } from '@/utils/eth'

type SummaryRow = {
  label: string
  value: string
}

type SummaryPanelProps = {
  rows: SummaryRow[]
  total: string
  activeCoupon: { code: string } | null
  couponCode: string
  onCouponCodeChange: (nextValue: string) => void
  couponError: string | null
  onApplyCoupon: (event: FormEvent<HTMLFormElement>) => void
  onRemoveCoupon: () => void
  onContinueToCheckout: () => void
  isCouponUpdating: boolean
  isUpdating: boolean
  isLoading?: boolean
  isMobile?: boolean
  itemCount: number
}

function SummaryPanel({
  rows,
  total,
  activeCoupon,
  couponCode,
  onCouponCodeChange,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  onContinueToCheckout,
  isCouponUpdating,
  isUpdating,
  isLoading = false,
  isMobile = false,
  itemCount,
}: SummaryPanelProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
            Resumo
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="flex items-center justify-between gap-3" key={index}>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : (
          rows.map(({ label, value }) => (
            <div
              className="flex items-center justify-between gap-3 text-sm"
              key={label}
            >
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium text-foreground">
                {format(value)} ETH
              </span>
            </div>
          ))
        )}
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-highlight">
            Cupom
          </h3>
          {activeCoupon && !isCouponUpdating && (
            <Button
              aria-label="Remover cupom"
              onClick={onRemoveCoupon}
              size="xs"
              type="button"
              variant="ghost"
            >
              Remover
            </Button>
          )}
        </div>

        {activeCoupon ? (
          <div className="flex items-center justify-between gap-3 rounded-sm border border-primary/30 bg-primary/5 px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <TicketPercent aria-hidden="true" className="text-highlight" size={16} />
              <span className="font-medium">{activeCoupon.code}</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
              Aplicado
            </span>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={onApplyCoupon}>
            <Input
              className="uppercase"
              containerClassName="w-full"
              label={<span className="sr-only">Código do cupom</span>}
              onChange={(event) => onCouponCodeChange(event.target.value)}
              placeholder="KURIO10"
              value={couponCode}
            />

            {couponError && (
              <p className="text-sm text-destructive" role="alert">
                {couponError}
              </p>
            )}

            <Button
              className="w-full"
              disabled={isCouponUpdating || !couponCode.trim()}
              loading={isCouponUpdating}
              type="submit"
            >
              Aplicar cupom
            </Button>
          </form>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3 text-base font-bold text-foreground">
          <span>Total</span>
          {isLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <span className="text-highlight">{format(total)} ETH</span>
          )}
        </div>
      </div>

      <Button
        className={isMobile ? 'w-full' : 'mt-2 w-full'}
        disabled={isUpdating || itemCount === 0 || isLoading}
        onClick={onContinueToCheckout}
        type="button"
      >
        Continuar para pagamento
      </Button>

      <div aria-live="polite" className="sr-only" role="status">
        {isUpdating ? 'Atualizando carrinho…' : 'Carrinho pronto.'}
      </div>
    </div>
  )
}

function CartPage() {
  const {
    cartQuery,
    cartQuoteQuery,
    data,
    quote,
    isPending,
    isError,
    refetch,
    updateQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
    isUpdating,
    isCouponUpdating,
  } = useCart()

  const [couponCode, setCouponCode] = useState('')
  const [couponError, setCouponError] = useState<string | null>(null)
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false)
  const navigate = useNavigate()

  const activeCoupon = quote?.coupon ?? data?.coupon ?? null

  const handleApplyCoupon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedCode = couponCode.trim()
    if (!trimmedCode) {
      setCouponError('Informe um código de cupom.')
      return
    }

    try {
      setCouponError(null)
      await applyCoupon(trimmedCode)
      setCouponCode('')
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setMobileSummaryOpen(true)
      }
    } catch (error) {
      const apiError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError({ code: 'UNEXPECTED_ERROR' })
      setCouponError(apiError.fieldErrors?.code?.[0] ?? apiError.message)
    }
  }

  const handleRemoveCoupon = async () => {
    try {
      setCouponError(null)
      await removeCoupon()
      setCouponCode('')
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setMobileSummaryOpen(true)
      }
    } catch (error) {
      const apiError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError({ code: 'UNEXPECTED_ERROR' })
      setCouponError(apiError.fieldErrors?.code?.[0] ?? apiError.message)
    }
  }

  if (isPending && !data) {
    return (
      <div className="kurio-container grid gap-8 py-8 pb-24 lg:grid-cols-[minmax(0,1.8fr)_minmax(20rem,0.9fr)] lg:items-start">
        <section aria-label="Carrinho em carregamento" className="space-y-4" role="status">
          <Skeleton className="h-10 w-52" />
          <div className="space-y-4">
            {Array.from({ length: 2 }, (_, index) => (
              <div
                className="grid gap-4 border border-border bg-card p-4 md:grid-cols-[7rem_minmax(0,1fr)]"
                key={index}
              >
                <Skeleton className="aspect-square w-full" />
                <div className="space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-8 w-28" />
                </div>
              </div>
            ))}
          </div>
        </section>
        <aside className="border border-border bg-card p-5">
          <Skeleton className="h-6 w-32" />
          <div className="mt-6 space-y-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </aside>
      </div>
    )
  }

  if (isError && !data) {
    return (
      <div className="kurio-container py-12">
        <ErrorState
          description="Não foi possível carregar o carrinho. Verifique sua conexão e tente novamente."
          onRetry={() => void refetch()}
          retrying={cartQuery.isFetching || cartQuoteQuery.isFetching}
          title="Falha ao carregar o carrinho"
        />
      </div>
    )
  }

  const cartItems = data?.items ?? []
  const isSummaryLoading = cartQuoteQuery.isPending && Boolean(data)

  if (cartItems.length === 0) {
    return (
      <div className="kurio-container py-12 pb-24">
        <EmptyState
          description="Adicione NFTs ao seu carrinho para acompanhar preços, edição e total do pedido."
          title="Seu carrinho está vazio"
        />
        <div className="mt-6">
          <Button asChild>
            <Link to="/">Explorar NFTs</Link>
          </Button>
        </div>
      </div>
    )
  }

  const rows: SummaryRow[] = [
    { label: 'Subtotal', value: quote?.subtotal ?? '0' },
    { label: 'Desconto', value: quote?.discount ?? '0' },
    { label: 'Taxa da rede', value: quote?.networkFee ?? '0' },
  ]

  return (
    <div className="kurio-container py-8 pb-24 md:py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
            Carrinho
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            Meu carrinho
          </h1>
        </div>
        <span className="rounded-full border border-border bg-surface-raised px-3 py-1 text-xs text-muted-foreground">
          {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(20rem,0.9fr)] lg:items-start">
        <section aria-label="Itens do carrinho" className="space-y-4">
          {cartItems.map((item) => (
            <article
              className="grid gap-4 border border-border bg-card p-3 sm:p-4 md:grid-cols-[5.5rem_minmax(0,1fr)]"
              key={item.id}
            >
              <img
                alt={item.nft.name}
                className="aspect-square w-full rounded-sm object-cover"
                height={item.nft.images[0]?.height ?? 240}
                loading="lazy"
                src={item.nft.images[0]?.url ?? '/favicon.svg'}
                width={item.nft.images[0]?.width ?? 240}
              />

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-highlight">
                      {item.nft.collection}
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-foreground">
                      {item.nft.name}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-primary/60 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-highlight">
                        Edição {item.edition}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {item.unitPrice} ETH cada
                      </span>
                    </div>
                  </div>

                  <p className="text-lg font-bold text-highlight">
                    {format(item.lineTotal)} ETH
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <QuantityStepper
                    label={`quantidade de ${item.nft.name}`}
                    max={item.available}
                    onValueChange={(nextQuantity) => {
                      if (nextQuantity < 1) return
                      void updateQuantity(item.id, nextQuantity)
                    }}
                    size="compact"
                    value={item.quantity}
                  />

                  <Button
                    aria-label={`Remover ${item.nft.name} do carrinho`}
                    className="w-fit"
                    onClick={() => void removeItem(item.id)}
                    type="button"
                    variant="outline"
                  >
                    <Trash2 aria-hidden="true" className="mr-2" size={16} />
                    Remover
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </section>

        <aside
          aria-label="Resumo do carrinho"
          className="hidden border border-border bg-card p-5 lg:block"
        >
          <SummaryPanel
            activeCoupon={activeCoupon}
            couponCode={couponCode}
            couponError={couponError}
            isCouponUpdating={isCouponUpdating}
            isLoading={isSummaryLoading}
            isUpdating={isUpdating}
            itemCount={cartItems.length}
            onApplyCoupon={handleApplyCoupon}
            onCouponCodeChange={setCouponCode}
            onContinueToCheckout={() => void navigate({ to: '/pagamento' })}
            onRemoveCoupon={handleRemoveCoupon}
            rows={rows}
            total={quote?.total ?? '0'}
          />
        </aside>
      </div>

      <div className="mt-6 lg:hidden">
        <Button
          className="w-full"
          onClick={() => setMobileSummaryOpen(true)}
          type="button"
          variant="secondary"
        >
          Ver resumo e cupom
        </Button>
      </div>

      <Drawer
        description="Confira os valores do pedido e aplique seu código promocional."
        onOpenChange={setMobileSummaryOpen}
        open={mobileSummaryOpen}
        title="Resumo do carrinho"
      >
        <SummaryPanel
          activeCoupon={activeCoupon}
          couponCode={couponCode}
          couponError={couponError}
          isCouponUpdating={isCouponUpdating}
          isLoading={isSummaryLoading}
          isUpdating={isUpdating}
          isMobile
          itemCount={cartItems.length}
          onApplyCoupon={handleApplyCoupon}
          onCouponCodeChange={setCouponCode}
          onContinueToCheckout={() => {
            setMobileSummaryOpen(false)
            void navigate({ to: '/pagamento' })
          }}
          onRemoveCoupon={handleRemoveCoupon}
          rows={rows}
          total={quote?.total ?? '0'}
        />
      </Drawer>
    </div>
  )
}

export { CartPage }
