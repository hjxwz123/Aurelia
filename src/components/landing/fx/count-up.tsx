/**
 * CountUp — a number that springs from `from` to `to` the first time it scrolls
 * into view. The spring stiffness/damping are derived from `duration` so the
 * settle time roughly tracks it. Inherits color/font from the caller (pair with
 * `tabular-nums` to stop digit jitter).
 *
 * `prefers-reduced-motion` renders the final number immediately — no spring —
 * while still firing onStart/onEnd once visible so chained reveals keep working.
 */
import { useInView, useMotionValue, useSpring } from 'framer-motion'
import { useCallback, useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

interface CountUpProps {
  to: number
  from?: number
  direction?: 'up' | 'down'
  /** Seconds to wait after entering the viewport before counting. */
  delay?: number
  /** Approximate seconds until the spring settles on the target. */
  duration?: number
  /** Extra gate on top of visibility — count only starts when this is true. */
  startWhen?: boolean
  /** Thousands separator, e.g. ',' or ' '. Empty string disables grouping. */
  separator?: string
  onStart?: () => void
  onEnd?: () => void
  className?: string
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Fraction digits follow the most precise endpoint, so 0 → 99.5 renders "99.5"
// throughout instead of snapping between integer and decimal widths.
function getDecimalPlaces(num: number): number {
  const str = num.toString()
  if (str.includes('.')) {
    const decimals = str.split('.')[1]
    if (parseInt(decimals) !== 0) return decimals.length
  }
  return 0
}

export function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  startWhen = true,
  separator = '',
  onStart,
  onEnd,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)

  // 'down' plays the same spring in reverse: start at `to`, settle on `from`.
  const startValue = direction === 'down' ? to : from
  const endValue = direction === 'down' ? from : to

  const motionValue = useMotionValue(startValue)
  const springValue = useSpring(motionValue, {
    damping: 20 + 40 * (1 / duration),
    stiffness: 100 * (1 / duration),
  })

  const isInView = useInView(ref, { once: true, margin: '0px' })

  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to))

  const formatValue = useCallback(
    (latest: number) => {
      const options: Intl.NumberFormatOptions = {
        useGrouping: !!separator,
        minimumFractionDigits: maxDecimals,
        maximumFractionDigits: maxDecimals,
      }
      const formatted = Intl.NumberFormat('en-US', options).format(latest)
      return separator ? formatted.replace(/,/g, separator) : formatted
    },
    [maxDecimals, separator],
  )

  // Paint the resting state before any animation: the start value normally, the
  // final value straight away under reduced motion.
  useEffect(() => {
    if (!ref.current) return
    ref.current.textContent = formatValue(prefersReducedMotion() ? endValue : startValue)
  }, [startValue, endValue, formatValue])

  useEffect(() => {
    if (!isInView || !startWhen) return
    if (prefersReducedMotion()) {
      if (ref.current) ref.current.textContent = formatValue(endValue)
      onStart?.()
      onEnd?.()
      return
    }
    onStart?.()
    const startId = setTimeout(() => motionValue.set(endValue), delay * 1000)
    const endId = setTimeout(() => onEnd?.(), (delay + duration) * 1000)
    return () => {
      clearTimeout(startId)
      clearTimeout(endId)
    }
  }, [isInView, startWhen, motionValue, endValue, delay, duration, formatValue, onStart, onEnd])

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest: number) => {
      if (ref.current) ref.current.textContent = formatValue(latest)
    })
    return () => unsubscribe()
  }, [springValue, formatValue])

  return <span ref={ref} className={cn(className)} />
}
