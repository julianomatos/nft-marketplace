# tasks.md — Granular Backlog for NFT Marketplace

Work **one task at a time**, in epic order. Every epic ends with its own Playwright test(s) and a Definition of Done check (see `AGENTS.md` §12). Check a box only when the task is truly done and `npm run typecheck`, `npm run lint` and the related test pass.

Scoring reminder: fidelity & responsiveness (20) and flows & UX (20) weigh most; the disqualifiers in `AGENTS.md` §0 must never be at risk.

---

## Epic 0: Dependency & Compatibility Audit (do first)

Context: initial setup is done and dependencies are installed with npm. Verify everything is consistent **before** building features.

- [x] Confirm Node version: `node -v` must be **≥ 22.19** (Lighthouse requirement; Vite/ESLint/Playwright also satisfied). Add `"engines": { "node": ">=22.19" }` to `package.json` and an `.nvmrc`. Align `@types/node` to the Node major in use (currently `^24`, runtime target 22).
- [x] Run `npm ls --depth=0` and `npm install` from a clean state (`rm -rf node_modules && npm ci`); confirm there are **no** `ERESOLVE`/peer warnings and that the lockfile is committed. Do not use `--legacy-peer-deps` or `overrides` to hide a conflict.
- [x] **Resolve the MSW conflict**: `@mswjs/socket.io-binding@0.2.0` (latest, published June 2025) has peer `msw@^2.10.2`, but `msw@^3.0.3` is installed. Downgrade: `npm install -D msw@^2.15.0`, then regenerate the worker with `npx msw init public --save` and keep the `"msw": { "workerDirectory": ["public"] }` entry. Record the decision in `ARCHITECTURE.md` §2/§15.
- [x] Smoke-test MSW 2.x + binding + `socket.io-client`: a throwaway script/page where a mocked Socket.IO server emits one event that `socket.io-client` receives in the browser. Remove or promote it to a real test afterwards.
- [x] Keep `typescript@~6.0.2` (`typescript-eslint` supports `<6.1.0`); do **not** bump to TypeScript 7. Verify `npm run lint` works with ESLint 10 + `typescript-eslint` + `eslint-plugin-react-hooks` 7 + `eslint-plugin-react-refresh`.
- [x] Verify Vite 8 ↔ `@vitejs/plugin-react` 6 ↔ `@tailwindcss/vite` 4 ↔ `@tanstack/router-plugin` (peer `@tanstack/react-router ^1.170.44`) work together: `npm run dev` and `npm run build` pass; router plugin generates `routeTree.gen.ts`.
- [x] Install missing dependencies: `zod`, `react-hook-form`, `@hookform/resolvers`, `decimal.js`, `tw-animate-css` (shadcn animations), `@axe-core/playwright`, `lighthouse` (+ `chrome-launcher` if needed). Check each version's peer dependencies after installing (`@hookform/resolvers` supports `zod ^3.25 || ^4`).
- [x] Add `@/*` path alias in `tsconfig` **and** `vite.config.ts`; run `npx shadcn@latest init` (Tailwind v4 + React 19) and generate `components.json`. Add base components on demand (Button, Input, Dialog, Drawer, Card, Skeleton, Select, Checkbox, Sonner/Toast, etc.).
- [x] Add npm scripts: `typecheck`, `test:e2e`, `test:e2e:update`, `lighthouse` (see `AGENTS.md` §2) and `.env.development` / `.env.example` with `VITE_ENABLE_MOCKS`, `VITE_MOCK_SCENARIO`, `VITE_API_BASE_URL`.
- [x] Run `npm audit` and `npm outdated`; note any high-severity findings or deliberate pins in `ARCHITECTURE.md` §2.
- [x] Verify `npm run build && npm run preview` succeeds and the app boots; install Playwright browsers (`npx playwright install chromium`) and run an empty smoke spec.
- [x] Commit a clean baseline ("chore: dependency audit and compatibility fixes").

**Acceptance**: clean `npm ci`, `dev`, `build`, `lint`, `typecheck` and one smoke E2E all pass; zero peer-dependency errors; MSW 2.x + binding verified.

---

## Epic 1: Project Infrastructure

- [x] Add `design/reference/` exports and export logo/NFT artwork to `src/assets/`.
- [x] Self-host Roboto Mono; replace shadcn starter tokens/font with the KURIO tokens from `DESIGN_SYSTEM.md` (dark only, `@theme` mapping); remove unused starter styles.
- [x] Build the shell: Header (guest/authenticated, active states, cart badge), Footer (feature band, brand strip, link columns), Breadcrumb, mobile bottom navigation, "indisponível" page.
- [x] Build shared base primitives and responsive shell: Button variants, Input/Select/Checkbox/Radio (with required asterisk), shared Quantity stepper, Badge, Tabs, Pagination, Range slider, Dialog/Drawer, Skeleton shimmer, Toast, and empty/error states. Screen-specific variants (edition chips, detail/cart steppers, Rating, section-rule tabs, avatar block, profile sidebar item, summary panel and carousel dots) belong to their feature epics below; do not build them ahead of those flows.
- [x] Configure Tailwind v4 theme tokens (colors, typography, spacing, radii) from Figma in CSS; self-host required fonts; add base styles and `prefers-reduced-motion` handling.
- [x] Configure TanStack Router (file-based): root layout, header/footer shell, 404 route, root error boundary, private-route guard helper, Zod-validated search params utility.
- [x] Configure TanStack Query client: stale times, retry policy (no 4xx retries, max 2 for network/5xx with backoff), query key factory (`src/hooks/queryKeys.ts`), devtools in dev only.
- [x] Configure Axios client: base URL, timeout, auth interceptor, error normalization to the API error envelope (`src/utils/errors.ts`), `AbortSignal` support.
- [x] Add `src/utils/eth.ts` (`decimal.js` helpers: add, mul, div, sum, compare, format) with unit tests.
- [x] Set up shared UI primitives: Skeleton with shimmer (reduced-motion safe), empty/error state components, toast + `aria-live` region.
- [x] Add `index.html` essentials: `lang`, `<title>`, meta description, favicon, viewport.

**Acceptance**: shell matches `design/reference/` at 1440 and 390; no arbitrary hex values in the code. App shell renders at 390/768/1440; 404 route works; ETH helpers tested.

---

## Epic 2: Contracts & Mocking Infrastructure (MSW + Socket.IO)

- [x] Define typed contracts in `src/types/contracts.ts` and `src/types/events.ts` (error envelope, quote, order states, event envelope with `eventId`, `version`, `userId`); validate boundary values and event envelopes in contract tests.
- [x] Create fixtures: ≥ 2 users (fictitious credentials), diverse NFTs/categories/editions (enough for filters + pagination), coupons (valid, invalid, expired), wallets, favorites, carts, orders.
- [x] Add fixtures and facets for the 9 categories, Ethereum/Polygon/Solana networks, "Kurio Apes", rarity, old prices and reviews; add featured, related and read-only reviews endpoints; add the `design-cart` scenario described in `ARCHITECTURE.md` §10.
- [x] Build the mock state store with local persistence and a **reset** to a known scenario; hash passwords in the mock layer.
- [x] Implement REST handlers: auth/session (incl. expiry), NFTs (search, combinable filters, sort, pagination, detail, not-found, unavailable edition), favorites, cart (+ merge, coupon), quote, orders (idempotency: same key/payload → same order; different payload → 409), profile (+ avatar, password), wallets (+ connect/refuse/disconnect).
- [x] Implement deterministic REST scenario switches: success, empty, variable latency + out-of-order, connection failure, 4xx/5xx, expired session, unauthorized, signup conflict / validation error, invalid/expired coupon, price change / sold-out during purchase, timeout after order creation, payment confirmed, payment rejected.
- [x] Choose and document scenario selection (`VITE_MOCK_SCENARIO`, `?mockScenario=...`, `window.__KURIO_MOCKS__.reset(scenario)`) and reset the complete mock state.
- [x] Wire `@mswjs/socket.io-binding` to emit `nft.updated` and `order.updated` deterministically from the same mock state changes as REST.
- [x] Bootstrap MSW by config (`VITE_ENABLE_MOCKS`) for dev **and** production demo build; commit `public/mockServiceWorker.js`.
- [x] Add Playwright browser helpers to select/reset scenarios and control the mock clock and request latency; add browser coverage for URL selection.
- [x] Add Playwright helper and browser coverage for triggering Socket.IO events after the server-originated event flow is implemented.

**Acceptance**: every scenario reachable and reproducible; reset restores the scenario fully; a socket event emitted from the mock reaches `socket.io-client`.

---

## Epic 3: Authentication & Session

- [x] Build Login/Signup at `/login` and `/signup` (desktop modal over previous route, mobile full-screen) with React Hook Form + Zod and API error mapping (`fieldErrors`, `EMAIL_TAKEN`); "Esqueceu a senha?" and social buttons follow `DESIGN_SYSTEM.md` §9. The Cadastro frame is pending.
- [x] Session recovery after refresh via `GET /api/auth/session`; token handling in Axios interceptor.
- [x] Route guards for private areas; redirect to Login with `redirect` param and return to the previous flow.
- [x] Handle session expiry during navigation and checkout, preserving return context for resumption.
- [x] Logout and user switch: clear Query cache, persisted private data, checkout draft and idempotency/order context; disconnect registered sockets and remove their listeners.
- [x] **Tests**: signup (success + conflict), login, expiry, logout, user switch with no data leakage.

**Acceptance**: no private data from user A visible to user B after switch.

---

## Epic 4: Home, Catalog & Discovery

- [x] Home with featured items and catalog grid (Figma fidelity, desktop + mobile).
- [x] Add `feed` tabs, price-range slider with "Aplicar" (decimal strings in URL), network facet, category facet with counts, card hover/focus actions (cart, favorite, view), "NFT em destaque", promo banners and "Diário da Cunhagem" teasers (static copy); mobile search and filter drawer.
- [x] Implement home-specific mobile composition: search pill + gradient filter button, breakpoint-specific hero copy and gradient/art layout, staggered two-column grid, hero/carousel dots (active filled, inactive outlined, ≥24px hit area), and center bottom-nav action that focuses search.
- [x] Search, combinable filters, sort and pagination synced to URL search params; changing a filter resets `page`; survives refresh and back/forward.
- [x] Query keys reflect exact params; cancel stale requests via `signal`; handle out-of-order responses.
- [x] Skeleton (shimmer) loading, empty state, error state with retry, background-refetch indicator.
- [x] Responsive filters/navigation (drawer on mobile with focus management).
- [x] **Tests**: search + combined filters + sort + pagination + history restoration; slow-network skeleton + retry recovery.

**Acceptance**: URL is the single source of truth; no layout shift when skeletons resolve.

---

## Epic 5: NFT Detail & Favorites

- [x] Detail view: direct access, gallery, metadata/attributes, edition selection, quantity selector with limits, buy/add-to-cart triggers.
- [x] Add thumbnail gallery with zoom, edition-tier chips as an accessible radio group (`1/1`, `1/10`, `1/50`, `ABERTA`), and large detail quantity stepper constrained by selected-tier availability.
- [x] Add Rating (desktop stars + count, mobile rating chip), tabs with a full-width rule and active underline, share row, read-only Avaliações tab, and "Mais desta coleção" carousel with accessible dots.
- [x] Add mobile detail composition: sticky action bar with quantity, price, buy and cart controls; circular back/favorite/cart icon buttons.
- [x] Handle non-existent NFT (404 state) and unavailable/sold-out editions.
- [x] Favorites: authenticated persistence, optimistic toggle with rollback on failure, guest prompt to login.
- [x] **Tests**: direct detail access + not found; favorites mutation failure and recovery.

---

## Epic 6: Cart
- [x] Cart view: quantity editing (optimistic, availability-aware), item removal, API-driven summary (subtotal, discount, network fee, total).
- [x] Show the selected edition tier on every cart line; add compact cart stepper and responsive mobile cart cards.
- [x] Add summary panel (title rule, quote rows and action) and mobile coupon/summary sheet using only the API quote for totals.
- [x] Coupon apply/remove with invalid/expired handling.
- [x] Persistence after refresh; guest cart preserved and merged via `POST /api/cart/merge` on login.
- [x] Skeleton for cart summary; announce price/availability changes in live region.
- [x] **Tests**: quantities, removal, coupon, persistence after refresh and after login merge.

---

## Epic 7: Checkout, Orders & Receipt

- [x] Checkout form: collector data (prefilled from profile/registered wallet; "Usar outra carteira?" reveals per-network validated address entry), provider selection with simulated connect/refuse/disconnect, and review dialog before submit.
- [x] Build responsive wallet/provider option cards, checkout summary panel and mobile composition (collector-data disclosure, wallet cards, provider cards, total and primary action).
- [x] Quote revalidation before confirming; on price/availability/coupon/fee change show differences and require a new explicit confirmation.
- [x] Idempotent order creation: per-attempt key persisted and reused on retry; block duplicate clicks; timeout recovery returns the same order; `409` on key reuse with different payload.
- [x] Pending / confirmed / rejected states; recovery after refresh/reconnection; show confirmation **only** for confirmed orders.
- [x] Receipt route `/pedidos/:orderId` as an immutable snapshot: transaction id, items, edition tiers, fees, total and network explorer link; pending/confirmed/rejected states and mobile composition.
- [x] On confirmation remove only purchased items/quantities from the cart; preserve items on failure.
- [x] Session expiry mid-checkout resumes with preserved context.
- [x] **Tests**: full purchase (catalog → confirmed receipt); payment failure, repeated clicks, timeout recovered with the same order.

**Acceptance**: no duplicate orders under any scenario; receipt unaffected by later catalog changes.

---

## Epic 8: Real-Time Synchronization (Socket.IO)

- [x] Socket client/provider using `socket.io-client`; connect on authenticated session, disconnect and clean listeners on logout/user switch and unmount.
- [x] Handle `nft.updated`: patch catalog, detail and cart caches; invalidate quote; inform the user (live region).
- [x] Handle `order.updated`: transition pending → confirmed/rejected; terminal states never overwritten.
- [x] Dedup by `eventId`, ignore events with `version ≤ applied`, ignore events of another user.
- [x] On reconnect: reconcile active queries and pending order via REST.
- [x] Mandatory scenario: item in cart → price/availability change → UI informs and updates summary → checkout blocks stale-quote confirmation.
- [x] Pending order survives a connection drop; state recovered after reconnect or reload without a new purchase.
- [x] **Tests**: price/availability change during checkout via Socket.IO; duplicate/old events, disconnect and pending-order resume.

---

## Epic 9: Profile & Wallets

- [x] Add shared profile layout with sidebar navigation; active profile item uses a 4px primary bar.
- [x] Profile view: edit personal data, avatar upload, password change; API validation errors mapped to fields.
- [x] Add avatar block with image placeholder and Alterar/Remover actions; profile fields and password flow surface API validation errors.
- [x] Wallets view: register and edit primary/secondary wallets; validation and error handling; include "Igual à carteira principal" and the empty secondary state.
- [x] Favorites view at `/favoritos` ("Lista de interesse") inside the profile layout, reusing the card grid.
- [x] Confirmed changes persist after refresh; profile, wallets and favorites have responsive mobile compositions (no dedicated frames).
- [x] **Tests**: profile/avatar/password/wallet edits with validation errors.

---

## Epic 10: Accessibility, Visual Regression & Test Completion

- [x] Keyboard navigation, visible focus, focus trap/return in dialogs and drawers; `@axe-core/playwright` checks on key pages.
- [x] Forms: labels, `aria-describedby` errors, `aria-invalid`.
- [x] Verify 390 / 768 / 1440 px: no horizontal overflow, content intact at 200% zoom.
- [x] Visual regression baselines (Home, Detail, Cart, Payment) with stable data and controlled animations.
- [x] Compare visual-regression baselines against the same scenarios as `design/reference/`, including the `design-cart` scenario.
- [x] Coverage check against the 12 required E2E items: (1) search/filters/history, (2) detail/not found, (3) auth lifecycle, (4) favorites failure/recovery, (5) cart/coupon/persistence, (6) full purchase, (7) payment failure/repeat click/timeout, (8) profile/wallets validation, (9) price change via socket, (10) duplicate/old events and pending resume, (11) keyboard/focus/forms, (12) slow-network skeleton and retry.
- [x] Confirm HTML report and failure traces are produced.

---

## Epic 11: Performance, Documentation & Deployment

- [ ] Optimize: route code splitting, image sizing/lazy loading, font preload/`font-display`, preload LCP image, minimize main-thread work.
- [ ] Lighthouse config + script: Home and NFT Detail, mobile + desktop, **3 runs each, median per category**; targets Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90. Record LCP, CLS, TBT; commit HTML/JSON reports, tool versions and environment; justify any miss.
- [ ] Finalize `ARCHITECTURE.md`: flip [Planned] → [Done], fill UX decisions, Figma deviations, limitations (including Socket.IO mock transport), session policy, cart state, cache strategy, REST/Socket reconciliation.
- [ ] Write `README.md`: setup, env vars, fictitious credentials, scenario selection and reset, commands (dev with mocks, build, preview, typecheck, lint, Playwright, Lighthouse), how to reproduce each failure flow.
- [ ] Deploy (Vercel recommended) with SPA fallback (`vercel.json` rewrites), mocks and real-time flows working in the published build; verify direct access and refresh on every route.
- [ ] Verify the deployed version matches the delivered code; test from a clean checkout (`npm ci && npm run build && npm run preview`).
- [ ] Submit repository link + public URL.

**Progress**: Epic 11 started. Route-level splitting is enabled by the TanStack Router Vite plugin. The self-hosted Roboto Mono font uses `font-display: swap` and is preloaded. The first hero image has a preload hint and high fetch priority for responsive hero layouts. In the production demo build, MSW/browser and mock control are conditionally imported; the main JS asset is about 347 KB (113 KB gzip), down from about 838 KB (291 KB gzip). The three smoke E2E tests pass, including Socket.IO and URL-driven scenarios. Further optimization is still needed: Lighthouse measurements have not been run and the production output still contains a ~364 KB order-settlement chunk.
