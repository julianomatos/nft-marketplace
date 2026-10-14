# DESIGN_SYSTEM.md — KURIO NFT Marketplace

Single source of truth for visual implementation. Read together with `AGENTS.md` (rules) and compare your output against the PNG exports in `design/reference/`.

**Legend** — ✅ confirmed from Figma (inspect/code panel) · 📏 measured from the 2x frame exports (±1px / exact flat colors) · ❓ not available in the frames: decide, implement, and record the decision in `ARCHITECTURE.md` (§13 UX decisions).

## 1. Principles

- **Dark only.** One theme. No light mode, no theme toggle. Set `color-scheme: dark`.
- **Monospace everywhere.** The whole UI is **Roboto Mono** (navigation, headings, body, buttons, forms, prices).
- **Copper accents on warm near-black.** Geometry is almost square: small radii on controls, square cards/panels/modal, generous radius only on hero media.
- **Tokens only.** Never write arbitrary hex values in components (`bg-[#...]` is forbidden). Use the semantic tokens below. Replace every shadcn starter default (Geist font, neutral palette, `radix-nova` radius) with these tokens.

## 2. Color tokens

| Token | Value | Source | Usage |
| --- | --- | --- | --- |
| `--background` (ink) | `#140D0A` | ✅ Color/Ink | Page background |
| `--foreground` | `#F5F1EB` | ✅ Color/Foreground | Headings, nav links, card titles, labels |
| `--primary` | `#D28A4C` | ✅ Color/Primary | Primary buttons, badges, active pagination, hero dots, header underline, focus ring, radio dot |
| `--primary-foreground` | `#140D0A` | 📏 | Text on primary |
| `--highlight` | `#E89B55` | 📏 | Active nav link, sidebar items, **prices and totals**, text links, "Taxa estimada" |
| `--card` (surface) | `#241612` | 📏 | Cards, sidebar, modal, inputs inside modal, footer blocks |
| `--surface-raised` | `#2F1D15` | 📏 | Card hover action buttons |
| `--surface-band` | `#38220F` | 📏 | Footer brand strip, newsletter input |
| `--border` / `--input` | `#3F2319` | 📏 | Input borders, dividers, inactive pagination |
| `--border-header` | `#8A5B33` | 📏 | Header bottom border |
| `--muted-foreground` | `#CFB28C` | 📏 | Hero paragraph, descriptions, meta text, facet counts |
| `--subtle` | `#B39463` | 📏 | Placeholders, struck-through old price |
| `--destructive` | `#F0805F` | 📏 (≈) | Required asterisk, error text/borders |
| `--ring` | `#D28A4C` | 📏 | Focus ring (password field focus state uses a primary border) |

Derived (❓, not in Figma): skeleton base `--card`, shimmer highlight `--surface-raised`; success/info toast reuse `--highlight` / `--foreground`.

NFT artwork backgrounds (cream/sage) are image content, not tokens.

**Computed contrast (WCAG):** primary on ink 6.85:1 · ink on primary 6.85:1 · foreground on ink 17.1:1 · muted (`#CFB28C`) on card 8.7:1 · subtle (`#B39463`) on ink 6.7:1 · destructive on ink 7.3:1 · highlight on card 7.7:1. All text pairs pass AA.
**Known trade-off:** the resting input border (`#3F2319`) is only 1.34:1 against ink. Keep it for fidelity, make sure every field has a visible label/placeholder and a strong focus state, and list it under limitations in `ARCHITECTURE.md`.

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
  --radius: 0.25rem;
}
/* expose highlight, subtle, surface-band, border-header via @theme inline as --color-* */
```

## 3. Typography

Font: **Roboto Mono**, self-hosted (no external CDN), weights 400 and 700 (add 500 only if a frame needs it). `letter-spacing: 0` on all styles. Figma style naming: `Group/Size Weight` (e.g. `Display/43 Bold`).

| Style | Size / line-height | Weight | Status | Where |
| --- | --- | --- | --- | --- |
| Display/43 Bold | 43px / 70px | 700 | ✅ | Hero H1 (uppercase, box 600×140, color foreground) |
| Body Large/18 Bold | 18px / 16px | 700 | ✅ | "Coleções", "Faixa de preço", footer headings, prices, page section titles (used ~95×) |
| Section title | ≈28px | 700 | 📏 | "Diário da Cunhagem", "Mais desta coleção" (copper on detail/cart) |
| Feature title | ≈22px | 700 | 📏 | Footer feature blocks |
| Nav / card title | ≈16px | 400 | 📏 | Navigation links, card titles, buttons (buttons 700) |
| Body | ≈14px (hero paragraph ≈ 14/24) | 400 | 📏 | Paragraphs, sidebar items, labels, footer links, inputs |
| Meta | ≈12px | 400 | 📏 | Article meta, small captions, chips |

For 📏 rows, start from the value above and adjust by comparing screenshots with `design/reference/`; update this table with the final value. `line-height: 16px` on 18px text is for **single-line** labels only — never use it on wrapped text.

## 4. Layout, spacing, breakpoints

- **Desktop frame 1440:** content width **1200px**, horizontal padding **120px**, vertical gap between sections **96px**, frame top/bottom padding 24px ✅. Implement as `max-width: 1200px; margin-inline: auto; padding-inline: clamp(1.5rem, 8.33vw, 7.5rem)`.
- **Mobile frame 414×896:** horizontal padding **24px**, gap **16px**, top inset 40px (status bar area in the mock) ✅. The radius 40px is the phone mock frame — **do not implement**. Layout is fluid and must be verified at **390**, 414, 768, 1440.
- **Breakpoints** (❓ no tablet frame): mobile `< 768`, tablet `768–1023`, desktop `≥ 1024`. Below 1024 the Início sidebar becomes a filter drawer; tablet uses 2 card columns.
- **Início desktop** 📏: sidebar ≈310px, gap ≈48px, product grid 3 columns (≈259px cards, 32px gap). Hero: text left, **450×450 image** right (radius ≈16px).
- **Header:** logo left, nav centered, search icon + cart (badge) + "Entrar" button right; 1px bottom border `--border-header`; active link has a 2px `--primary` underline.

## 5. Radii & borders (📏, verify visually)

Buttons ≈ 2.5–4px · inputs ≈ 2.5px · hover action buttons ≈ 3px · hero image ≈ 16px · card image inset ≈ 12px (❓) · cards, sidebar, order rows, wallet options, modal **square (0)** · promo banners ≈ 4px. Borders are 1px `--border` unless stated; the modal has a thick `--primary` bar on its bottom edge.

## 6. Components

- **Buttons:** primary = solid `--primary`, text `--primary-foreground`, bold (EXPLORAR is uppercase). Navbar "Entrar" has a log-in icon. Outline = transparent, 1px `--border`/`--primary`, e.g. "Favoritar" (heart). Social auth buttons = surface with 1px border and brand icon. Hover/active/disabled/loading states are ❓: hover lightens toward `--highlight`, disabled uses 50% opacity and `aria-disabled`, loading shows a spinner and blocks repeat clicks.
- **Inputs:** label above, required asterisk in `--destructive`; field with `--input` border (surface background inside modals/cards, ink elsewhere); placeholder `--subtle`; focus = `--primary` border + visible ring; password has an eye toggle (accessible name); select has a chevron — add right padding so it never overlaps the value (see §10).
- **Radio / checkbox:** circular outline in `--primary`; selected = filled dot. **Wallet option card:** 1px border, selected = 1px `--foreground` border + filled radio.
- **Quantity stepper:** round outlined − / + buttons with the integer between; bounded by availability.
- **Badge** (e.g. RARO): `--primary` background, `--primary-foreground` text, square, top-left over the image.
- **NFT card:** `--card` block with the image inset; **title (foreground) and price (`--highlight`, bold) sit below the block on the page background**; optional struck-through old price in `--subtle`. On hover/focus-within the card gets a 1px `--primary` top border and three action buttons over the image bottom: add to cart, favorite, view. They must be keyboard-reachable (visible on `:focus-within`) and provide an alternative on touch (❓: always visible on mobile).
- **Tabs / nav underline:** active = `--highlight` text + 2px `--primary` underline.
- **Pagination:** square-ish 34px buttons, inactive 1px `--border`, active filled `--primary`, next arrow.
- **Price range slider:** two thumbs on a `--primary` track, label `Preço: 0.02 - 12.30 ETH`, "Aplicar" button; values are decimal strings.
- **Sidebar facets:** list of copper items with right-aligned counts in parentheses (Coleções, Rede).
- **Modal (auth):** `--card` surface, square, close "X" in `--primary`, tab header `Entrar | Criar conta` (active in `--highlight`, separated by a vertical primary rule). Add a dimmed scrim and focus trap (the frame shows none — record as a deviation).
- **Carousels:** hero (3 dots) and the two product carousels use scroll-snap lists with dots as real buttons, **no autoplay**, active dot `--primary`, inactive `--border` (❓).
- **Footer (all desktop pages):** feature band on `--card` with 4 columns separated by 1px primary dividers (circular primary badges W / C / D, title, text, newsletter); brand strip on `--surface-band`; link columns; copyright centered.
- **Skeleton + shimmer:** `--card` → `--surface-raised` gradient, same dimensions as the final content, disabled under `prefers-reduced-motion`.

## 7. Screens (frames available vs. to build)

| Screen | Desktop frame | Mobile frame | Notes |
| --- | --- | --- | --- |
| Início | ✅ | ✅ | Hero, sidebar (Coleções, Faixa de preço, Rede), "NFT em destaque", grid 3×3, pagination, promo banners, "Diário da Cunhagem", newsletter, footer |
| Detalhes do NFT | ✅ | ✅ | Breadcrumb, vertical thumbnails + main image (zoom icon), title/price/rating, description, edition chips, quantity, buy/favorite, tabs (Detalhes / Avaliações), "Mais desta coleção" |
| Carrinho | ✅ | ✅ | Table (NFTs, Preço, Edições, Total) + "Resumo da carteira" (coupon, subtotal, discount, network fee, total) + "Colecionadores também viram" |
| Pagamento | ✅ | ✅ | Collector profile form + "Seus NFTs" summary + "Carteira e rede" + "Confirmar compra" |
| Login / Cadastro | ✅ modal (Entrar tab) | ✅ full screen (Entrar) | **Cadastro tab frame missing** (❓) |
| Confirmação de pedido | ❌ | ❌ | Compose from existing components; works on mobile |
| Perfil, Carteiras | ❌ | ❌ | Compose from existing components; works on mobile |

Screens without a frame follow the same patterns (surface cards, bordered inputs, primary buttons); record each choice in `ARCHITECTURE.md` §13.

Mobile specifics ✅: search input "Explorar coleções" + filter button on top, hero card, tabs, **2-column** grid, **bottom navigation (5 icons)**, back arrow headers on inner screens, sticky bottom action bar on detail (Qtd. stepper, price, "Comprar NFT", cart button) and cart/checkout.

## 8. Data implied by the design (use in contracts and fixtures)

- NFT: `id`, `tokenId` (`#0042`), `name` (`Emerald Ape #042`), `collection` (`Kurio Apes`), `category` (Arte digital, Fotografia, Música, Arte 3D, Colecionáveis, Generativa, Jogos, Assinaturas, Utilidade), `network` (Ethereum, Polygon, Solana), `price` (string), `compareAtPrice?` (old price), `rarity?` (RARO badge), `isNew`, trend flag, `rating {average, count}`, `attributes`, `description`, gallery images, `editions[]` (chips such as `1/10`, `1/50`, `ABERTA` — ❓ confirm semantics; cart item identity = NFT + edition).
- Facets returned by the list endpoint: category counts, network counts, price min/max.
- Cart/order: lines with quantity, unit price, line total; quote with subtotal, discount ("Desconto do lançamento"), network fee ("Taxa estimada"), total.
- **Reference scenario** (reproduce exactly in fixtures for visual regression): Emerald Ape #042 ×2 @ 1.19 = 2.38 · Violet Nomad #314 ×6 @ 1.39 = 8.34 · Ivory Baron #088 ×9 @ 1.79 = 16.11 · subtotal 26.83 · discount 0.00 · network fee 0.016 · **total 26.846 ETH**.
- Wallets: `Reserva` (`nova.kurio.eth`, Polygon) and `Principal` (`0xA3F…82C`, Ethereum); providers MetaMask, WalletConnect, Coinbase Wallet.
- Values from the API are rendered as received (no rounding); prices use a **dot** as decimal separator everywhere.

## 9. Behavior of out-of-scope and undesigned elements

- **Mercado** links to the catalog (`/` anchored at the catalog) and stays highlighted on detail, cart, checkout and favorites; **Início** is active only on `/`.
- **Criadores, Aprenda, footer link columns, "Diário da Cunhagem" cards, "Explorar →" banners, "Esqueceu a senha?", "Trocar carteira" extras, "Atividade"**: link to a single "indisponível nesta demonstração" page (or `aria-disabled` with explanatory tooltip). Never imply success.
- **Newsletter "Enviar"** and **Google/Facebook** buttons: visible but show an inline "indisponível nesta demonstração" message; no fake success.
- **Share icons:** open the network's share URL in a new tab with `rel="noopener noreferrer"`.
- **Editorial teasers** (Diário da Cunhagem, promo copy) are static UI copy in `src/content/`; all business data (NFTs, counts, ratings, reviews, prices) comes from the API.
- **Reviews tab:** read-only list from fixtures (❓ frame missing); no review creation.
- **Cart badge:** total number of units, capped at `99+` (the frame shows "6" for a cart that does not match; record it).
- **Authenticated header** (❓ not designed): replace "Entrar" with an account menu (Meu perfil, Carteiras, Favoritos, Sair) in the same button style.
- **Favorites:** `/favoritos` reuses the card grid (needed by the mobile heart tab).

## 10. Known inconsistencies in the Figma and how to handle them

| Issue | Handling |
| --- | --- |
| "Ordenar por" chevron overlaps the selected text; missing space after "por:" | Add padding/spacing; record as deviation |
| Row 3 / middle card in Início has no title or price | Render complete content from fixtures |
| Facet counts disagree (categories sum 239, networks 283) | Counts come from the API and must be consistent in fixtures |
| Cart badge "6" does not match the cart | Units rule above |
| Desktop wallet list: first option is a combined "METAMASK · WALLETCONNECT · COINBASE" pill | Treat as **WalletConnect**; Coinbase pre-selected in Figma is only an example state |
| Desktop checkout uses free-form wallet fields; mobile lists registered wallets | Use registered wallets (prefilled); "Usar outra carteira?" reveals manual address entry validated per network (0x for Ethereum/Polygon, base58 for Solana) |
| Unlabeled field next to "Endereço da carteira" (placeholder "ENS ou carteira secundária (opcional)") | Add a visible label |
| "Código de indicação*" and "Nome ENS*" marked required | Follow the layout; prefill from the user's fixture profile and document the codes in `README.md` |
| Checkout has no review step | "Confirmar compra" opens a review dialog (items, quote, wallet, network) with a final confirm; changes require re-confirmation |
| Login modal has no scrim | Add scrim, focus trap, Esc to close |
| Mobile frame is 414px; required viewport is 390 | Fluid layout, verify both |
| Price filter label uses a comma (`0,02 - 12,30`) while prices use a dot | Use a dot everywhere |
| Resting input border contrast 1.34:1 | Keep, documented trade-off (see §2) |

## 11. Accessibility notes specific to this design

- Focus ring `--primary` 2px with offset on every interactive element; visible on cards' hover actions via `:focus-within`.
- Touch targets ≥ 24×24px (carousel dots need a larger hit area than the 8px visual dot).
- Required fields: asterisk + `aria-required`; errors in `--destructive` plus text/icon (never color alone), associated with `aria-describedby`.
- Hero image is the LCP: fixed width/height, `fetchpriority="high"`, preloaded; no layout shift from skeletons.
- Respect `prefers-reduced-motion` for shimmer, carousel scrolling and hover transitions.

## 12. Reference files

Commit the Figma exports (PNG 2x) to `design/reference/` using these names: `desktop-inicio.png`, `desktop-detalhes.png`, `desktop-carrinho.png`, `desktop-pagamento.png`, `desktop-login.png`, `mobile-inicio.png`, `mobile-detalhes.png`, `mobile-carrinho.png`, `mobile-pagamento.png`, `mobile-login.png`. Export the logo and NFT artwork to `src/assets/` (or `public/assets/`) and reference them from fixtures.

## 13. Open items (need Figma input)

- Cadastro (Criar conta) tab and its fields · Avaliações tab · error and disabled states · authenticated header · tablet behavior · exact values for 📏 typography and radii (text styles list from Figma).
