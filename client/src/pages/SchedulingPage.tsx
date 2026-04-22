import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/App";
import { getUserProfile, isPharmacyDirector, isDirectorRole } from "@/lib/userProfile";
import { loadRoster, type StaffMember } from "@/lib/taskStorage";
import {
  type PharmacyHours,
  type StaffScheduleDefault,
  type ScheduleEntry,
  type ScheduleStatus,
  SCHEDULE_STATUSES,
} from "@shared/schema";
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
} from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
};

function computeEffective(
  date: Date,
  staffId: string,
  defaults: StaffScheduleDefault[],
  entries: ScheduleEntry[],
): EffectiveCell {
  const dateKey = toDateKey(date);
  const dow = date.getDay();
  const override = entries.find((e) => e.staffId === staffId && e.date === dateKey);
  if (override) {
    return {
      status: override.status,
      start: override.start,
      end: override.end,
      fromDefault: false,
      hasOverride: true,
    };
  }
  const def = defaults.find((d) => d.staffId === staffId);
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

  const entriesQuery = useQuery<ScheduleEntry[]>({
    queryKey: ["/api/scheduling", siteId, "entries", fromKey, toKey],
    queryFn: async () =>
      apiRequest(`/api/scheduling/${siteId}/entries?from=${fromKey}&to=${toKey}`),
    enabled: !!siteId,
  });

  const upsertEntryMutation = useMutation({
    mutationFn: (payload: {
      staffId: string;
      staffName: string;
      date: string;
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
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling", siteId, "entries", fromKey, toKey] });
    },
    onError: (err: any) => toast({ title: "Save failed", description: String(err?.message ?? err), variant: "destructive" }),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (payload: { staffId: string; date: string }) =>
      apiRequest(`/api/scheduling/${siteId}/entries/${payload.staffId}/${payload.date}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling", siteId, "entries", fromKey, toKey] });
    },
    onError: (err: any) => toast({ title: "Reset failed", description: String(err?.message ?? err), variant: "destructive" }),
  });

  // ── Cell editor dialog ───────────────────────────────────────────────────
  const [editing, setEditing] = useState<{ staff: StaffMember; date: Date } | null>(null);

  // ── Day detail dialog (month view) ───────────────────────────────────────
  const [dayDetail, setDayDetail] = useState<Date | null>(null);

  // ── Settings dialog (defaults + hours) ───────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);

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

      {/* Week / Month navigator */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3 flex-wrap">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {viewMode === "week"
              ? `Week of ${weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
              : monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
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
              canEdit={canEdit}
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
                        <div className="font-medium" data-testid={`text-staff-name-${staff.id}`}>{staff.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {staff.roles.map((r) => r.replace(/_/g, " ")).join(", ")}
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
          existing={(entriesQuery.data ?? []).find(
            (e) => e.staffId === editing.staff.id && e.date === toDateKey(editing.date),
          )}
          defaults={defaultsQuery.data ?? []}
          isSaving={upsertEntryMutation.isPending}
          isDeleting={deleteEntryMutation.isPending}
          onSave={async (payload) => {
            await upsertEntryMutation.mutateAsync(payload);
            setEditing(null);
            toast({ title: "Schedule updated" });
          }}
          onReset={async () => {
            await deleteEntryMutation.mutateAsync({
              staffId: editing.staff.id,
              date: toDateKey(editing.date),
            });
            setEditing(null);
            toast({ title: "Override removed", description: "Reverted to default schedule." });
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
        />
      )}
    </div>
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
  isSaving: boolean;
  isDeleting: boolean;
  onSave: (payload: {
    staffId: string;
    staffName: string;
    date: string;
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

          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Covering for Anh"
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
}: {
  open: boolean;
  onClose: () => void;
  siteId: string;
  roster: StaffMember[];
  hours: PharmacyHours | null;
  defaults: StaffScheduleDefault[];
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"defaults" | "hours">("defaults");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="dialog-settings">
        <DialogHeader>
          <DialogTitle>Defaults &amp; Hours</DialogTitle>
          <DialogDescription>
            Set the recurring weekly schedule for each staff member and the pharmacy's business hours.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 border-b mb-3">
          <button
            type="button"
            onClick={() => setTab("defaults")}
            className={`px-3 py-1.5 text-sm border-b-2 ${tab === "defaults" ? "border-purple-600 text-purple-700" : "border-transparent text-muted-foreground"}`}
            data-testid="tab-defaults"
          >
            Default Schedule
          </button>
          <button
            type="button"
            onClick={() => setTab("hours")}
            className={`px-3 py-1.5 text-sm border-b-2 ${tab === "hours" ? "border-purple-600 text-purple-700" : "border-transparent text-muted-foreground"}`}
            data-testid="tab-hours"
          >
            Business Hours
          </button>
        </div>

        {tab === "defaults" ? (
          <DefaultsEditor siteId={siteId} roster={roster} defaults={defaults} toast={toast} />
        ) : (
          <HoursEditor siteId={siteId} hours={hours} toast={toast} />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-close-settings">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

  // Re-seed when staff changes
  useEffect(() => {
    const e = defaults.find((d) => d.staffId === selectedStaffId);
    setWeekdays(
      e?.weekdays ?? [null, emptyShift(), emptyShift(), emptyShift(), emptyShift(), emptyShift(), null],
    );
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
    <div className="space-y-3">
      <div>
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
  const [holidayCsv, setHolidayCsv] = useState((hours?.holidayClosures ?? []).join(", "));

  useEffect(() => {
    setWeekdays(initial);
    setHolidayCsv((hours?.holidayClosures ?? []).join(", "));
  }, [initial, hours]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const holidayClosures = holidayCsv
        .split(",")
        .map((s) => s.trim())
        .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
      return apiRequest(`/api/scheduling/${siteId}/hours`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, weekdays, holidayClosures }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling", siteId, "hours"] });
      toast({ title: "Hours saved" });
    },
    onError: (err: any) => toast({ title: "Save failed", description: String(err?.message ?? err), variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
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
        <Label className="text-xs">Holiday closures (YYYY-MM-DD, comma-separated)</Label>
        <Input
          value={holidayCsv}
          onChange={(e) => setHolidayCsv(e.target.value)}
          placeholder="2026-12-25, 2027-01-01"
          data-testid="input-holiday-closures"
          className="mt-1"
        />
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

// ── Month Grid ─────────────────────────────────────────────────────────────

function MonthGrid({
  monthAnchor,
  days,
  roster,
  hours,
  defaults,
  entries,
  onPickDay,
  canEdit,
}: {
  monthAnchor: Date;
  days: Date[];
  roster: StaffMember[];
  hours: PharmacyHours | null;
  defaults: StaffScheduleDefault[];
  entries: ScheduleEntry[];
  onPickDay: (d: Date) => void;
  canEdit: boolean;
}) {
  const currentMonth = monthAnchor.getMonth();
  const todayKey = toDateKey(new Date());

  return (
    <div className="p-2">
      <div className="grid grid-cols-7 gap-px bg-border rounded overflow-hidden border" data-testid="grid-month">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-center py-1.5"
          >
            {label}
          </div>
        ))}
        {days.map((d) => {
          const dateKey = toDateKey(d);
          const inMonth = d.getMonth() === currentMonth;
          const isToday = dateKey === todayKey;
          const closed =
            hours?.weekdays?.[d.getDay()] === null ||
            (hours?.holidayClosures ?? []).includes(dateKey);

          // Per-day staff status counts
          let scheduled = 0;
          let off = 0; // sick/pto/floating_holiday
          const scheduledNames: string[] = [];
          const offEntries: { name: string; status: ScheduleStatus }[] = [];
          for (const staff of roster) {
            const cell = computeEffective(d, staff.id, defaults, entries);
            if (cell.status === "scheduled") {
              scheduled++;
              scheduledNames.push(staff.name);
            } else if (cell.status !== "unscheduled") {
              off++;
              offEntries.push({ name: staff.name, status: cell.status });
            }
          }

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onPickDay(d)}
              className={`relative bg-background min-h-[88px] p-1.5 text-left hover-elevate active-elevate-2 ${inMonth ? "" : "opacity-50"}`}
              data-testid={`cell-month-day-${dateKey}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold ${isToday ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-600 text-white" : "text-foreground"}`}
                >
                  {d.getDate()}
                </span>
                {closed && (
                  <span className="text-[9px] italic text-muted-foreground">Closed</span>
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {scheduled > 0 && (
                  <div
                    className="text-[10px] truncate"
                    title={scheduledNames.join(", ")}
                    data-testid={`text-scheduled-count-${dateKey}`}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 align-middle" />
                    {scheduled} scheduled
                  </div>
                )}
                {off > 0 && (
                  <div className="text-[10px] truncate text-muted-foreground" data-testid={`text-off-count-${dateKey}`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 align-middle" />
                    {off} off
                  </div>
                )}
                {scheduled === 0 && off === 0 && (
                  <div className="text-[10px] text-muted-foreground italic">No staff set</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Click any day to view or edit each staff member's schedule.
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
}: {
  open: boolean;
  onClose: () => void;
  date: Date;
  roster: StaffMember[];
  defaults: StaffScheduleDefault[];
  entries: ScheduleEntry[];
  canEdit: boolean;
  onEditStaff: (staff: StaffMember) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg" data-testid="dialog-day-detail">
        <DialogHeader>
          <DialogTitle>
            {date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </DialogTitle>
          <DialogDescription>
            {canEdit
              ? "Click any staff member to edit their schedule for this day."
              : "Schedule for this day (view only)."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 max-h-[55vh] overflow-y-auto">
          {roster.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff to show.</p>
          ) : (
            roster.map((staff) => {
              const cell = computeEffective(date, staff.id, defaults, entries);
              const inner = (
                <>
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
                  </div>
                </>
              );
              return canEdit ? (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => onEditStaff(staff)}
                  className="w-full flex items-center justify-between gap-3 rounded border px-3 py-2 text-left hover-elevate active-elevate-2"
                  data-testid={`row-day-staff-${staff.id}`}
                >
                  {inner}
                </button>
              ) : (
                <div
                  key={staff.id}
                  className="w-full flex items-center justify-between gap-3 rounded border px-3 py-2 text-left"
                  data-testid={`row-day-staff-${staff.id}`}
                >
                  {inner}
                </div>
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
