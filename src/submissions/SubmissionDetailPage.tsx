import { useId, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { useApi } from '../api/ApiProvider'
import { ApiErrorMessage } from '../api/ApiErrorMessage'
import { ApiError } from '../api/client'
import { Can, ReadOnlyBadge, teamLabel } from '../capabilities'
import {
  acceptSubmission,
  formatTime,
  getSubmission,
  promoteSubmitter,
  REJECTION_REASON_MAX,
  rejectSubmission,
  submissionKeys,
  type Submission,
} from './api'

export function SubmissionDetailPage() {
  const { id = '' } = useParams()
  const api = useApi()
  const query = useQuery({ queryKey: submissionKeys.detail(id), queryFn: ({ signal }) => getSubmission(api, id, signal) })

  if (query.isPending) return <p role="status">Loading submission…</p>
  if (query.isError)
    return (
      <>
        <ApiErrorMessage error={query.error} />
        <Link to="/submissions">Back to submissions</Link>
      </>
    )
  return <SubmissionDetail submission={query.data} />
}

function SubmissionDetail({ submission }: { submission: Submission }) {
  // A 409 can mean the submission was decided elsewhere; the reload then removes the decision controls,
  // so the explanation is kept here rather than inside them.
  const [conflict, setConflict] = useState<unknown>(null)
  return (
    <article>
      <p>
        <Link to="/submissions">← Submissions</Link>
      </p>
      <h1>
        {submission.type} submission <ReadOnlyBadge teamId={submission.teamId} />
      </h1>
      <dl className="details">
        <dt>Status</dt>
        <dd>{submission.status}</dd>
        <dt>Version</dt>
        <dd>{submission.version}</dd>
        {submission.status === 'REJECTED' && submission.rejectionReason ? (
          <>
            <dt>Rejection reason</dt>
            <dd className="reason">{submission.rejectionReason}</dd>
          </>
        ) : null}
        <dt>Region</dt>
        <dd>{submission.region}</dd>
        <dt>Submitter</dt>
        <dd>{submission.submitterEmail}</dd>
        <dt>Team</dt>
        <dd>{teamLabel(submission.teamId)}</dd>
        <dt>Received</dt>
        <dd>
          <time dateTime={submission.receivedAt}>{formatTime(submission.receivedAt)}</time>
        </dd>
        {submission.decidedAt ? (
          <>
            <dt>Decided</dt>
            <dd>
              <time dateTime={submission.decidedAt}>{formatTime(submission.decidedAt)}</time>
            </dd>
          </>
        ) : null}
      </dl>

      <h2>Documents</h2>
      {submission.documents.length === 0 ? (
        <p>No documents.</p>
      ) : (
        <ul>
          {submission.documents.map((d) => (
            <li key={d.documentId}>
              {d.documentId} ({d.contentType}, {formatSize(d.size)})
            </li>
          ))}
        </ul>
      )}

      <ApiErrorMessage error={conflict} />
      {submission.status === 'RECEIVED' ? (
        <Can permission="submissions:write" teamId={submission.teamId}>
          <Decision submission={submission} onConflict={setConflict} />
        </Can>
      ) : null}
      <Can permission="portal-users:write" teamId={submission.teamId}>
        <PromoteSubmitter submission={submission} />
      </Can>
    </article>
  )
}

function useDecisionHandlers(submission: Submission, onConflict: (error: unknown) => void) {
  const queryClient = useQueryClient()
  return {
    onMutate: () => onConflict(null),
    onSuccess: (updated: Submission) => {
      queryClient.setQueryData(submissionKeys.detail(submission.id), updated)
      void queryClient.invalidateQueries({ queryKey: submissionKeys.all, refetchType: 'none' })
    },
    // 409: decided elsewhere or corrected by the portal since it was loaded — show the current version.
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.status === 409) {
        onConflict(error)
        void queryClient.invalidateQueries({ queryKey: submissionKeys.detail(submission.id) })
      }
    },
  }
}

function Decision({ submission, onConflict }: { submission: Submission; onConflict: (error: unknown) => void }) {
  const api = useApi()
  const handlers = useDecisionHandlers(submission, onConflict)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const reasonId = useId()
  const errorId = useId()

  const accept = useMutation({ mutationFn: () => acceptSubmission(api, submission), ...handlers })
  const reject = useMutation({ mutationFn: (text: string) => rejectSubmission(api, submission, text), ...handlers })
  const busy = accept.isPending || reject.isPending

  const submitRejection = (event: FormEvent) => {
    event.preventDefault()
    const text = reason.trim()
    if (!text) {
      setReasonError('Enter a reason the submitter will see.')
      return
    }
    setReasonError(null)
    reject.mutate(text)
  }

  return (
    <section aria-label="Decision">
      <div className="actions">
        <button className="primary" disabled={busy} onClick={() => accept.mutate()}>
          Accept
        </button>
        {!rejecting ? (
          <button className="danger" disabled={busy} onClick={() => setRejecting(true)}>
            Reject
          </button>
        ) : null}
      </div>
      {rejecting ? (
        <form onSubmit={submitRejection} noValidate>
          <label htmlFor={reasonId}>Reason (shown to the submitter)</label>
          <textarea
            id={reasonId}
            value={reason}
            maxLength={REJECTION_REASON_MAX}
            rows={3}
            aria-invalid={reasonError ? true : undefined}
            aria-describedby={reasonError ? errorId : undefined}
            onChange={(e) => {
              setReason(e.target.value)
              if (reasonError) setReasonError(null)
            }}
          />
          <small>
            {reason.length}/{REJECTION_REASON_MAX}
          </small>
          {reasonError ? (
            <p role="alert" id={errorId}>
              {reasonError}
            </p>
          ) : null}
          <div className="actions">
            <button type="submit" className="danger" disabled={busy}>
              Confirm rejection
            </button>
            <button type="button" onClick={() => setRejecting(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      <ApiErrorMessage error={nonConflict(reject.submittedAt > accept.submittedAt ? reject.error : accept.error)} />
    </section>
  )
}

const nonConflict = (error: unknown) => (error instanceof ApiError && error.status === 409 ? null : error)

/**
 * core-service doesn't say whether the submitter is a starter, so Promote is offered to every team member holding
 * `portal-users:write`. Promotion is idempotent there (a standard user "promotes" again successfully); a 409 means
 * the account's state doesn't allow it.
 */
function PromoteSubmitter({ submission }: { submission: Submission }) {
  const api = useApi()
  const [confirming, setConfirming] = useState(false)
  const promote = useMutation({
    mutationFn: () => promoteSubmitter(api, submission.id),
    onSettled: () => setConfirming(false),
  })

  if (promote.isSuccess) return <p role="status" className="success">{submission.submitterEmail} now has standard access.</p>

  return (
    <section aria-label="Promote submitter">
      {confirming ? (
        <div className="actions">
          <span>Give {submission.submitterEmail} standard portal access?</span>
          <button className="primary" disabled={promote.isPending} onClick={() => promote.mutate()}>
            Yes, promote
          </button>
          <button disabled={promote.isPending} onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="actions">
          <button onClick={() => setConfirming(true)}>Promote submitter</button>
        </div>
      )}
      <ApiErrorMessage error={promote.error} />
    </section>
  )
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
