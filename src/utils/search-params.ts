import { z } from 'zod'

const catalogSearchSchema = z.object({
  q: z.string().max(120).optional(),
  feed: z.enum(['all', 'new', 'trending']).optional(),
  page: z.coerce.number().int().min(1).optional(),
})

function validateSearchWithZod<TSchema extends z.ZodType>(
  schema: TSchema,
): (search: Record<string, unknown>) => z.output<TSchema> {
  return (search) => schema.parse(search)
}

export {
  catalogSearchSchema,
  validateSearchWithZod,
  type CatalogSearchParams,
}

type CatalogSearchParams = z.output<typeof catalogSearchSchema>
