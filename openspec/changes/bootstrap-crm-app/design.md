# Design

## Decisions

- Same stack as the Admin UI: Vite, React 19, TypeScript strict, React Router, TanStack Query, `react-oidc-context` with in-memory storage, Vitest + RTL + MSW, Playwright.
- `CapabilitiesProvider` with `useCan(permission, teamId?)` and a `<Can>` component; `teamId` applies the cross-team read-only rule (`can write` = has permission AND team in memberTeams). One implementation, so the rules are tested once.
- Navigation entries declare their read permission; the router guard and the menu use the same declaration.
