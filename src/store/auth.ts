/**
 * Auth store — drives the signed-in user, hydrates on mount, and exposes the
 * three transitions the UI cares about: login, register, logout.
 *
 * The backend keeps the auth cookie httpOnly; we also hold the short-lived
 * access token in memory so the api client can attach it as a Bearer header.
 * On refresh, the cookie-backed /api/auth/refresh restores both.
 */
import { create } from 'zustand'
import { authApi, ApiError, setAccessToken } from '@/api'
import type { ApiUser } from '@/api/types'

interface AuthState {
  user: ApiUser | null
  status: 'idle' | 'authenticating' | 'authenticated' | 'unauthenticated'
  error: string | null
  signupOpen: boolean
  /** Set when registration returns verification_required — drives the code UI. */
  pendingVerification: string | null
  /** Set when password login returns totp_required — drives the 2FA code UI. */
  pendingTwoFactor: { ticket: string } | null

  hydrate: () => Promise<void>
  login: (email: string, password: string) => Promise<boolean | '2fa'>
  loginTwoFactor: (code: string) => Promise<boolean>
  register: (email: string, password: string, name: string) => Promise<boolean | 'verify'>
  logout: () => Promise<void>
  updateProfile: (patch: { name?: string; email?: string }) => Promise<void>
  setUser: (user: ApiUser | null) => void
  setSignupOpen: (open: boolean) => void
  clearPendingVerification: () => void
  clearPendingTwoFactor: () => void
  /** Resume a 2FA challenge from a ticket (e.g. an OAuth redirect). */
  startTwoFactor: (ticket: string) => void
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',
  error: null,
  signupOpen: true,
  pendingVerification: null,
  pendingTwoFactor: null,

  setUser(user) {
    set({ user, status: user ? 'authenticated' : 'unauthenticated' })
  },
  setSignupOpen(open) {
    set({ signupOpen: open })
  },
  clearPendingVerification() {
    set({ pendingVerification: null })
  },
  clearPendingTwoFactor() {
    set({ pendingTwoFactor: null })
  },
  startTwoFactor(ticket) {
    set({ pendingTwoFactor: { ticket }, status: 'unauthenticated' })
  },

  async hydrate() {
    set({ status: 'authenticating' })
    try {
      // Try refresh first — it lets the user back in even after the access
      // token expired.
      try {
        const resp = await authApi.refresh()
        setAccessToken(resp.access_token)
        set({ user: resp.user, status: 'authenticated', error: null })
        return
      } catch {
        /* fall through to /me */
      }
      const user = await authApi.me()
      set({ user, status: 'authenticated', error: null })
    } catch {
      set({ user: null, status: 'unauthenticated' })
    } finally {
      try {
        const r = await authApi.signupOpen()
        set({ signupOpen: r.open })
      } catch {
        /* ignore */
      }
    }
  },

  async login(email, password) {
    set({ status: 'authenticating', error: null })
    try {
      const resp = await authApi.login(email, password)
      // 2FA-enabled accounts get a ticket instead of a session — hold it and
      // let the UI collect the code (§ 2FA login).
      if ('totp_required' in resp) {
        set({ status: 'unauthenticated', pendingTwoFactor: { ticket: resp.ticket } })
        return '2fa'
      }
      setAccessToken(resp.access_token)
      set({ user: resp.user, status: 'authenticated', pendingTwoFactor: null })
      return true
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Login failed'
      // If the backend says "email not verified", flip to verification flow
      if (e instanceof ApiError && msg.toLowerCase().includes('not verified')) {
        set({ error: msg, status: 'unauthenticated', pendingVerification: email })
        return false
      }
      set({ error: msg, status: 'unauthenticated' })
      return false
    }
  },

  async loginTwoFactor(code) {
    const pending = get().pendingTwoFactor
    if (!pending) return false
    set({ status: 'authenticating', error: null })
    try {
      const resp = await authApi.loginTwoFactor(pending.ticket, code)
      setAccessToken(resp.access_token)
      set({ user: resp.user, status: 'authenticated', pendingTwoFactor: null })
      return true
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Verification failed'
      // An expired ticket means the password step must be redone.
      if (e instanceof ApiError && e.status === 401 && msg.toLowerCase().includes('expired')) {
        set({ error: msg, status: 'unauthenticated', pendingTwoFactor: null })
        return false
      }
      set({ error: msg, status: 'unauthenticated' })
      return false
    }
  },

  async register(email, password, name) {
    set({ status: 'authenticating', error: null })
    try {
      const resp = await authApi.register(email, password, name)
      if ('verification_required' in resp && resp.verification_required) {
        set({ pendingVerification: resp.email as string, status: 'unauthenticated' })
        return 'verify'
      }
      const auth = resp as { user: ApiUser; access_token: string }
      setAccessToken(auth.access_token)
      set({ user: auth.user, status: 'authenticated' })
      return true
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Registration failed'
      set({ error: msg, status: 'unauthenticated' })
      return false
    }
  },

  async logout() {
    try {
      await authApi.logout()
    } catch {
      /* ignore */
    }
    setAccessToken(null)
    set({ user: null, status: 'unauthenticated', pendingTwoFactor: null })
  },

  async updateProfile(patch) {
    const updated = await authApi.updateProfile(patch)
    set({ user: updated })
    void get()
  },
}))
