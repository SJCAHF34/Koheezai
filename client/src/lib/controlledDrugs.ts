// ─────────────────────────────────────────────────────────────────────────────
// Controlled substance NDC catalog (DEA Schedules II–V).
// Used by Controlled Inventory Management.
// NDCs are real, illustrative entries for common products dispensed in HIV
// pharmacies. The catalog is local-only; in production this would be backed
// by an authoritative NDC service.
// ─────────────────────────────────────────────────────────────────────────────

export type DeaSchedule = "C-II" | "C-III" | "C-IV" | "C-V";

export interface ControlledDrug {
  /** 11-digit NDC normalized as 5-4-2 with hyphens, e.g. "00074-3105-13" */
  ndc: string;
  /** Generic name (and brand in parens when widely known) */
  name: string;
  strength: string;
  form: string;
  schedule: DeaSchedule;
  manufacturer?: string;
  packageSize?: string;
}

/**
 * Seed catalog focused on products common in AHF / HIV-pharmacy settings:
 * testosterone (C-III), dronabinol (C-III), stimulants for HIV-associated
 * fatigue, opioid analgesics, common benzodiazepines for anxiety/insomnia,
 * and anti-tussive C-V codeine syrups.
 *
 * To search/scan more drugs, just append entries here.
 */
export const CONTROLLED_DRUG_CATALOG: ControlledDrug[] = [
  // ── C-II opioid analgesics ──────────────────────────────────────────────
  { ndc: "00406-0512-01", name: "Oxycodone HCl",                         strength: "5 mg",     form: "Tablet",  schedule: "C-II",  manufacturer: "Mallinckrodt",  packageSize: "100 ct" },
  { ndc: "00406-0552-01", name: "Oxycodone HCl",                         strength: "10 mg",    form: "Tablet",  schedule: "C-II",  manufacturer: "Mallinckrodt",  packageSize: "100 ct" },
  { ndc: "59011-0440-10", name: "Oxycodone HCl ER (OxyContin)",          strength: "10 mg",    form: "Tablet ER", schedule: "C-II", manufacturer: "Purdue",        packageSize: "100 ct" },
  { ndc: "00406-0367-01", name: "Hydrocodone/APAP",                      strength: "5/325 mg", form: "Tablet",  schedule: "C-II",  manufacturer: "Mallinckrodt",  packageSize: "100 ct" },
  { ndc: "00406-0357-01", name: "Hydrocodone/APAP",                      strength: "10/325 mg",form: "Tablet",  schedule: "C-II",  manufacturer: "Mallinckrodt",  packageSize: "100 ct" },
  { ndc: "00054-0235-25", name: "Morphine Sulfate IR",                   strength: "15 mg",    form: "Tablet",  schedule: "C-II",  manufacturer: "Hikma",         packageSize: "100 ct" },
  { ndc: "00054-0236-25", name: "Morphine Sulfate IR",                   strength: "30 mg",    form: "Tablet",  schedule: "C-II",  manufacturer: "Hikma",         packageSize: "100 ct" },
  { ndc: "59011-0103-10", name: "Morphine Sulfate ER (MS Contin)",       strength: "15 mg",    form: "Tablet ER", schedule: "C-II", manufacturer: "Purdue",        packageSize: "100 ct" },
  { ndc: "00406-1525-62", name: "Methadone HCl",                         strength: "10 mg",    form: "Tablet",  schedule: "C-II",  manufacturer: "Mallinckrodt",  packageSize: "100 ct" },
  { ndc: "00074-3105-13", name: "Fentanyl Transdermal",                  strength: "25 mcg/hr",form: "Patch",   schedule: "C-II",  manufacturer: "Janssen",       packageSize: "5 ct" },
  { ndc: "00781-2806-31", name: "Hydromorphone HCl",                     strength: "4 mg",     form: "Tablet",  schedule: "C-II",  manufacturer: "Sandoz",        packageSize: "100 ct" },

  // ── C-II stimulants ─────────────────────────────────────────────────────
  { ndc: "57844-0110-01", name: "Amphetamine/Dextroamphetamine (Adderall)", strength: "10 mg",  form: "Tablet",  schedule: "C-II",  manufacturer: "Teva",          packageSize: "100 ct" },
  { ndc: "57844-0120-01", name: "Amphetamine/Dextroamphetamine (Adderall)", strength: "20 mg",  form: "Tablet",  schedule: "C-II",  manufacturer: "Teva",          packageSize: "100 ct" },
  { ndc: "59417-0103-10", name: "Lisdexamfetamine (Vyvanse)",            strength: "30 mg",    form: "Capsule", schedule: "C-II",  manufacturer: "Takeda",        packageSize: "100 ct" },
  { ndc: "00406-1124-01", name: "Methylphenidate HCl",                   strength: "10 mg",    form: "Tablet",  schedule: "C-II",  manufacturer: "Mallinckrodt",  packageSize: "100 ct" },

  // ── C-III ───────────────────────────────────────────────────────────────
  { ndc: "00574-0820-01", name: "Testosterone Cypionate",                strength: "200 mg/mL",form: "Injection",schedule: "C-III", manufacturer: "Perrigo",       packageSize: "10 mL vial" },
  { ndc: "00574-0850-01", name: "Testosterone Enanthate",                strength: "200 mg/mL",form: "Injection",schedule: "C-III", manufacturer: "Perrigo",       packageSize: "5 mL vial" },
  { ndc: "00378-0511-93", name: "Testosterone Gel 1.62%",                strength: "20.25 mg/pump", form: "Topical Gel", schedule: "C-III", manufacturer: "Mylan",     packageSize: "75 g pump" },
  { ndc: "00574-0119-30", name: "Dronabinol (Marinol)",                  strength: "5 mg",     form: "Capsule", schedule: "C-III", manufacturer: "Perrigo",       packageSize: "60 ct" },
  { ndc: "00574-0120-60", name: "Dronabinol (Marinol)",                  strength: "10 mg",    form: "Capsule", schedule: "C-III", manufacturer: "Perrigo",       packageSize: "60 ct" },
  { ndc: "12496-1283-01", name: "Buprenorphine/Naloxone (Suboxone)",     strength: "8/2 mg",   form: "Sublingual Film", schedule: "C-III", manufacturer: "Indivior", packageSize: "30 ct" },
  { ndc: "00093-5721-56", name: "Codeine/APAP",                          strength: "30/300 mg",form: "Tablet",  schedule: "C-III", manufacturer: "Teva",          packageSize: "100 ct" },
  { ndc: "00641-6038-25", name: "Ketamine HCl",                          strength: "50 mg/mL", form: "Injection",schedule: "C-III", manufacturer: "Hikma",         packageSize: "10 mL vial" },

  // ── C-IV ────────────────────────────────────────────────────────────────
  { ndc: "00378-2532-01", name: "Alprazolam",                            strength: "0.5 mg",   form: "Tablet",  schedule: "C-IV",  manufacturer: "Mylan",         packageSize: "100 ct" },
  { ndc: "00378-2541-01", name: "Alprazolam",                            strength: "1 mg",     form: "Tablet",  schedule: "C-IV",  manufacturer: "Mylan",         packageSize: "100 ct" },
  { ndc: "00781-1404-01", name: "Lorazepam",                             strength: "1 mg",     form: "Tablet",  schedule: "C-IV",  manufacturer: "Sandoz",        packageSize: "100 ct" },
  { ndc: "00781-1405-01", name: "Lorazepam",                             strength: "2 mg",     form: "Tablet",  schedule: "C-IV",  manufacturer: "Sandoz",        packageSize: "100 ct" },
  { ndc: "00093-0832-01", name: "Clonazepam",                            strength: "0.5 mg",   form: "Tablet",  schedule: "C-IV",  manufacturer: "Teva",          packageSize: "100 ct" },
  { ndc: "00093-0833-01", name: "Clonazepam",                            strength: "1 mg",     form: "Tablet",  schedule: "C-IV",  manufacturer: "Teva",          packageSize: "100 ct" },
  { ndc: "00378-0245-01", name: "Diazepam",                              strength: "5 mg",     form: "Tablet",  schedule: "C-IV",  manufacturer: "Mylan",         packageSize: "100 ct" },
  { ndc: "00378-0345-01", name: "Diazepam",                              strength: "10 mg",    form: "Tablet",  schedule: "C-IV",  manufacturer: "Mylan",         packageSize: "100 ct" },
  { ndc: "00093-0074-01", name: "Tramadol HCl",                          strength: "50 mg",    form: "Tablet",  schedule: "C-IV",  manufacturer: "Teva",          packageSize: "100 ct" },
  { ndc: "00378-0857-01", name: "Zolpidem Tartrate",                     strength: "5 mg",     form: "Tablet",  schedule: "C-IV",  manufacturer: "Mylan",         packageSize: "100 ct" },
  { ndc: "00378-0858-01", name: "Zolpidem Tartrate",                     strength: "10 mg",    form: "Tablet",  schedule: "C-IV",  manufacturer: "Mylan",         packageSize: "100 ct" },
  { ndc: "63459-0101-30", name: "Modafinil (Provigil)",                  strength: "200 mg",   form: "Tablet",  schedule: "C-IV",  manufacturer: "Teva",          packageSize: "30 ct" },
  { ndc: "00093-5377-56", name: "Temazepam",                             strength: "15 mg",    form: "Capsule", schedule: "C-IV",  manufacturer: "Teva",          packageSize: "100 ct" },

  // ── C-V ─────────────────────────────────────────────────────────────────
  { ndc: "00071-1014-68", name: "Pregabalin (Lyrica)",                   strength: "75 mg",    form: "Capsule", schedule: "C-V",   manufacturer: "Pfizer",        packageSize: "90 ct" },
  { ndc: "00071-1015-68", name: "Pregabalin (Lyrica)",                   strength: "150 mg",   form: "Capsule", schedule: "C-V",   manufacturer: "Pfizer",        packageSize: "90 ct" },
  { ndc: "00603-1543-58", name: "Promethazine/Codeine Syrup",            strength: "6.25/10 mg/5 mL", form: "Syrup", schedule: "C-V", manufacturer: "Qualitest", packageSize: "473 mL" },
  { ndc: "00603-1283-58", name: "Guaifenesin/Codeine Syrup",             strength: "100/10 mg/5 mL", form: "Syrup",  schedule: "C-V", manufacturer: "Qualitest", packageSize: "473 mL" },
  { ndc: "13668-0226-01", name: "Lacosamide (Vimpat)",                   strength: "100 mg",   form: "Tablet",  schedule: "C-V",   manufacturer: "Torrent",       packageSize: "60 ct" },
];

// ── Custom (user-added) NDC catalog (localStorage) ──────────────────────────
//
// Pharmacists may register additional NDCs from the Adjustment Ledger when a
// drug they need to track is missing from the seed catalog. These are stored
// client-side so the demo persists without a backend round-trip.

const CUSTOM_CATALOG_KEY = "koheez_custom_controlled_catalog";

function readCustomCatalog(): ControlledDrug[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(CUSTOM_CATALOG_KEY) : null;
    return raw ? (JSON.parse(raw) as ControlledDrug[]) : [];
  } catch {
    return [];
  }
}

function writeCustomCatalog(items: ControlledDrug[]): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CUSTOM_CATALOG_KEY, JSON.stringify(items));
    }
  } catch (err) {
    console.error("Custom NDC catalog: write failed", err);
  }
}

export function getCustomControlledDrugs(): ControlledDrug[] {
  return readCustomCatalog();
}

/**
 * Persist a user-added NDC. Returns the saved entry (NDC normalized).
 * Throws if the NDC already exists in the seed catalog or custom catalog.
 */
export function addCustomControlledDrug(input: ControlledDrug): ControlledDrug {
  const normalized: ControlledDrug = {
    ...input,
    ndc: normalizeNdc(input.ndc),
    name: input.name.trim(),
    strength: input.strength.trim(),
    form: input.form.trim(),
    manufacturer: input.manufacturer?.trim() || undefined,
    packageSize: input.packageSize?.trim() || undefined,
  };
  if (findControlledDrugByNdc(normalized.ndc)) {
    throw new Error(`NDC ${normalized.ndc} is already in the catalog.`);
  }
  const all = readCustomCatalog();
  all.push(normalized);
  writeCustomCatalog(all);
  return normalized;
}

/** Combined seed + custom catalog. */
function mergedCatalog(): ControlledDrug[] {
  return [...CONTROLLED_DRUG_CATALOG, ...readCustomCatalog()];
}

// ── Lookup helpers ──────────────────────────────────────────────────────────

/**
 * Normalize an NDC string to "12345-1234-12" form when possible.
 * Accepts user input with or without hyphens.
 */
export function normalizeNdc(input: string): string {
  const digits = input.replace(/[^0-9]/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 9)}-${digits.slice(9, 11)}`;
  }
  if (digits.length === 10) {
    // 10-digit NDCs come in three labeler formats; just pass through with hyphen guesses
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 10)}`;
  }
  return input.trim();
}

export function findControlledDrugByNdc(ndc: string): ControlledDrug | undefined {
  const normalized = normalizeNdc(ndc);
  const digits = ndc.replace(/[^0-9]/g, "");
  return mergedCatalog().find((d) => {
    if (d.ndc === normalized) return true;
    return d.ndc.replace(/[^0-9]/g, "") === digits;
  });
}

/** Free-text + NDC search; returns up to `limit` matches scored by relevance. */
export function searchControlledDrugs(query: string, limit = 12): ControlledDrug[] {
  const catalog = mergedCatalog();
  const q = query.trim().toLowerCase();
  if (!q) return catalog.slice(0, limit);
  const qDigits = q.replace(/[^0-9]/g, "");

  const scored = catalog.map((d) => {
    const ndcDigits = d.ndc.replace(/[^0-9]/g, "");
    const hay = `${d.name} ${d.strength} ${d.form} ${d.schedule} ${d.manufacturer ?? ""}`.toLowerCase();
    let score = 0;
    if (qDigits.length >= 4 && ndcDigits.startsWith(qDigits)) score += 100;
    else if (qDigits.length >= 4 && ndcDigits.includes(qDigits)) score += 60;
    if (hay.startsWith(q)) score += 50;
    else if (hay.includes(q)) score += 30;
    return { d, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.d);

  return scored;
}

export function getAllControlledDrugs(): ControlledDrug[] {
  return mergedCatalog();
}

export function getDrugsBySchedule(schedule: DeaSchedule): ControlledDrug[] {
  return mergedCatalog().filter((d) => d.schedule === schedule);
}

// ── Adjustment types ────────────────────────────────────────────────────────

export const ADJUSTMENT_TYPES = ["Addition", "Subtraction", "Dispensing", "Lost Med"] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

export function adjustmentDelta(type: AdjustmentType, qty: number): number {
  // Additions add to count; everything else removes from it.
  return type === "Addition" ? qty : -qty;
}
