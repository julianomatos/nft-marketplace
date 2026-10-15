import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

const checkoutSearchSchema = z.object({
  step: z.enum(['review']).optional().catch(undefined),
})

export const Route = createFileRoute('/checkout')({
  validateSearch: checkoutSearchSchema,
  beforeLoad: ({ location }) => {
    throw redirect({ to: '/pagamento', search: location.search })
  },
})
