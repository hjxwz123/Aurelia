/**
 * SharedConversation — the public, unauthenticated read-only view of a shared
 * conversation (§ sharing). Renders a frozen snapshot served by
 * /api/public/shared/:token. No chat stores, no auth — safe to render to anyone
 * with the link. The owner can revoke the share at any time, which 404s this.
 */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { sharedApi, ApiError } from '@/api'
import type { ApiBlock, ApiSharedConversation } from '@/api/types'
import { Logo } from '@/components/brand/logo'
import { Markdown } from '@/components/chat/markdown'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Ghost } from 'lucide-react'

function messageText(blocks: ApiBlock[]): string {
  return blocks
    .filter((b) => b.kind === 'text' && b.text)
    .map((b) => b.text as string)
    .join('\n\n')
}

export default function SharedConversation() {
  const { token = '' } = useParams<{ token: string }>()
  const { t } = useTranslation(['subscription', 'chat', 'common'])
  const [data, setData] = useState<ApiSharedConversation | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    let active = true
    sharedApi
      .get(token)
      .then((d) => {
        if (!active) return
        setData(d)
        setStatus('ready')
      })
      .catch((e) => {
        if (!active) return
        setStatus(e instanceof ApiError && e.status === 404 ? 'missing' : 'missing')
      })
    return () => {
      active = false
    }
  }, [token])

  return (
    <div className="min-h-svh w-full bg-[var(--color-bg)] text-[var(--color-fg)]">
      <header className="sticky top-0 z-10 border-b border-[var(--color-divider)] bg-[var(--color-bg)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[48rem] items-center justify-between px-5 sm:px-8 h-14">
          <Link to="/welcome" aria-label="Aurelia" className="inline-flex items-center">
            <Logo />
          </Link>
          <Button asChild variant="secondary" size="sm">
            <Link to="/welcome">{t('chat:share.tryCta')}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[48rem] px-5 sm:px-8 pt-10 pb-24">
        {status === 'loading' ? (
          <div className="text-sm text-[var(--color-fg-subtle)]">{t('common:common.loading')}</div>
        ) : status === 'missing' || !data ? (
          <div className="pt-16">
            <EmptyState
              icon={<Ghost size={22} aria-hidden />}
              title={t('chat:share.missingTitle')}
              description={t('chat:share.missingBody')}
              action={
                <Button asChild variant="secondary">
                  <Link to="/welcome">{t('chat:share.tryCta')}</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="mb-2 text-[12px] uppercase tracking-[0.08em] text-[var(--color-fg-subtle)]">
              {t('chat:share.eyebrow')}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-[var(--color-fg)] text-balance">
              {data.title || t('chat:share.untitled')}
            </h1>
            <div className="mt-10 flex flex-col gap-8">
              {data.messages.map((m, i) => {
                const text = messageText(m.blocks)
                if (!text) return null
                return (
                  <article key={i} className="flex flex-col gap-1.5">
                    <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">
                      {m.role === 'user' ? t('chat:share.roleUser') : t('chat:share.roleAssistant')}
                    </div>
                    {m.role === 'user' ? (
                      <div className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap">
                        {text}
                      </div>
                    ) : (
                      <div className="text-[15px] leading-relaxed">
                        <Markdown content={text} blockKeyPrefix={`share-${i}`} />
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
            <footer className="mt-16 border-t border-[var(--color-divider)] pt-6 text-center text-[12px] text-[var(--color-fg-subtle)]">
              {t('chat:share.footer')}
            </footer>
          </>
        )}
      </main>
    </div>
  )
}
