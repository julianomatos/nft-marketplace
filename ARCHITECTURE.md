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

## 2. Technology Decisions & Compatibility [Planned]

| Area | Decision | Note |
| --- | --- | --- |
| Build | Vite 8, `@vitejs/plugin-react` 6, Node ≥ 22.19 | Node floor driven by Lighthouse |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) + shadcn/ui | CSS-first tokens from Figma |
| Routing | TanStack Router, file-based | Zod-validated search params |
| Mocking | MSW **2.x** + `@mswjs/socket.io-binding@0.2.x` | Binding peer-depends on `msw@^2.10.2`; MSW 3 not used (see Limitations) |
| TypeScript | 6.0.x | Pinned below 6.1 for `typescript-eslint` support |
| Money | `decimal.js` | ETH as decimal strings end to end |

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
| NFTs | `GET /api/nfts` (`search`, `category` (multi), `sort`, `page`, `limit`, other filters), `GET /api/nfts/:id` |
| Favorites | `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites/:nftId` |
| Cart | `GET /api/cart`, `POST /api/cart/items`, `PUT /api/cart/items/:id`, `DELETE /api/cart/items/:id`, `POST /api/cart/merge` (guest → user), `PUT /api/cart/coupon`, `DELETE /api/cart/coupon` |
| Quote | `POST /api/cart/quote` |
| Orders | `POST /api/orders` (header `X-Idempotency-Key`), `GET /api/orders/:id` |
| Profile | `GET /api/profile`, `PUT /api/profile` (data/avatar), `PUT /api/profile/password` |
| Wallets | `GET /api/wallets`, `POST /api/wallets`, `PUT /api/wallets/:id`, `POST /api/wallets/:id/connect`, `POST /api/wallets/:id/disconnect` (simulated connect/refuse/disconnect) |

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
- Pending orders are recovered after refresh or reconnection (order id kept in session storage + `GET /api/orders/:id`).

## 6. Session Policy [Planned]

- Login returns a token with `expiresAt`. The token lives in `sessionStorage` (mock-grade; documented limitation) and is attached by an Axios request interceptor. Passwords are hashed in the mock layer; only fictitious credentials are used.
- On boot, `GET /api/auth/session` restores the session after refresh.
- `401 SESSION_EXPIRED` during navigation or checkout: save the return context (route + checkout draft + pending idempotency key) in session storage, redirect to Login with `redirect`, and resume after re-authentication.
- **Logout / user switch**: clear the Query cache, persisted private data (session, cart snapshot, checkout draft, order ids), disconnect the socket and remove every listener. Private query keys include the user id.
- Private routes (cart for authenticated users, checkout, orders, profile, wallets, favorites) are guarded in the router (`beforeLoad`).

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
- Fixtures: ≥ 2 users and enough NFTs/categories for filter combinations and pagination.

## 11. Routing & URL State [Planned]

Catalog search, filters, sort and pagination are validated search params in the URL; any filter change resets `page`. Unknown routes render a 404; every planned screen supports direct access and refresh (SPA fallback configured on the host).

## 12. Testing & Audit Strategy [Planned]

- Playwright (Chromium, desktop + mobile), isolated state per test, controlled clock/latency/event triggers, HTML report, traces on failure, visual baselines for Home, Detail, Cart and Payment.
- Lighthouse on Home and NFT Detail, mobile + desktop, 3 runs, medians reported; record LCP, CLS, TBT; versioned config; reports (HTML/JSON), tool versions and environment committed.

## 13. UX Decisions [To be filled during implementation]

_Record decisions for states not covered by Figma, out-of-scope action behavior, and live-region announcements._

## 14. Figma Deviations & Asset Substitutions [To be filled during implementation]

_List every deviation and asset replacement with the reason._

## 15. Known Limitations [To be filled during implementation]

Known so far:
- `@mswjs/socket.io-binding@0.2.0` targets MSW 2.x, so the project stays on MSW 2.x. Document any protocol/transport limitations observed in the mock Socket.IO environment here (e.g. rooms/namespaces behavior, reconnect simulation).
- Token in `sessionStorage` is mock-grade and not production-secure.
