import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient, ApiError, type ChatClient } from '../api/client'
import type { AuthResponse, AuthUser } from '../api/types'

const TOKEN_KEY = 'recallos_token'
const USER_KEY = 'recallos_user'

export interface AuthApi {
  user: AuthUser | null
  token: string | null
  client: ChatClient | null
  applyAuth: (resp: AuthResponse) => void
  logout: () => void
}

/**
 * Owns the bearer token (localStorage) and the authenticated API client.
 * Revalidates the stored token against GET /api/auth/me on mount.
 */
export function useAuth(): AuthApi {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(null)

  const applyAuth = useCallback((resp: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, resp.token)
    localStorage.setItem(USER_KEY, JSON.stringify(resp.user))
    setToken(resp.token)
    setUser(resp.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  // Restore cached user instantly, then revalidate with the backend.
  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY)
    if (raw) {
      try {
        setUser(JSON.parse(raw) as AuthUser)
      } catch {
        localStorage.removeItem(USER_KEY)
      }
    }
  }, [])

  const client = useMemo(() => (token ? createClient(token) : null), [token])

  useEffect(() => {
    if (!client) return
    let cancelled = false
    client
      .me()
      .then((u) => {
        if (!cancelled) {
          setUser(u)
          localStorage.setItem(USER_KEY, JSON.stringify(u))
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) logout()
        // Other errors (e.g. backend briefly down): keep the cached session.
      })
    return () => {
      cancelled = true
    }
  }, [client, logout])

  return { user, token, client, applyAuth, logout }
}
