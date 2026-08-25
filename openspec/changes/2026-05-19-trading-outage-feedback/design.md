## Context

The dashboard already fetches trading data from the private trading service and
shows cached portfolio information in a few places. The gap is that the pages
still treat a backend outage as a generic error instead of a typed service
state, so the user does not know whether to retry, wait for recovery, or rely
on cached values.

## Goals / Non-Goals

**Goals:**

- Distinguish healthy, degraded, and offline trading backend states.
- Show a single trading outage banner pattern across the trading pages.
- Keep available data visible when only part of the trading stack is failing.
- Preserve the public/private boundary and avoid backend implementation
  details in dashboard-facing docs.

**Non-Goals:**

- Changing the authentication model.
- Building a new polling framework or adding new backend dependencies.
- Introducing a new visual theme for the whole dashboard.

## Decisions

- Extend the trading API client with structured error metadata.
  - Rationale: the UI needs the status code, payload, and request context to
    explain outages clearly.

- Add a shared trading outage banner component.
  - Rationale: the same degraded/offline pattern appears on several pages and
    should look consistent.

- Let pages continue rendering any successful sub-request instead of failing
  the whole view when one feed is unavailable.
  - Rationale: users should still see the latest known market, status, or
    portfolio data when only one dependency is down.

- Prefer explicit service-state labels over silent retries.
  - Rationale: the current refresh loop already provides recovery attempts;
    the UI should focus on clarity rather than hiding failures.

## Risks / Trade-offs

- Some pages may expose partial data more often.
  - Mitigation: pair partial data with a visible banner so the data source is
    obvious.

- Structured error handling adds more code to the client layer.
  - Mitigation: keep the helper narrow and reusable instead of duplicating
    parsing logic in each page.

## Implementation Shape

1. Add typed service-health and outage-error helpers in the trading API client.
2. Add a shared banner component for degraded/offline trading states.
3. Update each trading page to render the banner and keep successful data from
   partial fetches.
4. Validate the pages still show cached or last-known values when the backend
   is unavailable.
