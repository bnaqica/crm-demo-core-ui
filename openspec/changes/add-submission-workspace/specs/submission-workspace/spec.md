# Spec Delta

## Purpose

Gives internal team users a place to review, decide and follow up on portal submissions routed to their teams.

## ADDED Requirements

### Requirement: Submissions list
The Submissions page SHALL list submissions returned by core-service with type, region, submitter email, team, status and received time, filterable by status, type and team.

#### Scenario: Filter received
- **WHEN** a user filters by status RECEIVED
- **THEN** only RECEIVED submissions are listed

### Requirement: Decide a submission
On a RECEIVED submission, a user allowed to write SHALL accept it, or reject it with a required reason that the submitter will see.

#### Scenario: Reject without reason
- **WHEN** a user rejects without entering a reason
- **THEN** the form shows a validation error and nothing is sent

#### Scenario: Accepted
- **WHEN** a user accepts a submission
- **THEN** its status shows ACCEPTED

### Requirement: Promote submitter
For a submission whose submitter is a starter, a user with `portal-users:write` SHALL see Promote submitter, which asks for confirmation and shows the result.

#### Scenario: Promoted
- **WHEN** a user confirms Promote submitter
- **THEN** a success message is shown and the button is no longer offered

### Requirement: Routing rules
Users with `routing-rules:write` SHALL view, add, reorder and delete routing rules by type and region with a target team.

#### Scenario: Rule added
- **WHEN** a user adds a rule `CLAIM, EU → Claims EU`
- **THEN** it appears in the ordered list
