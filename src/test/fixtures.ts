import type { CapabilitiesResponse } from '../capabilities/types'

/** Team ids are UMS UUIDs; core-service sends no team names, so the UI labels a team by its id prefix. */
export const TEAM_A = { id: 'aaaaaaaa-0000-4000-8000-00000000000a', name: 'Team aaaaaaaa' }
export const TEAM_B = { id: 'bbbbbbbb-0000-4000-8000-00000000000b', name: 'Team bbbbbbbb' }

/** Matches core-service CapabilitiesResponse. */
export function capabilities(overrides: Partial<CapabilitiesResponse> = {}): CapabilitiesResponse {
  return {
    sub: 'user-1',
    name: 'Tess Member',
    permissions: ['submissions:read'],
    uiFeatures: [],
    memberTeams: [TEAM_A.id],
    managedTeams: [],
    allTeams: false,
    ...overrides,
  }
}
