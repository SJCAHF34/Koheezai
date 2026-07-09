// JotForm → sFax auto-fax service for the McKesson ICQ queue.
// Fetches a submission PDF from JotForm and faxes it via sFax, while
// maintaining an in-memory log of every attempt (max 500, FIFO).

export interface FaxLogEntry {
  submissionID: string;
  patientName: string;
  submittedAt: string; // ISO timestamp
  status: "sent" | "failed";
  sfaxJobId?: string;
  errorMessage?: string;
}

const MAX_ENTRIES = 500;
const faxLog: FaxLogEntry[] = [];

function upsertEntry(entry: FaxLogEntry) {
  const idx = faxLog.findIndex((e) => e.submissionID === entry.submissionID);
  if (idx >= 0) {
    faxLog[idx] = entry;
  } else {
    faxLog.push(entry);
    while (faxLog.length > MAX_ENTRIES) {
      faxLog.shift(); // FIFO eviction of the oldest entry
    }
  }
}

export function getFaxLog(): FaxLogEntry[] {
  // Newest first
  return [...faxLog].reverse();
}

export function getFaxEntry(submissionID: string): FaxLogEntry | undefined {
  return faxLog.find((e) => e.submissionID === submissionID);
}

export function getFaxConfigStatus(): { ok: boolean; missing: string[] } {
  const required = ["JOTFORM_API_KEY", "SFAX_USERNAME", "SFAX_API_KEY", "ICQ_FAX_NUMBER"];
  const missing = required.filter((k) => !process.env[k]);
  return { ok: missing.length === 0, missing };
}

// ── JotForm: download submission PDF ───────────────────────────────────────
async function fetchSubmissionPdf(submissionID: string): Promise<Buffer> {
  const apiKey = process.env.JOTFORM_API_KEY;
  if (!apiKey) throw new Error("JOTFORM_API_KEY is not configured");

  const url = `https://api.jotform.com/submission/${encodeURIComponent(
    submissionID,
  )}/pdf?apiKey=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`JotForm PDF fetch failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error("JotForm returned an empty PDF");
  return buf;
}

// ── sFax: send the PDF to the ICQ fax number ───────────────────────────────
async function sendFaxViaSfax(pdf: Buffer, submissionID: string): Promise<string> {
  const username = process.env.SFAX_USERNAME;
  const apiKey = process.env.SFAX_API_KEY;
  const toFax = process.env.ICQ_FAX_NUMBER;

  const missing = [
    !username && "SFAX_USERNAME",
    !apiKey && "SFAX_API_KEY",
    !toFax && "ICQ_FAX_NUMBER",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`sFax not configured (missing: ${missing.join(", ")})`);
  }

  const form = new FormData();
  form.append("Username", username!);
  form.append("ApiKey", apiKey!);
  form.append("ToFaxNumber", toFax!);
  form.append(
    "file",
    new Blob([pdf], { type: "application/pdf" }),
    `PSA-${submissionID}.pdf`,
  );

  // Credentials are also passed as query params for compatibility with sFax auth.
  const endpoint = `https://api.sfax.com/api/fax/send?username=${encodeURIComponent(
    username!,
  )}&apikey=${encodeURIComponent(apiKey!)}`;

  const res = await fetch(endpoint, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(60000),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`sFax send failed (${res.status}): ${text.slice(0, 200)}`);
  }

  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // sFax may return non-JSON on success in some configurations
  }

  if (json && (json.isSuccess === false || json.IsSuccess === false)) {
    const msg = json.message || json.Message || "sFax reported failure";
    throw new Error(`sFax error: ${String(msg).slice(0, 200)}`);
  }

  const jobId =
    json?.JobId ?? json?.jobId ?? json?.FaxId ?? json?.faxId ?? json?.id ?? "";
  return String(jobId || "unknown");
}

// ── Orchestration ──────────────────────────────────────────────────────────
export async function processSubmission(
  submissionID: string,
  patientName?: string,
  submittedAt?: string,
): Promise<FaxLogEntry> {
  const base = {
    submissionID,
    patientName: patientName?.trim() || "Unknown",
    submittedAt: submittedAt || new Date().toISOString(),
  };

  try {
    const pdf = await fetchSubmissionPdf(submissionID);
    const jobId = await sendFaxViaSfax(pdf, submissionID);
    const entry: FaxLogEntry = { ...base, status: "sent", sfaxJobId: jobId };
    upsertEntry(entry);
    console.log(`[Fax] Sent submission ${submissionID} to ICQ (sFax job ${jobId})`);
    return entry;
  } catch (err) {
    const entry: FaxLogEntry = {
      ...base,
      status: "failed",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    };
    upsertEntry(entry);
    console.error(`[Fax] Failed submission ${submissionID}: ${entry.errorMessage}`);
    return entry;
  }
}

export async function retrySubmission(submissionID: string): Promise<FaxLogEntry | null> {
  const existing = getFaxEntry(submissionID);
  if (!existing) return null;
  return processSubmission(existing.submissionID, existing.patientName, existing.submittedAt);
}
