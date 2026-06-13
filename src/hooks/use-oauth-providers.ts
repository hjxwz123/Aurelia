/**
 * useOAuthProviders — loads the enabled social-login providers once and shares
 * the result across the login and register screens. The list is empty until the
 * admin configures at least one provider, which both screens use to decide
 * whether to render the OAuth section at all.
 */
import { useEffect, useState } from 'react'
import { authApi } from '@/api'
import type { ApiPublicOAuthProvider } from '@/api/types'

let cache: ApiPublicOAuthProvider[] | null = null
let inflight: Promise<ApiPublicOAuthProvider[]> | null = null

async function fetchProviders(): Promise<ApiPublicOAuthProvider[]> {
  if (cache) return cache
  if (!inflight) {
    inflight = authApi
      .oauthProviders()
      .then((list) => {
        cache = list
        return list
      })
      .catch(() => {
        cache = []
        return []
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

export function useOAuthProviders(): { providers: ApiPublicOAuthProvider[]; loading: boolean } {
  const [providers, setProviders] = useState<ApiPublicOAuthProvider[]>(cache ?? [])
  const [loading, setLoading] = useState(cache === null)

  useEffect(() => {
    let active = true
    if (cache) {
      setProviders(cache)
      setLoading(false)
      return
    }
    void fetchProviders().then((list) => {
      if (!active) return
      setProviders(list)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  return { providers, loading }
}
