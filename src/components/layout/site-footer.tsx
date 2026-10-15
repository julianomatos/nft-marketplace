import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const footerGroups = [
  {
    title: 'Meu perfil',
    links: ['Perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador'],
  },
  {
    title: 'Central de ajuda',
    links: [
      'Como comprar NFTs',
      'Carteira e segurança',
      'Política do mercado',
      'Denunciar item',
    ],
  },
  {
    title: 'Coleções',
    links: ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'],
  },
]

const features = [
  {
    badge: 'W',
    title: 'Segurança da carteira',
    description: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    badge: 'C',
    title: 'Criadores em destaque',
    description: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital.',
  },
  {
    badge: 'D',
    title: 'Alertas de lançamentos',
    description: 'Receba novidades de cunhagem, lançamentos e listas de acesso.',
  },
]

function SiteFooter() {
  const [newsletterMessage, setNewsletterMessage] = useState('')

  function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNewsletterMessage(
      'O cadastro por e-mail não está disponível nesta demonstração.',
    )
  }

  return (
    <footer className="border-t border-border">
      <div className="kurio-container pt-8">
        <div className="grid gap-6 bg-card p-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:p-6">
          {features.map(({ badge, title, description }) => (
            <section
              className="border-b border-primary/60 pb-5 sm:border-r sm:pr-5 lg:border-b-0 lg:pb-0 lg:pr-5"
              key={title}
            >
              <span
                aria-hidden="true"
                className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
              >
                {badge}
              </span>
              <h2 className="text-xs font-bold text-foreground">{title}</h2>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                {description}
              </p>
            </section>
          ))}
          <section className="lg:pl-5">
            <h2 className="text-xs font-bold text-foreground">
              Antecipe-se ao próximo lançamento
            </h2>
            <form className="mt-3 flex" onSubmit={handleNewsletterSubmit}>
              <Input
                autoComplete="email"
                className="min-h-9 border-r-0 bg-surface-band text-[11px]"
                containerClassName="min-w-0 flex-1"
                id="newsletter-email"
                label="Seu e-mail"
                labelClassName="sr-only"
                name="email"
                placeholder="digite seu e-mail..."
                required
                type="email"
              />
              <Button
                className="min-h-9 shrink-0 rounded-none px-3"
                size="sm"
                type="submit"
              >
                Enviar
              </Button>
            </form>
            <p aria-live="polite" className="mt-2 min-h-5 text-[10px] text-muted-foreground">
              {newsletterMessage}
            </p>
          </section>
        </div>

        <div className="grid gap-3 bg-surface-band px-5 py-5 text-[10px] text-foreground sm:grid-cols-3 sm:items-center md:px-6">
          <Link className="font-bold tracking-widest" to="/">
            KURIO
          </Link>
          <p className="sm:text-center">
            Feito para colecionadores, criadores e cultura digital.
          </p>
          <p className="sm:text-right">Marketplace de arte digital</p>
        </div>

        <div className="grid gap-8 bg-card px-5 py-7 sm:grid-cols-2 lg:grid-cols-4 md:px-6">
          {footerGroups.map(({ title, links }) => (
            <nav aria-label={title} key={title}>
              <h2 className="mb-3 text-xs font-bold text-foreground">{title}</h2>
              <ul className="space-y-2">
                {links.map((label) => (
                  <li key={label}>
                    <Link
                      className="text-[11px] text-muted-foreground transition-colors hover:text-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      to="/indisponivel"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <section>
            <h2 className="mb-3 text-xs font-bold text-foreground">
              Redes sociais
            </h2>
            <ul aria-label="Redes sociais" className="flex gap-2">
              {[
                { label: 'Facebook', abbreviation: 'f' },
                { label: 'Instagram', abbreviation: 'ig' },
                { label: 'Twitter', abbreviation: 'X' },
                { label: 'LinkedIn', abbreviation: 'in' },
              ].map(({ label, abbreviation }) => (
                <li key={label}>
                  <Link
                    aria-label={label}
                    className="flex size-8 items-center justify-center border border-primary/60 text-highlight transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    to="/indisponivel"
                  >
                    <span aria-hidden="true" className="text-[10px] font-bold">
                      {abbreviation}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="mb-2 mt-5 text-xs font-bold text-foreground">
              Wallets compatíveis
            </h3>
            <p className="text-[9px] font-bold uppercase tracking-wide text-subtle">
              MetaMask · WalletConnect · Coinbase
            </p>
          </section>
        </div>
        <p className="py-4 text-center text-[10px] text-muted-foreground">
          © 2026 Kurio. Propriedade digital para todos.
        </p>
      </div>
    </footer>
  )
}

export { SiteFooter }
