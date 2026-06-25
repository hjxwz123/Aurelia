import { Wand2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface ImageGeneratingProps {
  /** Drawing phase, driving the status label. */
  phase: 'optimizing' | 'generating'
  className?: string
}

/**
 * ImageGenerating — the §4.20 drawing-in-progress surface. Deliberately distinct
 * from the chat thinking/tool-call trace: a framed canvas with a slow accent
 * wash, a breathing brush mark, the live phase label, and a thin indeterminate
 * bar. Token-only colours, lucide icons. `prefers-reduced-motion` mutes the
 * keyframes globally; the label still communicates progress.
 */
export function ImageGenerating({ phase, className }: ImageGeneratingProps) {
  const { t } = useTranslation('chat')
  const label =
    phase === 'optimizing'
      ? t('image.optimizing', { defaultValue: 'Refining your prompt…' })
      : t('image.generating', { defaultValue: 'Painting your image…' })

  return (
    <div className={cn('my-1 w-full max-w-[20rem]', className)}>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        {/* Soft placeholder grid so the empty canvas reads as a frame, not a void. */}
        <div
          className="absolute inset-0 opacity-[0.5] [background-image:linear-gradient(var(--color-border-subtle)_1px,transparent_1px),linear-gradient(90deg,var(--color-border-subtle)_1px,transparent_1px)] [background-size:28px_28px]"
          aria-hidden
        />
        {/* Diagonal accent wash sweeping across the canvas. */}
        <div
          className="absolute inset-0 animate-[shimmer_2400ms_linear_infinite] bg-[length:1600px_100%] bg-[linear-gradient(110deg,transparent_30%,color-mix(in_oklch,var(--color-accent)_22%,transparent)_50%,transparent_70%)]"
          aria-hidden
        />
        {/* Breathing brush mark + live phase label. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <span
            className="relative grid size-12 place-items-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] animate-[streaming-pulse_1800ms_ease-in-out_infinite]"
            aria-hidden
          >
            <Wand2 size={20} strokeWidth={1.5} />
            <Sparkles
              size={12}
              strokeWidth={1.5}
              className="absolute -right-0.5 -top-0.5 text-[var(--color-secondary)]"
            />
          </span>
          <span role="status" aria-live="polite" className="text-[13px] font-medium text-[var(--color-fg-muted)]">
            {label}
          </span>
        </div>
        {/* Indeterminate progress rail. */}
        <div className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-[var(--color-border-subtle)]">
          <div
            className="h-full w-1/3 rounded-full bg-[var(--color-accent)] animate-[indeterminate_1500ms_ease-in-out_infinite]"
            aria-hidden
          />
        </div>
      </div>
    </div>
  )
}
