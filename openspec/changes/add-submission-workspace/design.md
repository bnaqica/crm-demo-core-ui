# Design

## Decisions

- All controls use `<Can>` from `bootstrap-crm-app` with the submission's team id, so cross-team records are read-only.
- Rejection reasons are plain text with a length limit matching the API; rendered as text everywhere.
- Rule reordering by drag-and-drop with keyboard alternative (up/down buttons) for accessibility.
