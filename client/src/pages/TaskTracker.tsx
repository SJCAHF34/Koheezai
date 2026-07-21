import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/App";
import { getUserProfile, isCPO, isRegionalOrAbove, getAssignedRegion } from "@/lib/userProfile";
import {
  loadAllCustomTasksForRole,
  loadAllCompletionsRaw,
  loadDeletedCustomTasksForRole,
  softDeleteCustomTask,
  reinstateCustomTask,
  purgeDeletedTask,
  getPeriodKey,
  type CustomTask,
  type DeletedCustomTask,
  type TaskCompletion,
} from "@/lib/taskStorage";
import { STORE_REGIONS } from "@/lib/storeDirectory";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Globe,
  MapPin,
  Store,
  RefreshCw,
  ClipboardList,
  Pencil,
  Trash2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import type { PharmacyTask } from "@/lib/taskData";

// ── Constants ─────────────────────────────────────────────────────────────────
const ALL_STORE_IDS = STORE_REGIONS.flatMap((r) => r.stores.map((s) => s.id));

function normalizeScope(scope: string | undefined): "site" | "regional" | "national" {
  if (scope === "national") return "national";
  if (scope === "regional") return "regional";
  return "site";
}

const FREQ_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  biannual: "Biennial",
  one_time: "One-Time",
};

const CATEGORY_LABELS: Record<string, string> = {
  operations: "Operations",
  achc: "ACHC",
  state_board: "State Board",
  retention: "Retention",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getStoreIdsForRegion(region: string): string[] {
  return STORE_REGIONS.find((r) => r.region === region)?.stores.map((s) => s.id) ?? [];
}

function getStoreName(id: string): string {
  for (const r of STORE_REGIONS) {
    const s = r.stores.find((s) => s.id === id);
    if (s) return s.name;
  }
  return id;
}

interface TaskStatus {
  completedCount: number;
  totalCount: number;
  isDone: boolean;
}

function getStatus(task: CustomTask, completions: TaskCompletion[]): TaskStatus {
  const scope = normalizeScope(task.scope);
  const period = getPeriodKey(task.frequency);
  const relevant = completions.filter((c) => c.taskId === task.id && c.period === period);
  const completedSites = new Set(relevant.map((c) => c.siteId));

  if (scope === "site") {
    const siteId = task.selectedStore || task.siteId;
    const done = completedSites.has(siteId);
    return { completedCount: done ? 1 : 0, totalCount: 1, isDone: done };
  }
  if (scope === "regional") {
    const siteIds = getStoreIdsForRegion(task.region ?? "");
    const count = siteIds.filter((id) => completedSites.has(id)).length;
    const total = siteIds.length;
    return { completedCount: count, totalCount: total, isDone: total > 0 && count === total };
  }
  const count = ALL_STORE_IDS.filter((id) => completedSites.has(id)).length;
  const total = ALL_STORE_IDS.length;
  return { completedCount: count, totalCount: total, isDone: total > 0 && count === total };
}

// ── Badges ────────────────────────────────────────────────────────────────────
function ScopeBadge({ scope }: { scope: CustomTask["scope"] }) {
  if (scope === "national") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        <Globe className="w-2.5 h-2.5" />
        Nationwide
      </span>
    );
  }
  if (scope === "regional") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
        <MapPin className="w-2.5 h-2.5" />
        Regional
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
      <Store className="w-2.5 h-2.5" />
      Store
    </span>
  );
}

function StatusPill({ status, scope }: { status: TaskStatus; scope: CustomTask["scope"] }) {
  if (status.isDone) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="w-3 h-3" />
        Completed
        {scope !== "site" && (
          <span className="opacity-70 font-normal">({status.completedCount}/{status.totalCount})</span>
        )}
      </span>
    );
  }

  const pct = status.totalCount > 0 ? Math.round((status.completedCount / status.totalCount) * 100) : 0;
  const color =
    pct > 0
      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
      : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      <Clock className="w-3 h-3" />
      Pending
      {scope !== "site" && (
        <span className="opacity-70 font-normal">({status.completedCount}/{status.totalCount})</span>
      )}
    </span>
  );
}

// ── Task row (expandable) ─────────────────────────────────────────────────────
function TaskRow({
  task,
  completions,
  onEdit,
  onDelete,
}: {
  task: CustomTask;
  completions: TaskCompletion[];
  onEdit: (task: CustomTask) => void;
  onDelete: (task: CustomTask) => void;
}) {
  const [open, setOpen] = useState(false);
  const status = useMemo(() => getStatus(task, completions), [task, completions]);

  const storeDetails = useMemo(() => {
    const scope = normalizeScope(task.scope);
    if (scope === "site") return null;
    const period = getPeriodKey(task.frequency);
    const relevant = completions.filter((c) => c.taskId === task.id && c.period === period);
    const completedSites = new Set(relevant.map((c) => c.siteId));
    const ids = scope === "regional" ? getStoreIdsForRegion(task.region ?? "") : ALL_STORE_IDS;
    return ids.map((id) => ({ id, name: getStoreName(id), done: completedSites.has(id) }));
  }, [task, completions]);

  const createdDate = new Date(task.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="w-full flex items-start gap-3 p-3.5 bg-card">
        <button
          className="mt-0.5 text-muted-foreground shrink-0"
          onClick={() => setOpen((o) => !o)}
          data-testid={`tracker-task-expand-${task.id}`}
          type="button"
        >
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => setOpen((o) => !o)}
          data-testid={`tracker-task-${task.id}`}
          type="button"
        >
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <ScopeBadge scope={task.scope} />
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {FREQ_LABELS[task.frequency] ?? task.frequency}
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {CATEGORY_LABELS[task.category] ?? task.category}
            </span>
          </div>

          <p className="text-sm font-semibold text-foreground leading-snug">{task.title}</p>

          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
            {task.assignedToLabel && (
              <span>
                Assigned to: <span className="text-foreground">{task.assignedToLabel}</span>
              </span>
            )}
            {task.scope === "regional" && task.region && (
              <span>
                Region: <span className="text-foreground">{task.region}</span>
              </span>
            )}
            {task.scope === "site" && (
              <span>
                Store:{" "}
                <span className="text-foreground">{getStoreName(task.selectedStore || task.siteId)}</span>
              </span>
            )}
            <span>
              Created by: <span className="text-foreground">{task.createdBy}</span>
            </span>
            <span>
              On: <span className="text-foreground">{createdDate}</span>
            </span>
          </div>
        </button>

        <div className="shrink-0 flex items-center gap-2 mt-0.5">
          <StatusPill status={status} scope={task.scope} />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            data-testid={`button-edit-task-${task.id}`}
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            title="Edit task"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            data-testid={`button-delete-task-${task.id}`}
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            title="Delete task"
            className="text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t bg-muted/30 p-4 space-y-4">
          {task.description && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Description
              </p>
              <p className="text-sm text-foreground">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {task.dueDate && (
              <div>
                <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Due Date</p>
                <p className="text-foreground">{task.dueDate}</p>
              </div>
            )}
            <div>
              <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Frequency</p>
              <p className="text-foreground">{FREQ_LABELS[task.frequency]}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Category</p>
              <p className="text-foreground">{CATEGORY_LABELS[task.category] ?? task.category}</p>
            </div>
          </div>

          {storeDetails && storeDetails.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Store Completion ({status.completedCount}/{status.totalCount})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto pr-1">
                {storeDetails.map((s) => (
                  <div
                    key={s.id}
                    data-testid={`tracker-store-${task.id}-${s.id}`}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs ${
                      s.done
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                        : "bg-background border-border text-muted-foreground"
                    }`}
                  >
                    {s.done ? (
                      <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-600" />
                    ) : (
                      <Clock className="w-3 h-3 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate font-medium">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Deleted Task Row ───────────────────────────────────────────────────────────
function DeletedTaskRow({
  task,
  onReinstate,
  onPurge,
}: {
  task: DeletedCustomTask;
  onReinstate: (task: DeletedCustomTask) => void;
  onPurge: (task: DeletedCustomTask) => void;
}) {
  const deletedDate = new Date(task.deletedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="border rounded-md p-3.5 bg-card flex flex-wrap items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <ScopeBadge scope={task.scope} />
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {FREQ_LABELS[task.frequency] ?? task.frequency}
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {CATEGORY_LABELS[task.category] ?? task.category}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground leading-snug line-through opacity-60">{task.title}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
          {task.assignedToLabel && (
            <span>Assigned to: <span className="text-foreground">{task.assignedToLabel}</span></span>
          )}
          <span>Deleted on: <span className="text-foreground">{deletedDate}</span></span>
          <span>By: <span className="text-foreground">{task.deletedBy}</span></span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid={`button-reinstate-task-${task.id}`}
          onClick={() => onReinstate(task)}
          className="gap-1.5"
        >
          <RotateCcw className="w-3 h-3" />
          Reinstate
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          data-testid={`button-purge-task-${task.id}`}
          onClick={() => onPurge(task)}
          title="Permanently delete"
          className="text-destructive"
        >
          <XCircle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  tasks,
  completions,
  statusMap,
  filter,
  accentClass,
  onEdit,
  onDelete,
}: {
  icon: typeof Globe;
  title: string;
  tasks: CustomTask[];
  completions: TaskCompletion[];
  statusMap: Map<string, TaskStatus>;
  filter: "all" | "completed" | "pending";
  accentClass: string;
  onEdit: (task: CustomTask) => void;
  onDelete: (task: CustomTask) => void;
}) {
  const filtered = tasks.filter((t) => {
    if (filter === "all") return true;
    const isDone = statusMap.get(t.id)?.isDone ?? false;
    return filter === "completed" ? isDone : !isDone;
  });

  if (filtered.length === 0) return null;

  return (
    <div>
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${accentClass}`}>
        <Icon className="w-4 h-4" />
        <h2 className="text-sm font-bold uppercase tracking-wide">{title}</h2>
        <Badge variant="secondary" className="ml-auto text-xs">
          {filtered.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {filtered.map((t) => (
          <TaskRow key={t.id} task={t} completions={completions} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TaskTracker() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "completed" | "pending" | "deleted">("all");
  const [tick, setTick] = useState(0);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<CustomTask | null>(null);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<CustomTask | null>(null);

  // Purge confirmation state
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
  const [taskToPurge, setTaskToPurge] = useState<DeletedCustomTask | null>(null);

  const profile = useMemo(
    () => (user ? getUserProfile(user.email, user.name ?? "") : null),
    [user]
  );

  const isCpoUser = profile ? isCPO(profile.role) : false;
  const userRegion = profile ? getAssignedRegion(profile) : null;

  const regionStoreIds = useMemo(
    () => (userRegion ? new Set(getStoreIdsForRegion(userRegion)) : new Set<string>()),
    [userRegion]
  );

  const visibleTasks = useMemo(
    () => loadAllCustomTasksForRole(isCpoUser, userRegion ?? undefined, regionStoreIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isCpoUser, userRegion, tick]
  );

  const deletedTasks = useMemo(
    () => loadDeletedCustomTasksForRole(isCpoUser, userRegion ?? undefined, regionStoreIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isCpoUser, userRegion, tick]
  );

  const completions = useMemo(
    () => loadAllCompletionsRaw(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick]
  );

  const nationalTasks = visibleTasks.filter((t) => normalizeScope(t.scope) === "national");
  const regionalTasks = visibleTasks.filter((t) => normalizeScope(t.scope) === "regional");
  const siteTasks = visibleTasks.filter((t) => normalizeScope(t.scope) === "site");

  const statusMap = useMemo(() => {
    const map = new Map<string, TaskStatus>();
    for (const t of visibleTasks) map.set(t.id, getStatus(t, completions));
    return map;
  }, [visibleTasks, completions]);

  const totalCount = visibleTasks.length;
  const completedCount = visibleTasks.filter((t) => statusMap.get(t.id)?.isDone).length;
  const pendingCount = totalCount - completedCount;

  const hasAnyInSection =
    nationalTasks.length > 0 || regionalTasks.length > 0 || siteTasks.length > 0;

  const handleRefresh = useCallback(() => setTick((n) => n + 1), []);

  const handleEdit = useCallback((task: CustomTask) => {
    setTaskToEdit(task);
    setEditModalOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((task: CustomTask) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!taskToDelete || !profile) return;
    softDeleteCustomTask(taskToDelete.id, profile.name);
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
    setTick((n) => n + 1);
  }, [taskToDelete, profile]);

  const handleReinstate = useCallback((task: DeletedCustomTask) => {
    reinstateCustomTask(task.id);
    setTick((n) => n + 1);
  }, []);

  const handlePurgeRequest = useCallback((task: DeletedCustomTask) => {
    setTaskToPurge(task);
    setPurgeDialogOpen(true);
  }, []);

  const confirmPurge = useCallback(() => {
    if (!taskToPurge) return;
    purgeDeletedTask(taskToPurge.id);
    setPurgeDialogOpen(false);
    setTaskToPurge(null);
    setTick((n) => n + 1);
  }, [taskToPurge]);

  if (!profile || !isRegionalOrAbove(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Access restricted to regional and above.</p>
      </div>
    );
  }

  const availableRegions = STORE_REGIONS.map((r) => r.region);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-purple-600" />
            Task Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor completion status for tasks you've pushed to stores and regions.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-testid="button-refresh-tracker"
          onClick={handleRefresh}
          className="gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Summary strip — hidden on deleted tab */}
      {filter !== "deleted" && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Tasks", value: totalCount, color: "text-foreground" },
            { label: "Completed", value: completedCount, color: "text-emerald-600" },
            { label: "Pending", value: pendingCount, color: "text-amber-600" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-3 text-center">
              <p className={`text-2xl font-bold ${color}`} data-testid={`summary-${label.toLowerCase().replace(" ", "-")}`}>
                {value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {(["all", "completed", "pending", "deleted"] as const).map((f) => (
          <button
            key={f}
            data-testid={`filter-tab-${f}`}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              filter === f
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all"
              ? `All (${totalCount})`
              : f === "completed"
              ? `Completed (${completedCount})`
              : f === "pending"
              ? `Pending (${pendingCount})`
              : `Deleted (${deletedTasks.length})`}
          </button>
        ))}
      </div>

      {/* ── Deleted Tasks Panel ── */}
      {filter === "deleted" && (
        <div>
          {deletedTasks.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Trash2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No deleted tasks.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deletedTasks.map((t) => (
                <DeletedTaskRow
                  key={t.id}
                  task={t}
                  onReinstate={handleReinstate}
                  onPurge={handlePurgeRequest}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Active Tasks ── */}
      {filter !== "deleted" && (
        <>
          {/* Empty state when no custom tasks exist */}
          {!hasAnyInSection && filter === "all" && (
            <div className="text-center py-20 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No pushed tasks yet.</p>
              <p className="text-xs mt-1">
                Use the Create Task button on the dashboard to push tasks to stores or regions.
              </p>
            </div>
          )}

          {/* No tasks match the active filter */}
          {hasAnyInSection && filter !== "all" && (() => {
            const matchesFilter = (t: CustomTask) => {
              const done = statusMap.get(t.id)?.isDone ?? false;
              return filter === "completed" ? done : !done;
            };
            const anyMatch =
              nationalTasks.some(matchesFilter) ||
              regionalTasks.some(matchesFilter) ||
              siteTasks.some(matchesFilter);
            return !anyMatch ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No tasks match the current filter.</p>
              </div>
            ) : null;
          })()}

          {/* Task sections */}
          {hasAnyInSection && (
            <div className="space-y-8">
              <Section
                icon={Globe}
                title="Nationwide"
                tasks={nationalTasks}
                completions={completions}
                statusMap={statusMap}
                filter={filter}
                accentClass="text-blue-700 border-blue-100"
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
              <Section
                icon={MapPin}
                title="Regional"
                tasks={regionalTasks}
                completions={completions}
                statusMap={statusMap}
                filter={filter}
                accentClass="text-purple-700 border-purple-100"
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
              <Section
                icon={Store}
                title="Store-Level"
                tasks={siteTasks}
                completions={completions}
                statusMap={statusMap}
                filter={filter}
                accentClass="text-green-700 border-green-100"
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
            </div>
          )}
        </>
      )}

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              "{taskToDelete?.title}" will be moved to the Deleted tab. You can reinstate it any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              data-testid="button-confirm-delete-task"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Purge Confirmation ── */}
      <AlertDialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              "{taskToPurge?.title}" will be permanently removed and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPurge}
              data-testid="button-confirm-purge-task"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Edit Task Modal ── */}
      {profile && (
        <CreateTaskModal
          open={editModalOpen}
          siteId={taskToEdit?.siteId ?? ""}
          profile={{ email: profile.email, name: profile.name, role: profile.role }}
          onClose={() => { setEditModalOpen(false); setTaskToEdit(null); }}
          onCreated={() => { setTick((n) => n + 1); }}
          onUpdated={() => { setTick((n) => n + 1); setEditModalOpen(false); setTaskToEdit(null); }}
          isCpo={isCpoUser}
          isRegional={!isCpoUser && isRegionalOrAbove(profile.role)}
          userRegion={userRegion ?? undefined}
          hasSiteContext={false}
          availableRegions={availableRegions}
          taskToEdit={taskToEdit}
        />
      )}
    </div>
  );
}
