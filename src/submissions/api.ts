import type { ApiClient } from '../api/client'

export const SUBMISSION_STATUSES = ['RECEIVED', 'ACCEPTED', 'REJECTED'] as const
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

/** core-service RejectSubmissionRequest: reason 1–500 characters. */
export const REJECTION_REASON_MAX = 500
export const PAGE_SIZE = 50

/** core-service SubmissionResponse.Document: a reference; the file stays in the portal. */
export type SubmissionDocument = { documentId: string; contentType: string; size: number; sha256: string }

/** core-service SubmissionResponse. */
export type Submission = {
  id: string
  /** The portal's version; decisions name the version the user looked at (an older one is a 409). */
  version: number
  type: string
  region: string
  status: SubmissionStatus
  teamId: string
  portalUserId: string
  submitterEmail: string
  receivedAt: string
  decidedAt: string | null
  /** Shown to the submitter; only when REJECTED. */
  rejectionReason: string | null
  documents: SubmissionDocument[]
}

/** core-service SubmissionPageResponse (newest first, page counts from 0). */
export type SubmissionPage = { content: Submission[]; page: number; size: number; totalElements: number; totalPages: number }

/** Query parameters core-service accepts (it has no team filter). */
export type SubmissionQuery = { status?: string; type?: string; page: number }

/** core-service PromotionResponse. */
export type PromotionResult = { portalUserId: string; promoted: boolean; tier: string; status: string | null }

export const submissionKeys = {
  all: ['submissions'] as const,
  list: (query: SubmissionQuery) => ['submissions', 'list', query] as const,
  detail: (id: string) => ['submissions', 'detail', id] as const,
}

export function listSubmissions(api: ApiClient, query: SubmissionQuery, signal?: AbortSignal) {
  const params = new URLSearchParams()
  if (query.status) params.set('status', query.status)
  if (query.type) params.set('type', query.type)
  params.set('page', String(query.page))
  params.set('size', String(PAGE_SIZE))
  return api.request<SubmissionPage>(`/submissions?${params}`, { signal })
}

const path = (id: string) => `/submissions/${encodeURIComponent(id)}`

export const getSubmission = (api: ApiClient, id: string, signal?: AbortSignal) => api.request<Submission>(path(id), { signal })
export const acceptSubmission = (api: ApiClient, s: Pick<Submission, 'id' | 'version'>) =>
  api.request<Submission>(`${path(s.id)}/accept`, { method: 'POST', body: { version: s.version } })
export const rejectSubmission = (api: ApiClient, s: Pick<Submission, 'id' | 'version'>, reason: string) =>
  api.request<Submission>(`${path(s.id)}/reject`, { method: 'POST', body: { reason, version: s.version } })
export const promoteSubmitter = (api: ApiClient, id: string) =>
  api.request<PromotionResult>(`${path(id)}/promote-submitter`, { method: 'POST' })

export function formatTime(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
