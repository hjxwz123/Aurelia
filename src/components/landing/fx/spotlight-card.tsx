import { useEffect, useRef, useState, type ComponentProps, type MouseEvent } from 'react'

import { cn } from '@/lib/utils'

/**
 * SpotlightCard — a mouse-follow radial glow layered inside a card. The card
 * chrome (surface, border, radius, padding) belongs to the call site; this
 * wrapper contributes only `relative overflow-hidden` and the spotlight layer,
 * so it can wrap any existing card unchanged.
 *
 * Hover-only affordance: gated to `(pointer: fine)` so touch devices never get
 * a stuck glow. Keyboard focus inside the card also lights it up (a11y parity
 * with hover). `prefers-reduced-motion` keeps the pointer-driven spotlight —
 * it is not autonomous animation — but drops the fade transitions to 0ms.
 */

interface Position {
  x: number
  y: number
}

interface SpotlightCardProps extends ComponentProps<'div'> {
  /** Core colour of the glow. Any CSS colour expression — keep it token-derived. */
  spotlightColor?: string
}

export function SpotlightCard({
  children,
  spotlightColor = 'color-mix(in oklch, var(--color-accent) 14%, transparent)',
  className,
  ...rest
}: SpotlightCardProps) {
  const root = useRef<HTMLDivElement>(null)
  // Read once + track changes (a mouse can be plugged in mid-session).
  const finePointer = useRef(false)
  const focused = useRef(false)
  const [reduced, setReduced] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)')
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncFine = () => {
      finePointer.current = fine.matches
    }
    const syncMotion = () => setReduced(motion.matches)
    syncFine()
    syncMotion()
    fine.addEventListener('change', syncFine)
    motion.addEventListener('change', syncMotion)
    return () => {
      fine.removeEventListener('change', syncFine)
      motion.removeEventListener('change', syncMotion)
    }
  }, [])

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    // While focus holds the glow, the pointer must not drag it around.
    if (!root.current || focused.current || !finePointer.current) return
    const rect = root.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const handleFocus = () => {
    focused.current = true
    setOpacity(0.6)
  }

  const handleBlur = () => {
    focused.current = false
    setOpacity(0)
  }

  const handleMouseEnter = () => {
    if (finePointer.current) setOpacity(0.6)
  }

  const handleMouseLeave = () => {
    setOpacity(0)
  }

  return (
    <div
      {...rest}
      ref={root}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn('relative overflow-hidden', className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity ease-in-out"
        style={{
          opacity,
          transitionDuration: reduced ? '0ms' : '500ms',
          background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
        }}
      />
      {children}
    </div>
  )
}
