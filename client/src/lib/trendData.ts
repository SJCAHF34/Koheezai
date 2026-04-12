import { SITES, CATEGORY_CONFIG, TASKS, type TaskCategory, type PharmacyTask } from "./taskData";

export const TREND_CATEGORIES: TaskCategory[] = ["achc", "state_board", "retention", "operations"];

// FNV-1a + Mulberry32 seeded PRNG — deterministic for any seed string
function seededRandom(seed: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return () => {
    h += 0x6d2b79f5;
    let x = Math.imul(h ^ (h >>> 15), 1 | h);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 0x100000000;
  };
}

// Base average completion rates per category (realistic pharmacy benchmarks)
const BASE_RATES: Record<TaskCategory, number> = {
  operations: 74,
  achc: 82,
  state_board: 79,
  retention: 58,
};

// Per-site performance adjustments for known sites (percentage points)
const SITE_ADJ: Record<string, number> = {
  "1417": 6,   // Site 1417: above average
  "1842": -13, // Site 1842: underperforming
  "2031": 2,   // Site 2031: near average
};

// Derive a consistent site-specific adjustment for any siteId
export function getSiteAdj(siteId: string): number {
  if (siteId in SITE_ADJ) return SITE_ADJ[siteId];
  const rand = seededRandom(`site-adj-${siteId}`);
  return Math.round((rand() - 0.5) * 36); // ±18 pp range
}

export const SPARKLINE_COLORS: Record<TaskCategory, string> = {
  achc: "#3b82f6",
  state_board: "#10b981",
  retention: "#f59e0b",
  operations: "#64748b",
};

// ── Period types ────────────────────────────────────────────────────────────

export type TrendPeriod = "7d" | "30d" | "6m" | "1y";

export const PERIOD_CONFIG: Record<TrendPeriod, { label: string; points: number; unit: "day" | "week" }> = {
  "7d":  { label: "7 Days",   points: 7,  unit: "day" },
  "30d": { label: "30 Days",  points: 30, unit: "day" },
  "6m":  { label: "6 Months", points: 26, unit: "week" },
  "1y":  { label: "1 Year",   points: 52, unit: "week" },
};

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface DayPoint {
  date: string;
  label: string;
  pct: number;
}

export interface CategoryTrend {
  category: TaskCategory;
  days: DayPoint[];
  avg7d: number;
  trend: "up" | "down" | "stable";
}

export interface SiteTrend {
  siteId: string;
  siteName: string;
  region: string;
  categories: Record<TaskCategory, CategoryTrend>;
  overallAvg: number;
  todayAvg: number;
}

export interface TroubleSpot {
  category: TaskCategory;
  label: string;
  avgPct: number;
  siteBreakdown: Array<{ siteId: string; siteName: string; avg7d: number }>;
  worstSiteName: string;
}

export interface TaskTroubleSpot {
  task: PharmacyTask;
  avgCompletionPct: number;
  siteBreakdown: Array<{ siteId: string; siteName: string; avg7d: number }>;
  worstSiteName: string;
}

export interface SiteRanking {
  siteId: string;
  siteName: string;
  region: string;
  avg: number;
  trend: "up" | "down" | "stable";
  points: number[];
}

// ── Period helpers ──────────────────────────────────────────────────────────

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number) { return String(n).padStart(2, "0"); }

function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getPeriodPoints(period: TrendPeriod): Array<{ iso: string; label: string }> {
  const { points, unit } = PERIOD_CONFIG[period];
  const result: Array<{ iso: string; label: string }> = [];

  for (let i = points - 1; i >= 0; i--) {
    const d = new Date();
    if (unit === "day") {
      d.setDate(d.getDate() - i);
    } else {
      d.setDate(d.getDate() - i * 7);
    }
    const iso = toIso(d);
    let label: string;
    if (i === 0) {
      label = unit === "week" ? MONTHS[d.getMonth()] : "Today";
    } else if (unit === "day") {
      label = period === "7d" ? WEEKDAY[d.getDay()] : `${d.getMonth() + 1}/${d.getDate()}`;
    } else {
      label = MONTHS[d.getMonth()];
    }
    result.push({ iso, label });
  }
  return result;
}

function getPast7Days(): Array<{ iso: string; label: string }> {
  return getPeriodPoints("7d");
}

function calcTrend(points: number[]): "up" | "down" | "stable" {
  const n = points.length;
  const third = Math.max(1, Math.floor(n / 3));
  const early = points.slice(0, third).reduce((s, v) => s + v, 0) / third;
  const late = points.slice(-third).reduce((s, v) => s + v, 0) / third;
  const diff = late - early;
  return diff > 7 ? "up" : diff < -7 ? "down" : "stable";
}

// ── Legacy 7-day site trend ──────────────────────────────────────────────────

export function generateSiteTrends(siteId: string): SiteTrend {
  const site = SITES.find((s) => s.id === siteId);
  const siteName = site?.name ?? siteId;
  const region = site?.region ?? "";
  const siteAdj = SITE_ADJ[siteId] ?? 0;
  const days7 = getPast7Days();

  const categories = {} as Record<TaskCategory, CategoryTrend>;

  for (const cat of TREND_CATEGORIES) {
    const base = BASE_RATES[cat] + siteAdj;
    const dayPoints: DayPoint[] = days7.map(({ iso, label }) => {
      const rand = seededRandom(`${siteId}-${cat}-${iso}`);
      const variance = (rand() - 0.5) * 32;
      const pct = Math.round(Math.max(0, Math.min(100, base + variance)));
      return { date: iso, label, pct };
    });
    const avg7d = Math.round(dayPoints.reduce((s, d) => s + d.pct, 0) / 7);
    const earlyAvg = (dayPoints[0].pct + dayPoints[1].pct + dayPoints[2].pct) / 3;
    const lateAvg = (dayPoints[4].pct + dayPoints[5].pct + dayPoints[6].pct) / 3;
    const diff = lateAvg - earlyAvg;
    const trend: "up" | "down" | "stable" = diff > 7 ? "up" : diff < -7 ? "down" : "stable";
    categories[cat] = { category: cat, days: dayPoints, avg7d, trend };
  }

  const overallAvg = Math.round(
    TREND_CATEGORIES.reduce((s, cat) => s + categories[cat].avg7d, 0) / TREND_CATEGORIES.length
  );
  const todayAvg = Math.round(
    TREND_CATEGORIES.reduce((s, cat) => s + categories[cat].days[6].pct, 0) / TREND_CATEGORIES.length
  );

  return { siteId, siteName, region, categories, overallAvg, todayAvg };
}

export function getAllSiteTrends(): SiteTrend[] {
  return SITES.map((s) => generateSiteTrends(s.id));
}

// ── Period-aware site trend ──────────────────────────────────────────────────

export function generateSiteTrendsForPeriod(
  siteId: string,
  siteName: string,
  region: string,
  period: TrendPeriod
): SiteTrend {
  const siteAdj = getSiteAdj(siteId);
  const pts = getPeriodPoints(period);

  const categories = {} as Record<TaskCategory, CategoryTrend>;

  for (const cat of TREND_CATEGORIES) {
    const base = Math.max(5, Math.min(95, BASE_RATES[cat] + siteAdj));
    const dayPoints: DayPoint[] = pts.map(({ iso, label }) => {
      const rand = seededRandom(`${siteId}-${cat}-${iso}`);
      const variance = (rand() - 0.5) * 32;
      const pct = Math.round(Math.max(0, Math.min(100, base + variance)));
      return { date: iso, label, pct };
    });
    const avg7d = Math.round(dayPoints.reduce((s, d) => s + d.pct, 0) / dayPoints.length);
    const trend = calcTrend(dayPoints.map((d) => d.pct));
    categories[cat] = { category: cat, days: dayPoints, avg7d, trend };
  }

  const overallAvg = Math.round(
    TREND_CATEGORIES.reduce((s, cat) => s + categories[cat].avg7d, 0) / TREND_CATEGORIES.length
  );
  const lastIdx = pts.length - 1;
  const todayAvg = Math.round(
    TREND_CATEGORIES.reduce((s, cat) => s + categories[cat].days[lastIdx].pct, 0) / TREND_CATEGORIES.length
  );

  return { siteId, siteName, region, categories, overallAvg, todayAvg };
}

export function getAllSiteTrendsForPeriod(period: TrendPeriod): SiteTrend[] {
  return SITES.map((s) =>
    generateSiteTrendsForPeriod(s.id, s.name, s.region, period)
  );
}

/** Cross-site average completion per data point for a given category & period */
export function getAverageCategoryPointsForPeriod(
  cat: TaskCategory,
  allTrends: SiteTrend[]
): number[] {
  const n = allTrends[0]?.categories[cat]?.days.length ?? 7;
  return Array.from({ length: n }, (_, i) =>
    Math.round(
      allTrends.reduce((s, st) => s + st.categories[cat].days[i].pct, 0) / allTrends.length
    )
  );
}

/**
 * Build an aggregate SiteTrend by averaging per-category daily points across
 * the provided store IDs. Used for CPO (all stores) and RPD (region stores).
 */
export function buildAggregateSiteTrend(
  siteIds: string[],
  period: TrendPeriod,
  label: string = "Aggregate"
): SiteTrend {
  if (siteIds.length === 0) {
    // Return explicit zeroed aggregate so callers never get single-store data accidentally
    const pts = getPeriodPoints(period);
    const categories = {} as Record<TaskCategory, CategoryTrend>;
    for (const cat of TREND_CATEGORIES) {
      const days: DayPoint[] = pts.map(({ iso, label: lbl }) => ({ date: iso, label: lbl, pct: 0 }));
      categories[cat] = { category: cat, days, avg7d: 0, trend: "stable" };
    }
    return { siteId: "aggregate", siteName: label, region: "", categories, overallAvg: 0, todayAvg: 0 };
  }
  const allTrends = siteIds.map((id) =>
    generateSiteTrendsForPeriod(id, id, "", period)
  );
  const categories = {} as Record<TaskCategory, CategoryTrend>;
  for (const cat of TREND_CATEGORIES) {
    const avgPoints = getAverageCategoryPointsForPeriod(cat, allTrends);
    const templateDays = allTrends[0].categories[cat].days;
    const days: DayPoint[] = templateDays.map((d, i) => ({
      date: d.date,
      label: d.label,
      pct: avgPoints[i],
    }));
    const avg7d = Math.round(avgPoints.reduce((s, v) => s + v, 0) / avgPoints.length);
    const trend = calcTrend(avgPoints);
    categories[cat] = { category: cat, days, avg7d, trend };
  }
  const overallAvg = Math.round(
    TREND_CATEGORIES.reduce((s, cat) => s + categories[cat].avg7d, 0) / TREND_CATEGORIES.length
  );
  const lastIdx = allTrends[0].categories.achc.days.length - 1;
  const todayAvg = Math.round(
    TREND_CATEGORIES.reduce((s, cat) => s + categories[cat].days[lastIdx].pct, 0) / TREND_CATEGORIES.length
  );
  return { siteId: "aggregate", siteName: label, region: "", categories, overallAvg, todayAvg };
}

/** Rank all provided stores by their avg completion % for a category × period */
export function getSiteRankingByCategory(
  cat: TaskCategory,
  period: TrendPeriod,
  allStores: Array<{ id: string; name: string; region: string }>
): SiteRanking[] {
  const pts = getPeriodPoints(period);

  const rankings: SiteRanking[] = allStores.map(({ id, name, region }) => {
    const siteAdj = getSiteAdj(id);
    const base = Math.max(5, Math.min(95, BASE_RATES[cat] + siteAdj));

    const values = pts.map(({ iso }) => {
      const rand = seededRandom(`${id}-${cat}-${iso}`);
      const variance = (rand() - 0.5) * 32;
      return Math.round(Math.max(0, Math.min(100, base + variance)));
    });

    const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
    const trend = calcTrend(values);

    return { siteId: id, siteName: name, region, avg, trend, points: values };
  });

  return rankings.sort((a, b) => b.avg - a.avg);
}

// ── Legacy helpers ───────────────────────────────────────────────────────────

export function getTroubleSpots(): TroubleSpot[] {
  const allTrends = getAllSiteTrends();
  return TREND_CATEGORIES.map((cat) => {
    const siteBreakdown = allTrends
      .map((st) => ({ siteId: st.siteId, siteName: st.siteName, avg7d: st.categories[cat].avg7d }))
      .sort((a, b) => a.avg7d - b.avg7d);
    const avgPct = Math.round(siteBreakdown.reduce((s, sb) => s + sb.avg7d, 0) / siteBreakdown.length);
    return {
      category: cat,
      label: CATEGORY_CONFIG[cat].label,
      avgPct,
      siteBreakdown,
      worstSiteName: siteBreakdown[0].siteName,
    };
  }).sort((a, b) => a.avgPct - b.avgPct);
}

export function getTroubleSpotTasks(limit = 12): TaskTroubleSpot[] {
  const days7 = getPast7Days();
  const dailyTasks = TASKS.filter((t) => t.frequency === "daily");
  const results: TaskTroubleSpot[] = [];

  for (const task of dailyTasks) {
    const siteBreakdown: Array<{ siteId: string; siteName: string; avg7d: number }> = [];

    for (const site of SITES) {
      const siteAdj = SITE_ADJ[site.id] ?? 0;
      const catBase = BASE_RATES[task.category];
      const taskBaseRand = seededRandom(`tb-${task.id}`);
      const taskOffset = (taskBaseRand() - 0.5) * 24;
      const probability = Math.max(5, Math.min(95, catBase + siteAdj + taskOffset));

      let daysCompleted = 0;
      for (const { iso } of days7) {
        const rand = seededRandom(`tc-${task.id}-${site.id}-${iso}`);
        if (rand() * 100 < probability) daysCompleted++;
      }

      siteBreakdown.push({
        siteId: site.id,
        siteName: site.name,
        avg7d: Math.round((daysCompleted / 7) * 100),
      });
    }

    const avgCompletionPct = Math.round(
      siteBreakdown.reduce((s, sb) => s + sb.avg7d, 0) / siteBreakdown.length
    );

    if (avgCompletionPct < 50) {
      const sorted = [...siteBreakdown].sort((a, b) => a.avg7d - b.avg7d);
      results.push({ task, avgCompletionPct, siteBreakdown: sorted, worstSiteName: sorted[0].siteName });
    }
  }

  return results.sort((a, b) => a.avgCompletionPct - b.avgCompletionPct).slice(0, limit);
}

export function getAverageCategoryDays(cat: TaskCategory, allTrends: SiteTrend[]): number[] {
  return Array.from({ length: 7 }, (_, i) =>
    Math.round(allTrends.reduce((s, st) => s + st.categories[cat].days[i].pct, 0) / allTrends.length)
  );
}

// ── Region-level aggregate performance ──────────────────────────────────────

export interface RegionPerformance {
  overallAvg: number;
  catAvgs: Record<TaskCategory, number>;
  atRiskCount: number;
  sparkline: number[];
  trend: "up" | "down" | "stable";
}

export function computeRegionPerformance(storeIds: string[]): RegionPerformance {
  if (storeIds.length === 0) {
    const empty = {} as Record<TaskCategory, number>;
    for (const cat of TREND_CATEGORIES) empty[cat] = 0;
    return { overallAvg: 0, catAvgs: empty, atRiskCount: 0, sparkline: [], trend: "stable" };
  }
  const adjs = storeIds.map(getSiteAdj);
  const catAvgs = {} as Record<TaskCategory, number>;
  for (const cat of TREND_CATEGORIES) {
    const avg =
      adjs.reduce((s, adj) => s + Math.min(99, Math.max(0, BASE_RATES[cat] + adj)), 0) /
      adjs.length;
    catAvgs[cat] = Math.round(avg);
  }
  const overallAvg = Math.round(
    TREND_CATEGORIES.reduce((s, cat) => s + catAvgs[cat], 0) / TREND_CATEGORIES.length
  );
  const atRiskCount = adjs.filter((adj) => {
    const storeAvg =
      TREND_CATEGORIES.reduce((s, cat) => s + Math.min(99, Math.max(0, BASE_RATES[cat] + adj)), 0) /
      TREND_CATEGORIES.length;
    return storeAvg < 60;
  }).length;
  const seed = storeIds.slice(0, 4).join("-");
  const sparkline: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const rng = seededRandom(`reg-spark-${seed}-${i}`);
    const noise = (rng() - 0.5) * 14;
    sparkline.push(Math.round(Math.min(99, Math.max(10, overallAvg + noise))));
  }
  const trend = calcTrend(sparkline);
  return { overallAvg, catAvgs, atRiskCount, sparkline, trend };
}
