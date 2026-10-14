# DESIGN_SYSTEM.md — KURIO NFT Marketplace

Single source of truth for visual implementation. Read together with `AGENTS.md` (rules) and compare your output against the PNG exports in `design/reference/`.

**Legend** — ✅ confirmed from Figma (inspect/code panel) · 📏 measured from the 2x frame exports (flat colors exact, sizes ±1px) · ❓ not available in the frames: decide, implement, and record the decision in `ARCHITECTURE.md` (§13 UX decisions).

## 1. Principles

- **Dark only.** One theme. No light mode, no toggle. Set `color-scheme: dark`.
- **Monospace everywhere.** The whole UI is **Roboto Mono** (navigation, headings, body, buttons, forms, prices).
- **Copper accents on warm near-black.** Desktop geometry is almost square (small radii on controls, square cards/panels/modals, generous radius only on hero media). **Mobile is softer**: pill buttons, rounded cards and sheets, copper gradient on primary actions.
- **Tokens only.** Never write arbitrary hex values in components (`bg-[#...]` is forbidden). Use the semantic tokens below. Replace every shadcn starter default (Geist font, neutral palette, `radix-nova` radius) with these tokens.

## 2. Color tokens

| Token | Value | Source | Usage |
| --- | --- | --- | --- |
| `--background` (ink) | `#140D0A` | ✅ Color/Ink | Page background |
| `--foreground` | `#F5F1EB` | ✅ Color/Foreground | Headings, nav links, card titles, labels, stepper symbols |
| `--primary` | `#D28A4C` | ✅ Color/Primary | Primary buttons, badges, active pagination, active dot, header underline, focus ring, radio dot, selected thumbnail border |
| `--primary-foreground` | `#140D0A` | 📏 | Text on primary |
| `--highlight` | `#E89B55` | 📏 | Active nav link, sidebar items, **prices and totals**, text links, "Taxa estimada", selected edition chip text |
| `--card` (surface) | `#241612` | 📏 | Cards, sidebar, modals, mobile sheets/option cards/search bar, footer blocks |
| `--surface-raised` | `#2F1D15` | 📏 | Hover action buttons, mobile circular icon buttons, mobile steppers |
| `--surface-band` | `#38220F` | 📏 | Footer brand strip, newsletter input |
| `--border` / `--input` | `#3F2319` | 📏 | Input borders, dividers, inactive pagination, unselected edition chips |
| `--border-header` | `#8A5B33` | 📏 | Header bottom border, section rules |
| `--muted-foreground` | `#CFB28C` | 📏 | Paragraphs, descriptions, meta, facet counts, receipt title/labels |
| `--subtle` | `#B39463` | 📏 | Placeholders, struck-through old price |
| `--destructive` | `#F0805F` | 📏 (≈) | Required asterisk, error text/borders |
| `--rating` | `#E3A44E` | 📏 | Rating star (mobile chip) |
| `--ring` | `#D28A4C` | 📏 | Focus ring (focused input uses a primary border) |
| `--primary-gradient` | `linear-gradient(135deg, #D28A4C 0%, #B07542 100%)` | 📏 (≈) | **Mobile** primary buttons and filter button |
| `--hero-gradient-mobile` | `linear-gradient(135deg, #734F30 0%, #241612 100%)` + translucent circle | 📏 (≈) | Mobile hero card |

Derived (❓): skeleton base `--card`, shimmer highlight `--surface-raised`; toasts reuse `--highlight` / `--foreground` / `--destructive`.

NFT artwork backgrounds (cream/sage) are image content, not tokens.

**Computed contrast (WCAG):** primary on ink 6.85:1 · ink on primary 6.85:1 · foreground on ink 17.1:1 · muted on card 8.7:1 · subtle on ink 6.7:1 · destructive on ink 7.3:1 · highlight on card 7.7:1. All text pairs pass AA.
**Known trade-off:** the resting input border (`#3F2319`) is only 1.34:1 against ink. Keep it for fidelity, give every field a visible label/placeholder and a strong focus state, and list it under limitations in `ARCHITECTURE.md`.

### shadcn mapping (Tailwind v4, `src/index.css`)

```css
:root {
  color-scheme: dark;
  --background: #140D0A;
  --foreground: #F5F1EB;
  --card: #241612;
  --card-foreground: #F5F1EB;
  --popover: #241612;
  --popover-foreground: #F5F1EB;
  --primary: #D28A4C;
  --primary-foreground: #140D0A;
  --secondary: #38220F;
  --secondary-foreground: #F5F1EB;
  --muted: #241612;
  --muted-foreground: #CFB28C;
  --accent: #2F1D15;
  --accent-foreground: #E89B55;
  --destructive: #F0805F;
  --border: #3F2319;
  --input: #3F2319;
  --ring: #D28A4C;
  /* project-specific */
  --highlight: #E89B55;
  --subtle: #B39463;
  --surface-band: #38220F;
  --border-header: #8A5B33;
  --rating: #E3A44E;
  --primary-gradient: linear-gradient(135deg, #D28A4C 0%, #B07542 100%);
  --radius: 0.25rem;
}
/* expose highlight, subtle, surface-band, border-header, rating via @theme inline as --color-* */
```

## 3. Typography

Font: **Roboto Mono**, self-hosted (no external CDN), weights 400 and 700 (add 500 only if a frame needs it). `letter-spacing: 0` on all styles. Figma style naming: `Group/Size Weight` (e.g. `Display/43 Bold`).

| Style | Size / line-height | Weight | Status | Where |
| --- | --- | --- | --- | --- |
| Display/43 Bold | 43px / 70px | 700 | ✅ | Hero H1 (uppercase, box 600×140, foreground) |
| Body Large/18 Bold | 18px / 16px | 700 | ✅ | "Coleções", "Faixa de preço", footer headings, prices, panel titles (used ~95×) |
| Page / NFT title | ≈27–28px | 700 | 📏 | NFT name on detail, "Diário da Cunhagem" |
| Feature title | ≈22px | 700 | 📏 | Footer feature blocks |
| Price (detail) | ≈21px | 700 | 📏 | `1.19 ETH` on detail (highlight) |
| Quantity number | ≈20px | 400 | 📏 | Stepper value |
| Section / tab title | ≈16px | 700 | 📏 | "Mais desta coleção", "Colecionadores também viram" (highlight, 1px rule below), tabs, receipt title, card/nav text (400) |
| Body | ≈14px (paragraphs ≈ 14/24) | 400 | 📏 | Paragraphs, sidebar items, labels, footer links, inputs, descriptions |
| Meta | ≈12px | 400 | 📏 | Article meta, chips text, small captions |

For 📏 rows, start from these values and adjust by comparing screenshots with `design/reference/`; update this table with the final values. Mobile sizes are ❓ (no style list): start from the desktop styles and match the mobile exports. `line-height: 16px` on 18px text is for **single-line** labels only.

## 4. Layout, spacing, breakpoints

- **Desktop frame 1440:** content width **1200px**, horizontal padding **120px**, gap between sections **96px**, frame top/bottom padding 24px ✅. Use `max-width: 1200px; margin-inline: auto; padding-inline: clamp(1.5rem, 8.33vw, 7.5rem)`.
- **Mobile frame 414×896:** horizontal padding **24px**, gap **16px**, top inset 40px (status area in the mock) ✅. The 40px outer radius is the phone mock — **do not implement**. Fluid layout, verified at **390**, 414, 768, 1440.
- **Breakpoints** (❓ no tablet frame): mobile `< 768`, tablet `768–1023`, desktop `≥ 1024`. Below 1024 the Início sidebar becomes a filter drawer; tablet = 2 card columns and the mobile bottom navigation is hidden from 768 up (desktop header from 768 if it fits, otherwise a menu button).
- **Início desktop** 📏: sidebar ≈310px, gap ≈48px, product grid 3 columns (≈259px cards, 32px gap). Hero: text left, **450×450 image** right (radius ≈16px).
- **Detalhes desktop** 📏: 4 vertical thumbnails (≈100×100, 16px gap) · main image panel ≈444×444 on `--card` with the image inset (zoom button top-right) · info column ≈595px. Tabs below with a 1px rule; full-width description.
- **Carrinho desktop** 📏: table ≈780px + "Resumo da carteira" ≈330px.
- **Perfil / Carteiras desktop** 📏: sidebar ≈310px · gap ≈29px · form area ≈861px in **2 columns** (≈416px each, 28px gap).
- **Modals** 📏: auth modal ≈**500px** wide; order receipt ≈**580px** wide; both centered, square, `--card`, with a ≈8px `--primary` bar on the bottom edge and a copper "X" top-right.
- **Header:** logo left, nav centered, search icon + cart (badge) + "Entrar" button right; 1px bottom border `--border-header`; active link = `--highlight` text + 2px `--primary` underline.

## 5. Radii & borders (📏, verify visually)

**Desktop:** buttons ≈ 2.5–4px · inputs ≈ 2.5px · hover action buttons ≈ 3px · detail quantity buttons ≈ 12px · hero image ≈ 16px · card image inset ≈ 12px (❓) · cards, sidebar, order rows, wallet options, modals **square (0)** · promo banners ≈ 4px · edition chips **pill**.
**Mobile:** primary buttons **pill** (≈60px tall) · cards ≈ 16–20px · hero card ≈ 24px · search bar and filter button ≈ 16px · cart items and option cards ≈ 16px · bottom sheets ≈ 32px top radius · edition chips and rating chip **pill** · icon buttons circular.
Borders are 1px `--border` unless stated.

## 6. Components

- **Buttons (desktop):** primary = solid `--primary`, text `--primary-foreground`, bold (EXPLORAR, COMPRAR uppercase). "Entrar" has a log-in icon. Outline = transparent, 1px `--primary`, e.g. "Favoritar" (heart). Social auth buttons = surface with 1px border and brand icon. Text links (`Trocar carteira`, `Adicionar`, `Continuar explorando`) use `--highlight`. Hover/active/disabled/loading are ❓: hover lightens toward `--highlight`, disabled = 50% opacity + `aria-disabled`, loading = spinner and blocks repeat clicks.
- **Buttons (mobile):** pill with `--primary-gradient` (Comprar NFT, Conectar e finalizar, Confirmar compra, Aplicar); circular `--surface-raised` icon buttons for back, favorite and cart; text button "EXPLORAR →" in the hero.
- **Inputs:** label above, required asterisk in `--destructive`; `--input` border (ink background on pages, surface in modals); placeholder `--subtle`; focus = `--primary` border + visible ring; password has an eye toggle (accessible name); select has a chevron — add right padding so it never overlaps the value; ENS field = `.eth` select + text input. Coupon field: input with a primary border and the "Aplicar" button attached on the right (desktop), pill version on mobile.
- **Radio / checkbox:** circular outline in `--primary`; selected = filled dot. **Wallet/provider option card:** `--card` background, selected = filled radio (desktop selected option also gets a 1px `--foreground` border); provider cards show a round badge (W, M, wallet icon).
- **Quantity stepper:** desktop detail = large filled `--primary` rounded buttons (− / +) with the number between; desktop cart = small round filled `--primary` buttons; mobile = round buttons (`--primary` on detail, `--surface-raised` on cart). Disabled (min 1 or max availability) is dimmed and `aria-disabled`.
- **Edition chips:** pill, 1px `--border`, text `--muted-foreground`; selected = `--primary` border + `--highlight` text. Labels: `1/1`, `1/10`, `1/50`, `ABERTA`.
- **Rating:** 5 stars (`--primary`) + "N avaliações de colecionadores" on desktop; pill chip "★ 4.8 (19)" on mobile.
- **Badge** (RARO): `--primary` background, `--primary-foreground` text, square, top-left over the image.
- **NFT card (desktop):** `--card` block with the image inset; **title (foreground) and price (`--highlight`, bold) sit below the block on the page background**; optional struck-through old price in `--subtle`. Hover/focus-within: 1px `--primary` top border and three action buttons over the image bottom (add to cart, favorite, view), keyboard-reachable and always visible on touch.
- **NFT card (mobile):** rounded `--card` block, image inset, circular favorite button top-right of the first card; **2-column staggered grid** (second column offset ≈32px down).
- **Detail extras:** vertical thumbnails (selected = 1px `--primary` border), zoom button (dark circular, top-right of the main image), share row "Compartilhar este NFT:" with icons, tabs "Detalhes do NFT" / "Avaliações de colecionadores (19)" (active = `--highlight` + 2px `--primary` underline over a 1px full-width rule), content blocks with bold white labels (Rede, Contrato, Direitos autorais) and muted text.
- **Cart row (desktop):** `--card` row, 72px thumbnail flush left, name (bold) + "ID do token: #0042" (muted), unit price, stepper, line total (`--highlight`), trash icon button. **Cart item (mobile):** `--card` card with thumbnail left, name, `Edição: 1/50`, line total, stepper.
- **Summary panel:** title with a rule, coupon, rows (Subtotal, Desconto do lançamento `(-) 00.00`, Taxa de rede, "Taxa estimada" caption in `--highlight`), Total in bold with the value in `--highlight`, full-width primary button, centered link.
- **Pagination:** ≈34px buttons, inactive 1px `--border`, active filled `--primary`, next arrow.
- **Price range slider:** two thumbs on a `--primary` track, label `Preço: 0.02 - 12.30 ETH`, "Aplicar" button; values are decimal strings.
- **Sidebar facets (Início):** copper items with right-aligned counts in parentheses (Coleções, Rede). **Profile sidebar:** `--card` panel "Meu perfil", items with icons (`--highlight`), active item = `--card` row with a 4px `--primary` bar on the left, divider, then "Sair" in bold.
- **Avatar block:** circular placeholder (surface with an image icon), primary "Alterar" button, text button "Remover".
- **Modals:** auth (`Entrar | Criar conta` tabs, active in `--highlight`, vertical primary rule between) and order receipt. Add a dimmed scrim, focus trap and Esc to close (the frames show no scrim — record as a deviation).
- **Order receipt panel** 📏: "THANK YOU" envelope illustration in copper (export as asset), title (muted, bold), a 4-cell summary row separated by primary vertical rules (ID da transação · Data · Total · Carteira), "Detalhes da transação" table (NFTs / Edições / Subtotal, rows with 8px-radius thumbnails), fee and total, confirmation text, primary "Ver no Etherscan" button.
- **Carousels / dots:** product carousels and the hero use scroll-snap lists, **no autoplay**; dots are real buttons: **active = filled `--primary`, inactive = outlined**; hit area ≥ 24px.
- **Mobile shell:** top search pill ("Explorar coleções", `--card`) + gradient filter button; bottom navigation bar on `--card` with 4 icons (home, favorites, cart, profile) and a **floating circular center button** with a notch; sticky action bar on detail (Qtd. stepper, price, Comprar NFT, cart button); back-arrow header on inner screens; hero card with `--hero-gradient-mobile`, a translucent circle, main artwork plus an overlapping small thumbnail.
- **Footer (desktop):** feature band on `--card` with 4 columns separated by 1px primary dividers (circular primary badges W / C / D, title, text, newsletter); brand strip on `--surface-band`; link columns; copyright centered.
- **Skeleton + shimmer:** `--card` → `--surface-raised` gradient, final dimensions, disabled under `prefers-reduced-motion`.

## 7. Screens (frames available vs. to build)

| Screen | Desktop | Mobile | Notes |
| --- | --- | --- | --- |
| Início | ✅ | ✅ | Desktop: hero, sidebar (Coleções, Faixa de preço, Rede), "NFT em destaque", grid 3×3, pagination, promo banners, "Diário da Cunhagem", newsletter, footer. Mobile: search + filter, hero card, tabs, 2-col staggered grid, bottom nav |
| Detalhes do NFT | ✅ | ✅ | Edition chips, quantity, buy/favorite, tabs (Avaliações content ❓), "Mais desta coleção" |
| Carrinho | ✅ | ✅ | Desktop table + "Resumo da carteira" + "Colecionadores também viram"; mobile cards + coupon/summary sheet |
| Pagamento | ✅ | ✅ | Desktop: collector form + "Seus NFTs" + "Carteira e rede" + "Confirmar compra". Mobile: registered wallets + provider cards + total (no form) |
| Confirmação de pedido | ✅ (receipt panel) | ❌ | Mobile composed from the same panel |
| Login | ✅ modal | ✅ full screen | Same fields on both |
| Cadastro | ❌ | ❌ | Tab/screen missing (❓) |
| Perfil do colecionador | ✅ | ❌ | Mobile composed from the same components |
| Carteiras | ✅ | ❌ | Mobile composed from the same components |

Screens without a frame follow the same patterns; record each choice in `ARCHITECTURE.md` §13.

## 8. Data implied by the design (use in contracts and fixtures)

- **NFT:** `id`, `tokenId` (`#0042`), `name` (`Emerald Ape #042`), `collection` (`Kurio Apes`), `category` (Arte digital, Fotografia, Música, Arte 3D, Colecionáveis, Generativa, Jogos, Assinaturas, Utilidade), `network` (Ethereum, Polygon, Solana), `price` (string), `compareAtPrice?`, `rarity?`, `isNew`, `trending`, `rating {average: 4.8, count: 19}`, `attributes`, `description`, gallery images, `version`.
- **Editions are tiers:** `editions[{ id, label, supply, available }]` with labels `1/1`, `1/10`, `1/50`, `ABERTA` (open edition: no supply cap, use a large `available` such as 500). Quantity is limited by the selected tier's `available`. **Cart/order line identity = NFT + edition.** The cart column called "Edições" is the quantity.
- **Quote/order:** lines (quantity, unit price, line total), subtotal, discount ("Desconto do lançamento"), network fee ("Taxa estimada"), total.
- **Reference scenario "design-cart"** (fixtures and visual regression, all viewports): Emerald Ape #042 `1/50` ×2 @ 1.19 = 2.38 · Violet Nomad #314 `ABERTA` ×6 @ 1.39 = 8.34 · Ivory Baron #088 `1/10` ×9 @ 1.79 = 16.11 · subtotal 26.83 · discount 0.00 · fee 0.016 · **total 26.846 ETH**. Token ids: #0042, #0314, #0088.
- **Wallet record** (Carteiras form): `displayName*`, `nickname*` (Apelido da carteira), `network*`, `profileName*`, `address*`, `altAddressOrEns?` (optional "ENS ou carteira secundária"), `walletType*` (MetaMask, WalletConnect, Coinbase Wallet), `referralCode*`, `email*`, `ensName*` (+ `.eth` suffix select). Two kinds: **primary** and **secondary**. Fixture user: `Principal` (Ethereum, MetaMask) and `Reserva` (`nova.kurio.eth`, Polygon).
- **Profile record:** `displayName*`, `username*`, `email*`, `ensName*`, `walletNickname*`, `avatar`, plus password change (current, new, confirm).
- **Receipt:** transaction id (shortened `0x` + 4 hex + `…` + 4 hex), date (`29 Jul, 2026` format), total, wallet provider, items (name, token id, quantity, subtotal), fee, total, network.
- Values from the API render exactly as received (no rounding); prices use a **dot** as decimal separator everywhere.

## 9. Behavior of out-of-scope and undesigned elements

- **Navigation:** "Início" is active on `/`, **Perfil/Carteiras/Favoritos** (as in the frames); "Mercado" links to the catalog (`/` anchored at the catalog) and is active on detail, cart and checkout. **Criadores, Aprenda**, footer link columns, "Diário da Cunhagem" cards, "Explorar →" banners, "Esqueceu a senha?", profile menu items **Atividade, Ofertas, Arquivos baixados, Suporte** → a single "indisponível nesta demonstração" page (or `aria-disabled` with explanatory tooltip). Never imply success.
- **Profile menu:** Dados do perfil → `/perfil`; Carteiras → `/carteiras`; **Lista de interesse → `/favoritos`** (card grid inside the profile layout, same frame style); Sair → logout.
- **Newsletter "Enviar"** and **Google/Facebook** buttons: visible, with an inline "indisponível nesta demonstração" message; no fake success.
- **Share icons:** open the network's share URL in a new tab with `rel="noopener noreferrer"`.
- **Editorial teasers** (Diário da Cunhagem, promo copy) are static UI copy in `src/content/`; business data (NFTs, counts, ratings, reviews, prices) comes from the API.
- **Reviews tab:** read-only list from fixtures (❓ frame missing); no review creation.
- **Cart badge:** total units, capped at `99+`.
- **Authenticated header** (❓ the frames show "Entrar" even on logged-in pages): replace "Entrar" with an account button (name/avatar → `/perfil`) in the same style.
- **Order confirmation is a route** (`/pedidos/:orderId`) rendering the receipt panel on a plain ink page (reloadable, recoverable); "X" returns to the catalog. Pending and rejected states (❓ not designed) reuse the panel: pending = spinner + "Aguardando confirmação"; rejected = message + "Tentar novamente" back to checkout with items preserved. "Ver no Etherscan" opens the network's explorer (Etherscan / Polygonscan / Solscan) with the simulated hash in a new tab; document in `README.md` that the hash is simulated.
- **Checkout form** = the wallet fields plus `username` and optional note, **prefilled from the selected registered wallet and profile**. On mobile (frame has no form) the same fields live in a collapsible "Dados do colecionador" section, closed when prefilled and valid, opened automatically on errors. "Trocar carteira" → `/carteiras`; the ⋮ menu on a wallet card offers "Editar" → `/carteiras`.
- **Wallets screen:** primary form always editable; "Adicionar" reveals/focuses the form of that kind when none is registered; the secondary section shows its empty state until added; the checkbox "Igual à carteira principal" copies the primary data into the secondary form.
- **Mobile center button** (scan icon, action undefined ❓): focuses the search field (navigates to `/` first when elsewhere).
- **Per-breakpoint hero copy:** desktop "SEJA DONO DO FUTURO DA ARTE DIGITAL", mobile "SEJA DONO DA CULTURA DIGITAL" with a shorter paragraph — render with responsive `hidden`/`block` (display none keeps screen readers from reading both).

## 10. Known inconsistencies in the Figma and how to handle them

| Issue | Handling |
| --- | --- |
| "Ordenar por" chevron overlaps the selected text; no space after "por:" | Add padding/spacing; record deviation |
| Row 3 / middle card in Início has no title or price | Render complete content from fixtures |
| Facet counts disagree (categories sum 239, networks 283) | Counts come from the API; keep fixtures consistent |
| Cart badge "6" does not match the cart | Units rule (§9) |
| Desktop wallet list: first option is a combined "METAMASK · WALLETCONNECT · COINBASE" pill | Treat as **WalletConnect** (mobile frame shows W / M / Coinbase) |
| Desktop cart token ids (#0009, #0552) differ from payment/receipt (#0314, #0088) | Use #0042 / #0314 / #0088 everywhere |
| Desktop cart shows no edition tier; mobile shows `Edição: 1/50` | Show the tier on every cart line, desktop included |
| Reference quantities (×6, ×9) exceed the mobile `1/1` tier | Fixtures: Violet Nomad `ABERTA`, Ivory Baron `1/10`, Emerald Ape `1/50` |
| Mobile cart: line prices are line totals and the subtotal (8.92) ≠ sum of lines (8.14) | Desktop "design-cart" is authoritative; compute from the API quote |
| Mobile detail shows `1/10` chip twice | Use `1/1`, `1/10`, `1/50`, `ABERTA` as on desktop |
| Hero copy differs between desktop and mobile | Per-breakpoint copy (§9) |
| Mobile payment has no collector form; desktop does | Collapsible section on mobile (§9) |
| Unlabeled field beside "Endereço da carteira" (placeholder "ENS ou carteira secundária (opcional)") | Add a visible label with that text |
| "Código de indicação*" and "Nome ENS*" required | Follow the layout; prefilled from the fixture wallet; document codes in `README.md` |
| Wallet address and transaction id share the same string in mobile payment / receipt | Use distinct fixture values |
| Date format `29 Jul, 2026` mixes styles | Keep the designed format (pt-BR month abbreviation, capitalized) |
| Checkout has no review step | "Confirmar compra" opens a review dialog (items, quote, wallet, network) with a final confirm; changes require re-confirmation |
| Login/receipt modals have no scrim; receipt frame has no page chrome | Add scrim + focus trap for dialogs; receipt is a route page (§9) |
| "Entrar" shown on logged-in pages; "Mercado" vs "Início" active on different pages | Account button when authenticated; active states per §9 |
| Mobile frame is 414px; required viewport is 390 | Fluid layout, verify both |
| Price filter label uses a comma (`0,02 - 12,30`) | Use a dot everywhere |
| Mobile bottom bar shows a stray "'2" text under the center button | Ignore (artifact) |
| Resting input border contrast 1.34:1 | Keep; documented trade-off (§2) |

## 11. Accessibility notes specific to this design

- Focus ring `--primary` 2px with offset on every interactive element; card hover actions reachable via `:focus-within`.
- Touch targets ≥ 24×24px (carousel dots and the 8px visual dots need a larger hit area; mobile bottom-nav icons ≥ 44px).
- Required fields: asterisk + `aria-required`; errors in `--destructive` plus text/icon (never color alone), associated with `aria-describedby`.
- Edition chips and provider/wallet options are radio groups (`role="radiogroup"` / native radios) with the selected state exposed to assistive tech, not only by color.
- Steppers expose the value (`aria-live` polite on change), disabled limits and an accessible name per button.
- Hero image is the LCP: fixed dimensions, `fetchpriority="high"`, preloaded; skeletons keep final dimensions.
- Respect `prefers-reduced-motion` for shimmer, carousel scrolling and hover transitions.

## 12. Reference files

Commit the Figma exports (PNG 2x) to `design/reference/` with these names: `desktop-inicio.png`, `desktop-detalhes.png`, `desktop-carrinho.png`, `desktop-pagamento.png`, `desktop-login.png`, `desktop-confirmacao.png`, `desktop-perfil.png`, `desktop-carteiras.png`, `mobile-inicio.png`, `mobile-detalhes.png`, `mobile-carrinho.png`, `mobile-pagamento.png`, `mobile-login.png`. Export the logo, the "THANK YOU" illustration, and NFT artwork to `src/assets/` (or `public/assets/`) and reference them from fixtures.

## 13. Open items (need Figma input)

- Cadastro (Criar conta) tab/screen · Avaliações tab content · error and disabled states · authenticated header · mobile Perfil, Carteiras, Confirmação and Cadastro · tablet behavior · exact values for 📏 typography and radii (text-styles list from Figma).