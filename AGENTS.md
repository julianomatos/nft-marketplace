# AGENTS.md — Development Guidelines & Rules for NFT Marketplace

Strict rules for AI and human collaborators on the **NFT Marketplace** frontend challenge. Read this file fully before touching code. When a rule here conflicts with a convenience, the rule wins. When a rule here conflicts with the challenge statement, the challenge statement wins — flag it instead of silently deviating.

Companion files: `DESIGN_SYSTEM.md` and `design/reference/` (visual source of truth), `ARCHITECTURE.md` (design & contracts), `tasks.md` (backlog). Update them as decisions change; never let them drift from the code.

## 0. Priorities & Disqualifiers

Scoring weights: visual fidelity & responsiveness 20, flows & UX 20, integration & state 15, real time 10, mocking 10, tests 10, accessibility 5, performance 5, architecture & docs 5.

**Any of these disqualifies the delivery. Never ship code that causes them:**
1. Required stack present but not effectively used.
2. Main flows that are only visual (no real API round-trip through MSW).
3. A purchase confirmed without a response from the simulated backend.
4. Private data exposed across users (cache, socket events, localStorage).
5. Real-time events simulated directly in the UI (setters, callbacks, direct cache writes that bypass `socket.io-client`).
6. Missing runnable Playwright E2E tests.

## 1. Core Stack & Pinned Compatibility Notes

- **Language**: TypeScript 6.0.x (`~6.0.2`). **Do not upgrade to TypeScript 7** — `typescript-eslint` currently supports `<6.1.0`.
- **Font**: Roboto Mono, self-hosted (e.g. `@fontsource-variable/roboto-mono` or `@fontsource/roboto-mono`); no external font CDN.
- **Theme**: dark only, with tokens in `src/index.css` defined by `DESIGN_SYSTEM.md`. Replace shadcn starter defaults (Geist, neutral palette, `radix-nova` radius).
- **Build**: Vite 8 + `@vitejs/plugin-react` 6 + `@tailwindcss/vite` (Tailwind CSS v4, CSS-first config, no `tailwind.config.js`).
- **UI**: React 19, functional components and hooks only. shadcn/ui components (Tailwind v4 + React 19 variant) customized to the Figma design tokens.
- **Routing**: TanStack Router with the Vite plugin (`@tanstack/router-plugin`). **File-based routing** under `src/routes/` is the single chosen approach. Search params are validated with Zod.
- **Remote state**: TanStack Query v5.
- **HTTP**: Axios, the only way to reach REST endpoints.
- **Real time**: `socket.io-client`, connected to the MSW Socket.IO binding.
- **Mocking**: MSW **2.x** (`^2.15.0`) with `@mswjs/socket.io-binding@0.2.x`. The binding declares a peer dependency on `msw@^2.10.2`; **do not install MSW 3** unless the binding is proven compatible and the decision is recorded in `ARCHITECTURE.md`.
- **Forms**: React Hook Form + Zod via `@hookform/resolvers`.
- **Money**: `decimal.js` for every ETH computation (see §5).
- **Tests**: Playwright (E2E, a11y with `@axe-core/playwright`, visual regression). **Audit**: Lighthouse CLI.
- **Runtime**: Node `>=22.19` (required by Lighthouse; also satisfies Vite, ESLint 10, Playwright). Declared in `package.json#engines` and `.nvmrc`.
- Do not add dependencies without a one-line justification in the PR/commit message. Prefer what is already installed.

## 2. Commands (must always work from a clean checkout)

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with mocks enabled (`VITE_ENABLE_MOCKS=true`) |
| `npm run build` | Typecheck + production build (mocks still available in demo build) |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright (chromium, desktop + mobile projects) |
| `npm run test:e2e:update` | Update visual baselines (only deliberately) |
| `npm run lighthouse` | Lighthouse audit: 3 runs, median, mobile + desktop, HTML + JSON reports |

Environment variables: `VITE_ENABLE_MOCKS`, `VITE_MOCK_SCENARIO`, `VITE_API_BASE_URL`. Document all of them in `README.md`.

## 3. AI Workflow Rules

1. Work on **one task of `tasks.md` at a time**, in epic order unless told otherwise. Do not start the next epic with the previous one half done.
2. Before coding: restate the task, list the files you will touch, and check `ARCHITECTURE.md` for the relevant contract.
3. **Write the E2E test for a flow in the same epic that builds it.** Do not defer all tests to the end.
4. Before declaring a task done, run `npm run typecheck`, `npm run lint` and the relevant Playwright spec. Report the results honestly; never claim a check passed without running it.
5. Check the box in `tasks.md` only when the Definition of Done (§12) is met.
6. If requirements are ambiguous, ask or record the assumption in `ARCHITECTURE.md` (Decisions / Limitations). Do not invent business behavior silently.
7. Keep commits small and focused (Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`).
8. Never weaken a test, lint rule or type to make something pass. Fix the cause.
9. Do not simplify anything solely to improve Lighthouse scores (the audit must run with real images, fonts and features).

## 4. Coding Standards & TypeScript Rules

1. **Strict types**: `strict: true`. No `any` without an adjacent comment justifying it. Every API request/response, query param, event payload and component prop has a named type. Shared contracts live in `src/types/` (`contracts.ts` for REST, `events.ts` for Socket.IO). Runtime-validate untrusted boundaries (search params, form input) with Zod; derive types from schemas where it avoids duplication.
2. **Component architecture**: small, modular components; presentational vs container split when it helps. Business logic lives in hooks (`useCart`, `useFavorites`, `useQuote`, `useCheckout`, `useSocketEvents`, ...), never inline in JSX.
3. **Async UI states**: every async surface handles loading, empty, error, success and background-refetch states. No unhandled promise rejections, no silent failures. Every error state offers a retry.
4. **Loading**: skeletons **with shimmer** for catalog, detail and cart summary. Skeletons reserve final dimensions (no layout shift) and respect `prefers-reduced-motion`.
5. **Errors**: use the error envelope defined in `ARCHITECTURE.md`. Map API error codes to user-facing messages in one place (`src/utils/errors.ts`). Add a root error boundary and a catch-all 404 route.
6. **Out-of-scope actions** (editorial pages, support, activity, offers, downloads, social links): links must behave coherently (external links open safely with `rel="noopener noreferrer"`); buttons for out-of-scope features must be visibly unavailable or show a non-success notice. They must never look like they worked. Exact behavior is defined in `DESIGN_SYSTEM.md` §9.

## 5. Money, Quantities & Data Formatting

- ETH values travel as **decimal strings** (`"0.125"`). Never convert to `number`/`parseFloat`. All arithmetic and comparison goes through `decimal.js` helpers in `src/utils/eth.ts` (add, mul, sum, compare, format).
- Prices render with a dot as decimal separator everywhere and exactly as received from the API.
- Quantities are integers (validate with Zod `.int().min(1)`).
- **The API quote is the single source of truth for totals.** The UI may format values but must not compute its own authoritative subtotal/discount/fee/total.
- Never store passwords in clear text, even in mocks: hash them (e.g. salted SHA-256 via `crypto.subtle`) inside the MSW layer. Use fictitious credentials only.

## 6. Routing

- All routes, private-route protection (`beforeLoad` guards) and search params go through TanStack Router.
- Routes: `/` (Início), `/nft/:id`, `/carrinho`, `/pagamento`, `/pedidos/:orderId` (reloadable receipt), `/login`, `/signup`, `/perfil`, `/carteiras`, `/favoritos` (Lista de interesse, inside the profile layout), and the "indisponível nesta demonstração" route. `/mercado` is not a route; Mercado links to the catalog anchor. Login and signup are route-driven: desktop modal over the previous route, mobile full-screen; direct access works.
- Active navigation: Início on `/`, `/perfil`, `/carteiras`, `/favoritos`; Mercado on NFT detail, cart, checkout and receipt.
- Catalog search, filters, sort and pagination live **in the URL** (validated search params). Changing any filter resets `page` to 1. State must survive refresh and back/forward navigation.
- Private routes: Cart (authenticated cart), Checkout, Order confirmation, Profile, Wallets, Favorites. Unauthenticated access redirects to Login with a `redirect` param and returns to the previous flow after login.
- Every planned screen must work on direct access and on refresh (including the deployed environment — SPA fallback required).

## 7. TanStack Query & State Rules

1. **Query key factory** in `src/hooks/queryKeys.ts`. Every private query key includes the current user id (`['user', userId, ...]`); public catalog keys include the full parameter object. Never share a key between users or between different params.
2. Pass the `signal` from the query context to Axios so stale requests are **cancelled**; discard out-of-order responses.
3. Mutations must invalidate or update the relevant keys. Optimistic updates (`onMutate` / `onError` rollback / `onSettled` invalidate) are required for **favorites** and **cart quantity**.
4. Retry policy: retry network errors and 5xx (max 2, exponential backoff); never retry 4xx. Stale times per `ARCHITECTURE.md` (§ Caching). Do not change them ad hoc.
5. **Logout and user switch**: `queryClient.clear()` (or remove all `['user', ...]` queries), disconnect the socket and remove all listeners, clear persisted private data (session, cart snapshot, checkout draft). Verify no data from user A is ever rendered for user B.
6. Guest cart items are preserved on authentication: merge through the API (`POST /api/cart/merge`), then clear the guest copy.
7. Do not duplicate server state in `useState`/global stores. Local state is only for UI concerns and drafts.

## 8. Mocking Rules (MSW)

1. **No fake data, fake business rules or alternate code paths in components, hooks or the Axios client.** All of that lives in `src/mocks/`.
2. Mocks run at the network layer (service worker in browser, `setupServer`/shared handlers where useful), are enabled **by configuration** (`VITE_ENABLE_MOCKS`) and **are available in the production demo build** (`public/mockServiceWorker.js` committed and served).
3. Handlers keep consistent state across catalog, favorites, cart, profile, wallets and orders. State may be persisted locally (inside the mock layer only) to survive refresh. A **reset** must restore a known scenario completely.
4. Scenarios are deterministic, configurable and reproducible (env var, URL param and/or a small dev-only switcher), covering at least: success, empty result, variable latency and out-of-order responses, connection failure, 4xx/5xx, expired session, unauthorized access, signup conflict / validation error, invalid or expired coupon, price change / sold-out edition during purchase, timeout **after** order creation (recovered by idempotency), payment confirmed, payment rejected. Fixtures: at least two users and enough NFTs to exercise filters and pagination.
5. Wallet connect / refuse / disconnect simulation is a mock endpoint concern, not a client-side flag.
6. Any change in mock state that has a socket counterpart must be reflected in **both** the REST response and the emitted event.

## 9. Real-Time Rules (Socket.IO)

1. Use standard `socket.io-client` against the MSW Socket.IO binding. Never call setters, callbacks or `queryClient` directly to "fake" an event.
2. Event payloads carry a stable `eventId`, the affected resource (`nftId` / `orderId`), a per-resource monotonically increasing `version`, a `timestamp` and, for private data, the owning `userId` (see `ARCHITECTURE.md`).
3. The client tolerates **duplicate and old events**: ignore an event if its `eventId` was already processed or its `version` is not greater than the one already applied. Never regress newer state; never re-run side effects.
4. Orders: `confirmed` and `rejected` are **terminal**; ignore later events for a terminal order.
5. Ignore events that do not belong to the current session user. On logout/user switch, disconnect and clean up.
6. Subscribe in a single place (`useSocketEvents` / a socket provider) with `useEffect` cleanup; no listener may leak on unmount.
7. On `connect` after a disconnect, reconcile all **active** queries with REST (`refetchQueries({ type: 'active' })`) and re-check any pending order via `GET /api/orders/:id`.
8. Real-time changes must be announced accessibly (`aria-live` region) in addition to visual updates.

## 10. Accessibility & UI

- Implement `DESIGN_SYSTEM.md`. Compare each screen against `design/reference/` at 1440 and 390/414. Never use arbitrary hex classes (`bg-[#...]`); use semantic tokens only. Record every deviation in `ARCHITECTURE.md` §14.
- Verify at **390, 768 and 1440 px**: no unintended horizontal overflow, no content loss at 200% zoom.
- Keyboard: full operation, visible focus, focus trap and focus return for dialogs/drawers, Escape closes.
- Dialogs (auth, review and receipt confirmations) require a scrim, focus trap, focus return and Escape-to-close. Mobile uses bottom navigation (home, favorites, cart, profile) with a center button; desktop uses the header.
- Semantics: landmarks, headings order, labels, error messages associated via `aria-describedby`, `aria-invalid`. Images have meaningful `alt` (decorative ones `alt=""`). State is never conveyed by color alone. Contrast ≥ WCAG AA.
- Mutations and real-time changes give accessible feedback (toast/live region).
- Fonts and images required to run locally must be in the repo (no private CDNs). Replace assets only with a note in `ARCHITECTURE.md`.
- SEO/performance basics: `<title>`, meta description, `lang`, image width/height, lazy-load below the fold, preload critical font/LCP image, route-level code splitting.

## 11. Testing Rules (Playwright)

- Tests run against the MSW mocks with a **fresh, isolated state per test** (reset scenario in `beforeEach`).
- Control clock, latency and event triggering in time-sensitive scenarios. Never use arbitrary `waitForTimeout` for synchronization.
- Assert on the UI and on operation outcomes. Real-time tests must go through `socket.io-client`; REST tests through MSW handlers.
- Projects: Chromium at desktop and mobile viewports. HTML report on; traces retained on failure. Visual regression for Home, Detail, Cart and Payment with versioned baselines and stable data.
- Prefer role/label locators (`getByRole`, `getByLabel`) — they double as accessibility checks.
- Required coverage is the 12-item list in the challenge statement; see `tasks.md` Epic 10 mapping.

## 12. Definition of Done (per task)

- [ ] Behavior matches the challenge statement and `ARCHITECTURE.md` contracts
- [ ] Loading / empty / error / success states implemented
- [ ] Works at 390 / 768 / 1440 px; keyboard accessible
- [ ] `npm run typecheck` and `npm run lint` pass with no new warnings
- [ ] Playwright test added/updated and passing
- [ ] No fake data or business logic outside `src/mocks/`
- [ ] Docs updated if a contract, decision or limitation changed

## 13. File Structure Convention

```
src/
  routes/        TanStack Router file-based routes (+ generated routeTree)
  components/    shadcn/ui adaptations (ui/) and shared components
  features/      optional feature folders (catalog, cart, checkout, ...) if co-location helps
  hooks/         business and query hooks, queryKeys
  services/      Axios client, API wrappers, socket client
  mocks/         MSW handlers, fixtures, scenarios, socket server mock, persistence/reset
  types/         contracts.ts, events.ts, shared types
  utils/         eth.ts, formatters, errors, validation helpers
  content/       static UI copy only; never business data
e2e/             Playwright specs, fixtures, visual baselines
lighthouse/      Lighthouse config, scripts, reports
design/
  reference/     Figma exports
```
