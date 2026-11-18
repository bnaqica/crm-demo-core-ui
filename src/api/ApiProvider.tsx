import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from 'react-oidc-context'
import { useLocation } from 'react-router'
import { stripAuthParams } from '../auth/oidcConfig'
import { createApiClient, type ApiClient } from './client'
import { CAPABILITIES_PATH, capabilitiesQueryKey } from '../capabilities/query'

const ApiContext = createContext<ApiClient | null>(null)

export function ApiProvider({ baseUrl, children }: { baseUrl: string; children: ReactNode }) {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const token = auth.user?.access_token
  const location = useLocation()
  const returnTo = stripAuthParams(location.pathname + location.search)
  const { signinRedirect } = auth

  const client = useMemo(
    () =>
      createApiClient({
        baseUrl,
        getToken: () => token,
        // Token expired or revoked: sign in again and come back here.
        onUnauthorized: () => void signinRedirect({ state: { returnTo } }),
        onForbidden: (path) => {
          // Our view of the user's access is stale: reload it (not for the capabilities call itself).
          if (path !== CAPABILITIES_PATH) void queryClient.invalidateQueries({ queryKey: capabilitiesQueryKey })
        },
      }),
    [baseUrl, queryClient, token, signinRedirect, returnTo],
  )
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>
}

export function useApi(): ApiClient {
  const client = useContext(ApiContext)
  if (!client) throw new Error('useApi must be used inside <ApiProvider>')
  return client
}
