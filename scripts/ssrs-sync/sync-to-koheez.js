/**
 * SSRS Retention Risk Report → Koheez Sync Script
 *
 * Reads patient rows from SQL Server (ahfbi) and pushes them to the
 * Koheez /api/retention/import endpoint.
 *
 * Schedule this via Windows Task Scheduler on the ahfbi server (or any
 * machine on the AHF network) to run once daily.
 *
 * Setup: see README.md in this directory.
 */

require("dotenv").config();
const sql = require("mssql");

const {
  MSSQL_SERVER,
  MSSQL_DB,
  MSSQL_USER,
  MSSQL_PASSWORD,
  MSSQL_QUERY,
  KOHEEZ_SITE_ID,
  KOHEEZ_URL,
  IMPORT_API_KEY,
} = process.env;

function validateEnv() {
  const required = [
    "MSSQL_SERVER",
    "MSSQL_DB",
    "MSSQL_USER",
    "MSSQL_PASSWORD",
    "MSSQL_QUERY",
    "KOHEEZ_SITE_ID",
    "KOHEEZ_URL",
    "IMPORT_API_KEY",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error("Missing required env vars:", missing.join(", "));
    process.exit(1);
  }
}

/**
 * Derive two-letter initials from First Name + Last Name.
 * e.g. "John" "Doe" → "JD"
 */
function buildInitials(row) {
  const first = String(row["First Name"] || "").trim();
  const last  = String(row["Last Name"]  || "").trim();
  const fi = first[0] || "";
  const li = last[0]  || "";
  return (fi + li).toUpperCase();
}

/**
 * Map a single SSRS report row to the Koheez patient import format.
 *
 * Relevant columns pulled from the AHF Retention Risk Report:
 *   "First Name"          → initials (first letter)
 *   "Last Name"           → initials (first letter)
 *   "Phones"              → phone1 (primary)
 *   "Cell Phone"          → phone1 fallback if Phones is blank
 *   "Work Phone"          → phone2 (secondary, first preference)
 *   "Alt Phone"           → phone2 fallback if Work Phone is blank
 *   "Reason/Description"  → issueType (normalized)
 *   "Category"            → issueType fallback if Reason/Description is blank
 *
 * All other columns (DOB, Last RX, Last ARV Filled, AVS Sales, HIV Months
 * Stayed, Last Visit, Next Appointment, SUB HUB ID, etc.) are intentionally
 * excluded — they are not needed for the retention outreach workflow.
 */
function mapRow(row) {
  const phone1 =
    String(row["Phones"]      || "").trim() ||
    String(row["Cell Phone"]  || "").trim();

  const phone2 =
    String(row["Work Phone"]  || "").trim() ||
    String(row["Alt Phone"]   || "").trim();

  const issueRaw =
    String(row["Reason/Description"] || "").trim() ||
    String(row["Category"]           || "").trim();

  return {
    initials:  buildInitials(row),
    phone1,
    phone2,
    issueType: normalizeIssueType(issueRaw),
  };
}

function normalizeIssueType(raw) {
  const v = String(raw || "").toLowerCase().replace(/\s+/g, "_");
  if (v.includes("insurance") || v.includes("lockout")) return "insurance_lockout";
  if (v.includes("state") || v.includes("transfer")) return "out_of_state";
  return "lost_contact";
}

async function run() {
  validateEnv();

  const config = {
    server: MSSQL_SERVER,
    database: MSSQL_DB,
    user: MSSQL_USER,
    password: MSSQL_PASSWORD,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  };

  let pool;
  try {
    console.log(`[Sync] Connecting to SQL Server: ${MSSQL_SERVER}/${MSSQL_DB}`);
    pool = await sql.connect(config);
    const result = await pool.request().query(MSSQL_QUERY);
    const rows = result.recordset;
    console.log(`[Sync] Retrieved ${rows.length} patient rows from SSRS`);

    if (rows.length === 0) {
      console.log("[Sync] No patients to import. Done.");
      return;
    }

    const patients = rows.map(mapRow).filter((p) => p.initials);

    const payload = {
      siteId: KOHEEZ_SITE_ID,
      patients,
    };

    const url = `${KOHEEZ_URL.replace(/\/$/, "")}/api/retention/import`;
    console.log(`[Sync] POSTing ${patients.length} patients to ${url}`);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${IMPORT_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    if (!res.ok) {
      console.error("[Sync] Import failed:", body);
      process.exit(1);
    }

    console.log(
      `[Sync] Done — imported: ${body.imported}, skipped: ${body.skipped}, errors: ${body.errors?.length ?? 0}`
    );
  } catch (err) {
    console.error("[Sync] Error:", err.message || err);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

run();
