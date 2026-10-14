import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { API_ENDPOINTS } from '../../types/endpoints'
import {
  connectWalletRequestSchema,
  disconnectWalletRequestSchema,
  walletUpsertRequestSchema,
  type Wallet,
} from '../../types/contracts'
import { persistMockState, readMockState } from '../store'
import type { WalletRecord } from '../types'
import {
  buildErrorResponse,
  formatZodErrors,
  getAuthenticatedUser,
  HANDLER_BASE_PATH,
} from './utils'

const connectWalletMockRequestSchema = connectWalletRequestSchema.extend({
  outcome: z.enum(['connected', 'refused']).optional(),
})

export const walletHandlers = [
  http.get(`${HANDLER_BASE_PATH}${API_ENDPOINTS.wallets.list}`, ({ request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    const state = readMockState()
    const userWallets = state.wallets
      .filter((w) => w.userId === auth.user!.id)
      .map(({ id, kind, displayName, nickname, network, profileName, address, altAddressOrEns, walletType, referralCode, email, ensName, connectionStatus }) => ({
        id,
        kind,
        displayName,
        nickname,
        network,
        profileName,
        address,
        altAddressOrEns,
        walletType,
        referralCode,
        email,
        ensName,
        connectionStatus,
      }))

    return HttpResponse.json({ items: userWallets })
  }),

  http.post(`${HANDLER_BASE_PATH}${API_ENDPOINTS.wallets.list}`, async ({ request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return buildErrorResponse('VALIDATION_ERROR', 'JSON inválido.')
    }

    const parsed = walletUpsertRequestSchema.safeParse(body)
    if (!parsed.success) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'Revise os dados da carteira e tente novamente.',
        undefined,
        formatZodErrors(parsed.error),
      )
    }

    const state = readMockState()
    const existingSameKind = state.wallets.find(
      (w) => w.userId === auth.user!.id && w.kind === parsed.data.kind,
    )

    if (existingSameKind) {
      return HttpResponse.json(
        {
          error: {
            code: 'WALLET_KIND_CONFLICT',
            message: `Já existe uma carteira ${parsed.data.kind === 'primary' ? 'principal' : 'secundária'} cadastrada.`,
            fieldErrors: {
              kind: [`Já existe uma carteira ${parsed.data.kind === 'primary' ? 'principal' : 'secundária'}.`],
            },
          },
        },
        { status: 409 },
      )
    }

    const newWallet: WalletRecord = {
      ...parsed.data,
      id: `wallet-${auth.user.id}-${parsed.data.kind}`,
      userId: auth.user.id,
      connectionStatus: 'connected',
    }

    persistMockState({
      ...state,
      wallets: [...state.wallets, newWallet],
    })

    const walletResponse: Wallet = {
      id: newWallet.id,
      kind: newWallet.kind,
      displayName: newWallet.displayName,
      nickname: newWallet.nickname,
      network: newWallet.network,
      profileName: newWallet.profileName,
      address: newWallet.address,
      altAddressOrEns: newWallet.altAddressOrEns,
      walletType: newWallet.walletType,
      referralCode: newWallet.referralCode,
      email: newWallet.email,
      ensName: newWallet.ensName,
      connectionStatus: newWallet.connectionStatus,
    }

    return HttpResponse.json({ wallet: walletResponse })
  }),

  http.put(
    `${HANDLER_BASE_PATH}${API_ENDPOINTS.wallets.detailPattern}`,
    async ({ params, request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return buildErrorResponse('VALIDATION_ERROR', 'JSON inválido.')
    }

    const parsed = walletUpsertRequestSchema.safeParse(body)
    if (!parsed.success) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'Revise os dados da carteira e tente novamente.',
        undefined,
        formatZodErrors(parsed.error),
      )
    }

    const walletId = String(params.id)
    const state = readMockState()
    const walletIndex = state.wallets.findIndex(
      (w) => w.id === walletId && w.userId === auth.user!.id,
    )

    if (walletIndex === -1) {
      return buildErrorResponse(
        'NOT_FOUND',
        'A carteira solicitada não foi encontrada.',
      )
    }

    const conflictingKind = state.wallets.some(
      (wallet) =>
        wallet.userId === auth.user!.id &&
        wallet.id !== walletId &&
        wallet.kind === parsed.data.kind,
    )
    if (conflictingKind) {
      return buildErrorResponse(
        'WALLET_KIND_CONFLICT',
        `Já existe uma carteira ${parsed.data.kind === 'primary' ? 'principal' : 'secundária'} cadastrada.`,
        undefined,
        { kind: ['Já existe uma carteira deste tipo.'] },
      )
    }

    const updatedWallet: WalletRecord = {
      ...state.wallets[walletIndex],
      ...parsed.data,
      id: walletId,
      userId: auth.user.id,
    }

    const nextWallets = [...state.wallets]
    nextWallets[walletIndex] = updatedWallet
    persistMockState({ ...state, wallets: nextWallets })

    const walletResponse: Wallet = {
      id: updatedWallet.id,
      kind: updatedWallet.kind,
      displayName: updatedWallet.displayName,
      nickname: updatedWallet.nickname,
      network: updatedWallet.network,
      profileName: updatedWallet.profileName,
      address: updatedWallet.address,
      altAddressOrEns: updatedWallet.altAddressOrEns,
      walletType: updatedWallet.walletType,
      referralCode: updatedWallet.referralCode,
      email: updatedWallet.email,
      ensName: updatedWallet.ensName,
      connectionStatus: updatedWallet.connectionStatus,
    }

    return HttpResponse.json({ wallet: walletResponse })
    },
  ),

  http.post(
    `${HANDLER_BASE_PATH}${API_ENDPOINTS.wallets.connectPattern}`,
    async ({ params, request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return buildErrorResponse('VALIDATION_ERROR', 'JSON inválido.')
    }

    const parsed = connectWalletMockRequestSchema.safeParse(body)
    if (!parsed.success) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'Informe um provedor de carteira válido.',
        undefined,
        formatZodErrors(parsed.error),
      )
    }

    const walletId = String(params.id)
    const state = readMockState()
    const wallet = state.wallets.find(
      (w) => w.id === walletId && w.userId === auth.user!.id,
    )

    if (!wallet) {
      return buildErrorResponse(
        'NOT_FOUND',
        'A carteira solicitada não foi encontrada.',
      )
    }

    if (parsed.data.provider !== wallet.walletType) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'O provedor não corresponde à carteira selecionada.',
        undefined,
        { provider: ['Selecione o provedor da carteira escolhida.'] },
      )
    }

    if (parsed.data.outcome === 'refused') {
      return HttpResponse.json({
        wallet,
        outcome: 'refused' as const,
      })
    }

    const updatedWallet: WalletRecord = {
      ...wallet,
      connectionStatus: 'connected',
    }

    const nextWallets = state.wallets.map((w) =>
      w.id === walletId && w.userId === auth.user!.id ? updatedWallet : w,
    )
    persistMockState({ ...state, wallets: nextWallets })

    return HttpResponse.json({
      wallet: updatedWallet,
      outcome: 'connected' as const,
    })
    },
  ),

  http.post(
    `${HANDLER_BASE_PATH}${API_ENDPOINTS.wallets.disconnectPattern}`,
    async ({ params, request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return buildErrorResponse('VALIDATION_ERROR', 'JSON inválido.')
    }

    const parsed = disconnectWalletRequestSchema.safeParse(body)
    if (!parsed.success) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'A desconexão não aceita campos adicionais.',
        undefined,
        formatZodErrors(parsed.error),
      )
    }

    const walletId = String(params.id)
    const state = readMockState()
    const wallet = state.wallets.find(
      (w) => w.id === walletId && w.userId === auth.user!.id,
    )

    if (!wallet) {
      return buildErrorResponse(
        'NOT_FOUND',
        'A carteira solicitada não foi encontrada.',
      )
    }

    const updatedWallet: WalletRecord = {
      ...wallet,
      connectionStatus: 'disconnected',
    }

    const nextWallets = state.wallets.map((w) =>
      w.id === walletId && w.userId === auth.user!.id ? updatedWallet : w,
    )
    persistMockState({ ...state, wallets: nextWallets })

    return HttpResponse.json({
      wallet: updatedWallet,
      outcome: 'disconnected' as const,
    })
    },
  ),
]
