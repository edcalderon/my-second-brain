## ADDED Requirements

### Requirement: Trading outage feedback
The dashboard SHALL distinguish healthy, degraded, and offline trading backend
states on trading views.

#### Scenario: Degraded backend
- **GIVEN** the trading backend returns partial data or a degraded service
  state
- **WHEN** a user opens a trading page
- **THEN** the page shall render the available data
- **AND** the page shall display a visible warning that trading data is
  degraded

#### Scenario: Offline backend
- **GIVEN** the trading backend is unreachable or returns an offline response
- **WHEN** a user opens a trading page
- **THEN** the page shall display an offline banner
- **AND** any cached or last-known data shall remain visible when available

### Requirement: Structured outage messaging
The dashboard SHALL surface structured trading API outage details instead of a
generic fetch failure.

#### Scenario: Trading request fails
- **GIVEN** a trading API request fails with a status code or outage payload
- **WHEN** the dashboard handles the failure
- **THEN** the user-facing message shall include the trading endpoint context
- **AND** the message shall distinguish request failure from degraded service

### Requirement: Partial data continuity
The dashboard SHALL keep successful trading data visible when a related feed
fails.

#### Scenario: One of multiple feeds fails
- **GIVEN** a trading page requests multiple backend feeds
- **WHEN** one feed succeeds and another fails
- **THEN** the page shall show the successful data
- **AND** the page shall show an outage banner for the missing feed
