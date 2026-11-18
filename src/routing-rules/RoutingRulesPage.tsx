import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../api/ApiProvider'
import { ApiErrorMessage } from '../api/ApiErrorMessage'
import { teamLabel, useCapabilities } from '../capabilities'
import {
  createRoutingRule,
  deleteRoutingRule,
  describeRule,
  listRoutingRules,
  reorderRoutingRules,
  routingRuleKeys,
  type RoutingRule,
} from './api'

export function RoutingRulesPage() {
  const api = useApi()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: routingRuleKeys.all, queryFn: ({ signal }) => listRoutingRules(api, signal) })
  const refresh = () => queryClient.invalidateQueries({ queryKey: routingRuleKeys.all })

  const reorder = useMutation({
    mutationFn: (ordered: RoutingRule[]) => reorderRoutingRules(api, ordered.map((r) => r.id)),
    onMutate: (ordered) => {
      const previous = queryClient.getQueryData<RoutingRule[]>(routingRuleKeys.all)
      queryClient.setQueryData(routingRuleKeys.all, ordered)
      return { previous }
    },
    onError: (_error, _ordered, context) => queryClient.setQueryData(routingRuleKeys.all, context?.previous),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteRoutingRule(api, id), onSettled: refresh })

  const rules = query.data ?? []
  const move = (from: number, to: number) => {
    if (to < 0 || to >= rules.length || from === to) return
    const ordered = [...rules]
    const [rule] = ordered.splice(from, 1)
    if (!rule) return
    ordered.splice(to, 0, rule)
    reorder.mutate(ordered)
  }

  return (
    <>
      <h1>Routing rules</h1>
      <p>New submissions go to the team of the first rule matching their type and region; otherwise to the default team.</p>
      <AddRuleForm rules={rules} onAdded={refresh} />
      <ApiErrorMessage error={query.error ?? reorder.error ?? remove.error} />
      {query.isPending ? (
        <p role="status">Loading rules…</p>
      ) : rules.length === 0 ? (
        <p>No routing rules yet.</p>
      ) : (
        <RuleList rules={rules} busy={reorder.isPending || remove.isPending} onMove={move} onDelete={(id) => remove.mutate(id)} />
      )}
    </>
  )
}

function RuleList({
  rules,
  busy,
  onMove,
  onDelete,
}: {
  rules: RoutingRule[]
  busy: boolean
  onMove: (from: number, to: number) => void
  onDelete: (id: string) => void
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  return (
    <ol className="rules" aria-label="Routing rules in order">
      {rules.map((rule, index) => {
        const label = describeRule(rule)
        return (
          <li
            key={rule.id}
            draggable={!busy}
            className={dragIndex === index ? 'dragging' : undefined}
            onDragStart={(e) => {
              setDragIndex(index)
              e.dataTransfer?.setData('text/plain', rule.id)
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (dragIndex !== null) onMove(dragIndex, index)
              setDragIndex(null)
            }}
            onDragEnd={() => setDragIndex(null)}
          >
            <span aria-hidden="true">⠿</span>
            <span className="rule-text">{label}</span>
            <button aria-label={`Move ${label} up`} disabled={busy || index === 0} onClick={() => onMove(index, index - 1)}>
              ↑
            </button>
            <button
              aria-label={`Move ${label} down`}
              disabled={busy || index === rules.length - 1}
              onClick={() => onMove(index, index + 1)}
            >
              ↓
            </button>
            {confirmingId === rule.id ? (
              <>
                <button className="danger" disabled={busy} onClick={() => onDelete(rule.id)}>
                  Confirm delete
                </button>
                <button onClick={() => setConfirmingId(null)}>Cancel</button>
              </>
            ) : (
              <button className="danger" aria-label={`Delete ${label}`} disabled={busy} onClick={() => setConfirmingId(rule.id)}>
                Delete
              </button>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function AddRuleForm({ rules, onAdded }: { rules: RoutingRule[]; onAdded: () => void }) {
  const api = useApi()
  const caps = useCapabilities()
  const [type, setType] = useState('')
  const [region, setRegion] = useState('')
  const [teamId, setTeamId] = useState('')
  const [invalid, setInvalid] = useState(false)

  // No team directory endpoint yet: offer the user's own teams plus teams already used by rules.
  const teams = useMemo(() => {
    const byId = new Map<string, string>()
    for (const t of [...caps.memberTeams, ...caps.managedTeams]) byId.set(t.id, t.name)
    for (const r of rules) if (!byId.has(r.teamId)) byId.set(r.teamId, teamLabel(r.teamId))
    return [...byId].map(([id, name]) => ({ id, name }))
  }, [caps, rules])

  const add = useMutation({
    mutationFn: () => createRoutingRule(api, { type: type.trim().toUpperCase(), region: region.trim().toUpperCase(), teamId }),
    onSuccess: () => {
      setType('')
      setRegion('')
      setTeamId('')
      onAdded()
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!type.trim() || !region.trim() || !teamId) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    add.mutate()
  }

  return (
    <form className="form" onSubmit={submit} noValidate aria-label="Add routing rule">
      <label>
        Type
        <input value={type} onChange={(e) => setType(e.target.value)} placeholder="CLAIM" maxLength={100} />
      </label>
      <label>
        Region
        <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="EU" maxLength={100} />
      </label>
      <label>
        Target team
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value="">Choose a team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="primary" disabled={add.isPending}>
        Add rule
      </button>
      {invalid ? <p role="alert">Enter a type, a region and a target team.</p> : null}
      <ApiErrorMessage error={add.error} />
    </form>
  )
}
