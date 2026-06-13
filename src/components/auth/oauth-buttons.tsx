/**
 * OAuthButtons — renders one "Continue with …" button per admin-configured
 * social-login provider. Clicking does a full-page navigation to the backend
 * `/start` endpoint, which 302-redirects to the provider (a fetch can't follow
 * a cross-origin auth redirect, so this must be a real navigation).
 *
 * Renders nothing when no providers are configured; callers gate the
 * surrounding divider on `providers.length` so the section disappears cleanly.
 */
import { apiUrl } from '@/api'
import type { ApiPublicOAuthProvider } from '@/api/types'
import { Button } from '@/components/ui/button'
import { OAuthBrandGlyph } from './oauth-glyph'

interface OAuthButtonsProps {
  providers: ApiPublicOAuthProvider[]
}

export function OAuthButtons({ providers }: OAuthButtonsProps) {
  if (providers.length === 0) return null
  return (
    <>
      {providers.map((p) => (
        <Button
          key={p.id}
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => {
            window.location.href = apiUrl(`/auth/oauth/${encodeURIComponent(p.id)}/start`)
          }}
        >
          <OAuthBrandGlyph kind={p.kind} icon={p.icon} />
          {p.name}
        </Button>
      ))}
    </>
  )
}
