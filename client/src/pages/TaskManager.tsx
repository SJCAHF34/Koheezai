import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useAuth } from "@/App";
import {
  getUserProfile,
  isDirectorRole,
  isRegionalOrAbove,
  isPharmacyDirector,
  isTechRole,
  type UserRole,
} from "@/lib/userProfile";
import {
  TASKS,
  SITES,
  CATEGORY_CONFIG,
  ROLE_CONFIG,
  ROLE_ORDER,
  ROLE_GROUP_ORDER,
  type PharmacyTask,
  type TaskRole,
  type TaskFrequency,
} from "@/lib/taskData";
import { findStore } from "@/lib/storeDirectory";
import {
  loadCompletions,
  saveCompletion,
  removeCompletion,
  loadAssignments,
  saveAssignment,
  loadPriorities,
  savePriority,
  dismissPriority,
  removePriority,
  hasPriority,
  loadHandoffForDate,
  saveHandoffNote,
  toggleHandoffItemComplete,
  getTodayDateKey,
  getTomorrowDateKey,
  purgeStaleHandoffNotes,
  type TaskAssignment,
  type TaskPriority,
  type HandoffNote,
  type HandoffItem,
} from "@/lib/taskStorage";
import {
  Check,
  UserPlus,
  X,
  ClipboardList,
  AlertTriangle,
  PartyPopper,
  ChevronDown,
  ChevronRight,
  Bell,
  Flag,
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  ClipboardCheck,
  ArrowUpRight,
} from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────────

const FREQUENCY_TABS: { value: TaskFrequency; label: string; sub: string }[] = [
  { value: "daily", label: "Daily", sub: "Today's tasks" },
  { value: "weekly", label: "Weekly", sub: "This week" },
  { value: "monthly", label: "Monthly", sub: "This month" },
  { value: "quarterly", label: "Quarterly", sub: "This quarter" },
];

type ViewingRole = TaskRole | "own" | "all";

function getVisibleTasks(
  frequency: TaskFrequency,
  userRole: UserRole,
  viewingRole: ViewingRole
): PharmacyTask[] {
  const byFreq = TASKS.filter((t) => t.frequency === frequency);
  if (isDirectorRole(userRole)) {
    if (viewingRole === "all") return byFreq;
    if (viewingRole === "own")
      return byFreq.filter((t) => t.role === "director" || t.role === "all_staff");
    return byFreq.filter((t) => t.role === viewingRole || t.role === "all_staff");
  }
  return byFreq.filter((t) => t.role === userRole || t.role === "all_staff");
}

/** Group tasks into role buckets → task-group buckets, respecting defined orders.
 *  `all_staff` tasks are ALWAYS folded into each applicable role section —
 *  they never appear as a standalone "All Staff" section. */
function buildRoleGroups(
  tasks: PharmacyTask[],
  viewingRole: ViewingRole,
  userRole: UserRole
): Array<{ role: TaskRole; groups: Array<{ groupName: string; tasks: PharmacyTask[] }> }> {
  const roleMap = new Map<TaskRole, PharmacyTask[]>();

  // Roles that receive folded all_staff tasks (all display roles)
  const displayRoles = ROLE_ORDER as TaskRole[];

  for (const task of tasks) {
    if (task.role === "all_staff") {
      if (viewingRole === "all") {
        // Fold into every role section so staff see it in their own view
        for (const r of displayRoles) {
          if (!roleMap.has(r)) roleMap.set(r, []);
          roleMap.get(r)!.push(task);
        }
      } else {
        // Single-role view: fold into the target role section
        const targetRole: TaskRole =
          viewingRole === "own"
            ? (isDirectorRole(userRole) ? "director" : (userRole as TaskRole))
            : (viewingRole as TaskRole);
        if (!roleMap.has(targetRole)) roleMap.set(targetRole, []);
        roleMap.get(targetRole)!.push(task);
      }
    } else {
      const effectiveRole = task.role;
      if (!roleMap.has(effectiveRole)) roleMap.set(effectiveRole, []);
      roleMap.get(effectiveRole)!.push(task);
    }
  }

  return ROLE_ORDER.filter((r) => roleMap.has(r)).map((role) => {
    const roleTasks = roleMap.get(role)!;
    const groupMap = new Map<string, PharmacyTask[]>();
    for (const t of roleTasks) {
      const g = t.taskGroup ?? "Other";
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g)!.push(t);
    }
    const orderedGroupNames = ROLE_GROUP_ORDER[role] ?? [];
    const groups: Array<{ groupName: string; tasks: PharmacyTask[] }> = [];
    for (const gName of orderedGroupNames) {
      if (groupMap.has(gName)) {
        groups.push({ groupName: gName, tasks: groupMap.get(gName)! });
        groupMap.delete(gName);
      }
    }
    for (const [gName, gTasks] of groupMap) {
      groups.push({ groupName: gName, tasks: gTasks });
    }
    return { role, groups };
  });
}

// Role accent colours (left-border + header tint)
const ROLE_STYLE: Record<
  TaskRole,
  { border: string; bg: string; label: string; labelColor: string; badgeColor: string }
> = {
  data_entry_tech: {
    border: "border-violet-300",
    bg: "bg-violet-50",
    label: "Data Entry Tech",
    labelColor: "text-violet-800",
    badgeColor: "bg-violet-100 text-violet-700",
  },
  pv2_tech: {
    border: "border-blue-300",
    bg: "bg-blue-50",
    label: "PV2 Tech",
    labelColor: "text-blue-800",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  delivery_tech: {
    border: "border-cyan-300",
    bg: "bg-cyan-50",
    label: "Delivery Tech",
    labelColor: "text-cyan-800",
    badgeColor: "bg-cyan-100 text-cyan-700",
  },
  pharmacist: {
    border: "border-purple-300",
    bg: "bg-purple-50",
    label: "Pharmacist",
    labelColor: "text-purple-800",
    badgeColor: "bg-purple-100 text-purple-700",
  },
  director: {
    border: "border-rose-300",
    bg: "bg-rose-50",
    label: "Site Director",
    labelColor: "text-rose-800",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  all_staff: {
    border: "border-slate-300",
    bg: "bg-slate-50",
    label: "All Staff",
    labelColor: "text-slate-700",
    badgeColor: "bg-slate-100 text-slate-600",
  },
};

// ── Animated Checkbox ────────────────────────────────────────────────────────

function TaskCheckbox({
  completed,
  animating,
  onClick,
  testId,
  disabled,
}: {
  completed: boolean;
  animating: boolean;
  onClick: () => void;
  testId: string;
  disabled?: boolean;
}) {
  return (
    <button
      data-testid={testId}
      onClick={disabled ? undefined : onClick}
      aria-pressed={completed}
      className={`relative shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 focus:outline-none ${
        disabled ? "cursor-default" : "focus-visible:ring-2 focus-visible:ring-purple-400"
      } ${
        completed
          ? "bg-green-500 border-green-500 scale-100"
          : animating
          ? "border-green-400 scale-125 bg-green-50"
          : disabled
          ? "border-slate-200 opacity-50"
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
  canPrioritize,
  isPrioritized,
  readOnly,
  onToggle,
  onAssign,
  onPrioritize,
}: {
  task: PharmacyTask;
  completed: boolean;
  animating: boolean;
  assignment?: TaskAssignment;
  canAssign: boolean;
  canPrioritize: boolean;
  isPrioritized: boolean;
  readOnly?: boolean;
  onToggle: (t: PharmacyTask) => void;
  onAssign: (t: PharmacyTask) => void;
  onPrioritize: (t: PharmacyTask) => void;
}) {
  const cat = CATEGORY_CONFIG[task.category];
  return (
    <div
      data-testid={`task-row-${task.id}`}
      className={`flex items-start gap-3 px-4 py-3 group transition-all duration-300 ${
        animating ? "bg-green-50" : completed ? "opacity-55" : "hover:bg-slate-50/70"
      }`}
    >
      <TaskCheckbox
        completed={completed}
        animating={animating}
        onClick={() => onToggle(task)}
        testId={`checkbox-${task.id}`}
        disabled={readOnly}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {task.isUrgent && !completed && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-50 text-red-600">
              <AlertTriangle className="w-2.5 h-2.5" />
              Urgent
            </span>
          )}
          {isPrioritized && !completed && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
              <Flag className="w-2.5 h-2.5" />
              Priority Alert
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

        {task.description && (
          <p
            className={`text-xs mt-0.5 leading-relaxed ${
              completed ? "text-slate-300 line-through" : "text-slate-400"
            }`}
          >
            {task.description}
          </p>
        )}

        {task.category === "achc" && task.frequency === "quarterly" && (
          <Link
            href="/app/achc-workbook"
            className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 mt-1"
            data-testid={`link-achc-workbook-${task.id}`}
          >
            Open ACHC Workbook
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        )}

        {assignment && (
          <p className="text-[10px] text-purple-600 font-medium mt-1">
            Assigned to{" "}
            {assignment.assignedToName
              ? assignment.assignedToName
              : (ROLE_CONFIG[assignment.assignedToRole as keyof typeof ROLE_CONFIG]?.short ??
                  assignment.assignedToRole)}
            {assignment.note ? ` · ${assignment.note}` : ""}
          </p>
        )}
      </div>

      {/* Category badge — right-aligned */}
      <span
        className={`shrink-0 self-start mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${cat.badge}`}
      >
        {cat.label}
      </span>

      {/* Priority alert button — directors only */}
      {canPrioritize && !readOnly && (
        <button
          data-testid={`button-prioritize-${task.id}`}
          onClick={() => onPrioritize(task)}
          title={isPrioritized ? "Remove priority alert" : "Send priority alert to Pharmacy Director"}
          className={`shrink-0 p-1.5 rounded-md transition-colors ${
            isPrioritized
              ? "text-amber-600 bg-amber-50 visible"
              : "invisible group-hover:visible text-slate-400 hover:text-amber-600 hover:bg-amber-50"
          }`}
        >
          <Flag className="w-4 h-4" />
        </button>
      )}

      {/* Assign button — directors only, techs can be reassigned */}
      {canAssign && !completed && !readOnly && (
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

// ── Task Group Section ────────────────────────────────────────────────────────

function TaskGroupSection({
  groupName,
  tasks,
  completions,
  animating,
  assignments,
  priorities,
  canAssign,
  canPrioritize,
  readOnly,
  onToggle,
  onAssign,
  onPrioritize,
}: {
  groupName: string;
  tasks: PharmacyTask[];
  completions: Set<string>;
  animating: Set<string>;
  assignments: Map<string, TaskAssignment>;
  priorities: Set<string>;
  canAssign: boolean;
  canPrioritize: boolean;
  readOnly?: boolean;
  onToggle: (t: PharmacyTask) => void;
  onAssign: (t: PharmacyTask) => void;
  onPrioritize: (t: PharmacyTask) => void;
}) {
  const [open, setOpen] = useState(true);
  const done = tasks.filter((t) => completions.has(t.id)).length;
  const allDone = done === tasks.length;

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        data-testid={`group-header-${groupName.replace(/\s+/g, "-").toLowerCase()}`}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
        <span className="text-xs font-semibold text-slate-600 flex-1">{groupName}</span>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            allDone
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {done}/{tasks.length}
        </span>
      </button>

      {open && (
        <div className="divide-y divide-slate-50">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              completed={completions.has(task.id)}
              animating={animating.has(task.id)}
              assignment={assignments.get(task.id)}
              canAssign={canAssign}
              canPrioritize={canPrioritize}
              isPrioritized={priorities.has(task.id)}
              readOnly={readOnly}
              onToggle={onToggle}
              onAssign={onAssign}
              onPrioritize={onPrioritize}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Role Section ─────────────────────────────────────────────────────────────

function RoleSection({
  role,
  groups,
  completions,
  animating,
  assignments,
  priorities,
  canAssign,
  canPrioritize,
  readOnly,
  onToggle,
  onAssign,
  onPrioritize,
}: {
  role: TaskRole;
  groups: Array<{ groupName: string; tasks: PharmacyTask[] }>;
  completions: Set<string>;
  animating: Set<string>;
  assignments: Map<string, TaskAssignment>;
  priorities: Set<string>;
  canAssign: boolean;
  canPrioritize: boolean;
  readOnly?: boolean;
  onToggle: (t: PharmacyTask) => void;
  onAssign: (t: PharmacyTask) => void;
  onPrioritize: (t: PharmacyTask) => void;
}) {
  const [open, setOpen] = useState(true);
  const style = ROLE_STYLE[role];

  const allTasks = groups.flatMap((g) => g.tasks);
  const done = allTasks.filter((t) => completions.has(t.id)).length;
  const total = allTasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div
      data-testid={`role-section-${role}`}
      className={`mb-4 border rounded-md overflow-hidden border-slate-200`}
    >
      {/* Role header */}
      <button
        onClick={() => setOpen((o) => !o)}
        data-testid={`role-header-${role}`}
        className={`w-full flex items-center gap-3 px-4 py-3 ${style.bg} hover:brightness-95 transition-all text-left`}
      >
        {open ? (
          <ChevronDown className={`w-4 h-4 shrink-0 ${style.labelColor}`} />
        ) : (
          <ChevronRight className={`w-4 h-4 shrink-0 ${style.labelColor}`} />
        )}

        <div className="flex-1 min-w-0">
          <span className={`text-sm font-bold ${style.labelColor}`}>{style.label}</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-20 h-1.5 rounded-full bg-white/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct === 100 ? "bg-green-500" : "bg-white/80"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <span className={`text-xs font-bold ${style.labelColor}`}>{done}/{total}</span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              pct === 100 ? "bg-green-100 text-green-700" : style.badgeColor
            }`}
          >
            {pct}%
          </span>
        </div>
      </button>

      {/* Task groups */}
      {open && (
        <div className="bg-white">
          {groups.map(({ groupName, tasks }) => (
            <TaskGroupSection
              key={groupName}
              groupName={groupName}
              tasks={tasks}
              completions={completions}
              animating={animating}
              assignments={assignments}
              priorities={priorities}
              canAssign={canAssign}
              canPrioritize={canPrioritize}
              readOnly={readOnly}
              onToggle={onToggle}
              onAssign={onAssign}
              onPrioritize={onPrioritize}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Site Overview Panel (directors) ─────────────────────────────────────────

function SiteOverviewPanel({
  siteId,
  frequency,
  onSelectRole,
  viewingRole,
}: {
  siteId: string;
  frequency: TaskFrequency;
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
        const roleCompletions = loadCompletions(siteId, frequency, role);
        const roleTasks = TASKS.filter(
          (t) => t.frequency === frequency && (t.role === role || t.role === "all_staff")
        );
        const done = roleTasks.filter((t) => roleCompletions.has(t.id)).length;
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
  const [specificPerson, setSpecificPerson] = useState("");
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
              Specific Staff Member{" "}
              <span className="normal-case font-normal text-slate-400">(optional — overrides role)</span>
            </p>
            <input
              type="text"
              value={specificPerson}
              onChange={(e) => setSpecificPerson(e.target.value)}
              data-testid="input-assign-person"
              placeholder="e.g., Sarah M. or sarah@example.com"
              className="w-full text-sm rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300 text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Note{" "}
              <span className="normal-case font-normal text-slate-400">(optional)</span>
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
                assignedToName: specificPerson.trim() || undefined,
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

// ── Priority Dialog ────────────────────────────────────────────────────────────

function PriorityDialog({
  task,
  siteId,
  directorName,
  directorRole,
  isPrioritized,
  onSave,
  onRemove,
  onClose,
}: {
  task: PharmacyTask;
  siteId: string;
  directorName: string;
  directorRole: string;
  isPrioritized: boolean;
  onSave: (p: TaskPriority) => void;
  onRemove: (taskId: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        data-testid="dialog-prioritize-task"
        className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-slate-900 text-sm">
              {isPrioritized ? "Remove Priority Alert" : "Send Priority Alert"}
            </h3>
          </div>
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
          {isPrioritized ? (
            <p className="text-sm text-slate-600">
              This task is currently flagged as a priority alert for the Pharmacy Director. Removing it will clear the alert.
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                This will send a priority alert to the Pharmacy Director at this store. They will see it highlighted in their task list.
              </p>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Note{" "}
                  <span className="normal-case font-normal text-slate-400">(optional)</span>
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  data-testid="input-priority-note"
                  placeholder="Add context for the Pharmacy Director..."
                  className="w-full text-sm rounded-md border border-slate-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 text-slate-700 placeholder:text-slate-400"
                  rows={2}
                />
              </div>
            </>
          )}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          {isPrioritized ? (
            <button
              onClick={() => { onRemove(task.id); onClose(); }}
              data-testid="button-confirm-remove-priority"
              className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-slate-600 hover:bg-slate-700 transition-colors"
            >
              Remove Alert
            </button>
          ) : (
            <button
              onClick={() => {
                onSave({
                  taskId: task.id,
                  taskTitle: task.title,
                  siteId,
                  note: note.trim(),
                  prioritizedBy: directorName,
                  prioritizedByRole: directorRole,
                  prioritizedAt: new Date().toISOString(),
                  dismissed: false,
                });
                onClose();
              }}
              data-testid="button-confirm-priority"
              className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors"
            >
              Send Alert
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Custom Tasks (handoff items for today) ────────────────────────────────────
function CustomTasksSection({
  siteId,
  note,
  onToggle,
}: {
  siteId: string;
  note: HandoffNote;
  onToggle: (itemId: string) => void;
}) {
  const allDone = note.items.every((i) => i.completed);
  return (
    <div
      data-testid="custom-tasks-section"
      className="bg-white border border-indigo-200 rounded-md overflow-hidden"
    >
      <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-indigo-600 shrink-0" />
        <span className="text-sm font-bold text-indigo-800">Handoff Tasks</span>
        <span className="text-xs text-indigo-500 ml-1">
          from yesterday's notes · {note.items.filter((i) => i.completed).length}/{note.items.length} done
        </span>
        {allDone && (
          <span className="ml-auto text-xs font-semibold text-green-600 flex items-center gap-1">
            <Check className="w-3 h-3" /> All clear
          </span>
        )}
      </div>
      <ul className="divide-y divide-slate-50">
        {note.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-5 py-3">
            <button
              data-testid={`handoff-check-${item.id}`}
              onClick={() => onToggle(item.id)}
              className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                item.completed
                  ? "bg-green-500 border-green-500 scale-110"
                  : "border-slate-300 hover:border-indigo-400"
              }`}
            >
              {item.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </button>
            <span
              className={`text-sm transition-all ${
                item.completed ? "line-through text-slate-400" : "text-slate-700"
              }`}
            >
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Handoff Panel (write notes for tomorrow) ──────────────────────────────────
function HandoffPanel({
  siteId,
  authorName,
  authorRole,
}: {
  siteId: string;
  authorName: string;
  authorRole: string;
}) {
  const tomorrow = getTomorrowDateKey();
  const existing = loadHandoffForDate(siteId, tomorrow);

  const [rawText, setRawText] = useState("");
  const [items, setItems] = useState<HandoffItem[]>(existing?.items ?? []);
  const [newItemText, setNewItemText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(!!existing);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/handoff/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });
      const data = await res.json();
      if (Array.isArray(data.items)) {
        setItems(
          data.items.map((text: string, i: number) => ({
            id: `gen-${Date.now()}-${i}`,
            text,
            completed: false,
          }))
        );
        setSaved(false);
      } else {
        setError("Could not generate items. Try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    const t = newItemText.trim();
    if (!t) return;
    setItems((prev) => [...prev, { id: `manual-${Date.now()}`, text: t, completed: false }]);
    setNewItemText("");
    setSaved(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSaved(false);
  };

  const handleSave = () => {
    if (items.length === 0) return;
    saveHandoffNote({
      id: `${siteId}-${tomorrow}`,
      siteId,
      rawText,
      items,
      forDate: tomorrow,
      createdAt: new Date().toISOString(),
      createdBy: authorName,
      createdByRole: authorRole,
    });
    setSaved(true);
  };

  return (
    <div
      data-testid="handoff-panel"
      className="bg-white border border-slate-200 rounded-md overflow-hidden"
    >
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-purple-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-800">Handoff Notes</p>
          <p className="text-xs text-slate-400">Leave tasks for tomorrow's team</p>
        </div>
        {saved && items.length > 0 && (
          <span
            data-testid="handoff-saved-badge"
            className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md"
          >
            Saved for tomorrow
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Raw text input */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
            What needs attention tomorrow?
          </label>
          <textarea
            data-testid="handoff-textarea"
            value={rawText}
            onChange={(e) => { setRawText(e.target.value); setSaved(false); }}
            placeholder="e.g. Patient Jones called about refill, fridge temp alarm triggered, waiting on DEA audit documents from supplier..."
            className="w-full text-sm rounded-md border border-slate-200 px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 text-slate-700 placeholder:text-slate-400 min-h-[80px]"
            rows={3}
          />
          <button
            data-testid="handoff-generate-btn"
            onClick={handleGenerate}
            disabled={loading || !rawText.trim()}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {loading ? "Generating…" : "Generate Items"}
          </button>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        {/* Generated / manual bullet list */}
        {items.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Tasks for tomorrow ({items.length})
            </p>
            <ul className="space-y-1.5">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                  <span
                    data-testid={`handoff-item-${item.id}`}
                    className="flex-1 text-sm text-slate-700"
                  >
                    {item.text}
                  </span>
                  <button
                    data-testid={`handoff-remove-${item.id}`}
                    onClick={() => handleRemoveItem(item.id)}
                    className="shrink-0 text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Manual add */}
        <div className="flex items-center gap-2">
          <input
            data-testid="handoff-add-input"
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddItem(); }}
            placeholder="Add a custom task…"
            className="flex-1 text-sm rounded-md border border-slate-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300 text-slate-700 placeholder:text-slate-400"
          />
          <button
            data-testid="handoff-add-btn"
            onClick={handleAddItem}
            disabled={!newItemText.trim()}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-1 border-t border-slate-100">
          <button
            data-testid="handoff-save-btn"
            onClick={handleSave}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
          >
            <ClipboardCheck className="w-4 h-4" />
            Save for Tomorrow
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

  // Optional URL params from regional dashboard drill-down
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const rawUrlSiteId = searchParams.get("siteId");

  // Regional/CPO directors can drill into any site via URL param and retain full access.
  const isRegionalDir = profile ? isRegionalOrAbove(profile.role) : false;
  const knownSiteIds = new Set(SITES.map((s) => s.id));
  const effectiveRawSiteId =
    rawUrlSiteId && knownSiteIds.has(rawUrlSiteId) ? rawUrlSiteId : null;
  const urlSiteId =
    effectiveRawSiteId && isRegionalDir ? effectiveRawSiteId : null;
  const readOnly = false;

  const [frequency, setFrequency] = useState<TaskFrequency>("daily");
  const [viewingRole, setViewingRole] = useState<ViewingRole>(urlSiteId ? "all" : "own");
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [animating, setAnimating] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<Map<string, TaskAssignment>>(new Map());
  const [assigningTask, setAssigningTask] = useState<PharmacyTask | null>(null);
  const [prioritizingTask, setPrioritizingTask] = useState<PharmacyTask | null>(null);
  const [activePriorities, setActivePriorities] = useState<TaskPriority[]>([]);
  const [priorityIds, setPriorityIds] = useState<Set<string>>(new Set());
  const [todayHandoff, setTodayHandoff] = useState<HandoffNote | null>(null);

  const siteId = urlSiteId ?? profile?.siteId ?? "1417";
  const isDir = isDirectorRole(profile?.role ?? "pharmacist");
  const isPharmDir = profile ? isPharmacyDirector(profile.role) : false;
  const canPrioritize = isDir && !isTechRole(profile?.role ?? "pharmacist");

  useEffect(() => {
    if (!profile) return;
    let roleFilter: string | undefined;
    if (isDir) {
      if (viewingRole === "all") roleFilter = undefined;
      else if (viewingRole === "own") roleFilter = "director";
      else roleFilter = viewingRole as string;
    } else {
      roleFilter = profile.role;
    }
    setCompletions(loadCompletions(siteId, frequency, roleFilter));
    const aList = loadAssignments(siteId);
    setAssignments(new Map(aList.map((a) => [a.taskId, a])));
    const pList = loadPriorities(siteId);
    setActivePriorities(pList);
    setPriorityIds(new Set(pList.map((p) => p.taskId)));
    // Load today's handoff tasks and purge stale entries
    purgeStaleHandoffNotes();
    setTodayHandoff(loadHandoffForDate(siteId, getTodayDateKey()));
  }, [frequency, siteId, profile?.email, viewingRole]);

  const toggleCompletion = useCallback(
    (task: PharmacyTask) => {
      if (!profile || readOnly) return;
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
        saveCompletion(task.id, task.role, siteId, profile.email, profile.role, task.frequency);
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

  const handlePrioritySave = useCallback((p: TaskPriority) => {
    savePriority(p);
    setActivePriorities((prev) => [...prev.filter((x) => x.taskId !== p.taskId), p]);
    setPriorityIds((prev) => new Set([...prev, p.taskId]));
  }, []);

  const handlePriorityRemove = useCallback((taskId: string) => {
    removePriority(taskId, siteId);
    setActivePriorities((prev) => prev.filter((p) => p.taskId !== taskId));
    setPriorityIds((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  }, [siteId]);

  const handleDismissPriority = useCallback((taskId: string) => {
    dismissPriority(taskId, siteId);
    setActivePriorities((prev) => prev.filter((p) => p.taskId !== taskId));
  }, [siteId]);

  const handleDismissAllPriorities = useCallback(() => {
    activePriorities.forEach((p) => dismissPriority(p.taskId, siteId));
    setActivePriorities([]);
  }, [activePriorities, siteId]);

  const handleHandoffToggle = useCallback((itemId: string) => {
    const today = getTodayDateKey();
    toggleHandoffItemComplete(siteId, today, itemId);
    setTodayHandoff(loadHandoffForDate(siteId, today));
  }, [siteId]);

  if (!profile) return null;

  const showHandoff = !isRegionalOrAbove(profile.role) && !urlSiteId;

  const drillSite = urlSiteId
    ? (SITES.find((s) => s.id === urlSiteId) ?? (findStore(urlSiteId) ? { id: urlSiteId, name: findStore(urlSiteId)!.name, region: "" } : null))
    : null;
  const displaySiteName = drillSite?.name ?? profile.siteName;

  const visible = getVisibleTasks(frequency, profile.role, viewingRole);
  const roleGroups = buildRoleGroups(visible, viewingRole, profile.role);
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
      {/* Priority alert banner — Pharmacy Director only */}
      {isPharmDir && activePriorities.length > 0 && (
        <div
          data-testid="priority-alert-banner"
          className="bg-amber-50 border-b border-amber-200 px-6 py-3"
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-2">
                <Bell className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    {activePriorities.length} priority alert{activePriorities.length !== 1 ? "s" : ""} from leadership
                  </p>
                  <div className="mt-1 space-y-1">
                    {activePriorities.map((p) => (
                      <div key={p.taskId} className="flex items-start gap-2">
                        <Flag className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="text-xs font-medium text-amber-800">{p.taskTitle}</span>
                          {p.note && (
                            <span className="text-xs text-amber-600 ml-1">· {p.note}</span>
                          )}
                          <span className="text-xs text-amber-500 ml-1">
                            — {p.prioritizedBy}
                          </span>
                        </div>
                        <button
                          data-testid={`button-dismiss-priority-${p.taskId}`}
                          onClick={() => handleDismissPriority(p.taskId)}
                          className="shrink-0 text-amber-400 hover:text-amber-700 transition-colors"
                          title="Dismiss alert"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button
                data-testid="button-dismiss-all-priorities"
                onClick={handleDismissAllPriorities}
                className="text-xs font-medium text-amber-600 hover:text-amber-800 transition-colors shrink-0"
              >
                Dismiss all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="w-5 h-5 text-purple-600" />
                <h1 className="text-2xl font-bold text-slate-900">Task Manager</h1>
              </div>
              <p className="text-sm text-slate-400">
                {displaySiteName} · {today}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5 mb-1.5">
                  <span className="text-sm font-bold text-slate-800">{overallPct}%</span>
                  <span className="text-xs text-slate-400">overall</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-32 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        overallPct === 100 ? "bg-green-500" : "bg-purple-500"
                      }`}
                      style={{ width: `${overallPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">
                    {doneTasks}/{totalTasks}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* Frequency tabs */}
        <div className="flex gap-1 bg-white border border-slate-100 rounded-md p-1">
          {FREQUENCY_TABS.map((tab) => (
            <button
              key={tab.value}
              data-testid={`freq-tab-${tab.value}`}
              onClick={() => setFrequency(tab.value)}
              className={`flex-1 px-3 py-2 rounded text-sm font-semibold transition-all ${
                frequency === tab.value
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Director role-view selector */}
        {isDir && !readOnly && (
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
        {isDir && !readOnly && (
          <SiteOverviewPanel
            siteId={siteId}
            frequency={frequency}
            onSelectRole={setViewingRole}
            viewingRole={viewingRole}
          />
        )}

        {/* Handoff tasks from yesterday — daily view only, store users only */}
        {showHandoff && frequency === "daily" && todayHandoff && todayHandoff.items.length > 0 && (
          <CustomTasksSection
            siteId={siteId}
            note={todayHandoff}
            onToggle={handleHandoffToggle}
          />
        )}

        {/* Role-based task list */}
        {roleGroups.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-md px-6 py-12 text-center">
            <p className="text-slate-400 text-sm">
              No tasks for this period and role combination.
            </p>
          </div>
        ) : (
          <div>
            {roleGroups.map(({ role, groups }) => (
              <RoleSection
                key={role}
                role={role}
                groups={groups}
                completions={completions}
                animating={animating}
                assignments={assignments}
                priorities={priorityIds}
                canAssign={isDir}
                canPrioritize={canPrioritize}
                readOnly={readOnly}
                onToggle={toggleCompletion}
                onAssign={setAssigningTask}
                onPrioritize={setPrioritizingTask}
              />
            ))}
          </div>
        )}

        {/* All done banner */}
        {totalTasks > 0 && doneTasks === totalTasks && (
          <div className="flex items-center gap-2 justify-center py-4 text-green-600">
            <PartyPopper className="w-5 h-5" />
            <span className="text-sm font-semibold">All tasks complete for this period!</span>
          </div>
        )}

        {/* Handoff notes panel — daily view only, store users only */}
        {showHandoff && frequency === "daily" && (
          <HandoffPanel
            siteId={siteId}
            authorName={profile.name}
            authorRole={profile.role}
          />
        )}
      </div>

      {/* Assign dialog */}
      {assigningTask && (
        <AssignDialog
          task={assigningTask}
          siteId={siteId}
          directorName={profile.name}
          onSave={handleAssignSave}
          onClose={() => setAssigningTask(null)}
        />
      )}

      {/* Priority dialog */}
      {prioritizingTask && (
        <PriorityDialog
          task={prioritizingTask}
          siteId={siteId}
          directorName={profile.name}
          directorRole={profile.role}
          isPrioritized={priorityIds.has(prioritizingTask.id)}
          onSave={handlePrioritySave}
          onRemove={handlePriorityRemove}
          onClose={() => setPrioritizingTask(null)}
        />
      )}
    </div>
  );
}
