# SSRS → Koheez Patient Sync Script

This script reads the AHF Retention Risk Report from SQL Server (`ahfbi`)
and pushes the patient list into Koheez automatically once per day.

## How it Works

1. Connects to SQL Server using the credentials you configure below
2. Runs your retention risk SQL query
3. Maps each row to a patient record (initials, primary phone, secondary phone, issue type)
4. POSTs to the Koheez `/api/retention/import` endpoint
   - **New patients** are created in Koheez
   - **Existing patients** (matched by initials + site) have their phone numbers and issue type updated if they changed

---

## Columns Used from the SSRS Report

Only the following columns are pulled. All others are ignored.

| SSRS Column | Used For |
|---|---|
| `First Name` | Initials — first letter |
| `Last Name` | Initials — first letter |
| `Phones` | Primary contact number (phone1) |
| `Cell Phone` | Primary contact number fallback if `Phones` is blank |
| `Work Phone` | Secondary contact number (phone2) |
| `Alt Phone` | Secondary contact number fallback if `Work Phone` is blank |
| `Reason/Description` | Issue type (normalized to lost_contact / insurance_lockout / out_of_state) |
| `Category` | Issue type fallback if `Reason/Description` is blank |

**Not imported:** DOB, Last RX, Last ARV Filled, AVS Sales, HIV Months Stayed,
Full Date, Patient Type, Last Visit, Next Appointment, SUB HUB ID, Last Created,
Last Created By, NCC-, PCP, Adherence.

---

## Prerequisites

- Node.js 18+ on the machine running this script
- Network access to:
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

# SQL query — must return the column names exactly as they appear in the report.
# Adjust the table/view name to match your SSRS data source.
MSSQL_QUERY=SELECT [First Name],[Last Name],[Phones],[Cell Phone],[Work Phone],[Alt Phone],[Reason/Description],[Category] FROM dbo.RetentionRiskView

# Koheez
KOHEEZ_URL=https://your-app.replit.app
KOHEEZ_SITE_ID=1417
IMPORT_API_KEY=your_import_api_key_here
```

> **IMPORT_API_KEY** must match the `IMPORT_API_KEY` secret set in the Koheez
> app's Replit Secrets panel. Ask your Koheez admin for this value.

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
| `0 patients imported, all skipped/unchanged` | All patients already exist with the same data — expected on re-runs with no changes |
| `Column undefined / empty initials` | Verify your SQL query returns `[First Name]` and `[Last Name]` with those exact column names |
