export type Problem = { title?: string; detail?: string; status?: number }

export class ApiError extends Error {
  readonly status: number
  readonly problem: Problem

  constructor(status: number, problem: Problem) {
    super(problem.detail || problem.title || `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }
}

export type RequestOptions = { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown; signal?: AbortSignal }

export type ApiClient = {
  request<T = unknown>(path: string, options?: RequestOptions): Promise<T>
}

type ClientOptions = {
  baseUrl: string
  getToken: () => string | undefined
  onForbidden: (path: string) => void
  onUnauthorized: () => void
}

export function createApiClient({ baseUrl, getToken, onForbidden, onUnauthorized }: ClientOptions): ApiClient {
  return {
    async request<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
      const headers: Record<string, string> = { Accept: 'application/json' }
      const token = getToken()
      if (token) headers.Authorization = `Bearer ${token}`
      if (body !== undefined) headers['Content-Type'] = 'application/json'

      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      })

      if (!response.ok) {
        if (response.status === 401) onUnauthorized()
        if (response.status === 403) onForbidden(path)
        throw new ApiError(response.status, await readProblem(response))
      }
      if (response.status === 204) return undefined as T
      const text = await response.text()
      return (text ? JSON.parse(text) : undefined) as T
    },
  }
}

async function readProblem(response: Response): Promise<Problem> {
  try {
    const body: unknown = await response.json()
    return body && typeof body === 'object' ? (body as Problem) : {}
  } catch {
    return {}
  }
}
