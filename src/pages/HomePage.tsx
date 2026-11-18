import { Can, useCapabilities } from '../capabilities'

export function HomePage() {
  const caps = useCapabilities()
  return (
    <>
      <h1>Welcome, {caps.name}</h1>
      <div className="tiles">
        <Can permission="ui:team-dashboard">
          <section className="tile" aria-labelledby="tile-team-dashboard">
            <h2 id="tile-team-dashboard">Team dashboard</h2>
            <p>
              {caps.managedTeams.length > 0
                ? `You manage ${caps.managedTeams.map((t) => t.name).join(', ')}.`
                : 'Overview of your teams.'}
            </p>
          </section>
        </Can>
      </div>
    </>
  )
}
