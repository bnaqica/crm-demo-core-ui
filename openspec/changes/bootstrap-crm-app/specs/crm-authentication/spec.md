# Spec Delta

## Purpose

Signs internal users in to the CRM UI through the `crm-internal` realm with MFA, and nobody else.

## ADDED Requirements

### Requirement: Login required
Every page SHALL require a signed-in user through Authorization Code with PKCE against `crm-internal` and return to the requested page after login.

#### Scenario: Signed-out visit
- **WHEN** a signed-out user opens `/submissions`
- **THEN** they are sent to the `crm-internal` login and return to `/submissions`

### Requirement: Forgot password
The login page SHALL offer Keycloak's forgot-password flow; the app SHALL add no account-discovery hints of its own.

#### Scenario: Reset requested
- **WHEN** a user follows Forgot password
- **THEN** Keycloak's reset page opens and shows its generic message

### Requirement: Tokens in memory
Tokens SHALL be held in memory only, and Sign out SHALL end the Keycloak session.

#### Scenario: Sign out
- **WHEN** a user signs out
- **THEN** the Keycloak session ends and the login page is shown
