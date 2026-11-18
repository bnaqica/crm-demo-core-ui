# End-to-end tests

Run against the local stack: Keycloak at http://localhost:8180 with realm `crm-internal` and client `crm-app`
(redirect URI and web origin `http://localhost:5173`), core-service at http://localhost:8081 (CORS for that origin).

Users needed in `crm-internal` (password + configured OTP, MFA mandatory):

| Env prefix        | User                                                         |
| ----------------- | ------------------------------------------------------------ |
| `E2E_READONLY_`   | Team Member of team A with `submissions:read` only           |
| `E2E_SUPER_`      | Super Manager (all-teams scope), member of team A only       |
| `E2E_WRITER_`     | Team Member of team A with `submissions:write`               |

Also `E2E_TEAM_B_SUBMISSION_ID`: a submission of a team the Super Manager is not a member of.

Each prefix takes `USERNAME`, `PASSWORD` and `TOTP_SECRET` (base32 OTP secret). Tests skip when unset.

```bash
npx playwright install chromium
E2E_READONLY_USERNAME=… E2E_READONLY_PASSWORD=… E2E_READONLY_TOTP_SECRET=… npm run e2e
```
