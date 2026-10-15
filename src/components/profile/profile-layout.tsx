import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useRouterState } from '@tanstack/react-router'
import { CreditCard, Heart, UserRound } from 'lucide-react'
import type { ChangeEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { queryKeys } from '@/hooks/queryKeys'
import { useSession } from '@/hooks/use-session'
import { API_ENDPOINTS } from '@/types/endpoints'
import {
  passwordUpdateRequestSchema,
  profileUpdateRequestSchema,
  walletUpsertRequestSchema,
  type FavoritesResponse,
  type PasswordUpdateRequest,
  type Profile,
  type ProfileUpdateRequest,
  type Wallet,
  type WalletKind,
  type WalletUpsertRequest,
  type WalletsResponse,
} from '@/types/contracts'
import { apiClient } from '@/services/api-client'
import { queryStaleTimes } from '@/lib/query-client'
import { ApiClientError } from '@/utils/errors'
import { NftCard } from '@/components/home/nft-card'

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

function applyApiFieldErrors(
  error: unknown,
  fields: readonly string[],
  setFieldError: (field: string, message: string) => void,
): string | null {
  if (!(error instanceof ApiClientError)) {
    return error instanceof Error
      ? error.message
      : 'Ocorreu um erro inesperado. Tente novamente.'
  }

  let mapped = false
  for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) {
    if (fields.includes(field) && messages[0]) {
      setFieldError(field, messages[0])
      mapped = true
    }
  }

  return mapped ? null : error.message
}

function ProfileOverviewPage() {
  const sessionQuery = useSession()
  const queryClient = useQueryClient()
  const currentUser = sessionQuery.data?.authenticated ? sessionQuery.data.user : undefined
  const userId = currentUser?.id
  const profileKey = userId ? queryKeys.user(userId).profile : ['profile', 'guest']

  const profileQuery = useQuery({
    queryKey: profileKey,
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<Profile>(API_ENDPOINTS.profile.current, {
        signal,
      })
      return response.data
    },
    staleTime: queryStaleTimes.account,
  })

  const profileForm = useForm<ProfileUpdateRequest>({
    resolver: zodResolver(profileUpdateRequestSchema),
    defaultValues: {
      displayName: '',
      username: '',
      email: '',
      ensName: '',
      walletNickname: '',
      avatar: undefined,
    },
  })

  const [profileNotice, setProfileNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!profileQuery.data) return

    const nextValues = {
      displayName: profileQuery.data.displayName,
      username: profileQuery.data.username,
      email: profileQuery.data.email,
      ensName: profileQuery.data.ensName,
      walletNickname: profileQuery.data.walletNickname,
      avatar: profileQuery.data.avatar,
    }

    profileForm.reset(nextValues)
  }, [profileForm, profileQuery.data])

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: ProfileUpdateRequest) => {
      const response = await apiClient.put<Profile>(API_ENDPOINTS.profile.current, payload)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profileKey, data)
      queryClient.invalidateQueries({ queryKey: profileKey })
      setProfileNotice('Perfil atualizado com sucesso.')
      profileForm.setValue('avatar', data.avatar)
    },
    onError: (error) => {
      setProfileNotice(
        applyApiFieldErrors(
          error,
          ['displayName', 'username', 'email', 'ensName', 'walletNickname'],
          (field, message) => {
            profileForm.setError(field as keyof ProfileUpdateRequest, {
              type: 'server',
              message,
            })
          },
        ) ?? 'Não foi possível salvar as alterações.',
      )
    },
  })

  const onProfileSubmit = (payload: ProfileUpdateRequest) => {
    setProfileNotice(null)
    updateProfileMutation.mutate(payload)
  }

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const nextAvatar = typeof reader.result === 'string' ? reader.result : undefined
      profileForm.setValue('avatar', nextAvatar)
      const formValues = profileForm.getValues()
      if (nextAvatar) {
        updateProfileMutation.mutate({
          ...formValues,
          avatar: nextAvatar,
        })
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const profileDisplayName = useWatch({
    control: profileForm.control,
    name: 'displayName',
  })
  const profileUsername = useWatch({
    control: profileForm.control,
    name: 'username',
  })
  const avatarPreview = useWatch({
    control: profileForm.control,
    name: 'avatar',
  }) ?? profileQuery.data?.avatar
  const profileSummaryName = profileDisplayName || profileQuery.data?.displayName || 'Colecionador'
  const profileSummaryHandle = profileUsername || profileQuery.data?.username || 'kurio-user'

  return (
    <ProfileLayout
      description="Gerencie sua identidade digital, preferências e acesso à sua coleção."
      title="Dados do perfil"
    >
      <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-sm border border-border bg-surface-raised p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-highlight">
              Identidade
            </p>
            <div className="mt-4 flex items-center gap-4">
              {avatarPreview ? (
                <img
                  alt="Foto do perfil"
                  className="size-14 rounded-full border border-border object-cover"
                  src={avatarPreview}
                />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {profileSummaryName.slice(0, 1).toUpperCase() || 'K'}
                </div>
              )}
              <div>
                <p className="text-lg font-bold text-foreground">{profileSummaryName}</p>
                <p className="text-sm text-muted-foreground">@{profileSummaryHandle}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-sm border border-border bg-background px-3 py-2 text-xs font-bold text-foreground transition-colors hover:border-primary hover:text-highlight focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
                <input
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAvatarChange}
                  type="file"
                />
                Alterar
              </label>
              <Button
                onClick={() => {
                  profileForm.setValue('avatar', undefined)
                  updateProfileMutation.mutate({
                    ...profileForm.getValues(),
                    avatar: undefined,
                  })
                }}
                type="button"
                variant="outline"
              >
                Remover
              </Button>
            </div>
          </div>

          <div className="rounded-sm border border-border bg-surface-raised p-4 text-sm text-muted-foreground">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-highlight">
              Referência
            </p>
            <p className="mt-3 font-medium text-foreground">
              {profileQuery.data?.referralCode ?? 'KUR-2026'}
            </p>
            <p className="mt-2 text-xs">Código de indicação</p>
          </div>
        </aside>

        <div className="space-y-6">
          <form
            aria-label="Dados do perfil"
            className="space-y-5"
            noValidate
            onSubmit={profileForm.handleSubmit(onProfileSubmit)}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                autoComplete="name"
                error={profileForm.formState.errors.displayName?.message}
                label="Nome completo"
                {...profileForm.register('displayName')}
              />
              <Input
                autoComplete="username"
                error={profileForm.formState.errors.username?.message}
                label="Usuário"
                {...profileForm.register('username')}
              />
              <Input
                autoComplete="email"
                error={profileForm.formState.errors.email?.message}
                label="E-mail"
                type="email"
                {...profileForm.register('email')}
              />
              <Input
                autoComplete="off"
                error={profileForm.formState.errors.ensName?.message}
                label="ENS"
                {...profileForm.register('ensName')}
              />
              <Input
                autoComplete="off"
                className="md:col-span-2"
                error={profileForm.formState.errors.walletNickname?.message}
                label="Apelido da carteira"
                {...profileForm.register('walletNickname')}
              />
            </div>

            {profileNotice && (
              <p className="text-xs text-destructive" role="alert">
                {profileNotice}
              </p>
            )}

            <div className="flex justify-end">
              <Button loading={updateProfileMutation.isPending} type="submit">
                Salvar dados
              </Button>
            </div>
          </form>

          <PasswordForm />
        </div>
      </div>
    </ProfileLayout>
  )
}

function PasswordForm() {
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null)
  const passwordForm = useForm<PasswordUpdateRequest>({
    resolver: zodResolver(passwordUpdateRequestSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const passwordMutation = useMutation({
    mutationFn: async (payload: PasswordUpdateRequest) => {
      const response = await apiClient.put<{ updated: true }>(
        API_ENDPOINTS.profile.password,
        payload,
      )
      return response.data
    },
    onSuccess: () => {
      setPasswordNotice('Senha atualizada com sucesso.')
      passwordForm.reset()
    },
    onError: (error) => {
      setPasswordNotice(
        applyApiFieldErrors(
          error,
          ['currentPassword', 'newPassword', 'confirmPassword'],
          (field, message) => {
            passwordForm.setError(field as keyof PasswordUpdateRequest, {
              type: 'server',
              message,
            })
          },
        ) ?? 'Não foi possível atualizar a senha.',
      )
    },
  })

  return (
    <form
      className="space-y-4 rounded-sm border border-border bg-surface-raised p-4"
      noValidate
      onSubmit={passwordForm.handleSubmit((payload) => {
        setPasswordNotice(null)
        passwordMutation.mutate(payload)
      })}
    >
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-highlight">
          Segurança
        </p>
        <h2 className="mt-2 text-xl font-bold text-foreground">Alterar senha</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Input
          autoComplete="current-password"
          error={passwordForm.formState.errors.currentPassword?.message}
          label="Senha atual"
          type="password"
          {...passwordForm.register('currentPassword')}
        />
        <Input
          autoComplete="new-password"
          error={passwordForm.formState.errors.newPassword?.message}
          label="Nova senha"
          type="password"
          {...passwordForm.register('newPassword')}
        />
        <Input
          autoComplete="new-password"
          error={passwordForm.formState.errors.confirmPassword?.message}
          label="Confirmar nova senha"
          type="password"
          {...passwordForm.register('confirmPassword')}
        />
      </div>

      {passwordNotice && (
        <p className="text-xs text-destructive" role="alert">
          {passwordNotice}
        </p>
      )}

      <div className="flex justify-end">
        <Button loading={passwordMutation.isPending} type="submit">
          Atualizar senha
        </Button>
      </div>
    </form>
  )
}

function WalletsPage() {
  const sessionQuery = useSession()
  const queryClient = useQueryClient()
  const currentUser = sessionQuery.data?.authenticated ? sessionQuery.data.user : undefined
  const userId = currentUser?.id
  const walletsKey = userId ? queryKeys.user(userId).wallets : ['user', 'wallets', 'guest']

  const walletsQuery = useQuery({
    queryKey: walletsKey,
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<WalletsResponse>(API_ENDPOINTS.wallets.list, {
        signal,
      })
      return response.data
    },
    staleTime: queryStaleTimes.account,
  })

  const [walletNotice, setWalletNotice] = useState<string | null>(null)
  const [editingKind, setEditingKind] = useState<WalletKind | null>(null)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)

  const primaryWallet = walletsQuery.data?.items.find((wallet) => wallet.kind === 'primary')
  const secondaryWallet = walletsQuery.data?.items.find((wallet) => wallet.kind === 'secondary')

  const walletForm = useForm<WalletUpsertRequest>({
    resolver: zodResolver(walletUpsertRequestSchema),
    defaultValues: {
      kind: 'primary',
      displayName: currentUser?.displayName ?? '',
      nickname: 'Principal',
      network: 'ethereum',
      profileName: currentUser?.username ?? '',
      address: '',
      altAddressOrEns: '',
      walletType: 'metamask',
      referralCode: currentUser?.referralCode ?? '',
      email: currentUser?.email ?? '',
      ensName: currentUser?.ensName ?? '',
    },
  })

  const openWalletForm = (kind: WalletKind) => {
    const source = kind === 'primary' ? primaryWallet : secondaryWallet
    const nextValues: WalletUpsertRequest = source
      ? {
          kind,
          displayName: source.displayName,
          nickname: source.nickname,
          network: source.network,
          profileName: source.profileName,
          address: source.address,
          altAddressOrEns: source.altAddressOrEns ?? '',
          walletType: source.walletType,
          referralCode: source.referralCode,
          email: source.email,
          ensName: source.ensName,
        }
      : {
          kind,
          displayName: currentUser?.displayName ?? '',
          nickname: kind === 'primary' ? 'Principal' : 'Reserva',
          network: primaryWallet?.network ?? 'ethereum',
          profileName: currentUser?.username ?? '',
          address: '',
          altAddressOrEns: '',
          walletType: primaryWallet?.walletType ?? 'metamask',
          referralCode: currentUser?.referralCode ?? '',
          email: currentUser?.email ?? '',
          ensName: currentUser?.ensName ?? '',
        }

    walletForm.reset(nextValues)
    setSameAsPrimary(Boolean(kind === 'secondary' && primaryWallet && source?.address === primaryWallet.address))
    setEditingKind(kind)
  }

  const closeWalletForm = () => {
    setEditingKind(null)
    setSameAsPrimary(false)
    setWalletNotice(null)
  }

  const snapshotPrimaryValues = (current: WalletUpsertRequest): WalletUpsertRequest => {
    if (!primaryWallet) return current

    return {
      ...current,
      displayName: primaryWallet.displayName,
      network: primaryWallet.network,
      profileName: primaryWallet.profileName,
      address: primaryWallet.address,
      altAddressOrEns: primaryWallet.altAddressOrEns ?? primaryWallet.ensName,
      walletType: primaryWallet.walletType,
      referralCode: primaryWallet.referralCode,
      email: primaryWallet.email,
      ensName: primaryWallet.ensName,
    }
  }

  const saveWalletMutation = useMutation({
    mutationFn: async (payload: WalletUpsertRequest) => {
      const requestPayload =
        sameAsPrimary && editingKind === 'secondary' && primaryWallet
          ? snapshotPrimaryValues(payload)
          : payload

      if (editingKind && editingKind === 'primary' && primaryWallet) {
        const response = await apiClient.put<{ wallet: Wallet }>(
          API_ENDPOINTS.wallets.detail(primaryWallet.id),
          requestPayload,
        )
        return response.data.wallet
      }

      if (editingKind && editingKind === 'secondary' && secondaryWallet) {
        const response = await apiClient.put<{ wallet: Wallet }>(
          API_ENDPOINTS.wallets.detail(secondaryWallet.id),
          requestPayload,
        )
        return response.data.wallet
      }

      const response = await apiClient.post<{ wallet: Wallet }>(
        API_ENDPOINTS.wallets.list,
        requestPayload,
      )
      return response.data.wallet
    },
    onSuccess: () => {
      setWalletNotice('Carteira salva com sucesso.')
      setEditingKind(null)
      setSameAsPrimary(false)
      void queryClient.invalidateQueries({ queryKey: walletsKey })
    },
    onError: (error) => {
      setWalletNotice(
        applyApiFieldErrors(
          error,
          [
            'kind',
            'displayName',
            'nickname',
            'network',
            'profileName',
            'address',
            'altAddressOrEns',
            'walletType',
            'referralCode',
            'email',
            'ensName',
          ],
          (field, message) => {
            walletForm.setError(field as keyof WalletUpsertRequest, {
              type: 'server',
              message,
            })
          },
        ) ?? 'Não foi possível salvar a carteira.',
      )
    },
  })

  const formatWalletType = (walletType: Wallet['walletType']) => {
    switch (walletType) {
      case 'metamask':
        return 'MetaMask'
      case 'walletconnect':
        return 'WalletConnect'
      case 'coinbase':
        return 'Coinbase Wallet'
      default:
        return walletType
    }
  }

  const walletCards = [
    {
      kind: 'primary' as const,
      wallet: primaryWallet,
      title: 'Principal',
      emptyDescription: 'Cadastre sua carteira principal para compras e recebimentos.',
    },
    {
      kind: 'secondary' as const,
      wallet: secondaryWallet,
      title: 'Secundária',
      emptyDescription: 'A carteira secundária fica disponível para reservas e transferências.',
    },
  ]

  if (sessionQuery.isPending) {
    return (
      <ProfileLayout
        description="Gerencie suas carteiras principais e secundárias para compras, recebimentos e confirmação de transações."
        title="Carteiras"
      >
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </ProfileLayout>
    )
  }

  if (!userId) {
    return (
      <ProfileLayout
        description="Gerencie suas carteiras principais e secundárias para compras, recebimentos e confirmação de transações."
        title="Carteiras"
      >
        <div className="space-y-4 rounded-sm border border-dashed border-border bg-background p-6 text-center">
          <p className="text-sm leading-6 text-muted-foreground">
            Faça login para cadastrar e manter suas carteiras em segurança.
          </p>
          <Button asChild>
            <Link to="/login" search={{ redirect: '/carteiras' }}>
              Entrar na conta
            </Link>
          </Button>
        </div>
      </ProfileLayout>
    )
  }

  if (walletsQuery.isPending) {
    return (
      <ProfileLayout
        description="Gerencie suas carteiras principais e secundárias para compras, recebimentos e confirmação de transações."
        title="Carteiras"
      >
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </ProfileLayout>
    )
  }

  if (walletsQuery.isError) {
    return (
      <ProfileLayout
        description="Gerencie suas carteiras principais e secundárias para compras, recebimentos e confirmação de transações."
        title="Carteiras"
      >
        <ErrorState
          description="Não foi possível carregar suas carteiras. Verifique sua conexão e tente novamente."
          onRetry={() => void walletsQuery.refetch()}
          retrying={walletsQuery.isFetching}
          title="Falha ao carregar carteiras"
        />
      </ProfileLayout>
    )
  }

  return (
    <ProfileLayout
      description="Gerencie suas carteiras principais e secundárias para compras, recebimentos e confirmação de transações."
      title="Carteiras"
    >
      <div className="space-y-5">
        {walletNotice && (
          <p className="text-xs text-destructive" role="alert">
            {walletNotice}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {walletCards.map(({ kind, title, wallet, emptyDescription }) => (
            <div className="rounded-sm border border-border bg-surface-raised p-4" key={kind}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-highlight">
                  {title}
                </p>
                {wallet && (
                  <span className="rounded-full bg-success/10 px-2 py-1 text-[10px] font-medium text-success uppercase tracking-[0.12em]">
                    {wallet.connectionStatus === 'connected' ? 'Conectada' : 'Desconectada'}
                  </span>
                )}
              </div>

              {wallet ? (
                <div className="mt-3 space-y-2">
                  <p className="font-bold text-foreground">{wallet.displayName}</p>
                  <p className="text-sm text-muted-foreground">{wallet.nickname}</p>
                  <p className="text-sm text-muted-foreground">{wallet.address}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-highlight">
                    {formatWalletType(wallet.walletType)}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{emptyDescription}</p>
              )}

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => openWalletForm(kind)}
                  type="button"
                  variant={wallet ? 'outline' : 'default'}
                >
                  {wallet ? 'Editar' : `Cadastrar ${title.toLowerCase()}`}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {editingKind && (
          <form
            className="space-y-5 rounded-sm border border-border bg-surface-raised p-4"
            noValidate
            onSubmit={walletForm.handleSubmit((payload) => {
              setWalletNotice(null)
              saveWalletMutation.mutate(payload)
            })}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-highlight">
                  {editingKind === 'primary' ? 'Carteira principal' : 'Carteira secundária'}
                </p>
                <h2 className="mt-2 text-xl font-bold text-foreground">
                  {primaryWallet && editingKind === 'secondary' ? 'Editar segunda carteira' : 'Cadastrar carteira'}
                </h2>
              </div>
              <Button onClick={closeWalletForm} type="button" variant="ghost">
                Fechar
              </Button>
            </div>

            {editingKind === 'secondary' && primaryWallet && (
              <Checkbox
                checked={sameAsPrimary}
                containerClassName="mt-2"
                label="Igual à carteira principal"
                onChange={(event) => {
                  const nextState = event.target.checked
                  setSameAsPrimary(nextState)

                  if (nextState) {
                    walletForm.setValue('displayName', primaryWallet.displayName)
                    walletForm.setValue('network', primaryWallet.network)
                    walletForm.setValue('profileName', primaryWallet.profileName)
                    walletForm.setValue('address', primaryWallet.address)
                    walletForm.setValue('altAddressOrEns', primaryWallet.altAddressOrEns ?? primaryWallet.ensName)
                    walletForm.setValue('walletType', primaryWallet.walletType)
                    walletForm.setValue('referralCode', primaryWallet.referralCode)
                    walletForm.setValue('email', primaryWallet.email)
                    walletForm.setValue('ensName', primaryWallet.ensName)
                  }
                }}
              />
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                autoComplete="name"
                error={walletForm.formState.errors.displayName?.message}
                label="Nome da carteira"
                {...walletForm.register('displayName')}
              />
              <Input
                autoComplete="off"
                error={walletForm.formState.errors.nickname?.message}
                label="Apelido"
                {...walletForm.register('nickname')}
              />
              <Select
                error={walletForm.formState.errors.network?.message}
                label="Rede"
                {...walletForm.register('network')}
              >
                <option value="ethereum">Ethereum</option>
                <option value="polygon">Polygon</option>
                <option value="solana">Solana</option>
              </Select>
              <Input
                autoComplete="off"
                error={walletForm.formState.errors.profileName?.message}
                label="Perfil"
                {...walletForm.register('profileName')}
              />
              <Input
                autoComplete="off"
                className="md:col-span-2"
                error={walletForm.formState.errors.address?.message}
                label="Endereço"
                {...walletForm.register('address')}
              />
              <Input
                autoComplete="off"
                className="md:col-span-2"
                error={walletForm.formState.errors.altAddressOrEns?.message}
                label="ENS ou endereço alternativo"
                {...walletForm.register('altAddressOrEns')}
              />
              <Select
                error={walletForm.formState.errors.walletType?.message}
                label="Provedor"
                {...walletForm.register('walletType')}
              >
                <option value="metamask">MetaMask</option>
                <option value="walletconnect">WalletConnect</option>
                <option value="coinbase">Coinbase Wallet</option>
              </Select>
              <Input
                autoComplete="off"
                error={walletForm.formState.errors.referralCode?.message}
                label="Código de indicação"
                {...walletForm.register('referralCode')}
              />
              <Input
                autoComplete="email"
                error={walletForm.formState.errors.email?.message}
                label="E-mail"
                type="email"
                {...walletForm.register('email')}
              />
              <Input
                autoComplete="off"
                error={walletForm.formState.errors.ensName?.message}
                label="ENS"
                {...walletForm.register('ensName')}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={closeWalletForm} type="button" variant="outline">
                Cancelar
              </Button>
              <Button loading={saveWalletMutation.isPending} type="submit">
                Salvar carteira
              </Button>
            </div>
          </form>
        )}
      </div>
    </ProfileLayout>
  )
}

function FavoritesPage() {
  const sessionQuery = useSession()
  const currentUser = sessionQuery.data?.authenticated ? sessionQuery.data.user : undefined
  const userId = currentUser?.id

  const favoritesQuery = useQuery({
    queryKey: userId ? queryKeys.user(userId).favorites : ['user', 'favorites', 'guest'],
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<FavoritesResponse>(API_ENDPOINTS.favorites.list, {
        signal,
      })
      return response.data
    },
    staleTime: queryStaleTimes.account,
  })

  if (sessionQuery.isPending) {
    return (
      <ProfileLayout
        description="Acompanhe seus NFTs favoritos e retorne rapidamente para os itens que você mais deseja acompanhar."
        title="Lista de interesse"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="space-y-3" key={index}>
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </ProfileLayout>
    )
  }

  if (!userId) {
    return (
      <ProfileLayout
        description="Acompanhe seus NFTs favoritos e retorne rapidamente para os itens que você mais deseja acompanhar."
        title="Lista de interesse"
      >
        <div className="space-y-4 rounded-sm border border-dashed border-border bg-background p-6 text-center">
          <p className="text-sm leading-6 text-muted-foreground">
            Faça login para salvar e acompanhar seus NFTs favoritos em um só lugar.
          </p>
          <Button asChild>
            <Link to="/login" search={{ redirect: '/favoritos' }}>
              Entrar na conta
            </Link>
          </Button>
        </div>
      </ProfileLayout>
    )
  }

  if (favoritesQuery.isPending) {
    return (
      <ProfileLayout
        description="Acompanhe seus NFTs favoritos e retorne rapidamente para os itens que você mais deseja acompanhar."
        title="Lista de interesse"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="space-y-3" key={index}>
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </ProfileLayout>
    )
  }

  if (favoritesQuery.isError) {
    return (
      <ProfileLayout
        description="Acompanhe seus NFTs favoritos e retorne rapidamente para os itens que você mais deseja acompanhar."
        title="Lista de interesse"
      >
        <ErrorState
          description="Não foi possível carregar sua lista de interesse. Verifique sua conexão e tente novamente."
          onRetry={() => void favoritesQuery.refetch()}
          retrying={favoritesQuery.isFetching}
          title="Falha ao carregar favoritos"
        />
      </ProfileLayout>
    )
  }

  if (favoritesQuery.data.items.length === 0) {
    return (
      <ProfileLayout
        description="Acompanhe seus NFTs favoritos e retorne rapidamente para os itens que você mais deseja acompanhar."
        title="Lista de interesse"
      >
        <EmptyState
          description="Explore o catálogo e marque seus NFTs favoritos para continuar aqui."
          title="Nenhum item foi salvo ainda"
        />
      </ProfileLayout>
    )
  }

  return (
    <ProfileLayout
      description="Acompanhe seus NFTs favoritos e retorne rapidamente para os itens que você mais deseja acompanhar."
      title="Lista de interesse"
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {favoritesQuery.data.items.map(({ nft }) => (
          <NftCard key={nft.id} nft={nft} />
        ))}
      </div>
    </ProfileLayout>
  )
}

export { FavoritesPage, ProfileOverviewPage, ProfileLayout, WalletsPage }
