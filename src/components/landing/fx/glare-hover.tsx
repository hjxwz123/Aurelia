/**
 * GlareHover — sweeps a diagonal band of light across its children on hover,
 * like glass catching the light. The band is a gradient layer whose
 * background-position transitions from off-canvas top-left to off-canvas
 * bottom-right; leaving reverses the sweep (or snaps home with `playOnce`).
 *
 * Purely decorative: the wrapper imposes no chrome beyond
 * `relative overflow-hidden`, so the host element keeps its own surface.
 * Fires only for fine pointers; under `prefers-reduced-motion: reduce` the
 * sweep never plays and children render untouched.
 */
import { useRef, type ComponentProps, type MouseEvent } from 'react'

import { cn } from '@/lib/utils'

interface GlareHoverProps extends ComponentProps<'div'> {
  /** Any CSS color — token vars work directly; alpha is applied via color-mix. */
  glareColor?: string
  glareOpacity?: number
  /** Sweep direction in degrees. */
  glareAngle?: number
  /** Band size as a % of the wrapper — larger reads softer and slower. */
  glareSize?: number
  /** Sweep duration in ms. */
  transitionDuration?: number
  /** Skip the reverse sweep on leave — snap home so re-entry replays cleanly. */
  playOnce?: boolean
}

export function GlareHover({
  glareColor = 'var(--color-fg)',
  glareOpacity = 0.12,
  glareAngle = -45,
  glareSize = 250,
  transitionDuration = 650,
  playOnce = false,
  onMouseEnter,
  onMouseLeave,
  className,
  children,
  ...rest
}: GlareHoverProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Hover glare only makes sense with a precise pointer, and it is pure
  // ornament — reduced motion drops it entirely. Checked per-event so live
  // preference changes are respected.
  const sweepAllowed = () =>
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const handleEnter = (e: MouseEvent<HTMLDivElement>) => {
    onMouseEnter?.(e)
    const el = overlayRef.current
    if (!el || !sweepAllowed()) return
    el.style.transition = 'none'
    el.style.backgroundPosition = '-100% -100%'
    // Flush styles so the reset lands before the transitioned move —
    // otherwise re-entering mid-exit animates from wherever the band was.
    void el.offsetWidth
    el.style.transition = `background-position ${transitionDuration}ms ease`
    el.style.backgroundPosition = '100% 100%'
  }

  const handleLeave = (e: MouseEvent<HTMLDivElement>) => {
    onMouseLeave?.(e)
    const el = overlayRef.current
    if (!el) return
    el.style.transition = playOnce ? 'none' : `background-position ${transitionDuration}ms ease`
    el.style.backgroundPosition = '-100% -100%'
  }

  const band = `color-mix(in oklch, ${glareColor} ${glareOpacity * 100}%, transparent)`

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      {...rest}
    >
      <div
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(${glareAngle}deg, transparent 60%, ${band} 70%, transparent 100%)`,
          backgroundSize: `${glareSize}% ${glareSize}%`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: '-100% -100%',
        }}
      />
      {children}
    </div>
  )
}
