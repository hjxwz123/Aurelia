import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, type Transition } from 'framer-motion'

import { useMediaQuery } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

/**
 * BlurText — text drifts into focus: each segment starts blurred, offset and
 * transparent, then sharpens into place with a stagger. Segments are words
 * when the text has spaces, otherwise (CJK) the whole phrase focuses as one
 * calm block. Renders spans only, so it can sit inside any heading element.
 *
 * `prefers-reduced-motion: reduce` renders the text statically, fully sharp.
 */

interface BlurTextProps {
  text: string
  /** Per-segment stagger, in milliseconds. */
  delay?: number
  animateBy?: 'words' | 'letters'
  /** Where the segments drift in from. */
  direction?: 'top' | 'bottom'
  threshold?: number
  rootMargin?: string
  /** Seconds per keyframe step (two steps: half-focus, sharp). */
  stepDuration?: number
  onAnimationComplete?: () => void
  className?: string
}

export function BlurText({
  text,
  delay = 120,
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  stepDuration = 0.3,
  onAnimationComplete,
  className,
}: BlurTextProps) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const ref = useRef<HTMLSpanElement>(null)
  const [inView, setInView] = useState(false)

  const segments = useMemo(() => {
    if (animateBy === 'letters') return Array.from(text)
    // Word mode on space-less text (CJK) degrades to one calm whole-phrase focus.
    return text.split(' ')
  }, [text, animateBy])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  if (reduced) {
    return <span className={className}>{text}</span>
  }

  const y = direction === 'top' ? -24 : 24
  const from = { filter: 'blur(10px)', opacity: 0, y }
  const keyframes = {
    filter: ['blur(10px)', 'blur(5px)', 'blur(0px)'],
    opacity: [0, 0.5, 1],
    y: [y, y * -0.1, 0],
  }

  return (
    <span ref={ref} className={cn('inline-flex flex-wrap', className)} aria-label={text} role="text">
      {segments.map((segment, index) => {
        const transition: Transition = {
          duration: stepDuration * 2,
          times: [0, 0.5, 1],
          delay: (index * delay) / 1000,
          ease: 'easeOut',
        }
        return (
          <motion.span
            key={`${segment}-${index}`}
            aria-hidden
            initial={from}
            animate={inView ? keyframes : from}
            transition={transition}
            onAnimationComplete={index === segments.length - 1 ? onAnimationComplete : undefined}
            className="inline-block will-change-[transform,filter,opacity]"
          >
            {segment === ' ' ? '\u00A0' : segment}
            {animateBy === 'words' && index < segments.length - 1 ? '\u00A0' : null}
          </motion.span>
        )
      })}
    </span>
  )
}
