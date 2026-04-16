import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/App";
import { getUserProfile, isCPO, isRegionalOrAbove, getAssignedRegion } from "@/lib/userProfile";
import {
  loadAllCustomTasks,
  loadAllCompletionsRaw,
  saveCustomTask,
  saveCompletion,
  getPeriodKey,
  type CustomTask,
  type TaskCompletion,
} from "@/lib/taskStorage";
import { STORE_REGIONS } from "@/lib/storeDirectory";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

// ── Seed demo data ────────────────────────────────────────────────────────────
function seedDemoData(): void {
  const existing = loadAllCustomTasks();
  if (existing.length > 0) return;

  const now = new Date().toISOString();

  const tasks: CustomTask[] = [
    {
      id: "seed-natl-1",
      siteId: "NATIONAL",
      scope: "national",
      title: "Review Antiretroviral Adherence Rate Reports",
      description:
        "All pharmacy directors must review and sign off on the latest ART adherence rate data for their site before end of month.",
      role: "director",
      assignedToLabel: "All Directors & RPDs",
      frequency: "monthly",
      category: "operations",
      taskGroup: "Custom Tasks",
      createdBy: "Chief Pharmacy Officer",
      createdByRole: "chief_pharmacy_officer",
      createdAt: now,
    },
    {
      id: "seed-natl-2",
      siteId: "NATIONAL",
      scope: "national",
      title: "Complete HIV Quality Indicator Benchmarking",
      description:
        "Submit your site's HIV quality indicators to the national benchmarking dashboard by the 15th of this month.",
      role: "director",
      assignedToLabel: "All Directors & RPDs",
      frequency: "monthly",
      category: "achc",
      taskGroup: "Custom Tasks",
      createdBy: "Chief Pharmacy Officer",
      createdByRole: "chief_pharmacy_officer",
      createdAt: now,
    },
    {
      id: "seed-reg-west-1",
      siteId: "REGION:Western Region",
      scope: "regional",
      region: "Western Region",
      title: "Western Region ACHC Documentation Audit",
      description:
        "Complete the quarterly documentation audit checklist for ACHC compliance across all Western Region sites.",
      role: "director",
      assignedToLabel: "Regional Pharmacy Director",
      frequency: "quarterly",
      category: "achc",
      taskGroup: "Custom Tasks",
      createdBy: "Chief Pharmacy Officer",
      createdByRole: "chief_pharmacy_officer",
      createdAt: now,
    },
    {
      id: "seed-site-1417-1",
      siteId: "1417",
      scope: "site",
      selectedStore: "1417",
      title: "Update PrEP Patient Outreach Contact Log",
      description:
        "Ensure all PrEP patients contacted this week are logged in the outreach tracker. Flag patients unreached for follow-up.",
      role: "director",
      assignedToLabel: "Seth Collins",
      frequency: "weekly",
      category: "retention",
      taskGroup: "Custom Tasks",
      createdBy: "Regional Pharmacy Director",
      createdByRole: "regional_pharmacy_director",
      createdAt: now,
    },
  ];

  tasks.forEach(saveCustomTask);

  // Seed some completions so the tracker shows mixed data
  const monthlyCols: Omit<TaskCompletion, "taskId">[] = [
    {
      taskRole: "director",
      completedAt: now,
      period: getPeriodKey("monthly"),
      siteId: "1412",
      userEmail: "director@store1412.test",
      userRole: "pharmacy_director",
    },
    {
      taskRole: "director",
      completedAt: now,
      period: getPeriodKey("monthly"),
      siteId: "1408",
      userEmail: "director@store1408.test",
      userRole: "pharmacy_director",
    },
    {
      taskRole: "director",
      completedAt: now,
      period: getPeriodKey("monthly"),
      siteId: "1410",
      userEmail: "director@store1410.test",
      userRole: "pharmacy_director",
    },
  ];

  monthlyCols.forEach((c) => saveCompletion({ ...c, taskId: "seed-natl-1" }));

  // One completion for the second national task
  saveCompletion({
    taskId: "seed-natl-2",
    taskRole: "director",
    completedAt: now,
    period: getPeriodKey("monthly"),
    siteId: "1416",
    userEmail: "director@store1416.test",
    userRole: "pharmacy_director",
  });

  // Seed the weekly site task as completed
  saveCompletion({
    taskId: "seed-site-1417-1",
    taskRole: "director",
    completedAt: now,
    period: getPeriodKey("weekly"),
    siteId: "1417",
    userEmail: "seth.collins@aidshealth.org",
    userRole: "pharmacy_director",
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ALL_STORE_IDS = STORE_REGIONS.flatMap((r) => r.stores.map((s) => s.id));

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
  const period = getPeriodKey(task.frequency);
  const relevant = completions.filter((c) => c.taskId === task.id && c.period === period);
  const completedSites = new Set(relevant.map((c) => c.siteId));

  if (task.scope === "site") {
    const siteId = task.selectedStore || task.siteId;
    const done = completedSites.has(siteId);
    return { completedCount: done ? 1 : 0, totalCount: 1, isDone: done };
  }

  if (task.scope === "regional") {
    const siteIds = getStoreIdsForRegion(task.region ?? "");
    const count = siteIds.filter((id) => completedSites.has(id)).length;
    return { completedCount: count, totalCount: siteIds.length, isDone: count === siteIds.length && siteIds.length > 0 };
  }

  // National
  const count = ALL_STORE_IDS.filter((id) => completedSites.has(id)).length;
  return { completedCount: count, totalCount: ALL_STORE_IDS.length, isDone: count === ALL_STORE_IDS.length };
}

// ── Sub-components ────────────────────────────────────────────────────────────
const FREQ_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  one_time: "One-Time",
};

const CATEGORY_LABELS: Record<string, string> = {
  operations: "Operations",
  achc: "ACHC",
  state_board: "State Board",
  retention: "Retention",
};

function ScopeBadge({ scope }: { scope: CustomTask["scope"] }) {
  if (scope === "national") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
        <Globe className="w-2.5 h-2.5" />
        Nationwide
      </span>
    );
  }
  if (scope === "regional") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
        <MapPin className="w-2.5 h-2.5" />
        Regional
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
      <Store className="w-2.5 h-2.5" />
      Store
    </span>
  );
}

function StatusPill({ status, scope }: { status: TaskStatus; scope: CustomTask["scope"] }) {
  if (scope === "site") {
    return status.isDone ? (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" />
        Completed
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  }

  const pct = status.totalCount > 0 ? Math.round((status.completedCount / status.totalCount) * 100) : 0;
  const color =
    pct === 100 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : pct >= 50 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";
  const Icon = pct === 100 ? CheckCircle2 : Clock;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      <Icon className="w-3 h-3" />
      {status.completedCount}/{status.totalCount} stores
    </span>
  );
}

function TaskRow({
  task,
  completions,
}: {
  task: CustomTask;
  completions: TaskCompletion[];
}) {
  const [open, setOpen] = useState(false);
  const status = useMemo(() => getStatus(task, completions), [task, completions]);

  // Per-store detail for national/regional tasks
  const storeDetails = useMemo(() => {
    if (task.scope === "site") return null;
    const period = getPeriodKey(task.frequency);
    const relevant = completions.filter((c) => c.taskId === task.id && c.period === period);
    const completedSites = new Set(relevant.map((c) => c.siteId));

    const storeIds =
      task.scope === "regional"
        ? getStoreIdsForRegion(task.region ?? "")
        : ALL_STORE_IDS;

    return storeIds.map((id) => ({
      id,
      name: getStoreName(id),
      done: completedSites.has(id),
    }));
  }, [task, completions]);

  const createdDate = new Date(task.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="border rounded-md overflow-hidden">
      <button
        className="w-full text-left flex items-start gap-3 p-3.5 hover-elevate transition-colors bg-card"
        onClick={() => setOpen((o) => !o)}
        data-testid={`tracker-task-${task.id}`}
      >
        <div className="mt-0.5 text-muted-foreground">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>

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
                Store: <span className="text-foreground">{getStoreName(task.selectedStore || task.siteId)}</span>
              </span>
            )}
            <span>
              Created by: <span className="text-foreground">{task.createdBy}</span>
            </span>
            <span>
              On: <span className="text-foreground">{createdDate}</span>
            </span>
          </div>
        </div>

        <div className="shrink-0 mt-0.5">
          <StatusPill status={status} scope={task.scope} />
        </div>
      </button>

      {open && (
        <div className="border-t bg-muted/30 p-4 space-y-4">
          {task.description && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</p>
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

          {/* Per-store breakdown for national/regional */}
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
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-background border-border text-muted-foreground"
                    }`}
                  >
                    {s.done ? (
                      <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-600" />
                    ) : (
                      <Clock className="w-3 h-3 shrink-0 text-slate-400" />
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

// ── Section ───────────────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  tasks,
  completions,
  filter,
  accentClass,
}: {
  icon: typeof Globe;
  title: string;
  tasks: CustomTask[];
  completions: TaskCompletion[];
  filter: "all" | "completed" | "pending";
  accentClass: string;
}) {
  const filtered = tasks.filter((t) => {
    if (filter === "all") return true;
    const s = getStatus(t, completions);
    if (filter === "completed") return t.scope === "site" ? s.isDone : s.completedCount > 0;
    return t.scope === "site" ? !s.isDone : s.completedCount < s.totalCount;
  });

  if (filtered.length === 0) return null;

  return (
    <div>
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${accentClass}`}>
        <Icon className="w-4 h-4" />
        <h2 className="text-sm font-bold uppercase tracking-wide">
          {title}
        </h2>
        <Badge variant="secondary" className="ml-auto text-xs">
          {filtered.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {filtered.map((t) => (
          <TaskRow key={t.id} task={t} completions={completions} />
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TaskTracker() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all");
  const [refresh, setRefresh] = useState(0);

  const profile = useMemo(
    () => (user ? getUserProfile(user.email, user.name ?? "") : null),
    [user]
  );

  const userRegion = profile ? getAssignedRegion(profile) : null;
  const isCpoUser = profile ? isCPO(profile.role) : false;

  // Seed demo data on first render if localStorage is empty
  useEffect(() => {
    seedDemoData();
    setRefresh((n) => n + 1);
  }, []);

  const allTasks = useMemo(() => loadAllCustomTasks(), [refresh]);
  const completions = useMemo(() => loadAllCompletionsRaw(), [refresh]);

  // Determine which stores are in the RPD's region (for site-scope filtering)
  const regionStoreIds = useMemo(() => {
    if (!userRegion) return new Set<string>();
    return new Set(getStoreIdsForRegion(userRegion));
  }, [userRegion]);

  // Filter tasks visible to the current user
  const visibleTasks = useMemo(() => {
    if (!profile) return [];
    if (isCpoUser) return allTasks;
    // RPD: national tasks + their regional + stores in their region
    return allTasks.filter((t) => {
      if (t.scope === "national") return true;
      if (t.scope === "regional") return t.region === userRegion;
      if (t.scope === "site") return regionStoreIds.has(t.selectedStore || t.siteId);
      return false;
    });
  }, [allTasks, isCpoUser, userRegion, regionStoreIds, profile]);

  const nationalTasks = useMemo(() => visibleTasks.filter((t) => t.scope === "national"), [visibleTasks]);
  const regionalTasks = useMemo(() => visibleTasks.filter((t) => t.scope === "regional"), [visibleTasks]);
  const siteTasks = useMemo(() => visibleTasks.filter((t) => t.scope === "site"), [visibleTasks]);

  // Summary counters for the filter bar
  const totalCount = visibleTasks.length;
  const completedCount = visibleTasks.filter((t) => {
    const s = getStatus(t, completions);
    return t.scope === "site" ? s.isDone : s.completedCount > 0;
  }).length;
  const pendingCount = totalCount - completedCount;

  const hasAnyVisible =
    nationalTasks.length > 0 || regionalTasks.length > 0 || siteTasks.length > 0;

  if (!profile || !isRegionalOrAbove(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Access restricted to regional and above.</p>
      </div>
    );
  }

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
          onClick={() => setRefresh((n) => n + 1)}
          className="gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Tasks", value: totalCount, color: "text-foreground" },
          { label: "Completed", value: completedCount, color: "text-emerald-600" },
          { label: "Pending", value: pendingCount, color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {(["all", "completed", "pending"] as const).map((f) => (
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
            {f === "all" ? `All (${totalCount})` : f === "completed" ? `Completed (${completedCount})` : `Pending (${pendingCount})`}
          </button>
        ))}
      </div>

      {/* Task sections */}
      {hasAnyVisible ? (
        <div className="space-y-8">
          <Section
            icon={Globe}
            title="Nationwide"
            tasks={nationalTasks}
            completions={completions}
            filter={filter}
            accentClass="text-blue-700 border-blue-100"
          />
          <Section
            icon={MapPin}
            title="Regional"
            tasks={regionalTasks}
            completions={completions}
            filter={filter}
            accentClass="text-purple-700 border-purple-100"
          />
          <Section
            icon={Store}
            title="Store-Level"
            tasks={siteTasks}
            completions={completions}
            filter={filter}
            accentClass="text-green-700 border-green-100"
          />
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No pushed tasks yet.</p>
          <p className="text-xs mt-1">
            Use the Create Task button on the dashboard to push tasks to stores or regions.
          </p>
        </div>
      )}

      {/* Empty filtered state */}
      {hasAnyVisible && nationalTasks.length === 0 && regionalTasks.length === 0 && siteTasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No tasks match the current filter.</p>
        </div>
      )}
    </div>
  );
}
