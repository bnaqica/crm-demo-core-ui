import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useCapabilities, type Team } from '../capabilities'

export type TeamOption = Team & { managed: boolean }

type TeamContextValue = {
  /** null = all of the user's teams */
  teamId: string | null
  setTeamId: (teamId: string | null) => void
  teams: TeamOption[]
}

const TeamContext = createContext<TeamContextValue | null>(null)

export function TeamProvider({ children }: { children: ReactNode }) {
  const caps = useCapabilities()
  const [teamId, setTeamId] = useState<string | null>(null)
  const teams = useMemo(() => {
    const byId = new Map<string, TeamOption>()
    for (const team of caps.memberTeams) byId.set(team.id, { ...team, managed: false })
    for (const team of caps.managedTeams) byId.set(team.id, { ...(byId.get(team.id) ?? team), managed: true })
    return [...byId.values()]
  }, [caps])
  const current = teamId !== null && teams.some((t) => t.id === teamId) ? teamId : null
  const value = useMemo(() => ({ teamId: current, setTeamId, teams }), [current, teams])
  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}

export function useCurrentTeam(): TeamContextValue {
  const value = useContext(TeamContext)
  if (!value) throw new Error('useCurrentTeam must be used inside <TeamProvider>')
  return value
}
