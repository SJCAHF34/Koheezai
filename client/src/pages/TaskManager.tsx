import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/App";
import { getUserProfile, isDirectorRole, getRoleLabel } from "@/lib/userProfile";
import {
  TASKS,
  CATEGORY_CONFIG,
  ROLE_CONFIG,
  type PharmacyTask,
  type TaskRole,
  type TaskFrequency,
  type TaskCategory,
} from "@/lib/taskData";
import {
  loadCompletions,
  saveCompletion,
  removeCompletion,
  loadAssignments,
  saveAssignment,
  type TaskAssignment,
} from "@/lib/taskStorage";
import {
  Check,
  UserPlus,
  X,
  ClipboardList,
  AlertTriangle,
  PartyPopper,
} from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────────

const FREQUENCY_TABS: { value: TaskFrequency; label: string; sub: string }[] = [
  { value: "daily", label: "Daily", sub: "Today's tasks" },
  { value: "weekly", label: "Weekly", sub: "This week" },
  { value: "monthly", label: "Monthly", sub: "This month" },
  { value: "quarterly", label: "Quarterly", sub: "This quarter" },
];

const CATEGORY_ORDER: TaskCategory[] = ["operations", "achc", "state_board", "retention"];

type ViewingRole = TaskRole | "own" | "all";

function getVisibleTasks(
  frequency: TaskFrequency,
  userRole: string,
  viewingRole: ViewingRole
): PharmacyTask[] {
  const byFreq = TASKS.filter((t) => t.frequency === frequency);
  if (isDirectorRole(userRole as any)) {
    if (viewingRole === "all") return byFreq;
    if (viewingRole === "own")
      return byFreq.filter((t) => t.role === "director" || t.role === "all_staff");
    return byFreq.filter((t) => t.role === viewingRole || t.role === "all_staff");
  }
  return byFreq.filter((t) => t.role === userRole || t.role === "all_staff");
}

function groupByCategory(tasks: PharmacyTask[]): Record<TaskCategory, PharmacyTask[]> {
  const groups: Record<TaskCategory, PharmacyTask[]> = {
    operations: [],
    achc: [],
    state_board: [],
    retention: [],
  };
  for (const t of tasks) groups[t.category].push(t);
  return groups;
}

// ── Animated Checkbox ───────────────────────────────────────────────────────

function TaskCheckbox({
  completed,
  animating,
  onClick,
  testId,
}: {
  completed: boolean;
  animating: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      aria-pressed={completed}
      className={`relative shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
        completed
          ? "bg-green-500 border-green-500 scale-100"
          : animating
          ? "border-green-400 scale-125 bg-green-50"
          : "border-slate-300 hover:border-purple-400 hover:scale-110"
      }`}
    >
      <div
        className={`transition-all duration-200 ${
          completed ? "opacity-100 scale-100" : "opacity-0 scale-0"
        }`}
      >
        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
      </div>
    </button>
  );
}

// ── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  completed,
  animating,
  assignment,
  canAssign,
  onToggle,
  onAssign,
}: {
  task: PharmacyTask;
  completed: boolean;
  animating: boolean;
  assignment?: TaskAssignment;
  canAssign: boolean;
  onToggle: (t: PharmacyTask) => void;
  onAssign: (t: PharmacyTask) => void;
}) {
  const cat = CATEGORY_CONFIG[task.category];
  return (
    <div
      data-testid={`task-row-${task.id}`}
      className={`flex items-start gap-3 px-4 py-3 rounded-md group transition-all duration-300 ${
        animating ? "bg-green-50" : completed ? "opacity-55" : "hover:bg-slate-50"
      }`}
    >
      <TaskCheckbox
        completed={completed}
        animating={animating}
        onClick={() => onToggle(task)}
        testId={`checkbox-${task.id}`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {task.isUrgent && !completed && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-50 text-red-600">
              <AlertTriangle className="w-2.5 h-2.5" />
              Urgent
            </span>
          )}
          <p
            className={`text-sm leading-snug transition-all duration-300 ${
              completed
                ? "line-through text-muted-foreground"
                : "text-slate-800 font-medium"
            }`}
          >
            {task.title}
          </p>
        </div>

        {task.description && !completed && (
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{task.description}</p>
        )}

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cat.badge}`}>
            {cat.label}
          </span>
          {assignment && (
            <span className="text-[10px] text-purple-600 font-medium">
              Assigned to{" "}
              {ROLE_CONFIG[assignment.assignedToRole as keyof typeof ROLE_CONFIG]?.short ??
                assignment.assignedToRole}
              {assignment.note ? ` · ${assignment.note}` : ""}
            </span>
          )}
        </div>
      </div>

      {canAssign && !completed && (
        <button
          data-testid={`button-assign-${task.id}`}
          onClick={() => onAssign(task)}
          title="Assign task"
          className="shrink-0 invisible group-hover:visible p-1.5 rounded-md text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ── Category Section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  tasks,
  completions,
  animating,
  assignments,
  canAssign,
  onToggle,
  onAssign,
}: {
  category: TaskCategory;
  tasks: PharmacyTask[];
  completions: Set<string>;
  animating: Set<string>;
  assignments: Map<string, TaskAssignment>;
  canAssign: boolean;
  onToggle: (t: PharmacyTask) => void;
  onAssign: (t: PharmacyTask) => void;
}) {
  if (tasks.length === 0) return null;
  const cat = CATEGORY_CONFIG[category];
  const done = tasks.filter((t) => completions.has(t.id)).length;
  const pct = Math.round((done / tasks.length) * 100);

  return (
    <div className="mb-3">
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-t-md ${cat.bg}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${cat.dot}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${cat.color}`}>
            {cat.label}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {done}/{tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 rounded-full bg-white/70 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pct === 100 ? "bg-green-500" : cat.dot
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-[11px] font-bold ${cat.color}`}>{pct}%</span>
        </div>
      </div>

      <div className="border border-t-0 border-slate-100 rounded-b-md bg-white divide-y divide-slate-50">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            completed={completions.has(task.id)}
            animating={animating.has(task.id)}
            assignment={assignments.get(task.id)}
            canAssign={canAssign}
            onToggle={onToggle}
            onAssign={onAssign}
          />
        ))}
      </div>
    </div>
  );
}

// ── Site Overview Panel (directors) ─────────────────────────────────────────

function SiteOverviewPanel({
  frequency,
  completions,
  onSelectRole,
  viewingRole,
}: {
  frequency: TaskFrequency;
  completions: Set<string>;
  onSelectRole: (r: ViewingRole) => void;
  viewingRole: ViewingRole;
}) {
  const roleCards: { role: TaskRole; label: string }[] = [
    { role: "data_entry_tech", label: "DE Tech" },
    { role: "pv2_tech", label: "PV2 Tech" },
    { role: "delivery_tech", label: "Delivery" },
    { role: "pharmacist", label: "Pharmacist" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
      {roleCards.map(({ role, label }) => {
        const roleTasks = TASKS.filter(
          (t) => t.frequency === frequency && (t.role === role || t.role === "all_staff")
        );
        const done = roleTasks.filter((t) => completions.has(t.id)).length;
        const pct = roleTasks.length > 0 ? Math.round((done / roleTasks.length) * 100) : 0;
        const isActive = viewingRole === role;
        return (
          <button
            key={role}
            data-testid={`overview-card-${role}`}
            onClick={() => onSelectRole(isActive ? "own" : role)}
            className={`text-left bg-white border rounded-md px-4 py-3 transition-all hover-elevate ${
              isActive ? "border-purple-300 ring-1 ring-purple-200" : "border-slate-100"
            }`}
          >
            <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
            <div className="flex items-end gap-1.5">
              <span className="text-xl font-bold text-slate-800">{pct}%</span>
              <span className="text-xs text-slate-400 mb-0.5">
                {done}/{roleTasks.length}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-purple-500" : "bg-amber-400"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Assign Dialog ─────────────────────────────────────────────────────────────

function AssignDialog({
  task,
  siteId,
  directorName,
  onSave,
  onClose,
}: {
  task: PharmacyTask;
  siteId: string;
  directorName: string;
  onSave: (a: TaskAssignment) => void;
  onClose: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState<string>("pharmacist");
  const [note, setNote] = useState("");

  const roleOptions = Object.entries(ROLE_CONFIG).filter(([k]) => k !== "director");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        data-testid="dialog-assign-task"
        className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm">Assign Task</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Task</p>
            <p className="text-sm font-medium text-slate-800">{task.title}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Assign to Role
            </p>
            <div className="grid grid-cols-2 gap-2">
              {roleOptions.map(([roleKey, cfg]) => (
                <button
                  key={roleKey}
                  onClick={() => setSelectedRole(roleKey)}
                  data-testid={`assign-role-${roleKey}`}
                  className={`text-left px-3 py-2 rounded-md text-sm border transition-all ${
                    selectedRole === roleKey
                      ? "border-purple-500 bg-purple-50 text-purple-800 font-semibold"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Note (optional)
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="input-assign-note"
              placeholder="Add instructions or context..."
              className="w-full text-sm rounded-md border border-slate-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 text-slate-700 placeholder:text-slate-400"
              rows={2}
            />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave({
                taskId: task.id,
                assignedToRole: selectedRole,
                note: note.trim(),
                assignedBy: directorName,
                assignedAt: new Date().toISOString(),
                siteId,
              });
              onClose();
            }}
            data-testid="button-confirm-assign"
            className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors"
          >
            Assign Task
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TaskManager() {
  const { user } = useAuth();
  const profile = user ? getUserProfile(user.email, user.name) : null;

  const [frequency, setFrequency] = useState<TaskFrequency>("daily");
  const [viewingRole, setViewingRole] = useState<ViewingRole>("own");
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [animating, setAnimating] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<Map<string, TaskAssignment>>(new Map());
  const [assigningTask, setAssigningTask] = useState<PharmacyTask | null>(null);

  const siteId = profile?.siteId ?? "1417";
  const isDir = isDirectorRole(profile?.role ?? "pharmacist");

  useEffect(() => {
    if (!profile) return;
    setCompletions(loadCompletions(siteId, frequency));
    const aList = loadAssignments(siteId);
    setAssignments(new Map(aList.map((a) => [a.taskId, a])));
  }, [frequency, siteId, profile?.email]);

  const toggleCompletion = useCallback(
    (task: PharmacyTask) => {
      if (!profile) return;
      const isCompleted = completions.has(task.id);
      if (isCompleted) {
        removeCompletion(task.id, siteId, task.frequency);
        setCompletions((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      } else {
        setAnimating((prev) => new Set(prev).add(task.id));
        saveCompletion(task.id, siteId, profile.email, profile.role, task.frequency);
        setCompletions((prev) => new Set(prev).add(task.id));
        setTimeout(() => {
          setAnimating((prev) => {
            const next = new Set(prev);
            next.delete(task.id);
            return next;
          });
        }, 700);
      }
    },
    [completions, profile, siteId]
  );

  const handleAssignSave = useCallback((a: TaskAssignment) => {
    saveAssignment(a);
    setAssignments((prev) => new Map(prev).set(a.taskId, a));
  }, []);

  if (!profile) return null;

  const visible = getVisibleTasks(frequency, profile.role, viewingRole);
  const grouped = groupByCategory(visible);
  const totalTasks = visible.length;
  const doneTasks = visible.filter((t) => completions.has(t.id)).length;
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="w-5 h-5 text-purple-600" />
                <h1 className="text-2xl font-bold text-slate-900">Task Manager</h1>
              </div>
              <p className="text-sm text-slate-400">{profile.siteName} · {today}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5 mb-1.5">
                  <span className="text-sm font-bold text-slate-800">{overallPct}%</span>
                  <span className="text-xs text-slate-400">{doneTasks}/{totalTasks} tasks</span>
                </div>
                <div className="w-36 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      overallPct === 100 ? "bg-green-500" : "bg-purple-500"
                    }`}
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
              </div>
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full text-white whitespace-nowrap"
                style={{ background: "linear-gradient(90deg,#3b82f6,#9333ea)" }}
              >
                {getRoleLabel(profile.role)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Frequency tabs */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit shadow-sm">
          {FREQUENCY_TABS.map((tab) => (
            <button
              key={tab.value}
              data-testid={`tab-freq-${tab.value}`}
              onClick={() => setFrequency(tab.value)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                frequency === tab.value
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Director role-view selector */}
        {isDir && (
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              View tasks for
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "own" as ViewingRole, label: "My Tasks" },
                { value: "data_entry_tech" as ViewingRole, label: "DE Tech" },
                { value: "pv2_tech" as ViewingRole, label: "PV2 Tech" },
                { value: "delivery_tech" as ViewingRole, label: "Delivery Tech" },
                { value: "pharmacist" as ViewingRole, label: "Pharmacist" },
                { value: "all" as ViewingRole, label: "All Roles" },
              ].map((item) => (
                <button
                  key={item.value}
                  data-testid={`role-tab-${item.value}`}
                  onClick={() => setViewingRole(item.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                    viewingRole === item.value
                      ? "border-purple-400 bg-purple-50 text-purple-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Director site overview cards */}
        {isDir && (
          <SiteOverviewPanel
            frequency={frequency}
            completions={completions}
            onSelectRole={setViewingRole}
            viewingRole={viewingRole}
          />
        )}

        {/* Task list */}
        {totalTasks === 0 ? (
          <div className="bg-white border border-slate-100 rounded-md px-6 py-12 text-center">
            <p className="text-slate-400 text-sm">No tasks for this period and role combination.</p>
          </div>
        ) : (
          <div>
            {CATEGORY_ORDER.map((cat) =>
              grouped[cat]?.length > 0 ? (
                <CategorySection
                  key={cat}
                  category={cat}
                  tasks={grouped[cat]}
                  completions={completions}
                  animating={animating}
                  assignments={assignments}
                  canAssign={isDir}
                  onToggle={toggleCompletion}
                  onAssign={setAssigningTask}
                />
              ) : null
            )}
          </div>
        )}

        {/* All done banner */}
        {totalTasks > 0 && doneTasks === totalTasks && (
          <div className="bg-green-50 border border-green-100 rounded-md px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <PartyPopper className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-green-800">
                All {frequency} tasks complete!
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                Great work. Come back next period for a fresh list.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Assign task dialog */}
      {assigningTask && profile && (
        <AssignDialog
          task={assigningTask}
          siteId={siteId}
          directorName={profile.name}
          onSave={handleAssignSave}
          onClose={() => setAssigningTask(null)}
        />
      )}
    </div>
  );
}
