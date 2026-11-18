import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { authState, resetAuth } from '../test/mockOidc'
import { RequireAuth } from './RequireAuth'
import { SignOutButton } from './SignOutButton'

vi.mock('react-oidc-context', () => import('../test/mockOidc'))

beforeEach(() => resetAuth())

describe('RequireAuth', () => {
  it('sends a signed-out visitor of /submissions to login, remembering the page', () => {
    resetAuth({ isAuthenticated: false, user: null })
    render(
      <MemoryRouter initialEntries={['/submissions?status=RECEIVED']}>
        <RequireAuth>
          <p>protected</p>
        </RequireAuth>
      </MemoryRouter>,
    )
    expect(authState.signinRedirect).toHaveBeenCalledWith({ state: { returnTo: '/submissions?status=RECEIVED' } })
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
  })

  it('does not start a second redirect while one is in progress', () => {
    resetAuth({ isAuthenticated: false, user: null, activeNavigator: 'signinRedirect' })
    render(
      <MemoryRouter>
        <RequireAuth>
          <p>protected</p>
        </RequireAuth>
      </MemoryRouter>,
    )
    expect(authState.signinRedirect).not.toHaveBeenCalled()
  })

  it('renders the page for a signed-in user', () => {
    render(
      <MemoryRouter>
        <RequireAuth>
          <p>protected</p>
        </RequireAuth>
      </MemoryRouter>,
    )
    expect(screen.getByText('protected')).toBeInTheDocument()
    expect(authState.signinRedirect).not.toHaveBeenCalled()
  })

  it('shows a sign-in error instead of looping when the login callback failed', () => {
    resetAuth({ isAuthenticated: false, user: null, error: new Error('invalid_grant') })
    render(
      <MemoryRouter>
        <RequireAuth>
          <p>protected</p>
        </RequireAuth>
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/sign-in failed/i)
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(authState.signinRedirect).not.toHaveBeenCalled()
  })
})

describe('RequireAuth recovery', () => {
  it('drops OIDC callback parameters from the page to return to after a failed callback', async () => {
    resetAuth({ isAuthenticated: false, user: null, error: new Error('invalid_grant') })
    render(
      <MemoryRouter initialEntries={['/submissions?code=abc&state=xyz&session_state=s&iss=http%3A%2F%2Fkc&status=RECEIVED']}>
        <RequireAuth>
          <p>protected</p>
        </RequireAuth>
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(authState.signinRedirect).toHaveBeenCalledWith({ state: { returnTo: '/submissions?status=RECEIVED' } })
  })

  it('offers sign out on the sign-in error screen', () => {
    resetAuth({ isAuthenticated: false, user: null, error: new Error('invalid_grant') })
    render(
      <MemoryRouter>
        <RequireAuth>
          <p>protected</p>
        </RequireAuth>
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('signs in again when the token has expired', () => {
    resetAuth({ user: { access_token: 'old', expired: true, profile: {} } as never })
    render(
      <MemoryRouter initialEntries={['/submissions']}>
        <RequireAuth>
          <p>protected</p>
        </RequireAuth>
      </MemoryRouter>,
    )
    expect(authState.signinRedirect).toHaveBeenCalledWith({ state: { returnTo: '/submissions' } })
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
  })
})

describe('SignOutButton', () => {
  it('ends the Keycloak session through the end-session redirect', async () => {
    render(<SignOutButton />)
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(authState.signoutRedirect).toHaveBeenCalledTimes(1)
  })
})
