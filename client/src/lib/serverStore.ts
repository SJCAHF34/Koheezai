// Server-side backing for the app's localStorage stores.
//
// Many features (task completions, rosters, controlled inventory, ACHC docs,
// saved assessments, …) read/write localStorage synchronously through helper
// modules. Instead of rewriting all of them to be async, this module:
//
//  1. Hydrates localStorage from the server (`GET /api/client-store?siteId=X`)
//     right after login, before any page renders — so every device at the
//     same store sees the same saved data.
//  2. Intercepts localStorage writes to the known store keys and pushes the
//     new value to the server (`PUT /api/client-store/:key?siteId=X`),
//     debounced per key — so every change is saved permanently without
//     touching the existing synchronous code.
//
// Rows are scoped per store (siteId) and the server enforces that users can
// only read/write sites they're authorized on. Users without a concrete home
// store (siteId "ALL", i.e. CPO/RPD) skip syncing and keep local-only data.
//
// If the server has no data yet (first run after this feature shipped), any
// existing local values are uploaded once so nothing already saved is lost.
//
// Race guard: a write is debounced before it reaches the server, so a quick
// refresh/close can happen before the push lands. If a fresh page load then
// hydrates from the server, it would otherwise overwrite the just-made local
// change with the stale server value — silently reverting things like a task
// checkbox. To prevent that, every key with an un-confirmed push is recorded
// in a small "pending" marker written straight to localStorage (bypassing the
// debounce), which survives a reload. Hydration checks that marker first: any
// key still marked pending keeps its local value (never overwritten by the
// server response) and is immediately re-pushed instead.

const STORE_KEYS = [
  "koheez_task_completions",
  "koheez_task_sub_items",
  "koheez_task_assignments",
  "koheez_task_priorities",
  "koheez_urgent_tasks",
  "koheez_handoff_notes",
  "koheez_achc_workbook",
  "koheez_retention_risk",
  "koheez_staff_roster",
  "koheez_achc_foundation_docs",
  "koheez_achc_store_docs",
  "koheez_task_counters",
  "koheez_custom_tasks",
  "koheez_deleted_custom_tasks",
  "koheez_controlled_inventory",
  "koheez_controlled_adjustments",
  "koheez_controlled_biannual",
  "koheez_custom_controlled_catalog",
  "koheez_assessments",
  "koheez_wa_inspection",
  "koheez_wa_inspection_1310",
  "koheez_wa_inspection_1416",
  "koheez_wa_inspection_1417",
  "koheez_task_overrides",
  "koheez_task_spreadsheets",
] as const;

const TRACKED = new Set<string>(STORE_KEYS);
// Small, frequent interactions (task completions, sub-item checks) get a much
// shorter debounce so the loss window on a quick refresh/close is tiny. Larger,
// chunkier blobs (inventory, ACHC docs, rosters, …) keep the original debounce
// so we don't hammer the server on every keystroke.
const FAST_SYNC_KEYS = new Set<string>([
  "koheez_task_completions",
  "koheez_task_sub_items",
]);
const PUSH_DEBOUNCE_MS = 800;
const FAST_PUSH_DEBOUNCE_MS = 150;

// Marker recording which tracked keys have a write that hasn't been
// confirmed saved to the server yet, keyed by siteId so a pending entry from
// one store can never suppress hydration or be re-pushed into a different
// store (e.g. a shared workstation where different staff log into different
// sites). Written with the *original* localStorage methods (not the
// intercepted ones) so recording it doesn't itself get scheduled for a push,
// and so it survives a page reload — letting hydration on the next load know
// it must not clobber that key for that specific site.
const PENDING_MARKER_KEY = "koheez_sync_pending_keys";

let interceptorInstalled = false;
// While hydrating we write into localStorage ourselves — those writes must not
// be echoed back to the server.
let suppressPush = false;
let hydrationPromise: Promise<void> | null = null;
// The store this browser session syncs against (set at hydration time).
let activeSiteId: string | null = null;

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const dirtyKeys = new Set<string>();

let rawGetItem: (key: string) => string | null;
let rawSetItem: (key: string, value: string) => void;
let rawRemoveItem: (key: string) => void;

function readPendingMarkerAll(): Record<string, string[]> {
  try {
    const raw = rawGetItem.call(window.localStorage, PENDING_MARKER_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string[]>)
      : {};
  } catch {
    return {};
  }
}

function writePendingMarkerAll(bySite: Record<string, string[]>) {
  try {
    const hasAny = Object.values(bySite).some((keys) => keys.length > 0);
    if (!hasAny) {
      rawRemoveItem.call(window.localStorage, PENDING_MARKER_KEY);
    } else {
      rawSetItem.call(window.localStorage, PENDING_MARKER_KEY, JSON.stringify(bySite));
    }
  } catch {
    // Storage full/unavailable — nothing more we can do here.
  }
}

// Pending keys for the given site only — never a different site's entries.
function readPendingMarker(siteId: string): Set<string> {
  const bySite = readPendingMarkerAll();
  const keys = bySite[siteId];
  return new Set(Array.isArray(keys) ? keys : []);
}

function markPending(siteId: string, key: string) {
  const bySite = readPendingMarkerAll();
  const keys = new Set(bySite[siteId] ?? []);
  if (!keys.has(key)) {
    keys.add(key);
    bySite[siteId] = Array.from(keys);
    writePendingMarkerAll(bySite);
  }
}

function clearPending(siteId: string, key: string) {
  const bySite = readPendingMarkerAll();
  const keys = new Set(bySite[siteId] ?? []);
  if (keys.has(key)) {
    keys.delete(key);
    bySite[siteId] = Array.from(keys);
    writePendingMarkerAll(bySite);
  }
}

function pushKey(key: string, keepalive = false): Promise<void> {
  if (!activeSiteId) return Promise.resolve();
  const siteId = activeSiteId;
  dirtyKeys.delete(key);
  const raw = window.localStorage.getItem(key);
  return fetch(
    `/api/client-store/${encodeURIComponent(key)}?siteId=${encodeURIComponent(siteId)}`,
    {
      method: "PUT",
      credentials: "include",
      keepalive,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: raw }),
    },
  )
    .then((res) => {
      if (!res.ok) {
        // Server rejected the write (auth expired, server error) — mark dirty
        // so a later write or the unload flush retries it.
        dirtyKeys.add(key);
        return;
      }
      clearPending(siteId, key);
    })
    .catch(() => {
      // Network hiccup — mark dirty so a later write (or unload flush) retries.
      dirtyKeys.add(key);
    });
}

function schedulePush(key: string) {
  if (!activeSiteId) return;
  dirtyKeys.add(key);
  markPending(activeSiteId, key);
  const existing = pendingTimers.get(key);
  if (existing) clearTimeout(existing);
  pendingTimers.set(
    key,
    setTimeout(() => {
      pendingTimers.delete(key);
      void pushKey(key);
    }, FAST_SYNC_KEYS.has(key) ? FAST_PUSH_DEBOUNCE_MS : PUSH_DEBOUNCE_MS),
  );
}

function flushAllNow() {
  for (const [key, timer] of Array.from(pendingTimers.entries())) {
    clearTimeout(timer);
    pendingTimers.delete(key);
    void pushKey(key, true);
  }
  for (const key of Array.from(dirtyKeys)) {
    void pushKey(key, true);
  }
}

function installInterceptor() {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  const originalGetItem = Storage.prototype.getItem;
  rawGetItem = originalGetItem;
  rawSetItem = originalSetItem;
  rawRemoveItem = originalRemoveItem;

  Storage.prototype.setItem = function (key: string, value: string) {
    originalSetItem.call(this, key, value);
    if (this === window.localStorage && !suppressPush && activeSiteId && TRACKED.has(key)) {
      schedulePush(key);
    }
  };

  Storage.prototype.removeItem = function (key: string) {
    originalRemoveItem.call(this, key);
    if (this === window.localStorage && !suppressPush && activeSiteId && TRACKED.has(key)) {
      schedulePush(key);
    }
  };

  window.addEventListener("beforeunload", flushAllNow);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAllNow();
  });
}

async function doHydrate(siteId: string): Promise<void> {
  activeSiteId = siteId;
  installInterceptor();
  try {
    // Anything still marked pending from a previous page load never got
    // confirmed saved — keep the local value and re-push it once hydration
    // finishes, instead of letting the (stale) server response below
    // overwrite it.
    const pending = readPendingMarker(siteId);

    const res = await fetch(`/api/client-store?siteId=${encodeURIComponent(siteId)}`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const rows: Array<{ storeKey: string; value: unknown }> = await res.json();
    const serverKeys = new Set(rows.map((r) => r.storeKey));

    suppressPush = true;
    try {
      for (const row of rows) {
        if (!TRACKED.has(row.storeKey)) continue;
        if (pending.has(row.storeKey)) continue;
        if (row.value === null || row.value === undefined) {
          window.localStorage.removeItem(row.storeKey);
        } else if (typeof row.value === "string") {
          window.localStorage.setItem(row.storeKey, row.value);
        } else {
          window.localStorage.setItem(row.storeKey, JSON.stringify(row.value));
        }
      }
    } finally {
      suppressPush = false;
    }

    // Re-push anything that was pending before we hydrated, now that we
    // know the server is reachable — this is the retry for a write that
    // didn't get confirmed before an earlier reload/close.
    for (const key of Array.from(pending)) {
      if (TRACKED.has(key)) void pushKey(key, false);
    }

    // One-time migration: upload local values the server doesn't have yet.
    for (const key of STORE_KEYS) {
      if (!serverKeys.has(key) && !pending.has(key) && window.localStorage.getItem(key) !== null) {
        void pushKey(key);
      }
    }

    // Built-in task edits arrive with hydration; re-apply them to the
    // in-memory TASKS array so every page sees them without needing to
    // open the Task Manager first. (Dynamic import avoids a static cycle.)
    try {
      const { applyTaskOverridesToMemory } = await import("./taskStorage");
      applyTaskOverridesToMemory();
    } catch {
      // non-fatal
    }
  } catch {
    // Offline / server error: fall back to whatever is already in localStorage.
  }
}

/**
 * Hydrate localStorage from the server for the given store. Safe to call
 * multiple times. Users without a concrete home store (siteId "ALL" or empty)
 * skip syncing entirely and keep local-only behavior.
 */
export function hydrateClientStores(siteId: string | null | undefined): Promise<void> {
  if (!siteId || siteId === "ALL") return Promise.resolve();
  if (!hydrationPromise) hydrationPromise = doHydrate(siteId);
  return hydrationPromise;
}

/** Reset so the next login re-hydrates (used after logout). */
export function resetClientStoreHydration() {
  hydrationPromise = null;
  activeSiteId = null;
}
