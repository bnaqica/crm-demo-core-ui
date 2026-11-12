# Proposal

## Why

Internal users work in the CRM UI, signing in to `crm-internal` with password and mandatory MFA. What they see must follow their resolved permissions and teams, while the CRM services keep enforcing everything.

## What Changes

- New React + TypeScript + Vite app with lint, test, build and CI.
- OIDC Authorization Code + PKCE to realm `crm-internal`, client `crm-app`; in-memory tokens; forgot-password link to Keycloak's reset flow.
- Capabilities loaded from core-service `GET /me/capabilities` and exposed to every component; buttons, menu items and dashboard tiles shown only when held.
- App shell with team switcher showing member and managed teams.

## Capabilities

### New Capabilities
- `crm-authentication`: signing in and out of the CRM UI.
- `capability-gated-ui`: showing content according to resolved capabilities.

## Impact

- Dev server on port 5173; core-service base URL `VITE_CORE_BASE_URL` (default `http://localhost:8081`); core-service must allow CORS from this origin.
