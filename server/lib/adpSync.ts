/**
 * ADP time-off sync logic.
 * Reads approved time-off from ADP and upserts ScheduleEntry rows.
 */

import cron from "node-cron";
import {
  isConfigured,
  fetchWorkersForSite,
  fetchApprovedTimeOff,
  mapAdpTypeToStatus,
  type AdpWorker,
} from "./adpClient";
import { storage } from "../storage";
import type { AdpWorkerMapping } from "@shared/schema";

// ── Name-similarity helper (simple normalised token overlap) ──────────────

function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, " ").trim();
}

function nameSimilarity(a: string, b: string): number {
  const ta = new Set(normName(a).split(/\s+/).filter(Boolean));
  const tb = new Set(normName(b).split(/\s+/).filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) { if (tb.has(t)) overlap++; }
  return (2 * overlap) / (ta.size + tb.size);
}

/** Attempt to match an ADP display name to the closest roster entry (threshold ≥ 0.5). */
function autoMatch(
  adpName: string,
  roster: { staffId: string; staffName: string }[],
): { staffId: string; staffName: string } | null {
  let best = 0;
  let match: { staffId: string; staffName: string } | null = null;
  for (const r of roster) {
    const score = nameSimilarity(adpName, r.staffName);
    if (score > best) { best = score; match = r; }
  }
  return best >= 0.5 ? match : null;
}

// ── Date window helper ────────────────────────────────────────────────────

function addDays(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Public sync result type ───────────────────────────────────────────────

export interface AdpSyncResult {
  entriesCreated:  number;
  entriesUpdated:  number;
  entriesSkipped:  number;
  workersMatched:  number;
  workersSkipped:  number;
  newMappings:     number;
  error?:          string;
}

// ── Main sync function ────────────────────────────────────────────────────

/**
 * Runs the ADP sync for one site.
 *
 * @param siteId   Internal site ID (used as ADP store code for worker filtering).
 * @param roster   Optional array of {staffId, staffName} used to auto-match ADP
 *                 workers that are not yet in the mapping table. When omitted (e.g.
 *                 nightly cron), only previously established mappings are used.
 * @param windowDays  Days before/after today to include (default 90).
 */
export async function runAdpSync(
  siteId:      string,
  roster?:     { staffId: string; staffName: string }[],
  windowDays = 90,
): Promise<AdpSyncResult> {
  if (!isConfigured()) {
    return { entriesCreated: 0, entriesUpdated: 0, entriesSkipped: 0, workersMatched: 0, workersSkipped: 0, newMappings: 0, error: "ADP credentials not configured" };
  }

  const result: AdpSyncResult = {
    entriesCreated: 0, entriesUpdated: 0, entriesSkipped: 0,
    workersMatched: 0, workersSkipped: 0,
    newMappings:    0,
  };

  const fromDate = addDays(todayISO(), -windowDays);
  const toDate   = addDays(todayISO(), windowDays);

  try {
    // 1. Load existing mappings for this site.
    const existingMappings = await storage.getAdpWorkerMappings(siteId);
    const mappingByADP     = new Map<string, AdpWorkerMapping>(
      existingMappings.map((m) => [m.adpWorkerId, m]),
    );

    // 2. Fetch workers from ADP for this store.
    let adpWorkers: AdpWorker[] = [];
    try {
      adpWorkers = await fetchWorkersForSite(siteId);
    } catch (err) {
      result.error = `ADP workers fetch error: ${(err as Error).message}`;
      await storage.setAdpSyncStatus(siteId, {
        siteId,
        lastSyncAt:      new Date().toISOString(),
        lastSyncResult:  "error",
        lastSyncMessage: result.error,
      });
      return result;
    }

    // 3. Upsert mappings — auto-match unmatched workers when roster is provided.
    for (const worker of adpWorkers) {
      if (!mappingByADP.has(worker.workerId)) {
        const rosterMatch = roster ? autoMatch(worker.displayName, roster) : null;
        const mapping: AdpWorkerMapping = {
          siteId,
          adpWorkerId:    worker.workerId,
          adpDisplayName: worker.displayName,
          staffId:        rosterMatch?.staffId   ?? "",
          staffName:      rosterMatch?.staffName ?? "",
          updatedAt:      new Date().toISOString(),
        };
        const saved = await storage.upsertAdpWorkerMapping(mapping);
        mappingByADP.set(worker.workerId, saved);
        result.newMappings++;
      }
    }

    // 4. Fetch time-off for each mapped worker and upsert ScheduleEntries.
    for (const mapping of Array.from(mappingByADP.values())) {
      if (!mapping.staffId) { result.workersSkipped++; continue; }

      let requests;
      try {
        requests = await fetchApprovedTimeOff(mapping.adpWorkerId, fromDate, toDate);
      } catch (err) {
        console.error(`[ADP] Time-off fetch error for worker ${mapping.adpWorkerId}:`, err);
        result.workersSkipped++;
        continue;
      }

      result.workersMatched++;

      for (const req of requests) {
        const status = mapAdpTypeToStatus(req.typeCode);
        if (!status) continue; // unknown leave type — skip

        // Fetch all entries that cover req.startDate (including multi-day blocks
        // whose startDate is before req.startDate but endDate is on/after it).
        const coveringEntries = await storage.getScheduleEntries(siteId, req.startDate, req.startDate);
        const staffEntries = coveringEntries.filter((e) => e.staffId === mapping.staffId);

        // An existing ADP-tagged entry keyed exactly to this startDate.
        const adpEntry = staffEntries.find(
          (e) => e.date === req.startDate && e.note === "Synced from ADP",
        );
        // Any manually-created entry that covers this date (single-day or multi-day block).
        const manualEntry = staffEntries.find((e) => e.note !== "Synced from ADP");

        if (adpEntry) {
          // Already synced — update in place (dates/type may have changed).
          await storage.upsertScheduleEntry({
            siteId,
            staffId:   mapping.staffId,
            staffName: mapping.staffName,
            date:      req.startDate,
            endDate:   req.endDate !== req.startDate ? req.endDate : undefined,
            status,
            note:      "Synced from ADP",
          });
          result.entriesUpdated++;
        } else if (manualEntry) {
          // A manually-created entry covers this date — don't overwrite it.
          result.entriesSkipped++;
        } else {
          // No existing entry — create it.
          await storage.upsertScheduleEntry({
            siteId,
            staffId:   mapping.staffId,
            staffName: mapping.staffName,
            date:      req.startDate,
            endDate:   req.endDate !== req.startDate ? req.endDate : undefined,
            status,
            note:      "Synced from ADP",
          });
          result.entriesCreated++;
        }
      }
    }

    const msg = `${result.entriesCreated} created, ${result.entriesUpdated} updated, ${result.workersMatched} workers synced${result.entriesSkipped ? `, ${result.entriesSkipped} skipped (manual override)` : ""}`;
    const runAt = new Date().toISOString();
    await storage.setAdpSyncStatus(siteId, {
      siteId,
      lastSyncAt:      runAt,
      lastSyncResult:  "success",
      lastSyncMessage: msg,
    });
    await storage.addAdpSyncHistory({ siteId, runAt, result: "success", message: msg });
    console.log(`[ADP] Sync complete for site ${siteId}: ${msg}`);
  } catch (err) {
    result.error = (err as Error).message;
    const runAt = new Date().toISOString();
    await storage.setAdpSyncStatus(siteId, {
      siteId,
      lastSyncAt:      runAt,
      lastSyncResult:  "error",
      lastSyncMessage: result.error,
    });
    await storage.addAdpSyncHistory({ siteId, runAt, result: "error", message: result.error ?? "Unknown error" });
    console.error(`[ADP] Sync error for site ${siteId}:`, err);
  }

  return result;
}

// ── Nightly cron (all sites that have ADP mappings) ───────────────────────

async function runNightlySync(): Promise<void> {
  if (!isConfigured()) return;
  console.log("[ADP] Starting nightly sync");
  try {
    const siteIds = await storage.getAdpMappedSiteIds();
    for (const siteId of siteIds) {
      await runAdpSync(siteId); // no roster — uses existing mappings only
    }
    console.log(`[ADP] Nightly sync complete for ${siteIds.length} site(s)`);
  } catch (err) {
    console.error("[ADP] Nightly sync error:", err);
  }
}

export function startAdpScheduler(): void {
  const expr = process.env.ADP_SYNC_CRON || "0 2 * * *"; // default: 2 AM daily
  console.log(`[ADP] Scheduler starting with cron: ${expr}`);
  cron.schedule(expr, () => {
    runNightlySync().catch((err) => console.error("[ADP] Unhandled scheduler error:", err));
  });
}
