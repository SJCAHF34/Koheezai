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

const STORE_KEYS = [
  "koheez_task_completions",
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
] as const;

const TRACKED = new Set<string>(STORE_KEYS);
const PUSH_DEBOUNCE_MS = 800;

let interceptorInstalled = false;
// While hydrating we write into localStorage ourselves — those writes must not
// be echoed back to the server.
let suppressPush = false;
let hydrationPromise: Promise<void> | null = null;
// The store this browser session syncs against (set at hydration time).
let activeSiteId: string | null = null;

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const dirtyKeys = new Set<string>();

function pushKey(key: string, keepalive = false): Promise<void> {
  if (!activeSiteId) return Promise.resolve();
  dirtyKeys.delete(key);
  const raw = window.localStorage.getItem(key);
  return fetch(
    `/api/client-store/${encodeURIComponent(key)}?siteId=${encodeURIComponent(activeSiteId)}`,
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
      }
    })
    .catch(() => {
      // Network hiccup — mark dirty so a later write (or unload flush) retries.
      dirtyKeys.add(key);
    });
}

function schedulePush(key: string) {
  dirtyKeys.add(key);
  const existing = pendingTimers.get(key);
  if (existing) clearTimeout(existing);
  pendingTimers.set(
    key,
    setTimeout(() => {
      pendingTimers.delete(key);
      void pushKey(key);
    }, PUSH_DEBOUNCE_MS),
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

    // One-time migration: upload local values the server doesn't have yet.
    for (const key of STORE_KEYS) {
      if (!serverKeys.has(key) && window.localStorage.getItem(key) !== null) {
        void pushKey(key);
      }
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
