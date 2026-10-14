import { CanceledError, type AxiosResponse } from 'axios'
import { QueryClient } from '@tanstack/react-query'
import { expect, test } from '@playwright/test'
import { nftCatalogQueryOptions } from '../../src/hooks/use-nft-catalog'
import { apiClient } from '../../src/services/api-client'
import { nftSearchParamsSchema, type NftListResponse } from '../../src/types/contracts'

test('catalog query forwards cancellation to Axios and aborts the stale request', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const options = nftCatalogQueryOptions(
    nftSearchParamsSchema.parse({ q: 'slow request' }),
  )
  const originalAdapter = apiClient.defaults.adapter
  let requestSignal: AbortSignal | undefined

  apiClient.defaults.adapter = (config) =>
    new Promise<AxiosResponse<NftListResponse>>((_, reject) => {
      requestSignal = config.signal ?? undefined
      if (!requestSignal) {
        reject(new Error('Catalog Axios request did not receive an AbortSignal'))
        return
      }
      requestSignal.addEventListener(
        'abort',
        () => reject(new CanceledError('Stale catalog request cancelled', config)),
        { once: true },
      )
    })

  try {
    const request = client.fetchQuery(options)
    void request.catch(() => undefined)
    await expect.poll(() => requestSignal).not.toBeUndefined()

    await client.cancelQueries({ queryKey: options.queryKey })
    await request.catch(() => undefined)

    expect(requestSignal?.aborted).toBe(true)
  } finally {
    client.clear()
    apiClient.defaults.adapter = originalAdapter
  }
})
