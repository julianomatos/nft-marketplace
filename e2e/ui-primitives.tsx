import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog } from '@/components/ui/dialog'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { Radio } from '@/components/ui/radio'
import { RangeSlider } from '@/components/ui/range-slider'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs } from '@/components/ui/tabs'
import { Toast } from '@/components/ui/toast'
import '@/index.css'

function UiPrimitivesSmokePage() {
  const [quantity, setQuantity] = useState(2)
  const [page, setPage] = useState(1)
  const [priceRange, setPriceRange] = useState<[string, string]>([
    '0.12',
    '0.74',
  ])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toastOpen, setToastOpen] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  return (
    <main className="mx-auto grid max-w-300 gap-8 px-6 py-8">
      <h1 className="text-2xl font-bold">Componentes base</h1>

      <section aria-label="Buttons and badge" className="flex flex-wrap gap-3">
        <Button>Continuar</Button>
        <Button loading loadingLabel="Salvando">
          Salvar
        </Button>
        <Button disabled variant="outline">
          Indisponível
        </Button>
        <Badge>RARO</Badge>
      </section>

      <section aria-label="Form fields" className="grid max-w-lg gap-4">
        <Input
          error="Informe seu nome."
          id="collector-name"
          label="Nome"
          required
        />
        <Select id="network" label="Rede" required defaultValue="">
          <option disabled value="">
            Selecione uma rede
          </option>
          <option value="ethereum">Ethereum</option>
          <option value="polygon">Polygon</option>
        </Select>
        <Checkbox label="Aceito os termos" required />
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-xs font-medium text-foreground">
            Carteira
          </legend>
          <Radio label="MetaMask" name="wallet" required value="metamask" />
          <Radio label="Coinbase" name="wallet" value="coinbase" />
        </fieldset>
      </section>

      <section aria-label="Quantity and tabs" className="grid gap-4">
        <QuantityStepper
          label="Quantidade"
          max={3}
          onValueChange={setQuantity}
          value={quantity}
        />
        <Tabs
          ariaLabel="Detalhes do NFT"
          defaultValue="details"
          items={[
            {
              value: 'details',
              label: 'Detalhes',
              content: <p>Descrição da peça.</p>,
            },
            {
              value: 'reviews',
              label: 'Avaliações',
              content: <p>Avaliações disponíveis.</p>,
            },
          ]}
        />
      </section>

      <section aria-label="Pagination and price range" className="grid gap-4">
        <Pagination
          label="NFTs"
          onPageChange={setPage}
          page={page}
          totalPages={3}
        />
        <RangeSlider
          label="Preço"
          max="12.30"
          min="0.02"
          onValueChange={setPriceRange}
          step="0.01"
          value={priceRange}
        />
      </section>

      <section aria-label="Dialog and drawer" className="flex gap-3">
        <Button onClick={() => setDialogOpen(true)} type="button">
          Abrir diálogo
        </Button>
        <Button onClick={() => setDrawerOpen(true)} type="button" variant="outline">
          Abrir painel
        </Button>
        <Dialog
          description="Conteúdo do diálogo."
          onOpenChange={setDialogOpen}
          open={dialogOpen}
          title="Diálogo de teste"
        >
          <p>Esta ação pode ser fechada com Escape.</p>
        </Dialog>
        <Drawer
          description="Conteúdo do painel."
          onOpenChange={setDrawerOpen}
          open={drawerOpen}
          title="Painel de teste"
        >
          <p>O painel é responsivo e modal.</p>
        </Drawer>
      </section>

      <section aria-label="Loading and feedback" className="grid gap-4">
        <Skeleton className="h-8 w-32" data-testid="skeleton" />
        <EmptyState
          description="Novos itens aparecerão aqui quando estiverem disponíveis."
          title="Nenhum item encontrado"
        />
        <ErrorState
          description="Não foi possível carregar os dados."
          onRetry={() => setRetryCount((count) => count + 1)}
          title="Falha ao carregar"
        />
        <p data-testid="retry-count">Tentativas: {retryCount}</p>
        <Toast
          message="Ação concluída."
          onDismiss={() => setToastOpen(false)}
          open={toastOpen}
          variant="info"
        />
        <Toast message="Falha ao salvar." open variant="error" />
      </section>
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('UI primitives test root is missing.')

createRoot(root).render(
  <StrictMode>
    <UiPrimitivesSmokePage />
  </StrictMode>,
)

export { UiPrimitivesSmokePage }
