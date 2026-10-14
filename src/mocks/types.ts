import type {
  Cart,
  CartCoupon,
  Favorite,
  Nft,
  NftReview,
  OrderReceiptSnapshot,
  User,
  Wallet,
} from '../types/contracts'

export type CategoryRecord = {
  id: string
  label: string
}

export type FixtureUser = User & {
  passwordSalt: string
  passwordHash: string
  walletIds: string[]
}

export type NftImageAsset = 'black-gorilla' | 'emerald-ape' | 'golden-ap' | 'hat-gorilla'

export type NftRecord = Nft & {
  createdAt: string
  popularity: number
  trendScore: number
}

export type ReviewRecord = NftReview & {
  nftId: string
}

export type CouponRecord = CartCoupon & {
  discountPercent: number
  expiresAt: string
}

export type WalletRecord = Wallet & {
  userId: string
}

export type CartRecord = {
  userId: string
  cart: Cart
}

export type FavoriteRecord = Favorite & {
  userId: string
}

export type OrderRecord = OrderReceiptSnapshot & {
  userId: string
}
