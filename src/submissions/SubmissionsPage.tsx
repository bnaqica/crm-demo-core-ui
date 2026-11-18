import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { useApi } from '../api/ApiProvider'
import { ApiErrorMessage } from '../api/ApiErrorMessage'
import { teamLabel } from '../capabilities'
import { useCurrentTeam } from '../shell/TeamContext'
import { formatTime, listSubmissions, SUBMISSION_STATUSES, submissionKeys, type SubmissionQuery } from './api'

export function SubmissionsPage() {
  const api = useApi()
  const { teamId } = useCurrentTeam()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const type = params.get('type') ?? ''
  const typeFilter = type.trim()
  const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
  const query: SubmissionQuery = { status: status || undefined, type: typeFilter || undefined, page }

  const result = useQuery({
    queryKey: submissionKeys.list(query),
    queryFn: ({ signal }) => listSubmissions(api, query, signal),
    placeholderData: (previous) => previous,
  })

  const update = (changes: Record<string, string>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value && !(key === 'page' && value === '0')) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true },
    )

  // core-service has no team filter: the team switcher narrows the loaded page.
  const pageRows = result.data?.content ?? []
  const rows = result.data ? pageRows.filter((s) => !teamId || s.teamId === teamId) : undefined
  const hidden = pageRows.length - (rows?.length ?? 0)

  return (
    <>
      <h1>Submissions</h1>
      <div className="filters">
        <label>
          Status
          <select value={status} onChange={(e) => update({ status: e.target.value, page: '0' })}>
            <option value="">All statuses</option>
            {SUBMISSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <input
            value={type}
            maxLength={100}
            onChange={(e) => update({ type: e.target.value.toUpperCase(), page: '0' })}
            placeholder="e.g. CLAIM"
          />
        </label>
      </div>
      <ApiErrorMessage error={result.error} />
      {result.isPending ? (
        <p role="status">Loading submissions…</p>
      ) : rows && pageRows.length === 0 ? (
        <p>No submissions match these filters.</p>
      ) : rows && rows.length === 0 && teamId ? (
        <p>
          None of the {pageRows.length} submissions on this page belong to {teamLabel(teamId)}.
          {result.data && result.data.totalPages > 1 ? ' Check the other pages.' : ''}
        </p>
      ) : rows ? (
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Region</th>
              <th>Submitter</th>
              <th>Team</th>
              <th>Status</th>
              <th>Received</th>
              <th>
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{s.type}</td>
                <td>{s.region}</td>
                <td>{s.submitterEmail}</td>
                <td>{teamLabel(s.teamId)}</td>
                <td>{s.status}</td>
                <td>
                  <time dateTime={s.receivedAt}>{formatTime(s.receivedAt)}</time>
                </td>
                <td>
                  <Link to={`/submissions/${encodeURIComponent(s.id)}`} aria-label={`Open submission from ${s.submitterEmail}`}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {rows && rows.length > 0 && hidden > 0 ? (
        <p>
          Showing {rows.length} of the {pageRows.length} submissions on this page (other teams hidden).
        </p>
      ) : null}
      {result.data && result.data.totalPages > 1 ? (
        <nav className="actions" aria-label="Pages">
          <button aria-label="Previous page" disabled={page === 0} onClick={() => update({ page: String(page - 1) })}>
            ←
          </button>
          <span>
            Page {page + 1} of {result.data.totalPages} ({result.data.totalElements} submissions)
          </span>
          <button
            aria-label="Next page"
            disabled={page + 1 >= result.data.totalPages}
            onClick={() => update({ page: String(page + 1) })}
          >
            →
          </button>
        </nav>
      ) : null}
    </>
  )
}
