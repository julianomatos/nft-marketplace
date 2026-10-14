import { createFileRoute } from '@tanstack/react-router'
import { SignupRoutePage } from '@/components/auth/auth-route-pages'
import { authSearchSchema } from '@/types/contracts'

export const Route = createFileRoute('/signup')({
  validateSearch: authSearchSchema,
  component: SignupRoutePage,
})
