import { useId } from 'react'
import { useCurrentTeam } from './TeamContext'

export function TeamSwitcher() {
  const { teamId, setTeamId, teams } = useCurrentTeam()
  const id = useId()
  return (
    <div className="team-switcher">
      <label htmlFor={id}>Team</label>
      <select id={id} value={teamId ?? ''} onChange={(e) => setTeamId(e.target.value || null)}>
        <option value="">All my teams</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.managed ? `${team.name} (manager)` : team.name}
          </option>
        ))}
      </select>
    </div>
  )
}
