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
| Validation | Zod `^4.6.7` | Installed 4.6.7; retested with `npm install zod@^4`, clean `npm ci`, typecheck and lint; all passed with `@hookform/resolvers@5.9.1` |
| HTTP | Axios 1.x | `VITE_API_BASE_URL` (default `/api`), 15 s timeout, bearer token from session storage, normalized errors |
| UI foundation | shadcn-style source components with KURIO CSS tokens and locally bundled Roboto Mono | Native form controls and `<dialog>` avoid additional runtime dependencies; `@radix-ui/react-slot` remains for Button composition |
| Lighthouse | Lighthouse 13.5 + direct `chrome-launcher` | The audit runner imports the launcher directly and uses Playwright's Chromium binary |
| Money | `decimal.js` | ETH as decimal strings end to end |

The initial dependency audit found 8 high and 19 moderate advisories in the Lighthouse 12.8.2 dependency graph. Lighthouse was updated to 13.5.0 (Node ≥ 22.19); the follow-up audit reported no vulnerabilities. The remaining `npm outdated` entries are deliberate compatibility pins: MSW 2.x for the Socket.IO binding, TypeScript 6.0.x for `typescript-eslint` and Node 22 types for the runtime target. Zod 4 was re-tested after the initial Zod 3 selection: installation, clean install, typecheck and lint all pass, so the project uses Zod 4. The shadcn CLI was not kept as a dependency because its package tree introduced seven high-severity advisories; generated primitives and CSS remain in the project.

Mock state is centralized in `src/mocks/store.ts`: it persists a resettable scenario in `localStorage`, restores fixture data from `src/mocks/fixtures`, and salts + hashes mock credentials with SHA-256 before comparing them during auth flows. Resetting or bootstrapping the state always returns the same known scenario (`success`, `empty`, `design-cart`, etc.) so tests stay deterministic.

## 3. Domain Rules [Planned]

- **ETH amounts** are decimal strings. No `number` arithmetic. Quantities are integers.
- `src/utils/eth.ts` is the shared decimal.js boundary for ETH math (`add`, `mul`, `div`, `sum`, `compare`, `format`); it uses a local Decimal clone with 80 significant digits. `format` validates and preserves the API decimal string verbatim (dot separator, no grouping or rounding); arithmetic results use fixed notation. The range slider uses the same helpers for its ETH bounds.
- **The quote is the source of truth** for subtotal, discount, network fee and total. The UI formats; it does not compute authoritative totals.
- **Orders** have states `pending → confirmed | rejected`. `confirmed` and `rejected` are terminal.
- **Receipts** are immutable snapshots taken at order creation/confirmation; later catalog changes never alter them.
- After a confirmed order, only the purchased items and quantities are removed from the cart. On any failure, cart items are preserved.

## 4. REST Contracts [Contracts and MSW handlers implemented]

REST request/response types live in `src/types/contracts.ts` and are shared by Axios wrappers, hooks and MSW handlers. `EthAmount` is a decimal string validated by the common `ethAmountSchema` (`/^\d+(?:\.\d{1,18})?$/`); quantities use integer types and the shared positive-quantity schema at request boundaries. No ETH amount is represented as a JavaScript number.

Shared endpoint paths, the `/api` base path, `X-Idempotency-Key`, and API error HTTP statuses live in `src/types/endpoints.ts`. Axios and MSW handlers use the same endpoint map. Browser URL `category` and `network` values are JSON arrays in the query string (for example, `category=%5B%22art%22%2C%22collectibles%22%5D`). For API requests, Axios `paramsSerializer` emits repeated parameters (`category=art&category=collectibles`); handlers read them using `URLSearchParams.getAll()`. Search defaults are `sort=recent`, `page=1`, and `limit=9`; malformed individual values fall back to their defaults / omitted optional filters. Changing any catalog filter resets `page` to 1.

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

`GET /api/nfts` returns `{ items, page, limit, total, totalPages, facets: { categories: [{ id, label, count }], networks: [{ id, label, count }], priceRange: { min, max } } }`. NFT images include `url`, `alt`, source `width` / `height`, and `thumbnailUrl` for the 480 px variant. Facet counts reflect all other active filters, excluding that facet's own selection; fixtures keep the counts consistent. Supported `sort` values are `recent`, `price-asc`, `price-desc`, and `popular`.

The corresponding TypeScript names are `AuthResponse` / `AuthSessionResponse`, `NftListResponse` / `NftFacets` / `NftEdition`, `FavoritesResponse`, `CartResponse` / `MergeCartRequest` / `MergeCartResponse`, `QuoteResponse`, `CreateOrderRequest` / `OrderReceiptSnapshot`, `ProfileResponse`, `WalletsResponse`, and `ApiErrorEnvelope`. Form/request Zod schemas define `SignupRequest`, `LoginRequest`, `CartItemInput`, `MergeCartRequest`, `ApplyCouponRequest`, `CreateOrderRequest`, `ProfileUpdateRequest`, `PasswordUpdateRequest`, and `WalletUpsertRequest`; these schemas validate untrusted input rather than duplicating response types. Wallet addresses are checked against the documented network formats at profile/order form boundaries.

An NFT has `id`, `tokenId`, `name`, `collection`, `category`, `network`, `price`, optional `compareAtPrice` and `rarity`, `isNew`, `trending`, `rating: { average, count }`, `attributes`, `description`, `images[]`, `editions[{ id, label: '1/1' | '1/10' | '1/50' | 'ABERTA', supply, available }]` and `version`. `supply: null` represents an uncapped `ABERTA` edition; `available` remains the current integer availability. Quantity is limited by the selected tier's availability. Cart line identity is the combination of NFT and edition. `POST /api/cart/items` accepts `{ nftId, editionId, quantity }`.

Each `CartItem` and `QuoteItem` carries API-authoritative `lineTotal`; quote items also carry `editionId`. `CartCoupon.status` is only `valid | expired`. An invalid or expired coupon is rejected by the API and is not stored on the cart.

`POST /api/orders` includes `quoteId`, `provider`, `walletId`, collector data (`displayName`, `username`, `profileName`, `email`, `walletAddress`, `walletType`, `network`, `ensName`, `referralCode`, optional `note`). Ethereum and Polygon addresses validate as `0x` followed by 40 hex characters; Solana addresses validate as base58.

Wallet create/update payload: `{ kind: 'primary' | 'secondary', displayName, nickname, network, profileName, address, altAddressOrEns?, walletType, referralCode, email, ensName }`; all fields are required except `altAddressOrEns`. `PUT /api/profile` accepts `{ displayName, username, email, ensName, walletNickname, avatar? }`; `PUT /api/profile/password` accepts `{ currentPassword, newPassword, confirmPassword }`.

`GET /api/orders/:id` returns the immutable receipt snapshot `{ orderId, version, quoteId, status, transactionHash, network, explorerUrl, provider, wallet: { nickname, address }, items: [{ nftId, name, tokenId, edition, quantity, unitPrice, subtotal }], subtotal, discount, fee, total, createdAt }`.

Response shapes not explicitly specified by the challenge are made concrete as follows: `GET /api/auth/session` is a discriminated authenticated/guest result; featured NFTs return `{ hero, featured }`; favorites return records with their NFT embedded, while delete returns `{ nftId, removed: true }`; cart merge accepts guest `CartItemInput[]` and returns the cart plus `mergedItemCount`; wallet connect returns `outcome: connected | refused`. Reviews use `{ id, displayName, rating, comment, createdAt }`. Serialized network/provider identifiers are lowercase (`ethereum | polygon | solana`, `metamask | walletconnect | coinbase`); category and facet identifiers remain opaque strings. The `sort` enum is set to `recent`, `price-asc`, `price-desc`, and `popular`; this list is an implementation assumption because the challenge does not enumerate sort values. A wallet upsert using a `kind` already present returns `409 WALLET_KIND_CONFLICT` rather than replacing that wallet. A conflict error returns a fresh quote in `details.quote`. These are contract assumptions for consistent client/mock implementation, not additional business rules.

### 4.1 Quote

`POST /api/cart/quote` returns `{ quoteId, items[{ nftId, editionId, edition, quantity, unitPrice, lineTotal, available }], subtotal, discount, networkFee, total, coupon{ code, status }, expiresAt, version }`. It validates coupon, availability, discounts, fees and total. `POST /api/orders` carries the `quoteId`; the server revalidates it.

### 4.2 Error envelope

Every error response uses `{ error: { code, message, fieldErrors?: Record<string, string[]>, details? } }`. `ApiErrorCode` is derived from `apiErrorCodeSchema`; `PRICE_CHANGED` and `AVAILABILITY_CONFLICT` carry `details: { quote: QuoteResponse }`. Error codes and HTTP statuses are centralized in `src/types/endpoints.ts`.
Axios responses are validated against this envelope and normalized to `ApiClientError`; `src/utils/errors.ts` maps known API codes to user-facing Portuguese messages and preserves status, field errors and details.

| HTTP | `code` examples | Meaning |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED`, `SESSION_EXPIRED`, `INVALID_CREDENTIALS` | Missing/invalid/expired session or credentials |
| 403 | `FORBIDDEN` | No permission for the resource |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `EMAIL_TAKEN`, `AVAILABILITY_CONFLICT`, `PRICE_CHANGED`, `IDEMPOTENCY_KEY_REUSED`, `WALLET_KIND_CONFLICT` | Conflict (payload includes a fresh quote when relevant) |
| 422 | `VALIDATION_ERROR` (+ `fieldErrors`), `COUPON_INVALID`, `COUPON_EXPIRED` | Invalid input or rejected coupon |
| 503 | `TRANSIENT_FAILURE` | Retryable service failure |

## 5. Orders & Idempotency [REST mock implemented; checkout UI planned]

- The client creates an `X-Idempotency-Key` (UUID) **per checkout attempt**, tied to the confirmed quote, and **persists it** (session storage) until the order is terminal or the user changes the cart/quote. Retrying after a timeout or double click **reuses** the same key.
- The mock backend stores a per-user key + payload hash. Same user/key + same payload → returns the same order (no duplicate); same user/key + different payload → `409 IDEMPOTENCY_KEY_REUSED`. The same key may be used independently by another user.
- `POST /api/orders` returns the immutable receipt snapshot as `pending`; `GET /api/orders/:id` reads it only for its owner. A mock-only `settleOrder(orderId, outcome)` control marks it confirmed or rejected; socket delivery is not implemented yet.
- **Scenario "timeout after creation"**: the order is created, the response times out, the retry with the same key recovers the same order.
- **Pre-confirmation revalidation**: if price, availability, coupon or fees changed, the server answers `409` with a fresh quote; the UI shows the change and requires a new explicit confirmation. Confirmation screen is shown only for an order actually `confirmed` by the simulation.
- Order creation revalidates the quote against current prices, availability, coupon and expiry. A quote conflict returns a fresh quote; an expired coupon is removed from the cart and rejected with `422 COUPON_EXPIRED`. Confirming a pending order decrements inventory and removes only the purchased quantities; rejection preserves both cart and availability.
- **Review step**: "Confirmar compra" opens a review dialog showing items, quote, wallet and network. Create the order only on the dialog's final confirmation. If the quote changes, require a new confirmation.
- Pending orders are recovered after refresh or reconnection (order id kept in session storage + `GET /api/orders/:id`).
- Receipt is the reloadable `/pedidos/:orderId` route, rendered as a receipt panel on a plain page. It handles `pending` (spinner and "Aguardando confirmação"), `confirmed` (full immutable receipt and simulated network explorer link opening in a new tab), and `rejected` (message and "Tentar novamente" back to checkout with items preserved). Confirmed and rejected are terminal.

## 6. Session Policy [Bootstrap implemented; guards and lifecycle handling planned]

- Login returns a token with `expiresAt`. The token lives in `sessionStorage` under `kurio.session.token` (mock-grade; documented limitation) and is attached by an Axios request interceptor. Passwords are hashed in the mock layer; only fictitious credentials are used.
- On boot, `useSession` calls `GET /api/auth/session` only when a session token exists; a visitor without a token does not make this request. The response is validated against `authSessionResponseSchema`; a valid token restores the authenticated header and router context after refresh. An expired token returns `401 SESSION_EXPIRED`, is removed from `sessionStorage`, and leaves the visitor unauthenticated. Other request/validation failures remain visible with a retry action and do not silently clear the token.
- Successful login/signup validates the response, persists its token in `sessionStorage`, and seeds the session query cache so the authenticated header updates without a second request. The Axios interceptor attaches the stored token to subsequent requests.
- The default success scenario must not produce 4xx responses in the browser console, so Lighthouse runs stay free of expected-error noise.
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

The QueryClient is initialized in `src/lib/query-client.ts` and provided above the router. Its default `staleTime` is 0; `queryStaleTimes` supplies the per-resource values below. Network errors and HTTP 5xx retry at most twice with exponential backoff; 4xx, cancellation, unknown errors and mutations do not retry. React Query Devtools render only in development.

| Data | `staleTime` | Notes |
| --- | --- | --- |
| Catalog list, NFT detail | 30 s | Key includes full param object; `signal` cancels stale requests |
| Cart, quote, orders | 0 | Must be accurate; invalidated on mutations/events |
| Profile, wallets, favorites | 60 s | Invalidated on mutation |
| Session | until logout/expiry | Revalidated on boot |

- Retries: network errors and 5xx retry up to 2 times with exponential backoff; 4xx never retries; mutations do not auto-retry (order creation retry is a user/idempotent action).
- Key factory `src/hooks/queryKeys.ts`; public catalog keys include the full parameter object and private resource keys use `['user', userId, ...]`.
- When a token exists, the session bootstrap query uses `['auth', 'session']` until the response reveals the user id; visitors without a token skip the request. This is the only private-data key without a user segment. Logout, expiry and user switch clear the complete QueryClient cache before another user's data can render.
- Optimistic updates: favorites toggle and cart quantity (`onMutate` snapshot → `onError` rollback → `onSettled` invalidate).
- Background refetch states are surfaced in the UI without blocking content.

## 9. Real-Time Integration (Socket.IO) [MSW server-originated events implemented; app consumer planned]

- **Transport**: `socket.io-client` connected to the MSW Socket.IO binding at the socket origin. The binding does not expose Socket.IO handshake auth, so the client sends its session token in `mock:subscribe` immediately after `connect`; the mock validates it against the current session and mock clock. Clients without a token may subscribe to public NFT events but receive no private order events. Events for private resources include `userId`. Client creation must happen only after `worker.start()`; `window.__KURIO_MOCKS__.connectSocketClient()` uses a dynamic import for the test/demo harness.
- **Common envelope**: validated by `socketEventSchema` in `src/types/events.ts`: `{ eventId, type, resource: { kind, id }, version, timestamp, userId?, data }`. `version` is a positive integer increasing monotonically **per resource**. Received event payloads are untrusted and parsed before use.
- The receipt's `version` tracks the version of its `order.updated` event. Apply an order event to a cached receipt only when the event version is greater than the cached receipt version.

| Event | `data` | Client behavior |
| --- | --- | --- |
| `nft.updated` | `{ nftId, price, editions: [{ id, available }] }` | Carries the full current price and edition availability state for the NFT. `resource.id` must equal `data.nftId`; patch catalog pages, detail and cart caches, invalidate quote and announce change |
| `order.updated` | `{ orderId, status: 'confirmed' \| 'rejected', transactionHash?, reason? }` | Private event requires `userId`; `resource.id` must equal `data.orderId`; update order/receipt; show confirmation or rejection; terminal states are never overwritten |

- **Dedup & ordering**: keep a bounded set of processed `eventId`s and the last applied `version` per resource; ignore duplicates and events with `version ≤ applied`.
- **Session isolation**: ignore events whose `userId` differs from the current session user; disconnect and unsubscribe on logout/user switch; remove listeners on unmount.
- **Reconciliation**: on reconnect, `refetchQueries({ type: 'active' })` and re-fetch any pending order.
- **Mandatory scenario**: item in cart → price/availability changes while browsing → UI announces it and updates the summary → checkout blocks confirmation with a stale quote until a fresh quote is accepted.
- **Mock/REST consistency**: the scenario middleware persists price/availability changes before returning a fresh-quote conflict and publishes `nft.updated` from that resulting record. Order creation in payment scenarios persists the pending snapshot, settles it, then publishes `nft.updated` for each changed inventory record and a terminal `order.updated`; the returned receipt and event share the same order version. Replayed idempotent requests do not emit duplicate side effects.
- The binding handler is registered at the socket origin (`ws.link(...)` origin), and emits through `toSocketIo(connection).client`. `mock:subscribe` validates the session token because this binding wrapper does not expose Socket.IO handshake auth, rooms or broadcasting. E2E browser tests exercise actual `socket.io-client` connections, REST requests through Axios and private-event filtering. The marketplace UI's reusable Socket.IO consumer, cache reconciliation and accessible announcements belong with their feature flows.

## 10. Mocking Layer [Fixtures, store, REST handlers and deterministic REST/Socket.IO scenarios implemented]

- `src/mocks/browser.ts` starts the browser worker only when `VITE_ENABLE_MOCKS=true`; `.env.development` and `.env.production` enable it for local development and the production/demo build. The committed `public/mockServiceWorker.js` is served by Vite in both. REST handlers are registered in `src/mocks/handlers/` and use shared `API_ENDPOINTS` / `API_ERROR_STATUS`; the socket handler is registered alongside them at `window.location.origin`.
- State lives in `src/mocks/store.ts`, persists through browser local storage, and falls back to module-memory storage in Node. `reset(scenario)` restores fixture records, scenario-specific session/cart, clock, latency controls, favorites, orders and idempotency records. `setMockTime`, `advanceMockTime`, `resetMockTime`, `setLatency`, `setTimeoutResponseDelay`, and `settleOrder` are exposed through `kurioMocks` in tests and `window.__KURIO_MOCKS__`.
- Scenario selection is deterministic: `?mockScenario=<name>` on the browser URL resets and selects that scenario before the worker starts; otherwise `VITE_MOCK_SCENARIO` seeds the store when no persisted mock state exists; subsequent state survives refresh. Tests and the development console can call `window.__KURIO_MOCKS__.reset(scenario)` to reset the full mock state. Invalid URL scenario names fall back to the configured/default scenario.
- Implemented REST scenarios are `success`, `empty`, `design-cart`, `expired-session`, `network-error`, `server-error`, `unauthorized`, `signup-conflict`, `validation-error`, `invalid-coupon`, `expired-coupon`, `price-changed`, `sold-out`, `timeout-after-order`, `payment-confirmed`, `payment-rejected`, and `variable-latency`. The network-error scenario rejects the request; server-error is 503; unauthorized returns 401 for private endpoints; signup and coupon scenarios return their documented 4xx envelopes. Empty returns a valid empty catalog response. Price/sold-out scenarios mutate the first `design-cart` item once before order validation and return the normal fresh-quote conflict. Payment scenarios settle the created order immediately using `settleOrder`; no scheduler is used.
- `variable-latency` gives odd-numbered API requests 120 ms and even-numbered requests 5 ms, plus the configurable delay. Concurrent requests therefore complete out of order reproducibly. `setLatency(ms)` adds 0–15,000 ms to scenario/API response latency. `timeout-after-order` persists the order and idempotency record before delaying its response for 16 seconds by default (longer than the Axios 15-second timeout); replaying the same key and payload recovers the stored order. `setTimeoutResponseDelay(ms)` controls this wait (0–60,000 ms) for fast deterministic unit tests.
- Server-originated events are emitted from persisted REST-driven state changes through `src/mocks/socket.ts`. `price-changed` and `sold-out` publish the complete NFT state before returning the quote conflict; payment confirmation publishes each changed NFT and then the terminal order, while rejection publishes only the terminal order. Event IDs combine resource identity and monotonic resource version; private order events are sent only to subscribers authenticated as the owning user.
- Deterministic fixtures live in `src/mocks/fixtures/`, use `MOCK_NOW = 2026-07-29T12:00:00.000Z`, and contain two users, nine Portuguese category labels, three networks and 40 NFTs with stable IDs, timestamps and scores. They provide five pages at limit 9, price bounds 0.02–12.30 ETH, new/trending subsets, sold editions, four source artworks in 480/960 WebP variants, reviews, coupons, wallets, favorites, empty default carts, the `design-cart`, and an empty order collection. `NftRecord` adds deterministic `createdAt`, `popularity` and `trendScore` to the API contract.
- Fixture credentials are fictitious and have precomputed salted SHA-256 hashes; plaintext is not stored in fixtures. The temporary demo credentials are documented in README for the later authentication flow. Password validation uses `SHA-256(salt + ":" + password)`.
- Fixtures include edition tiers per NFT. The `design-cart` scenario reproduces the reference cart exactly: Emerald Ape #042 (`#0042`, `1/50`) ×2 @ 1.19, Violet Nomad #314 (`#0314`, `ABERTA`) ×6 @ 1.39, Ivory Baron #088 (`#0088`, `1/10`) ×9 @ 1.79, network fee 0.016 and total 26.846 ETH.
- Fixture user wallets include `Principal` (Ethereum, MetaMask) and `Reserva` (`nova.kurio.eth`, Polygon), each with distinct addresses and simulated transaction hashes. Referral codes and ENS names are prefilled. `/api/favorites` backs "Lista de interesse".
- The `THANK YOU` illustration was not included with the supplied artwork; it is omitted by approval and no placeholder is generated.
- Node's MSW `setupServer` matches absolute Axios URLs with handler paths prefixed by `*`; handlers retain the same `/api/...` route semantics in the browser.

## 11. Routing & URL State [Planned]

TanStack Router uses file-based routes under `src/routes/`; the root route supplies the shared header/footer/mobile navigation, a root error boundary and the not-found fallback. `src/routes/$.tsx` is the explicit catch-all 404 route. The router context carries the current session, and `requireAuthenticated` redirects guests to `/login` with the original URL encoded in `redirect`; auth screens and protected route registrations are added with the authentication flows.

`validateSearchWithZod` applies Zod schemas to route search values. The current home/catalog entry validates `q`, `feed` and `page`; malformed values fall back to the corresponding defaults rather than breaking navigation. The shared `nftSearchParamsSchema` also validates catalog category/network arrays, sort, price bounds and pagination. Filter changes reset `page` to 1. Unknown routes render a 404; every planned screen supports direct access and refresh (SPA fallback configured on the host).

## 12. Testing & Audit Strategy [Planned]

- Playwright unit project (Node) uses `setupServer` and the real Axios client for REST handler behavior; Playwright browser projects cover Chromium desktop + mobile. Unit tests reset mock state in `beforeEach`; each browser test receives an isolated browser context. `e2e/mock-helpers.ts` selects/resets scenarios, controls mock clock and latency, and connects a socket client after the worker starts. E2E coverage verifies REST-triggered NFT/order events and prevents private order events reaching an unauthenticated subscriber. HTML reporting, retained failure traces and visual baselines for Home, Detail, Cart and Payment remain in progress.
- Lighthouse on Home and NFT Detail, mobile + desktop, 3 runs, medians reported; record LCP, CLS, TBT; versioned config; reports (HTML/JSON), tool versions and environment committed.

## 13. UX Decisions [Defined by DESIGN_SYSTEM.md]

- Shared async UI uses `Skeleton` with reduced-motion-safe shimmer, `EmptyState` as a polite status, `ErrorState` with an assertive error message and required retry action, and `Toast` with polite success/info or assertive error announcements.
- **Navigation:** Início is active on `/`, `/perfil`, `/carteiras` and `/favoritos`; Mercado links to the catalog anchor and is active on NFT detail, cart, checkout and receipt. The authenticated profile menu maps Dados do perfil → `/perfil`, Carteiras → `/carteiras`, Lista de interesse → `/favoritos` (inside the profile layout), and Sair → logout.
- **Criadores, Aprenda, footer link columns, "Diário da Cunhagem" cards, "Explorar →" banners, "Esqueceu a senha?", "Trocar carteira" extras and "Atividade"** link to a shared "indisponível nesta demonstração" page or are `aria-disabled` with an explanatory tooltip. They never imply success.
- **Newsletter "Enviar"** and **Google/Facebook** buttons remain visible and show an inline "indisponível nesta demonstração" message; no fake success.
- **Share icons** open the network's share URL in a new tab with `rel="noopener noreferrer"`.
- **Editorial teasers** (Diário da Cunhagem and promo copy) are static UI copy in `src/content/`; NFTs, counts, ratings, reviews and prices are business data and come from the API.
- **Reviews tab** is a read-only list from fixtures; there is no review creation.
- **Cart badge** counts total units and caps at `99+`.
- The authenticated header replaces "Entrar" with an account button (name/avatar → `/perfil`) in the same style.
- **Favorites** use `/favoritos`, named "Lista de interesse", reuse the card grid, and live inside the profile layout.
- **Order confirmation** is the reloadable `/pedidos/:orderId` route showing a receipt panel on a plain page; the close action returns to the catalog. Pending uses a spinner and "Aguardando confirmação"; rejected offers a retry to checkout with cart items preserved. Explorer links use the matching network and simulated hash in a new tab.
- **Checkout** fields are prefilled from the selected registered wallet and profile. Mobile puts them in a collapsible "Dados do colecionador" section, closed when valid and opened on errors. "Trocar carteira" opens `/carteiras`; a wallet card's ⋮ menu "Editar" opens `/carteiras`.
- **Wallets**: primary form is always editable; "Adicionar" reveals/focuses the relevant empty form; the secondary section has an empty state until added; "Igual à carteira principal" copies primary values into the secondary form.
- **Mobile center button** focuses search, navigating to `/` first if needed. Hero copy changes by breakpoint: desktop "SEJA DONO DO FUTURO DA ARTE DIGITAL"; mobile "SEJA DONO DA CULTURA DIGITAL" with a shorter paragraph (only the visible variant is exposed to screen readers).
- Dialogs for authentication, review and receipt confirmation have a scrim, focus trap, focus return and Escape-to-close. Mobile uses bottom navigation (home, favorites, cart, profile) and its center action; desktop uses the header.
- Carousels use scroll-snap lists and real dot buttons; they do not autoplay.
- Below 1024px, catalog filters use a drawer; tablet (768–1023px) uses two product columns.

## 14. Figma Deviations & Asset Substitutions [To be recorded during implementation]

| Figma issue / unavailable frame | Implementation decision |
| --- | --- |
| "Ordenar por" chevron overlaps selected text; no space after "por:" | Add padding/spacing. |
| Row 3 / middle card in Início has no title or price | Render complete content from fixtures. |
| Facet counts disagree (categories sum 239, networks 283) | Counts come from the API; keep fixtures consistent. |
| Cart badge "6" does not match the cart | Count total units, capped at `99+` (§13). |
| Desktop wallet list: first option combines "METAMASK · WALLETCONNECT · COINBASE" | Treat it as WalletConnect (mobile shows W / M / Coinbase). |
| Desktop cart token ids (#0009, #0552) differ from payment/receipt (#0314, #0088) | Use #0042 / #0314 / #0088 everywhere. |
| Desktop cart omits edition tier; mobile shows `Edição: 1/50` | Show tier on every cart line. |
| Reference quantities (×6, ×9) exceed mobile `1/1` tier | Use Violet Nomad `ABERTA`, Ivory Baron `1/10`, Emerald Ape `1/50`. |
| Mobile cart line prices and subtotal disagree | Desktop `design-cart` is authoritative; use API quote. |
| Mobile detail repeats the `1/10` chip | Use `1/1`, `1/10`, `1/50`, `ABERTA`. |
| Hero copy differs by breakpoint | Use the per-breakpoint copy (§13). |
| Mobile payment omits collector form | Add collapsible collector data (§13). |
| Unlabeled field beside wallet address | Add visible label "ENS ou carteira secundária (opcional)". |
| Referral code and ENS name are required | Follow the layout, prefill from fixture wallet and document codes in README. |
| Wallet address and transaction id share a string in mobile payment/receipt | Use distinct fixture values. |
| Date format `29 Jul, 2026` mixes styles | Keep designed format with capitalized pt-BR month abbreviation. |
| Checkout has no review step | Final "Confirmar compra" opens review dialog; changes require reconfirmation. |
| Login/receipt modals have no scrim; receipt frame has no page chrome | Add scrim and focus trap; render receipt as a route page. |
| "Entrar" shown on logged-in pages; "Mercado" vs "Início" active state differs | Use account button when authenticated and active states per §13. |
| Mobile frame is 414px; required viewport is 390px | Use fluid layout and verify both. |
| Price-filter label uses comma decimals | Use dot decimal separator everywhere. |
| Mobile bottom bar shows stray "'2" under the center button | Ignore as a frame artifact. |
| Resting input border contrast is 1.34:1 | Preserve for fidelity; retain labels/placeholders and strong focus state (§15). |
| Roboto Mono is not provided by a font CDN | Self-host the font; no external font CDN. |
| Login and receipt dialogs omit a scrim | Add dark scrim, focus trap, focus return and Escape handling. |
| Checkout frame has no review dialog | Add a review dialog before order creation. |
| Favicon artwork is not provided | Use the local K monogram favicon as a substitute; original brand icon export was unavailable. |

## 15. Known Limitations [To be filled during implementation]

Known so far:
- `@mswjs/socket.io-binding@0.2.0` targets MSW 2.x, so the project stays on MSW 2.x. Mocked responses use the wrapper's `client` endpoint; its `server` endpoint represents the upstream connection. The wrapper does not implement Socket.IO rooms, custom namespaces or broadcasting; the Epic 0 browser smoke test uses WebSocket transport and does not certify HTTP long-polling or reconnect behavior.
- The binding wrapper does not expose Socket.IO handshake authentication, so the mock uses the first `mock:subscribe` event to validate a session token. The token is mock-grade and the transport must not be treated as a production Socket.IO server; private events re-check the active token, user and expiry before emission.
- The MSW Socket.IO handler must be registered at the socket origin (the `ws.link(...)` origin). Import `socket.io-client` dynamically only after `worker.start()` so its transport initializes after MSW's WebSocket interceptor is active.
- Token in `sessionStorage` is mock-grade and not production-secure.
- The reference resting input border has 1.34:1 contrast against the page background. Keep it for visual fidelity, while retaining visible labels/placeholders and a strong focus state.
- Frames are missing for Cadastro tab/screen, Avaliações tab content, mobile Perfil / Carteiras / Confirmação / Cadastro, tablet behavior, error and disabled states, and authenticated header. Compose from documented patterns and verify responsive behavior.
- Separate source exports for the KURIO wordmark, icon and NFT artwork were not provided; the local wordmark is an SVG reconstruction, the favicon is a matching geometric K monogram, and the three NFT PNGs are crops from the desktop home reference. Replace these derived assets if the original exports become available.
- Pending orders do not reserve inventory. At confirmation, `settleOrder` throws and leaves the order, cart and inventory unchanged if the required edition availability has fallen below the purchased quantity; this avoids confirming an oversold order. Reservation behavior is not part of the challenge contract.
- An already-applied coupon that expires before quote/order validation is removed from the cart and rejected with `COUPON_EXPIRED`; the user must apply a current coupon again.
