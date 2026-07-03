import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion'

import { useMediaQuery } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

/**
 * ScrollVelocity — infinite horizontal text bands that drift on their own and
 * surge with scroll velocity: scrolling down accelerates them, flick-scrolling
 * up reverses them, and a spring settles the speed back to the base drift.
 * Bands alternate direction. Each band tiles enough copies of its text (width
 * is measured live) that the wrap loop never shows a gap.
 *
 * Typography and color come entirely from `className` / the parent — the
 * component owns nothing but the motion. Each band carries `aria-label` with
 * the raw text and the scrolling copies are aria-hidden, so screen readers
 * hear one utterance instead of six moving ones.
 *
 * `prefers-reduced-motion: reduce` renders each band once, static and fully
 * visible — no rAF loop, no duplicate copies.
 */

export interface VelocityMapping {
  /** Scroll velocity range (px/s) mapped onto a speed multiplier range. */
  input: [number, number]
  output: [number, number]
}

export interface ScrollVelocityProps {
  /** One string per band; bands alternate drift direction. */
  texts: string[]
  /** Base drift speed in px/s. Odd-indexed bands get the negated value. */
  velocity?: number
  /** Spring settings for smoothing raw scroll velocity. */
  damping?: number
  stiffness?: number
  /** Copies tiled per band — must exceed viewport width / text width. */
  numCopies?: number
  velocityMapping?: VelocityMapping
  /** Custom scroll container to read velocity from; defaults to the window. */
  scrollContainerRef?: RefObject<HTMLElement | null>
  /** Applied to every text copy — supply font size/weight/color here. */
  className?: string
}

/** Live width of an element; ResizeObserver also catches webfont swaps —
 *  a stale width would leave a visible seam in the loop. */
function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.offsetWidth)
    const observer = new ResizeObserver(() => setWidth(el.offsetWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return width
}

/** Wrap v into [min, max) so translateX loops seamlessly over one copy width. */
function wrap(min: number, max: number, v: number): number {
  const range = max - min
  return ((((v - min) % range) + range) % range) + min
}

interface VelocityBandProps {
  text: string
  baseVelocity: number
  damping: number
  stiffness: number
  numCopies: number
  velocityMapping: VelocityMapping
  scrollContainerRef?: RefObject<HTMLElement | null>
  className?: string
}

function VelocityBand({
  text,
  baseVelocity,
  damping,
  stiffness,
  numCopies,
  velocityMapping,
  scrollContainerRef,
  className,
}: VelocityBandProps) {
  const baseX = useMotionValue(0)
  const { scrollY } = useScroll(
    scrollContainerRef ? { container: scrollContainerRef } : {},
  )
  const scrollVelocity = useVelocity(scrollY)
  const smoothVelocity = useSpring(scrollVelocity, { damping, stiffness })
  // clamp: false lets hard flicks overshoot the mapped range for extra kick.
  const velocityFactor = useTransform(
    smoothVelocity,
    velocityMapping.input,
    velocityMapping.output,
    { clamp: false },
  )

  const copyRef = useRef<HTMLSpanElement>(null)
  const copyWidth = useElementWidth(copyRef)

  const x = useTransform(baseX, (v) =>
    copyWidth === 0 ? '0px' : `${wrap(-copyWidth, 0, v)}px`,
  )

  // Scroll direction flips the drift; the last non-zero direction sticks.
  const directionFactor = useRef(1)
  useAnimationFrame((_, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000)
    const factor = velocityFactor.get()
    if (factor < 0) directionFactor.current = -1
    else if (factor > 0) directionFactor.current = 1
    moveBy += directionFactor.current * moveBy * factor
    baseX.set(baseX.get() + moveBy)
  })

  return (
    <div className="relative overflow-hidden" aria-label={text}>
      <motion.div className="flex whitespace-nowrap" style={{ x }} aria-hidden>
        {Array.from({ length: numCopies }, (_, i) => (
          <span
            key={i}
            ref={i === 0 ? copyRef : undefined}
            className={cn('shrink-0', className)}
          >
            {text}&nbsp;
          </span>
        ))}
      </motion.div>
    </div>
  )
}

export function ScrollVelocity({
  texts,
  velocity = 100,
  damping = 50,
  stiffness = 400,
  numCopies = 6,
  velocityMapping = { input: [0, 1000], output: [0, 5] },
  scrollContainerRef,
  className,
}: ScrollVelocityProps) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')

  if (reduced) {
    // Static fallback: one copy per band, fully visible, nothing animates.
    return (
      <section>
        {texts.map((text, index) => (
          <div key={index} className="overflow-hidden whitespace-nowrap">
            <span className={cn('inline-block', className)}>{text}</span>
          </div>
        ))}
      </section>
    )
  }

  return (
    <section>
      {texts.map((text, index) => (
        <VelocityBand
          key={index}
          text={text}
          baseVelocity={index % 2 !== 0 ? -velocity : velocity}
          damping={damping}
          stiffness={stiffness}
          numCopies={numCopies}
          velocityMapping={velocityMapping}
          scrollContainerRef={scrollContainerRef}
          className={className}
        />
      ))}
    </section>
  )
}
