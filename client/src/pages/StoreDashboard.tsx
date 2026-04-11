import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/App";
import {
  getUserProfile,
  isCPO,
  isRegionalOrAbove,
  getAssignedRegion,
  getRoleLabel,
} from "@/lib/userProfile";
import { TASKS, CATEGORY_CONFIG, type TaskCategory } from "@/lib/taskData";
import { loadCompletions } from "@/lib/taskStorage";
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
  Tooltip,
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
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────────

function completionTextColor(pct: number) {
  return pct >= 80
    ? "text-green-600"
    : pct >= 65
    ? "text-amber-600"
    : pct >= 50
    ? "text-orange-500"
    : "text-red-500";
}

function completionBarColor(pct: number) {
  return pct >= 80
    ? "bg-green-500"
    : pct >= 65
    ? "bg-amber-400"
    : pct >= 50
    ? "bg-orange-400"
    : "bg-red-400";
}

function tierLabel(pct: number) {
  if (pct >= 80)
    return { label: "Top Performer", bg: "bg-green-50 text-green-700 border-green-200" };
  if (pct >= 65)
    return { label: "Good", bg: "bg-amber-50 text-amber-700 border-amber-200" };
  if (pct >= 50)
    return { label: "At Risk", bg: "bg-orange-50 text-orange-700 border-orange-200" };
  return { label: "Critical", bg: "bg-red-50 text-red-600 border-red-200" };
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

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm text-xs">
      <p className="font-semibold text-slate-600 mb-1">{label}</p>
      <p className={`font-bold text-base ${completionTextColor(payload[0].value)}`}>
        {payload[0].value}%
      </p>
    </div>
  );
}

// ── Constants ────────────────────────────────────────────────────────────────

const DAILY_TASKS = TASKS.filter((t) => t.frequency === "daily");
const PERIOD_TABS: TrendPeriod[] = ["7d", "30d", "6m", "1y"];
const CAT_ORDER: TaskCategory[] = ["achc", "state_board", "operations", "retention"];

// ── Main page ────────────────────────────────────────────────────────────────

export default function StoreDashboard() {
  const { user } = useAuth();
  const rawParams = useParams<{ siteId: string }>();
  const siteId = rawParams.siteId ?? "";
  const [, navigate] = useLocation();
  const [activeCat, setActiveCat] = useState<TaskCategory | null>(null);
  const [period, setPeriod] = useState<TrendPeriod>("7d");
  const [rawDataOpen, setRawDataOpen] = useState(false);
  const [rawFilter, setRawFilter] = useState<"all" | "done" | "pending">("all");

  if (!user) return null;

  const profile = getUserProfile(user.email, user.name ?? "");
  const store = findStore(siteId);
  const storeRegion = findStoreRegion(siteId);

  // ── Access control ───────────────────────────────────────────────────────
  let accessDenied = false;
  if (isCPO(profile.role)) {
    accessDenied = false;
  } else if (profile.role === "regional_pharmacy_director") {
    const assignedRegion = getAssignedRegion(profile);
    if (assignedRegion && storeRegion?.region !== assignedRegion) {
      accessDenied = true;
    }
  } else if (profile.role === "pharmacy_director") {
    if (profile.siteId !== siteId) {
      accessDenied = true;
    }
  } else {
    accessDenied = true;
  }

  if (accessDenied || !store) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center px-6">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-slate-800 mb-1">Access Restricted</p>
          <p className="text-sm text-slate-500 mb-4">
            You don't have permission to view this store's dashboard.
          </p>
          <button
            onClick={() => navigate(isRegionalOrAbove(profile.role) ? "/app/tasks/regional" : "/app")}
            className="px-4 py-2 rounded-md bg-purple-600 text-white text-sm font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ── Live task data from localStorage ────────────────────────────────────
  const completions = loadCompletions(siteId, "daily");
  const completedCount = completions.size;
  const totalCount = DAILY_TASKS.length;

  const catStats: Record<TaskCategory, { done: number; total: number; pct: number }> =
    {} as Record<TaskCategory, { done: number; total: number; pct: number }>;
  for (const cat of TREND_CATEGORIES) {
    const catTasks = DAILY_TASKS.filter((t) => t.category === cat);
    const done = catTasks.filter((t) => completions.has(t.id)).length;
    catStats[cat] = {
      done,
      total: catTasks.length,
      pct: catTasks.length > 0 ? Math.round((done / catTasks.length) * 100) : 0,
    };
  }
  const todayPct = Math.round(
    TREND_CATEGORIES.reduce((s, cat) => s + catStats[cat].pct, 0) / TREND_CATEGORIES.length
  );

  // ── Simulated historical trend data ─────────────────────────────────────
  const siteTrend: SiteTrend = useMemo(
    () =>
      generateSiteTrendsForPeriod(siteId, store.name, storeRegion?.region ?? "", period),
    [siteId, store.name, storeRegion, period]
  );

  const avg7d = siteTrend.overallAvg;
  const tier = tierLabel(avg7d);

  const chartData = activeCat
    ? siteTrend.categories[activeCat].days.map((d) => ({ name: d.label, value: d.pct }))
    : [];

  // ── Filtered raw task list ───────────────────────────────────────────────
  const filteredTasks = DAILY_TASKS.filter((t) => {
    if (rawFilter === "done") return completions.has(t.id);
    if (rawFilter === "pending") return !completions.has(t.id);
    return true;
  });

  const doneTodayCount = DAILY_TASKS.filter((t) => completions.has(t.id)).length;
  const pendingCount = totalCount - doneTodayCount;

  const backHref = isRegionalOrAbove(profile.role) ? "/app/tasks/regional" : "/app";

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
            {isRegionalOrAbove(profile.role) ? "Back to Regional Dashboard" : "Back to Dashboard"}
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                <h1 className="text-2xl font-bold text-slate-900">{store.name}</h1>
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
              {getRoleLabel(profile.role)}
            </span>
          </div>

          {/* ── KPI tiles ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <div
              data-testid="kpi-today"
              className="bg-slate-50 border border-slate-100 rounded-md px-4 py-3"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                Today's Rate
              </p>
              <p className={`text-3xl font-bold ${completionTextColor(todayPct)}`}>{todayPct}%</p>
              <p className="text-xs text-slate-400 mt-0.5">avg across 4 categories</p>
            </div>
            <div
              data-testid="kpi-7d"
              className="bg-slate-50 border border-slate-100 rounded-md px-4 py-3"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                7-Day Average
              </p>
              <p className={`text-3xl font-bold ${completionTextColor(avg7d)}`}>{avg7d}%</p>
              <p className="text-xs text-slate-400 mt-0.5">rolling compliance</p>
            </div>
            <div
              data-testid="kpi-tasks"
              className="bg-slate-50 border border-slate-100 rounded-md px-4 py-3"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                Tasks Today
              </p>
              <p className="text-3xl font-bold text-slate-900">{completedCount}</p>
              <p className="text-xs text-slate-400 mt-0.5">of {totalCount} daily tasks done</p>
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
              — Click any card to see the full trend chart
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CAT_ORDER.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const color = SPARKLINE_COLORS[cat];
              const catTrend = siteTrend.categories[cat];
              const sparkData = catTrend.days.map((d) => d.pct);
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
                    <TrendIcon trend={catTrend.trend} />
                  </div>
                  <div className="flex items-end gap-1.5 mb-1">
                    <p
                      className={`text-2xl font-bold ${completionTextColor(catTrend.avg7d)}`}
                    >
                      {catTrend.avg7d}%
                    </p>
                    <p className="text-[10px] text-slate-400 mb-1">7d avg</p>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-3">
                    {stat.done}/{stat.total} tasks done today
                  </p>
                  <Sparkline data={sparkData} color={color} width={120} height={38} />
                  <div className="mt-2.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${completionBarColor(stat.pct)}`}
                      style={{ width: `${stat.pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-slate-400">{stat.pct}% today</p>
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
                    {store.name} · {PERIOD_CONFIG[period].label}
                  </p>
                </div>
                <div className="flex gap-1">
                  {PERIOD_TABS.map((p) => (
                    <button
                      key={p}
                      data-testid={`period-tab-${p}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPeriod(p);
                      }}
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
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
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
              <p className={`text-2xl font-bold ${completionTextColor(todayPct)}`}>
                {todayPct}%
              </p>
              <p className="text-[10px] text-slate-400">completion rate</p>
            </div>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${completionBarColor(todayPct)}`}
              style={{ width: `${todayPct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {TREND_CATEGORIES.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const stat = catStats[cat];
              return (
                <div key={cat} className={`rounded-md px-3 py-2 ${cfg.bg}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${cfg.color}`}>
                    {cfg.label.replace(" Compliance", "").replace(" Metrics", "")}
                  </p>
                  <p className={`text-lg font-bold ${completionTextColor(stat.pct)}`}>
                    {stat.pct}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {stat.done}/{stat.total}
                  </p>
                </div>
              );
            })}
          </div>
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
                    {f === "all" && ` (${totalCount})`}
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
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Task
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Role
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Category
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
                      className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 border-b border-slate-50 last:border-0 items-center hover-elevate"
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
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap capitalize">
                        {task.role.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.badge}`}
                      >
                        {cfg.label.replace(" Compliance", "").replace(" Metrics", "")}
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
