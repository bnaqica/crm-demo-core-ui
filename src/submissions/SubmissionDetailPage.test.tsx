import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { BASE, renderWithProviders } from '../test/render'
import { resetAuth } from '../test/mockOidc'
import { capabilities, TEAM_A, TEAM_B } from '../test/fixtures'
import { fakeCore, submission } from '../test/fakeCore'
import { AppRoutes } from '../shell/AppRoutes'
import { appRoutes } from '../routes'

vi.mock('react-oidc-context', () => import('../test/mockOidc'))

beforeEach(() => resetAuth())

const open = (id = 's1') => renderWithProviders(<AppRoutes routes={appRoutes} />, { path: `/submissions/${id}` })
const writer = capabilities({ permissions: ['submissions:write'], memberTeams: [TEAM_A.id] })

describe('Submission detail', () => {
  it('shows the submission with its documents', async () => {
    fakeCore({ caps: writer })
    open()
    expect(await screen.findByRole('heading', { name: /CLAIM submission/ })).toBeInTheDocument()
    expect(screen.getByText('starter@example.com')).toBeInTheDocument()
    expect(screen.getByText(/d1 \(application\/pdf, 2\.0 KB\)/)).toBeInTheDocument()
  })

  it('accepts a RECEIVED submission and shows ACCEPTED', async () => {
    const core = fakeCore({ caps: writer })
    open()
    await userEvent.click(await screen.findByRole('button', { name: 'Accept' }))
    expect(await screen.findByText('ACCEPTED')).toBeInTheDocument()
    expect(core.calls.filter((c) => c.method === 'POST')).toEqual([
      { method: 'POST', path: '/submissions/s1/accept', search: '', body: { version: 1 } },
    ])
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
  })

  it('refuses to reject without a reason and sends nothing', async () => {
    const core = fakeCore({ caps: writer })
    open()
    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a reason the submitter will see.')
    expect(screen.getByLabelText(/reason/i)).toHaveAttribute('aria-invalid', 'true')
    expect(core.calls.filter((c) => c.method === 'POST')).toEqual([])
  })

  it('treats a whitespace-only reason as missing', async () => {
    const core = fakeCore({ caps: writer })
    open()
    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }))
    await userEvent.type(screen.getByLabelText(/reason/i), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a reason the submitter will see.')
    expect(core.calls.filter((c) => c.method === 'POST')).toEqual([])
  })

  it('rejects with a reason, shows REJECTED and the reason as plain text', async () => {
    const core = fakeCore({ caps: writer })
    open()
    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }))
    expect(screen.getByLabelText(/reason/i)).toHaveAttribute('maxLength', '500')
    await userEvent.type(screen.getByLabelText(/reason/i), '<b>Missing invoice</b>')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    expect(await screen.findByText('REJECTED')).toBeInTheDocument()
    expect(screen.getByText('<b>Missing invoice</b>')).toBeInTheDocument()
    expect(core.calls.find((c) => c.path === '/submissions/s1/reject')?.body).toEqual({ reason: '<b>Missing invoice</b>', version: 1 })
  })

  it('hides Accept and Reject from a read-only user', async () => {
    fakeCore({ caps: capabilities({ permissions: ['submissions:read'], memberTeams: [TEAM_A.id] }) })
    open()
    await screen.findByRole('heading', { name: /CLAIM submission/ })
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
  })

  it('shows another team’s submission read-only to a Super Manager', async () => {
    fakeCore({
      caps: capabilities({ permissions: ['submissions:write', 'portal-users:write'], memberTeams: [TEAM_A.id], allTeams: true }),
      submissions: [submission({ teamId: TEAM_B.id })],
    })
    open()
    expect(await screen.findByText('Read-only')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Promote submitter' })).not.toBeInTheDocument()
  })

  it('offers no decision on a submission that is already decided', async () => {
    fakeCore({ caps: writer, submissions: [submission({ status: 'ACCEPTED' })] })
    open()
    await screen.findByText('ACCEPTED')
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
  })

  it('shows not authorized when the server refuses the decision', async () => {
    fakeCore({ caps: writer })
    server.use(http.post(`${BASE}/submissions/s1/accept`, () => HttpResponse.json({ title: 'Forbidden' }, { status: 403 })))
    open()
    await userEvent.click(await screen.findByRole('button', { name: 'Accept' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/not authorized/i)
  })

  it('decides the version on screen and, on a 409 (corrected meanwhile), shows why and reloads it', async () => {
    const core = fakeCore({ caps: writer, submissions: [submission({ version: 1 })] })
    open()
    await screen.findByRole('button', { name: 'Accept' })
    core.state.submissions[0]!.version = 2 // the portal sent a correction after the page loaded

    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Submission s1 is RECEIVED at version 2')
    await vi.waitFor(() => expect(core.calls.filter((c) => c.method === 'GET' && c.path === '/submissions/s1')).toHaveLength(2))
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('keeps the conflict explanation when someone else decided the submission meanwhile', async () => {
    const core = fakeCore({ caps: writer })
    open()
    await screen.findByRole('button', { name: 'Accept' })
    core.state.submissions[0]!.status = 'REJECTED' // decided by a colleague after the page loaded

    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))

    expect(await screen.findByText('REJECTED')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Submission s1 is REJECTED at version 1')
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
  })

  it('shows not found for an unknown or out-of-scope submission', async () => {
    fakeCore({ caps: writer })
    open('nope')
    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i)
  })
})

describe('Promote submitter', () => {
  const promoter = capabilities({ permissions: ['submissions:read', 'portal-users:write'], memberTeams: [TEAM_A.id] })

  it('asks for confirmation, then shows success and no longer offers the button', async () => {
    const core = fakeCore({ caps: promoter })
    open()
    await userEvent.click(await screen.findByRole('button', { name: 'Promote submitter' }))
    expect(core.calls.filter((c) => c.method === 'POST')).toEqual([])
    await userEvent.click(screen.getByRole('button', { name: 'Yes, promote' }))
    expect(await screen.findByRole('status')).toHaveTextContent('starter@example.com now has standard access.')
    expect(screen.queryByRole('button', { name: 'Promote submitter' })).not.toBeInTheDocument()
    expect(core.calls.filter((c) => c.method === 'POST')).toEqual([
      { method: 'POST', path: '/submissions/s1/promote-submitter', search: '', body: undefined },
    ])
  })

  it('sends nothing when the confirmation is cancelled', async () => {
    const core = fakeCore({ caps: promoter })
    open()
    await userEvent.click(await screen.findByRole('button', { name: 'Promote submitter' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Promote submitter' })).toBeInTheDocument()
    expect(core.calls.filter((c) => c.method === 'POST')).toEqual([])
  })

  it('is not offered without portal-users:write', async () => {
    fakeCore({ caps: writer })
    open()
    await screen.findByRole('heading', { name: /CLAIM submission/ })
    expect(screen.queryByRole('button', { name: 'Promote submitter' })).not.toBeInTheDocument()
  })

  it('shows the UMS refusal (409) for an account that can’t be promoted', async () => {
    fakeCore({ caps: promoter, inactive: ['p1'] })
    open()
    await userEvent.click(await screen.findByRole('button', { name: 'Promote submitter' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, promote' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The portal user can’t be promoted in their current state')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('asks to try later when the UMS rate-limits promotion (429)', async () => {
    fakeCore({ caps: promoter })
    server.use(
      http.post(`${BASE}/submissions/s1/promote-submitter`, () =>
        HttpResponse.json({ title: 'Too Many Requests', status: 429 }, { status: 429 }),
      ),
    )
    open()
    await userEvent.click(await screen.findByRole('button', { name: 'Promote submitter' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, promote' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/too many requests.*try again later/i)
    expect(screen.getByRole('button', { name: 'Promote submitter' })).toBeInTheDocument()
  })
})
