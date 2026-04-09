# SSRS → Koheez Patient Sync Script

This script reads the AHF Retention Risk Report from SQL Server (the `ahfbi`
server) and pushes the patient list into Koheez automatically.

## How it Works

1. Connects to SQL Server using the credentials you configure below
2. Runs your retention risk SQL query
3. Maps each row to a patient record (initials, primary phone, secondary phone, issue type)
4. POSTs to the Koheez `/api/retention/import` endpoint — patients already in Koheez are skipped (no duplicate creation or data overwrite)

---

## Prerequisites

- Node.js 18+ installed on the machine running this script
- Network access to both:
  - The SQL Server / `ahfbi` reporting server
  - The Koheez app URL

---

## Setup

### 1. Install dependencies

```bash
cd scripts/ssrs-sync
npm install
```

### 2. Create a `.env` file

Copy the template below and fill in your values:

```
# SQL Server (ahfbi)
MSSQL_SERVER=ahfbi
MSSQL_DB=YourReportingDatabase
MSSQL_USER=your_sql_login
MSSQL_PASSWORD=your_sql_password

# The SQL query that returns the Retention Risk Report rows
# Must return columns: Initials (or PatientInitials), PrimaryPhone (or Phone1),
# SecondaryPhone (or Phone2), and optionally IssueType
MSSQL_QUERY=SELECT Initials, PrimaryPhone, SecondaryPhone, IssueType FROM dbo.RetentionRiskReport WHERE IsActive = 1

# Koheez
KOHEEZ_URL=https://your-app.replit.app
KOHEEZ_SITE_ID=1417
IMPORT_API_KEY=your_import_api_key_here
```

> **IMPORT_API_KEY** must match the `IMPORT_API_KEY` secret set in the Koheez
> app's environment variables (Replit Secrets). Ask your Koheez admin for this value.

### 3. Map your column names

Open `sync-to-koheez.js` and find the `mapRow()` function. Edit the field names
to match your actual SQL column names:

```js
function mapRow(row) {
  return {
    initials: row.YOUR_INITIALS_COLUMN,
    phone1:   row.YOUR_PRIMARY_PHONE_COLUMN,
    phone2:   row.YOUR_SECONDARY_PHONE_COLUMN,
    issueType: normalizeIssueType(row.YOUR_ISSUE_TYPE_COLUMN),
  };
}
```

---

## Run Manually

```bash
node sync-to-koheez.js
```

---

## Schedule with Windows Task Scheduler

1. Open **Task Scheduler** on the `ahfbi` server (or any AHF network machine)
2. Create a new Basic Task
3. Set the trigger: **Daily** at your preferred time (e.g., 7:00 AM)
4. Set the action:
   - **Program/script:** `node`
   - **Arguments:** `C:\path\to\scripts\ssrs-sync\sync-to-koheez.js`
   - **Start in:** `C:\path\to\scripts\ssrs-sync\`
5. Ensure the task runs whether the user is logged on or not
6. Run with highest privileges if required by your SQL Server permissions

---

## package.json

```json
{
  "name": "ssrs-koheez-sync",
  "version": "1.0.0",
  "description": "Daily sync from AHF SSRS Retention Risk Report to Koheez",
  "main": "sync-to-koheez.js",
  "dependencies": {
    "dotenv": "^16.0.0",
    "mssql": "^10.0.0"
  }
}
```

Create this `package.json` in the `scripts/ssrs-sync/` directory before running `npm install`.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `ECONNREFUSED` connecting to SQL Server | Check MSSQL_SERVER hostname and firewall rules |
| `401 Unauthorized` from Koheez | Verify IMPORT_API_KEY matches the Koheez secret |
| `0 patients imported, all skipped` | Patients already exist in Koheez — this is expected on subsequent runs |
| Column undefined / empty initials | Update `mapRow()` to match your actual SQL column names |
