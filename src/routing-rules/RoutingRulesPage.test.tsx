import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/render'
import { resetAuth } from '../test/mockOidc'
import { capabilities, TEAM_A, TEAM_B } from '../test/fixtures'
import { fakeCore } from '../test/fakeCore'
import { AppRoutes } from '../shell/AppRoutes'
import { appRoutes } from '../routes'
import type { RoutingRule } from './api'

vi.mock('react-oidc-context', () => import('../test/mockOidc'))

beforeEach(() => resetAuth())

const ruleWriter = capabilities({ permissions: ['routing-rules:write'], memberTeams: [TEAM_A.id, TEAM_B.id] })
const rules: RoutingRule[] = [
  { id: 'r1', position: 0, type: 'CLAIM', region: 'US', teamId: TEAM_B.id },
  { id: 'r2', position: 1, type: 'QUOTE', region: 'EU', teamId: TEAM_A.id },
]
const open = () => renderWithProviders(<AppRoutes routes={appRoutes} />, { path: '/routing-rules' })
const listed = () =>
  within(screen.getByRole('list', { name: 'Routing rules in order' }))
    .getAllByRole('listitem')
    .map((li) => li.querySelector('.rule-text')?.textContent)

describe('Routing rules', () => {
  it('appears in navigation only with routing-rules:write', async () => {
    fakeCore({ caps: capabilities({ permissions: ['submissions:read'] }) })
    renderWithProviders(<AppRoutes routes={appRoutes} />)
    const nav = await screen.findByRole('navigation', { name: 'Main' })
    expect(within(nav).queryByRole('link', { name: 'Routing rules' })).not.toBeInTheDocument()
  })

  it('lists rules in order', async () => {
    fakeCore({ caps: ruleWriter, rules })
    open()
    await screen.findByRole('list', { name: 'Routing rules in order' })
    expect(listed()).toEqual(['CLAIM, US → Team bbbbbbbb', 'QUOTE, EU → Team aaaaaaaa'])
  })

  it('adds CLAIM, EU → Team aaaaaaaa and shows it in the ordered list', async () => {
    const core = fakeCore({ caps: ruleWriter, rules })
    open()
    await screen.findByRole('list', { name: 'Routing rules in order' })
    await userEvent.type(screen.getByLabelText('Type'), 'claim')
    await userEvent.type(screen.getByLabelText('Region'), 'eu')
    await userEvent.selectOptions(screen.getByLabelText('Target team'), TEAM_A.id)
    await userEvent.click(screen.getByRole('button', { name: 'Add rule' }))

    await vi.waitFor(() =>
      expect(listed()).toEqual(['CLAIM, US → Team bbbbbbbb', 'QUOTE, EU → Team aaaaaaaa', 'CLAIM, EU → Team aaaaaaaa']),
    )
    expect(core.calls.find((c) => c.method === 'POST')?.body).toEqual({ type: 'CLAIM', region: 'EU', teamId: TEAM_A.id })
  })

  it('requires type, region and team before adding', async () => {
    const core = fakeCore({ caps: ruleWriter })
    open()
    await userEvent.click(await screen.findByRole('button', { name: 'Add rule' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a type, a region and a target team.')
    expect(core.calls).toEqual([])
  })

  it('moves a rule up with the keyboard-accessible button and saves the order', async () => {
    const core = fakeCore({ caps: ruleWriter, rules })
    open()
    await userEvent.click(await screen.findByRole('button', { name: 'Move QUOTE, EU → Team aaaaaaaa up' }))
    await vi.waitFor(() => expect(listed()).toEqual(['QUOTE, EU → Team aaaaaaaa', 'CLAIM, US → Team bbbbbbbb']))
    expect(core.calls.find((c) => c.path === '/routing-rules/order')?.body).toEqual({ ruleIds: ['r2', 'r1'] })
    expect(screen.getByRole('button', { name: 'Move QUOTE, EU → Team aaaaaaaa up' })).toBeDisabled()
  })

  it('reorders by drag and drop', async () => {
    const core = fakeCore({ caps: ruleWriter, rules })
    open()
    await screen.findByRole('list', { name: 'Routing rules in order' })
    const [first, second] = within(screen.getByRole('list', { name: 'Routing rules in order' })).getAllByRole('listitem')
    fireEvent.dragStart(first!)
    fireEvent.dragOver(second!)
    fireEvent.drop(second!)
    await vi.waitFor(() => expect(listed()).toEqual(['QUOTE, EU → Team aaaaaaaa', 'CLAIM, US → Team bbbbbbbb']))
    expect(core.calls.find((c) => c.path === '/routing-rules/order')?.body).toEqual({ ruleIds: ['r2', 'r1'] })
  })

  it('deletes a rule after confirmation', async () => {
    const core = fakeCore({ caps: ruleWriter, rules })
    open()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete CLAIM, US → Team bbbbbbbb' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    await vi.waitFor(() => expect(listed()).toEqual(['QUOTE, EU → Team aaaaaaaa']))
    expect(core.calls.find((c) => c.method === 'DELETE')?.path).toBe('/routing-rules/r1')
  })
})
