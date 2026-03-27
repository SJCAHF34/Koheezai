import { SITES, CATEGORY_CONFIG, type TaskCategory } from "./taskData";

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

// Base 7-day average completion rates per category (realistic pharmacy benchmarks)
const BASE_RATES: Record<TaskCategory, number> = {
  operations: 74,
  achc: 82,
  state_board: 79,
  retention: 58, // Retention is the weakest category industry-wide
};

// Per-site performance adjustments
const SITE_ADJ: Record<string, number> = {
  "1417": 6,   // Site 1417: above average
  "1842": -13, // Site 1842: underperforming
  "2031": 2,   // Site 2031: near average
};

export const SPARKLINE_COLORS: Record<TaskCategory, string> = {
  achc: "#3b82f6",
  state_board: "#10b981",
  retention: "#f59e0b",
  operations: "#64748b",
};

export interface DayPoint {
  date: string;  // YYYY-MM-DD
  label: string; // "Mon", "Tue" … "Today"
  pct: number;   // 0–100
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

function getPast7Days(): Array<{ iso: string; label: string }> {
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const result: Array<{ iso: string; label: string }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const pad = (n: number) => String(n).padStart(2, "0");
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    result.push({ iso, label: i === 0 ? "Today" : weekday[d.getDay()] });
  }
  return result;
}

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
      // ±16% daily variance with a small day-of-week pattern
      const variance = (rand() - 0.5) * 32;
      const pct = Math.round(Math.max(0, Math.min(100, base + variance)));
      return { date: iso, label, pct };
    });

    const avg7d = Math.round(dayPoints.reduce((s, d) => s + d.pct, 0) / 7);

    // Trend: compare average of days 1-3 vs days 5-7
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

export function getTroubleSpots(): TroubleSpot[] {
  const allTrends = getAllSiteTrends();

  return TREND_CATEGORIES.map((cat) => {
    const siteBreakdown = allTrends
      .map((st) => ({ siteId: st.siteId, siteName: st.siteName, avg7d: st.categories[cat].avg7d }))
      .sort((a, b) => a.avg7d - b.avg7d);

    const avgPct = Math.round(siteBreakdown.reduce((s, sb) => s + sb.avg7d, 0) / siteBreakdown.length);
    const worstSiteName = siteBreakdown[0].siteName;

    return {
      category: cat,
      label: CATEGORY_CONFIG[cat].label,
      avgPct,
      siteBreakdown,
      worstSiteName,
    };
  }).sort((a, b) => a.avgPct - b.avgPct);
}

// Returns cross-site average completion per day for a given category (for the aggregate sparkline)
export function getAverageCategoryDays(cat: TaskCategory, allTrends: SiteTrend[]): number[] {
  const numDays = 7;
  return Array.from({ length: numDays }, (_, i) =>
    Math.round(allTrends.reduce((s, st) => s + st.categories[cat].days[i].pct, 0) / allTrends.length)
  );
}
