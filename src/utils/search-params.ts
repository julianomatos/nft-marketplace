import { z } from 'zod'
import {
  nftSearchParamsSchema,
  type NftSearchParams,
} from '../types/contracts'
import {
  parseSearchArray,
  serializeSearchArray,
} from '../types/search-params'

const catalogSearchSchema = nftSearchParamsSchema.pick({
  q: true,
  feed: true,
  page: true,
}).partial()

const filterKeys = [
  'q',
  'feed',
  'category',
  'network',
  'minPrice',
  'maxPrice',
  'sort',
  'limit',
] as const satisfies readonly (keyof NftSearchParams)[]

function areSearchValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function updateNftSearchParams(
  current: NftSearchParams,
  updates: Partial<NftSearchParams>,
): NftSearchParams {
  const next = { ...current, ...updates }
  const filtersChanged = filterKeys.some(
    (key) => !areSearchValuesEqual(current[key], next[key]),
  )
  return nftSearchParamsSchema.parse({
    ...next,
    page: filtersChanged ? 1 : next.page,
  })
}

function validateSearchWithZod<TSchema extends z.ZodType>(
  schema: TSchema,
): (search: Record<string, unknown>) => z.output<TSchema> {
  return (search) => schema.parse(search)
}

export {
  catalogSearchSchema,
  parseSearchArray,
  serializeSearchArray,
  updateNftSearchParams,
  validateSearchWithZod,
  type CatalogSearchParams,
}

type CatalogSearchParams = z.output<typeof catalogSearchSchema>
