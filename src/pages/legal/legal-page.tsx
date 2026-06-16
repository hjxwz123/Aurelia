import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/brand/logo'

interface LegalSection {
  heading: string
  body: string
}

/**
 * LegalPage — a calm, readable standalone page for the Privacy Policy and Terms
 * of Service. Content is i18n-driven (auth namespace, `legal.<doc>`), with the
 * body sections returned as an array via returnObjects.
 */
export function LegalPage({ doc }: { doc: 'privacy' | 'terms' }) {
  const { t } = useTranslation(['auth', 'common'])
  const sections = t(`legal.${doc}.sections`, { returnObjects: true }) as LegalSection[]

  return (
    <div className="min-h-svh bg-[var(--color-bg)] text-[var(--color-fg)]">
      <header className="mx-auto flex h-16 max-w-[46rem] items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label={t('common:appName')}>
          <Logo size="md" />
        </Link>
        <Link
          to="/register"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] interactive"
        >
          <ArrowLeft size={14} aria-hidden />
          {t('auth:legal.back')}
        </Link>
      </header>
      <main className="mx-auto max-w-[46rem] px-5 sm:px-8 py-10 sm:py-14">
        <h1 className="font-serif text-3xl tracking-tight text-balance text-[var(--color-fg)] sm:text-4xl">
          {t(`auth:legal.${doc}.title`)}
        </h1>
        <p className="mt-4 max-w-[68ch] text-pretty leading-relaxed text-[var(--color-fg-muted)]">
          {t(`auth:legal.${doc}.intro`)}
        </p>
        <div className="mt-10 flex flex-col gap-8">
          {Array.isArray(sections) &&
            sections.map((s, i) => (
              <section key={i}>
                <h2 className="font-serif text-xl tracking-tight text-[var(--color-fg)]">{s.heading}</h2>
                <p className="mt-2 max-w-[68ch] text-pretty text-[15px] leading-relaxed text-[var(--color-fg-muted)]">
                  {s.body}
                </p>
              </section>
            ))}
        </div>
      </main>
    </div>
  )
}
