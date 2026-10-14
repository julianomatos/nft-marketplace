import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('primitive controls expose accessible states and behavior', async ({
  page,
}) => {
  await page.goto('/e2e/ui-primitives.html')

  await expect(
    page.getByRole('heading', { name: 'Componentes base' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvando' })).toBeDisabled()
  await expect(page.getByText('RARO')).toBeVisible()

  const name = page.getByRole('textbox', { name: 'Nome' })
  await expect(name).toHaveAttribute('required', '')
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(name).toHaveAttribute('aria-describedby', /collector-name-error/)
  await expect(page.getByText('Informe seu nome.')).toHaveAttribute(
    'role',
    'alert',
  )

  await page.getByLabel('Rede').selectOption('ethereum')
  await expect(page.getByLabel('Rede')).toHaveValue('ethereum')
  await page.getByLabel('Aceito os termos').check()
  await page.getByLabel('MetaMask').check()
  await page.getByRole('button', { name: 'Aumentar Quantidade' }).click()
  await expect(
    page.getByRole('group', { name: 'Quantidade' }).locator('output'),
  ).toHaveText('3')
  await expect(
    page.getByRole('button', { name: 'Aumentar Quantidade' }),
  ).toBeDisabled()

  const detailsTab = page.getByRole('tab', { name: 'Detalhes' })
  await detailsTab.focus()
  await detailsTab.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Avaliações' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('tabpanel')).toHaveText('Avaliações disponíveis.')

  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page.getByText('Página 2 de 3')).toBeVisible()
  await page.getByRole('button', { name: 'Página 3' }).click()
  await expect(page.getByText('Página 3 de 3')).toBeVisible()
  await page.getByRole('button', { name: 'Página 2' }).click()
  await expect(page.getByText('Página 2 de 3')).toBeVisible()

  const minimumPrice = page.getByRole('slider', { name: 'Preço: mínimo' })
  await minimumPrice.press('ArrowRight')
  await expect(minimumPrice).toHaveValue('0.13')
  await expect(minimumPrice).toHaveAttribute('aria-valuetext', '0.13 ETH')

  const dialogTrigger = page.getByRole('button', { name: 'Abrir diálogo' })
  await dialogTrigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(dialogTrigger).toBeFocused()

  await page.getByRole('button', { name: 'Abrir painel' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Painel de teste' }),
  ).toBeVisible()
  await page
    .getByRole('dialog', { name: 'Painel de teste' })
    .getByRole('button', { name: 'Fechar' })
    .click()
  await expect(
    page.getByRole('dialog', { name: 'Painel de teste' }),
  ).toBeHidden()

  await expect(page.getByTestId('skeleton')).toBeVisible()
  const feedback = page.getByRole('region', { name: 'Loading and feedback' })
  await expect(
    feedback.getByRole('heading', { name: 'Nenhum item encontrado' }),
  ).toBeVisible()
  await expect(
    feedback.getByRole('alert').filter({ hasText: 'Falha ao carregar' }),
  ).toContainText('Não foi possível carregar os dados.')
  await expect(
    feedback.getByRole('status').filter({ hasText: 'Ação concluída.' }),
  ).toHaveAttribute('aria-live', 'polite')
  await expect(
    feedback.getByRole('alert').filter({ hasText: 'Falha ao salvar.' }),
  ).toHaveAttribute('aria-live', 'assertive')
  await feedback.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(feedback.getByTestId('retry-count')).toHaveText('Tentativas: 1')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const animationName = await page
    .getByTestId('skeleton')
    .evaluate((element) => getComputedStyle(element).animationName)
  expect(animationName).toBe('none')
  await page.getByRole('button', { name: 'Fechar aviso' }).click()
  await expect(page.getByText('Ação concluída.')).toHaveCount(0)
})

test('primitive test page has no axe accessibility violations', async ({
  page,
}) => {
  await page.goto('/e2e/ui-primitives.html')

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
