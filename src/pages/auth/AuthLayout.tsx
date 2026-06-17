import { Outlet, Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { Logo } from '@/components/brand/logo'
import { AuthHero } from '@/components/auth/auth-hero'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useTheme } from '@/store/theme'
import { useTranslation } from 'react-i18next'

gsap.registerPlugin(useGSAP)

export default function AuthLayout() {
  const syncSystem = useTheme((s) => s.syncSystem)
  const { t } = useTranslation('common')
  useEffect(() => syncSystem(), [syncSystem])

  const root = useRef<HTMLDivElement>(null)

  // The brand panel owns its own (richer) motion in AuthHero; here we only ease
  // the form card in. Gated by prefers-reduced-motion; useGSAP reverts on unmount.
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.auth-card', { y: 18, autoAlpha: 0, duration: 0.6, delay: 0.15, ease: 'power3.out' })
      })
    },
    { scope: root },
  )

  return (
    <div ref={root} className="relative min-h-svh w-full overflow-hidden bg-[var(--color-bg)] text-[var(--color-fg)] flex">
      {/* ── Left brand panel (hidden on mobile) ─────────────────────── */}
      <aside className="hidden lg:block w-[50%] min-h-svh">
        <AuthHero />
      </aside>

      {/* ── Right form panel ────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col min-h-svh relative">
        {/* Mobile-only background glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 lg:hidden">
          <div
            className="absolute -top-40 left-1/2 -translate-x-1/2 size-[640px] rounded-full opacity-40 blur-3xl"
            style={{ background: 'radial-gradient(closest-side, color-mix(in oklch, var(--color-accent-soft) 70%, transparent), transparent 70%)' }}
          />
        </div>

        <header className="flex items-center justify-between px-5 sm:px-8 h-16">
          <Link to="/" aria-label={t('appName')} className="lg:invisible">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 grid place-items-center px-5 py-10">
          <div className="auth-card w-full max-w-[420px]">
            <Outlet />
          </div>
        </main>

        <footer className="px-5 sm:px-8 py-6 text-center text-xs text-[var(--color-fg-subtle)] lg:hidden">
          © {new Date().getFullYear()} {t('appName')}
        </footer>
      </div>
    </div>
  )
}
