import type { CartItemInput } from '@/types/contracts'

const GUEST_CART_STORAGE_KEY = 'kurio.guest-cart'

function readGuestCartItems(): CartItemInput[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(GUEST_CART_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((entry): entry is CartItemInput => {
      if (!entry || typeof entry !== 'object') return false
      return (
        typeof (entry as CartItemInput).nftId === 'string' &&
        typeof (entry as CartItemInput).editionId === 'string' &&
        Number.isInteger((entry as CartItemInput).quantity) &&
        (entry as CartItemInput).quantity > 0
      )
    })
  } catch {
    return []
  }
}

function writeGuestCartItems(items: CartItemInput[]): void {
  if (typeof window === 'undefined') return

  const normalized = items
    .filter((item) => item.quantity > 0)
    .map((item) => ({
      nftId: item.nftId,
      editionId: item.editionId,
      quantity: item.quantity,
    }))

  if (normalized.length === 0) {
    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(normalized))
}

function addGuestCartItem(item: CartItemInput): CartItemInput[] {
  const nextItems = readGuestCartItems()
  const existingIndex = nextItems.findIndex(
    ({ nftId, editionId }) =>
      nftId === item.nftId && editionId === item.editionId,
  )

  if (existingIndex >= 0) {
    nextItems[existingIndex] = {
      ...nextItems[existingIndex],
      quantity: nextItems[existingIndex].quantity + item.quantity,
    }
  } else {
    nextItems.push(item)
  }

  writeGuestCartItems(nextItems)
  return nextItems
}

function mergeGuestCartItems(items: CartItemInput[]): CartItemInput[] {
  const merged = readGuestCartItems()
  for (const item of items) {
    const existingIndex = merged.findIndex(
      ({ nftId, editionId }) =>
        nftId === item.nftId && editionId === item.editionId,
    )

    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        quantity: merged[existingIndex].quantity + item.quantity,
      }
    } else {
      merged.push(item)
    }
  }

  writeGuestCartItems(merged)
  return merged
}

function clearGuestCartItems(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(GUEST_CART_STORAGE_KEY)
}

export {
  GUEST_CART_STORAGE_KEY,
  addGuestCartItem,
  clearGuestCartItems,
  mergeGuestCartItems,
  readGuestCartItems,
  writeGuestCartItems,
}
