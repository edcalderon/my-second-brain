# Dashboard Specification

## Purpose

Provide the public dashboard and documentation experience for the second-brain platform, including authenticated access and environment-aware trading integration.

## Requirements

### Requirement: Authenticated access
The system SHALL require a supported sign-in flow before protected dashboard or trading views are accessible.

#### Scenario: Successful sign-in
- GIVEN a user is not authenticated
- WHEN the user completes a supported sign-in flow
- THEN the system shall establish an authenticated session
- AND the user shall be routed into the application shell

#### Scenario: Invalid session
- GIVEN a user session is expired or invalid
- WHEN the user opens a protected view
- THEN the system shall require re-authentication

### Requirement: Environment-aware trading API resolution
The system SHALL resolve its trading API base from environment-specific configuration so development can target a local backend and deployed builds can target the production backend.

#### Scenario: Local development
- GIVEN the app is running in development
- WHEN the trading UI requests market or portfolio data
- THEN it shall use the configured local trading API base

#### Scenario: Production deployment
- GIVEN the app is running in production
- WHEN the trading UI requests market or portfolio data
- THEN it shall use the configured production trading API base

### Requirement: Developer visibility
The system SHALL expose the resolved backend endpoints in the settings experience so developers can confirm which service is active.

#### Scenario: Settings page
- GIVEN a developer opens the settings page
- WHEN the page loads
- THEN it shall display the resolved dashboard and trading API bases

### Requirement: Documentation availability
The system SHALL provide a documentation experience that can run alongside the dashboard during local development.

#### Scenario: Combined dev workflow
- GIVEN a developer starts the combined local workflow
- WHEN the dashboard and docs are both running
- THEN both applications shall be reachable on their configured local ports
