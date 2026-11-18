import { ApiError } from './client'

export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'You are not authorized to do this. Your access is being refreshed.'
    if (error.status === 404) return 'Not found, or you no longer have access to it.'
    if (error.status === 429) return 'Too many requests. Please try again later.'
    return error.problem.detail || error.problem.title || `Request failed (${error.status}).`
  }
  return 'Something went wrong. Please try again.'
}

export function ApiErrorMessage({ error }: { error: unknown }) {
  if (!error) return null
  return <p role="alert">{errorText(error)}</p>
}
