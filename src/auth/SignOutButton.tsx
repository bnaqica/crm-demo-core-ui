import { useAuth } from 'react-oidc-context'

export function SignOutButton() {
  const auth = useAuth()
  // Redirects to Keycloak's end-session endpoint (ends the SSO session) and clears the in-memory user.
  return <button onClick={() => void auth.signoutRedirect()}>Sign out</button>
}
