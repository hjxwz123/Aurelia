/**
 * ModelIcon — single source of truth for rendering a model's icon string.
 *
 * The `icon` field on a model is free-form and can be any of:
 *   - empty / whitespace → fall back to the default Sparkles icon
 *   - emoji (or any short non-URL text) → render as plain text
 *   - URL (absolute http(s) OR an internal /api/icons/... path returned by
 *     our icon upload endpoint) → render as an <img>
 *
 * The renderer is intentionally permissive on the text path: anything that
 * doesn't look like a URL is treated as text, so an admin who types "GPT"
 * or "✨" both render correctly without us having to enumerate every emoji.
 */
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModelIconProps {
  icon?: string
  size?: number
  className?: string
}

function looksLikeUrl(s: string): boolean {
  return s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/api/icons/')
}

export function ModelIcon({ icon, size = 14, className }: ModelIconProps) {
  const trimmed = (icon ?? '').trim()
  if (!trimmed) {
    return (
      <Sparkles
        size={size}
        aria-hidden
        className={cn('text-[var(--color-secondary)] shrink-0', className)}
      />
    )
  }
  if (looksLikeUrl(trimmed)) {
    return (
      <img
        src={trimmed}
        alt=""
        width={size}
        height={size}
        aria-hidden
        loading="lazy"
        decoding="async"
        // Defence-in-depth: even though our upload route serves only
        // png/jpeg with X-Content-Type-Options: nosniff, refuse to render
        // anything the browser would otherwise treat as same-origin script.
        referrerPolicy="no-referrer"
        className={cn('shrink-0 rounded-[4px] object-cover', className)}
        style={{ width: size, height: size }}
        onError={(e) => {
          // If the URL 404s or the image fails to decode, hide the broken
          // image so the row doesn't show a placeholder square.
          ;(e.currentTarget as HTMLImageElement).style.visibility = 'hidden'
        }}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn('shrink-0 inline-flex items-center justify-center leading-none', className)}
      style={{ fontSize: size }}
    >
      {trimmed.slice(0, 2)}
    </span>
  )
}
