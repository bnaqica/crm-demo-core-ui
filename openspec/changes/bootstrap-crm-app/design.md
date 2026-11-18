# Design

## Decisions

- Same stack as the Admin UI: Vite, React 19, TypeScript strict, React Router, TanStack Query, `react-oidc-context` with in-memory storage, Vitest + RTL + MSW, Playwright.
- `CapabilitiesProvider` with `useCan(permission, teamId?)` and a `<Can>` component; `teamId` applies the cross-team read-only rule (`can write` = has permission AND team in memberTeams). One implementation, so the rules are tested once.
- Navigation entries declare their read permission; the router guard and the menu use the same declaration.

## Implementation decisions (apply)

- **Capabilities contract** (core-service `CapabilitiesResponse`, checked 2026-11-12): `{sub, name, permissions[], uiFeatures[], memberTeams: UUID[], managedTeams: UUID[], allTeams}`; `uiFeatures` without the `ui:` prefix. `useCan('ui:x')` checks `uiFeatures`. Teams have no names, so the UI labels them "Team <first 8 chars of the id>" (`teamLabel`) until core-service exposes names. The endpoint needs no permission, only an ACTIVE `crm-internal` user.
- **useCan rules:** `:read` is held directly or implied by the matching `:write`; any other permission is a write. With `teamId`: reads need the team in member/managed teams or `allTeams`; writes need membership (managers who aren't members are read-only too, per "team in memberTeams").
- **Read-only badge:** `<ReadOnlyBadge teamId>` shows on records of teams the user isn't a member of.
- **Tokens in memory:** `userStore` is `InMemoryWebStorage`. The PKCE `state`/verifier is kept in an explicit `sessionStorage` state store (oidc-client-ts defaults to localStorage) so the redirect round trip works; it holds no tokens. A reload signs in again silently through the Keycloak SSO session.
- **Return to the requested page:** `signinRedirect({state:{returnTo}})`; `onSigninCallback` rewrites the URL to a same-origin path only (no open redirect), with OIDC callback parameters (`code`, `state`, `error`, …) stripped so a failed or stale callback is never replayed. The router mounts after the callback completes.
- **Forgot password:** offered by Keycloak's own login page (realm `resetPasswordAllowed`); the app adds nothing. Checked only in e2e.
- **403 handling:** the API client invalidates the capabilities query on any 403 except from `/me/capabilities` itself (avoids a loop); `<ApiErrorMessage>` shows "not authorized".
- **Capabilities reload:** on `visibilitychange` to visible when the last load is older than 5 minutes; no window-focus refetch otherwise.
- **Team switcher:** "All my teams" plus member and managed teams (managed marked "(manager)"); selection held in memory (`useCurrentTeam`).
- **Tooling:** TypeScript 6.0.3 (typescript-eslint 8.72 does not support TS 7 yet); MSW 3 uses `onUnhandledFrame`. Fast-refresh lint rule off because providers and their hooks share files.
- **Expired session:** an expired user or any 401 from core-service starts `signinRedirect` back to the current page (review finding).
- **Error screens** (sign-in failed, capabilities failed) include Sign out, so a user on the wrong account isn't stuck behind SSO.
- **E2E:** the Super Manager cross-team read-only check needs a submission page, so it lives in `add-submission-workspace`'s e2e.
