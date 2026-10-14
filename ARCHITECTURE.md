# ARCHITECTURE.md — NFT Marketplace Technical Design

Living document. It describes the **target design** and is updated as the implementation lands. Sections marked **[Planned]** are decisions not yet implemented; flip them to **[Done]** (or record the deviation) as each epic closes. The final version must also record limitations, UX decisions and Figma deviations (see §13–§15), as required by the challenge.

## 1. Architecture Overview [Planned]

Single Page Application built with React 19 and TypeScript. **TanStack Router** handles routes, URL search params and private-route guards. **TanStack Query** owns remote state. All REST calls go through **Axios**. **MSW** provides the REST mocks and the Socket.IO mock (via `@mswjs/socket.io-binding`), so components, hooks and the Axios client contain no fake data or alternate business paths.

```
┌────────────────────────────────────────────────────────┐
│                      React UI Layer                    │
│   (shadcn/ui + Tailwind CSS + TanStack Router Views)   │
└───────────┬───────────────────────────────┬────────────┘
            │                               │
            ▼                               ▼
  ┌───────────────────┐           ┌────────────────────┐
  │ TanStack Query    │◄──────────│ Socket event layer │
  │ (Remote State)    │  cache    │ (socket.io-client: │
  └─────────┬─────────┘  updates  │  dedupe/version)   │
            │                     └─────────┬──────────┘
            ▼                               │
  ┌───────────────────┐                     │
  │   Axios Client    │                     │
  └─────────┬─────────┘                     │
            ▼                               ▼
  ┌────────────────────────────────────────────────────┐
  │                 MSW (network layer)                │
  │  REST handlers  ·  Socket.IO binding  ·  scenarios │
  │  shared mock state (persisted locally, resettable) │
  └────────────────────────────────────────────────────┘
```

## 2. Technology Decisions & Compatibility [Done]

| Area | Decision | Note |
| --- | --- | --- |
| Build | Vite 8, `@vitejs/plugin-react` 6, Node ≥ 22.19 | Node floor driven by Lighthouse |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) + shadcn/ui | CSS-first tokens from Figma |
| Routing | TanStack Router, file-based | Zod-validated search params |
| Mocking | MSW **2.x** + `@mswjs/socket.io-binding@0.2.x` | Binding peer-depends on `msw@^2.10.2`; MSW 3 not used (see Limitations) |
| TypeScript | 6.0.x | Pinned below 6.1 for `typescript-eslint` support |
| Node types | `@types/node` 22.x | Matches the Node 22.19 runtime target; `.nvmrc` pins 22.19.0 |
| Validation | Zod 4.x | Retested with `npm install zod@^4`, clean `npm ci`, `npm run typecheck` and `npm run lint`; all passed with `@hookform/resolvers@5.9.1` |
| UI initialization | shadcn `radix-nova` preset and locally bundled Geist Variable | Starter defaults only; replace visual tokens/font to match Figma in Epic 1 |
| Lighthouse | Lighthouse 13.5 + direct `chrome-launcher` | The audit runner imports the launcher directly and uses Playwright's Chromium binary |
| Money | `decimal.js` | ETH as decimal strings end to end |

The initial dependency audit found 8 high and 19 moderate advisories in the Lighthouse 12.8.2 dependency graph. Lighthouse was updated to 13.5.0 (Node ≥ 22.19); the follow-up audit reported no vulnerabilities. The remaining `npm outdated` entries are deliberate compatibility pins: MSW 2.x for the Socket.IO binding, TypeScript 6.0.x for `typescript-eslint` and Node 22 types for the runtime target. Zod 4 was re-tested after the initial Zod 3 selection: installation, clean install, typecheck and lint all pass, so the project uses Zod 4. The shadcn CLI was not kept as a dependency because its package tree introduced seven high-severity advisories; generated primitives and CSS remain in the project.

## 3. Domain Rules [Planned]

- **ETH amounts** are decimal strings. No `number` arithmetic. Quantities are integers.
- **The quote is the source of truth** for subtotal, discount, network fee and total. The UI formats; it does not compute authoritative totals.
- **Orders** have states `pending → confirmed | rejected`. `confirmed` and `rejected` are terminal.
- **Receipts** are immutable snapshots taken at order creation/confirmation; later catalog changes never alter them.
- After a confirmed order, only the purchased items and quantities are removed from the cart. On any failure, cart items are preserved.

## 4. REST Contracts [Planned]

All types live in `src/types/contracts.ts` and are shared by Axios wrappers, hooks and MSW handlers.

| Resource | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout` |
| NFTs | `GET /api/nfts` (`q`, `feed` = `all \| new \| trending`, `category` (multi), `network` (multi), `minPrice` / `maxPrice` (decimal strings), `sort`, `page`, `limit`), `GET /api/nfts/featured` (hero carousel and "NFT em destaque"), `GET /api/nfts/:id`, `GET /api/nfts/:id/related` ("Mais desta coleção" and "Colecionadores também viram"), `GET /api/nfts/:id/reviews` (read-only) |
| Favorites | `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites/:nftId` |
| Cart | `GET /api/cart`, `POST /api/cart/items`, `PUT /api/cart/items/:id`, `DELETE /api/cart/items/:id`, `POST /api/cart/merge` (guest → user), `PUT /api/cart/coupon`, `DELETE /api/cart/coupon` |
| Quote | `POST /api/cart/quote` |
| Orders | `POST /api/orders` (header `X-Idempotency-Key`), `GET /api/orders/:id` |
| Profile | `GET /api/profile`, `PUT /api/profile` (data/avatar), `PUT /api/profile/password` |
| Wallets | `GET /api/wallets`, `POST /api/wallets`, `PUT /api/wallets/:id`, `POST /api/wallets/:id/connect`, `POST /api/wallets/:id/disconnect` (simulated connect/refuse/disconnect) |

`GET /api/nfts` returns `{ items, page, limit, total, totalPages, facets: { categories: [{ id, label, count }], networks: [{ id, label, count }], priceRange: { min, max } } }`. Facet counts reflect all other active filters, excluding that facet's own selection; fixtures keep the counts consistent.

An NFT has `id`, `tokenId`, `name`, `collection`, `category`, `network`, `price`, optional `compareAtPrice` and `rarity`, `isNew`, `trending`, `rating: { average, count }`, `attributes`, `description`, `images[]`, `editions[{ id, label, supply, available }]` and `version`. Cart item identity is the combination of NFT and edition.

`POST /api/orders` includes `quoteId`, collector data (`displayName`, `username`, `profileName`, `email`, `walletAddress`, `walletType`, `network`, `ensName`, `referralCode`, optional `note`), optional `walletId` and `provider` (`metamask | walletconnect | coinbase`). Ethereum and Polygon addresses validate as `0x` followed by 40 hex characters; Solana addresses validate as base58.

### 4.1 Quote

`POST /api/cart/quote` returns `{ quoteId, items[{ nftId, edition, quantity, unitPrice, available }], subtotal, discount, networkFee, total, coupon{ code, status }, expiresAt, version }`. It validates coupon, availability, discounts, fees and total. `POST /api/orders` carries the `quoteId`; the server revalidates it.

### 4.2 Error envelope

Every error response uses `{ error: { code, message, fieldErrors?, details? } }`.

| HTTP | `code` examples | Meaning |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED`, `SESSION_EXPIRED` | Missing/invalid/expired session |
| 403 | `FORBIDDEN` | No permission for the resource |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `EMAIL_TAKEN`, `AVAILABILITY_CONFLICT`, `PRICE_CHANGED`, `IDEMPOTENCY_KEY_REUSED` | Conflict (payload includes a fresh quote when relevant) |
| 422 | `VALIDATION_ERROR` (+ `fieldErrors`) | Invalid input |
| 502/503/504 | `TRANSIENT_FAILURE` | Retryable failure |

## 5. Orders & Idempotency [Planned]

- The client creates an `X-Idempotency-Key` (UUID) **per checkout attempt**, tied to the confirmed quote, and **persists it** (session storage) until the order is terminal or the user changes the cart/quote. Retrying after a timeout or double click **reuses** the same key.
- The mock backend stores key + payload hash. Same key + same payload → returns the same order (no duplicate). Same key + different payload → `409 IDEMPOTENCY_KEY_REUSED`.
- `POST /api/orders` returns the order as `pending`; confirmation/rejection arrives through `order.updated` and is also readable via `GET /api/orders/:id`.
- **Scenario "timeout after creation"**: the order is created, the response times out, the retry with the same key recovers the same order.
- **Pre-confirmation revalidation**: if price, availability, coupon or fees changed, the server answers `409` with a fresh quote; the UI shows the change and requires a new explicit confirmation. Confirmation screen is shown only for an order actually `confirmed` by the simulation.
- **Review step**: "Confirmar compra" opens a review dialog showing items, quote, wallet and network. Create the order only on the dialog's final confirmation. If the quote changes, require a new confirmation.
- Pending orders are recovered after refresh or reconnection (order id kept in session storage + `GET /api/orders/:id`).

## 6. Session Policy [Planned]

- Login returns a token with `expiresAt`. The token lives in `sessionStorage` (mock-grade; documented limitation) and is attached by an Axios request interceptor. Passwords are hashed in the mock layer; only fictitious credentials are used.
- On boot, `GET /api/auth/session` restores the session after refresh.
- Authentication is route-driven: `/login` and `/signup` render as a modal over the previous route on desktop and full-screen on mobile. Direct access works; closing the desktop modal returns to the previous route.
- `401 SESSION_EXPIRED` during navigation or checkout: save the return context (route + checkout draft + pending idempotency key) in session storage, redirect to Login with `redirect`, and resume after re-authentication.
- **Logout / user switch**: clear the Query cache, persisted private data (session, cart snapshot, checkout draft, order ids), disconnect the socket and remove every listener. Private query keys include the user id.
- Private routes (cart for authenticated users, checkout, orders, profile, wallets, favorites) are guarded in the router (`beforeLoad`).
- The authenticated header replaces "Entrar" with an account menu containing Meu perfil, Carteiras, Favoritos and Sair.

## 7. Cart State [Planned]

- **Authenticated cart** is server state (API + Query cache), persisted by the mock layer.
- **Guest cart** is held client-side (local storage, guest namespace) and **merged via `POST /api/cart/merge`** on login/signup, respecting per-NFT/edition availability, then cleared locally.
- Cart quantity edits are optimistic with rollback. Coupon apply/remove goes through the API; invalid/expired codes show a field-level message.
- Price/availability changes received while the cart is open update the summary and announce the change (live region).

## 8. Caching & Query Policy [Planned]

| Data | `staleTime` | Notes |
| --- | --- | --- |
| Catalog list, NFT detail | 30 s | Key includes full param object; `signal` cancels stale requests |
| Cart, quote, orders | 0 | Must be accurate; invalidated on mutations/events |
| Profile, wallets, favorites | 60 s | Invalidated on mutation |
| Session | until logout/expiry | Revalidated on boot |

- Retries: network errors and 5xx retry up to 2 times with exponential backoff; 4xx never retries; mutations do not auto-retry (order creation retry is a user/idempotent action).
- Key factory `src/hooks/queryKeys.ts`; private keys: `['user', userId, ...]`.
- Optimistic updates: favorites toggle and cart quantity (`onMutate` snapshot → `onError` rollback → `onSettled` invalidate).
- Background refetch states are surfaced in the UI without blocking content.

## 9. Real-Time Integration (Socket.IO) [Planned]

- **Transport**: `socket.io-client` connected to the MSW Socket.IO binding. Handshake carries the session token; events for private resources include `userId`.
- **Common envelope**: `{ eventId, type, resource: { kind, id }, version, timestamp, userId? , data }`. `version` increases monotonically **per resource**.

| Event | `data` | Client behavior |
| --- | --- | --- |
| `nft.updated` | `{ nftId, price, availableEdition }` | Patch NFT in catalog pages, detail and cart caches; invalidate quote; announce change |
| `order.updated` | `{ orderId, status: 'confirmed' \| 'rejected', transactionHash?, reason? }` | Update order/receipt; show confirmation or rejection; terminal states are never overwritten |

- **Dedup & ordering**: keep a bounded set of processed `eventId`s and the last applied `version` per resource; ignore duplicates and events with `version ≤ applied`.
- **Session isolation**: ignore events whose `userId` differs from the current session user; disconnect and unsubscribe on logout/user switch; remove listeners on unmount.
- **Reconciliation**: on reconnect, `refetchQueries({ type: 'active' })` and re-fetch any pending order.
- **Mandatory scenario**: item in cart → price/availability changes while browsing → UI announces it and updates the summary → checkout blocks confirmation with a stale quote until a fresh quote is accepted.
- **Mock/REST consistency**: the same mock state change produces both the REST result and the emitted event.

## 10. Mocking Layer [Planned]

- Enabled by `VITE_ENABLE_MOCKS`; available in the demo build (`public/mockServiceWorker.js`).
- State lives in `src/mocks/` (persisted locally for refresh; **reset** restores a known scenario).
- Scenario selection via `VITE_MOCK_SCENARIO` and/or URL parameter (document final mechanism here).
- Scenarios (deterministic): success, empty, variable latency / out-of-order, connection failure, 4xx/5xx, expired session, unauthorized, signup conflict / validation error, invalid-expired coupon, price change / sold-out during purchase, timeout after order creation, payment confirmed, payment rejected.
- Fixtures: ≥ 2 users with `referralCode` and prefilled collector profiles; 9 categories, Ethereum/Polygon/Solana networks, collection "Kurio Apes", rarity, previous prices and reviews; enough NFTs/categories for filter combinations and pagination.
- The `design-cart` scenario reproduces the reference cart exactly: Emerald Ape #042 ×2 @ 1.19, Violet Nomad #314 ×6 @ 1.39, Ivory Baron #088 ×9 @ 1.79, network fee 0.016 and total 26.846 ETH.

## 11. Routing & URL State [Planned]

Catalog search, filters, sort and pagination are validated search params in the URL; any filter change resets `page`. Unknown routes render a 404; every planned screen supports direct access and refresh (SPA fallback configured on the host).

## 12. Testing & Audit Strategy [Planned]

- Playwright (Chromium, desktop + mobile), isolated state per test, controlled clock/latency/event triggers, HTML report, traces on failure, visual baselines for Home, Detail, Cart and Payment.
- Lighthouse on Home and NFT Detail, mobile + desktop, 3 runs, medians reported; record LCP, CLS, TBT; versioned config; reports (HTML/JSON), tool versions and environment committed.

## 13. UX Decisions [Defined by DESIGN_SYSTEM.md]

- **Mercado** links to the catalog (`/` anchored at the catalog) and stays highlighted on detail, cart, checkout and favorites; **Início** is active only on `/`.
- **Criadores, Aprenda, footer link columns, "Diário da Cunhagem" cards, "Explorar →" banners, "Esqueceu a senha?", "Trocar carteira" extras and "Atividade"** link to a shared "indisponível nesta demonstração" page or are `aria-disabled` with an explanatory tooltip. They never imply success.
- **Newsletter "Enviar"** and **Google/Facebook** buttons remain visible and show an inline "indisponível nesta demonstração" message; no fake success.
- **Share icons** open the network's share URL in a new tab with `rel="noopener noreferrer"`.
- **Editorial teasers** (Diário da Cunhagem and promo copy) are static UI copy in `src/content/`; NFTs, counts, ratings, reviews and prices are business data and come from the API.
- **Reviews tab** is a read-only list from fixtures; there is no review creation.
- **Cart badge** counts total units and caps at `99+`.
- The authenticated header replaces "Entrar" with an account menu (Meu perfil, Carteiras, Favoritos, Sair) in the same button style.
- **Favorites** use `/favoritos` and reuse the card grid.
- Carousels use scroll-snap lists and real dot buttons; they do not autoplay.
- Below 1024px, catalog filters use a drawer; tablet (768–1023px) uses two product columns.

## 14. Figma Deviations & Asset Substitutions [To be recorded during implementation]

| Figma issue / unavailable frame | Implementation decision |
| --- | --- |
| "Ordenar por" chevron overlaps selected text; missing space after "por:" | Add padding/spacing. |
| Row 3 / middle card in Início has no title or price | Render complete content from fixtures. |
| Category facet counts sum to 239 while network counts sum to 283 | API returns consistent counts in fixtures. |
| Cart badge "6" does not match the cart | Count units and cap at `99+`. |
| Desktop wallet list starts with a combined "METAMASK · WALLETCONNECT · COINBASE" pill | Treat the combined option as WalletConnect; Coinbase preselected in Figma is only an example state. |
| Desktop checkout uses free-form wallet fields; mobile lists registered wallets | Use registered, prefilled wallets; "Usar outra carteira?" reveals manually entered addresses validated by network (`0x` + 40 hex for Ethereum/Polygon; base58 for Solana). |
| Field beside "Endereço da carteira" has no label (placeholder "ENS ou carteira secundária (opcional)") | Add a visible label. |
| "Código de indicação*" and "Nome ENS*" are marked required | Follow the layout, prefill from the fixture profile and document fixture codes in `README.md`. |
| Checkout has no review step | "Confirmar compra" opens a review dialog for items, quote, wallet and network; final confirmation creates the order; changed quote requires reconfirmation. |
| Login modal has no scrim | Add a dark scrim, focus trap and Escape-to-close behavior. |
| Mobile reference frame is 414px; required viewport includes 390px | Use fluid layout and verify both widths. |
| Price-filter label uses comma decimals (`0,02 - 12,30`) | Use a dot as the decimal separator throughout. |
| Resting input border contrast is 1.34:1 | Preserve for fidelity; document the trade-off and provide visible labels/placeholders and a strong focus state (see §15). |
| Roboto Mono font is self-hosted | Required by the design system; no external font CDN. |

## 15. Known Limitations [To be filled during implementation]

Known so far:
- `@mswjs/socket.io-binding@0.2.0` targets MSW 2.x, so the project stays on MSW 2.x. Mocked responses use the wrapper's `client` endpoint; its `server` endpoint represents the upstream connection. The wrapper does not implement Socket.IO rooms, custom namespaces or broadcasting; the Epic 0 browser smoke test uses WebSocket transport and does not certify HTTP long-polling or reconnect behavior.
- The MSW Socket.IO handler must be registered at the socket origin (the `ws.link(...)` origin). Import `socket.io-client` dynamically only after `worker.start()` so its transport initializes after MSW's WebSocket interceptor is active.
- Token in `sessionStorage` is mock-grade and not production-secure.
- The reference resting input border has 1.34:1 contrast against the page background. Keep it for visual fidelity, while retaining visible labels/placeholders and a strong focus state.
- Figma frames are not available for the Cadastro tab, order confirmation, profile, wallets or tablet layouts; compose them from the documented design patterns and verify responsive behavior.
