import { authHandlers } from './auth'
import { nftHandlers } from './nfts'
import { favoritesHandlers } from './favorites'
import { cartHandlers } from './cart'
import { orderHandlers } from './orders'
import { profileHandlers } from './profile'
import { walletHandlers } from './wallets'
import { scenarioHandlers } from './scenarios'

export const handlers = [
  ...scenarioHandlers,
  ...authHandlers,
  ...nftHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
]

export {
  authHandlers,
  nftHandlers,
  favoritesHandlers,
  cartHandlers,
  orderHandlers,
  profileHandlers,
  walletHandlers,
}
