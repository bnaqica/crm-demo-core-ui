import { useEffect, useRef, type ReactNode } from 'react'
import { useAuth } from 'react-oidc-context'
import { useLocation } from 'react-router'
import { stripAuthParams, type SigninState } from './oidcConfig'
import { SignOutButton } from './SignOutButton'

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  const returnTo = stripAuthParams(location.pathname + location.search)
  const signedIn = auth.isAuthenticated && !auth.user?.expired
  const mustSignIn = !auth.isLoading && !signedIn && !auth.activeNavigator && !auth.error
  // Strict Mode runs effects twice before the navigator state updates; redirect once.
  const redirecting = useRef(false)

  useEffect(() => {
    if (mustSignIn && !redirecting.current) {
      redirecting.current = true
      void auth.signinRedirect({ state: { returnTo } satisfies SigninState })
    }
  }, [mustSignIn, auth, returnTo])

  if (auth.error && !signedIn) {
    return (
      <div role="alert">
        <p>Sign-in failed. Please try again.</p>
        <button onClick={() => void auth.signinRedirect({ state: { returnTo } satisfies SigninState })}>Try again</button>
        <SignOutButton />
      </div>
    )
  }
  if (!signedIn) return <p role="status">Signing in…</p>
  return <>{children}</>
}
