import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from 'react-oidc-context'
import { BrowserRouter } from 'react-router'
import { ApiProvider } from './api/ApiProvider'
import { ApiError } from './api/client'
import { RequireAuth } from './auth/RequireAuth'
import { CapabilitiesProvider } from './capabilities'
import { AppRoutes } from './shell/AppRoutes'
import { appRoutes } from './routes'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Never retry authorization or not-found answers; retry other failures once.
        retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
      },
    },
  })
}

export function App({ baseUrl }: { baseUrl: string }) {
  const auth = useAuth()
  const [queryClient] = useState(createQueryClient)

  // The router is mounted only after the OIDC callback has restored the requested URL.
  if (auth.isLoading) return <p role="status">Signing in…</p>

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RequireAuth>
          <ApiProvider baseUrl={baseUrl}>
            <CapabilitiesProvider>
              <AppRoutes routes={appRoutes} />
            </CapabilitiesProvider>
          </ApiProvider>
        </RequireAuth>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
