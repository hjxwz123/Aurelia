import { cn } from '@/lib/utils'

/**
 * Capability scenes — small living illustrations for the landing capability
 * cards, drawn entirely from tokens (no images). Each loops a calm, legible
 * story: prose being written, sources converging on a claim, code being read.
 * All motion is CSS keyframes (globals.css `fx-*`), so the global
 * prefers-reduced-motion rule freezes them into clean static compositions.
 */

/** Prose lines write themselves in sequence; a caret breathes at the tail. */
export function WritingScene() {
  // Line widths echo a real paragraph's rag; the last line carries the caret.
  const lines = [92, 78, 88, 64]
  return (
    <div aria-hidden className="flex h-full w-full flex-col justify-center gap-3.5 px-8">
      <div className="mb-1 h-2.5 w-2/5 rounded-full bg-[var(--color-accent-soft)]" />
      {lines.map((w, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="h-2 origin-left rounded-full bg-[color-mix(in_oklch,var(--color-fg)_14%,transparent)] animate-[fx-write_7s_var(--ease-out)_infinite]"
            style={{ width: `${w}%`, animationDelay: `${i * 0.9}s` }}
          />
          {i === lines.length - 1 && (
            <span className="h-3.5 w-[2px] shrink-0 bg-[var(--color-accent)] animate-[fx-caret_1.1s_steps(2,start)_infinite]" />
          )}
        </div>
      ))}
    </div>
  )
}

/** Source chips drift toward a claim pill; a citation badge pulses. */
export function ResearchScene() {
  const chips = [
    { w: 'w-24', d: '0s', tone: 'bg-[var(--color-accent-soft)]' },
    { w: 'w-28', d: '0.8s', tone: 'bg-[var(--color-secondary-soft)]' },
    { w: 'w-20', d: '1.6s', tone: 'bg-[color-mix(in_oklch,var(--color-fg)_8%,transparent)]' },
  ]
  return (
    <div aria-hidden className="relative flex h-full w-full items-center justify-between px-8">
      <div className="flex flex-col gap-3">
        {chips.map((c, i) => (
          <div
            key={i}
            className={cn(
              'flex h-7 items-center gap-2 rounded-full px-3 animate-[fx-bob_4.5s_ease-in-out_infinite]',
              c.w,
              c.tone,
            )}
            style={{ animationDelay: c.d }}
          >
            <span className="size-2 shrink-0 rounded-full bg-[var(--color-fg-subtle)]" />
            <span className="h-1.5 w-full rounded-full bg-[color-mix(in_oklch,var(--color-fg)_18%,transparent)]" />
          </div>
        ))}
      </div>
      {/* Hairlines converge on the claim. */}
      <svg className="absolute inset-0 size-full" viewBox="0 0 300 160" preserveAspectRatio="none">
        {[36, 80, 124].map((y) => (
          <path
            key={y}
            d={`M118 ${y} C 170 ${y}, 190 80, 218 80`}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="1"
          />
        ))}
      </svg>
      <div className="relative flex h-9 items-center gap-1.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 shadow-[var(--shadow-xs)]">
        <span className="h-1.5 w-14 rounded-full bg-[color-mix(in_oklch,var(--color-fg)_24%,transparent)]" />
        <span className="inline-flex size-4 items-center justify-center rounded-full bg-[var(--color-accent-soft)] font-mono text-[8px] text-[var(--color-accent)] animate-[fx-pulse_2.4s_ease-in-out_infinite]">
          1
        </span>
      </div>
    </div>
  )
}

/** A quiet code block; a reading highlight sweeps its lines. */
export function CodeScene() {
  // Each row: [indent %, [token widths %], accent?]
  const rows: Array<[number, number[], boolean?]> = [
    [0, [12, 22, 8]],
    [8, [16, 10, 26], true],
    [8, [10, 30]],
    [16, [22, 12, 10]],
    [8, [14, 8]],
    [0, [10]],
  ]
  return (
    <div aria-hidden className="relative flex h-full w-full flex-col justify-center gap-2.5 px-8">
      {/* Reading highlight — sweeps down the block, like an unhurried eye. */}
      <div className="pointer-events-none absolute inset-x-5 top-6 h-6 rounded-[6px] bg-[color-mix(in_oklch,var(--color-accent)_7%,transparent)] animate-[fx-scan_6s_ease-in-out_infinite]" />
      {rows.map(([indent, tokens, accent], i) => (
        <div key={i} className="flex items-center gap-1.5" style={{ paddingLeft: `${indent}%` }}>
          {tokens.map((w, j) => (
            <span
              key={j}
              className={cn(
                'h-2 rounded-full',
                accent && j === 0
                  ? 'bg-[color-mix(in_oklch,var(--color-accent)_45%,transparent)]'
                  : j % 3 === 2
                    ? 'bg-[color-mix(in_oklch,var(--color-secondary)_35%,transparent)]'
                    : 'bg-[color-mix(in_oklch,var(--color-fg)_14%,transparent)]',
              )}
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
