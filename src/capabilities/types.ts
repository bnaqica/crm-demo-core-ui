export type Team = { id: string; name: string }

/**
 * core-service CapabilitiesResponse for GET /me/capabilities. Teams are UMS team UUIDs (no names);
 * permissions already include the `:read` implied by each `:write`; uiFeatures come without the `ui:` prefix.
 */
export type CapabilitiesResponse = {
  sub: string
  name: string
  permissions: string[]
  uiFeatures: string[]
  memberTeams: string[]
  managedTeams: string[]
  allTeams: boolean
}

export type Capabilities = {
  sub: string
  name: string
  permissions: ReadonlySet<string>
  uiFeatures: ReadonlySet<string>
  memberTeams: Team[]
  managedTeams: Team[]
  allTeams: boolean
}
