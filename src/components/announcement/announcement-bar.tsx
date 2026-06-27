/**
 * AnnouncementBar — a thin notice strip pinned to the top of the main app
 * (§ announcement bar). Driven by the same GET /api/announcement config as the
 * popup but independent: it renders when `bar_enabled` is set, shows the admin's
 * HTML (links allowed, sanitized), and is dismissible per-version (editing the
 * bar bumps `bar_updated_at` so it re-appears for everyone who closed the old
 * one). Returns null when there's no active bar, so it adds no chrome otherwise.
 */
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Megaphone, X } from 'lucide-react'
import { authApi } from '@/api'
import { useAuth } from '@/store/auth'
import { sanitizeHtml } from '@/lib/markdown'

const BAR_DISMISS_KEY = 'aurelia.announcement.bar.dismissed'

export function AnnouncementBar() {
  const { t } = useTranslation('common')
  const status = useAuth((s) => s.status)
  const [data, setData] = useState<{ html: string; version: number } | null>(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (status !== 'authenticated' || fetchedRef.current) return
    fetchedRef.current = true
    let cancelled = false
    authApi
      .announcement()
      .then((a) => {
        if (cancelled || !a.bar_enabled || !a.bar_html?.trim()) return
        const version = a.bar_updated_at ?? 0
        if (localStorage.getItem(BAR_DISMISS_KEY) === String(version)) return
        setData({ html: a.bar_html, version })
      })
      .catch(() => {
        /* missing/blocked announcement → no bar */
      })
    return () => {
      cancelled = true
    }
  }, [status])

  if (!data) return null

  function dismiss() {
    try {
      localStorage.setItem(BAR_DISMISS_KEY, String(data!.version))
    } catch {
      /* ignore quota / privacy-mode errors */
    }
    setData(null)
  }

  return (
    <div className="shrink-0 w-full border-b border-[var(--color-border)] bg-[var(--color-accent-soft)] text-[var(--color-fg)]">
      <div className="mx-auto flex w-full max-w-[var(--layout-content-max-w)] items-center gap-2.5 px-4 sm:px-6 py-2">
        <Megaphone size={14} strokeWidth={1.5} aria-hidden className="shrink-0 text-[var(--color-accent)]" />
        <div
          className="min-w-0 flex-1 text-[13px] leading-snug break-words [&_a]:font-medium [&_a]:text-[var(--color-accent)] [&_a]:underline [&_a]:underline-offset-2"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.html) }}
        />
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('common.close', { defaultValue: 'Close' })}
          className="shrink-0 inline-flex items-center justify-center size-7 rounded-[7px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)]/50 hover:text-[var(--color-fg)] interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    </div>
  )
}
