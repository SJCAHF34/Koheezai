import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/App";
import {
  getUserProfile,
  isPharmacyDirector,
  isDirectorRole,
  isCPO,
  getAssignedRegion,
} from "@/lib/userProfile";
import { loadRoster, type StaffMember } from "@/lib/taskStorage";
import {
  type PharmacyHours,
  type StaffScheduleDefault,
  type ScheduleEntry,
  type ScheduleStatus,
  type ScheduleSubmission,
  type StaffTimeOffBalance,
  SCHEDULE_STATUSES,
  SCHEDULE_PATTERNS,
  type SchedulePattern,
} from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Settings,
  Clock,
  Loader2,
  Send,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Staff color palette — used when no custom color is set in defaults.
const DEFAULT_STAFF_COLORS = [
  "#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626",
  "#0891b2", "#7c2d12", "#4338ca", "#be185d", "#15803d",
];

function getStaffColor(staffId: string, defaults: StaffScheduleDefault[], roster: StaffMember[]): string {
  const def = defaults.find((d) => d.staffId === staffId);
  if (def?.color) return def.color;
  const idx = roster.findIndex((s) => s.id === staffId);
  return DEFAULT_STAFF_COLORS[idx % DEFAULT_STAFF_COLORS.length] ?? "#6b7280";
}

// ISO week number (1-53) for alternating-week patterns.
function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Count calendar days covered by an entry (1 for single-day).
function countEntryDays(entry: Pick<ScheduleEntry, "date" | "endDate">): number {
  if (!entry.endDate || entry.endDate === entry.date) return 1;
  const start = new Date(entry.date + "T00:00:00");
  const end = new Date(entry.endDate + "T00:00:00");
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

// US Federal holidays for a given year (YYYY-MM-DD strings, observed dates).
function federalHolidays(year: number): { name: string; date: string }[] {
  // Timezone-safe local date formatter — never uses toISOString() which can shift a day.
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  // Observed: if holiday falls Sat→Fri, Sun→Mon. Stays within the given year.
  const observed = (d: Date): Date => {
    const dow = d.getDay();
    if (dow === 6) return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
    if (dow === 0) return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    return d;
  };
  // Nth weekday of month: nthWeekday(year, month, weekday, n) — month 0-based, weekday 0=Sun.
  const nthWeekday = (yr: number, mo: number, wd: number, n: number): Date => {
    const first = new Date(yr, mo, 1);
    const diff = (wd - first.getDay() + 7) % 7;
    return new Date(yr, mo, 1 + diff + (n - 1) * 7);
  };
  // Last weekday of month.
  const lastWeekday = (yr: number, mo: number, wd: number): Date => {
    const last = new Date(yr, mo + 1, 0);
    const diff = (last.getDay() - wd + 7) % 7;
    return new Date(yr, mo, last.getDate() - diff);
  };
  return [
    { name: "New Year's Day", date: fmt(observed(new Date(year, 0, 1))) },
    { name: "MLK Day", date: fmt(nthWeekday(year, 0, 1, 3)) },
    { name: "Presidents' Day", date: fmt(nthWeekday(year, 1, 1, 3)) },
    { name: "Memorial Day", date: fmt(lastWeekday(year, 4, 1)) },
    { name: "Juneteenth", date: fmt(observed(new Date(year, 5, 19))) },
    { name: "Independence Day", date: fmt(observed(new Date(year, 6, 4))) },
    { name: "Labor Day", date: fmt(nthWeekday(year, 8, 1, 1)) },
    { name: "Columbus Day", date: fmt(nthWeekday(year, 9, 1, 2)) },
    { name: "Veterans Day", date: fmt(observed(new Date(year, 10, 11))) },
    { name: "Thanksgiving", date: fmt(nthWeekday(year, 10, 4, 4)) },
    { name: "Christmas Day", date: fmt(observed(new Date(year, 11, 25))) },
  ];
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay()); // back to Sunday
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function addMonths(d: Date, n: number): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(1);
  out.setMonth(out.getMonth() + n);
  return out;
}

function startOfMonth(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(1);
  return out;
}

// Returns the array of dates that fill a calendar month grid:
// from the Sunday on/before the 1st through the Saturday on/after the last day.
function monthGridDays(anchor: Date): Date[] {
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  // last day of month
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const gridEndExclusive = addDays(startOfWeek(lastDay), 7); // following Sunday
  const days: Date[] = [];
  for (let d = new Date(gridStart); d < gridEndExclusive; d = addDays(d, 1)) {
    days.push(new Date(d));
  }
  return days;
}

const STATUS_LABEL: Record<ScheduleStatus, string> = {
  scheduled: "Scheduled",
  unscheduled: "Unscheduled",
  sick: "Sick",
  pto: "PTO",
  floating_holiday: "Floating Holiday",
};

const STATUS_BADGE_CLASS: Record<ScheduleStatus, string> = {
  scheduled: "bg-emerald-100 text-emerald-800 border-emerald-200",
  unscheduled: "bg-slate-100 text-slate-600 border-slate-200",
  sick: "bg-amber-100 text-amber-800 border-amber-200",
  pto: "bg-blue-100 text-blue-800 border-blue-200",
  floating_holiday: "bg-purple-100 text-purple-800 border-purple-200",
};

function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, "0");
  return `${h12}:${mm} ${period}`;
}

function emptyShift() {
  return { start: "09:00", end: "17:00" } as { start: string; end: string };
}

// Effective schedule for a staff/date — entry override > default > unscheduled
type EffectiveCell = {
  status: ScheduleStatus;
  start?: string;
  end?: string;
  fromDefault: boolean;
  hasOverride: boolean;
  overrideEntry?: ScheduleEntry;
};

function computeEffective(
  date: Date,
  staffId: string,
  defaults: StaffScheduleDefault[],
  entries: ScheduleEntry[],
): EffectiveCell {
  const dateKey = toDateKey(date);
  const dow = date.getDay();
  // Multi-day aware: an entry covers date if date falls in [entry.date, entry.endDate].
  // Precedence: exact-date (span=1) beats longer multi-day blocks; tie-break by start date desc.
  const candidates = entries.filter(
    (e) => e.staffId === staffId && e.date <= dateKey && (e.endDate ?? e.date) >= dateKey,
  );
  const override = candidates.sort((a, b) => {
    const spanA = a.endDate && a.endDate > a.date ? new Date(a.endDate).getTime() - new Date(a.date).getTime() : 0;
    const spanB = b.endDate && b.endDate > b.date ? new Date(b.endDate).getTime() - new Date(b.date).getTime() : 0;
    if (spanA !== spanB) return spanA - spanB; // shorter span wins
    return b.date.localeCompare(a.date); // later start date wins
  })[0];
  if (override) {
    return {
      status: override.status,
      start: override.start,
      end: override.end,
      fromDefault: false,
      hasOverride: true,
      overrideEntry: override,
    };
  }
  const def = defaults.find((d) => d.staffId === staffId);
  const pattern = def?.schedulePattern ?? "standard";
  // Alternating week: check if this staff works on this ISO week.
  let patternOff = false;
  if (pattern === "alternating_a") {
    patternOff = getISOWeek(date) % 2 === 0; // alternating_a = odd ISO weeks only
  } else if (pattern === "alternating_b") {
    patternOff = getISOWeek(date) % 2 !== 0; // alternating_b = even ISO weeks only
  }
  if (patternOff) {
    return { status: "unscheduled", fromDefault: true, hasOverride: false };
  }
  const shift = def?.weekdays?.[dow] ?? null;
  if (shift) {
    return { status: "scheduled", start: shift.start, end: shift.end, fromDefault: true, hasOverride: false };
  }
  return { status: "unscheduled", fromDefault: false, hasOverride: false };
}

// ── Site picker ────────────────────────────────────────────────────────────

type SiteOption = { id: string; name: string; region: string | null };

// ── Page ───────────────────────────────────────────────────────────────────

export default function SchedulingPage() {
  const { user } = useAuth();
  const profile = user ? getUserProfile(user.email, user.name ?? "") : null;
  const isPD = profile ? isPharmacyDirector(profile.role) : false;
  const canEdit = profile ? isDirectorRole(profile.role) : false;
  const { toast } = useToast();

  const sitesQuery = useQuery<SiteOption[]>({
    queryKey: ["/api/scheduling/sites"],
  });

  const [siteId, setSiteId] = useState<string>("");

  useEffect(() => {
    if (!siteId && sitesQuery.data && sitesQuery.data.length > 0) {
      const preferred = profile?.siteId
        ? sitesQuery.data.find((s) => s.id === profile.siteId)
        : undefined;
      setSiteId((preferred ?? sitesQuery.data[0]).id);
    }
  }, [sitesQuery.data, siteId, profile?.siteId]);

  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [weekAnchor, setWeekAnchor] = useState<Date>(startOfWeek(new Date()));
  const [monthAnchor, setMonthAnchor] = useState<Date>(startOfMonth(new Date()));

  // Apply URL ?site= and ?week= params one time on mount (e.g. from notifications).
  const [urlApplied, setUrlApplied] = useState(false);
  useEffect(() => {
    if (urlApplied) return;
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const qSite = sp.get("site");
    const qWeek = sp.get("week");
    if (qSite && sitesQuery.data?.some((s) => s.id === qSite)) {
      setSiteId(qSite);
    }
    if (qWeek && /^\d{4}-\d{2}-\d{2}$/.test(qWeek)) {
      const [y, m, d] = qWeek.split("-").map((n) => parseInt(n, 10));
      setWeekAnchor(startOfWeek(new Date(y, m - 1, d)));
      setViewMode("week");
    }
    if (sitesQuery.data) setUrlApplied(true);
  }, [sitesQuery.data, urlApplied]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)), [weekAnchor]);
  const monthDays = useMemo(() => monthGridDays(monthAnchor), [monthAnchor]);
  const rangeDays = viewMode === "week" ? weekDays : monthDays;
  const fromKey = toDateKey(rangeDays[0]);
  const toKey = toDateKey(rangeDays[rangeDays.length - 1]);

  // Roster comes from client-side store (existing taskStorage)
  const roster = useMemo<StaffMember[]>(
    () => (siteId ? loadRoster(siteId).members : []),
    [siteId],
  );

  const hoursQuery = useQuery<PharmacyHours | null>({
    queryKey: ["/api/scheduling", siteId, "hours"],
    enabled: !!siteId,
  });

  const defaultsQuery = useQuery<StaffScheduleDefault[]>({
    queryKey: ["/api/scheduling", siteId, "defaults"],
    enabled: !!siteId,
  });

  // Extend lookback 90 days so multi-day entries starting before visible range are fetched.
  const entriesFromKey = useMemo(() => {
    const d = new Date(fromKey);
    d.setDate(d.getDate() - 90);
    return toDateKey(d);
  }, [fromKey]);

  const entriesQuery = useQuery<ScheduleEntry[]>({
    queryKey: ["/api/scheduling", siteId, "entries", entriesFromKey, toKey],
    queryFn: async () =>
      apiRequest(`/api/scheduling/${siteId}/entries?from=${entriesFromKey}&to=${toKey}`),
    enabled: !!siteId,
  });

  const currentYear = new Date().getFullYear();
  const balancesQuery = useQuery<StaffTimeOffBalance[]>({
    queryKey: ["/api/scheduling", siteId, "balances", currentYear],
    queryFn: async () =>
      apiRequest(`/api/scheduling/${siteId}/balances?year=${currentYear}`),
    enabled: !!siteId,
  });

  // Full-year entries for accurate used-day computation in BalancesEditor.
  const yearEntriesQuery = useQuery<ScheduleEntry[]>({
    queryKey: ["/api/scheduling", siteId, "entries", `${currentYear}-01-01`, `${currentYear}-12-31`],
    queryFn: async () =>
      apiRequest(`/api/scheduling/${siteId}/entries?from=${currentYear}-01-01&to=${currentYear}-12-31`),
    enabled: !!siteId,
  });

  const upsertEntryMutation = useMutation({
    mutationFn: (payload: {
      staffId: string;
      staffName: string;
      date: string;
      endDate?: string;
      status: ScheduleStatus;
      start?: string;
      end?: string;
      note?: string;
    }) =>
      apiRequest(`/api/scheduling/${siteId}/entries`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling", siteId, "entries"] });
    },
    onError: (err: any) => toast({ title: "Save failed", description: String(err?.message ?? err), variant: "destructive" }),
  });

  const upsertBalanceMutation = useMutation({
    mutationFn: (payload: {
      staffId: string;
      staffName: string;
      year: number;
      ptoDaysAllotted: number;
      sickDaysAllotted: number;
      floatingHolidayDaysAllotted: number;
    }) =>
      apiRequest(`/api/scheduling/${siteId}/balances`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling", siteId, "balances", currentYear] });
    },
    onError: (err: any) => toast({ title: "Save failed", description: String(err?.message ?? err), variant: "destructive" }),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (payload: { staffId: string; date: string }) =>
      apiRequest(`/api/scheduling/${siteId}/entries/${payload.staffId}/${payload.date}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling", siteId, "entries"] });
    },
    onError: (err: any) => toast({ title: "Reset failed", description: String(err?.message ?? err), variant: "destructive" }),
  });

  // ── Submission workflow ──────────────────────────────────────────────────
  const currentSiteRegion = sitesQuery.data?.find((s) => s.id === siteId)?.region ?? null;
  const isReviewer = profile
    ? isCPO(profile.role) ||
      (profile.role === "regional_pharmacy_director" &&
        !!getAssignedRegion(profile) &&
        getAssignedRegion(profile) === currentSiteRegion)
    : false;

  const submissionQuery = useQuery<ScheduleSubmission | null>({
    queryKey: ["/api/scheduling", siteId, "submissions", "week", fromKey],
    queryFn: async () =>
      apiRequest(
        `/api/scheduling/${siteId}/submissions?weekStart=${fromKey}`,
      ),
    enabled: !!siteId && viewMode === "week",
  });

  // Full submission history for the site (all weeks, newest first).
  const submissionHistoryQuery = useQuery<ScheduleSubmission[]>({
    queryKey: ["/api/scheduling", siteId, "submissions"],
    queryFn: async () => apiRequest(`/api/scheduling/${siteId}/submissions`),
    enabled: !!siteId,
  });

  const submitMutation = useMutation({
    mutationFn: (payload: { weekStart: string; submitterNote?: string }) =>
      apiRequest(`/api/scheduling/${siteId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling", siteId, "submissions", "week", fromKey] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling", siteId, "submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Submitted for review", description: "Your Regional Director has been notified." });
      setSubmitOpen(false);
    },
    onError: (err: any) =>
      toast({ title: "Submit failed", description: String(err?.message ?? err), variant: "destructive" }),
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { id: string; action: "approve" | "request-changes"; reviewNote?: string }) =>
      apiRequest(`/api/scheduling/submissions/${payload.id}/${payload.action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNote: payload.reviewNote }),
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling", siteId, "submissions", "week", fromKey] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling", siteId, "submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: vars.action === "approve" ? "Schedule approved" : "Changes requested",
        description: "The Pharmacy Director has been notified.",
      });
      setReviewOpen(null);
    },
    onError: (err: any) =>
      toast({ title: "Review failed", description: String(err?.message ?? err), variant: "destructive" }),
  });

  const [submitOpen, setSubmitOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState<"approve" | "request-changes" | null>(null);

  // ── Cell editor dialog ───────────────────────────────────────────────────
  const [editing, setEditing] = useState<{ staff: StaffMember; date: Date } | null>(null);

  // ── Day detail dialog (month view) ───────────────────────────────────────
  const [dayDetail, setDayDetail] = useState<Date | null>(null);

  // ── Settings dialog (defaults + hours) ───────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Staff defaults dialog (click staff name) ──────────────────────────────
  const [staffDefaultsTarget, setStaffDefaultsTarget] = useState<StaffMember | null>(null);

  // ── Quick-create (month view cell click) ─────────────────────────────────
  const [quickCreate, setQuickCreate] = useState<{ date: Date } | null>(null);

  const selectedSite = sitesQuery.data?.find((s) => s.id === siteId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4" data-testid="page-scheduling">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-purple-600" />
          <h1 className="text-xl font-semibold">Team Scheduling</h1>
        </div>
        <div className="flex items-center gap-2">
          {!canEdit && (
            <Badge variant="outline" className="text-[10px]" data-testid="badge-view-only">
              View only
            </Badge>
          )}
          {canEdit && !isPD && sitesQuery.data && sitesQuery.data.length > 0 && (
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger className="w-[260px]" data-testid="select-site">
                <SelectValue placeholder="Choose a store" />
              </SelectTrigger>
              <SelectContent>
                {sitesQuery.data.map((s) => (
                  <SelectItem key={s.id} value={s.id} data-testid={`option-site-${s.id}`}>
                    {s.name} <span className="text-muted-foreground">#{s.id}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              disabled={!siteId}
              data-testid="button-open-settings"
            >
              <Settings className="w-4 h-4 mr-1" />
              Defaults &amp; Hours
            </Button>
          )}
        </div>
      </div>

      {selectedSite && (
        <div className="text-sm text-muted-foreground" data-testid="text-site-context">
          {selectedSite.name} <span className="text-xs">#{selectedSite.id}</span>
          {selectedSite.region ? ` — ${selectedSite.region}` : ""}
        </div>
      )}

      {/* Business Hours summary (read-only) */}
      {siteId && (
        <Card data-testid="card-hours-summary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pharmacy Business Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {hoursQuery.isLoading ? (
              <div className="text-xs text-muted-foreground">Loading hours…</div>
            ) : !hoursQuery.data ? (
              <div className="text-xs text-muted-foreground">
                No hours configured yet. Use Defaults &amp; Hours to set them.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {WEEKDAY_LABELS.map((label, i) => {
                    const day = hoursQuery.data!.weekdays[i];
                    return (
                      <div
                        key={i}
                        className="rounded border bg-muted/30 px-2 py-1.5"
                        data-testid={`text-hours-day-${i}`}
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {label}
                        </div>
                        <div className="text-xs font-medium">
                          {day ? `${formatTime(day.open)} – ${formatTime(day.close)}` : <span className="italic text-muted-foreground">Closed</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {hoursQuery.data.holidayClosures.length > 0 && (
                  <div className="mt-2 text-[11px] text-muted-foreground" data-testid="text-holiday-closures">
                    <span className="font-medium">Holiday closures:</span>{" "}
                    {hoursQuery.data.holidayClosures.join(", ")}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submission status banner (week view only) */}
      {siteId && viewMode === "week" && (
        <SubmissionBanner
          submission={submissionQuery.data ?? null}
          isPD={isPD && profile?.siteId === siteId}
          isReviewer={isReviewer}
          weekLabel={weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          onSubmitClick={() => setSubmitOpen(true)}
          onApproveClick={() => setReviewOpen("approve")}
          onRequestChangesClick={() => setReviewOpen("request-changes")}
          isWorking={submitMutation.isPending || reviewMutation.isPending}
        />
      )}

      {/* Submission history (all weeks) */}
      {siteId && (
        <SubmissionHistory submissions={submissionHistoryQuery.data ?? []} />
      )}

      {/* Week / Month navigator */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3 flex-wrap">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {viewMode === "week"
              ? `Week of ${weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
              : monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            {viewMode === "week" && (defaultsQuery.data ?? []).some(d => d.schedulePattern && d.schedulePattern !== "standard") && (() => {
              // Use Monday (weekDays[1]) as ISO-week anchor — ISO weeks are Monday-based.
              const isoWk = getISOWeek(weekDays[1] ?? weekDays[0]);
              const label = isoWk % 2 !== 0 ? "Week A" : "Week B";
              return (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold" title={`ISO week ${isoWk} — Week A = odd, Week B = even`}>
                  {label}
                </span>
              );
            })()}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-md border overflow-hidden" data-testid="toggle-view-mode">
              <button
                type="button"
                className={`px-2.5 py-1 text-xs ${viewMode === "week" ? "bg-purple-600 text-white" : "bg-background text-foreground hover-elevate"}`}
                onClick={() => setViewMode("week")}
                data-testid="button-view-week"
              >
                Week
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 text-xs border-l ${viewMode === "month" ? "bg-purple-600 text-white" : "bg-background text-foreground hover-elevate"}`}
                onClick={() => setViewMode("month")}
                data-testid="button-view-month"
              >
                Month
              </button>
            </div>
            {viewMode === "week" ? (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => setWeekAnchor((d) => addDays(d, -7))} data-testid="button-prev-week">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setWeekAnchor(startOfWeek(new Date()))} data-testid="button-this-week">
                  This week
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setWeekAnchor((d) => addDays(d, 7))} data-testid="button-next-week">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => setMonthAnchor((d) => addMonths(d, -1))} data-testid="button-prev-month">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMonthAnchor(startOfMonth(new Date()))} data-testid="button-this-month">
                  This month
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMonthAnchor((d) => addMonths(d, 1))} data-testid="button-next-month">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!siteId ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Select a store to begin.</div>
          ) : roster.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No staff roster yet for this store. Add staff in the Tasks page roster manager first.
            </div>
          ) : entriesQuery.isLoading || defaultsQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground inline-flex items-center justify-center gap-2 w-full">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading schedule…
            </div>
          ) : viewMode === "month" ? (
            <MonthGrid
              monthAnchor={monthAnchor}
              days={monthDays}
              roster={roster}
              hours={hoursQuery.data ?? null}
              defaults={defaultsQuery.data ?? []}
              entries={entriesQuery.data ?? []}
              onPickDay={(d) => setDayDetail(d)}
              onQuickCreate={(d) => setQuickCreate({ date: d })}
              canEdit={canEdit}
              onEditDefaults={(staff) => setStaffDefaultsTarget(staff)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium sticky left-0 bg-muted/40 z-10 min-w-[180px]">Staff</th>
                    {weekDays.map((d, i) => {
                      const closed = hoursQuery.data?.weekdays?.[d.getDay()] === null;
                      return (
                        <th key={i} className="px-2 py-2 font-medium text-center">
                          <div>{WEEKDAY_LABELS[d.getDay()]}</div>
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
                          </div>
                          {closed && <div className="text-[9px] text-muted-foreground italic">Closed</div>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {roster.map((staff) => (
                    <tr key={staff.id} className="border-t">
                      <td className="px-3 py-2 sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: getStaffColor(staff.id, defaultsQuery.data ?? [], roster) }}
                          />
                          <button
                            type="button"
                            onClick={() => setStaffDefaultsTarget(staff)}
                            className="font-medium text-left hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            data-testid={`text-staff-name-${staff.id}`}
                          >{staff.name}</button>
                        </div>
                        <div className="text-[10px] text-muted-foreground ml-4">
                          {staff.roles.map((r) => r.replace(/_/g, " ")).join(", ")}
                          {(() => {
                            const def = (defaultsQuery.data ?? []).find(d => d.staffId === staff.id);
                            const pat = def?.schedulePattern;
                            if (!pat || pat === "standard") return null;
                            // Use Monday (weekDays[1]) as ISO-week anchor to stay consistent with ISO week semantics.
                            const isoWk = getISOWeek(weekDays[1] ?? weekDays[0]);
                            const isActiveWeek = (pat === "alternating_a" && isoWk % 2 !== 0) || (pat === "alternating_b" && isoWk % 2 === 0);
                            return (
                              <span className={`ml-1 px-1 rounded text-[9px] font-semibold ${isActiveWeek ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                {pat === "alternating_a" ? "A" : "B"}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      {weekDays.map((d, i) => {
                        const cell = computeEffective(
                          d,
                          staff.id,
                          defaultsQuery.data ?? [],
                          entriesQuery.data ?? [],
                        );
                        const dateKey = toDateKey(d);
                        const cellInner = (
                          <>
                            <Badge
                              variant="outline"
                              className={`block w-full text-[10px] font-medium border ${STATUS_BADGE_CLASS[cell.status]}`}
                            >
                              {STATUS_LABEL[cell.status]}
                            </Badge>
                            {cell.status === "scheduled" && cell.start && cell.end && (
                              <div className="text-[10px] mt-1 text-muted-foreground">
                                {formatTime(cell.start)} – {formatTime(cell.end)}
                              </div>
                            )}
                            {cell.fromDefault && (
                              <div className="text-[9px] text-muted-foreground italic">default</div>
                            )}
                          </>
                        );
                        return (
                          <td key={i} className="px-1 py-1 text-center align-top">
                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() => setEditing({ staff, date: d })}
                                className="w-full rounded border border-transparent hover-elevate active-elevate-2 px-1.5 py-1 text-left"
                                data-testid={`cell-schedule-${staff.id}-${dateKey}`}
                              >
                                {cellInner}
                              </button>
                            ) : (
                              <div
                                className="w-full rounded border border-transparent px-1.5 py-1 text-left"
                                data-testid={`cell-schedule-${staff.id}-${dateKey}`}
                              >
                                {cellInner}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cell editor */}
      {editing && siteId && (
        <CellEditorDialog
          open={!!editing}
          onClose={() => setEditing(null)}
          staff={editing.staff}
          date={editing.date}
          existing={(entriesQuery.data ?? []).find((e) => {
            const dk = toDateKey(editing.date);
            return e.staffId === editing.staff.id && e.date <= dk && (e.endDate ?? e.date) >= dk;
          })}
          defaults={defaultsQuery.data ?? []}
          balances={balancesQuery.data ?? []}
          yearEntries={yearEntriesQuery.data ?? []}
          isSaving={upsertEntryMutation.isPending}
          isDeleting={deleteEntryMutation.isPending}
          onSave={async (payload) => {
            await upsertEntryMutation.mutateAsync(payload);
            setEditing(null);
            toast({ title: "Schedule updated" });
          }}
          onReset={async () => {
            // Delete uses the entry's start date (which is the DB key).
            const dk = toDateKey(editing.date);
            const entry = (entriesQuery.data ?? []).find((e) => {
              return e.staffId === editing.staff.id && e.date <= dk && (e.endDate ?? e.date) >= dk;
            });
            await deleteEntryMutation.mutateAsync({
              staffId: editing.staff.id,
              date: entry?.date ?? dk,
            });
            setEditing(null);
            toast({ title: "Override removed", description: "Reverted to default schedule." });
          }}
        />
      )}

      {/* Quick-create time-off from month view */}
      {quickCreate && siteId && (
        <QuickCreateDialog
          open={!!quickCreate}
          onClose={() => setQuickCreate(null)}
          date={quickCreate.date}
          roster={roster}
          defaults={defaultsQuery.data ?? []}
          balances={balancesQuery.data ?? []}
          yearEntries={yearEntriesQuery.data ?? []}
          isSaving={upsertEntryMutation.isPending}
          onSave={async (payload) => {
            await upsertEntryMutation.mutateAsync(payload);
            setQuickCreate(null);
            toast({ title: "Time off saved" });
          }}
        />
      )}

      {/* Day detail (month view) */}
      {dayDetail && siteId && (
        <DayDetailDialog
          open={!!dayDetail}
          onClose={() => setDayDetail(null)}
          date={dayDetail}
          roster={roster}
          defaults={defaultsQuery.data ?? []}
          entries={entriesQuery.data ?? []}
          canEdit={canEdit}
          onEditStaff={(staff) => {
            setDayDetail(null);
            setEditing({ staff, date: dayDetail });
          }}
          onEditDefaults={(staff) => {
            setDayDetail(null);
            setStaffDefaultsTarget(staff);
          }}
        />
      )}

      {/* Staff defaults dialog (click staff name in week/month view) */}
      {staffDefaultsTarget && siteId && (
        <StaffDefaultsDialog
          open={!!staffDefaultsTarget}
          onClose={() => setStaffDefaultsTarget(null)}
          siteId={siteId}
          staff={staffDefaultsTarget}
          defaults={defaultsQuery.data ?? []}
          roster={roster}
          canEdit={canEdit}
        />
      )}

      {/* Settings dialog */}
      {settingsOpen && siteId && (
        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          siteId={siteId}
          roster={roster}
          hours={hoursQuery.data ?? null}
          defaults={defaultsQuery.data ?? []}
          balances={balancesQuery.data ?? []}
          currentYear={currentYear}
          onSaveBalance={(payload) => upsertBalanceMutation.mutateAsync(payload)}
          entries={yearEntriesQuery.data ?? []}
        />
      )}

      {/* Submit-for-review dialog (PD) */}
      {submitOpen && siteId && (
        <SubmitForReviewDialog
          open={submitOpen}
          onClose={() => setSubmitOpen(false)}
          weekLabel={weekDays[0].toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          isSubmitting={submitMutation.isPending}
          onSubmit={(note) => submitMutation.mutate({ weekStart: fromKey, submitterNote: note || undefined })}
        />
      )}

      {/* Review dialog (RPD/CPO) */}
      {reviewOpen && submissionQuery.data && (
        <ReviewSubmissionDialog
          open={!!reviewOpen}
          mode={reviewOpen}
          onClose={() => setReviewOpen(null)}
          submission={submissionQuery.data}
          isWorking={reviewMutation.isPending}
          onConfirm={(note) =>
            reviewMutation.mutate({
              id: submissionQuery.data!.id,
              action: reviewOpen,
              reviewNote: note || undefined,
            })
          }
        />
      )}
    </div>
  );
}

// ── Quick Create Dialog (month view) ────────────────────────────────────────

function QuickCreateDialog({
  open,
  onClose,
  date,
  roster,
  defaults,
  balances,
  yearEntries,
  isSaving,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  date: Date;
  roster: StaffMember[];
  defaults: StaffScheduleDefault[];
  balances: StaffTimeOffBalance[];
  yearEntries: ScheduleEntry[];
  isSaving: boolean;
  onSave: (payload: {
    staffId: string;
    staffName: string;
    date: string;
    endDate?: string;
    status: ScheduleStatus;
    note?: string;
  }) => Promise<void>;
}) {
  const dateKey = toDateKey(date);
  const [staffId, setStaffId] = useState<string>(roster[0]?.id ?? "");
  const [status, setStatus] = useState<ScheduleStatus>("pto");
  const [endDateKey, setEndDateKey] = useState<string>(dateKey);
  const [note, setNote] = useState<string>("");

  const currentYear = date.getFullYear();
  const selectedStaff = roster.find((s) => s.id === staffId);
  const balance = balances.find((b) => b.staffId === staffId && b.year === currentYear);

  // Compute used days for the selected staff.
  const usedDays = useMemo(() => {
    const used = { pto: 0, sick: 0, fh: 0 };
    for (const e of yearEntries) {
      if (e.staffId !== staffId) continue;
      const days = countEntryDays(e);
      if (e.status === "pto") used.pto += days;
      else if (e.status === "sick") used.sick += days;
      else if (e.status === "floating_holiday") used.fh += days;
    }
    return used;
  }, [yearEntries, staffId]);

  const remaining = {
    pto: (balance?.ptoDaysAllotted ?? 10) - usedDays.pto,
    sick: (balance?.sickDaysAllotted ?? 5) - usedDays.sick,
    fh: (balance?.floatingHolidayDaysAllotted ?? 0) - usedDays.fh,
  };

  const isMultiDay = endDateKey > dateKey;
  const dayCount = isMultiDay
    ? Math.round((new Date(endDateKey + "T00:00:00").getTime() - new Date(dateKey + "T00:00:00").getTime()) / 86400000) + 1
    : 1;

  if (roster.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent data-testid="dialog-quick-create">
        <DialogHeader>
          <DialogTitle>Add Time Off</DialogTitle>
          <DialogDescription>
            {date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Staff member</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="mt-1" data-testid="select-qc-staff">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roster.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Type</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ScheduleStatus)}>
              <SelectTrigger className="mt-1" data-testid="select-qc-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OFF_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} data-testid={`option-qc-status-${s}`}>
                    {STATUS_LABEL[s]}
                    {" — "}
                    {s === "pto" ? `${remaining.pto} days remaining` : s === "sick" ? `${remaining.sick} days remaining` : `${remaining.fh} days remaining`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={dateKey} disabled className="mt-1 bg-muted/50" />
            </div>
            <div>
              <Label className="text-xs">Through</Label>
              <Input
                type="date"
                value={endDateKey}
                min={dateKey}
                onChange={(e) => setEndDateKey(e.target.value || dateKey)}
                className="mt-1"
                data-testid="input-qc-end-date"
              />
            </div>
          </div>
          {isMultiDay && (
            <p className="text-[11px] text-muted-foreground">{dayCount} calendar days</p>
          )}

          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Approved vacation"
              data-testid="input-qc-note"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={onClose} data-testid="button-qc-cancel">Cancel</Button>
          <Button
            onClick={async () => {
              if (!selectedStaff) return;
              await onSave({
                staffId: selectedStaff.id,
                staffName: selectedStaff.name,
                date: dateKey,
                endDate: endDateKey > dateKey ? endDateKey : undefined,
                status,
                note: note.trim() || undefined,
              });
              onClose();
            }}
            disabled={isSaving || !selectedStaff}
            data-testid="button-qc-save"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Cell Editor Dialog ─────────────────────────────────────────────────────

function CellEditorDialog({
  open,
  onClose,
  staff,
  date,
  existing,
  defaults,
  balances,
  yearEntries,
  isSaving,
  isDeleting,
  onSave,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  staff: StaffMember;
  date: Date;
  existing?: ScheduleEntry;
  defaults: StaffScheduleDefault[];
  balances: StaffTimeOffBalance[];
  yearEntries: ScheduleEntry[];
  isSaving: boolean;
  isDeleting: boolean;
  onSave: (payload: {
    staffId: string;
    staffName: string;
    date: string;
    endDate?: string;
    status: ScheduleStatus;
    start?: string;
    end?: string;
    note?: string;
  }) => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const dateKey = toDateKey(date);
  const dow = date.getDay();
  const def = defaults.find((d) => d.staffId === staff.id);
  const defaultShift = def?.weekdays?.[dow] ?? null;

  const initial: ScheduleStatus = existing?.status ?? (defaultShift ? "scheduled" : "unscheduled");
  const [status, setStatus] = useState<ScheduleStatus>(initial);
  const [start, setStart] = useState<string>(existing?.start ?? defaultShift?.start ?? "09:00");
  const [end, setEnd] = useState<string>(existing?.end ?? defaultShift?.end ?? "17:00");
  const [note, setNote] = useState<string>(existing?.note ?? "");
  // For multi-day time-off: endDateKey defaults to the same date or existing endDate.
  const [endDateKey, setEndDateKey] = useState<string>(existing?.endDate ?? dateKey);

  const isTimeOff = TIME_OFF_STATUSES.includes(status);
  const isMultiDay = isTimeOff && endDateKey && endDateKey > dateKey;
  const dayCount = isMultiDay
    ? Math.round((new Date(endDateKey + "T00:00:00").getTime() - new Date(dateKey + "T00:00:00").getTime()) / 86400000) + 1
    : 1;

  // Running balance for this staff.
  const currentYear = date.getFullYear();
  const balance = balances.find((b) => b.staffId === staff.id && b.year === currentYear);
  const usedDays = useMemo(() => {
    const used = { pto: 0, sick: 0, fh: 0 };
    for (const e of yearEntries) {
      if (e.staffId !== staff.id) continue;
      const days = countEntryDays(e);
      if (e.status === "pto") used.pto += days;
      else if (e.status === "sick") used.sick += days;
      else if (e.status === "floating_holiday") used.fh += days;
    }
    return used;
  }, [yearEntries, staff.id]);
  const remaining = {
    pto: (balance?.ptoDaysAllotted ?? 10) - usedDays.pto,
    sick: (balance?.sickDaysAllotted ?? 5) - usedDays.sick,
    fh: (balance?.floatingHolidayDaysAllotted ?? 0) - usedDays.fh,
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent data-testid="dialog-edit-cell">
        <DialogHeader>
          <DialogTitle>{staff.name}</DialogTitle>
          <DialogDescription>
            {date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ScheduleStatus)}>
              <SelectTrigger className="mt-1" data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} data-testid={`option-status-${s}`}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {status === "scheduled" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start</Label>
                <Input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  data-testid="input-start"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">End</Label>
                <Input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  data-testid="input-end"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {isTimeOff && (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-[11px] space-y-0.5" data-testid="balance-summary">
              <div className="font-semibold text-foreground mb-1">Balance ({date.getFullYear()})</div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PTO</span>
                <span className={remaining.pto < 0 ? "text-destructive font-semibold" : "text-foreground"}>
                  {usedDays.pto} used / {balance?.ptoDaysAllotted ?? 10} allotted — <strong>{remaining.pto} left</strong>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sick</span>
                <span className={remaining.sick < 0 ? "text-destructive font-semibold" : "text-foreground"}>
                  {usedDays.sick} used / {balance?.sickDaysAllotted ?? 5} allotted — <strong>{remaining.sick} left</strong>
                </span>
              </div>
              {(balance?.floatingHolidayDaysAllotted ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Float Holiday</span>
                  <span className={remaining.fh < 0 ? "text-destructive font-semibold" : "text-foreground"}>
                    {usedDays.fh} used / {balance?.floatingHolidayDaysAllotted} allotted — <strong>{remaining.fh} left</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {isTimeOff && (
            <div>
              <Label className="text-xs">Through (end date for multi-day block)</Label>
              <Input
                type="date"
                value={endDateKey}
                min={dateKey}
                onChange={(e) => setEndDateKey(e.target.value || dateKey)}
                data-testid="input-end-date"
                className="mt-1"
              />
              {isMultiDay && (
                <p className="text-[10px] text-muted-foreground mt-1">{dayCount} calendar days</p>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Approved vacation"
              data-testid="input-note"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {existing && (
            <Button
              variant="ghost"
              onClick={() => onReset()}
              disabled={isDeleting || isSaving}
              data-testid="button-reset-override"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Reset to default
            </Button>
          )}
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-cell">Cancel</Button>
          <Button
            onClick={() =>
              onSave({
                staffId: staff.id,
                staffName: staff.name,
                date: dateKey,
                endDate: isTimeOff && endDateKey > dateKey ? endDateKey : undefined,
                status,
                start: status === "scheduled" ? start : undefined,
                end: status === "scheduled" ? end : undefined,
                note: note.trim() || undefined,
              })
            }
            disabled={isSaving || (status === "scheduled" && (!start || !end))}
            data-testid="button-save-cell"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Settings Dialog (defaults + hours) ─────────────────────────────────────

function SettingsDialog({
  open,
  onClose,
  siteId,
  roster,
  hours,
  defaults,
  balances,
  currentYear,
  onSaveBalance,
  entries,
}: {
  open: boolean;
  onClose: () => void;
  siteId: string;
  roster: StaffMember[];
  hours: PharmacyHours | null;
  defaults: StaffScheduleDefault[];
  balances: StaffTimeOffBalance[];
  currentYear: number;
  onSaveBalance: (payload: {
    staffId: string;
    staffName: string;
    year: number;
    ptoDaysAllotted: number;
    sickDaysAllotted: number;
    floatingHolidayDaysAllotted: number;
  }) => Promise<void>;
  entries: ScheduleEntry[];
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"defaults" | "hours" | "balances">("defaults");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="dialog-settings">
        <DialogHeader>
          <DialogTitle>Schedule Settings</DialogTitle>
          <DialogDescription>
            Manage default schedules, business hours, and time-off balances for your team.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 border-b mb-3">
          {(["defaults", "hours", "balances"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm border-b-2 ${tab === t ? "border-purple-600 text-purple-700" : "border-transparent text-muted-foreground"}`}
              data-testid={`tab-${t}`}
            >
              {t === "defaults" ? "Default Schedule" : t === "hours" ? "Business Hours" : "PTO Balances"}
            </button>
          ))}
        </div>

        {tab === "defaults" ? (
          <DefaultsEditor siteId={siteId} roster={roster} defaults={defaults} toast={toast} />
        ) : tab === "hours" ? (
          <HoursEditor siteId={siteId} hours={hours} toast={toast} />
        ) : (
          <BalancesEditor
            roster={roster}
            balances={balances}
            currentYear={currentYear}
            onSave={onSaveBalance}
            toast={toast}
            entries={entries}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-close-settings">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PATTERN_LABELS: Record<SchedulePattern, string> = {
  standard: "Standard (every week)",
  alternating_a: "Week A only (odd ISO weeks)",
  alternating_b: "Week B only (even ISO weeks)",
};

function DefaultsEditor({
  siteId,
  roster,
  defaults,
  toast,
}: {
  siteId: string;
  roster: StaffMember[];
  defaults: StaffScheduleDefault[];
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(roster[0]?.id ?? "");
  const selectedStaff = roster.find((s) => s.id === selectedStaffId);
  const existing = defaults.find((d) => d.staffId === selectedStaffId);

  const [weekdays, setWeekdays] = useState<Array<{ start: string; end: string } | null>>(() =>
    existing?.weekdays ?? [null, emptyShift(), emptyShift(), emptyShift(), emptyShift(), emptyShift(), null],
  );
  const [color, setColor] = useState<string>(existing?.color ?? DEFAULT_STAFF_COLORS[roster.findIndex(s => s.id === selectedStaffId) % DEFAULT_STAFF_COLORS.length] ?? "#7c3aed");
  const [schedulePattern, setSchedulePattern] = useState<SchedulePattern>(existing?.schedulePattern ?? "standard");

  // Re-seed when staff changes
  useEffect(() => {
    const e = defaults.find((d) => d.staffId === selectedStaffId);
    setWeekdays(
      e?.weekdays ?? [null, emptyShift(), emptyShift(), emptyShift(), emptyShift(), emptyShift(), null],
    );
    const idx = roster.findIndex(s => s.id === selectedStaffId);
    setColor(e?.color ?? DEFAULT_STAFF_COLORS[idx % DEFAULT_STAFF_COLORS.length] ?? "#7c3aed");
    setSchedulePattern(e?.schedulePattern ?? "standard");
  }, [selectedStaffId, defaults]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedStaff) throw new Error("Choose a staff member");
      return apiRequest(`/api/scheduling/${siteId}/defaults/${selectedStaff.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          staffId: selectedStaff.id,
          staffName: selectedStaff.name,
          weekdays,
          color,
          schedulePattern,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling", siteId, "defaults"] });
      toast({ title: "Default saved" });
    },
    onError: (err: any) => toast({ title: "Save failed", description: String(err?.message ?? err), variant: "destructive" }),
  });

  if (roster.length === 0) {
    return <p className="text-sm text-muted-foreground">No staff to configure.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <Label className="text-xs">Staff member</Label>
          <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
            <SelectTrigger className="mt-1" data-testid="select-default-staff">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roster.map((s) => (
                <SelectItem key={s.id} value={s.id} data-testid={`option-default-staff-${s.id}`}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="shrink-0">
          <Label className="text-xs block mb-1">Calendar color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 rounded border cursor-pointer"
              data-testid="input-staff-color"
            />
            <span className="text-xs text-muted-foreground font-mono">{color}</span>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs">Schedule pattern</Label>
        <Select value={schedulePattern} onValueChange={(v) => setSchedulePattern(v as SchedulePattern)}>
          <SelectTrigger className="mt-1" data-testid="select-schedule-pattern">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCHEDULE_PATTERNS.map((p) => (
              <SelectItem key={p} value={p} data-testid={`option-pattern-${p}`}>
                {PATTERN_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {schedulePattern !== "standard" && (
          <p className="text-[11px] text-muted-foreground mt-1">
            {schedulePattern === "alternating_a"
              ? "Staff works on odd ISO weeks (Week A). Even ISO weeks default to unscheduled."
              : "Staff works on even ISO weeks (Week B). Odd ISO weeks default to unscheduled."}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        {weekdays.map((shift, i) => {
          const enabled = !!shift;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-12 text-xs font-medium text-muted-foreground">{WEEKDAY_LABELS[i]}</div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) =>
                  setWeekdays((prev) => {
                    const copy = [...prev];
                    copy[i] = e.target.checked ? (prev[i] ?? emptyShift()) : null;
                    return copy;
                  })
                }
                data-testid={`checkbox-default-day-${i}`}
              />
              <Input
                type="time"
                disabled={!enabled}
                value={shift?.start ?? ""}
                onChange={(e) =>
                  setWeekdays((prev) => {
                    const copy = [...prev];
                    if (copy[i]) copy[i] = { ...copy[i]!, start: e.target.value };
                    return copy;
                  })
                }
                className="w-32"
                data-testid={`input-default-start-${i}`}
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="time"
                disabled={!enabled}
                value={shift?.end ?? ""}
                onChange={(e) =>
                  setWeekdays((prev) => {
                    const copy = [...prev];
                    if (copy[i]) copy[i] = { ...copy[i]!, end: e.target.value };
                    return copy;
                  })
                }
                className="w-32"
                data-testid={`input-default-end-${i}`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          data-testid="button-save-default"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
          Save default
        </Button>
      </div>
    </div>
  );
}

// ── Staff Defaults Dialog (click-to-edit from calendar) ────────────────────
// A standalone dialog wrapping the per-staff recurring schedule editor.
// Directors see a full editable form; non-editors see a read-only summary.

function StaffDefaultsDialog({
  open,
  onClose,
  siteId,
  staff,
  defaults,
  roster,
  canEdit,
}: {
  open: boolean;
  onClose: () => void;
  siteId: string;
  staff: StaffMember;
  defaults: StaffScheduleDefault[];
  roster: StaffMember[];
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const existing = defaults.find((d) => d.staffId === staff.id);
  const colorFallback = DEFAULT_STAFF_COLORS[roster.findIndex(s => s.id === staff.id) % DEFAULT_STAFF_COLORS.length] ?? "#7c3aed";

  const [weekdays, setWeekdays] = useState<Array<{ start: string; end: string } | null>>(
    () => existing?.weekdays ?? [null, emptyShift(), emptyShift(), emptyShift(), emptyShift(), emptyShift(), null],
  );
  const [color, setColor] = useState<string>(existing?.color ?? colorFallback);
  const [schedulePattern, setSchedulePattern] = useState<SchedulePattern>(existing?.schedulePattern ?? "standard");

  // Sync when defaults load or staff changes
  useEffect(() => {
    const e = defaults.find((d) => d.staffId === staff.id);
    setWeekdays(e?.weekdays ?? [null, emptyShift(), emptyShift(), emptyShift(), emptyShift(), emptyShift(), null]);
    const idx = roster.findIndex(s => s.id === staff.id);
    setColor(e?.color ?? DEFAULT_STAFF_COLORS[idx % DEFAULT_STAFF_COLORS.length] ?? "#7c3aed");
    setSchedulePattern(e?.schedulePattern ?? "standard");
  }, [staff.id, defaults]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/scheduling/${siteId}/defaults/${staff.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          staffId: staff.id,
          staffName: staff.name,
          weekdays,
          color,
          schedulePattern,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling", siteId, "defaults"] });
      toast({ title: "Recurring schedule saved" });
      onClose();
    },
    onError: (err: any) => toast({ title: "Save failed", description: String(err?.message ?? err), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saveMutation.isPending) onClose(); }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" data-testid="dialog-staff-defaults">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ background: color }}
            />
            {staff.name}
          </DialogTitle>
          <DialogDescription>
            {canEdit
              ? "Set the recurring weekly schedule for this staff member."
              : "Recurring schedule for this staff member (view only)."}
          </DialogDescription>
        </DialogHeader>

        {!canEdit ? (
          // Read-only summary
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Schedule pattern</div>
              <div className="text-sm">
                {PATTERN_LABELS[existing?.schedulePattern ?? "standard"]}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Default shifts</div>
              <div className="space-y-1">
                {WEEKDAY_LABELS.map((label, i) => {
                  const shift = existing?.weekdays?.[i] ?? null;
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-10 text-xs text-muted-foreground font-medium">{label}</span>
                      {shift
                        ? <span>{formatTime(shift.start)} – {formatTime(shift.end)}</span>
                        : <span className="text-muted-foreground italic text-xs">Off</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          // Editable form
          <div className="space-y-4">
            <div className="shrink-0">
              <Label className="text-xs block mb-1">Calendar color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                  data-testid="input-staff-defaults-color"
                />
                <span className="text-xs text-muted-foreground font-mono">{color}</span>
              </div>
            </div>

            <div>
              <Label className="text-xs">Schedule pattern</Label>
              <Select value={schedulePattern} onValueChange={(v) => setSchedulePattern(v as SchedulePattern)}>
                <SelectTrigger className="mt-1" data-testid="select-staff-defaults-pattern">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_PATTERNS.map((p) => (
                    <SelectItem key={p} value={p} data-testid={`option-staff-defaults-pattern-${p}`}>
                      {PATTERN_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {schedulePattern !== "standard" && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {schedulePattern === "alternating_a"
                    ? "Staff works on odd ISO weeks (Week A). Even ISO weeks default to unscheduled."
                    : "Staff works on even ISO weeks (Week B). Odd ISO weeks default to unscheduled."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              {weekdays.map((shift, i) => {
                const enabled = !!shift;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-12 text-xs font-medium text-muted-foreground">{WEEKDAY_LABELS[i]}</div>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) =>
                        setWeekdays((prev) => {
                          const copy = [...prev];
                          copy[i] = e.target.checked ? (prev[i] ?? emptyShift()) : null;
                          return copy;
                        })
                      }
                      data-testid={`checkbox-staff-defaults-day-${i}`}
                    />
                    <Input
                      type="time"
                      disabled={!enabled}
                      value={shift?.start ?? ""}
                      onChange={(e) =>
                        setWeekdays((prev) => {
                          const copy = [...prev];
                          if (copy[i]) copy[i] = { ...copy[i]!, start: e.target.value };
                          return copy;
                        })
                      }
                      className="w-32"
                      data-testid={`input-staff-defaults-start-${i}`}
                    />
                    <span className="text-muted-foreground text-xs">to</span>
                    <Input
                      type="time"
                      disabled={!enabled}
                      value={shift?.end ?? ""}
                      onChange={(e) =>
                        setWeekdays((prev) => {
                          const copy = [...prev];
                          if (copy[i]) copy[i] = { ...copy[i]!, end: e.target.value };
                          return copy;
                        })
                      }
                      className="w-32"
                      data-testid={`input-staff-defaults-end-${i}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending} data-testid="button-close-staff-defaults">
            {canEdit ? "Cancel" : "Close"}
          </Button>
          {canEdit && (
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid="button-save-staff-defaults"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Save schedule
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HoursEditor({
  siteId,
  hours,
  toast,
}: {
  siteId: string;
  hours: PharmacyHours | null;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const initial = useMemo<Array<{ open: string; close: string } | null>>(
    () =>
      hours?.weekdays ?? [
        null,
        { open: "08:00", close: "18:00" },
        { open: "08:00", close: "18:00" },
        { open: "08:00", close: "18:00" },
        { open: "08:00", close: "18:00" },
        { open: "08:00", close: "18:00" },
        null,
      ],
    [hours],
  );
  const [weekdays, setWeekdays] = useState(initial);
  const [holidayClosures, setHolidayClosures] = useState<string[]>(hours?.holidayClosures ?? []);
  const [newHolidayDate, setNewHolidayDate] = useState<string>("");

  useEffect(() => {
    setWeekdays(initial);
    setHolidayClosures(hours?.holidayClosures ?? []);
  }, [initial, hours]);

  const thisYear = new Date().getFullYear();
  const nextYear = thisYear + 1;

  const prefillFederalHolidays = () => {
    const existing = new Set(holidayClosures);
    const newDates = [
      ...federalHolidays(thisYear),
      ...federalHolidays(nextYear),
    ]
      .map((h) => h.date)
      .filter((d) => !existing.has(d));
    setHolidayClosures((prev) => [...prev, ...newDates].sort());
  };

  const addHolidayDate = () => {
    if (!newHolidayDate || !/^\d{4}-\d{2}-\d{2}$/.test(newHolidayDate)) return;
    if (!holidayClosures.includes(newHolidayDate)) {
      setHolidayClosures((prev) => [...prev, newHolidayDate].sort());
    }
    setNewHolidayDate("");
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/scheduling/${siteId}/hours`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, weekdays, holidayClosures }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling", siteId, "hours"] });
      toast({ title: "Hours saved" });
    },
    onError: (err: any) => toast({ title: "Save failed", description: String(err?.message ?? err), variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        {weekdays.map((day, i) => {
          const open = !!day;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-12 text-xs font-medium text-muted-foreground">{WEEKDAY_LABELS[i]}</div>
              <input
                type="checkbox"
                checked={open}
                onChange={(e) =>
                  setWeekdays((prev) => {
                    const copy = [...prev];
                    copy[i] = e.target.checked ? (prev[i] ?? { open: "08:00", close: "18:00" }) : null;
                    return copy;
                  })
                }
                data-testid={`checkbox-hours-day-${i}`}
              />
              <Input
                type="time"
                disabled={!open}
                value={day?.open ?? ""}
                onChange={(e) =>
                  setWeekdays((prev) => {
                    const copy = [...prev];
                    if (copy[i]) copy[i] = { ...copy[i]!, open: e.target.value };
                    return copy;
                  })
                }
                className="w-32"
                data-testid={`input-hours-open-${i}`}
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="time"
                disabled={!open}
                value={day?.close ?? ""}
                onChange={(e) =>
                  setWeekdays((prev) => {
                    const copy = [...prev];
                    if (copy[i]) copy[i] = { ...copy[i]!, close: e.target.value };
                    return copy;
                  })
                }
                className="w-32"
                data-testid={`input-hours-close-${i}`}
              />
            </div>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs">Holiday closures ({holidayClosures.length})</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={prefillFederalHolidays}
            type="button"
            data-testid="button-prefill-federal-holidays"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Pre-fill federal holidays
          </Button>
        </div>
        {holidayClosures.length > 0 && (
          <div className="mb-2 max-h-36 overflow-y-auto space-y-1 border rounded p-2">
            {holidayClosures.map((d) => {
              const holiday = [...federalHolidays(thisYear), ...federalHolidays(nextYear)].find(h => h.date === d);
              return (
                <div key={d} className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono">{d}</span>
                  {holiday && <span className="text-muted-foreground">{holiday.name}</span>}
                  <button
                    type="button"
                    onClick={() => setHolidayClosures((prev) => prev.filter((x) => x !== d))}
                    className="text-muted-foreground hover:text-destructive"
                    data-testid={`button-remove-holiday-${d}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            type="date"
            value={newHolidayDate}
            onChange={(e) => setNewHolidayDate(e.target.value)}
            data-testid="input-new-holiday-date"
            className="flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={addHolidayDate}
            disabled={!newHolidayDate}
            type="button"
            data-testid="button-add-holiday"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          data-testid="button-save-hours"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
          Save hours
        </Button>
      </div>
    </div>
  );
}

// ── Balances Editor ─────────────────────────────────────────────────────────

function BalancesEditor({
  roster,
  balances,
  currentYear,
  onSave,
  toast,
  entries,
}: {
  roster: StaffMember[];
  balances: StaffTimeOffBalance[];
  currentYear: number;
  onSave: (payload: {
    staffId: string;
    staffName: string;
    year: number;
    ptoDaysAllotted: number;
    sickDaysAllotted: number;
    floatingHolidayDaysAllotted: number;
  }) => Promise<void>;
  toast: ReturnType<typeof useToast>["toast"];
  entries: ScheduleEntry[];
}) {
  const makeEdits = () => {
    const out: Record<string, { pto: number; sick: number; fh: number }> = {};
    for (const s of roster) {
      const b = balances.find((b) => b.staffId === s.id && b.year === currentYear);
      out[s.id] = { pto: b?.ptoDaysAllotted ?? 10, sick: b?.sickDaysAllotted ?? 5, fh: b?.floatingHolidayDaysAllotted ?? 0 };
    }
    return out;
  };

  // Track unsaved edits per staff. Initialize from server data.
  const [edits, setEdits] = useState<Record<string, { pto: number; sick: number; fh: number }>>(makeEdits);
  const [saving, setSaving] = useState<string | null>(null);

  // Re-sync when server data arrives (avoids silent overwrite of real balances).
  useEffect(() => {
    setEdits(makeEdits());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balances, currentYear, roster.length]);

  // Compute used days from entries for the current year.
  const usedByStaff = useMemo(() => {
    const used: Record<string, { pto: number; sick: number; fh: number }> = {};
    for (const s of roster) {
      used[s.id] = { pto: 0, sick: 0, fh: 0 };
    }
    for (const entry of entries) {
      const u = used[entry.staffId];
      if (!u) continue;
      // Only count entries in the current year.
      if (!entry.date.startsWith(String(currentYear))) continue;
      const days = countEntryDays(entry);
      if (entry.status === "pto") u.pto += days;
      else if (entry.status === "sick") u.sick += days;
      else if (entry.status === "floating_holiday") u.fh += days;
    }
    return used;
  }, [entries, roster, currentYear]);

  if (roster.length === 0) {
    return <p className="text-sm text-muted-foreground">No staff to configure.</p>;
  }

  const handleSave = async (staff: StaffMember) => {
    const e = edits[staff.id];
    if (!e) return;
    setSaving(staff.id);
    try {
      await onSave({
        staffId: staff.id,
        staffName: staff.name,
        year: currentYear,
        ptoDaysAllotted: e.pto,
        sickDaysAllotted: e.sick,
        floatingHolidayDaysAllotted: e.fh,
      });
      toast({ title: `Balance saved for ${staff.name}` });
    } catch (err: any) {
      toast({ title: "Save failed", description: String(err?.message ?? err), variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Set annual PTO, sick, and floating holiday day allotments for each staff member for {currentYear}.
      </p>
      <div className="space-y-2">
        {roster.map((staff) => {
          const e = edits[staff.id] ?? { pto: 10, sick: 5, fh: 0 };
          const u = usedByStaff[staff.id] ?? { pto: 0, sick: 0, fh: 0 };
          const isSaving = saving === staff.id;
          return (
            <div key={staff.id} className="rounded border p-3 space-y-2">
              <div className="text-sm font-medium">{staff.name}</div>
              {/* Used-days summary row */}
              <div className="flex gap-4 text-[11px] text-muted-foreground">
                <span>PTO: <strong className="text-foreground">{u.pto}</strong> / {e.pto} used</span>
                <span>Sick: <strong className="text-foreground">{u.sick}</strong> / {e.sick} used</span>
                <span>Float: <strong className="text-foreground">{u.fh}</strong> / {e.fh} used</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">PTO allotted</Label>
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    value={e.pto}
                    onChange={(ev) => setEdits((prev) => ({ ...prev, [staff.id]: { ...e, pto: parseInt(ev.target.value, 10) || 0 } }))}
                    className="mt-1"
                    data-testid={`input-pto-days-${staff.id}`}
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Sick allotted</Label>
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    value={e.sick}
                    onChange={(ev) => setEdits((prev) => ({ ...prev, [staff.id]: { ...e, sick: parseInt(ev.target.value, 10) || 0 } }))}
                    className="mt-1"
                    data-testid={`input-sick-days-${staff.id}`}
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Float. holiday</Label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={e.fh}
                    onChange={(ev) => setEdits((prev) => ({ ...prev, [staff.id]: { ...e, fh: parseInt(ev.target.value, 10) || 0 } }))}
                    className="mt-1"
                    data-testid={`input-fh-days-${staff.id}`}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSave(staff)}
                  disabled={!!saving}
                  data-testid={`button-save-balance-${staff.id}`}
                >
                  {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Month Grid ─────────────────────────────────────────────────────────────

const TIME_OFF_STATUSES: ScheduleStatus[] = ["pto", "sick", "floating_holiday"];

// ── Month Event Bar layout helpers ─────────────────────────────────────────

type CalEventBar = {
  entry: ScheduleEntry;
  staffName: string;
  color: string;
  startCol: number; // 0–6 within the week
  endCol: number;   // 0–6 within the week
  row: number;      // layout row (0-indexed, for vertical stacking)
  isStart: boolean; // true if the real start is within this week
  isEnd: boolean;   // true if the real end is within this week
};

function layoutWeekEvents(
  week: Date[],
  events: Array<{ entry: ScheduleEntry; staffName: string; color: string }>,
): CalEventBar[] {
  const weekStartKey = toDateKey(week[0]);
  const weekEndKey = toDateKey(week[6]);

  const bars: Omit<CalEventBar, "row">[] = [];
  for (const ev of events) {
    const entryStart = ev.entry.date;
    const entryEnd = ev.entry.endDate ?? ev.entry.date;
    if (entryStart > weekEndKey || entryEnd < weekStartKey) continue;
    const clippedStart = entryStart > weekStartKey ? entryStart : weekStartKey;
    const clippedEnd = entryEnd < weekEndKey ? entryEnd : weekEndKey;
    const startCol = week.findIndex((d) => toDateKey(d) === clippedStart);
    const endCol = week.findIndex((d) => toDateKey(d) === clippedEnd);
    if (startCol === -1 || endCol === -1) continue;
    bars.push({
      entry: ev.entry,
      staffName: ev.staffName,
      color: ev.color,
      startCol,
      endCol,
      isStart: entryStart >= weekStartKey,
      isEnd: entryEnd <= weekEndKey,
    });
  }

  // Greedy first-fit layout — assign each bar to the first row with no overlap.
  const rowOccupancy: Array<Array<{ s: number; e: number }>> = [];
  const result: CalEventBar[] = [];
  for (const bar of bars) {
    let row = 0;
    while (true) {
      const occ = rowOccupancy[row] ?? [];
      const conflict = occ.some((o) => o.s <= bar.endCol && o.e >= bar.startCol);
      if (!conflict) {
        if (!rowOccupancy[row]) rowOccupancy[row] = [];
        rowOccupancy[row].push({ s: bar.startCol, e: bar.endCol });
        break;
      }
      row++;
    }
    result.push({ ...bar, row });
  }
  return result;
}

function MonthGrid({
  monthAnchor,
  days,
  roster,
  hours,
  defaults,
  entries,
  onPickDay,
  onQuickCreate,
  canEdit,
  onEditDefaults,
}: {
  monthAnchor: Date;
  days: Date[];
  roster: StaffMember[];
  hours: PharmacyHours | null;
  defaults: StaffScheduleDefault[];
  entries: ScheduleEntry[];
  onPickDay: (d: Date) => void;
  onQuickCreate: (d: Date) => void;
  canEdit: boolean;
  onEditDefaults?: (staff: StaffMember) => void;
}) {
  const currentMonth = monthAnchor.getMonth();
  const todayKey = toDateKey(new Date());

  // Group into weeks (7-day rows).
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  // Build time-off event descriptors from entries.
  const timeOffEvents = useMemo(
    () =>
      entries
        .filter((e) => TIME_OFF_STATUSES.includes(e.status))
        .map((entry) => {
          const staff = roster.find((s) => s.id === entry.staffId);
          if (!staff) return null;
          return { entry, staffName: staff.name, color: getStaffColor(entry.staffId, defaults, roster) };
        })
        .filter(Boolean) as Array<{ entry: ScheduleEntry; staffName: string; color: string }>,
    [entries, roster, defaults],
  );

  const EVENT_H = 20; // px height per event bar row
  const CELL_TOP = 28; // px reserved for date number at top
  const MAX_BAR_ROWS = 4; // max event rows to avoid infinite expansion

  return (
    <div className="p-2" data-testid="grid-month">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-px">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-center py-1.5 border border-border"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, wi) => {
        const bars = layoutWeekEvents(week, timeOffEvents);
        const usedRows = bars.length > 0 ? Math.min(Math.max(...bars.map((b) => b.row)) + 1, MAX_BAR_ROWS) : 0;
        const cellMinH = CELL_TOP + usedRows * EVENT_H + 24; // 24px for scheduled count at bottom

        return (
          <div key={wi} className="relative grid grid-cols-7" style={{ minHeight: cellMinH }}>
            {/* Day cells (background layer) */}
            {week.map((d, ci) => {
              const dateKey = toDateKey(d);
              const inMonth = d.getMonth() === currentMonth;
              const isToday = dateKey === todayKey;
              const closed =
                hours?.weekdays?.[d.getDay()] === null ||
                (hours?.holidayClosures ?? []).includes(dateKey);
              // Count scheduled staff for bottom indicator.
              let scheduled = 0;
              for (const s of roster) {
                if (computeEffective(d, s.id, defaults, entries).status === "scheduled") scheduled++;
              }

              return (
                <div
                  key={dateKey}
                  className={`relative border border-border bg-background flex flex-col ${inMonth ? "" : "opacity-50"}`}
                  style={{ minHeight: cellMinH }}
                  data-testid={`cell-month-day-${dateKey}`}
                >
                  {/* Date header row */}
                  <div className="flex items-center justify-between px-1.5 pt-1 shrink-0" style={{ height: CELL_TOP }}>
                    <span
                      className={`text-xs font-semibold ${isToday ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-600 text-white" : "text-foreground"}`}
                    >
                      {d.getDate()}
                    </span>
                    <div className="flex items-center gap-1">
                      {closed && <span className="text-[9px] italic text-muted-foreground">Closed</span>}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onQuickCreate(d); }}
                          className="text-muted-foreground hover:text-purple-600 transition-colors p-0.5"
                          title="Add time-off"
                          data-testid={`button-quick-create-${dateKey}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Spacer for event bar rows */}
                  <div style={{ height: usedRows * EVENT_H }} className="shrink-0" />

                  {/* Bottom: scheduled count + click-to-view */}
                  <button
                    type="button"
                    onClick={() => onPickDay(d)}
                    className="flex-1 flex items-end px-1.5 pb-1 text-left w-full hover-elevate"
                    aria-label={`View ${dateKey} schedule`}
                  >
                    {scheduled > 0 ? (
                      <span
                        className="text-[10px] text-muted-foreground"
                        title={`${scheduled} staff scheduled`}
                        data-testid={`text-scheduled-count-${dateKey}`}
                      >
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 align-middle" />
                        {scheduled} in
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50 italic">empty</span>
                    )}
                  </button>
                </div>
              );
            })}

            {/* Event bars overlay (absolutely positioned over the cells) */}
            <div className="absolute inset-0 pointer-events-none" style={{ top: CELL_TOP }}>
              {bars.map((bar) => {
                if (bar.row >= MAX_BAR_ROWS) return null;
                const leftPct = (bar.startCol / 7) * 100;
                const widthPct = ((bar.endCol - bar.startCol + 1) / 7) * 100;
                const topPx = bar.row * EVENT_H + 2;
                const statusLabel = bar.entry.status === "pto" ? "PTO" : bar.entry.status === "sick" ? "Sick" : "FH";
                const barStaff = roster.find((s) => s.id === bar.entry.staffId);
                return (
                  <button
                    key={`${bar.entry.staffId}-${bar.entry.date}-${wi}`}
                    type="button"
                    className="absolute flex items-center text-white text-[10px] font-medium pointer-events-auto cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
                    style={{
                      left: `${leftPct}%`,
                      width: `calc(${widthPct}% - 2px)`,
                      top: topPx,
                      height: EVENT_H - 4,
                      background: bar.color,
                      borderRadius: `${bar.isStart ? 4 : 0}px ${bar.isEnd ? 4 : 0}px ${bar.isEnd ? 4 : 0}px ${bar.isStart ? 4 : 0}px`,
                      paddingLeft: bar.isStart ? 6 : 2,
                      marginLeft: 1,
                    }}
                    title={`${bar.staffName} — ${STATUS_LABEL[bar.entry.status]}${bar.entry.note ? `: ${bar.entry.note}` : ""}${onEditDefaults ? " (click to view schedule)" : ""}`}
                    onClick={(e) => { e.stopPropagation(); if (barStaff && onEditDefaults) onEditDefaults(barStaff); }}
                    data-testid={`bar-timeoff-${bar.entry.staffId}-${bar.entry.date}-w${wi}`}
                  >
                    {bar.isStart && (
                      <span className="truncate select-none">
                        {bar.staffName.split(" ")[0]} · {statusLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="mt-2 text-[11px] text-muted-foreground">
        Click a day to view all staff • <span className="font-medium">+</span> to add time-off quickly.
      </p>
    </div>
  );
}

// ── Day Detail Dialog (month view) ─────────────────────────────────────────

function DayDetailDialog({
  open,
  onClose,
  date,
  roster,
  defaults,
  entries,
  canEdit,
  onEditStaff,
  onEditDefaults,
}: {
  open: boolean;
  onClose: () => void;
  date: Date;
  roster: StaffMember[];
  defaults: StaffScheduleDefault[];
  entries: ScheduleEntry[];
  canEdit: boolean;
  onEditStaff: (staff: StaffMember) => void;
  onEditDefaults?: (staff: StaffMember) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg" data-testid="dialog-day-detail">
        <DialogHeader>
          <DialogTitle>
            {date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </DialogTitle>
          <DialogDescription>
            Click any staff row to view their recurring schedule.
            {canEdit ? " Use the + icon to edit today's shift override." : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 max-h-[55vh] overflow-y-auto">
          {roster.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff to show.</p>
          ) : (
            roster.map((staff) => {
              const cell = computeEffective(date, staff.id, defaults, entries);
              // All roles can click the row to open recurring schedule (read-only for non-editors).
              // Directors additionally get a small pencil button to edit today's shift override.
              return (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => onEditDefaults ? onEditDefaults(staff) : undefined}
                  className="w-full flex items-center justify-between gap-3 rounded border px-3 py-2 text-left hover-elevate active-elevate-2"
                  data-testid={`row-day-staff-${staff.id}`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{staff.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {staff.roles.map((r) => r.replace(/_/g, " ")).join(", ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {cell.status === "scheduled" && cell.start && cell.end && (
                      <span className="text-[11px] text-muted-foreground">
                        {formatTime(cell.start)} – {formatTime(cell.end)}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium border ${STATUS_BADGE_CLASS[cell.status]}`}
                    >
                      {STATUS_LABEL[cell.status]}
                    </Badge>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEditStaff(staff); }}
                        className="p-0.5 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        title="Edit today's shift"
                        data-testid={`btn-edit-shift-${staff.id}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-close-day-detail">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ── Submission Banner ──────────────────────────────────────────────────────

const SUBMISSION_STATUS_STYLE: Record<
  "pending" | "approved" | "changes_requested",
  { label: string; cls: string; Icon: typeof CheckCircle2 }
> = {
  pending: {
    label: "Pending RPD review",
    cls: "bg-amber-50 border-amber-200 text-amber-900",
    Icon: AlertCircle,
  },
  approved: {
    label: "Approved",
    cls: "bg-emerald-50 border-emerald-200 text-emerald-900",
    Icon: CheckCircle2,
  },
  changes_requested: {
    label: "Changes requested",
    cls: "bg-rose-50 border-rose-200 text-rose-900",
    Icon: AlertCircle,
  },
};

// ── Submission history ─────────────────────────────────────────────────────
function SubmissionHistory({ submissions }: { submissions: ScheduleSubmission[] }) {
  const [open, setOpen] = useState(false);
  if (submissions.length === 0) return null;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <Card data-testid="card-submission-history">
      <CardHeader className="py-3">
        <button
          type="button"
          className="flex items-center justify-between gap-2 w-full text-left"
          onClick={() => setOpen((o) => !o)}
          data-testid="button-toggle-submission-history"
        >
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Submission history ({submissions.length})
          </CardTitle>
          <span className="text-xs text-muted-foreground">{open ? "Hide" : "Show"}</span>
        </button>
      </CardHeader>
      {open && (
        <CardContent className="pt-0 space-y-2">
          {submissions.map((s) => {
            const meta = SUBMISSION_STATUS_STYLE[s.status];
            return (
              <div
                key={s.id}
                className={`rounded-md border px-3 py-2 text-xs ${meta.cls}`}
                data-testid={`row-submission-${s.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">
                    Week of{" "}
                    {new Date(`${s.weekStart}T00:00:00`).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <div className="inline-flex items-center gap-1 font-medium">
                    <meta.Icon className="w-3.5 h-3.5" />
                    {meta.label}
                  </div>
                </div>
                <div className="mt-0.5">
                  Submitted by {s.submittedByName} · {fmt(s.submittedAt)}
                  {s.reviewedAt && (
                    <> · Reviewed by {s.reviewedByName ?? "—"} · {fmt(s.reviewedAt)}</>
                  )}
                </div>
                {s.submitterNote && (
                  <div className="mt-0.5">
                    <span className="font-medium">PD note:</span> {s.submitterNote}
                  </div>
                )}
                {s.reviewNote && (
                  <div className="mt-0.5">
                    <span className="font-medium">Reviewer note:</span> {s.reviewNote}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

function SubmissionBanner({
  submission,
  isPD,
  isReviewer,
  weekLabel,
  onSubmitClick,
  onApproveClick,
  onRequestChangesClick,
  isWorking,
}: {
  submission: ScheduleSubmission | null;
  isPD: boolean;
  isReviewer: boolean;
  weekLabel: string;
  onSubmitClick: () => void;
  onApproveClick: () => void;
  onRequestChangesClick: () => void;
  isWorking: boolean;
}) {
  if (!submission) {
    if (!isPD) return null;
    return (
      <Card data-testid="card-submission-banner">
        <CardContent className="py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            This week's schedule has not been submitted to your Regional Director yet.
          </div>
          <Button
            size="sm"
            onClick={onSubmitClick}
            disabled={isWorking}
            data-testid="button-submit-schedule"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Submit week to RPD
          </Button>
        </CardContent>
      </Card>
    );
  }

  const meta = SUBMISSION_STATUS_STYLE[submission.status];
  const Icon = meta.Icon;
  const submittedAt = new Date(submission.submittedAt).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
  const reviewedAt = submission.reviewedAt
    ? new Date(submission.reviewedAt).toLocaleString(undefined, {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      })
    : null;

  return (
    <Card className={`border ${meta.cls}`} data-testid="card-submission-banner">
      <CardContent className="py-3 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold" data-testid="text-submission-status">
                {meta.label} — week of {weekLabel}
              </div>
              <div className="text-xs opacity-80">
                Submitted by {submission.submittedByName} · {submittedAt}
                {reviewedAt && (
                  <>
                    {" "}· Reviewed by {submission.reviewedByName ?? "—"} · {reviewedAt}
                  </>
                )}
              </div>
              {submission.submitterNote && (
                <div className="text-xs mt-1" data-testid="text-submitter-note">
                  <span className="font-medium">PD note:</span> {submission.submitterNote}
                </div>
              )}
              {submission.reviewNote && (
                <div className="text-xs mt-1" data-testid="text-review-note">
                  <span className="font-medium">Reviewer note:</span> {submission.reviewNote}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isReviewer && submission.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRequestChangesClick}
                  disabled={isWorking}
                  data-testid="button-request-changes"
                >
                  Request changes
                </Button>
                <Button
                  size="sm"
                  onClick={onApproveClick}
                  disabled={isWorking}
                  data-testid="button-approve-submission"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Approve
                </Button>
              </>
            )}
            {isPD && submission.status !== "pending" && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSubmitClick}
                disabled={isWorking}
                data-testid="button-resubmit-schedule"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Resubmit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Submit-for-Review Dialog (PD) ──────────────────────────────────────────

function SubmitForReviewDialog({
  open,
  onClose,
  weekLabel,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  weekLabel: string;
  isSubmitting: boolean;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isSubmitting) onClose(); }}>
      <DialogContent data-testid="dialog-submit-review">
        <DialogHeader>
          <DialogTitle>Submit week to Regional Director</DialogTitle>
          <DialogDescription>
            Send the schedule for the week of {weekLabel} to your RPD for review.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label className="text-xs">Note for the reviewer (optional)</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything the RPD should know — coverage gaps, PTO requests, swaps…"
            className="mt-1"
            rows={4}
            data-testid="input-submitter-note"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} data-testid="button-cancel-submit">
            Cancel
          </Button>
          <Button onClick={() => onSubmit(note.trim())} disabled={isSubmitting} data-testid="button-confirm-submit">
            {isSubmitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Submit for review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Review Dialog (RPD/CPO) ────────────────────────────────────────────────

function ReviewSubmissionDialog({
  open,
  mode,
  onClose,
  submission,
  isWorking,
  onConfirm,
}: {
  open: boolean;
  mode: "approve" | "request-changes";
  onClose: () => void;
  submission: ScheduleSubmission;
  isWorking: boolean;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const isApprove = mode === "approve";
  const noteRequired = !isApprove;
  const canConfirm = !noteRequired || note.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isWorking) onClose(); }}>
      <DialogContent data-testid="dialog-review-submission">
        <DialogHeader>
          <DialogTitle>
            {isApprove ? "Approve schedule" : "Request changes"}
          </DialogTitle>
          <DialogDescription>
            {submission.siteName} — submitted by {submission.submittedByName}.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label className="text-xs">
            {isApprove ? "Note for the PD (optional)" : "Tell the PD what to change"}
            {noteRequired && <span className="text-rose-600"> *</span>}
          </Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isApprove
              ? "e.g. Looks great — thanks for getting this in early."
              : "e.g. Please add coverage for Tuesday afternoon and swap Anh's PTO request to Thursday."}
            className="mt-1"
            rows={4}
            data-testid="input-review-note"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isWorking} data-testid="button-cancel-review">
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(note.trim())}
            disabled={isWorking || !canConfirm}
            data-testid={isApprove ? "button-confirm-approve" : "button-confirm-request-changes"}
          >
            {isWorking && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {isApprove ? "Approve" : "Send change request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
