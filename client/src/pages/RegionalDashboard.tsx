import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/App";
import { getUserProfile } from "@/lib/userProfile";
import { SITES, TASKS, CATEGORY_CONFIG, type TaskCategory } from "@/lib/taskData";
import { loadCompletions } from "@/lib/taskStorage";
import {
  getAllSiteTrends,
  getAllSiteTrendsForPeriod,
  getTroubleSpotTasks,
  getAverageCategoryDays,
  getAverageCategoryPointsForPeriod,
  TREND_CATEGORIES,
  SPARKLINE_COLORS,
  PERIOD_CONFIG,
  type TrendPeriod,
  type SiteTrend,
  type CategoryTrend,
} from "@/lib/trendData";
import { STORE_REGIONS, type StoreRegion, type StoreLocation } from "@/lib/storeDirectory";
import {
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Globe,
  BarChart3,
  ChevronRight,
  Eye,
  ChevronDown,
  Store,
} from "lucide-react";

const DAILY_TASKS = TASKS.filter((t) => t.frequency === "daily");
const DAILY_TASK_COUNT = DAILY_TASKS.length;

// ── Helpers ────────────────────────────────────────────────────────────────

function completionTextColor(pct: number) {
  return pct >= 80 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-500";
}
function completionBarColor(pct: number) {
  return pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-amber-400" : "bg-red-400";
}
function shortLabel(label: string) {
  return label.replace(" Compliance", "").replace(" Metrics", "");
}

// ── Sparkline SVG ──────────────────────────────────────────────────────────
function Sparkline({
  data,
  color = "#8b5cf6",
  width = 140,
  height = 48,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const pad = 4;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * innerW;
    const y = pad + innerH - (v / 100) * innerH;
    return [x, y] as [number, number];
  });

  const polyPoints = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const areaPoints = [
    `${pts[0][0]},${height - pad}`,
    ...pts.map(([x, y]) => `${x},${y}`),
    `${pts[pts.length - 1][0]},${height - pad}`,
  ].join(" ");

  const last = pts[pts.length - 1];
  const gradId = `sg-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline
        points={polyPoints}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r={3} fill={color} />
    </svg>
  );
}

// ── Trend icon ─────────────────────────────────────────────────────────────
function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-green-500" />;
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

// ── Per-site real stats from localStorage ──────────────────────────────────
interface SiteRealStats {
  siteId: string;
  completedCount: number;
  todayAvg: number;
  catPcts: Record<TaskCategory, number>;
}

function computeSiteRealStats(siteId: string): SiteRealStats {
  const completions = loadCompletions(siteId, "daily");
  const catPcts = {} as Record<TaskCategory, number>;
  for (const cat of TREND_CATEGORIES) {
    const catTasks = DAILY_TASKS.filter((t) => t.category === cat);
    const done = catTasks.filter((t) => completions.has(t.id)).length;
    catPcts[cat] = catTasks.length > 0 ? Math.round((done / catTasks.length) * 100) : 0;
  }
  const todayAvg = Math.round(
    TREND_CATEGORIES.reduce((s, cat) => s + catPcts[cat], 0) / TREND_CATEGORIES.length
  );
  return { siteId, completedCount: completions.size, todayAvg, catPcts };
}

// ── Site card ──────────────────────────────────────────────────────────────
// Clicking navigates to the full Task Manager for that site in read-only mode
function SiteCard({
  trend,
  realStats,
  onDrillDown,
}: {
  trend: SiteTrend;
  realStats: SiteRealStats;
  onDrillDown: (siteId: string) => void;
}) {
  const site = SITES.find((s) => s.id === trend.siteId);
  const orderedCats: TaskCategory[] = ["achc", "state_board", "retention", "operations"];

  const todayPct = realStats.todayAvg;

  const overallTrend: "up" | "down" | "stable" =
    trend.overallAvg >= todayPct + 5
      ? "down"
      : trend.overallAvg <= todayPct - 5
      ? "up"
      : "stable";

  return (
    <button
      data-testid={`site-card-${trend.siteId}`}
      className="w-full text-left bg-white border border-slate-200 rounded-md overflow-hidden hover:shadow-md transition-shadow group"
      onClick={() => onDrillDown(trend.siteId)}
    >
      {/* Card header */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <p className="text-sm font-bold text-slate-800 truncate">{trend.siteName}</p>
          </div>
          <p className="text-xs text-slate-400 pl-4">{site?.region}</p>
        </div>

        <div className="text-right shrink-0">
          <p className={`text-2xl font-bold ${completionTextColor(todayPct)}`}>{todayPct}%</p>
          <p className="text-[10px] text-slate-400">Today</p>
        </div>
      </div>

      {/* Per-category: today (real) + 7d avg (simulated trend) mini-bars */}
      <div className="px-5 pb-3 grid grid-cols-2 gap-x-5 gap-y-3">
        {orderedCats.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const todayPctCat = realStats.catPcts[cat];
          const weekAvgCat = trend.categories[cat].avg7d;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-slate-500">
                  {shortLabel(cfg.label)}
                </span>
                <TrendIcon trend={trend.categories[cat].trend} />
              </div>
              {/* Today bar */}
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] text-slate-400 w-7 shrink-0">Today</span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${completionBarColor(todayPctCat)}`}
                    style={{ width: `${todayPctCat}%` }}
                  />
                </div>
                <span className={`text-[9px] font-bold w-6 text-right ${completionTextColor(todayPctCat)}`}>
                  {todayPctCat}%
                </span>
              </div>
              {/* 7-day avg bar */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-slate-400 w-7 shrink-0">7d</span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 opacity-50 ${completionBarColor(weekAvgCat)}`}
                    style={{ width: `${weekAvgCat}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 w-6 text-right font-medium">
                  {weekAvgCat}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 7d overview + drill-down hint */}
      <div className="px-5 pb-3.5 flex items-center justify-between">
        <span className="text-[10px] text-slate-400">
          7d avg: <span className="font-semibold text-slate-600">{trend.overallAvg}%</span>
          {" · "}
          <TrendIcon trend={overallTrend} />
        </span>
        <span className="text-xs font-semibold text-purple-600 flex items-center gap-1 group-hover:gap-1.5 transition-all">
          <Eye className="w-3 h-3" />
          View tasks
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
}

// ── Store Directory ─────────────────────────────────────────────────────────
function StoreDirectorySection({ onDrillDown }: { onDrillDown: (id: string) => void }) {
  const [openRegions, setOpenRegions] = useState<Set<string>>(() => new Set(["Western Region"]));

  const toggleRegion = (region: string) => {
    setOpenRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };

  return (
    <section>
      <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
        <Store className="w-4 h-4 text-purple-600" />
        Store Directory
        <span className="text-xs font-normal text-slate-400 ml-1">
          — All locations organized by region
        </span>
      </h2>
      <div className="space-y-2">
        {STORE_REGIONS.map((reg) => {
          const isOpen = openRegions.has(reg.region);
          return (
            <div
              key={reg.region}
              className="bg-white border border-slate-200 rounded-md overflow-hidden"
            >
              {/* Region header */}
              <button
                data-testid={`region-toggle-${reg.shortName}`}
                onClick={() => toggleRegion(reg.region)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover-elevate"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${reg.dotColor} shrink-0`} />
                  <span className={`text-sm font-bold ${reg.color}`}>{reg.region}</span>
                  <span className="text-xs text-slate-400 font-medium">
                    {reg.stores.length} {reg.stores.length === 1 ? "location" : "locations"}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Store grid */}
              {isOpen && (
                <div className="px-5 pb-4 pt-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {reg.stores.map((store) => (
                      <button
                        key={store.id}
                        data-testid={`store-card-${store.id}`}
                        onClick={() => onDrillDown(store.id)}
                        className="text-left px-3 py-2.5 border border-slate-100 rounded-md hover-elevate group"
                      >
                        <p className="text-xs font-semibold text-slate-700 leading-snug group-hover:text-purple-700 transition-colors">
                          {store.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">#{store.id}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function RegionalDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<TrendPeriod>("7d");

  if (!user) return null;

  // ── Real per-site stats: load from localStorage for every site ──────────
  const siteRealStats: SiteRealStats[] = SITES.map((s) => computeSiteRealStats(s.id));
  const realStatsBySite = new Map(siteRealStats.map((ss) => [ss.siteId, ss]));

  // ── 7-day trends for site cards (always 7d) ─────────────────────────────
  const allTrends = getAllSiteTrends();
  // ── Period-aware trends for category sparklines ──────────────────────────
  const periodTrends = getAllSiteTrendsForPeriod(period);
  const troubleSpotTasks = getTroubleSpotTasks(10);

  // ── Aggregate stats — all derived from real localStorage data ──────────
  const totalCompletedToday = siteRealStats.reduce((s, ss) => s + ss.completedCount, 0);
  const totalPossibleToday = DAILY_TASK_COUNT * SITES.length;
  const todayAvgAllSites = Math.round(
    siteRealStats.reduce((s, ss) => s + ss.todayAvg, 0) / SITES.length
  );
  // 7-day compliance uses simulated trend avg (real historical data is not persisted)
  const avgCompliance = Math.round(
    allTrends.reduce((s, t) => s + t.overallAvg, 0) / allTrends.length
  );

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleDrillDown = (siteId: string) => {
    navigate(`/app/tasks?siteId=${siteId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-5 h-5 text-purple-600" />
                <h1 className="text-2xl font-bold text-slate-900">Regional Dashboard</h1>
              </div>
              <p className="text-sm text-slate-400">
                Southern + Northern California · {today}
              </p>
            </div>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full text-white whitespace-nowrap"
              style={{ background: "linear-gradient(90deg,#3b82f6,#9333ea)" }}
            >
              Regional Director
            </span>
          </div>

          {/* Aggregate stat tiles */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div
              data-testid="stat-tasks-completed"
              className="bg-slate-50 border border-slate-100 rounded-md px-4 py-3"
            >
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                Tasks Completed Today
              </p>
              <p className="text-3xl font-bold text-slate-900">{totalCompletedToday}</p>
              <p className="text-xs text-slate-400 mt-0.5">of {totalPossibleToday} across all sites</p>
            </div>
            <div
              data-testid="stat-today"
              className="bg-slate-50 border border-slate-100 rounded-md px-4 py-3"
            >
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                Today's Rate
              </p>
              <p className={`text-3xl font-bold ${completionTextColor(todayAvgAllSites)}`}>
                {todayAvgAllSites}%
              </p>
              <p className="text-xs text-slate-400 mt-0.5">avg across {SITES.length} sites</p>
            </div>
            <div
              data-testid="stat-compliance"
              className="bg-slate-50 border border-slate-100 rounded-md px-4 py-3"
            >
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                7-Day Compliance
              </p>
              <p className={`text-3xl font-bold ${completionTextColor(avgCompliance)}`}>
                {avgCompliance}%
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{SITES.length} sites monitored</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* ── Site cards ──────────────────────────────────────────────── */}
        <section>
          <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-600" />
            Site Breakdown
            <span className="text-xs font-normal text-slate-400 ml-1">
              — Click a site to open its full task list
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {allTrends.map((trend) => (
              <SiteCard
                key={trend.siteId}
                trend={trend}
                realStats={realStatsBySite.get(trend.siteId)!}
                onDrillDown={handleDrillDown}
              />
            ))}
          </div>
        </section>

        {/* ── Regional trend sparklines ────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              Category Trends
              <span className="text-xs font-normal text-slate-400 ml-1">
                — Click any category to see all-site rankings
              </span>
            </h2>
            {/* Period selector */}
            <div className="flex gap-1">
              {(["7d", "30d", "6m", "1y"] as TrendPeriod[]).map((p) => (
                <button
                  key={p}
                  data-testid={`period-btn-${p}`}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${
                    period === p
                      ? "border-purple-400 bg-purple-50 text-purple-700"
                      : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                  }`}
                >
                  {PERIOD_CONFIG[p].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TREND_CATEGORIES.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const days = getAverageCategoryPointsForPeriod(cat, periodTrends);
              const avg = Math.round(days.reduce((s, v) => s + v, 0) / days.length);
              const latestVal = days[days.length - 1];
              const n = days.length;
              const third = Math.max(1, Math.floor(n / 3));
              const earlyAvg = days.slice(0, third).reduce((s, v) => s + v, 0) / third;
              const lateAvg = days.slice(-third).reduce((s, v) => s + v, 0) / third;
              const diff = lateAvg - earlyAvg;
              const trend: "up" | "down" | "stable" =
                diff > 6 ? "up" : diff < -6 ? "down" : "stable";

              return (
                <button
                  key={cat}
                  data-testid={`trend-card-${cat}`}
                  onClick={() => navigate(`/app/category-report?cat=${cat}&period=${period}`)}
                  className="bg-white border border-slate-200 rounded-md px-4 py-4 text-left hover:shadow-md hover:border-purple-200 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>
                      {shortLabel(cfg.label)}
                    </span>
                    <TrendIcon trend={trend} />
                  </div>
                  <div className="flex items-end gap-1.5 mb-2">
                    <span className="text-2xl font-bold text-slate-800">{avg}%</span>
                    <span className="text-xs text-slate-400 mb-0.5">{PERIOD_CONFIG[period].label} avg</span>
                  </div>
                  <Sparkline
                    data={days}
                    color={SPARKLINE_COLORS[cat]}
                    width={128}
                    height={44}
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[10px] text-slate-400">
                      Latest:{" "}
                      <span className={`font-semibold ${completionTextColor(latestVal)}`}>
                        {latestVal}%
                      </span>
                    </p>
                    <span className="text-[10px] font-semibold text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      View all sites →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Store Directory ─────────────────────────────────────────── */}
        <StoreDirectorySection onDrillDown={handleDrillDown} />

        {/* ── Task-level Trouble Spots ─────────────────────────────────── */}
        <section>
          <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Trouble Spots
            <span className="text-xs font-normal text-slate-400 ml-1">
              — Individual tasks below 50% completion over 7 days (cross-site)
            </span>
          </h2>
          <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-100">
            {troubleSpotTasks.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-slate-400">
                No tasks below 50% completion threshold — all tasks performing above benchmark.
              </div>
            ) : (
              troubleSpotTasks.map((spot) => {
                const cfg = CATEGORY_CONFIG[spot.task.category];
                const isCritical = spot.avgCompletionPct < 30;
                return (
                  <div
                    key={spot.task.id}
                    data-testid={`trouble-spot-task-${spot.task.id}`}
                    className="flex items-start gap-4 px-5 py-3.5 flex-wrap"
                  >
                    {/* Task + category */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 leading-snug truncate">
                        {spot.task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Worst: {spot.worstSiteName}
                        </span>
                      </div>
                    </div>

                    {/* Per-site breakdown */}
                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                      {spot.siteBreakdown.map((sb) => (
                        <span key={sb.siteId} className="text-[11px] text-slate-500">
                          {sb.siteName.replace("Site ", "")}:{" "}
                          <span className={`font-bold ${completionTextColor(sb.avg7d)}`}>
                            {sb.avg7d}%
                          </span>
                        </span>
                      ))}
                    </div>

                    {/* Avg badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-sm font-bold ${
                          isCritical ? "text-red-600" : "text-amber-600"
                        }`}
                      >
                        {spot.avgCompletionPct}% avg
                      </span>
                      {isCritical && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-50 text-red-600 whitespace-nowrap">
                          Critical
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
