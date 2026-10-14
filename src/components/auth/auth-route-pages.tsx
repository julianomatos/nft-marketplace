import { useSearch } from '@tanstack/react-router'
import { AuthPage } from '@/components/auth/auth-page'

function LoginRoutePage() {
  const { reason, redirect } = useSearch({ from: '/login' })
  return (
    <AuthPage
      mode="login"
      redirectTo={redirect}
      sessionExpired={reason === 'expired'}
    />
  )
}

function SignupRoutePage() {
  const { reason, redirect } = useSearch({ from: '/signup' })
  return (
    <AuthPage
      mode="signup"
      redirectTo={redirect}
      sessionExpired={reason === 'expired'}
    />
  )
}

export { LoginRoutePage, SignupRoutePage }
