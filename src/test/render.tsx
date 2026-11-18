import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { ApiProvider } from '../api/ApiProvider'
import { CapabilitiesProvider } from '../capabilities'

export const BASE = 'http://core.test'

export function testQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}

/** Renders inside the real API + capabilities providers, with MSW serving the API. */
export function renderWithProviders(ui: ReactNode, { path = '/', queryClient = testQueryClient() } = {}) {
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <ApiProvider baseUrl={BASE}>
            <CapabilitiesProvider>{ui}</CapabilitiesProvider>
          </ApiProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}
