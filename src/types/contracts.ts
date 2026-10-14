import { z } from 'zod'

export const ethAmountSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Expected a decimal ETH string')

export const positiveIntegerSchema = z.number().int().min(1)
export const positiveQuantitySchema = positiveIntegerSchema

export const nonNegativeIntegerSchema = z.number().int().min(0)

export const networkSchema = z.enum(['ethereum', 'polygon', 'solana'])

export const walletProviderSchema = z.enum([
  'metamask',
  'walletconnect',
  'coinbase',
])

const walletAddressPatterns: Record<Network, RegExp> = {
  ethereum: /^0x[a-fA-F0-9]{40}$/,
  polygon: /^0x[a-fA-F0-9]{40}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]+$/,
}

function validateWalletAddress(
  address: string,
  network: Network,
  path: string,
  context: z.RefinementCtx,
) {
  if (!walletAddressPatterns[network].test(address)) {
    context.addIssue({
      code: 'custom',
      path: [path],
      message: `Invalid ${network} wallet address`,
    })
  }
}

export const signupRequestSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
})

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const cartItemInputSchema = z.object({
  nftId: z.string().min(1),
  editionId: z.string().min(1),
  quantity: positiveQuantitySchema,
})

export const profileUpdateRequestSchema = z.object({
  displayName: z.string().min(1),
  username: z.string().min(1),
  email: z.string().email(),
  ensName: z.string(),
  walletNickname: z.string().min(1),
  avatar: z.string().optional(),
})

export const passwordUpdateRequestSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
  confirmPassword: z.string().min(1),
})

export const collectorDataSchema = z.object({
  displayName: z.string().min(1),
  username: z.string().min(1),
  profileName: z.string().min(1),
  email: z.string().email(),
  walletAddress: z.string().min(1),
  walletType: walletProviderSchema,
  network: networkSchema,
  ensName: z.string().min(1),
  referralCode: z.string().min(1),
  note: z.string().optional(),
}).superRefine((collector, context) => {
  validateWalletAddress(
    collector.walletAddress,
    collector.network,
    'walletAddress',
    context,
  )
})

export const createOrderRequestSchema = z.object({
  quoteId: z.string().min(1),
  provider: walletProviderSchema,
  walletId: z.string().min(1),
  collector: collectorDataSchema,
})

export const applyCouponRequestSchema = z.object({
  code: z.string().min(1),
})

export const mergeCartRequestSchema = z.object({
  items: z.array(cartItemInputSchema),
})

export const walletUpsertRequestSchema = z.object({
  kind: z.enum(['primary', 'secondary']),
  displayName: z.string().min(1),
  nickname: z.string().min(1),
  network: networkSchema,
  profileName: z.string().min(1),
  address: z.string().min(1),
  altAddressOrEns: z.string().optional(),
  walletType: walletProviderSchema,
  referralCode: z.string().min(1),
  email: z.string().email(),
  ensName: z.string().min(1),
}).superRefine((wallet, context) => {
  validateWalletAddress(wallet.address, wallet.network, 'address', context)
})

export type EthAmount = z.infer<typeof ethAmountSchema>
export type PositiveInteger = z.infer<typeof positiveIntegerSchema>
export type PositiveQuantity = z.infer<typeof positiveQuantitySchema>
export type NonNegativeInteger = z.infer<typeof nonNegativeIntegerSchema>
export type Network = z.infer<typeof networkSchema>
export type WalletProvider = z.infer<typeof walletProviderSchema>

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'AVAILABILITY_CONFLICT'
  | 'PRICE_CHANGED'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'VALIDATION_ERROR'
  | 'TRANSIENT_FAILURE'

export const apiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    fieldErrors: z.record(z.string(), z.unknown()).optional(),
    details: z.unknown().optional(),
  }),
})

export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>

export type SignupRequest = z.infer<typeof signupRequestSchema>
export type LoginRequest = z.infer<typeof loginRequestSchema>

export type User = {
  id: string
  displayName: string
  username: string
  email: string
  ensName: string
  referralCode: string
  avatar?: string
}

export type AuthResponse = {
  token: string
  expiresAt: string
  user: User
}

export type SignupResponse = AuthResponse
export type LoginResponse = AuthResponse

export type AuthSessionResponse =
  | { authenticated: true; user: User; expiresAt: string }
  | { authenticated: false; user: null }

export type LogoutResponse = {
  loggedOut: true
}

export type Feed = 'all' | 'new' | 'trending'

export type NftSearchParams = {
  q?: string
  feed?: Feed
  category?: string[]
  network?: Network[]
  minPrice?: EthAmount
  maxPrice?: EthAmount
  sort?: string
  page?: PositiveInteger
  limit?: PositiveInteger
}

export type NftEditionLabel = '1/1' | '1/10' | '1/50' | 'ABERTA'

export type NftEdition = {
  id: string
  label: NftEditionLabel
  supply: NonNegativeInteger
  available: NonNegativeInteger
}

export type NftRating = {
  average: number
  count: NonNegativeInteger
}

export type NftAttribute = {
  traitType: string
  value: string | number
}

export type NftImage = {
  url: string
  alt: string
}

export type NftSummary = {
  id: string
  tokenId: string
  name: string
  collection: string
  price: EthAmount
  compareAtPrice?: EthAmount
  rarity?: string
  images: NftImage[]
}

export type Nft = NftSummary & {
  category: string
  network: Network
  isNew: boolean
  trending: boolean
  rating: NftRating
  attributes: NftAttribute[]
  description: string
  editions: NftEdition[]
  version: PositiveInteger
}

export type NftDetailResponse = Nft

export type NftFacet = {
  id: string
  label: string
  count: NonNegativeInteger
}

export type NftFacets = {
  categories: NftFacet[]
  networks: NftFacet[]
  priceRange: {
    min: EthAmount
    max: EthAmount
  }
}

export type NftListResponse = {
  items: Nft[]
  page: PositiveInteger
  limit: PositiveInteger
  total: NonNegativeInteger
  totalPages: NonNegativeInteger
  facets: NftFacets
}

export type FeaturedNftsResponse = {
  hero: Nft[]
  featured: Nft | null
}

export type RelatedNftsResponse = {
  items: Nft[]
}

export type NftReview = {
  id: string
  displayName: string
  rating: number
  comment: string
  createdAt: string
}

export type NftReviewsResponse = {
  items: NftReview[]
}

export type Favorite = {
  nftId: string
  nft: Nft
  createdAt: string
}

export type FavoritesResponse = {
  items: Favorite[]
}

export type AddFavoriteRequest = {
  nftId: string
}

export type AddFavoriteResponse = Favorite

export type RemoveFavoriteResponse = {
  nftId: string
  removed: true
}

export type CartItemInput = z.infer<typeof cartItemInputSchema>

export type CartItem = {
  id: string
  nftId: string
  editionId: string
  edition: NftEditionLabel
  quantity: PositiveQuantity
  unitPrice: EthAmount
  available: NonNegativeInteger
  nft: NftSummary
}

export type CouponStatus = 'valid' | 'invalid' | 'expired'

export type CartCoupon = {
  code: string
  status: CouponStatus
}

export type Cart = {
  items: CartItem[]
  coupon: CartCoupon | null
}

export type CartResponse = Cart

export type AddCartItemRequest = CartItemInput
export type AddCartItemResponse = Cart

export type UpdateCartItemRequest = {
  quantity: PositiveQuantity
}

export type UpdateCartItemResponse = Cart

export type RemoveCartItemResponse = {
  itemId: string
  removed: true
}

export type MergeCartResponse = {
  cart: Cart
  mergedItemCount: NonNegativeInteger
}

export type ApplyCouponResponse = {
  cart: Cart
}

export type RemoveCouponResponse = {
  cart: Cart
}

export type QuoteRequest = Record<string, never>

export type QuoteItem = {
  nftId: string
  edition: NftEditionLabel
  quantity: PositiveQuantity
  unitPrice: EthAmount
  available: NonNegativeInteger
}

export type QuoteResponse = {
  quoteId: string
  items: QuoteItem[]
  subtotal: EthAmount
  discount: EthAmount
  networkFee: EthAmount
  total: EthAmount
  coupon: CartCoupon | null
  expiresAt: string
  version: PositiveInteger
}

export type OrderStatus = 'pending' | 'confirmed' | 'rejected'

export type CollectorData = z.infer<typeof collectorDataSchema>

export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>

export type OrderReceiptItem = {
  nftId: string
  name: string
  tokenId: string
  edition: NftEditionLabel
  quantity: PositiveQuantity
  subtotal: EthAmount
}

export type OrderReceiptSnapshot = {
  orderId: string
  status: OrderStatus
  transactionHash: string | null
  network: Network
  explorerUrl: string | null
  provider: WalletProvider
  wallet: {
    nickname: string
    address: string
  }
  items: OrderReceiptItem[]
  fee: EthAmount
  total: EthAmount
  createdAt: string
}

export type CreateOrderResponse = OrderReceiptSnapshot
export type GetOrderResponse = OrderReceiptSnapshot

export type Profile = {
  displayName: string
  username: string
  email: string
  ensName: string
  walletNickname: string
  avatar?: string
  referralCode: string
}

export type ProfileResponse = Profile
export type ProfileUpdateRequest = z.infer<typeof profileUpdateRequestSchema>
export type ProfileUpdateResponse = ProfileResponse

export type PasswordUpdateRequest = z.infer<
  typeof passwordUpdateRequestSchema
>

export type PasswordUpdateResponse = {
  updated: true
}

export type WalletKind = 'primary' | 'secondary'

export type Wallet = {
  id: string
  kind: WalletKind
  displayName: string
  nickname: string
  network: Network
  profileName: string
  address: string
  altAddressOrEns?: string
  walletType: WalletProvider
  referralCode: string
  email: string
  ensName: string
  connectionStatus: 'connected' | 'disconnected'
}

export type WalletUpsertRequest = z.infer<typeof walletUpsertRequestSchema>

export type ApplyCouponRequest = z.infer<typeof applyCouponRequestSchema>
export type MergeCartRequest = z.infer<typeof mergeCartRequestSchema>

export type WalletsResponse = {
  items: Wallet[]
}

export type WalletUpsertResponse = {
  wallet: Wallet
}

export type ConnectWalletRequest = Record<string, never>

export type ConnectWalletResponse = {
  wallet: Wallet
  outcome: 'connected' | 'refused'
}

export type DisconnectWalletRequest = Record<string, never>

export type DisconnectWalletResponse = {
  wallet: Wallet
  outcome: 'disconnected'
}
