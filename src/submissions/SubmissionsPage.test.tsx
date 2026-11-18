import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/render'
import { resetAuth } from '../test/mockOidc'
import { capabilities, TEAM_A, TEAM_B } from '../test/fixtures'
import { fakeCore, submission } from '../test/fakeCore'
import { AppRoutes } from '../shell/AppRoutes'
import { appRoutes } from '../routes'

vi.mock('react-oidc-context', () => import('../test/mockOidc'))

beforeEach(() => resetAuth())

const all = [
  submission({ id: 's1', status: 'RECEIVED', submitterEmail: 'a@example.com' }),
  submission({ id: 's2', status: 'ACCEPTED', submitterEmail: 'b@example.com' }),
  submission({ id: 's3', status: 'REJECTED', type: 'QUOTE', region: 'US', submitterEmail: 'c@example.com', teamId: TEAM_B.id }),
]

const rowEmails = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[2]?.textContent)

describe('Submissions list', () => {
  it('lists type, region, submitter email, team, status and received time', async () => {
    fakeCore({ submissions: [all[0]!] })
    renderWithProviders(<AppRoutes routes={appRoutes} />, { path: '/submissions' })
    const row = (await screen.findAllByRole('row'))[1]!
    const cells = within(row).getAllByRole('cell').map((c) => c.textContent)
    expect(cells.slice(0, 5)).toEqual(['CLAIM', 'EU', 'a@example.com', 'Team aaaaaaaa', 'RECEIVED'])
    expect(within(row).getByText(/2026/)).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: /open/i })).toHaveAttribute('href', '/submissions/s1')
  })

  it('filters by status RECEIVED so only RECEIVED submissions are listed', async () => {
    const core = fakeCore({ submissions: all })
    renderWithProviders(<AppRoutes routes={appRoutes} />, { path: '/submissions' })
    await screen.findByText('c@example.com')

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'RECEIVED')

    await vi.waitFor(() => expect(rowEmails()).toEqual(['a@example.com']))
    expect(core.calls.at(-1)?.search).toBe('?status=RECEIVED&page=0&size=50')
  })

  it('filters by type and by the team chosen in the team switcher', async () => {
    const core = fakeCore({
      caps: capabilities({ permissions: ['submissions:read'], memberTeams: [TEAM_A.id, TEAM_B.id] }),
      submissions: all,
    })
    renderWithProviders(<AppRoutes routes={appRoutes} />, { path: '/submissions' })
    await screen.findByText('c@example.com')

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Team' }), TEAM_B.id)
    await vi.waitFor(() => expect(rowEmails()).toEqual(['c@example.com']))
    // core-service has no team filter parameter: the team filter applies to the loaded page.
    expect(core.calls.every((c) => !c.search.includes('teamId'))).toBe(true)

    await userEvent.type(screen.getByLabelText('Type'), 'claim ')
    await vi.waitFor(() =>
      expect(screen.getByText('None of the 2 submissions on this page belong to Team bbbbbbbb.')).toBeInTheDocument(),
    )
    expect(core.calls.at(-1)?.search).toBe('?type=CLAIM&page=0&size=50')
  })

  it('says when the team filter hides this page’s submissions instead of claiming there are none', async () => {
    fakeCore({
      caps: capabilities({ permissions: ['submissions:read'], memberTeams: [TEAM_A.id, TEAM_B.id] }),
      submissions: [all[0]!, all[1]!],
    })
    renderWithProviders(<AppRoutes routes={appRoutes} />, { path: '/submissions' })
    await screen.findByText('a@example.com')

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Team' }), TEAM_B.id)

    expect(await screen.findByText('None of the 2 submissions on this page belong to Team bbbbbbbb.')).toBeInTheDocument()
    expect(screen.queryByText('No submissions match these filters.')).not.toBeInTheDocument()
  })

  it('says how many of the page’s submissions the team filter shows', async () => {
    fakeCore({
      caps: capabilities({ permissions: ['submissions:read'], memberTeams: [TEAM_A.id, TEAM_B.id] }),
      submissions: all,
    })
    renderWithProviders(<AppRoutes routes={appRoutes} />, { path: '/submissions' })
    await screen.findByText('a@example.com')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Team' }), TEAM_B.id)
    expect(await screen.findByText('Showing 1 of the 3 submissions on this page (other teams hidden).')).toBeInTheDocument()
  })

  it('pages through results 50 at a time', async () => {
    const many = Array.from({ length: 51 }, (_, i) =>
      submission({ id: `s${i}`, submitterEmail: `user${String(i).padStart(2, '0')}@example.com` }),
    )
    const core = fakeCore({ submissions: many })
    renderWithProviders(<AppRoutes routes={appRoutes} />, { path: '/submissions' })
    expect(await screen.findByText('Page 1 of 2 (51 submissions)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))

    await vi.waitFor(() => expect(rowEmails()).toEqual(['user50@example.com']))
    expect(core.calls.at(-1)?.search).toBe('?page=1&size=50')
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('is absent from navigation without submissions:read', async () => {
    fakeCore({ caps: capabilities({ permissions: [] }) })
    renderWithProviders(<AppRoutes routes={appRoutes} />, { path: '/' })
    const nav = await screen.findByRole('navigation', { name: 'Main' })
    expect(within(nav).queryByRole('link', { name: 'Submissions' })).not.toBeInTheDocument()
  })
})
