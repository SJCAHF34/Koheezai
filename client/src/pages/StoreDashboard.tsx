import { useState, useMemo } from "react";
import { useParams, useLocation, Redirect } from "wouter";
import { useAuth } from "@/App";
import {
  getUserProfile,
  isCPO,
  isRegionalOrAbove,
  isPharmacyDirector,
  getAssignedRegion,
} from "@/lib/userProfile";
import { TASKS, CATEGORY_CONFIG, type TaskCategory, type TaskRole } from "@/lib/taskData";
import { loadCompletions, loadCountersForSite, getTodayDateKey } from "@/lib/taskStorage";
import {
  generateSiteTrendsForPeriod,
  TREND_CATEGORIES,
  SPARKLINE_COLORS,
  PERIOD_CONFIG,
  type TrendPeriod,
  type SiteTrend,
} from "@/lib/trendData";
import { findStore, findStoreRegion } from "@/lib/storeDirectory";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft,
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Check,
  ClipboardList,
  Activity,
  ArrowUpRight,
} from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────────

function tierLabel(pct: number) {
  if (pct >= 80)
    return { label: "Top", bg: "bg-green-50 text-green-700 border-green-200" };
  if (pct >= 65)
    return { label: "Good", bg: "bg-amber-50 text-amber-700 border-amber-200" };
  if (pct >= 50)
    return { label: "At Risk", bg: "bg-orange-50 text-orange-700 border-orange-200" };
  return { label: "Critical", bg: "bg-red-50 text-red-600 border-red-200" };
}

function frequencyLabel(freq: string) {
  if (freq === "daily") return "Daily";
  if (freq === "weekly") return "Weekly";
  if (freq === "monthly") return "Monthly";
  if (freq === "quarterly") return "Quarterly";
  return freq;
}

// ── SVG Sparkline ────────────────────────────────────────────────────────────

function Sparkline({
  data,
  color = "#8b5cf6",
  width = 120,
  height = 40,
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

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-green-500" />;
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

// ── Constants ────────────────────────────────────────────────────────────────

const DAILY_TASKS = TASKS.filter((t) => t.frequency === "daily");
const PERIOD_TABS: TrendPeriod[] = ["7d", "30d", "6m", "1y"];
const CAT_ORDER: TaskCategory[] = ["achc", "state_board", "operations", "retention"];

// ── Main page ────────────────────────────────────────────────────────────────

export default function StoreDashboard() {
  // ── All hooks must be called unconditionally at the top ──────────────────
  const { user } = useAuth();
  const rawParams = useParams<{ siteId: string }>();
  const siteId = rawParams.siteId ?? "";
  const [, navigate] = useLocation();
  const [activeCat, setActiveCat] = useState<TaskCategory | null>(null);
  const [chartPeriod, setChartPeriod] = useState<TrendPeriod>("7d");
  const [rawDataOpen, setRawDataOpen] = useState(false);
  const [rawFilter, setRawFilter] = useState<"all" | "done" | "pending">("all");

  const store = findStore(siteId);
  const storeRegion = findStoreRegion(siteId);

  // KPI / category metrics are always computed from the fixed 7-day window
  // regardless of which period tab is selected in the chart
  const trend7d: SiteTrend = useMemo(
    () =>
      generateSiteTrendsForPeriod(
        siteId,
        store?.name ?? siteId,
        storeRegion?.region ?? "",
        "7d"
      ),
    [siteId, store?.name, storeRegion?.region]
  );

  // Chart data uses the selected period
  const trendChart: SiteTrend = useMemo(
    () =>
      generateSiteTrendsForPeriod(
        siteId,
        store?.name ?? siteId,
        storeRegion?.region ?? "",
        chartPeriod
      ),
    [siteId, store?.name, storeRegion?.region, chartPeriod]
  );

  // ── Derived values (safe after hooks) ───────────────────────────────────
  const profile = user ? getUserProfile(user.email, user.name ?? "") : null;

  // Access-control decision
  let redirectTo: string | null = null;
  if (!user || !profile) {
    redirectTo = "/login";
  } else if (!store) {
    redirectTo = isRegionalOrAbove(profile.role) ? "/app/tasks/regional" : "/app";
  } else if (isCPO(profile.role)) {
    redirectTo = `/app/tasks?siteId=${siteId}`;
  } else if (profile.role === "regional_pharmacy_director") {
    const assignedRegion = getAssignedRegion(profile);
    if (assignedRegion && storeRegion?.region !== assignedRegion) {
      redirectTo = "/app/tasks/regional";
    } else {
      redirectTo = `/app/tasks?siteId=${siteId}`;
    }
  } else if (isPharmacyDirector(profile.role)) {
    // Pharmacy directors no longer have access to store stats
    redirectTo = "/app";
  } else {
    // Tech / pharmacist roles have no access
    redirectTo = "/app/tasks";
  }

  // ── Early redirect (after all hooks) ────────────────────────────────────
  if (redirectTo) {
    return <Redirect to={redirectTo} />;
  }

  // At this point user, profile, and store are guaranteed non-null
  const safeProfile = profile!;
  const safeStore = store!;

  // ── Live task completions ────────────────────────────────────────────────
  const completions = loadCompletions(siteId, "daily");
  const dailyTasks = DAILY_TASKS;
  const completedCount = completions.size;
  const totalCount = dailyTasks.length;

  // Per-category today's stats (live)
  const catStats: Record<TaskCategory, { done: number; total: number; pct: number }> =
    {} as Record<TaskCategory, { done: number; total: number; pct: number }>;
  for (const cat of TREND_CATEGORIES) {
    const catTasks = dailyTasks.filter((t) => t.category === cat);
    const done = catTasks.filter((t) => completions.has(t.id)).length;
    catStats[cat] = {
      done,
      total: catTasks.length,
      pct: catTasks.length > 0 ? Math.round((done / catTasks.length) * 100) : 0,
    };
  }
  // KPI 7-day average — always from fixed 7d trend
  const avg7d = trend7d.overallAvg;
  const tier = tierLabel(avg7d);

  // Chart data for expanded area chart (uses chart period)
  const chartData = activeCat
    ? trendChart.categories[activeCat].days.map((d) => ({ name: d.label, value: d.pct }))
    : [];

  // Filtered raw task list
  const filteredTasks = DAILY_TASKS.filter((t) => {
    if (rawFilter === "done") return completions.has(t.id);
    if (rawFilter === "pending") return !completions.has(t.id);
    return true;
  });

  const doneTodayCount = dailyTasks.filter((t) => completions.has(t.id)).length;
  const pendingCount = totalCount - doneTodayCount;

  // ── Operations productivity (counter tasks) ──────────────────────────────
  const todayKey = getTodayDateKey();
  const counterEntries = loadCountersForSite(siteId, todayKey);
  const counterMap = new Map(counterEntries.map((e) => [e.taskId, e]));

  // Build per-task productivity rows from all tasks that have a counterType
  interface ProdRow {
    taskId: string;
    title: string;
    role: TaskRole;
    counterType: "start-end" | "end-only";
    start: number | undefined;
    end: number | undefined;
    delta: number;
    isComplete: boolean;
  }

  const prodTasks = TASKS.filter((t) => t.counterType && t.frequency === "daily");
  const prodRows: ProdRow[] = prodTasks.map((t) => {
    const entry = counterMap.get(t.id);
    const start = entry?.start;
    const end = entry?.end;
    // For start-end tasks: delta = start - end (positive = cleared queue, negative = backlog grew)
    // For end-only tasks: no meaningful delta
    const delta =
      t.counterType === "start-end" && start !== undefined && end !== undefined
        ? start - end
        : 0;
    return {
      taskId: t.id,
      title: t.title,
      role: t.role as TaskRole,
      counterType: t.counterType!,
      start,
      end,
      delta,
      isComplete: completions.has(t.id),
    };
  });

  // Group by role
  const ROLE_LABELS: Partial<Record<TaskRole, string>> = {
    data_entry_tech: "Data Entry Tech",
    pv2_tech: "PV2 Tech",
    delivery_tech: "Delivery Tech",
    pharmacist_1: "Pharmacist 1",
  };
  type ProdRole = "data_entry_tech" | "pv2_tech" | "delivery_tech" | "pharmacist_1";
  const PROD_ROLE_ORDER: ProdRole[] = ["data_entry_tech", "pv2_tech", "delivery_tech", "pharmacist_1"];

  const prodByRole: Record<string, ProdRow[]> = {};
  for (const row of prodRows) {
    const key = row.role;
    if (!prodByRole[key]) prodByRole[key] = [];
    prodByRole[key].push(row);
  }

  const totalItemsProcessed = prodRows.reduce((sum, r) => sum + r.delta, 0);
  const tasksWithData = prodRows.filter((r) => r.end !== undefined).length;
  const tasksEnteredCount = prodRows.filter((r) => r.start !== undefined || r.end !== undefined).length;

  const backHref = isCPO(safeProfile.role)
    ? "/app/tasks/national"
    : safeProfile.role === "regional_pharmacy_director"
    ? "/app/tasks/regional"
    : "/app";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Back */}
          <button
            data-testid="btn-back-store"
            onClick={() => navigate(backHref)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-purple-600 mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {isCPO(safeProfile.role)
              ? "Back to National Dashboard"
              : safeProfile.role === "regional_pharmacy_director"
              ? "Back to Regional Dashboard"
              : "Back to Dashboard"}
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                <h1 className="text-2xl font-bold text-slate-900">{safeStore.name}</h1>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200">
                  #{siteId}
                </span>
                {storeRegion && (
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 ${storeRegion.color}`}
                  >
                    {storeRegion.region}
                  </span>
                )}
                <span className="text-xs text-slate-400">{today}</span>
              </div>
            </div>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full text-white whitespace-nowrap shrink-0"
              style={{ background: "linear-gradient(90deg,#3b82f6,#9333ea)" }}
            >
              Pharmacy Director
            </span>
          </div>

          {/* ── KPI tiles ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div
              data-testid="kpi-tasks"
              className="bg-slate-50 border border-slate-100 rounded-md px-4 py-3"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                Tasks Today
              </p>
              <p className="text-3xl font-bold text-slate-900">{completedCount}</p>
              <p className="text-xs text-slate-400 mt-0.5">of {totalCount} tasks done</p>
            </div>
            <div
              data-testid="kpi-tier"
              className="bg-slate-50 border border-slate-100 rounded-md px-4 py-3"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                Compliance Tier
              </p>
              <span
                className={`inline-block mt-1 text-xs font-bold px-2.5 py-1 rounded-full border ${tier.bg}`}
              >
                {tier.label}
              </span>
              <p className="text-xs text-slate-400 mt-1.5">based on 7d avg</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* ── Category performance ─────────────────────────────────────── */}
        <section>
          <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            Category Performance
            <span className="text-xs font-normal text-slate-400 ml-1">
              — Click any card to see the trend chart
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CAT_ORDER.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const color = SPARKLINE_COLORS[cat];
              // Sparkline and "7d avg" always from the fixed 7d trend
              const catTrend7d = trend7d.categories[cat];
              const sparkData = catTrend7d.days.map((d) => d.pct);
              const stat = catStats[cat];
              const isActive = activeCat === cat;

              return (
                <button
                  key={cat}
                  data-testid={`cat-card-${cat}`}
                  onClick={() => setActiveCat(isActive ? null : cat)}
                  className={`text-left bg-white border rounded-md p-4 transition-all ${
                    isActive
                      ? "border-purple-400 ring-1 ring-purple-100 shadow-sm"
                      : "border-slate-200 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-500 truncate pr-2">
                      {cfg.label}
                    </p>
                    <TrendIcon trend={catTrend7d.trend} />
                  </div>
                  <div className="flex items-end gap-1.5 mb-1">
                    <p className="text-2xl font-bold text-slate-800">
                      {stat.done}/{stat.total}
                    </p>
                    <p className="text-[10px] text-slate-400 mb-1">tasks done today</p>
                  </div>
                  <Sparkline data={sparkData} color={color} width={120} height={38} />
                  <div className="flex items-center justify-end mt-1">
                    {isActive && (
                      <p className="text-[10px] font-semibold text-purple-600">Expanded</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Expanded trend chart ──────────────────────────────────── */}
          {activeCat && (
            <div
              data-testid="expanded-trend-chart"
              className="mt-3 bg-white border border-purple-200 rounded-md p-5"
            >
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {CATEGORY_CONFIG[activeCat].label} — Performance Trend
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {safeStore.name} · {PERIOD_CONFIG[chartPeriod].label}
                  </p>
                </div>
                <div className="flex gap-1">
                  {PERIOD_TABS.map((p) => (
                    <button
                      key={p}
                      data-testid={`period-tab-${p}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setChartPeriod(p);
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${
                        chartPeriod === p
                          ? "border-purple-400 bg-purple-50 text-purple-700"
                          : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                      }`}
                    >
                      {PERIOD_CONFIG[p].label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id={`chart-grad-${activeCat}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={SPARKLINE_COLORS[activeCat]}
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="95%"
                        stopColor={SPARKLINE_COLORS[activeCat]}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis domain={[0, 100]} hide />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={SPARKLINE_COLORS[activeCat]}
                    strokeWidth={2}
                    fill={`url(#chart-grad-${activeCat})`}
                    dot={false}
                    activeDot={{ r: 4, fill: SPARKLINE_COLORS[activeCat] }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* ── Overall progress bar ─────────────────────────────────────── */}
        <section className="bg-white border border-slate-200 rounded-md p-5">
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <div>
              <p className="text-sm font-bold text-slate-800">Overall Daily Progress</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {doneTodayCount} of {totalCount} tasks completed today
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-800">
                {doneTodayCount}/{totalCount}
              </p>
              <p className="text-[10px] text-slate-400">tasks completed</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {TREND_CATEGORIES.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const stat = catStats[cat];
              return (
                <div key={cat} className={`rounded-md px-3 py-2 ${cfg.bg}`}>
                  <p
                    className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${cfg.color}`}
                  >
                    {cfg.label.replace(" Compliance", "").replace(" Metrics", "")}
                  </p>
                  <p className="text-lg font-bold text-slate-800">
                    {stat.done}/{stat.total}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">tasks done</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Operations Productivity ──────────────────────────────────── */}
        <section>
          <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            Operations Productivity
            <span className="text-xs font-normal text-slate-400 ml-1">
              — Start · End · Delta by task
            </span>
          </h2>

          {/* Summary KPI strip */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-white border border-slate-200 rounded-md px-4 py-3" data-testid="ops-prod-total">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                Total Items Processed
              </p>
              <p className="text-2xl font-bold text-slate-900">{totalItemsProcessed}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">sum of all deltas today</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-md px-4 py-3" data-testid="ops-prod-entered">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                Tasks with Data
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {tasksEnteredCount}
                <span className="text-base font-normal text-slate-400">/{prodRows.length}</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">counts entered</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-md px-4 py-3" data-testid="ops-prod-complete">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                Counter Tasks Done
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {prodRows.filter((r) => r.isComplete).length}
                <span className="text-base font-normal text-slate-400">/{prodRows.length}</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">marked complete</p>
            </div>
          </div>

          {/* Per-role breakdown */}
          <div className="space-y-3">
            {PROD_ROLE_ORDER.filter((r) => prodByRole[r]?.length).map((roleKey) => {
              const rows = prodByRole[roleKey];
              const roleTotal = rows.reduce((s, r) => s + r.delta, 0);
              const roleDone = rows.filter((r) => r.isComplete).length;
              return (
                <div
                  key={roleKey}
                  className="bg-white border border-slate-200 rounded-md overflow-hidden"
                  data-testid={`ops-role-group-${roleKey}`}
                >
                  {/* Role header */}
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-700">{ROLE_LABELS[roleKey]}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-semibold text-slate-500">
                        {roleDone}/{rows.length} done
                      </span>
                      {roleTotal > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          <TrendingDown className="w-3 h-3" />
                          {roleTotal} cleared
                        </span>
                      ) : roleTotal < 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          <TrendingUp className="w-3 h-3" />
                          {Math.abs(roleTotal)} added
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Task rows */}
                  <div>
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_64px_64px_64px_80px] gap-2 px-4 py-1.5 border-b border-slate-50">
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Task</span>
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide text-center">Start</span>
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide text-center">End</span>
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide text-center">Delta</span>
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide text-right">Status</span>
                    </div>
                    {rows.map((row) => {
                      const hasStart = row.start !== undefined;
                      const hasEnd = row.end !== undefined;
                      const deltaColor =
                        row.delta > 0
                          ? "text-green-600 font-bold"
                          : row.delta < 0
                          ? "text-red-500 font-bold"
                          : hasEnd
                          ? "text-slate-400"
                          : "text-slate-300";
                      return (
                        <div
                          key={row.taskId}
                          data-testid={`ops-prod-row-${row.taskId}`}
                          className="grid grid-cols-[1fr_64px_64px_64px_80px] gap-2 px-4 py-2.5 border-b border-slate-50 last:border-0 items-center"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{row.title}</p>
                            {row.counterType === "end-only" && (
                              <p className="text-[10px] text-slate-400 mt-0.5">End count only</p>
                            )}
                          </div>

                          {/* Start */}
                          <div className="text-center">
                            {row.counterType === "end-only" ? (
                              <span className="text-[10px] text-slate-300">—</span>
                            ) : hasStart ? (
                              <span className="text-sm font-semibold text-slate-700">{row.start}</span>
                            ) : (
                              <span className="text-[10px] text-slate-300">—</span>
                            )}
                          </div>

                          {/* End */}
                          <div className="text-center">
                            {hasEnd ? (
                              <span className="text-sm font-semibold text-slate-700">{row.end}</span>
                            ) : (
                              <span className="text-[10px] text-slate-300">—</span>
                            )}
                          </div>

                          {/* Delta */}
                          <div className="text-center">
                            {hasEnd ? (
                              <span className={`text-sm ${deltaColor}`}>
                                {row.delta !== 0 ? row.delta : "0"}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-300">—</span>
                            )}
                          </div>

                          {/* Status */}
                          <div className="flex justify-end">
                            {row.isComplete ? (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 whitespace-nowrap">
                                <Check className="w-3 h-3" />
                                Done
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200 whitespace-nowrap">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {prodRows.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-md px-6 py-8 text-center text-sm text-slate-400">
              No productivity counter tasks configured.
            </div>
          )}
        </section>

        {/* ── Raw task data ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <button
              data-testid="btn-toggle-raw-data"
              onClick={() => setRawDataOpen((o) => !o)}
              className="flex items-center gap-2 text-left"
            >
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-purple-600" />
                Raw Task Data
                <span className="text-xs font-normal text-slate-400">
                  — {doneTodayCount} done · {pendingCount} pending
                </span>
              </h2>
              {rawDataOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {rawDataOpen && (
              <div className="flex gap-1">
                {(["all", "done", "pending"] as const).map((f) => (
                  <button
                    key={f}
                    data-testid={`raw-filter-${f}`}
                    onClick={() => setRawFilter(f)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${
                      rawFilter === f
                        ? "border-purple-400 bg-purple-50 text-purple-700"
                        : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {f === "all" && ` (${DAILY_TASKS.length})`}
                    {f === "done" && ` (${doneTodayCount})`}
                    {f === "pending" && ` (${pendingCount})`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {rawDataOpen && (
            <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Task
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Category
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Frequency
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Role
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide text-right">
                  Status
                </span>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-400">
                  No tasks match this filter.
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const isDone = completions.has(task.id);
                  const cfg = CATEGORY_CONFIG[task.category];
                  return (
                    <div
                      key={task.id}
                      data-testid={`raw-task-${task.id}`}
                      className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-3 border-b border-slate-50 last:border-0 items-center hover-elevate"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {task.title}
                        </p>
                        {task.taskGroup && task.taskGroup !== task.title && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {task.taskGroup}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.badge}`}
                      >
                        {cfg.label.replace(" Compliance", "").replace(" Metrics", "")}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap capitalize">
                        {frequencyLabel(task.frequency)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap capitalize hidden sm:block">
                        {task.role.replace(/_/g, " ")}
                      </span>
                      <div className="flex justify-end">
                        {isDone ? (
                          <span
                            data-testid={`status-done-${task.id}`}
                            className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 whitespace-nowrap"
                          >
                            <Check className="w-3 h-3" />
                            Done
                          </span>
                        ) : (
                          <span
                            data-testid={`status-pending-${task.id}`}
                            className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200 whitespace-nowrap"
                          >
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
