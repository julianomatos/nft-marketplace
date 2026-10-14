import { z } from 'zod'
import {
  nftSearchParamsSchema,
  type NftSearchParams,
} from '../types/contracts'
import {
  parseSearchArray,
  serializeSearchArray,
} from '../types/search-array-serialization'

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

function serializeNftApiParams(params: Record<string, unknown>): string {
  const serialized = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null) {
          serialized.append(key, String(item))
        }
      }
      continue
    }

    serialized.append(key, String(value))
  }

  return serialized.toString()
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
  serializeNftApiParams,
  updateNftSearchParams,
  validateSearchWithZod,
  type CatalogSearchParams,
}

type CatalogSearchParams = z.output<typeof catalogSearchSchema>
