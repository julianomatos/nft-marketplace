# DESIGN_SYNC_2.md — Second design alignment (delta)

Temporary instruction file. `DESIGN_SYSTEM.md` was **replaced by a newer version** (new desktop frames: Detalhes, Carrinho, Confirmação, Perfil, Carteiras; new mobile frames: Início, Detalhes, Carrinho, Pagamento). Re-read it and the new PNGs in `design/reference/` first.

1. If `DESIGN_SYNC.md` still exists, apply it first, then this file. Where they conflict, **this file wins**.
2. Edit the three docs in place, preserving everything already recorded. Do not rewrite from scratch.
3. When done, delete `DESIGN_SYNC.md` (if present) and this file, and commit `docs: align project docs with full KURIO frames`. **Do not start Epic 1.**

## 1. AGENTS.md

- §6 Routing — replace the route list added by sync 1 with: `/` (Início), `/mercado` anchor to the catalog is **not** a route, `/nft/:id`, `/carrinho`, `/pagamento`, `/pedidos/:orderId` (receipt, reloadable), `/login`, `/signup`, `/perfil`, `/carteiras`, `/favoritos` ("Lista de interesse", inside the profile layout), and the "indisponível nesta demonstração" route. Active nav link: Início on `/`, `/perfil`, `/carteiras`, `/favoritos`; Mercado on detail, cart, checkout and receipt.
- §10 — add: "Dialogs (auth, review, receipt confirmations) need a scrim, focus trap, focus return and Esc. Mobile uses the bottom navigation (home, favorites, cart, profile) with a center button; desktop uses the header."

## 2. ARCHITECTURE.md

1. **§4 Contracts**
   - NFT `editions` are **tiers**: `[{ id, label: '1/1' | '1/10' | '1/50' | 'ABERTA', supply, available }]` (ABERTA: no cap, large `available`). Quantity is limited by the selected tier. `POST /api/cart/items` body: `{ nftId, editionId, quantity }`; line identity = NFT + edition.
   - Wallet payload (`POST/PUT /api/wallets`): `{ kind: 'primary' | 'secondary', displayName, nickname, network, profileName, address, altAddressOrEns?, walletType, referralCode, email, ensName }` (all required except `altAddressOrEns`); address validated per network.
   - Profile payload (`PUT /api/profile`): `{ displayName, username, email, ensName, walletNickname, avatar? }`; `PUT /api/profile/password`: `{ currentPassword, newPassword, confirmPassword }`.
   - Order: `POST /api/orders` body adds `provider`, `walletId`, collector fields and optional `note`; `GET /api/orders/:id` returns the immutable **receipt snapshot**: `{ orderId, status, transactionHash, network, explorerUrl, provider, wallet { nickname, address }, items [{ nftId, name, tokenId, edition, quantity, subtotal }], fee, total, createdAt }`.
2. **§5 Orders** — the receipt is a route (`/pedidos/:orderId`) rendered as the receipt panel on a plain page; it supports `pending` (spinner, "Aguardando confirmação"), `confirmed` (full receipt, "Ver no Etherscan/Polygonscan/Solscan" opens the simulated hash in a new tab) and `rejected` (message + "Tentar novamente" back to checkout with items preserved). Confirmed/rejected are terminal.
3. **§10 Mocking** — fixtures: edition tiers per NFT; reference scenario **design-cart** with editions Emerald Ape #042 `1/50` ×2, Violet Nomad #314 `ABERTA` ×6, Ivory Baron #088 `1/10` ×9 (token ids #0042, #0314, #0088); fixture user wallets `Principal` (Ethereum, MetaMask) and `Reserva` (`nova.kurio.eth`, Polygon) with distinct addresses and transaction hashes; referral codes and ENS names prefilled; `/api/favorites` backs "Lista de interesse".
4. **§13 UX decisions** — copy the new items from `DESIGN_SYSTEM.md` §9: profile menu mapping, out-of-scope menu items, receipt route, checkout form prefilled from the selected wallet (collapsible section on mobile), "Trocar carteira" and ⋮ menu, wallets screen behavior (Adicionar, "Igual à carteira principal"), mobile center button, per-breakpoint hero copy, authenticated header.
5. **§14 Figma deviations** — replace the table with the one in `DESIGN_SYSTEM.md` §10 (now longer), plus: Roboto Mono self-hosted, scrims on dialogs, review dialog in checkout.
6. **§15 Limitations** — missing frames: Cadastro tab/screen, Avaliações tab content, mobile Perfil / Carteiras / Confirmação / Cadastro, tablet, error and disabled states, authenticated header; input border contrast trade-off.

## 3. tasks.md

- **Epic 1** — extend the primitives task: Edition chips (radio group), Quantity stepper (desktop large, cart small, mobile variants, limits), Rating, Tabs with rule, Avatar block, Profile sidebar item (4px active bar), Summary panel, Dots (active filled / inactive outlined), mobile shell (top search + filter button, bottom navigation with center button, sticky action bar, staggered 2-column grid, gradient primary button).
- **Epic 5** — edition tiers selection with availability and quantity limit; thumbnails, zoom, tabs, share row; mobile detail with sticky bar.
- **Epic 6** — show the edition tier on every cart line; mobile cart cards with the coupon/summary sheet; "Conectar e finalizar" goes to checkout (login first when guest, with `redirect`).
- **Epic 7** — receipt route `/pedidos/:orderId` with pending / confirmed / rejected states and the explorer link per network; checkout mobile composition (wallet cards, provider cards, collapsible collector data).
- **Epic 9** — `/perfil` (fields, avatar Alterar/Remover, password change) and `/carteiras` (primary form, secondary section, "Adicionar", "Igual à carteira principal", validation per network) with the profile sidebar; `/favoritos` ("Lista de interesse") reusing the card grid; mobile compositions of all three using the shared components.
