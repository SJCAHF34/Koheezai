import { useLocation } from "wouter";
import { useAuth } from "@/App";
import { getUserProfile } from "@/lib/userProfile";
import { SITES, TASKS, CATEGORY_CONFIG, type TaskCategory } from "@/lib/taskData";
import { loadCompletions } from "@/lib/taskStorage";
import {
  getAllSiteTrends,
  getTroubleSpotTasks,
  getAverageCategoryDays,
  TREND_CATEGORIES,
  SPARKLINE_COLORS,
  type SiteTrend,
  type CategoryTrend,
} from "@/lib/trendData";
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

// ── Site card ──────────────────────────────────────────────────────────────
// Clicking navigates to the full Task Manager for that site in read-only mode
function SiteCard({
  trend,
  realTodayPctByCategory,
  realTodayAvg,
  onDrillDown,
}: {
  trend: SiteTrend;
  realTodayPctByCategory?: Partial<Record<TaskCategory, number>>;
  realTodayAvg?: number;
  onDrillDown: (siteId: string) => void;
}) {
  const site = SITES.find((s) => s.id === trend.siteId);
  const orderedCats: TaskCategory[] = ["achc", "state_board", "retention", "operations"];

  // Use real data if provided, else fall back to simulated
  const todayPct = realTodayAvg ?? trend.todayAvg;

  // Category today %: real override or simulated
  const getCatPct = (cat: TaskCategory) =>
    realTodayPctByCategory?.[cat] ?? trend.categories[cat].days[6].pct;

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

      {/* Per-category: today + 7d avg mini-bars */}
      <div className="px-5 pb-3 grid grid-cols-2 gap-x-5 gap-y-3">
        {orderedCats.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const todayPctCat = getCatPct(cat);
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

// ── Main page ──────────────────────────────────────────────────────────────
export default function RegionalDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user) return null;

  // ── Real completion data for Site 1417 (today, daily tasks) ──
  const site1417Completions = loadCompletions("1417", "daily");

  // Per-category real pct for Site 1417 today
  const realCatPcts: Partial<Record<TaskCategory, number>> = {};
  let realTodayTotal = 0;
  for (const cat of TREND_CATEGORIES) {
    const catTasks = DAILY_TASKS.filter((t) => t.category === cat);
    const done = catTasks.filter((t) => site1417Completions.has(t.id)).length;
    realCatPcts[cat] = catTasks.length > 0 ? Math.round((done / catTasks.length) * 100) : 0;
    realTodayTotal += realCatPcts[cat]!;
  }
  const realTodayAvg1417 = Math.round(realTodayTotal / TREND_CATEGORIES.length);

  // ── Simulated site trends ──
  const allTrends = getAllSiteTrends();
  const troubleSpotTasks = getTroubleSpotTasks(10);

  // ── Aggregate stats ──
  // Tasks completed today: real count for 1417, simulated for 1842 & 2031
  const real1417Count = site1417Completions.size;
  const sim1842Count = Math.round(
    (allTrends.find((t) => t.siteId === "1842")?.todayAvg ?? 0) / 100 * DAILY_TASK_COUNT
  );
  const sim2031Count = Math.round(
    (allTrends.find((t) => t.siteId === "2031")?.todayAvg ?? 0) / 100 * DAILY_TASK_COUNT
  );
  const totalCompletedToday = real1417Count + sim1842Count + sim2031Count;
  const totalPossibleToday = DAILY_TASK_COUNT * SITES.length;

  const avgCompliance = Math.round(
    allTrends.reduce((s, t) => s + t.overallAvg, 0) / allTrends.length
  );
  const todayAvgAllSites = Math.round(
    [realTodayAvg1417,
      allTrends.find((t) => t.siteId === "1842")?.todayAvg ?? 0,
      allTrends.find((t) => t.siteId === "2031")?.todayAvg ?? 0,
    ].reduce((s, v) => s + v, 0) / SITES.length
  );

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleDrillDown = (siteId: string) => {
    navigate(`/app/tasks?siteId=${siteId}&readOnly=true`);
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
              — Click a site to open its full task list in read-only mode
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {allTrends.map((trend) => (
              <SiteCard
                key={trend.siteId}
                trend={trend}
                realTodayPctByCategory={trend.siteId === "1417" ? realCatPcts : undefined}
                realTodayAvg={trend.siteId === "1417" ? realTodayAvg1417 : undefined}
                onDrillDown={handleDrillDown}
              />
            ))}
          </div>
        </section>

        {/* ── Regional trend sparklines ────────────────────────────────── */}
        <section>
          <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            7-Day Category Trends
            <span className="text-xs font-normal text-slate-400 ml-1">
              — Cross-site simulated averages
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TREND_CATEGORIES.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const days = getAverageCategoryDays(cat, allTrends);
              const avg = Math.round(days.reduce((s, v) => s + v, 0) / days.length);
              const todayVal = days[6];
              const diff = days[6] - days[4];
              const trend: "up" | "down" | "stable" =
                diff > 6 ? "up" : diff < -6 ? "down" : "stable";

              return (
                <div
                  key={cat}
                  data-testid={`trend-card-${cat}`}
                  className="bg-white border border-slate-200 rounded-md px-4 py-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>
                      {shortLabel(cfg.label)}
                    </span>
                    <TrendIcon trend={trend} />
                  </div>
                  <div className="flex items-end gap-1.5 mb-2">
                    <span className="text-2xl font-bold text-slate-800">{avg}%</span>
                    <span className="text-xs text-slate-400 mb-0.5">7d avg</span>
                  </div>
                  <Sparkline
                    data={days}
                    color={SPARKLINE_COLORS[cat]}
                    width={128}
                    height={44}
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Today:{" "}
                    <span className={`font-semibold ${completionTextColor(todayVal)}`}>
                      {todayVal}%
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </section>

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
