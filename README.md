# NFT Marketplace

Frontend challenge implementation using React, TypeScript, Vite, Tailwind CSS v4 and shadcn/ui.

## Requirements

- Node.js `>=22.19` (the checked-in `.nvmrc` selects `22.19.0`)
- npm

## Setup and commands

```sh
npm ci
npm run dev
```

The development server runs at the Vite URL printed in the terminal. The primary project commands are:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite in development mode |
| `npm run build` | Typecheck and create the production build |
| `npm run preview` | Preview the build after `npm run build` |
| `npm run typecheck` | Run the TypeScript project build without emitting output |
| `npm run lint` | Run ESLint |
| `npm run test:unit` | Run browser-free Playwright unit tests |
| `npm run test:e2e` | Run Playwright smoke tests in desktop and mobile Chromium |
| `npm run test:e2e:update` | Update Playwright visual snapshots |
| `npm run generate:images` | Generate 480 px and 960 px WebP NFT artwork variants with Sharp |
| `npm run lighthouse` | Build, preview and run three Lighthouse measurements per form factor |
| `npm run lighthouse -- http://127.0.0.1:4173/` | Pass a URL to the Lighthouse runner |

Playwright's Chromium browser can be installed with `npx playwright install chromium`. The Lighthouse runner uses that browser, writes HTML/JSON reports and median scores/metrics under `lighthouse/reports/`.

## Environment variables

Copy `.env.example` to a local `.env` file when you need to override defaults:

| Variable | Development default | Purpose |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` in `.env.development` | Enables network mocks when the mock bootstrap is wired |
| `VITE_MOCK_SCENARIO` | `success` | Selects a deterministic mock scenario |
| `VITE_API_BASE_URL` | `/api` | Base path for REST requests |

The Epic 0 setup defines these values; REST handlers and the application MSW bootstrap are added in Epic 2. At this stage, only the dedicated Socket.IO browser smoke page starts an MSW worker.

## Fictitious demo credentials (draft for Epic 3)

These accounts are fictional and intended only for the local mock demonstration:

| User | Email | Password |
| --- | --- | --- |
| Ana Oliveira | `ana@kurio.example.test` | `KurioDemo!A2026` |
| Caio Martins | `caio@kurio.example.test` | `KurioDemo!B2026` |

Fixture records store only a salt and a precomputed SHA-256 password hash; these plaintext values are documented here solely to make the later demo login usable. Do not reuse them outside this mock project.

## Current smoke coverage

`npm run test:e2e` checks that the KURIO shell renders at desktop and mobile sizes, that unavailable destinations explain their status, and that `socket.io-client` receives a mocked reply through MSW 2.x and `@mswjs/socket.io-binding` in Chromium. The marketplace flows and fictitious test credentials will be documented as they are implemented.
