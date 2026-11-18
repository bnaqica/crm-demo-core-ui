import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { BASE, renderWithProviders } from '../test/render'
import { capabilities } from '../test/fixtures'
import { authState, resetAuth } from '../test/mockOidc'
import { useApi } from '../api/ApiProvider'
import { ApiErrorMessage } from '../api/ApiErrorMessage'
import { Can, useCapabilities } from '.'
import { useMutation } from '@tanstack/react-query'

vi.mock('react-oidc-context', () => import('../test/mockOidc'))

let calls = 0
let authHeaders: (string | null)[] = []
function serveCapabilities(...responses: ReturnType<typeof capabilities>[]) {
  calls = 0
  authHeaders = []
  server.use(
    http.get(`${BASE}/me/capabilities`, ({ request }) => {
      authHeaders.push(request.headers.get('Authorization'))
      const body = responses[Math.min(calls, responses.length - 1)]
      calls++
      return HttpResponse.json(body)
    }),
  )
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => resetAuth())
afterEach(() => {
  vi.useRealTimers()
  setVisibility('visible')
})

describe('CapabilitiesProvider', () => {
  it('renders pages only after /me/capabilities has loaded, calling it with the bearer token', async () => {
    serveCapabilities(capabilities({ name: 'Tess Member' }))
    function Page() {
      return <p>Hello {useCapabilities().name}</p>
    }
    renderWithProviders(<Page />)

    expect(screen.queryByText(/Hello/)).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
    expect(await screen.findByText('Hello Tess Member')).toBeInTheDocument()
    expect(authHeaders).toEqual(['Bearer token-123'])
  })

  it('shows an error with retry when capabilities cannot be loaded', async () => {
    server.use(http.get(`${BASE}/me/capabilities`, () => HttpResponse.json({ title: 'boom' }, { status: 500 })))
    renderWithProviders(<p>page</p>)
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load your access/i)
    expect(screen.queryByText('page')).not.toBeInTheDocument()

    serveCapabilities(capabilities())
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(await screen.findByText('page')).toBeInTheDocument()
  })

  it('offers sign out when capabilities cannot be loaded', async () => {
    server.use(http.get(`${BASE}/me/capabilities`, () => HttpResponse.json({ title: 'boom' }, { status: 500 })))
    renderWithProviders(<p>page</p>)
    await screen.findByRole('alert')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('signs in again when the API answers 401', async () => {
    server.use(http.get(`${BASE}/me/capabilities`, () => new HttpResponse(null, { status: 401 })))
    renderWithProviders(<p>page</p>, { path: '/submissions?status=RECEIVED' })
    await waitFor(() =>
      expect(authState.signinRedirect).toHaveBeenCalledWith({ state: { returnTo: '/submissions?status=RECEIVED' } }),
    )
  })

  it('reloads capabilities when the user returns to the tab after more than 5 minutes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    serveCapabilities(
      capabilities({ permissions: ['submissions:read'] }),
      capabilities({ permissions: ['submissions:write'] }),
    )
    renderWithProviders(
      <Can permission="submissions:write" fallback={<p>read only</p>}>
        <p>can write</p>
      </Can>,
    )
    expect(await screen.findByText('read only')).toBeInTheDocument()

    act(() => setVisibility('hidden'))
    vi.setSystemTime(Date.now() + 4 * 60_000)
    act(() => setVisibility('visible'))
    expect(calls).toBe(1)

    act(() => setVisibility('hidden'))
    vi.setSystemTime(Date.now() + 2 * 60_000)
    act(() => setVisibility('visible'))
    expect(await screen.findByText('can write')).toBeInTheDocument()
    expect(calls).toBe(2)
  })
})

describe('server denial', () => {
  it('shows a not-authorized message for a 403 and reloads capabilities', async () => {
    serveCapabilities(
      capabilities({ permissions: ['submissions:write'] }),
      capabilities({ permissions: ['submissions:read'] }),
    )
    server.use(http.post(`${BASE}/submissions/s1/accept`, () => HttpResponse.json({ title: 'Forbidden' }, { status: 403 })))

    function AcceptAction() {
      const api = useApi()
      const accept = useMutation({ mutationFn: () => api.request('/submissions/s1/accept', { method: 'POST' }) })
      return (
        <>
          <Can permission="submissions:write">
            <button onClick={() => accept.mutate()}>Accept</button>
          </Can>
          <ApiErrorMessage error={accept.error} />
        </>
      )
    }
    renderWithProviders(<AcceptAction />)

    await userEvent.click(await screen.findByRole('button', { name: 'Accept' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/not authorized/i)
    await waitFor(() => expect(calls).toBe(2))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument())
  })
})
