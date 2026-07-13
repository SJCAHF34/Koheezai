import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/App";
import {
  TREND_CATEGORIES,
  SPARKLINE_COLORS,
  PERIOD_CONFIG,
  getSiteRankingByCategory,
  type TrendPeriod,
  type SiteRanking,
} from "@/lib/trendData";
import { CATEGORY_CONFIG, type TaskCategory } from "@/lib/taskData";
import { STORE_REGIONS, ALL_STORES } from "@/lib/storeDirectory";
import { getUserProfile, isCPO, getAssignedRegion } from "@/lib/userProfile";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from "lucide-react";

// ── All stores as flat list with region context ─────────────────────────────
const ALL_STORES_WITH_REGION = STORE_REGIONS.flatMap((r) =>
  r.stores.map((s) => ({ id: s.id, name: s.name, region: r.region }))
);

const PERIOD_TABS: TrendPeriod[] = ["7d", "30d", "6m", "1y"];

const CAT_TABS: { value: TaskCategory; label: string }[] = [
  { value: "achc", label: "ACHC Compliance" },
  { value: "state_board", label: "State Board" },
  { value: "operations", label: "Operations" },
  { value: "retention", label: "Retention" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function tierLabel(pct: number) {
  if (pct >= 80) return { label: "Top", bg: "bg-green-50 text-green-700" };
  if (pct >= 65) return { label: "Good", bg: "bg-amber-50 text-amber-700" };
  if (pct >= 50) return { label: "At Risk", bg: "bg-orange-50 text-orange-700" };
  return { label: "Critical", bg: "bg-red-50 text-red-600" };
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-green-500" />;
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

// ── Mini sparkline ───────────────────────────────────────────────────────────
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 80;
  const h = 28;
  const pad = 2;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * innerW;
    const y = pad + innerH - (v / 100) * innerH;
    return [x, y] as [number, number];
  });
  const polyPts = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const gradId = `sr-${color.replace(/[^a-z0-9]/gi, "")}`;
  const areaPts = [
    `${pts[0][0]},${h - pad}`,
    ...pts.map(([x, y]) => `${x},${y}`),
    `${pts[pts.length - 1][0]},${h - pad}`,
  ].join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#${gradId})`} />
      <polyline
        points={polyPts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.5} fill={color} />
    </svg>
  );
}

// ── Ranking row ──────────────────────────────────────────────────────────────
function RankRow({
  rank,
  store,
  cat,
}: {
  rank: number;
  store: SiteRanking;
  cat: TaskCategory;
}) {
  const tier = tierLabel(store.avg);
  const color = SPARKLINE_COLORS[cat];

  return (
    <div
      data-testid={`rank-row-${store.siteId}`}
      className="flex items-center gap-4 px-5 py-3 hover-elevate border-b border-slate-50 last:border-0"
    >
      {/* Rank */}
      <span className="text-sm font-bold text-muted-foreground w-6 shrink-0 text-right">{rank}</span>

      {/* Store info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{store.siteName}</p>
        <p className="text-[10px] text-muted-foreground">
          #{store.siteId} · {store.region}
        </p>
      </div>

      {/* Mini sparkline */}
      <div className="hidden sm:block shrink-0">
        <MiniSparkline data={store.points} color={color} />
      </div>

      {/* Trend */}
      <div className="flex items-center gap-2 shrink-0">
        <TrendIcon trend={store.trend} />
      </div>

      {/* Tier badge */}
      <span
        className={`hidden md:inline text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${tier.bg}`}
      >
        {tier.label}
      </span>
    </div>
  );
}

// ── Tier section ─────────────────────────────────────────────────────────────
interface TierGroup {
  label: string;
  stores: (SiteRanking & { globalRank: number })[];
  headerClass: string;
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function CategoryReport() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Read initial params from URL
  const params = new URLSearchParams(window.location.search);
  const initCat = (params.get("cat") as TaskCategory) ?? "achc";
  const initPeriod = (params.get("period") as TrendPeriod) ?? "7d";
  const initRegion = params.get("region") ?? null;

  const [cat, setCat] = useState<TaskCategory>(
    TREND_CATEGORIES.includes(initCat) ? initCat : "achc"
  );
  const [period, setPeriod] = useState<TrendPeriod>(
    (Object.keys(PERIOD_CONFIG) as TrendPeriod[]).includes(initPeriod) ? initPeriod : "7d"
  );
  const [filterRegion, setFilterRegion] = useState<string | null>(initRegion);

  if (!user) return null;

  const profile = getUserProfile(user.email, user.name ?? "");
  const isCpoUser = isCPO(profile.role);
  const assignedRegion = getAssignedRegion(profile);
  // RPD: always locked to their region; CPO: use filter state
  const effectiveRegion = assignedRegion ?? filterRegion;

  const cfg = CATEGORY_CONFIG[cat];
  const periodLabel = PERIOD_CONFIG[period].label;

  const baseStores = effectiveRegion
    ? ALL_STORES_WITH_REGION.filter((s) => s.region === effectiveRegion)
    : ALL_STORES_WITH_REGION;

  const rankings = useMemo(
    () => getSiteRankingByCategory(cat, period, baseStores),
    [cat, period, effectiveRegion]
  );

  // Assign global ranks and group into tiers
  const withRanks = rankings.map((s, i) => ({ ...s, globalRank: i + 1 }));

  const tiers: TierGroup[] = [
    {
      label: "Top Performers",
      stores: withRanks.filter((s) => s.avg >= 80),
      headerClass: "text-green-700 bg-green-50 border-green-200",
    },
    {
      label: "Good",
      stores: withRanks.filter((s) => s.avg >= 65 && s.avg < 80),
      headerClass: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      label: "At Risk",
      stores: withRanks.filter((s) => s.avg >= 50 && s.avg < 65),
      headerClass: "text-orange-700 bg-orange-50 border-orange-200",
    },
    {
      label: "Critical",
      stores: withRanks.filter((s) => s.avg < 50),
      headerClass: "text-red-700 bg-red-50 border-red-200",
    },
  ];

  const totalStores = rankings.length;

  return (
    <div className="min-h-screen bg-muted/40">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Back link */}
          <button
            data-testid="btn-back-regional"
            onClick={() => navigate("/app/tasks/regional")}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-purple-600 mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Regional Dashboard
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <h1 className="text-2xl font-bold text-foreground">Category Report</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                All {totalStores} locations ranked by {cfg.label} completion · {periodLabel}
              </p>
            </div>

            {/* Summary stat */}
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">
                Locations
              </p>
              <p className="text-3xl font-bold text-foreground">{totalStores}</p>
              <p className="text-[10px] text-muted-foreground">{periodLabel}</p>
            </div>
          </div>

          {/* Category selector */}
          <div className="mt-5 flex gap-1 bg-muted/40 border border-border rounded-md p-1">
            {CAT_TABS.map((tab) => (
              <button
                key={tab.value}
                data-testid={`cat-tab-${tab.value}`}
                onClick={() => setCat(tab.value)}
                className={`flex-1 px-2 py-2 rounded text-xs font-bold transition-all ${
                  cat === tab.value
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* CPO region filter */}
          {isCpoUser && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Region:</span>
              <div className="flex gap-1 flex-wrap">
                {[null, ...STORE_REGIONS.map((r) => r.region)].map((r) => (
                  <button
                    key={r ?? "all"}
                    data-testid={`region-tab-${r ?? "all"}`}
                    onClick={() => setFilterRegion(r)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                      filterRegion === r
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-border text-muted-foreground hover:border-border hover:text-muted-foreground"
                    }`}
                  >
                    {r ? r.replace(" Region", "") : "All Regions"}
                  </button>
                ))}
              </div>
              {effectiveRegion && (
                <span className="text-[10px] text-muted-foreground">
                  · Showing {baseStores.length} locations
                </span>
              )}
            </div>
          )}
          {assignedRegion && !isCpoUser && (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Region:</span>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {assignedRegion}
              </span>
              <span className="text-[10px] text-muted-foreground">· {baseStores.length} locations</span>
            </div>
          )}

          {/* Period selector */}
          <div className="mt-2 flex gap-1">
            {PERIOD_TABS.map((p) => (
              <button
                key={p}
                data-testid={`period-tab-${p}`}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                  period === p
                    ? "border-purple-400 bg-purple-50 text-purple-700"
                    : "border-border text-muted-foreground hover:border-border hover:text-muted-foreground"
                }`}
              >
                {PERIOD_CONFIG[p].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Ranked list ─────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {tiers.map((tier) => {
          if (tier.stores.length === 0) return null;
          return (
            <div key={tier.label}>
              {/* Tier header */}
              <div
                className={`flex items-center justify-between px-4 py-2 rounded-t-md border ${tier.headerClass}`}
              >
                <span className="text-xs font-bold uppercase tracking-wide">{tier.label}</span>
                <span className="text-xs font-medium opacity-70">
                  {tier.stores.length} {tier.stores.length === 1 ? "location" : "locations"}
                </span>
              </div>

              {/* Store rows */}
              <div className="bg-card border border-t-0 border-border rounded-b-md divide-y divide-slate-50">
                {tier.stores.map((store) => (
                  <RankRow key={store.siteId} rank={store.globalRank} store={store} cat={cat} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
