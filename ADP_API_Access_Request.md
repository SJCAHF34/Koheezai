# ADP API Access Request — Koheez Scheduling Calendar

**Requested by:** Koheez Pharmacy Operations  
**Purpose:** Automate approved time-off into the Koheez Scheduling Calendar, replacing manual RPD Outlook calendar adjustments  
**Scope:** Pharmacy sites managed under Koheez  
**Access type:** Read-only, server-to-server (no employee login required)

---

## Current State

RPDs manually track and relay staff time-off approvals via Outlook calendar. This creates:

- Lag between ADP approval and calendar visibility
- Risk of scheduling conflicts when approvals aren't communicated in time
- Manual effort for RPDs who manage multiple sites across a region

---

## What Koheez Scheduling Does Today

Koheez maintains a per-site scheduling calendar built on three layers:

1. **Default shifts** — each staff member's recurring weekly pattern
2. **Day-level entries** — overrides for PTO, sick, shift changes
3. **Business hours** — store open/close times per weekday

Directors publish schedules for RPD and CPO review through a built-in approval workflow. The only missing piece is automatic population of approved time-off from ADP — which today requires a director or RPD to enter manually.

---

## Requested API Permissions (Minimum Viable Scope)

| # | Endpoint | Method | Purpose |
|---|----------|--------|---------|
| 1 | `/hr/v2/workers` | GET | Retrieve worker IDs and legal name for employees assigned to a specific store org unit. Used once to establish a worker-to-staff mapping. |
| 2 | `/time/v2/workers/{workerId}/time-off-requests` | GET | Retrieve approved time-off requests within a rolling ±90-day window. Used to populate calendar blocks. |

No other endpoints are called. No write, update, or delete permissions are requested.

---

## How the Data Flows

```
ADP (approved time-off)
        ↓  read-only, mTLS, server-to-server
Koheez server
        ↓  maps ADP workerID → internal staff ID (one-time name match)
        ↓  discards name after match
schedule_entries table
        ↓  tagged "Synced from ADP"
Koheez Scheduling Calendar (director / RPD view)
```

The name match happens once when a director runs the first sync. After that, only the opaque ADP worker ID is stored and referenced.

---

## Data Accessed

| Field | Used For | Stored? |
|-------|----------|---------|
| Worker ID | Mapping key for subsequent syncs | Yes — opaque ID only |
| Given name + family name | One-time match to internal roster | No — discarded after match |
| Time-off start date | Calendar block start | Yes |
| Time-off end date | Calendar block end | Yes |
| Time-off type code | Maps to PTO / Sick / Floating Holiday | Yes |
| Request status | Filter — approved only | No |

---

## Data Not Requested

- Compensation, pay rates, or payroll data
- Benefits, enrollment, or elections
- Performance or disciplinary records
- Government IDs or demographic information
- Org hierarchy beyond store-level unit code
- Pending, denied, or cancelled time-off requests

---

## Access Controls Within Koheez

- **Pharmacy Director or above only** — syncs can only be triggered by authenticated directors, RPDs, or CPO; pharmacists and technicians have no access to ADP data or sync controls
- **Site-scoped** — each director can only sync for the site(s) they are authorized to manage; cross-site access is blocked at the API layer
- **Nightly automation** — a 2 AM server-side cron runs using pre-established worker mappings only; no new employee data is fetched without a director first confirming the mapping
- **Manual override protection** — entries a director has manually edited are not overwritten by subsequent syncs

---

## Credential Handling

- **OAuth2 client credentials grant** — no employee authentication or consent flow
- **Mutual TLS (mTLS)** — Koheez presents a client certificate on every request; credential never reaches the browser
- **Server-side only** — ADP client ID, secret, and certificates are stored as environment secrets on the server; never in client code or version control
- **Token caching** — access tokens are cached in-process and refreshed automatically; no token is logged or persisted to disk

---

## Summary of Request

> Grant read-only, mTLS-authenticated, client-credentials access to worker identity (ID + name, for one-time matching) and approved time-off dates for employees assigned to Koheez-managed pharmacy store org units. Access is site-scoped, director-gated within Koheez, and does not touch compensation, benefits, demographics, or any sensitive HR data.
