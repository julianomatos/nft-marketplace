# Marketplace de NFTs

Demo de frontend de um marketplace de NFTs construído com React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Router/Query, Axios e MSW. A API REST e o serviço Socket.IO são mocks determinísticos no navegador; este projeto não se conecta a um backend real de pagamento, carteira, blockchain ou marketplace.

## Requisitos e configuração

- Node.js `>=22.19` (`.nvmrc` seleciona `22.19.0`)
- npm
- Playwright Chromium para testes de navegador e Lighthouse

```sh
npm ci
npx playwright install chromium
npm run dev
```

Abra a URL exibida pelo Vite. O ambiente de desenvolvimento habilita o MSW por padrão. O arquivo `public/mockServiceWorker.js` está commitado e também é incluído na build de produção/demo.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o Vite com mocks do navegador habilitados |
| `npm run build` | Executa a verificação de tipos do TypeScript e cria a build de produção |
| `npm run preview` | Serve a build localmente; execute `npm run build` antes |
| `npm run typecheck` | Executa a checagem de tipos sem gerar arquivos |
| `npm run lint` | Executa o ESLint |
| `npm run test:unit` | Executa testes de REST/contrato/store usando o projeto Node do Playwright |
| `npm run test:e2e` | Executa os projetos Chromium para desktop e mobile do Playwright |
| `npm run test:e2e:update` | Atualiza os snapshots visuais intencionalmente |

## Variáveis de ambiente

Copie `.env.example` para `.env` apenas quando precisar de substituições locais. O Vite carrega arquivos de ambiente específicos do modo; `.env.development` e `.env.production` habilitam os mocks para as builds local e de demo.

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` nos modos de desenvolvimento e produção | Inicia o worker do MSW no navegador antes de montar a aplicação |
| `VITE_MOCK_SCENARIO` | `success` | Cenário inicial determinístico do MSW, usado quando nenhum cenário já está persistido |
| `VITE_API_BASE_URL` | `/api` | URL base usada pelo cliente REST Axios |

O modo de produção é uma demonstração baseada em mocks, não uma integração real com backend de produção. Desabilitar os mocks sem fornecer uma API e serviço Socket.IO compatíveis deixará as requisições de API sem resposta.

### Roteamento SPA na Vercel

O `vercel.json` reescreve as rotas da aplicação para `/` enquanto mantém intocados os caminhos de `/api/`, `/assets/`, o worker do MSW, favicon e `robots.txt`. Isso é necessário porque a aplicação usa roteamento do lado do cliente (*client-side routing*); teste a navegação direta e o recarregamento (*refresh*) em rotas aninhadas após a implantação. O deploy publicado passou por testes de fumaça (*smoke tests*) para acesso direto a rotas, redirecionamentos de login em rotas protegidas, respostas de API mockadas do catálogo e carregamento das artes de NFT.

## Contas de demonstração

Estas contas são fictícias e válidas apenas nos dados mockados locais:

| Nome | E-mail | Senha |
| --- | --- | --- |
| Ana Oliveira | `ana@kurio.example.test` | `KurioDemo!A2026` |
| Caio Martins | `caio@kurio.example.test` | `KurioDemo!B2026` |

Os dados de fixtures contêm hashes de senha em SHA-256 com *salt*, não senhas em texto simples. Não reutilize estas credenciais de demonstração em outros lugares.

## Cenários de mock e reinicialização

Os cenários podem ser selecionados com `VITE_MOCK_SCENARIO` ou através de um parâmetro de consulta na URL. Por exemplo, inicie a aplicação e abra `/?mockScenario=empty` para reiniciar e carregar o cenário de catálogo vazio antes do MSW iniciar. Um cenário definido via URL se sobrepõe à configuração de ambiente. Sem a sobreposição por URL, o estado mockado existente persiste entre os recarregamentos.

Durante o desenvolvimento, reinicie todo o estado dos mocks pelo console do navegador:

```js
window.__KURIO_MOCKS__.reset('success')
```

A estrutura de teste (*harness*) também expõe controles de relógio, latência e timeout dos mocks:

```js
window.__KURIO_MOCKS__.setMockTime('2026-07-29T12:00:00.000Z')
window.__KURIO_MOCKS__.advanceMockTime(60_000)
window.__KURIO_MOCKS__.setLatency(500)
window.__KURIO_MOCKS__.setTimeoutResponseDelay(16_000)
```

`setLatency` aceita de 0 a 15.000 ms; `setTimeoutResponseDelay` aceita de 0 a 60.000 ms. Os utilitários (*helpers*) do Playwright em `e2e/mock-helpers.ts` fornecem redefinição de cenário e controle determinístico de relógio/latência para os testes.

Nomes dos cenários disponíveis:

| Cenário | O que demonstra |
| --- | --- |
| `success` | Catálogo padrão e fluxos de usuário bem-sucedidos |
| `empty` | Resultado de catálogo vazio |
| `design-cart` | Carrinho de referência preenchido para finalização da compra (*checkout*) |
| `expired-session` | Token expirado e recuperação de autenticação |
| `network-error` | Falha na requisição em nível de rede |
| `server-error` | Falha de serviço com HTTP 503 |
| `unauthorized` | HTTP 401 para requisições de API privadas |
| `signup-conflict` | Cadastro com e-mail já utilizado |
| `validation-error` | Erros de validação de formulário/API |
| `invalid-coupon` | Cupom rejeitado como inválido |
| `expired-coupon` | Tratamento de expiração de cupom |
| `price-changed` | Alteração de preço antes da validação do pedido; é necessária uma nova cotação |
| `sold-out` | Edição torna-se indisponível antes da validação do pedido |
| `timeout-after-order` | Pedido é criado, a resposta expira (*timeout*) e uma nova tentativa idempotente o recupera |
| `payment-confirmed` | Confirmação de pedido e eventos de atualização de estoque |
| `payment-rejected` | Pagamento rejeitado e caminho de nova tentativa |
| `variable-latency` | Requisições concorrentes finalizam fora de ordem |

## Reproduzindo fluxos de falha e recuperação

Selecione o cenário adicionando `?mockScenario=<scenario>` à URL da rota. Se você já estiver na aplicação, recarregue a página após definir o cenário. Use um contexto limpo do navegador ou reinicie o cenário entre os fluxos para evitar que o estado mockado persistido afete o resultado.

1. **Catálogo vazio/erro/nova tentativa:** use `/?mockScenario=empty`, `/?mockScenario=network-error` ou `/?mockScenario=server-error`. O estado vazio deve aparecer para `empty`; o estado de erro deve fornecer uma nova tentativa para os casos de falha. `variable-latency` reproduz respostas de API fora de ordem.
2. **Sessão expirada ou não autorizada:** selecione `expired-session`, faça login com uma conta de demonstração e abra uma rota protegida como `/carrinho`. Verifique o redirecionamento por expiração e a limpeza de dados privados. `unauthorized` rejeita requisições de API privadas e é útil para verificar erros visíveis da API.
3. **Conflito no cadastro e validação:** use `signup-conflict` para enviar um e-mail já cadastrado a partir de `/signup`; use `validation-error` para exercitar o feedback de validação de campos/API.
4. **Erros de cupom:** comece com `/?mockScenario=invalid-coupon` ou `/?mockScenario=expired-coupon`, faça login, abra `/carrinho` e aplique um cupom. Verifique a mensagem de erro da API e a recuperação.
5. **Mudança de preço ou edição esgotada:** abra `/?mockScenario=price-changed` ou `/?mockScenario=sold-out`, faça login e inicie o checkout a partir do carrinho de referência. A validação do pedido deve rejeitar a cotação antiga e exigir a aceitação explícita de uma nova cotação; ela não deve confirmar uma compra utilizando totais desatualizados.
6. **Timeout e recuperação idempotente:** use `timeout-after-order` e conclua o checkout. A resposta inicial é atrasada além do timeout padrão de 15 segundos do Axios após a criação do pedido. Tente novamente usando a mesma chave de idempotência; o pedido existente deve ser recuperado em vez de duplicado. Para execuções manuais mais curtas, defina `window.__KURIO_MOCKS__.setTimeoutResponseDelay(...)` antes de iniciar o checkout.
7. **Resultado do pagamento:** use `payment-confirmed` ou `payment-rejected` e conclua o checkout. A confirmação deve renderizar o comprovante e atualizar o estoque; a rejeição deve preservar o carrinho e oferecer uma opção de nova tentativa.
8. **Reconciliação em tempo real:** use `price-changed`, `sold-out` ou um cenário de pagamento enquanto a aplicação estiver conectada. Mudanças mockadas via REST publicam eventos do Socket.IO; a interface deve reconciliar o estado e anunciar as alterações relevantes com acessibilidade. `variable-latency` pode ser usado separadamente para exercitar a ordenação de requisições.

A implementação do Socket.IO é um transporte de demonstração no navegador fornecido pelo `@mswjs/socket.io-binding`; não é um servidor Socket.IO de produção. Eventos privados de pedidos usam o token de inscrição mockado e são filtrados por ID de usuário.

## Testes e cobertura atual

`npm run test:unit` exercita contratos, fixtures, store de mock e manipuladores REST através do Axios/MSW Node. `npm run test:e2e` executa fluxos de navegador no Chromium desktop e mobile, incluindo catálogo, autenticação, favoritos, carrinho, checkout/pedido, perfil/carteira e comportamento em tempo real. Os testes de navegador reiniciam o estado de mock isoladamente e usam utilitários determinísticos em vez de pausas fixas (*sleeps*). 