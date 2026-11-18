import type { ReactNode } from 'react'
import { useCapabilities } from './CapabilitiesProvider'
import { can, isReadOnlyTeam } from './rules'

export function useCan(permission: string, teamId?: string): boolean {
  return can(useCapabilities(), permission, teamId)
}

type CanProps = { permission: string; teamId?: string; children: ReactNode; fallback?: ReactNode }

export function Can({ permission, teamId, children, fallback = null }: CanProps) {
  return <>{useCan(permission, teamId) ? children : fallback}</>
}

/** Shown on records of a team the user isn't a member of: everything there is read-only. */
export function ReadOnlyBadge({ teamId }: { teamId: string }) {
  if (!isReadOnlyTeam(useCapabilities(), teamId)) return null
  return (
    <span className="badge badge-readonly" title="You are not a member of this team, so you can only view it">
      Read-only
    </span>
  )
}
