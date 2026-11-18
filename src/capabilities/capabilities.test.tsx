import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Can, ReadOnlyBadge, StaticCapabilities, useCan } from '.'
import { capabilities, TEAM_A, TEAM_B } from '../test/fixtures'

function Probe({ permission, teamId }: { permission: string; teamId?: string }) {
  return <span>{useCan(permission, teamId) ? 'yes' : 'no'}</span>
}

function check(caps: Parameters<typeof capabilities>[0], permission: string, teamId?: string) {
  const { unmount } = render(
    <StaticCapabilities value={capabilities(caps)}>
      <Probe permission={permission} teamId={teamId} />
    </StaticCapabilities>,
  )
  const result = screen.getByText(/yes|no/).textContent
  unmount()
  return result
}

describe('useCan', () => {
  it('grants a held permission and denies a missing one', () => {
    expect(check({ permissions: ['submissions:read'] }, 'submissions:read')).toBe('yes')
    expect(check({ permissions: ['submissions:read'] }, 'submissions:write')).toBe('no')
  })

  it('treats write as implying read', () => {
    expect(check({ permissions: ['submissions:write'] }, 'submissions:read')).toBe('yes')
  })

  it('does not let read of one resource imply another', () => {
    expect(check({ permissions: ['routing-rules:write'] }, 'submissions:read')).toBe('no')
  })

  it('maps ui: permissions to uiFeatures', () => {
    expect(check({ uiFeatures: ['team-dashboard'] }, 'ui:team-dashboard')).toBe('yes')
    expect(check({ uiFeatures: [] }, 'ui:team-dashboard')).toBe('no')
  })

  it('allows write on a team the user is a member of', () => {
    expect(check({ permissions: ['submissions:write'], memberTeams: [TEAM_A.id] }, 'submissions:write', TEAM_A.id)).toBe('yes')
  })

  it('hides write on another team even with all-teams scope (cross-team read-only)', () => {
    const superManager = { permissions: ['submissions:write'], memberTeams: [TEAM_A.id], allTeams: true }
    expect(check(superManager, 'submissions:write', TEAM_B.id)).toBe('no')
    expect(check(superManager, 'submissions:read', TEAM_B.id)).toBe('yes')
  })

  it('hides write on a team the user only manages', () => {
    expect(
      check({ permissions: ['submissions:write'], memberTeams: [], managedTeams: [TEAM_B.id] }, 'submissions:write', TEAM_B.id),
    ).toBe('no')
  })

  it('allows read on member and managed teams but not other teams without all-teams scope', () => {
    const caps = { permissions: ['submissions:read'], memberTeams: [TEAM_A.id], managedTeams: [TEAM_B.id] }
    expect(check(caps, 'submissions:read', TEAM_A.id)).toBe('yes')
    expect(check(caps, 'submissions:read', TEAM_B.id)).toBe('yes')
    expect(check(caps, 'submissions:read', 'team-z')).toBe('no')
  })
})

describe('<Can>', () => {
  it('renders children only when allowed, otherwise the fallback', () => {
    render(
      <StaticCapabilities value={capabilities({ permissions: ['submissions:read'] })}>
        <Can permission="submissions:write" fallback={<span>no write</span>}>
          <button>Accept</button>
        </Can>
        <Can permission="submissions:read">
          <span>can read</span>
        </Can>
      </StaticCapabilities>,
    )
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    expect(screen.getByText('no write')).toBeInTheDocument()
    expect(screen.getByText('can read')).toBeInTheDocument()
  })

  it('hides write controls on another team for a Super Manager and shows a read-only badge', () => {
    render(
      <StaticCapabilities
        value={capabilities({ permissions: ['submissions:write'], memberTeams: [TEAM_A.id], allTeams: true })}
      >
        <ReadOnlyBadge teamId={TEAM_B.id} />
        <Can permission="submissions:write" teamId={TEAM_B.id}>
          <button>Reject</button>
        </Can>
      </StaticCapabilities>,
    )
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
    expect(screen.getByText('Read-only')).toBeInTheDocument()
  })

  it('shows no read-only badge on the user’s own team', () => {
    render(
      <StaticCapabilities value={capabilities({ memberTeams: [TEAM_A.id] })}>
        <ReadOnlyBadge teamId={TEAM_A.id} />
      </StaticCapabilities>,
    )
    expect(screen.queryByText('Read-only')).not.toBeInTheDocument()
  })
})
