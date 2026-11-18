# Design

## Decisions

- All controls use `<Can>` from `bootstrap-crm-app` with the submission's team id, so cross-team records are read-only.
- Rejection reasons are plain text with a length limit matching the API; rendered as text everywhere.
- Rule reordering by drag-and-drop with keyboard alternative (up/down buttons) for accessibility.

## Implementation decisions (apply)

- **API contract:** types and MSW mocks (`src/test/fakeCore.ts`) follow core-service's controllers and DTOs (`SubmissionController`, `SubmitterPromotionController`, `RoutingRuleController`, `SubmissionResponse`, `SubmissionPageResponse`, `PromotionResponse`, `RoutingRuleResponse`, request records) and `docs/submissions-api.md`, read on 2026-11-12. Accept sends `{version}`, reject `{reason, version}`; the list is paged (`page`, `size`=50).
- **Team filter** is the header team switcher (one team control, not two). core-service has no team filter parameter, so the switcher narrows the loaded page client-side. Status filter is a select; type is free text (upper-cased) because no type catalogue exists. Status and type live in the URL.
- **Rejection reason:** required after trimming, `maxLength` 500 (core-service `@Size(max = 500)`), rendered as React text only.
- **Version conflicts:** decisions name the version on screen; a 409 shows core-service's detail (kept above the controls, so it survives when the reload shows the submission already decided) and reloads the submission.
- **Case:** type and region are upper-cased on input; core-service matches them case-sensitively, so this assumes the portal sends upper-case types and regions.
- **Decisions** use `<Can permission="submissions:write" teamId>`, shown only while RECEIVED; Promote uses `<Can permission="portal-users:write" teamId>` with an inline confirm step.
- **Routing rules:** drag-and-drop plus Move up/down buttons; new order saved with one `PUT`, optimistic with rollback on error. Delete asks for confirmation. Target team choices are the user's member/managed teams plus teams already used by rules — a team directory endpoint would be needed for Super Managers to target any team.

## Mismatches with core-service (recorded 2026-11-12, to resolve with the developer)

1. **Starter status not exposed.** The spec offers Promote submitter only "for a submission whose submitter is a starter", but `SubmissionResponse` has no submitter tier, and promotion is idempotent in core-service (a standard user "promotes" again with 200; 409 means the account's state forbids it). Interim: Promote is offered on every submission to team members holding `portal-users:write`, so it also shows for standard submitters and comes back on the next visit after success. It can't be withdrawn properly until core-service adds e.g. `submitterTier` to `SubmissionResponse`.
2. **No team names.** `/me/capabilities` returns team UUIDs and submissions/rules carry only `teamId`, so the UI shows "Team <first 8 chars>". The spec's "CLAIM, EU → Claims EU" reads "CLAIM, EU → Team xxxxxxxx". Needs team names in capabilities (`{id, name}`) or a team directory endpoint.
3. **No team filter on `GET /submissions`.** The spec lists filtering by team; core-service filters by status, type and received date only. Interim: the team switcher filters the loaded page client-side; the page then says how many rows are hidden (or that none on this page belong to the team) instead of claiming there are none. Proper fix: a `teamId` parameter.
4. **Routing-rule target teams.** With no team directory, the add-rule form offers the user's own teams plus teams already in rules; a Super Manager can't target any other team.
5. **Not used by the UI (no spec need):** `receivedFrom`/`receivedTo` list filters, document `sha256`, `X-Correlation-Id` (core-service generates one).
