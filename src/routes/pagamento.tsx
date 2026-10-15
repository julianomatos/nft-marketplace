import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CheckoutPage } from '@/components/checkout/checkout-page'

const checkoutSearchSchema = z.object({
  step: z.enum(['review']).optional().catch(undefined),
})

export const Route = createFileRoute('/pagamento')({
  validateSearch: checkoutSearchSchema,
  component: CheckoutPage,
})
