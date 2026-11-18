import { teamLabel } from '../capabilities'
import type { ApiClient } from '../api/client'

/** core-service RoutingRuleResponse; rules are tried by ascending position. */
export type RoutingRule = { id: string; position: number; type: string; region: string; teamId: string }
export type NewRoutingRule = { type: string; region: string; teamId: string }

export const routingRuleKeys = { all: ['routing-rules'] as const }

export const listRoutingRules = async (api: ApiClient, signal?: AbortSignal) =>
  [...(await api.request<RoutingRule[]>('/routing-rules', { signal }))].sort((a, b) => a.position - b.position)
export const createRoutingRule = (api: ApiClient, rule: NewRoutingRule) =>
  api.request<RoutingRule>('/routing-rules', { method: 'POST', body: rule })
export const deleteRoutingRule = (api: ApiClient, id: string) =>
  api.request<undefined>(`/routing-rules/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const reorderRoutingRules = (api: ApiClient, ruleIds: string[]) =>
  api.request<RoutingRule[]>('/routing-rules/order', { method: 'PUT', body: { ruleIds } })

export const describeRule = (rule: Pick<RoutingRule, 'type' | 'region' | 'teamId'>) =>
  `${rule.type}, ${rule.region} → ${teamLabel(rule.teamId)}`
