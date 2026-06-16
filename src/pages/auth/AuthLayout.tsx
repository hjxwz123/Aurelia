import { Outlet, Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { Logo, LogoMark } from '@/components/brand/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useTheme } from '@/store/theme'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

export default function AuthLayout() {
  const syncSystem = useTheme((s) => s.syncSystem)
  const { t } = useTranslation('common')
  useEffect(() => syncSystem(), [syncSystem])

  const root = useRef<HTMLDivElement>(null)

  // All entrance motion via GSAP (consistent with the welcome page), gated by
  // prefers-reduced-motion. Elements keep their natural visible state under
  // "reduce"; useGSAP reverts everything on unmount.
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        tl.from('.auth-ring', { scale: 0.5, autoAlpha: 0, duration: 1.1, stagger: 0.1 })
          .from('.auth-logo', { scale: 0.8, autoAlpha: 0, duration: 0.7 }, '-=0.7')
          .from('.auth-name', { yPercent: 120, duration: 0.85 }, '-=0.35')
          .from('.auth-tagline', { y: 10, autoAlpha: 0, duration: 0.6 }, '-=0.45')
          .from('.auth-card', { y: 18, autoAlpha: 0, duration: 0.6 }, '-=0.5')
        // A single accent point orbits the rings — calm ambient motion.
        gsap.to('.auth-orbit', { rotate: 360, duration: 90, ease: 'none', repeat: -1 })
      })
    },
    { scope: root },
  )

  return (
    <div ref={root} className="relative min-h-svh w-full overflow-hidden bg-[var(--color-bg)] text-[var(--color-fg)] flex">
      {/* ── Left brand panel (hidden on mobile) ─────────────────────── */}
      <aside className="hidden lg:flex w-[50%] min-h-svh relative overflow-hidden flex-col items-center justify-center bg-[var(--color-surface-sunken)]">
        <AuroraBackground />

        {/* Concentric rings + one orbiting accent for quiet editorial depth. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
          {[420, 600, 800].map((s) => (
            <div
              key={s}
              className="auth-ring absolute rounded-full border border-[var(--color-border)]/55"
              style={{ width: s, height: s }}
            />
          ))}
          <div className="auth-orbit absolute" style={{ width: 600, height: 600 }}>
            <span className="absolute left-1/2 top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-secondary)] shadow-[0_0_12px_var(--color-secondary)]" />
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <div className="auth-logo">
            <LogoMark size={60} />
          </div>

          <span className="mt-6 block overflow-hidden pb-[0.08em]">
            <span className="auth-name block font-serif text-[2rem] xl:text-[2.5rem] tracking-tight text-[var(--color-fg)]">
              {t('appName')}
            </span>
          </span>

          <p className="auth-tagline mt-3 text-sm text-[var(--color-fg-subtle)] tracking-wide">
            {t('tagline')}
          </p>
        </div>
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

/**
 * AuroraBackground — soft, slowly-moving glow field. Canvas with gentle
 * floating orbs that drift and pulse. Falls back to a static CSS gradient
 * when prefers-reduced-motion is active.
 *
 * Reads accent/secondary token colors so it adapts to light/dark + accent.
 */
function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0
    let h = 0

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2)
      const rect = canvas!.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas!.width = w * dpr
      canvas!.height = h * dpr
      ctx!.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const orbs = Array.from({ length: 5 }, (_, i) => ({
      x: w * (0.2 + Math.random() * 0.6),
      y: h * (0.15 + Math.random() * 0.7),
      r: 140 + Math.random() * 200,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.1,
      phase: Math.random() * Math.PI * 2,
      useSecondary: i >= 3,
    }))

    const style = getComputedStyle(document.documentElement)

    function draw(t: number) {
      ctx!.clearRect(0, 0, w, h)

      const accent = style.getPropertyValue('--color-accent-soft').trim()
      const secondary = style.getPropertyValue('--color-secondary-soft').trim()

      for (const orb of orbs) {
        orb.x += orb.vx
        orb.y += orb.vy
        if (orb.x < -orb.r) orb.x = w + orb.r
        if (orb.x > w + orb.r) orb.x = -orb.r
        if (orb.y < -orb.r) orb.y = h + orb.r
        if (orb.y > h + orb.r) orb.y = -orb.r

        const pulse = 0.55 + 0.45 * Math.sin(t * 0.0005 + orb.phase)
        const rad = orb.r * pulse

        const grad = ctx!.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, rad)
        grad.addColorStop(0, orb.useSecondary ? secondary : accent)
        grad.addColorStop(1, 'transparent')
        ctx!.globalAlpha = 0.4
        ctx!.fillStyle = grad
        ctx!.beginPath()
        ctx!.arc(orb.x, orb.y, rad, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn(
          'absolute inset-0 size-full',
          'motion-safe:block motion-reduce:hidden',
        )}
      />
      {/* Static fallback for reduced-motion */}
      <div
        aria-hidden
        className="absolute inset-0 motion-safe:hidden motion-reduce:block"
        style={{
          background: 'radial-gradient(ellipse at 40% 45%, color-mix(in oklch, var(--color-accent-soft) 50%, transparent) 0%, transparent 70%), radial-gradient(ellipse at 65% 60%, color-mix(in oklch, var(--color-secondary-soft) 40%, transparent) 0%, transparent 70%)',
        }}
      />
    </>
  )
}
