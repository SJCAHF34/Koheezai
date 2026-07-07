# ADP API Access Request — Koheez Scheduling Calendar

**Requested by:** Koheez Pharmacy Operations  
**Purpose:** Replace manual RPD Outlook calendar schedule adjustments with a read-only, automated time-off sync  
**Scope:** Pharmacy sites managed under Koheez

---

## Background

RPDs currently manage schedule adjustments manually via Outlook calendar. This request seeks the minimum API access needed to allow Koheez to read only **approved** employee time-off — so pharmacy calendars update automatically without any manual entry or human-readable employee data leaving ADP.

---

## Requested API Permissions (Minimum Viable Scope)

| # | Endpoint | Method | Justification |
|---|----------|--------|---------------|
| 1 | `/hr/v2/workers` | GET | Retrieve worker IDs and legal name for employees assigned to specific store org units. No compensation, HR status, or sensitive fields requested. |
| 2 | `/time/v2/workers/{workerId}/time-off-requests` | GET | Retrieve **approved** time-off requests only (filtered by `requestStatusCode = approved`). Used solely to populate the scheduling calendar. |

---

## Data Accessed

| Field | Used For | Retained? |
|-------|----------|-----------|
| Worker ID | Internal mapping key | Yes — stored as opaque ID, not displayed |
| Given name + family name | Matching worker to internal staff roster (one-time) | No — discarded after match |
| Time-off start date / end date | Calendar block creation | Yes |
| Time-off type code | Category (PTO / Sick / Floating Holiday) | Yes |
| Request status | Filter: approved only | No |

All other worker fields (compensation, demographics, benefits, performance) are **not requested and not accessed**.

---

## Data NOT Requested

- Compensation or payroll data
- Benefit elections or enrollment
- Disciplinary or performance records
- Social Security Numbers or government IDs
- Manager relationships or org hierarchy beyond store code
- Pending or denied time-off requests

---

## Access Controls

- **OAuth2 client credentials grant** — no employee login or consent flow required
- **Mutual TLS** — server-to-server only; credential never exposed to browser
- **Read-only** — no write, update, or delete permissions requested
- **Org unit scoped** — queries filtered to specific pharmacy store codes; cross-store access is not possible via this integration
- **Director-initiated** — manual syncs require pharmacy director authentication within Koheez; automated nightly sync uses stored mappings only

---

## Summary of Request

> Grant read-only, mTLS-authenticated client credentials access to worker identity (name + ID) and approved time-off dates for employees assigned to Koheez-managed pharmacy store org units. No sensitive HR, payroll, or demographic data is accessed or stored.
