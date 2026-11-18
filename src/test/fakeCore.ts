import { http, HttpResponse } from 'msw'
import { server } from './server'
import { BASE } from './render'
import { capabilities, TEAM_A } from './fixtures'
import type { CapabilitiesResponse } from '../capabilities'
import type { Submission } from '../submissions/api'
import type { RoutingRule } from '../routing-rules/api'

/** A submission as core-service's SubmissionResponse returns it. */
export function submission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: 's1',
    version: 1,
    type: 'CLAIM',
    region: 'EU',
    status: 'RECEIVED',
    teamId: TEAM_A.id,
    portalUserId: 'p1',
    submitterEmail: 'starter@example.com',
    receivedAt: '2026-11-10T09:30:00Z',
    decidedAt: null,
    rejectionReason: null,
    documents: [{ documentId: 'd1', contentType: 'application/pdf', size: 2048, sha256: 'abc123' }],
    ...overrides,
  }
}

export type Recorded = { method: string; path: string; search: string; body: unknown }

const problem = (status: number, title: string, detail?: string) =>
  HttpResponse.json({ type: 'about:blank', title, status, detail }, { status, headers: { 'Content-Type': 'application/problem+json' } })

/**
 * A small in-memory core-service following its controllers and docs/submissions-api.md: enough state for the UI
 * flows, and it records every call. Promotion is idempotent as in core-service (a standard user "promotes" again
 * with 200); `inactive` lists portal users whose account state makes the UMS refuse (409).
 */
export function fakeCore({
  caps = capabilities({ permissions: ['submissions:write'] }),
  submissions = [submission()],
  rules = [] as RoutingRule[],
  inactive = [] as string[],
}: { caps?: CapabilitiesResponse; submissions?: Submission[]; rules?: RoutingRule[]; inactive?: string[] } = {}) {
  const state = { submissions: submissions.map((s) => ({ ...s })), rules: rules.map((r) => ({ ...r })) }
  const calls: Recorded[] = []
  const record = async (request: Request) => {
    const url = new URL(request.url)
    const text = request.method === 'GET' ? '' : await request.clone().text()
    calls.push({ method: request.method, path: url.pathname, search: url.search, body: text ? JSON.parse(text) : undefined })
  }
  const find = (id: unknown) => state.submissions.find((s) => s.id === id)
  const decide = async (request: Request, id: unknown, status: 'ACCEPTED' | 'REJECTED') => {
    await record(request)
    const s = find(id)
    if (!s) return problem(404, 'Not Found')
    const body = (await request.json()) as { version?: number; reason?: string }
    if (status === 'REJECTED' && !body.reason?.trim()) return problem(400, 'Bad Request', 'reason must not be blank')
    if (s.status !== 'RECEIVED' || body.version !== s.version)
      return problem(409, 'Conflict', `Submission ${s.id} is ${s.status} at version ${s.version}`)
    s.status = status
    s.decidedAt = '2026-11-11T10:00:00Z'
    if (status === 'REJECTED') s.rejectionReason = body.reason ?? null
    return HttpResponse.json(s)
  }

  server.use(
    http.get(`${BASE}/me/capabilities`, () => HttpResponse.json(caps)),
    http.get(`${BASE}/submissions`, async ({ request }) => {
      await record(request)
      const q = new URL(request.url).searchParams
      const page = Number(q.get('page') ?? 0)
      const size = Number(q.get('size') ?? 50)
      const matching = state.submissions.filter(
        (s) => (!q.get('status') || s.status === q.get('status')) && (!q.get('type') || s.type === q.get('type')),
      )
      return HttpResponse.json({
        content: matching.slice(page * size, page * size + size),
        page,
        size,
        totalElements: matching.length,
        totalPages: Math.ceil(matching.length / size),
      })
    }),
    http.get(`${BASE}/submissions/:id`, async ({ request, params }) => {
      await record(request)
      const s = find(params.id)
      return s ? HttpResponse.json(s) : problem(404, 'Not Found')
    }),
    http.post(`${BASE}/submissions/:id/accept`, ({ request, params }) => decide(request, params.id, 'ACCEPTED')),
    http.post(`${BASE}/submissions/:id/reject`, ({ request, params }) => decide(request, params.id, 'REJECTED')),
    http.post(`${BASE}/submissions/:id/promote-submitter`, async ({ request, params }) => {
      await record(request)
      const s = find(params.id)
      if (!s) return problem(404, 'Not Found')
      if (inactive.includes(s.portalUserId)) return problem(409, 'Conflict', 'The portal user can’t be promoted in their current state')
      return HttpResponse.json({ portalUserId: s.portalUserId, promoted: true, tier: 'STANDARD', status: 'ACTIVE' })
    }),
    http.get(`${BASE}/routing-rules`, () => HttpResponse.json(state.rules)),
    http.post(`${BASE}/routing-rules`, async ({ request }) => {
      await record(request)
      const body = (await request.json()) as { type: string; region: string; teamId: string }
      const rule: RoutingRule = { id: `r${state.rules.length + 1}`, position: state.rules.length, ...body }
      state.rules.push(rule)
      return HttpResponse.json(rule, { status: 201 })
    }),
    http.delete(`${BASE}/routing-rules/:id`, async ({ request, params }) => {
      await record(request)
      if (!state.rules.some((r) => r.id === params.id)) return problem(404, 'Not Found')
      state.rules = state.rules.filter((r) => r.id !== params.id)
      return new HttpResponse(null, { status: 204 })
    }),
    http.put(`${BASE}/routing-rules/order`, async ({ request }) => {
      await record(request)
      const { ruleIds } = (await request.json()) as { ruleIds: string[] }
      const ids = new Set(ruleIds)
      if (ids.size !== ruleIds.length || ids.size !== state.rules.length || state.rules.some((r) => !ids.has(r.id)))
        return problem(422, 'Unprocessable Entity', 'List every rule exactly once')
      state.rules = ruleIds.map((id, position) => ({ ...state.rules.find((r) => r.id === id)!, position }))
      return HttpResponse.json(state.rules)
    }),
  )
  return { state, calls }
}
