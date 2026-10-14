import { z } from 'zod'
import {
  ethAmountSchema,
  nonNegativeIntegerSchema,
} from './contracts'

const eventEnvelopeSchema = z.object({
  eventId: z.string().min(1),
  version: z.number().int().min(1),
  timestamp: z.string().datetime(),
})

const nftUpdatedEventSchema = eventEnvelopeSchema.extend({
  type: z.literal('nft.updated'),
  resource: z.object({
    kind: z.literal('nft'),
    id: z.string().min(1),
  }),
  userId: z.string().min(1).optional(),
  data: z.object({
    nftId: z.string().min(1),
    price: ethAmountSchema,
    editions: z.array(z.object({
      id: z.string().min(1),
      available: nonNegativeIntegerSchema,
    })),
  }),
}).superRefine((event, context) => {
  if (event.resource.id !== event.data.nftId) {
    context.addIssue({
      code: 'custom',
      path: ['data', 'nftId'],
      message: 'NFT resource id must match data nftId',
    })
  }
})

const orderUpdatedEventSchema = eventEnvelopeSchema.extend({
  type: z.literal('order.updated'),
  resource: z.object({
    kind: z.literal('order'),
    id: z.string().min(1),
  }),
  userId: z.string().min(1),
  data: z.object({
    orderId: z.string().min(1),
    status: z.enum(['confirmed', 'rejected']),
    transactionHash: z.string().min(1).optional(),
    reason: z.string().min(1).optional(),
  }),
}).superRefine((event, context) => {
  if (event.resource.id !== event.data.orderId) {
    context.addIssue({
      code: 'custom',
      path: ['data', 'orderId'],
      message: 'Order resource id must match data orderId',
    })
  }
})

export const socketEventSchema = z.discriminatedUnion('type', [
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
])

export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>
export type SocketEvent = z.infer<typeof socketEventSchema>
