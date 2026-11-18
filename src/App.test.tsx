import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from './test/server'
import { capabilities } from './test/fixtures'
import { authState, resetAuth } from './test/mockOidc'
import { App } from './App'

vi.mock('react-oidc-context', () => import('./test/mockOidc'))

const BASE = 'http://core.test'

beforeEach(() => {
  resetAuth()
  window.history.replaceState(null, '', '/')
})

describe('App', () => {
  it('waits for the sign-in callback before mounting the router', () => {
    resetAuth({ isLoading: true, isAuthenticated: false, user: null })
    render(<App baseUrl={BASE} />)
    expect(screen.getByRole('status')).toHaveTextContent(/signing in/i)
    expect(authState.signinRedirect).not.toHaveBeenCalled()
  })

  it('sends a signed-out visitor to login with the requested page', () => {
    window.history.replaceState(null, '', '/submissions')
    resetAuth({ isAuthenticated: false, user: null })
    render(<App baseUrl={BASE} />)
    expect(authState.signinRedirect).toHaveBeenCalledWith({ state: { returnTo: '/submissions' } })
  })

  it('shows the home page for a signed-in user once capabilities load', async () => {
    server.use(http.get(`${BASE}/me/capabilities`, () => HttpResponse.json(capabilities({ name: 'Tess Member' }))))
    render(<App baseUrl={BASE} />)
    expect(await screen.findByRole('heading', { name: 'Welcome, Tess Member' })).toBeInTheDocument()
  })
})
