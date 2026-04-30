// ─────────────────────────────────────────────────────────────────────────────
// Per-store perpetual inventory + adjustment ledger + bi-annual count storage.
// All data is held in the browser's localStorage so the demo persists across
// sessions without a backend round-trip.
// ─────────────────────────────────────────────────────────────────────────────

import type { AdjustmentType } from "./controlledDrugs";

const INVENTORY_KEY = "koheez_controlled_inventory";    // [{siteId, ndc, currentCount, ...}]
const LEDGER_KEY = "koheez_controlled_adjustments";      // [{...adjustment}]
const BIANNUAL_KEY = "koheez_controlled_biannual";       // [{...biAnnualCount}]

// ── Types ───────────────────────────────────────────────────────────────────

export interface InventoryItem {
  /** Composite id `${siteId}|${ndc}` */
  id: string;
  siteId: string;
  ndc: string;
  /** Snapshot fields kept for fast rendering even if catalog grows later. */
  drugName: string;
  strength: string;
  form: string;
  schedule: string;
  currentCount: number;
  lastAdjustedAt: string;
  lastAdjustedBy: string;
  lastAdjustedByRole: string;
}

export interface InventoryAdjustment {
  id: string;
  siteId: string;
  ndc: string;
  drugName: string;
  type: AdjustmentType;
  /** Positive integer the user entered. */
  quantity: number;
  /** Resulting on-hand count after this adjustment. */
  countAfter: number;
  reason?: string;
  performedBy: string;
  performedByRole: string;
  performedAt: string;
}

export interface BiAnnualCountEntry {
  ndc: string;
  drugName: string;
  strength: string;
  form: string;
  schedule: string;
  expectedCount: number;
  actualCount: number;
  /** actualCount - expectedCount */
  variance: number;
}

export interface BiAnnualCount {
  id: string;
  siteId: string;
  startedAt: string;
  completedAt?: string;
  performedBy: string;
  performedByRole: string;
  witnessedBy?: string;
  notes?: string;
  entries: BiAnnualCountEntry[];
}

// ── Low-level reads / writes ────────────────────────────────────────────────

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    console.error("Controlled inventory: storage write failed", err);
  }
}

function inventoryId(siteId: string, ndc: string): string {
  return `${siteId}|${ndc}`;
}

// ── Perpetual inventory CRUD ────────────────────────────────────────────────

export function getInventoryForSite(siteId: string): InventoryItem[] {
  return read<InventoryItem>(INVENTORY_KEY)
    .filter((i) => i.siteId === siteId)
    .sort((a, b) => a.drugName.localeCompare(b.drugName));
}

export function getInventoryItem(siteId: string, ndc: string): InventoryItem | undefined {
  return read<InventoryItem>(INVENTORY_KEY).find((i) => i.id === inventoryId(siteId, ndc));
}

export function upsertInventoryItem(item: InventoryItem): void {
  const all = read<InventoryItem>(INVENTORY_KEY);
  const idx = all.findIndex((i) => i.id === item.id);
  if (idx >= 0) all[idx] = item;
  else all.push(item);
  write(INVENTORY_KEY, all);
}

export function removeInventoryItem(siteId: string, ndc: string): void {
  const all = read<InventoryItem>(INVENTORY_KEY).filter(
    (i) => i.id !== inventoryId(siteId, ndc),
  );
  write(INVENTORY_KEY, all);
}

// ── Adjustment ledger ───────────────────────────────────────────────────────

export function getAdjustmentsForSite(siteId: string): InventoryAdjustment[] {
  return read<InventoryAdjustment>(LEDGER_KEY)
    .filter((a) => a.siteId === siteId)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt));
}

export function appendAdjustment(adj: InventoryAdjustment): void {
  const all = read<InventoryAdjustment>(LEDGER_KEY);
  all.push(adj);
  write(LEDGER_KEY, all);
}

// ── Bi-annual count CRUD ────────────────────────────────────────────────────

export function getBiAnnualCounts(siteId: string): BiAnnualCount[] {
  return read<BiAnnualCount>(BIANNUAL_KEY)
    .filter((c) => c.siteId === siteId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function getBiAnnualCount(id: string): BiAnnualCount | undefined {
  return read<BiAnnualCount>(BIANNUAL_KEY).find((c) => c.id === id);
}

export function upsertBiAnnualCount(count: BiAnnualCount): void {
  const all = read<BiAnnualCount>(BIANNUAL_KEY);
  const idx = all.findIndex((c) => c.id === count.id);
  if (idx >= 0) all[idx] = count;
  else all.push(count);
  write(BIANNUAL_KEY, all);
}

export function deleteBiAnnualCount(id: string): void {
  write(BIANNUAL_KEY, read<BiAnnualCount>(BIANNUAL_KEY).filter((c) => c.id !== id));
}

// ── Convenience helpers ─────────────────────────────────────────────────────

export function makeInventoryId(siteId: string, ndc: string): string {
  return inventoryId(siteId, ndc);
}

/**
 * Period key for the current bi-annual cycle (H1: Jan–Jun, H2: Jul–Dec).
 * Useful for labeling and ensuring at most one open count per half-year.
 */
export function currentBiAnnualPeriod(now = new Date()): string {
  const half = now.getMonth() < 6 ? "H1" : "H2";
  return `${now.getFullYear()}-${half}`;
}
