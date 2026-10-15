import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearch } from '@tanstack/react-router'
import { ArrowLeft, Check, ShieldCheck, Wallet2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useCart } from '@/hooks/use-cart'
import { queryKeys } from '@/hooks/queryKeys'
import { useSession } from '@/hooks/use-session'
import { apiClient, IDEMPOTENCY_KEY_HEADER } from '@/services/api-client'
import {
  CHECKOUT_DRAFT_STORAGE_KEY,
  CHECKOUT_IDEMPOTENCY_KEY_STORAGE_KEY,
  PENDING_ORDER_ID_STORAGE_KEY,
} from '@/utils/auth-return-context'
import {
  collectorDataSchema,
  type CollectorData,
  type Network,
  type Profile,
  type Wallet,
  type WalletProvider,
} from '@/types/contracts'
import { API_ENDPOINTS } from '@/types/endpoints'
import { ApiClientError } from '@/utils/errors'
import { format } from '@/utils/eth'

const walletProviders: { value: WalletProvider; label: string }[] = [
  { value: 'metamask', label: 'MetaMask' },
  { value: 'walletconnect', label: 'WalletConnect' },
  { value: 'coinbase', label: 'Coinbase Wallet' },
]

const networks: { value: Network; label: string }[] = [
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'solana', label: 'Solana' },
]

const readStoredCheckoutDraft = (): Partial<CollectorData> | null => {
  if (typeof window === 'undefined') return null

  const raw = window.sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<CollectorData>
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const readStoredIdempotencyKey = (): string | null => {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(CHECKOUT_IDEMPOTENCY_KEY_STORAGE_KEY)
}

const writeStoredIdempotencyKey = (value: string): void => {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(CHECKOUT_IDEMPOTENCY_KEY_STORAGE_KEY, value)
}

const getOrCreateIdempotencyKey = (): string => {
  const current = readStoredIdempotencyKey()
  if (current) return current

  const generated = crypto.randomUUID()
  writeStoredIdempotencyKey(generated)
  return generated
}

function CheckoutPage() {
  const { step } = useSearch({ from: '/pagamento' })
  const sessionQuery = useSession()
  const userId = sessionQuery.data?.authenticated
    ? sessionQuery.data.user.id
    : undefined

  const { quote, cartQuery, cartQuoteQuery } = useCart()
  const [reviewOpen, setReviewOpen] = useState(step === 'review')
  const [useOtherWallet, setUseOtherWallet] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const profileQuery = useQuery({
    enabled: !!userId,
    queryKey: userId ? queryKeys.user(userId).profile : ['user', 'profile', 'guest'],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<Profile>(API_ENDPOINTS.profile.current, {
        signal,
      })
      return response.data
    },
  })

  const walletsQuery = useQuery({
    enabled: !!userId,
    queryKey: userId ? queryKeys.user(userId).wallets : ['user', 'wallets', 'guest'],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<{ items: Wallet[] }>(
        API_ENDPOINTS.wallets.list,
        { signal },
      )
      return response.data
    },
  })

  const form = useForm<CollectorData>({
    resolver: zodResolver(collectorDataSchema),
    defaultValues: {
      displayName: '',
      username: '',
      profileName: '',
      email: '',
      walletAddress: '',
      walletType: 'metamask',
      network: 'ethereum',
      ensName: '',
      referralCode: '',
      note: '',
    },
  })

  const reviewDisplayName = useWatch({ control: form.control, name: 'displayName' })
  const reviewUsername = useWatch({ control: form.control, name: 'username' })
  const reviewEmail = useWatch({ control: form.control, name: 'email' })
  const reviewNetwork = useWatch({ control: form.control, name: 'network' })
  const reviewWalletAddress = useWatch({ control: form.control, name: 'walletAddress' })
  const selectedProvider = useWatch({
    control: form.control,
    name: 'walletType',
  }) as WalletProvider | undefined

  const primaryWallet = useMemo(() => {
    const wallets = walletsQuery.data?.items ?? []
    return wallets.find((wallet) => wallet.kind === 'primary') ?? wallets[0] ?? null
  }, [walletsQuery.data])

  useEffect(() => {
    if (!profileQuery.data) return

    const wallet = primaryWallet ?? null
    const savedDraft = readStoredCheckoutDraft() ?? {}
    const nextValues: CollectorData = {
      displayName: savedDraft.displayName ?? profileQuery.data.displayName,
      username: savedDraft.username ?? profileQuery.data.username,
      profileName: savedDraft.profileName ?? wallet?.profileName ?? profileQuery.data.displayName,
      email: savedDraft.email ?? profileQuery.data.email,
      walletAddress: savedDraft.walletAddress ?? wallet?.address ?? profileQuery.data.ensName,
      walletType: savedDraft.walletType ?? wallet?.walletType ?? 'metamask',
      network: savedDraft.network ?? wallet?.network ?? 'ethereum',
      ensName: savedDraft.ensName ?? profileQuery.data.ensName,
      referralCode: savedDraft.referralCode ?? profileQuery.data.referralCode,
      note: savedDraft.note ?? '',
    }

    form.reset(nextValues)
  }, [form, primaryWallet, profileQuery.data])

  const draftValues = useWatch({ control: form.control })

  useEffect(() => {
    if (typeof window === 'undefined' || !draftValues) return

    window.sessionStorage.setItem(
      CHECKOUT_DRAFT_STORAGE_KEY,
      JSON.stringify({
        displayName: draftValues.displayName,
        username: draftValues.username,
        profileName: draftValues.profileName,
        email: draftValues.email,
        walletAddress: draftValues.walletAddress,
        walletType: draftValues.walletType,
        network: draftValues.network,
        ensName: draftValues.ensName,
        referralCode: draftValues.referralCode,
        note: draftValues.note,
      }),
    )
  }, [draftValues])

  const activeProvider = selectedProvider ?? 'metamask'

  const selectedWallet = useMemo(() => {
    const wallets = walletsQuery.data?.items ?? []
    return (
      wallets.find((wallet) => wallet.walletType === activeProvider) ??
      primaryWallet ??
      null
    )
  }, [activeProvider, primaryWallet, walletsQuery.data])

  const handleReview = form.handleSubmit(() => {
    setSubmitError(null)
    setReviewOpen(true)
  })

  const handleSubmitOrder = async () => {
    if (!quote || !selectedWallet) {
      setSubmitError('A cotação ou a carteira selecionada não estão disponíveis.')
      return
    }

    setIsSubmitting(true)
    const values = form.getValues()
    const payload = {
      quoteId: quote.quoteId,
      provider: activeProvider,
      walletId: selectedWallet.id,
      collector: {
        ...values,
        walletAddress: useOtherWallet ? values.walletAddress : selectedWallet.address,
        walletType: activeProvider,
        network: values.network,
      },
    }

    try {
      setSubmitError(null)
      const idempotencyKey = getOrCreateIdempotencyKey()
      const response = await apiClient.post<{ orderId: string; status: string }>(
        API_ENDPOINTS.orders.create,
        payload,
        {
          headers: {
            [IDEMPOTENCY_KEY_HEADER]: idempotencyKey,
          },
        },
      )

      window.sessionStorage.setItem(
        PENDING_ORDER_ID_STORAGE_KEY,
        response.data.orderId,
      )

      if (response.data.status === 'confirmed' || response.data.status === 'rejected') {
        window.sessionStorage.removeItem(PENDING_ORDER_ID_STORAGE_KEY)
      }

      setLastOrderId(response.data.orderId)
      setReviewOpen(false)
    } catch (error) {
      const apiError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError({ code: 'UNEXPECTED_ERROR' })

      if (
        apiError.code === 'PRICE_CHANGED' ||
        apiError.code === 'AVAILABILITY_CONFLICT'
      ) {
        await cartQuoteQuery.refetch()
        setSubmitError(apiError.message)
        setReviewOpen(true)
        return
      }

      setSubmitError(apiError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const summaryRows = [
    { label: 'Subtotal', value: quote?.subtotal ?? '0' },
    { label: 'Desconto', value: quote?.discount ?? '0' },
    { label: 'Taxa da rede', value: quote?.networkFee ?? '0' },
  ]

  const isLoading = cartQuery.isPending || cartQuoteQuery.isPending || profileQuery.isPending

  return (
    <div className="kurio-container py-8 pb-24 md:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Button asChild size="icon-sm" type="button" variant="outline">
          <Link to="/carrinho">
            <ArrowLeft aria-hidden="true" size={16} />
            <span className="sr-only">Voltar ao carrinho</span>
          </Link>
        </Button>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
            Pagamento
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            Finalizar compra
          </h1>
        </div>
      </div>

      {lastOrderId ? (
        <div className="rounded-sm border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3 text-success">
            <Check aria-hidden="true" size={20} />
            <span className="text-sm font-bold uppercase tracking-[0.18em]">
              Pedido confirmado
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Seu pedido foi registrado com sucesso.
          </p>
          <p className="mt-3 text-lg font-bold text-foreground">#{lastOrderId}</p>
          <Button asChild className="mt-6" type="button">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.75fr)_minmax(19rem,0.85fr)] lg:items-start">
          <form className="space-y-6" noValidate onSubmit={handleReview}>
            <section className="border border-border bg-card p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
                    Dados do colecionador
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-foreground">
                    Informações da compra
                  </h2>
                </div>
                <ShieldCheck aria-hidden="true" className="text-highlight" size={20} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  {...form.register('displayName')}
                  error={form.formState.errors.displayName?.message}
                  label="Nome completo"
                  required
                />
                <Input
                  {...form.register('username')}
                  error={form.formState.errors.username?.message}
                  label="Usuário"
                  required
                />
                <Input
                  {...form.register('profileName')}
                  error={form.formState.errors.profileName?.message}
                  label="Nome no perfil"
                  required
                />
                <Input
                  {...form.register('email')}
                  error={form.formState.errors.email?.message}
                  label="E-mail"
                  required
                  type="email"
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Select
                  {...form.register('network')}
                  error={form.formState.errors.network?.message}
                  label="Rede"
                  required
                >
                  {networks.map((network) => (
                    <option key={network.value} value={network.value}>
                      {network.label}
                    </option>
                  ))}
                </Select>

                <Input
                  {...form.register('ensName')}
                  error={form.formState.errors.ensName?.message}
                  label="ENS"
                  required
                />
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    checked={useOtherWallet}
                    onChange={(event) => setUseOtherWallet(event.target.checked)}
                    type="checkbox"
                  />
                  Usar outra carteira?
                </label>
              </div>

              {useOtherWallet && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Input
                    {...form.register('walletAddress')}
                    error={form.formState.errors.walletAddress?.message}
                    label="Endereço da carteira"
                    required
                  />
                  <Input
                    {...form.register('referralCode')}
                    error={form.formState.errors.referralCode?.message}
                    label="Código de indicação"
                    required
                  />
                </div>
              )}

              {!useOtherWallet && selectedWallet && (
                <div className="mt-4 rounded-sm border border-border bg-surface-raised p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Wallet2 aria-hidden="true" className="text-highlight" size={16} />
                      <span>{selectedWallet.nickname}</span>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
                      {selectedWallet.kind}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedWallet.address}
                  </p>
                </div>
              )}

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="checkout-note">
                  Observações (opcional)
                </label>
                <textarea
                  {...form.register('note')}
                  className="min-h-24 w-full border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                  id="checkout-note"
                  placeholder="Alguma informação adicional para a entrega ou o pedido?"
                />
              </div>
            </section>

            <section className="border border-border bg-card p-5">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
                  Provedor
                </p>
                <h2 className="mt-2 text-xl font-bold text-foreground">
                  Como deseja pagar?
                </h2>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {walletProviders.map((provider) => {
                  const isActive = activeProvider === provider.value

                  return (
                    <button
                      key={provider.value}
                      className={`rounded-sm border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                        isActive
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/60'
                      }`}
                      onClick={() => form.setValue('walletType', provider.value, { shouldDirty: true })}
                      type="button"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground">{provider.label}</span>
                        {isActive && <Check aria-hidden="true" className="text-highlight" size={16} />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {provider.value === 'metamask'
                          ? 'Conectado ao navegador.'
                          : provider.value === 'walletconnect'
                            ? 'Conectado por QR code.'
                            : 'Conectado com carteira institucional.'}
                      </p>
                    </button>
                  )
                })}
              </div>

              {submitError && (
                <p className="mt-4 text-sm text-destructive" role="alert">
                  {submitError}
                </p>
              )}
            </section>
          </form>

          <aside className="border border-border bg-card p-5">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
                  Resumo
                </p>
                <h2 className="mt-2 text-xl font-bold text-foreground">Pedido</h2>
              </div>

              {summaryRows.map(({ label, value }) => (
                <div className="flex items-center justify-between gap-3 text-sm" key={label}>
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{format(value)} ETH</span>
                </div>
              ))}

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between text-base font-bold text-foreground">
                  <span>Total</span>
                  <span className="text-highlight">{format(quote?.total ?? '0')} ETH</span>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={isLoading || !quote || !selectedWallet}
                onClick={handleReview}
                type="button"
              >
                Revisar pedido
              </Button>
            </div>
          </aside>
        </div>
      )}

      <Dialog
        description="Confirme os dados do colecionador e o valor final antes de enviar o pedido."
        onOpenChange={setReviewOpen}
        open={reviewOpen}
        title="Revisar compra"
      >
        <div className="space-y-5">
          <div className="space-y-2 rounded-sm border border-border bg-surface-raised p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
              Colecionador
            </p>
            <p className="text-base font-bold text-foreground">
              {reviewDisplayName} · @{reviewUsername}
            </p>
            <p className="text-sm text-muted-foreground">{reviewEmail}</p>
          </div>

          <div className="space-y-2 rounded-sm border border-border bg-surface-raised p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
              Pagamento
            </p>
            <p className="font-medium text-foreground">
              {walletProviders.find((provider) => provider.value === activeProvider)?.label}
            </p>
            <p className="text-sm text-muted-foreground">
              {reviewNetwork} · {useOtherWallet ? reviewWalletAddress : selectedWallet?.address}
            </p>
          </div>

          <div className="space-y-2 rounded-sm border border-border bg-surface-raised p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-highlight">
              Total
            </p>
            <p className="text-2xl font-bold text-foreground">
              {format(quote?.total ?? '0')} ETH
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button onClick={() => setReviewOpen(false)} type="button" variant="outline">
              Voltar
            </Button>
            <Button
              disabled={
                cartQuery.isPending ||
                cartQuoteQuery.isPending ||
                isSubmitting
              }
              onClick={handleSubmitOrder}
              type="button"
            >
              {isSubmitting ? 'Confirmando...' : 'Confirmar compra'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export { CheckoutPage }
