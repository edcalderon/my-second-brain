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

### Requirement: Trading outage feedback
The system SHALL distinguish healthy, degraded, and offline trading backend
states on trading views.

#### Scenario: Degraded backend
- GIVEN the trading backend returns partial data or a degraded service state
- WHEN a user opens a trading page
- THEN the page shall render the available data
- AND the page shall display a visible warning that trading data is degraded

#### Scenario: Offline backend
- GIVEN the trading backend is unreachable or returns an offline response
- WHEN a user opens a trading page
- THEN the page shall display an offline banner
- AND any cached or last-known data shall remain visible when available

### Requirement: Structured outage messaging
The system SHALL surface structured trading API outage details instead of a
generic fetch failure.

#### Scenario: Trading request fails
- GIVEN a trading API request fails with a status code or outage payload
- WHEN the dashboard handles the failure
- THEN the user-facing message shall include the trading endpoint context
- AND the message shall distinguish request failure from degraded service

### Requirement: Partial data continuity
The system SHALL keep successful trading data visible when a related feed
fails.

#### Scenario: One of multiple feeds fails
- GIVEN a trading page requests multiple backend feeds
- WHEN one feed succeeds and another fails
- THEN the page shall show the successful data
- AND the page shall show an outage banner for the missing feed
