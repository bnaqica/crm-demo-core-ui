# Spec Delta

## Purpose

Hides UI controls and content the user can't use, based on capabilities from the server, without ever treating the UI as the authority.

## ADDED Requirements

### Requirement: Capabilities loaded on sign-in
After sign-in the app SHALL load `/me/capabilities` before rendering protected pages, and SHALL reload it when the user returns to the tab after more than 5 minutes.

#### Scenario: Load
- **WHEN** a user signs in
- **THEN** pages render only after capabilities are loaded

### Requirement: Permission-gated controls
Controls requiring a permission (such as Edit, Delete, Accept, Reject) SHALL be hidden when the user lacks it, and pages whose read permission is missing SHALL be absent from navigation and show a not-authorized page if opened directly.

#### Scenario: Read-only user
- **GIVEN** a user with `submissions:read` but not `submissions:write`
- **WHEN** they open a submission
- **THEN** Accept and Reject are not shown

### Requirement: UI-only features
Content gated by `ui:<feature>` SHALL be shown only to users whose capabilities include that feature.

#### Scenario: Dashboard tile
- **WHEN** a user without `ui:team-dashboard` opens the home page
- **THEN** the team dashboard tile is not shown

### Requirement: Cross-team read-only
For records of teams the user isn't a member of, write controls SHALL be hidden even when the user holds the write permission.

#### Scenario: Super Manager views another team
- **WHEN** a Super Manager opens a record of a team they aren't in
- **THEN** write controls are hidden and a read-only badge is shown

### Requirement: Server denial respected
A 403 from the API SHALL be shown as a not-authorized message and SHALL trigger a capabilities reload.

#### Scenario: Stale capabilities
- **WHEN** an action returns 403
- **THEN** a not-authorized message is shown and capabilities are reloaded
