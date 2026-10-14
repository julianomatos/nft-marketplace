import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type SyntheticEvent,
} from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { Eye, EyeOff, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import {
  loginRequestSchema,
  signupRequestSchema,
  type LoginRequest,
  type SignupRequest,
} from '@/types/contracts'
import { ApiClientError } from '@/utils/errors'
import {
  clearAuthReturnContext,
  getAuthReturnTarget,
  restoreAuthReturnContext,
} from '@/utils/auth-return-context'
import { useLogin, useSignup } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AuthPageProps = {
  mode: 'login' | 'signup'
  redirectTo?: string
  sessionExpired?: boolean
}

type AuthField = 'displayName' | 'email' | 'password'

function isAuthField(field: string): field is AuthField {
  return field === 'displayName' || field === 'email' || field === 'password'
}

function applyApiFieldErrors(
  error: unknown,
  fields: readonly AuthField[],
  setFieldError: (field: AuthField, message: string) => void,
): string | null {
  if (!(error instanceof ApiClientError)) {
    return error instanceof Error
      ? error.message
      : 'Ocorreu um erro inesperado. Tente novamente.'
  }

  let hasMappedFieldError = false
  for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) {
    if (isAuthField(field) && fields.includes(field) && messages[0]) {
      setFieldError(field, messages[0])
      hasMappedFieldError = true
    }
  }

  return hasMappedFieldError ? null : error.message
}

function AuthPage({
  mode,
  redirectTo,
  sessionExpired = false,
}: AuthPageProps) {
  const navigate = useNavigate()
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const [notice, setNotice] = useState<string | null>(null)
  const isSignup = mode === 'signup'

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (!dialog.open) dialog.showModal()

    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  function returnToPreviousRoute() {
    if (router.history.canGoBack()) {
      router.history.back()
      return
    }
    void navigate({ to: '/' })
  }

  function closeDialog() {
    returnToPreviousRoute()
  }

  function completeAuthentication() {
    const returnTarget = getAuthReturnTarget(redirectTo)
    if (!returnTarget) {
      returnToPreviousRoute()
      return
    }

    restoreAuthReturnContext()
    clearAuthReturnContext()
    void router.navigate({ href: returnTarget })
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    closeDialog()
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeDialog()
  }

  return (
    <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="kurio-dialog kurio-auth-dialog"
        onCancel={handleCancel}
        onClick={handleBackdropClick}
        ref={dialogRef}
      >
        <Button
              aria-label="Fechar autenticação"
              className="absolute right-4 top-3 z-10 text-highlight"
              onClick={closeDialog}
              size="icon-sm"
              type="button"
              variant="ghost"
        >
              <X aria-hidden="true" size={18} />
        </Button>

        <nav
              aria-label="Acesso à conta"
              className="flex items-center justify-center gap-2 px-12 pt-7"
        >
              <Link
                aria-current={!isSignup ? 'page' : undefined}
                className={`text-lg font-bold transition-colors ${
                  !isSignup ? 'text-highlight' : 'text-foreground hover:text-highlight'
                }`}
                search={{
                  redirect: redirectTo,
                  reason: sessionExpired ? 'expired' : undefined,
                }}
                to="/login"
              >
                Entrar
              </Link>
              <span aria-hidden="true" className="text-primary">
                |
              </span>
              <Link
                aria-current={isSignup ? 'page' : undefined}
                className={`text-lg font-bold transition-colors ${
                  isSignup ? 'text-highlight' : 'text-foreground hover:text-highlight'
                }`}
                search={{
                  redirect: redirectTo,
                  reason: sessionExpired ? 'expired' : undefined,
                }}
                to="/signup"
              >
                Criar conta
              </Link>
        </nav>

        <div className="px-6 pb-8 pt-5 sm:px-10">
              <h1 className="sr-only" id={titleId}>
                {isSignup ? 'Criar conta KURIO' : 'Entrar na KURIO'}
              </h1>
              <p className="mb-6 text-center text-sm text-muted-foreground" id={descriptionId}>
                {isSignup
                  ? 'Crie sua conta para acompanhar sua coleção e descobrir novos NFTs.'
                  : 'Entre para gerenciar sua carteira, coleção e perfil de criador.'}
              </p>

              {isSignup ? (
                <SignupFields onSuccess={completeAuthentication} />
              ) : (
                <LoginFields onSuccess={completeAuthentication} />
              )}

              {sessionExpired && (
                <p className="mt-4 text-center text-xs text-highlight" role="status">
                  Sua sessão expirou. Entre novamente para continuar.
                </p>
              )}

              <div aria-live="polite" className="mt-5 space-y-2 text-center">
                {notice && (
                  <p className="text-xs text-destructive" role="status">
                    {notice}
                  </p>
                )}
                <div className="relative flex items-center justify-center">
                  <span className="h-px flex-1 bg-border" />
                  <span className="px-3 text-xs text-foreground">Ou continue com</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <UnavailableButton onNotice={setNotice} provider="Google" />
                <UnavailableButton onNotice={setNotice} provider="Facebook" />
              </div>
        </div>
    </dialog>
  )
}

type AuthFieldsProps = {
  onSuccess: () => void
}

function LoginFields({ onSuccess }: AuthFieldsProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const login = useLogin()
  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  })

  function onSubmit(payload: LoginRequest) {
    setFormError(null)
    login.mutate(payload, {
      onSuccess,
      onError: (error) => {
        setFormError(
          applyApiFieldErrors(
            error,
            ['email', 'password'],
            (field, message) => {
              if (field === 'email') {
                form.setError('email', { type: 'server', message })
              } else if (field === 'password') {
                form.setError('password', { type: 'server', message })
              }
            },
          ),
        )
      },
    })
  }

  return (
    <form className="space-y-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <Input
        autoComplete="email"
        error={form.formState.errors.email?.message}
        label="E-mail"
        placeholder="contato@email.com"
        type="email"
        {...form.register('email')}
      />
      <div className="relative">
        <Input
          autoComplete="current-password"
          className="pr-11"
          error={form.formState.errors.password?.message}
          label="Senha"
          placeholder="••••••••"
          type={showPassword ? 'text' : 'password'}
          {...form.register('password')}
        />
        <button
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-2 top-8 flex size-8 items-center justify-center text-subtle hover:text-highlight focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => setShowPassword((current) => !current)}
          type="button"
        >
          {showPassword ? (
            <EyeOff aria-hidden="true" size={17} />
          ) : (
            <Eye aria-hidden="true" size={17} />
          )}
        </button>
      </div>
      <p className="text-right">
        <UnavailableLink onNotice={setFormError} />
      </p>
      {formError && (
        <p className="text-xs text-destructive" role="alert">
          {formError}
        </p>
      )}
      <Button className="w-full" loading={login.isPending} type="submit">
        Entrar
      </Button>
    </form>
  )
}

function SignupFields({ onSuccess }: AuthFieldsProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const signup = useSignup()
  const form = useForm<SignupRequest>({
    resolver: zodResolver(signupRequestSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  })

  function onSubmit(payload: SignupRequest) {
    setFormError(null)
    signup.mutate(payload, {
      onSuccess,
      onError: (error) => {
        setFormError(
          applyApiFieldErrors(
            error,
            ['displayName', 'email', 'password'],
            (field, message) => {
              if (field === 'displayName') {
                form.setError('displayName', { type: 'server', message })
              } else if (field === 'email') {
                form.setError('email', { type: 'server', message })
              } else if (field === 'password') {
                form.setError('password', { type: 'server', message })
              }
            },
          ),
        )
      },
    })
  }

  return (
    <form className="space-y-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <Input
        autoComplete="name"
        error={form.formState.errors.displayName?.message}
        label="Nome"
        placeholder="Seu nome"
        {...form.register('displayName')}
      />
      <Input
        autoComplete="email"
        error={form.formState.errors.email?.message}
        label="E-mail"
        placeholder="contato@email.com"
        type="email"
        {...form.register('email')}
      />
      <div className="relative">
        <Input
          autoComplete="new-password"
          className="pr-11"
          error={form.formState.errors.password?.message}
          label="Senha"
          placeholder="Crie uma senha"
          type={showPassword ? 'text' : 'password'}
          {...form.register('password')}
        />
        <button
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-2 top-8 flex size-8 items-center justify-center text-subtle hover:text-highlight focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => setShowPassword((current) => !current)}
          type="button"
        >
          {showPassword ? (
            <EyeOff aria-hidden="true" size={17} />
          ) : (
            <Eye aria-hidden="true" size={17} />
          )}
        </button>
      </div>
      {formError && (
        <p className="text-xs text-destructive" role="alert">
          {formError}
        </p>
      )}
      <Button className="w-full" loading={signup.isPending} type="submit">
        Criar conta
      </Button>
    </form>
  )
}

type UnavailableButtonProps = {
  onNotice: (notice: string) => void
  provider: 'Google' | 'Facebook'
}

function UnavailableButton({ onNotice, provider }: UnavailableButtonProps) {
  return (
    <Button
      className="w-full border-border text-muted-foreground"
      onClick={() =>
        onNotice(`A autenticação com ${provider} não está disponível nesta demonstração.`)
      }
      type="button"
      variant="outline"
    >
      Continuar com {provider}
    </Button>
  )
}

type UnavailableLinkProps = {
  onNotice: (notice: string) => void
}

function UnavailableLink({ onNotice }: UnavailableLinkProps) {
  return (
    <button
      className="text-xs text-highlight underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      onClick={() =>
        onNotice('A recuperação de senha não está disponível nesta demonstração.')
      }
      type="button"
    >
      Esqueceu a senha?
    </button>
  )
}

export { AuthPage }
