import type { Capabilities, CapabilitiesResponse, Team } from './types'

/** core-service sends team UUIDs only; until a team directory exists the UI labels a team by its id prefix. */
export function teamLabel(teamId: string): string {
  return `Team ${teamId.slice(0, 8)}`
}

const toTeam = (id: string): Team => ({ id, name: teamLabel(id) })

export function normalize(response: CapabilitiesResponse): Capabilities {
  return {
    sub: response.sub,
    name: response.name,
    permissions: new Set(response.permissions ?? []),
    uiFeatures: new Set((response.uiFeatures ?? []).map((f) => f.replace(/^ui:/, ''))),
    memberTeams: (response.memberTeams ?? []).map(toTeam),
    managedTeams: (response.managedTeams ?? []).map(toTeam),
    allTeams: Boolean(response.allTeams),
  }
}

const isMember = (caps: Capabilities, teamId: string) => caps.memberTeams.some((t) => t.id === teamId)

export function canSeeTeam(caps: Capabilities, teamId: string): boolean {
  return caps.allTeams || isMember(caps, teamId) || caps.managedTeams.some((t) => t.id === teamId)
}

/**
 * The single place the UI decides what to show. It never authorizes: core-service checks every call.
 * - `ui:<feature>` → feature listed in uiFeatures
 * - `<resource>:read` → held directly or implied by `<resource>:write`
 * - any other permission (a write) → held directly
 * - with teamId: reads need the team in scope; writes need membership of the team (cross-team is read-only)
 */
export function can(caps: Capabilities, permission: string, teamId?: string): boolean {
  if (permission.startsWith('ui:')) return caps.uiFeatures.has(permission.slice(3))

  const isRead = permission.endsWith(':read')
  const held = caps.permissions.has(permission) || (isRead && caps.permissions.has(permission.replace(/:read$/, ':write')))
  if (!held) return false
  if (teamId === undefined) return true
  return isRead ? canSeeTeam(caps, teamId) : isMember(caps, teamId)
}

export function isReadOnlyTeam(caps: Capabilities, teamId: string): boolean {
  return !isMember(caps, teamId)
}
