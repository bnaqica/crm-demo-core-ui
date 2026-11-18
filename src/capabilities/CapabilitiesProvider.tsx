import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '../api/ApiProvider'
import { SignOutButton } from '../auth/SignOutButton'
import { CAPABILITIES_PATH, capabilitiesQueryKey } from './query'
import { normalize } from './rules'
import type { Capabilities, CapabilitiesResponse } from './types'

export const RELOAD_AFTER_MS = 5 * 60_000

const CapabilitiesContext = createContext<Capabilities | null>(null)

export function CapabilitiesProvider({ children }: { children: ReactNode }) {
  const api = useApi()
  const query = useQuery({
    queryKey: capabilitiesQueryKey,
    queryFn: ({ signal }) => api.request<CapabilitiesResponse>(CAPABILITIES_PATH, { signal }),
    select: normalize,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
  const { refetch, dataUpdatedAt } = query

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - dataUpdatedAt > RELOAD_AFTER_MS) void refetch()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refetch, dataUpdatedAt])

  if (query.data) return <StaticCapabilities value={query.data}>{children}</StaticCapabilities>
  if (query.isError) {
    return (
      <div role="alert">
        <p>We could not load your access rights.</p>
        <button onClick={() => void refetch()}>Retry</button>
        <SignOutButton />
      </div>
    )
  }
  return <p role="status">Loading your access…</p>
}

/** Provides fixed capabilities (also handy in tests and stories). Accepts the raw API shape or normalized form. */
export function StaticCapabilities({ value, children }: { value: Capabilities | CapabilitiesResponse; children: ReactNode }) {
  const caps = useMemo(() => (value.permissions instanceof Set ? (value as Capabilities) : normalize(value as CapabilitiesResponse)), [value])
  return <CapabilitiesContext.Provider value={caps}>{children}</CapabilitiesContext.Provider>
}

export function useCapabilities(): Capabilities {
  const caps = useContext(CapabilitiesContext)
  if (!caps) throw new Error('useCapabilities must be used inside <CapabilitiesProvider>')
  return caps
}
