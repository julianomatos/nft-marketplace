import { createFileRoute } from '@tanstack/react-router'
import { LoginRoutePage } from '@/components/auth/auth-route-pages'
import { authSearchSchema } from '@/types/contracts'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  component: LoginRoutePage,
})
