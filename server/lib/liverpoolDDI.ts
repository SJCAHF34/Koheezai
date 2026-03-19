/**
 * Liverpool HIV Drug Interactions API integration
 *
 * Documentation: https://hivdrugs.docs.apiary.io/
 * Base URL:      https://www.hiv-druginteractions.org/api
 * Auth header:   X-API-Key: <LIVERPOOL_API_KEY>
 *
 * Traffic-light severity system returned by the API:
 *   red    → contraindicated              → maps to "critical"
 *   amber  → potentially serious          → maps to "moderate"
 *   yellow → potential weak interaction   → maps to "minor"
 *   green  → no known interaction         → omitted (no alert needed)
 *   grey   → insufficient data            → maps to "minor"
 */

import type { DrugInteraction } from "../../shared/schema";

const BASE_URL = "https://www.hiv-druginteractions.org/api";
const TIMEOUT_MS = 10_000;

// Module-level in-memory cache: lowercase drug name → Liverpool drug ID
const drugIdCache = new Map<string, number | null>();

function apiKey(): string | undefined {
  return process.env.LIVERPOOL_API_KEY;
}

export function isConfigured(): boolean {
  return !!apiKey();
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Look up a drug's Liverpool numeric ID by name.
 * Returns null if the drug is not found or the search fails.
 */
async function getDrugId(drugName: string): Promise<number | null> {
  const key = drugName.toLowerCase().trim();
  if (drugIdCache.has(key)) return drugIdCache.get(key)!;

  try {
    const url = `${BASE_URL}/drugs/search?q=${encodeURIComponent(drugName)}`;
    const resp = await fetchWithTimeout(url, {
      headers: {
        "X-API-Key": apiKey()!,
        "Accept": "application/json",
      },
    });

    if (!resp.ok) {
      console.warn(`[LiverpoolDDI] Drug search failed for "${drugName}": HTTP ${resp.status}`);
      drugIdCache.set(key, null);
      return null;
    }

    const data = await resp.json() as unknown;

    // Handle array or { results: [] } shapes
    const results: Array<{ id: number; name: string }> = Array.isArray(data)
      ? data
      : (data as { results?: Array<{ id: number; name: string }> }).results ?? [];

    if (results.length === 0) {
      drugIdCache.set(key, null);
      return null;
    }

    // Prefer an exact (case-insensitive) name match; fall back to first result
    const exact = results.find(r => r.name.toLowerCase() === key);
    const id = (exact ?? results[0]).id;
    drugIdCache.set(key, id);
    return id;
  } catch (err) {
    console.warn(`[LiverpoolDDI] Drug search error for "${drugName}":`, err);
    drugIdCache.set(key, null);
    return null;
  }
}

/**
 * Map Liverpool colour severity to our internal severity scale.
 */
function mapSeverity(colour: string): DrugInteraction["severity"] | null {
  switch (colour.toLowerCase()) {
    case "red":    return "critical";
    case "amber":  return "moderate";
    case "yellow": return "minor";
    case "grey":   return "minor";
    case "green":  return null;   // No interaction — skip
    default:       return "minor";
  }
}

/**
 * Call the Liverpool interactions endpoint.
 * Returns a processed DrugInteraction[] or null on error.
 */
async function fetchInteractions(drugIds: number[]): Promise<DrugInteraction[] | null> {
  try {
    const resp = await fetchWithTimeout(`${BASE_URL}/interactions`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey()!,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ drugs: drugIds }),
    });

    if (!resp.ok) {
      console.warn(`[LiverpoolDDI] Interaction check failed: HTTP ${resp.status}`);
      return null;
    }

    const data = await resp.json() as {
      interactions?: Array<{
        drug1: { id: number; name: string };
        drug2: { id: number; name: string };
        severity: string;       // "red" | "amber" | "yellow" | "green" | "grey"
        description?: string;
        recommendations?: string;
        recommendation?: string;
      }>;
    };

    const raw = data.interactions ?? [];
    const results: DrugInteraction[] = [];

    for (const item of raw) {
      const severity = mapSeverity(item.severity);
      if (!severity) continue; // green → skip

      results.push({
        id: `liverpool-${item.drug1.id}-${item.drug2.id}`,
        drug1: item.drug1.name,
        drug2: item.drug2.name,
        severity,
        description: item.description ?? `Potential interaction between ${item.drug1.name} and ${item.drug2.name}.`,
        recommendation: item.recommendations ?? item.recommendation ?? "Review with prescriber and monitor closely.",
      });
    }

    return results;
  } catch (err) {
    console.warn("[LiverpoolDDI] Interaction fetch error:", err);
    return null;
  }
}

/**
 * Main entry point.
 *
 * Given the selected ARV names and concomitant medication names, resolve each to a
 * Liverpool drug ID, then call the interactions endpoint.
 *
 * Returns null if:
 *  - LIVERPOOL_API_KEY is not set
 *  - fewer than 2 drug IDs could be resolved
 *  - the API call fails
 */
export async function checkLiverpoolInteractions(
  selectedDrugs: string[],
  concomitantMeds: string[],
): Promise<{ interactions: DrugInteraction[]; resolvedCount: number } | null> {
  if (!isConfigured()) return null;

  const allDrugNames = [...selectedDrugs, ...concomitantMeds];
  if (allDrugNames.length < 2) return null;

  console.log(`[LiverpoolDDI] Resolving IDs for ${allDrugNames.length} drugs…`);

  // Resolve all IDs in parallel
  const idResults = await Promise.all(allDrugNames.map(getDrugId));
  const drugIds = idResults.filter((id): id is number => id !== null);

  console.log(`[LiverpoolDDI] Resolved ${drugIds.length}/${allDrugNames.length} drug IDs`);

  if (drugIds.length < 2) {
    console.warn("[LiverpoolDDI] Not enough IDs resolved; skipping Liverpool check");
    return null;
  }

  const interactions = await fetchInteractions(drugIds);
  if (!interactions) return null;

  console.log(`[LiverpoolDDI] Received ${interactions.length} interaction(s) from Liverpool API`);
  return { interactions, resolvedCount: drugIds.length };
}
