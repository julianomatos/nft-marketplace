# NFT Marketplace

Frontend NFT marketplace demo built with React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Router/Query, Axios and MSW. The REST API and Socket.IO service are deterministic browser mocks; this project does not connect to a real payment, wallet, blockchain or marketplace backend.

## Requirements and setup

- Node.js `>=22.19` (`.nvmrc` selects `22.19.0`)
- npm
- Playwright Chromium for browser tests and Lighthouse

```sh
npm ci
npx playwright install chromium
npm run dev
```

Open the URL printed by Vite. The development environment enables MSW by default. `public/mockServiceWorker.js` is committed and is also included in the production/demo build.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite with browser mocks enabled |
| `npm run build` | Run TypeScript build checks and create the production build |
| `npm run preview` | Serve the build locally; run `npm run build` first |
| `npm run typecheck` | Typecheck without emitting output |
| `npm run lint` | Run ESLint |
| `npm run test:unit` | Run REST/contract/store tests using Playwright's Node project |
| `npm run test:e2e` | Run Playwright desktop and mobile Chromium projects |
| `npm run test:e2e:update` | Update visual snapshots intentionally |
| `npm run generate:images` | Generate responsive local WebP artwork variants |
| `npm run lighthouse` | Build/preview and run Lighthouse audits for Home and NFT Detail, mobile and desktop |

Lighthouse runs three measurements per page/device and stores HTML/JSON reports and summary medians under `lighthouse/reports/`. Install the Chromium browser with `npx playwright install chromium` if it is missing. Run `npm run lighthouse` without a URL argument so the audit uses the preview server's dynamically allocated port.

## Environment variables

Copy `.env.example` to `.env` only when you need local overrides. Vite loads mode-specific environment files; `.env.development` and `.env.production` enable mocks for the local and demo builds.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` in development and production modes | Start the MSW browser worker before mounting the app |
| `VITE_MOCK_SCENARIO` | `success` | Initial deterministic MSW scenario, used when no scenario is already persisted |
| `VITE_API_BASE_URL` | `/api` | Base URL used by the Axios REST client |

The production mode is a mock-backed demo, not a production backend integration. Disabling mocks without providing a compatible API and Socket.IO service will leave API requests unanswered.

### Vercel SPA routing

`vercel.json` rewrites application paths to `/` while leaving `/api/`, `/assets/`, the MSW worker, favicon and `robots.txt` paths untouched. This is needed because the application uses client-side routing; test direct navigation and refresh on nested routes after deployment. The published deployment has been smoke-tested for direct app-route access, protected-route login redirects, catalog mock API responses and NFT artwork loading.

## Demo accounts

These accounts are fictional and only valid in the local mock data:

| Name | Email | Password |
| --- | --- | --- |
| Ana Oliveira | `ana@kurio.example.test` | `KurioDemo!A2026` |
| Caio Martins | `caio@kurio.example.test` | `KurioDemo!B2026` |

Fixture data contains salted SHA-256 password hashes, not plaintext passwords. Do not reuse these demo credentials elsewhere.

## Mock scenarios and reset

Scenarios can be selected with `VITE_MOCK_SCENARIO` or a URL query parameter. For example, start the app and open `/?mockScenario=empty` to reset and load the empty-catalog scenario before MSW starts. A URL scenario overrides the environment setting. Without a URL override, existing mock state persists across reloads.

During development, reset the complete mock state from the browser console:

```js
window.__KURIO_MOCKS__.reset('success')
```

The harness also exposes mock clock, latency and timeout controls:

```js
window.__KURIO_MOCKS__.setMockTime('2026-07-29T12:00:00.000Z')
window.__KURIO_MOCKS__.advanceMockTime(60_000)
window.__KURIO_MOCKS__.setLatency(500)
window.__KURIO_MOCKS__.setTimeoutResponseDelay(16_000)
```

`setLatency` accepts 0–15,000 ms; `setTimeoutResponseDelay` accepts 0–60,000 ms. The Playwright helpers in `e2e/mock-helpers.ts` provide scenario reset and deterministic clock/latency control for tests.

Available scenario names:

| Scenario | What it demonstrates |
| --- | --- |
| `success` | Standard catalog and successful user flows |
| `empty` | Empty catalog result |
| `design-cart` | Reference cart populated for checkout |
| `expired-session` | Expired token and authentication recovery |
| `network-error` | Network-level request failure |
| `server-error` | HTTP 503 service failure |
| `unauthorized` | HTTP 401 for private API requests |
| `signup-conflict` | Signup with an already-used email |
| `validation-error` | Form/API validation errors |
| `invalid-coupon` | Coupon rejected as invalid |
| `expired-coupon` | Coupon expiry handling |
| `price-changed` | Price changes before order validation; fresh quote is required |
| `sold-out` | Edition becomes unavailable before order validation |
| `timeout-after-order` | Order is created, response times out, and idempotent retry recovers it |
| `payment-confirmed` | Order confirmation and inventory update events |
| `payment-rejected` | Rejected payment and retry path |
| `variable-latency` | Concurrent requests finish out of order |

## Reproducing failure and recovery flows

Select the scenario by appending `?mockScenario=<scenario>` to the route URL. If you are already on the app, reload after setting the scenario. Use a fresh browser context or reset the scenario between flows to avoid persisted mock state affecting the result.

1. **Catalog empty/error/retry:** use `/?mockScenario=empty`, `/?mockScenario=network-error`, or `/?mockScenario=server-error`. The empty state should appear for `empty`; the error state should provide a retry for the failure cases. `variable-latency` reproduces out-of-order API responses.
2. **Expired or unauthorized session:** select `expired-session`, sign in with a demo account, then open a protected route such as `/carrinho`. Verify the expiry redirect and private-data cleanup. `unauthorized` rejects private API requests and is useful for checking visible API errors.
3. **Signup conflict and validation:** use `signup-conflict` to submit an already-registered email from `/signup`; use `validation-error` to exercise field/API validation feedback.
4. **Coupon errors:** start with `/?mockScenario=invalid-coupon` or `/?mockScenario=expired-coupon`, sign in, open `/carrinho`, and apply a coupon. Check the API error and recovery message.
5. **Price change or sold-out edition:** open `/?mockScenario=price-changed` or `/?mockScenario=sold-out`, sign in and start checkout from the reference cart. Order validation must reject the stale quote and require explicit acceptance of a fresh quote; it must not confirm a purchase using stale totals.
6. **Timeout and idempotent recovery:** use `timeout-after-order` and complete checkout. The initial response is delayed beyond Axios's default 15-second timeout after order creation. Retry using the same idempotency key; the existing order should be recovered rather than duplicated. For shorter manual runs, set `window.__KURIO_MOCKS__.setTimeoutResponseDelay(...)` before starting checkout.
7. **Payment result:** use `payment-confirmed` or `payment-rejected` and complete checkout. Confirmation should render the receipt and update inventory; rejection should preserve the cart and offer retry.
8. **Real-time reconciliation:** use `price-changed`, `sold-out`, or a payment scenario while the app is connected. REST-driven mock changes publish Socket.IO events; the UI should reconcile state and announce relevant changes accessibly. `variable-latency` can be used separately to exercise request ordering.

The Socket.IO implementation is a browser demo transport provided by `@mswjs/socket.io-binding`; it is not a production Socket.IO server. Private order events use the mock subscription token and are filtered by user id.

## Tests and current coverage

`npm run test:unit` exercises contracts, fixtures, mock store and REST handlers through Axios/MSW Node. `npm run test:e2e` runs browser flows in desktop and mobile Chromium, including catalog, authentication, favorites, cart, checkout/order, profile/wallet and real-time behavior. Browser tests reset isolated mock state and use deterministic helpers rather than fixed sleeps. Run an individual spec while developing with:

```sh
npx playwright test e2e/home.spec.ts --project=chromium-desktop
```
