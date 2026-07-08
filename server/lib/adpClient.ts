/**
 * ADP Workforce Now — OAuth2 client-credentials + mTLS integration.
 *
 * Credentials are loaded from environment variables (never from client code):
 *   ADP_CLIENT_ID, ADP_CLIENT_SECRET, ADP_SSL_CERT, ADP_SSL_KEY, ADP_ORG_OID
 *
 * All requests use mutual TLS: the server presents its certificate to ADP
 * alongside the bearer token so ADP can verify both ends of the connection.
 */

import https from "https";
import type { ScheduleStatus } from "@shared/schema";

const ADP_AUTH_BASE = "https://accounts.adp.com";
const ADP_API_BASE  = "https://api.adp.com";

// TOKEN CACHE — one access token per process lifetime (refreshed on expiry).
let _cachedToken: { value: string; expiresAt: number } | null = null;

// ── Credential helpers ────────────────────────────────────────────────────

export function isConfigured(): boolean {
  return !!(
    process.env.ADP_CLIENT_ID &&
    process.env.ADP_CLIENT_SECRET &&
    process.env.ADP_SSL_CERT &&
    process.env.ADP_SSL_KEY
  );
}

/** Returns which secrets are present/missing for the setup checklist. */
export function getConfigStatus(): Record<string, boolean> {
  return {
    ADP_CLIENT_ID:     !!process.env.ADP_CLIENT_ID,
    ADP_CLIENT_SECRET: !!process.env.ADP_CLIENT_SECRET,
    ADP_SSL_CERT:      !!process.env.ADP_SSL_CERT,
    ADP_SSL_KEY:       !!process.env.ADP_SSL_KEY,
    ADP_ORG_OID:       !!process.env.ADP_ORG_OID,
  };
}

function buildAgent(): https.Agent {
  // ADP requires mutual TLS: we send our client cert + private key.
  // PEM values in env vars store newlines as literal \n; restore them.
  const cert = (process.env.ADP_SSL_CERT ?? "").replace(/\\n/g, "\n");
  const key  = (process.env.ADP_SSL_KEY  ?? "").replace(/\\n/g, "\n");
  return new https.Agent({ cert, key, rejectUnauthorized: true });
}

// ── Low-level HTTPS helper ────────────────────────────────────────────────

interface HttpResult {
  status: number;
  body:   string;
}

function httpsRequest(
  urlStr:  string,
  method:  string,
  headers: Record<string, string>,
  agent:   https.Agent,
  body?:   string,
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request(
      {
        hostname: url.hostname,
        port:     url.port || "443",
        path:     url.pathname + url.search,
        method,
        headers,
        agent,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Token management ──────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  if (_cachedToken && Date.now() < _cachedToken.expiresAt) {
    return _cachedToken.value;
  }
  const clientId     = process.env.ADP_CLIENT_ID!;
  const clientSecret = process.env.ADP_CLIENT_SECRET!;
  const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const agent        = buildAgent();

  const result = await httpsRequest(
    `${ADP_AUTH_BASE}/auth/oauth/v2/token`,
    "POST",
    {
      "Authorization":  `Basic ${credentials}`,
      "Content-Type":   "application/x-www-form-urlencoded",
    },
    agent,
    "grant_type=client_credentials",
  );

  if (result.status !== 200) {
    throw new Error(`ADP token request failed (${result.status}): ${result.body}`);
  }

  const parsed = JSON.parse(result.body) as {
    access_token: string;
    expires_in:   number;
  };
  // Expire 60 s early to avoid using a token that's about to expire.
  _cachedToken = {
    value:     parsed.access_token,
    expiresAt: Date.now() + (parsed.expires_in - 60) * 1000,
  };
  return _cachedToken.value;
}

// ── Public types ──────────────────────────────────────────────────────────

export interface AdpWorker {
  workerId:    string;
  givenName:   string;
  familyName:  string;
  displayName: string;
}

export interface AdpTimeOffRequest {
  requestId:  string;
  workerId:   string;
  startDate:  string; // YYYY-MM-DD
  endDate:    string; // YYYY-MM-DD
  typeCode:   string; // e.g. "VACATION", "SICK", "FLOATING_HOLIDAY"
}

/** Maps ADP leave-type codes to our ScheduleStatus enum. Returns null for unknown types. */
export function mapAdpTypeToStatus(typeCode: string): "pto" | "sick" | "floating_holiday" | null {
  const u = typeCode.toUpperCase();
  if (u.includes("VACAT") || u.includes("PTO") || u.includes("ANNUAL") || u === "VAC") return "pto";
  if (u.includes("SICK") || u.includes("ILL"))  return "sick";
  if (u.includes("FLOAT") || u === "FH" || u.includes("PERSONAL")) return "floating_holiday";
  return null;
}

// ── API calls ────────────────────────────────────────────────────────────

/**
 * Fetches workers whose home org unit code matches the given store code.
 * Returns only the minimum fields needed for name-matching and mapping.
 */
export async function fetchWorkersForSite(storeCode: string): Promise<AdpWorker[]> {
  const token = await getToken();
  const agent = buildAgent();
  let filterStr = `workAssignment/homeOrganizationalUnit/nameCode/codeValue eq '${storeCode}'`;
  const orgOid = process.env.ADP_ORG_OID;
  if (orgOid) {
    filterStr += ` and organization/associateOID eq '${orgOid}'`;
  }
  const filter = encodeURIComponent(filterStr);
  const url = `${ADP_API_BASE}/hr/v2/workers?$filter=${filter}&$select=workers/workerID,workers/person/legalName`;

  const result = await httpsRequest(url, "GET", { Authorization: `Bearer ${token}` }, agent);

  if (result.status !== 200) {
    throw new Error(`ADP workers fetch failed (${result.status}): ${result.body.slice(0, 200)}`);
  }

  const data = JSON.parse(result.body) as { workers?: unknown[] };
  return (data.workers ?? []).map((w: any) => {
    const given  = w.person?.legalName?.givenName  ?? "";
    const family = w.person?.legalName?.familyName ?? "";
    return {
      workerId:    String(w.workerID ?? ""),
      givenName:   given,
      familyName:  family,
      displayName: `${given} ${family}`.trim(),
    };
  });
}

/**
 * Fetches approved time-off requests for one worker within the given date window.
 * Returns only the five fields we actually import.
 */
export async function fetchApprovedTimeOff(
  workerId:  string,
  fromDate:  string,
  toDate:    string,
): Promise<AdpTimeOffRequest[]> {
  const token = await getToken();
  const agent = buildAgent();
  const filter = encodeURIComponent("requestStatusCode/codeValue eq 'approved'");
  const url = `${ADP_API_BASE}/time/v2/workers/${workerId}/time-off-requests?$filter=${filter}`;

  const result = await httpsRequest(url, "GET", { Authorization: `Bearer ${token}` }, agent);

  if (result.status === 404) return [];
  if (result.status !== 200) {
    throw new Error(`ADP time-off fetch failed for worker ${workerId} (${result.status})`);
  }

  const data = JSON.parse(result.body) as { timeOffRequests?: unknown[] };
  const out: AdpTimeOffRequest[] = [];

  for (const raw of (data.timeOffRequests ?? [])) {
    const req = (raw as any)?.timeOffRequest ?? raw;
    const start = String(req?.timeOffPeriod?.startDate ?? req?.startDate ?? "").slice(0, 10);
    const end   = String(req?.timeOffPeriod?.endDate   ?? req?.endDate   ?? start).slice(0, 10);
    if (!start) continue;
    // Skip entries entirely outside our window
    if (end < fromDate || start > toDate) continue;
    out.push({
      requestId: String(req?.requestId ?? (raw as any)?.requestId ?? ""),
      workerId,
      startDate: start,
      endDate:   end || start,
      typeCode:  String(req?.timeOffType?.codeValue ?? "VACATION"),
    });
  }

  return out;
}
