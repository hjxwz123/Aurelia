import { useEffect } from 'react'

import { useMediaQuery } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

/**
 * ShinyText — a sheen that sweeps across a run of text. The text is painted
 * with a `background-clip: text` gradient whose bright band travels via a CSS
 * keyframe on `background-position`, so the effect costs no JS per frame.
 *
 * Colours are caller-supplied CSS expressions (keep them token-derived); the
 * defaults render quiet muted ink with a full-ink glint. Under
 * `prefers-reduced-motion` (or `disabled`) the sweep is dropped entirely and
 * the text renders as static `baseColor` ink.
 */

const STYLE_ID = 'fx-shiny-text-style'

// One shared <style> for every instance: the sweep keyframes, the hover-pause
// hook, and a CSS-level reduced-motion kill switch (belt and braces on top of
// the matchMedia gate below — covers the first paint before React hydrates).
function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = [
    '@keyframes fx-shine-sweep{from{background-position:150% center}to{background-position:-50% center}}',
    '.fx-shiny-text-pause:hover{animation-play-state:paused}',
    '@media (prefers-reduced-motion:reduce){.fx-shiny-text{animation:none !important}}',
  ].join('\n')
  document.head.appendChild(style)
}

interface ShinyTextProps {
  text: string
  /** Resting ink of the text. Any CSS colour expression — keep it token-derived. */
  baseColor?: string
  /** Peak colour of the sheen as it passes over a glyph. */
  shineColor?: string
  /** Seconds for one full sweep across the text. */
  speed?: number
  /** Gradient angle in degrees — tilts the sheen band off vertical. */
  spread?: number
  /** Which way the sheen travels. */
  direction?: 'left' | 'right'
  /** Sweep back and forth instead of restarting from the same edge. */
  yoyo?: boolean
  /** Freeze the sweep while the pointer rests on the text. */
  pauseOnHover?: boolean
  /** Render static ink with no sweep at all. */
  disabled?: boolean
  className?: string
}

export function ShinyText({
  text,
  baseColor = 'var(--color-fg-muted)',
  shineColor = 'var(--color-fg)',
  speed = 3,
  spread = 120,
  direction = 'left',
  yoyo = false,
  pauseOnHover = false,
  disabled = false,
  className,
}: ShinyTextProps) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')

  useEffect(injectStyles, [])

  // Static end-state: plain ink, no gradient to keep the glyphs crisp.
  if (disabled || reduced) {
    return (
      <span className={cn('inline-block', className)} style={{ color: baseColor }}>
        {text}
      </span>
    )
  }

  return (
    <span
      className={cn('fx-shiny-text inline-block', pauseOnHover && 'fx-shiny-text-pause', className)}
      style={{
        backgroundImage: `linear-gradient(${spread}deg, ${baseColor} 0%, ${baseColor} 35%, ${shineColor} 50%, ${baseColor} 65%, ${baseColor} 100%)`,
        backgroundSize: '200% auto',
        // 150% → -50% carries the band fully across and off both edges.
        backgroundPosition: '150% center',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animationName: 'fx-shine-sweep',
        animationDuration: `${speed}s`,
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
        animationDirection:
          direction === 'left' ? (yoyo ? 'alternate' : 'normal') : yoyo ? 'alternate-reverse' : 'reverse',
      }}
    >
      {text}
    </span>
  )
}
