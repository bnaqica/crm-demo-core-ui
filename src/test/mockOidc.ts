import { vi } from 'vitest'
import type { AuthContextProps } from 'react-oidc-context'

type AuthState = {
  isLoading: boolean
  isAuthenticated: boolean
  activeNavigator?: string
  user: { access_token: string; expired?: boolean; profile: { name?: string; preferred_username?: string } } | null
  error?: Error
  signinRedirect: ReturnType<typeof vi.fn>
  signoutRedirect: ReturnType<typeof vi.fn>
  removeUser: ReturnType<typeof vi.fn>
}

export const authState: AuthState = freshAuth()

export function freshAuth(): AuthState {
  return {
    isLoading: false,
    isAuthenticated: true,
    activeNavigator: undefined,
    user: { access_token: 'token-123', profile: { name: 'Tess Member', preferred_username: 'tess' } },
    error: undefined,
    signinRedirect: vi.fn(() => Promise.resolve()),
    signoutRedirect: vi.fn(() => Promise.resolve()),
    removeUser: vi.fn(() => Promise.resolve()),
  }
}

export function resetAuth(overrides: Partial<AuthState> = {}) {
  Object.assign(authState, freshAuth(), overrides)
}

export const useAuth = () => authState as unknown as AuthContextProps
export const AuthProvider = ({ children }: { children: React.ReactNode }) => children
