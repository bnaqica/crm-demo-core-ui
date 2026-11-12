# Tasks

## 1. Scaffold

- [ ] 1.1 Create the Vite React TypeScript app with lint, Vitest, MSW and CI; verify `npm run lint`, `npm test` and `npm run build`

## 2. Authentication

- [ ] 2.1 Configure OIDC PKCE for `crm-internal` / `crm-app` with in-memory tokens and sign-out; verify the `crm-authentication` scenarios

## 3. Capabilities

- [ ] 3.1 Implement `CapabilitiesProvider`, `useCan` and `<Can>` with cross-team read-only; verify every `capability-gated-ui` scenario in unit tests
- [ ] 3.2 Build the shell with permission-declared navigation, route guard and team switcher; verify the not-authorized page
- [ ] 3.3 Add a Playwright test with a read-only user and a Super Manager against local services

## Workflow follow-up

- Archive the change with `/opsx:archive` after review.
