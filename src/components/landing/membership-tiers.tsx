import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, ArrowRight, Sparkles, FolderClosed, Library } from 'lucide-react'
import { groupsApi } from '@/api'
import type { ApiUserGroup } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type T = (key: string, opts?: Record<string, unknown>) => string

// Human label for a credit-refresh cycle, bucketed from seconds.
function periodLabel(t: T, seconds: number): string {
  const day = 86400
  if (seconds >= 28 * day) return t('landing:membership.perMonth')
  if (seconds >= 6 * day) return t('landing:membership.perWeek')
  if (seconds >= 20 * 3600) return t('landing:membership.perDay')
  return t('landing:membership.perCycle')
}

function FeatureRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center text-[var(--color-secondary)]">
        {icon}
      </span>
      <span className="text-[13.5px] leading-relaxed text-[var(--color-fg-muted)]">{children}</span>
    </li>
  )
}

/**
 * MembershipTiers — the public membership-tier (user-group) showcase on the
 * landing page (§ user groups). Tiers come from the read-only public endpoint
 * so they render pre-login. Editorial, token-driven; the entry paid tier (or the
 * default when all are free) is highlighted as recommended.
 */
export function MembershipTiers() {
  const { t, i18n } = useTranslation(['landing', 'common'])
  const [groups, setGroups] = useState<ApiUserGroup[] | null>(null)

  useEffect(() => {
    let active = true
    groupsApi
      .publicList()
      .then((g) => active && setGroups(g))
      .catch(() => active && setGroups([]))
    return () => {
      active = false
    }
  }, [])

  // Nothing configured / fetch failed → hide the whole section (no empty shell).
  if (groups !== null && groups.length === 0) return null

  const sorted = (groups ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
  const recommendedId =
    sorted.find((g) => g.price_usd > 0 || g.price_cny > 0)?.id ?? sorted.find((g) => g.is_default)?.id ?? ''
  const zh = i18n.language.startsWith('zh')

  return (
    <section id="pricing" className="py-24 sm:py-32 border-t border-[var(--color-divider)]">
      <div className="mx-auto max-w-[76rem] px-5 sm:px-8">
        <div className="max-w-2xl" data-reveal>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
            {t('landing:membership.eyebrow')}
          </div>
          <h2 className="mt-3 font-serif tracking-tight text-3xl sm:text-4xl text-[var(--color-fg)] text-balance">
            {t('landing:membership.title')}
          </h2>
          <p className="mt-5 text-[var(--color-fg-muted)] leading-relaxed text-pretty">
            {t('landing:membership.body')}
          </p>
        </div>

        {groups === null ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[22rem] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div
            className={cn(
              'mt-12 grid gap-5 sm:grid-cols-2',
              sorted.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
            )}
          >
            {sorted.map((g, i) => {
              const rec = g.id === recommendedId
              const free = g.price_usd <= 0 && g.price_cny <= 0
              const price = zh ? g.price_cny : g.price_usd
              const cur = zh ? '¥' : '$'
              return (
                <div
                  key={g.id}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className={cn(
                    'relative flex flex-col rounded-2xl border bg-[var(--color-surface)] p-6 sm:p-7',
                    'animate-[message-in_420ms_var(--ease-out)_both]',
                    rec
                      ? 'border-[var(--color-accent)] shadow-[var(--shadow-md)]'
                      : 'border-[var(--color-border)]',
                  )}
                >
                  {rec ? (
                    <Badge
                      variant="sage"
                      size="xs"
                      leadingIcon={<Sparkles size={10} aria-hidden />}
                      className="absolute -top-2.5 left-6"
                    >
                      {t('landing:membership.recommended')}
                    </Badge>
                  ) : null}

                  <h3 className="font-serif text-2xl tracking-tight text-[var(--color-fg)]">{g.name}</h3>
                  <p className="mt-2 min-h-[2.75rem] text-[13.5px] leading-relaxed text-[var(--color-fg-muted)] text-pretty">
                    {g.description}
                  </p>

                  <div className="mt-5 flex items-baseline gap-1.5">
                    {free ? (
                      <span className="font-serif text-[2.5rem] leading-none text-[var(--color-fg)]">
                        {t('common:common.free')}
                      </span>
                    ) : (
                      <>
                        <span className="font-serif text-[2.5rem] leading-none text-[var(--color-fg)] tabular-nums">
                          {cur}
                          {price}
                        </span>
                        <span className="text-[13px] text-[var(--color-fg-subtle)]">
                          {periodLabel(t, g.credit_period_seconds)}
                        </span>
                      </>
                    )}
                  </div>

                  <Button
                    asChild
                    variant={rec ? 'primary' : 'secondary'}
                    className="mt-6 w-full"
                    trailingIcon={<ArrowRight size={14} aria-hidden />}
                  >
                    <Link to="/register">{t('landing:membership.cta')}</Link>
                  </Button>

                  <ul className="mt-6 space-y-2.5 border-t border-[var(--color-divider)] pt-6">
                    {g.credit_allowance > 0 ? (
                      <FeatureRow icon={<Sparkles size={13} aria-hidden />}>
                        {t('landing:membership.creditsPerCycle', {
                          credits: g.credit_allowance.toLocaleString(),
                          period: periodLabel(t, g.credit_period_seconds),
                        })}
                      </FeatureRow>
                    ) : null}
                    <FeatureRow icon={<FolderClosed size={13} aria-hidden />}>
                      {g.max_projects > 0
                        ? t('landing:membership.projects', { count: g.max_projects })
                        : t('landing:membership.projectsUnlimited')}
                    </FeatureRow>
                    <FeatureRow icon={<Library size={13} aria-hidden />}>
                      {g.max_kbs > 0
                        ? t('landing:membership.kbs', { count: g.max_kbs })
                        : t('landing:membership.kbsUnlimited')}
                    </FeatureRow>
                    {g.features.map((f) => (
                      <FeatureRow key={f} icon={<Check size={13} aria-hidden />}>
                        {f}
                      </FeatureRow>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}

        <p className="mt-8 text-[12px] text-[var(--color-fg-subtle)]">{t('landing:membership.footnote')}</p>
      </div>
    </section>
  )
}
