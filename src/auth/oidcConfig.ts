import { InMemoryWebStorage, WebStorageStateStore } from 'oidc-client-ts'
import type { AuthProviderNoUserManagerProps } from 'react-oidc-context'
import type { AppConfig } from '../config'

export type SigninState = { returnTo?: string }

const OIDC_CALLBACK_PARAMS = ['code', 'state', 'session_state', 'iss', 'error', 'error_description', 'error_uri']

/** Removes OIDC callback parameters so a stale `?code&state` is never replayed. */
export function stripAuthParams(path: string): string {
  const url = new URL(path, 'http://app.invalid')
  for (const name of OIDC_CALLBACK_PARAMS) url.searchParams.delete(name)
  return url.pathname + url.search + url.hash
}

/** Only same-origin absolute paths; anything else goes home. */
export function returnPathAfterSignin(user?: { state?: unknown }): string {
  const returnTo = (user?.state as SigninState | undefined)?.returnTo
  if (typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')) return stripAuthParams(returnTo)
  return '/'
}

export function buildOidcConfig(config: AppConfig, origin: string): AuthProviderNoUserManagerProps {
  return {
    authority: config.oidcAuthority,
    client_id: config.oidcClientId,
    redirect_uri: `${origin}/`,
    post_logout_redirect_uri: `${origin}/`,
    response_type: 'code',
    scope: 'openid profile email',
    // Tokens live only in memory; a reload re-uses the Keycloak SSO session.
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    // Only the short-lived PKCE verifier/state for the redirect round trip; no tokens.
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
    // Remove ?code&state and go back to the page the user asked for.
    onSigninCallback: (user) => {
      window.history.replaceState(null, '', returnPathAfterSignin(user ?? undefined))
    },
  }
}
