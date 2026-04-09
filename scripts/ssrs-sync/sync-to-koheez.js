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
 * Map a SQL result row to the Koheez patient import format.
 *
 * Adjust the field names below to match your actual SSRS report column names.
 * Common McKesson/AHF column names are listed as examples.
 */
function mapRow(row) {
  return {
    initials: row.Initials || row.PatientInitials || row.initials || "",
    phone1: row.PrimaryPhone || row.Phone1 || row.primary_phone || "",
    phone2: row.SecondaryPhone || row.Phone2 || row.secondary_phone || "",
    issueType: normalizeIssueType(row.IssueType || row.issue_type || ""),
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
