import { z } from 'zod'

const AUTH_RETURN_CONTEXT_STORAGE_KEY = 'kurio.auth.return-context'
const CHECKOUT_DRAFT_STORAGE_KEY = 'kurio.checkout.draft'
const CHECKOUT_IDEMPOTENCY_KEY_STORAGE_KEY = 'kurio.checkout.idempotency-key'
const PENDING_ORDER_ID_STORAGE_KEY = 'kurio.pending-order-id'
const AUTH_RETURN_CONTEXT_SCHEMA = z.object({
  redirect: z.string(),
  checkoutDraft: z.string().optional(),
  idempotencyKey: z.string().optional(),
})

function readAuthReturnContext() {
  if (typeof window === 'undefined') return null
  const stored = window.sessionStorage.getItem(AUTH_RETURN_CONTEXT_STORAGE_KEY)
  if (!stored) return null

  try {
    const parsed = AUTH_RETURN_CONTEXT_SCHEMA.safeParse(JSON.parse(stored))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function getSafeInternalRedirect(value: string | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null
  }

  const url = new URL(value, 'https://kurio.invalid')
  if (
    url.origin !== 'https://kurio.invalid' ||
    url.pathname === '/login' ||
    url.pathname === '/signup'
  ) {
    return null
  }

  return `${url.pathname}${url.search}${url.hash}`
}

function saveAuthReturnContext(href: string): string | null {
  if (typeof window === 'undefined') return null
  const redirect = getSafeInternalRedirect(href)
  if (!redirect) return null

  const context = {
    redirect,
    checkoutDraft:
      window.sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY) ?? undefined,
    idempotencyKey:
      window.sessionStorage.getItem(CHECKOUT_IDEMPOTENCY_KEY_STORAGE_KEY) ??
      undefined,
  }
  window.sessionStorage.setItem(
    AUTH_RETURN_CONTEXT_STORAGE_KEY,
    JSON.stringify(context),
  )
  return redirect
}

function getAuthReturnTarget(searchRedirect?: string): string | null {
  const safeSearchTarget = getSafeInternalRedirect(searchRedirect)
  if (safeSearchTarget) return safeSearchTarget
  const context = readAuthReturnContext()
  return context ? getSafeInternalRedirect(context.redirect) : null
}

function restoreAuthReturnContext(): void {
  if (typeof window === 'undefined') return
  const context = readAuthReturnContext()
  if (!context) return

  if (context.checkoutDraft !== undefined) {
    window.sessionStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, context.checkoutDraft)
  }
  if (context.idempotencyKey !== undefined) {
    window.sessionStorage.setItem(
      CHECKOUT_IDEMPOTENCY_KEY_STORAGE_KEY,
      context.idempotencyKey,
    )
  }
}

function clearAuthReturnContext(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(AUTH_RETURN_CONTEXT_STORAGE_KEY)
}

function clearPrivateSessionStorage(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY)
  window.sessionStorage.removeItem(CHECKOUT_IDEMPOTENCY_KEY_STORAGE_KEY)
  window.sessionStorage.removeItem(PENDING_ORDER_ID_STORAGE_KEY)
  window.sessionStorage.removeItem(AUTH_RETURN_CONTEXT_STORAGE_KEY)
}

export {
  AUTH_RETURN_CONTEXT_STORAGE_KEY,
  CHECKOUT_DRAFT_STORAGE_KEY,
  CHECKOUT_IDEMPOTENCY_KEY_STORAGE_KEY,
  PENDING_ORDER_ID_STORAGE_KEY,
  clearAuthReturnContext,
  clearPrivateSessionStorage,
  getAuthReturnTarget,
  getSafeInternalRedirect,
  restoreAuthReturnContext,
  saveAuthReturnContext,
}
