# Proposal

## Why

Portal submissions are routed to internal teams by core-service. Team users need a workspace to review them, decide, and promote starter submitters.

## What Changes

- Submissions list scoped to the user's teams, with filters.
- Submission detail with documents, Accept and Reject (reason required), and Promote submitter for starters.
- Routing rules screen for users with `routing-rules:write`.

## Capabilities

### New Capabilities
- `submission-workspace`: CRM screens for working on portal submissions.

## Impact

- Uses core-service submissions, routing rules and promotion endpoints. Depends on `bootstrap-crm-app`.
