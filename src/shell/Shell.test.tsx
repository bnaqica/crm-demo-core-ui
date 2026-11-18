import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { BASE, renderWithProviders } from '../test/render'
import { capabilities, TEAM_A, TEAM_B } from '../test/fixtures'
import { authState, resetAuth } from '../test/mockOidc'
import { AppRoutes, type AppRoute } from './AppRoutes'
import { useCurrentTeam } from './TeamContext'
import { HomePage } from '../pages/HomePage'

vi.mock('react-oidc-context', () => import('../test/mockOidc'))

function TeamProbe() {
  const { teamId } = useCurrentTeam()
  return <p>current team: {teamId ?? 'all'}</p>
}

const routes: AppRoute[] = [
  { path: '/', label: 'Home', element: <HomePage /> },
  { path: '/submissions', label: 'Submissions', permission: 'submissions:read', element: <TeamProbe /> },
  { path: '/routing-rules', label: 'Routing rules', permission: 'routing-rules:write', element: <p>rules page</p> },
]

function serve(caps: ReturnType<typeof capabilities>) {
  server.use(http.get(`${BASE}/me/capabilities`, () => HttpResponse.json(caps)))
}

beforeEach(() => resetAuth())

describe('navigation', () => {
  it('lists only pages whose permission the user holds', async () => {
    serve(capabilities({ permissions: ['submissions:read'] }))
    renderWithProviders(<AppRoutes routes={routes} />)
    const nav = await screen.findByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Submissions' })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Routing rules' })).not.toBeInTheDocument()
  })

  it('shows a not-authorized page when a page is opened directly without its permission', async () => {
    serve(capabilities({ permissions: ['submissions:read'] }))
    renderWithProviders(<AppRoutes routes={routes} />, { path: '/routing-rules' })
    expect(await screen.findByRole('heading', { name: 'Not authorized' })).toBeInTheDocument()
    expect(screen.queryByText('rules page')).not.toBeInTheDocument()
  })

  it('opens a permitted page directly', async () => {
    serve(capabilities({ permissions: ['routing-rules:write'] }))
    renderWithProviders(<AppRoutes routes={routes} />, { path: '/routing-rules' })
    expect(await screen.findByText('rules page')).toBeInTheDocument()
  })

  it('shows a not-found page for unknown paths', async () => {
    serve(capabilities())
    renderWithProviders(<AppRoutes routes={routes} />, { path: '/nope' })
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})

describe('header', () => {
  it('shows the user’s name and signs out', async () => {
    serve(capabilities({ name: 'Tess Member' }))
    renderWithProviders(<AppRoutes routes={routes} />)
    expect(await screen.findByText('Tess Member')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(authState.signoutRedirect).toHaveBeenCalled()
  })
})

describe('team switcher', () => {
  it('offers member and managed teams once each and sets the current team', async () => {
    serve(capabilities({ permissions: ['submissions:read'], memberTeams: [TEAM_A.id, TEAM_B.id], managedTeams: [TEAM_B.id] }))
    renderWithProviders(<AppRoutes routes={routes} />, { path: '/submissions' })
    const switcher = await screen.findByRole('combobox', { name: 'Team' })
    expect(within(switcher).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'All my teams',
      'Team aaaaaaaa',
      'Team bbbbbbbb (manager)',
    ])
    expect(screen.getByText('current team: all')).toBeInTheDocument()

    await userEvent.selectOptions(switcher, TEAM_B.id)
    expect(screen.getByText(`current team: ${TEAM_B.id}`)).toBeInTheDocument()
  })

  it('labels UUID-only teams by their id prefix (core-service sends no names)', async () => {
    serve(capabilities({ memberTeams: ['1a2b3c4d-0000-4000-8000-000000000001'] }))
    renderWithProviders(<AppRoutes routes={routes} />)
    const switcher = await screen.findByRole('combobox', { name: 'Team' })
    expect(within(switcher).getByRole('option', { name: 'Team 1a2b3c4d' })).toHaveAttribute('value', '1a2b3c4d-0000-4000-8000-000000000001')
  })
})

describe('home page', () => {
  it('hides the team dashboard tile without ui:team-dashboard', async () => {
    serve(capabilities({ uiFeatures: [] }))
    renderWithProviders(<AppRoutes routes={routes} />)
    expect(await screen.findByRole('heading', { name: /welcome/i })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Team dashboard' })).not.toBeInTheDocument()
  })

  it('shows the team dashboard tile with ui:team-dashboard', async () => {
    serve(capabilities({ uiFeatures: ['team-dashboard'], managedTeams: [TEAM_A.id] }))
    renderWithProviders(<AppRoutes routes={routes} />)
    expect(await screen.findByRole('region', { name: 'Team dashboard' })).toBeInTheDocument()
  })
})
