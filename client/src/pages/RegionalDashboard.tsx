import { useState } from "react";
import { Link, Redirect } from "wouter";
import { useAuth } from "@/App";
import { getUserProfile } from "@/lib/userProfile";
import { CATEGORY_CONFIG, type TaskCategory } from "@/lib/taskData";
import {
  getAllSiteTrends,
  getTroubleSpots,
  getAverageCategoryDays,
  TREND_CATEGORIES,
  SPARKLINE_COLORS,
  type SiteTrend,
} from "@/lib/trendData";
import {
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe,
  BarChart3,
} from "lucide-react";

const GRADIENT = "linear-gradient(90deg, #3b82f6, #9333ea, #ef4444, #facc15)";

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

// ── Completion colour helper ───────────────────────────────────────────────
function completionColor(pct: number) {
  return pct >= 80 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-500";
}
function completionBar(pct: number) {
  return pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-amber-400" : "bg-red-400";
}

// ── Category label shortener ───────────────────────────────────────────────
function shortLabel(label: string) {
  return label.replace(" Compliance", "").replace(" Metrics", "");
}

// ── Site card ──────────────────────────────────────────────────────────────
function SiteCard({
  trend,
  isExpanded,
  onToggle,
}: {
  trend: SiteTrend;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const orderedCats: TaskCategory[] = ["achc", "state_board", "retention", "operations"];

  return (
    <div
      data-testid={`site-card-${trend.siteId}`}
      className="bg-white border border-slate-200 rounded-md overflow-hidden"
    >
      {/* Clickable header */}
      <button
        data-testid={`btn-expand-site-${trend.siteId}`}
        className="w-full text-left px-5 pt-4 pb-3 flex items-center gap-4"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <p className="text-sm font-bold text-slate-800 truncate">{trend.siteName}</p>
          </div>
          <p className="text-xs text-slate-400 pl-4">{trend.region}</p>
        </div>

        <div className="text-right shrink-0">
          <p className={`text-2xl font-bold ${completionColor(trend.todayAvg)}`}>
            {trend.todayAvg}%
          </p>
          <p className="text-[10px] text-slate-400">Today</p>
        </div>

        <div className="shrink-0 text-slate-400">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Category mini-bars */}
      <div className="px-5 pb-4 grid grid-cols-2 gap-x-5 gap-y-2.5">
        {orderedCats.map((cat) => {
          const ct = trend.categories[cat];
          const cfg = CATEGORY_CONFIG[cat];
          const pct = ct.days[6].pct;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-slate-500">
                  {shortLabel(cfg.label)}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-600">{pct}%</span>
                  <TrendIcon trend={ct.trend} />
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${completionBar(pct)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div
          data-testid={`site-detail-${trend.siteId}`}
          className="border-t border-slate-100 px-5 py-4 bg-slate-50"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              7-Day Trends
            </p>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400">
                7d avg: <span className="font-bold text-slate-600">{trend.overallAvg}%</span>
              </span>
              {trend.siteId === "1417" && (
                <Link href="/app/tasks">
                  <span className="text-xs font-semibold text-purple-600 flex items-center gap-1 cursor-pointer hover:underline">
                    Task Manager <ExternalLink className="w-3 h-3" />
                  </span>
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {orderedCats.map((cat) => {
              const ct = trend.categories[cat];
              const cfg = CATEGORY_CONFIG[cat];
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-semibold ${cfg.color}`}>
                      {shortLabel(cfg.label)}
                    </span>
                    <span className="text-[10px] text-slate-500">{ct.avg7d}% avg</span>
                  </div>
                  <Sparkline
                    data={ct.days.map((d) => d.pct)}
                    color={SPARKLINE_COLORS[cat]}
                    width={126}
                    height={40}
                  />
                  <div className="flex justify-between mt-1">
                    {ct.days.map((d, i) => (
                      <span
                        key={i}
                        className="text-[8px] text-slate-400"
                        style={{ width: 14, textAlign: "center" }}
                      >
                        {d.label === "Today" ? "T" : d.label[0]}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function RegionalDashboard() {
  const { user } = useAuth();

  if (!user) return null;
  const profile = getUserProfile(user.email, user.name ?? "");

  if (profile.role !== "regional_director") {
    return <Redirect to="/app/tasks" />;
  }

  const [expandedSite, setExpandedSite] = useState<string | null>(null);

  const allTrends = getAllSiteTrends();
  const troubleSpots = getTroubleSpots();

  const avgCompliance = Math.round(
    allTrends.reduce((s, t) => s + t.overallAvg, 0) / allTrends.length
  );
  const todayAvg = Math.round(
    allTrends.reduce((s, t) => s + t.todayAvg, 0) / allTrends.length
  );

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-5 h-5 text-purple-600" />
                <h1 className="text-2xl font-bold text-slate-900">Regional Dashboard</h1>
              </div>
              <p className="text-sm text-slate-400">Southern + Northern California · {today}</p>
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
              data-testid="stat-sites"
              className="bg-slate-50 border border-slate-100 rounded-md px-4 py-3"
            >
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                Sites Monitored
              </p>
              <p className="text-3xl font-bold text-slate-900">{allTrends.length}</p>
            </div>
            <div
              data-testid="stat-today"
              className="bg-slate-50 border border-slate-100 rounded-md px-4 py-3"
            >
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                Today's Avg
              </p>
              <p className={`text-3xl font-bold ${completionColor(todayAvg)}`}>{todayAvg}%</p>
            </div>
            <div
              data-testid="stat-compliance"
              className="bg-slate-50 border border-slate-100 rounded-md px-4 py-3"
            >
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                7-Day Compliance
              </p>
              <p className={`text-3xl font-bold ${completionColor(avgCompliance)}`}>
                {avgCompliance}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* ── Site cards ───────────────────────────────────────────────── */}
        <section>
          <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-600" />
            Site Breakdown
            <span className="text-xs font-normal text-slate-400 ml-1">
              — Click a site to view 7-day trends
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {allTrends.map((trend) => (
              <SiteCard
                key={trend.siteId}
                trend={trend}
                isExpanded={expandedSite === trend.siteId}
                onToggle={() =>
                  setExpandedSite(expandedSite === trend.siteId ? null : trend.siteId)
                }
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
              — Average across all sites
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TREND_CATEGORIES.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const days = getAverageCategoryDays(cat, allTrends);
              const avg = Math.round(days.reduce((s, v) => s + v, 0) / days.length);
              const todayVal = days[6];
              const diff = days[6] - days[4];
              const trend =
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
                    <span className={`font-semibold ${completionColor(todayVal)}`}>
                      {todayVal}%
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Trouble spots ────────────────────────────────────────────── */}
        <section>
          <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Trouble Spots
            <span className="text-xs font-normal text-slate-400 ml-1">
              — Categories sorted by 7-day average, lowest first
            </span>
          </h2>
          <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-100">
            {troubleSpots.map((spot) => {
              const cfg = CATEGORY_CONFIG[spot.category];
              const isLow = spot.avgPct < 65;
              return (
                <div
                  key={spot.category}
                  data-testid={`trouble-spot-${spot.category}`}
                  className="flex items-center gap-4 px-5 py-3.5 flex-wrap"
                >
                  {/* Category label */}
                  <div className="flex items-center gap-2 w-40 shrink-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                    <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex-1 min-w-0">
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden max-w-52">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${completionBar(spot.avgPct)}`}
                        style={{ width: `${spot.avgPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 shrink-0 flex-wrap">
                    <span className={`text-sm font-bold ${isLow ? "text-red-600" : "text-amber-600"}`}>
                      {spot.avgPct}% avg
                    </span>
                    <div className="flex items-center gap-3">
                      {spot.siteBreakdown.map((sb) => (
                        <span key={sb.siteId} className="text-[11px] text-slate-500">
                          {sb.siteName.replace("Site ", "")}: {" "}
                          <span className={`font-bold ${completionColor(sb.avg7d)}`}>
                            {sb.avg7d}%
                          </span>
                        </span>
                      ))}
                    </div>
                    {isLow && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-50 text-red-600 whitespace-nowrap">
                        Action needed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
