import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useRouterState } from '@tanstack/react-router'
import { CreditCard, Heart, UserRound } from 'lucide-react'
import type { ChangeEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { queryKeys } from '@/hooks/queryKeys'
import { useSession } from '@/hooks/use-session'
import { API_ENDPOINTS } from '@/types/endpoints'
import {
  passwordUpdateRequestSchema,
  profileUpdateRequestSchema,
  type PasswordUpdateRequest,
  type Profile,
  type ProfileUpdateRequest,
} from '@/types/contracts'
import { apiClient } from '@/services/api-client'
import { queryStaleTimes } from '@/lib/query-client'
import { ApiClientError } from '@/utils/errors'

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
  const userId = sessionQuery.data?.authenticated ? sessionQuery.data.user.id : undefined
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
