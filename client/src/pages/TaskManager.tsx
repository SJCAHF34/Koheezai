import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useAuth } from "@/App";
import {
  getUserProfile,
  isDirectorRole,
  isRegionalOrAbove,
  isPharmacyDirector,
  isTechRole,
  getRoleLabel,
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
  type TaskCategory,
} from "@/lib/taskData";
import { findStore } from "@/lib/storeDirectory";
import { AHF_LOCATIONS, US_STATES, type AhfLocation } from "@/lib/ahfLocations";
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
  loadHandoffNoteForRoleAndDate,
  loadHandoffNotesForRole,
  saveHandoffNote,
  toggleHandoffItemComplete,
  getTodayDateKey,
  getTomorrowDateKey,
  purgeStaleHandoffNotes,
  loadRetentionRisk,
  saveRetentionRisk,
  loadRoster,
  saveRoster,
  loadSiteCompletions,
  type TaskCompletion,
  type TaskAssignment,
  type TaskPriority,
  type HandoffNote,
  type HandoffItem,
  type RetentionRiskEntry,
  type StaffMember,
  type SiteRoster,
} from "@/lib/taskStorage";
import type { RetentionPatient, RetentionIssueType, RetentionStatus } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Calendar } from "@/components/ui/calendar";
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
  Users,
  BarChart3,
  Filter,
  Minus,
  Save,
  Pencil,
  CalendarDays,
  ShieldAlert,
  History,
  Phone,
  Mail,
  Contact,
  ChevronUp,
  EyeOff,
  Eye,
  Search,
  AlertCircle,
  MapPin,
  Building2,
  ToggleLeft,
  ToggleRight,
  Send,
  CheckCircle2,
  Clock,
} from "lucide-react";

// ── API helpers for retention patients ───────────────────────────────────────

async function apiLoadRetentionPatients(siteId: string): Promise<RetentionPatient[]> {
  try {
    return await apiRequest<RetentionPatient[]>(`/api/retention/patients/${siteId}`);
  } catch {
    return [];
  }
}

async function apiAddRetentionPatient(patient: Omit<RetentionPatient, "id">): Promise<RetentionPatient> {
  return apiRequest<RetentionPatient>("/api/retention/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patient),
  });
}

async function apiUpdateRetentionPatient(patient: RetentionPatient): Promise<RetentionPatient> {
  return apiRequest<RetentionPatient>(`/api/retention/patients/${patient.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patient),
  });
}

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
  viewingRole: ViewingRole,
  extraRoles?: string[]
): PharmacyTask[] {
  const byFreq = TASKS.filter((t) => t.frequency === frequency);
  if (isDirectorRole(userRole)) {
    if (viewingRole === "all") return byFreq;
    if (viewingRole === "own")
      return byFreq.filter((t) => t.role === "director" || t.role === "all_staff");
    return byFreq.filter((t) => t.role === viewingRole || t.role === "all_staff");
  }
  const allRoles = extraRoles && extraRoles.length > 0 ? extraRoles : [userRole];
  return byFreq.filter((t) => (allRoles as string[]).includes(t.role) || t.role === "all_staff");
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
  pharmacist_1: {
    border: "border-purple-300",
    bg: "bg-purple-50",
    label: "Pharmacist 1",
    labelColor: "text-purple-800",
    badgeColor: "bg-purple-100 text-purple-700",
  },
  pharmacist_2: {
    border: "border-indigo-300",
    bg: "bg-indigo-50",
    label: "Pharmacist 2",
    labelColor: "text-indigo-800",
    badgeColor: "bg-indigo-100 text-indigo-700",
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
  siteId,
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
  siteId?: string;
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

        {task.category === "achc" && task.frequency === "quarterly" && task.id !== "cqi-q-001" && (
          <Link
            href="/app/achc-workbook"
            className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 mt-1"
            data-testid={`link-achc-workbook-${task.id}`}
          >
            Open ACHC Workbook
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        )}

        {task.id === "cqi-q-001" && (
          <Link
            href="/app/cqi-meeting"
            className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 mt-1"
            data-testid={`link-cqi-meeting-${task.id}`}
          >
            Open CQI Meeting Form
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

        {task.id === "pv2-d-008" && siteId && (
          <PatientRetentionTracker siteId={siteId} />
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
  siteId,
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
  siteId?: string;
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
              siteId={siteId}
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
  siteId,
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
  siteId?: string;
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
              siteId={siteId}
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
    { role: "pharmacist_1", label: "RPh 1" },
    { role: "pharmacist_2", label: "RPh 2" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-2">
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

// ── Patient Retention Tracker ─────────────────────────────────────────────────

const ISSUE_CONFIG: Record<
  RetentionIssueType,
  { label: string; color: string; headerBg: string; borderColor: string; badgeBg: string; badgeText: string }
> = {
  lost_contact: {
    label: "Lost Contact",
    color: "red",
    headerBg: "bg-red-50 border-red-200",
    borderColor: "border-red-200",
    badgeBg: "bg-red-100",
    badgeText: "text-red-800",
  },
  insurance_lockout: {
    label: "Insurance Lockout",
    color: "yellow",
    headerBg: "bg-yellow-50 border-yellow-200",
    borderColor: "border-yellow-200",
    badgeBg: "bg-yellow-100",
    badgeText: "text-yellow-800",
  },
  out_of_state: {
    label: "Out of State",
    color: "blue",
    headerBg: "bg-blue-50 border-blue-200",
    borderColor: "border-blue-200",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-800",
  },
};

const STATUS_CONFIG: Record<RetentionStatus, { label: string; bg: string; text: string }> = {
  active: { label: "Active", bg: "bg-green-100", text: "text-green-800" },
  resolved: { label: "Resolved", bg: "bg-slate-100", text: "text-slate-600" },
  referred_out: { label: "Referred Out", bg: "bg-purple-100", text: "text-purple-800" },
};

function daysSince(dateStr: string): number {
  const added = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - added.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface AddPatientFormState {
  initials: string;
  phone1: string;
  phone2: string;
  email: string;
  caseManagerContact: string;
  notes: string;
  // insurance lockout
  bin: string;
  pcn: string;
  rxgrp: string;
  insuranceId: string;
  // out of state
  city: string;
  state: string;
  zip: string;
  ahfLocationMatch: string;
}

const EMPTY_FORM: AddPatientFormState = {
  initials: "",
  phone1: "",
  phone2: "",
  email: "",
  caseManagerContact: "",
  notes: "",
  bin: "",
  pcn: "",
  rxgrp: "",
  insuranceId: "",
  city: "",
  state: "",
  zip: "",
  ahfLocationMatch: "",
};

const OUTREACH_STEPS = [
  { day: 1, label: "Day 1 — SMS to patient" },
  { day: 2, label: "Day 2 — SMS reminder" },
  { day: 3, label: "Day 3 — Email to patient" },
  { day: 4, label: "Day 4 — Email to case manager" },
];

function PatientCard({
  patient,
  onUpdate,
}: {
  patient: RetentionPatient;
  onUpdate: (p: RetentionPatient) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const today = getTodayDateKey();
  const days = daysSince(patient.dateAdded);

  async function logAttempt() {
    const updated: RetentionPatient = {
      ...patient,
      attemptCount: patient.attemptCount + 1,
      lastAttemptDate: today,
    };
    try {
      const saved = await apiUpdateRetentionPatient(updated);
      onUpdate(saved);
    } catch {
      onUpdate(updated);
    }
  }

  async function resolve() {
    const updated: RetentionPatient = {
      ...patient,
      status: "resolved",
      resolvedDate: today,
    };
    try {
      const saved = await apiUpdateRetentionPatient(updated);
      onUpdate(saved);
    } catch {
      onUpdate(updated);
    }
  }

  async function referOut() {
    const updated: RetentionPatient = {
      ...patient,
      status: "referred_out",
      resolvedDate: today,
    };
    try {
      const saved = await apiUpdateRetentionPatient(updated);
      onUpdate(saved);
    } catch {
      onUpdate(updated);
    }
  }

  async function toggleOutreach() {
    const nowActive = !patient.sequenceActive;
    const updated: RetentionPatient = {
      ...patient,
      sequenceActive: nowActive,
      sequenceStartDate: nowActive && !patient.sequenceStartDate ? today : patient.sequenceStartDate,
      outreachComplete: nowActive ? false : patient.outreachComplete,
    };
    try {
      const saved = await apiUpdateRetentionPatient(updated);
      onUpdate(saved);
    } catch {
      onUpdate(updated);
    }
  }

  const statusCfg = STATUS_CONFIG[patient.status];
  const isActive = patient.status === "active";
  const hasContactInfo = patient.phone1 || patient.email;
  const outreachStatusLabel = patient.outreachComplete
    ? "Complete"
    : patient.sequenceDay === 0
    ? "Awaiting start"
    : `Day ${patient.sequenceDay} of 4 — Last sent ${patient.lastOutreachDate ? formatDate(patient.lastOutreachDate) : "—"}`;

  return (
    <div
      data-testid={`card-retention-patient-${patient.id}`}
      className="rounded-md border border-slate-200 bg-white"
    >
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="flex items-start gap-2 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
            <span className="text-xs font-bold text-slate-700">{patient.initials}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span data-testid={`text-initials-${patient.id}`} className="text-sm font-semibold text-slate-800">
                {patient.initials}
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusCfg.bg} ${statusCfg.text}`}>
                {statusCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-slate-500">{days === 0 ? "Added today" : `${days}d ago`}</span>
              <span className="text-xs text-slate-500">
                {patient.attemptCount} attempt{patient.attemptCount !== 1 ? "s" : ""}
              </span>
              {patient.lastAttemptDate && (
                <span className="text-xs text-slate-500">Last: {formatDate(patient.lastAttemptDate)}</span>
              )}
              {!isActive && patient.resolvedDate && (
                <span className="text-xs text-slate-400">Closed: {formatDate(patient.resolvedDate)}</span>
              )}
            </div>
          </div>
        </div>
        <button
          data-testid={`button-expand-${patient.id}`}
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 p-1 rounded text-slate-400 hover-elevate"
          aria-label="Toggle details"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-3 pb-3 pt-2 space-y-2">
          <div className="grid grid-cols-1 gap-1.5 text-xs">
            {patient.phone1 && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Phone className="w-3 h-3 flex-shrink-0 text-slate-400" />
                <span className="font-medium text-slate-500 w-20 flex-shrink-0">Primary:</span>
                <span data-testid={`text-phone1-${patient.id}`}>{patient.phone1}</span>
              </div>
            )}
            {patient.phone2 && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Phone className="w-3 h-3 flex-shrink-0 text-slate-400" />
                <span className="font-medium text-slate-500 w-20 flex-shrink-0">Emergency:</span>
                <span data-testid={`text-phone2-${patient.id}`}>{patient.phone2}</span>
              </div>
            )}
            {patient.email && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Mail className="w-3 h-3 flex-shrink-0 text-slate-400" />
                <span className="font-medium text-slate-500 w-20 flex-shrink-0">Email:</span>
                <span data-testid={`text-email-${patient.id}`}>{patient.email}</span>
              </div>
            )}
            {patient.caseManagerContact && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Contact className="w-3 h-3 flex-shrink-0 text-slate-400" />
                <span className="font-medium text-slate-500 w-20 flex-shrink-0">Case Mgr:</span>
                <span data-testid={`text-case-manager-${patient.id}`}>{patient.caseManagerContact}</span>
              </div>
            )}

            {/* Insurance plan fields */}
            {patient.issueType === "insurance_lockout" && (patient.bin || patient.pcn || patient.rxgrp || patient.insuranceId) && (
              <div className="mt-1 p-2 rounded-md bg-yellow-50 border border-yellow-100 space-y-1">
                <p className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide">Insurance Plan</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                  {patient.bin && <div><span className="text-yellow-600 font-medium">BIN:</span> {patient.bin}</div>}
                  {patient.pcn && <div><span className="text-yellow-600 font-medium">PCN:</span> {patient.pcn}</div>}
                  {patient.rxgrp && <div><span className="text-yellow-600 font-medium">RXGRP:</span> {patient.rxgrp}</div>}
                  {patient.insuranceId && <div><span className="text-yellow-600 font-medium">Member ID:</span> {patient.insuranceId}</div>}
                </div>
              </div>
            )}

            {/* Out of state fields */}
            {patient.issueType === "out_of_state" && (patient.city || patient.state || patient.zip) && (
              <div className="mt-1 p-2 rounded-md bg-blue-50 border border-blue-100 space-y-1">
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">New Location</p>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  <span data-testid={`text-location-${patient.id}`}>
                    {[patient.city, patient.state, patient.zip].filter(Boolean).join(", ")}
                  </span>
                </div>
                {patient.ahfLocationMatch && (
                  <div className="flex items-start gap-1.5 text-blue-700">
                    <Building2 className="w-3 h-3 flex-shrink-0 mt-0.5 text-blue-400" />
                    <span className="font-medium">{patient.ahfLocationMatch}</span>
                  </div>
                )}
              </div>
            )}

            {patient.notes && (
              <div className="mt-1 p-2 rounded bg-slate-50 text-slate-600">
                <span className="font-medium text-slate-500">Notes: </span>
                {patient.notes}
              </div>
            )}
          </div>

          {/* Outreach Sequence Section */}
          {isActive && hasContactInfo && (
            <div className="mt-2 p-2.5 rounded-md bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Automated Outreach</span>
                </div>
                <button
                  data-testid={`button-toggle-outreach-${patient.id}`}
                  onClick={toggleOutreach}
                  className="flex items-center gap-1 text-xs font-medium text-slate-600 hover-elevate rounded px-1"
                  aria-label="Toggle outreach sequence"
                >
                  {patient.sequenceActive
                    ? <ToggleRight className="w-5 h-5 text-green-600" />
                    : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                  {patient.sequenceActive ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                {patient.outreachComplete
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  : patient.sequenceActive
                  ? <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  : <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                <span
                  data-testid={`text-outreach-status-${patient.id}`}
                  className={`font-medium ${patient.outreachComplete ? "text-green-700" : patient.sequenceActive ? "text-amber-700" : "text-slate-500"}`}
                >
                  {outreachStatusLabel}
                </span>
              </div>

              {patient.sequenceActive && patient.sequenceDay > 0 && (
                <div className="space-y-1 pt-0.5">
                  {OUTREACH_STEPS.map((step) => {
                    const done = patient.sequenceDay >= step.day;
                    return (
                      <div key={step.day} className="flex items-center gap-1.5 text-[11px]">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-green-500" : "bg-slate-200"}`}>
                          {done && <Check className="w-2 h-2 text-white" />}
                        </div>
                        <span className={done ? "text-green-700 line-through" : "text-slate-500"}>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {isActive && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                data-testid={`button-log-attempt-${patient.id}`}
                onClick={logAttempt}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 hover-elevate"
              >
                <History className="w-3 h-3" /> Log Attempt
              </button>
              <button
                data-testid={`button-resolve-${patient.id}`}
                onClick={resolve}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-800 hover-elevate"
              >
                <Check className="w-3 h-3" /> Resolve
              </button>
              <button
                data-testid={`button-refer-out-${patient.id}`}
                onClick={referOut}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-800 hover-elevate"
              >
                <ArrowUpRight className="w-3 h-3" /> Refer Out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RetentionSection({
  issueType,
  patients,
  siteId,
  onPatientsChange,
}: {
  issueType: RetentionIssueType;
  patients: RetentionPatient[];
  siteId: string;
  onPatientsChange: () => void;
}) {
  const cfg = ISSUE_CONFIG[issueType];
  const [showForm, setShowForm] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [form, setForm] = useState<AddPatientFormState>(EMPTY_FORM);
  const [ahfSearchQuery, setAhfSearchQuery] = useState("");

  const active = patients.filter((p) => p.status === "active");
  const resolved = patients.filter((p) => p.status !== "active");

  async function handleAdd() {
    if (!form.initials.trim()) return;
    try {
      await apiAddRetentionPatient({
        siteId,
        initials: form.initials.trim().toUpperCase(),
        issueType,
        dateAdded: getTodayDateKey(),
        attemptCount: 0,
        lastAttemptDate: null,
        notes: form.notes.trim(),
        status: "active",
        resolvedDate: null,
        phone1: form.phone1.trim(),
        phone2: form.phone2.trim(),
        email: form.email.trim(),
        caseManagerContact: form.caseManagerContact.trim(),
        bin: form.bin.trim(),
        pcn: form.pcn.trim(),
        rxgrp: form.rxgrp.trim(),
        insuranceId: form.insuranceId.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        ahfLocationMatch: form.ahfLocationMatch.trim(),
        sequenceActive: false,
        sequenceDay: 0,
        sequenceStartDate: null,
        lastOutreachDate: null,
        outreachComplete: false,
      });
    } catch (err) {
      console.error("Failed to add patient:", err);
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    onPatientsChange();
  }

  function handlePatientUpdate() {
    onPatientsChange();
  }

  return (
    <div className={`rounded-md border ${cfg.borderColor} overflow-hidden`}>
      <div className={`flex items-center justify-between px-3 py-2 ${cfg.headerBg} gap-2`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase tracking-wide ${cfg.badgeText}`}>{cfg.label}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.badgeBg} ${cfg.badgeText}`}>
            {active.length} active
          </span>
          {resolved.length > 0 && (
            <span className="text-[10px] font-medium text-slate-400">{resolved.length} resolved</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {resolved.length > 0 && (
            <button
              data-testid={`button-show-resolved-${issueType}`}
              onClick={() => setShowResolved((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-500 hover-elevate"
            >
              {showResolved ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showResolved ? "Hide" : "Show"} Resolved
            </button>
          )}
          <button
            data-testid={`button-add-patient-${issueType}`}
            onClick={() => { setShowForm((v) => { if (v) { setAhfSearchQuery(""); setForm(EMPTY_FORM); } return !v; }); }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${cfg.badgeBg} ${cfg.badgeText} hover-elevate`}
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      {showForm && (
        <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50 space-y-2">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Patient Info</p>

          {/* Initials + Primary Phone — always shown */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Initials *</label>
              <input
                data-testid={`input-initials-${issueType}`}
                type="text"
                maxLength={6}
                value={form.initials}
                onChange={(e) => setForm((f) => ({ ...f, initials: e.target.value }))}
                placeholder="e.g. J.D."
                className="w-full text-xs rounded border border-slate-200 bg-white px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Primary Phone</label>
              <input
                data-testid={`input-phone1-${issueType}`}
                type="tel"
                value={form.phone1}
                onChange={(e) => setForm((f) => ({ ...f, phone1: e.target.value }))}
                placeholder="(555) 000-0000"
                className="w-full text-xs rounded border border-slate-200 bg-white px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Emergency Phone</label>
              <input
                data-testid={`input-phone2-${issueType}`}
                type="tel"
                value={form.phone2}
                onChange={(e) => setForm((f) => ({ ...f, phone2: e.target.value }))}
                placeholder="(555) 000-0000"
                className="w-full text-xs rounded border border-slate-200 bg-white px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Email</label>
              <input
                data-testid={`input-email-${issueType}`}
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="patient@email.com"
                className="w-full text-xs rounded border border-slate-200 bg-white px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Case Manager Contact</label>
            <input
              data-testid={`input-case-manager-${issueType}`}
              type="text"
              value={form.caseManagerContact}
              onChange={(e) => setForm((f) => ({ ...f, caseManagerContact: e.target.value }))}
              placeholder="Name, phone or email"
              className="w-full text-xs rounded border border-slate-200 bg-white px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {/* ── Insurance Lockout: BIN / PCN / RXGRP / Member ID ── */}
          {issueType === "insurance_lockout" && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] font-semibold text-yellow-700 uppercase tracking-wide">Insurance Plan Details</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "BIN", key: "bin" as const, placeholder: "e.g. 610591" },
                  { label: "PCN", key: "pcn" as const, placeholder: "e.g. NPDP" },
                  { label: "RXGRP", key: "rxgrp" as const, placeholder: "e.g. RX7000" },
                  { label: "Member ID", key: "insuranceId" as const, placeholder: "e.g. ABC123456789" },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">{label}</label>
                    <input
                      data-testid={`input-ins-${key}-${issueType}`}
                      type="text"
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full text-xs rounded border border-yellow-200 bg-white px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Out of State: AHF Pharmacy Live Search ── */}
          {issueType === "out_of_state" && (() => {
            const q = ahfSearchQuery.trim().toLowerCase();
            const ahfResults = q.length >= 2
              ? AHF_LOCATIONS.filter((loc) => {
                  const stateName = US_STATES.find((s) => s.abbr === loc.state)?.name.toLowerCase() ?? "";
                  return (
                    loc.city.toLowerCase().includes(q) ||
                    loc.state.toLowerCase().includes(q) ||
                    stateName.includes(q) ||
                    loc.zip.includes(q) ||
                    loc.name.toLowerCase().includes(q)
                  );
                })
              : [];
            const hasNoResults = q.length >= 2 && ahfResults.length === 0;
            return (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Find Nearest AHF Pharmacy</p>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-400 pointer-events-none" />
                  <input
                    data-testid="input-ahf-search"
                    type="text"
                    value={ahfSearchQuery}
                    onChange={(e) => {
                      setAhfSearchQuery(e.target.value);
                      if (form.ahfLocationMatch) setForm((f) => ({ ...f, ahfLocationMatch: "", city: "", state: "", zip: "" }));
                    }}
                    placeholder="Search by city, state, or zip…"
                    className="w-full text-xs rounded border border-blue-200 bg-white pl-6 pr-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                {form.ahfLocationMatch && (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-blue-50 border border-blue-300 text-xs text-blue-800">
                    <Check className="w-3 h-3 text-blue-600 flex-shrink-0" />
                    <span className="font-semibold truncate">{form.ahfLocationMatch}</span>
                    <button
                      type="button"
                      onClick={() => { setForm((f) => ({ ...f, ahfLocationMatch: "", city: "", state: "", zip: "" })); setAhfSearchQuery(""); }}
                      className="ml-auto text-blue-500 hover-elevate rounded px-1"
                    >clear</button>
                  </div>
                )}

                {hasNoResults && (
                  <div className="flex items-start gap-1.5 p-2 rounded-md bg-red-50 border border-red-200">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">
                      No AHF Pharmacy found &mdash;{" "}
                      visit{" "}<a href="https://ahfpharmacy.org/locations/" target="_blank" rel="noopener noreferrer" className="underline">ahfpharmacy.org/locations</a>{" "}to confirm.
                    </p>
                  </div>
                )}

                {ahfResults.length > 0 && !form.ahfLocationMatch && (
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {ahfResults.map((loc) => (
                      <div
                        key={loc.name}
                        data-testid={`ahf-result-${loc.name.replace(/\s+/g, "-").toLowerCase()}`}
                        onClick={() => {
                          setForm((f) => ({ ...f, ahfLocationMatch: loc.name, city: loc.city, state: loc.state, zip: loc.zip }));
                          setAhfSearchQuery("");
                        }}
                        className="cursor-pointer rounded-md border border-slate-200 bg-white p-2 text-xs hover-elevate"
                      >
                        <div className="font-semibold text-slate-800">{loc.name}</div>
                        <div className="text-slate-500">{loc.address}, {loc.city}, {loc.state} {loc.zip}{loc.phone ? ` · ${loc.phone}` : ""}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div>
            <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Notes (optional)</label>
            <textarea
              data-testid={`input-notes-${issueType}`}
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Any relevant context…"
              className="w-full text-xs rounded border border-slate-200 bg-white px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid={`button-submit-patient-${issueType}`}
              onClick={handleAdd}
              disabled={!form.initials.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-slate-700 hover-elevate disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-3 h-3" /> Add Patient
            </button>
            <button
              data-testid={`button-cancel-add-${issueType}`}
              onClick={() => { setForm(EMPTY_FORM); setShowForm(false); setAhfSearchQuery(""); }}
              className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-500 hover-elevate"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="p-2 space-y-2">
        {active.length === 0 && !showResolved && (
          <p className="text-xs text-slate-400 text-center py-2">No active patients — use Add to track one.</p>
        )}
        {active.map((p) => (
          <PatientCard key={p.id} patient={p} onUpdate={handlePatientUpdate} />
        ))}
        {showResolved && resolved.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-1">Resolved / Referred</p>
            {resolved.map((p) => (
              <PatientCard key={p.id} patient={p} onUpdate={handlePatientUpdate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PatientRetentionTracker({ siteId }: { siteId: string }) {
  const [patients, setPatients] = useState<RetentionPatient[]>([]);

  useEffect(() => {
    apiLoadRetentionPatients(siteId).then(setPatients);
  }, [siteId]);

  function refresh() {
    apiLoadRetentionPatients(siteId).then(setPatients);
  }

  const byType = (type: RetentionIssueType) => patients.filter((p) => p.issueType === type);

  return (
    <div data-testid="patient-retention-tracker" className="mt-3 mb-1 space-y-3">
      <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200">
        <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          <span className="font-bold">PHI Notice:</span> Enter patient initials only — PHI integration pending Aptible setup.
        </p>
      </div>

      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide px-0.5">Patient Retention Tracker</p>

      {(["lost_contact", "insurance_lockout", "out_of_state"] as RetentionIssueType[]).map((type) => (
        <RetentionSection
          key={type}
          issueType={type}
          patients={byType(type)}
          siteId={siteId}
          onPatientsChange={refresh}
        />
      ))}

      <RetentionRiskPanel siteId={siteId} />
    </div>
  );
}

function RetentionRiskPanel({ siteId }: { siteId: string }) {
  const date = getTodayDateKey();
  const existing = loadRetentionRisk(siteId, date);
  const [controllable, setControllable] = useState(String(existing?.controllable ?? ""));
  const [partial, setPartial] = useState(String(existing?.partiallyControllable ?? ""));
  const [nonControllable, setNonControllable] = useState(String(existing?.nonControllable ?? ""));
  const [saved, setSaved] = useState(false);

  const total =
    (Number(controllable) || 0) +
    (Number(partial) || 0) +
    (Number(nonControllable) || 0);

  function handleSave() {
    const entry: RetentionRiskEntry = {
      siteId,
      date,
      controllable: Number(controllable) || 0,
      partiallyControllable: Number(partial) || 0,
      nonControllable: Number(nonControllable) || 0,
      updatedAt: new Date().toISOString(),
    };
    saveRetentionRisk(entry);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div
      data-testid="retention-risk-panel"
      className="mt-2 mb-1 bg-amber-50 border border-amber-200 rounded-md p-3 space-y-3"
    >
      <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
        Retention Risk Patient Counts
      </p>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Controllable", value: controllable, set: setControllable, testId: "input-rr-controllable" },
          { label: "Partially Controllable", value: partial, set: setPartial, testId: "input-rr-partial" },
          { label: "Non-Controllable", value: nonControllable, set: setNonControllable, testId: "input-rr-non" },
        ].map(({ label, value, set, testId }) => (
          <div key={label}>
            <p className="text-[10px] font-semibold text-amber-700 mb-1 leading-tight">{label}</p>
            <input
              data-testid={testId}
              type="number"
              min="0"
              value={value}
              onChange={(e) => set(e.target.value)}
              placeholder="0"
              className="w-full text-sm rounded border border-amber-200 bg-white px-2 py-1.5 text-center font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        {total > 0 ? (
          <p className="text-xs text-amber-700">
            <span className="font-bold">{total}</span> total patients at risk today
          </p>
        ) : (
          <p className="text-xs text-amber-500">Enter today's patient counts</p>
        )}
        <button
          data-testid="button-save-retention-risk"
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors"
        >
          {saved ? (
            <>
              <Check className="w-3.5 h-3.5" /> Saved
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" /> Save
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Category Overview Panel (directors) ───────────────────────────────────────

const CATEGORY_ORDER_TM: TaskCategory[] = ["operations", "achc", "state_board", "retention"];
const CATEGORY_COLORS_TM: Record<
  TaskCategory,
  { progress: string; active: string; ring: string }
> = {
  operations: { progress: "bg-slate-500", active: "border-slate-400 bg-slate-50", ring: "ring-slate-200" },
  achc: { progress: "bg-blue-500", active: "border-blue-400 bg-blue-50", ring: "ring-blue-200" },
  state_board: { progress: "bg-emerald-500", active: "border-emerald-400 bg-emerald-50", ring: "ring-emerald-200" },
  retention: { progress: "bg-amber-500", active: "border-amber-400 bg-amber-50", ring: "ring-amber-200" },
};

function CategoryOverviewPanel({
  siteId,
  frequency,
  categoryFilter,
  onFilter,
}: {
  siteId: string;
  frequency: TaskFrequency;
  categoryFilter: TaskCategory | "all";
  onFilter: (c: TaskCategory | "all") => void;
}) {
  const allCompletions = loadCompletions(siteId, frequency);

  return (
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5" />
        Category Performance
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATEGORY_ORDER_TM.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const colors = CATEGORY_COLORS_TM[cat];
          const catTasks = TASKS.filter((t) => t.frequency === frequency && t.category === cat);
          const done = catTasks.filter((t) => allCompletions.has(t.id)).length;
          const total = catTasks.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const isActive = categoryFilter === cat;
          return (
            <button
              key={cat}
              data-testid={`category-overview-${cat}`}
              onClick={() => onFilter(isActive ? "all" : cat)}
              className={`text-left bg-white border rounded-md px-4 py-3 transition-all hover-elevate ${
                isActive ? `${colors.active} ring-1 ${colors.ring}` : "border-slate-100"
              }`}
            >
              <p className="text-xs font-semibold text-slate-500 mb-1 truncate">{cfg.label}</p>
              <div className="flex items-end gap-1.5">
                <span className="text-xl font-bold text-slate-800">{pct}%</span>
                <span className="text-xs text-slate-400 mb-0.5">{done}/{total}</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pct === 100 ? "bg-green-500" : colors.progress
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {isActive && (
                <p className="text-[10px] font-semibold text-slate-400 mt-1">Click to clear filter</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Staff Roster Panel (directors) ────────────────────────────────────────────

const TECH_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "data_entry_tech", label: "Data Entry Tech" },
  { value: "pv2_tech", label: "PV2 Tech" },
  { value: "delivery_tech", label: "Delivery Tech" },
  { value: "pharmacist_1", label: "Pharmacist 1" },
  { value: "pharmacist_2", label: "Pharmacist 2" },
  { value: "director", label: "Director" },
];

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function StaffRosterPanel({ siteId }: { siteId: string }) {
  const [roster, setRoster] = useState<SiteRoster>(loadRoster(siteId));
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formRoles, setFormRoles] = useState<string[]>(["data_entry_tech"]);

  function handleQuickSetup(techCount: number) {
    const members: StaffMember[] = [];
    if (techCount === 1) {
      members.push({ id: generateId(), name: "Tech 1", roles: ["data_entry_tech", "pv2_tech", "delivery_tech"] });
    } else if (techCount === 2) {
      members.push({ id: generateId(), name: "Tech 1", roles: ["data_entry_tech", "pv2_tech"] });
      members.push({ id: generateId(), name: "Tech 2", roles: ["delivery_tech"] });
    } else if (techCount >= 3) {
      members.push({ id: generateId(), name: "DE Tech", roles: ["data_entry_tech"] });
      members.push({ id: generateId(), name: "PV2 Tech", roles: ["pv2_tech"] });
      members.push({ id: generateId(), name: "Delivery Tech", roles: ["delivery_tech"] });
    }
    members.push({ id: generateId(), name: "Pharmacist 1", roles: ["pharmacist_1"] });
    members.push({ id: generateId(), name: "Pharmacist 2", roles: ["pharmacist_2"] });
    members.push({ id: generateId(), name: "Director", roles: ["director"] });
    const newRoster: SiteRoster = { siteId, members };
    saveRoster(newRoster);
    setRoster(newRoster);
    setShowAddForm(false);
    setEditingId(null);
  }

  function openAdd() {
    setFormName("");
    setFormRoles(["data_entry_tech"]);
    setEditingId(null);
    setShowAddForm(true);
  }

  function openEdit(member: StaffMember) {
    setFormName(member.name);
    setFormRoles(member.roles);
    setEditingId(member.id);
    setShowAddForm(true);
  }

  function handleSaveMember() {
    if (!formName.trim() || formRoles.length === 0) return;
    let updatedMembers: StaffMember[];
    if (editingId) {
      updatedMembers = roster.members.map((m) =>
        m.id === editingId ? { ...m, name: formName.trim(), roles: formRoles } : m
      );
    } else {
      updatedMembers = [
        ...roster.members,
        { id: generateId(), name: formName.trim(), roles: formRoles },
      ];
    }
    const newRoster: SiteRoster = { siteId, members: updatedMembers };
    saveRoster(newRoster);
    setRoster(newRoster);
    setShowAddForm(false);
    setEditingId(null);
  }

  function handleRemoveMember(id: string) {
    const updatedMembers = roster.members.filter((m) => m.id !== id);
    const newRoster: SiteRoster = { siteId, members: updatedMembers };
    saveRoster(newRoster);
    setRoster(newRoster);
  }

  function toggleFormRole(roleVal: string) {
    setFormRoles((prev) =>
      prev.includes(roleVal) ? prev.filter((r) => r !== roleVal) : [...prev, roleVal]
    );
  }

  return (
    <div
      data-testid="staff-roster-panel"
      className="bg-white border border-slate-200 rounded-md overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
        <Users className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="text-sm font-bold text-slate-700 flex-1">Team Configuration</span>
        <button
          data-testid="button-add-staff"
          onClick={openAdd}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Staff
        </button>
      </div>

      {/* Quick-setup presets */}
      {roster.members.length === 0 && !showAddForm && (
        <div className="px-4 py-4 space-y-3">
          <p className="text-xs text-slate-500">
            Configure your team to automatically distribute task responsibilities.
          </p>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Quick Setup — Number of Techs</p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  data-testid={`quick-setup-${n}-tech`}
                  onClick={() => handleQuickSetup(n)}
                  className="px-3 py-1.5 rounded-md text-xs font-bold border border-slate-200 text-slate-600 hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50 transition-all"
                >
                  {n} Tech{n > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Member list */}
      {roster.members.length > 0 && !showAddForm && (
        <div className="divide-y divide-slate-100">
          {roster.members.map((member) => (
            <div
              key={member.id}
              data-testid={`roster-member-${member.id}`}
              className="flex items-center gap-3 px-4 py-3 group"
            >
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-slate-500">
                  {member.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{member.name}</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {member.roles.map((r) => {
                    const roleOpt = TECH_ROLE_OPTIONS.find((o) => o.value === r);
                    return (
                      <span
                        key={r}
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                      >
                        {roleOpt?.label ?? r}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-1 invisible group-hover:visible">
                <button
                  onClick={() => openEdit(member)}
                  className="p-1.5 rounded text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                  title="Edit member"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Remove member"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          <div className="px-4 py-2 flex justify-end">
            <button
              onClick={openAdd}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add member
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {showAddForm && (
        <div className="px-4 py-4 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
              Staff Name
            </p>
            <input
              data-testid="input-roster-name"
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Alex M. or Tech 1"
              className="w-full text-sm rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300 text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
              Task Roles (select all that apply)
            </p>
            <div className="flex flex-wrap gap-2">
              {TECH_ROLE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  data-testid={`roster-role-${value}`}
                  onClick={() => toggleFormRole(value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                    formRoles.includes(value)
                      ? "border-purple-400 bg-purple-50 text-purple-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end pt-1">
            <button
              onClick={() => { setShowAddForm(false); setEditingId(null); }}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              data-testid="button-save-roster-member"
              onClick={handleSaveMember}
              disabled={!formName.trim() || formRoles.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {editingId ? "Update" : "Add Member"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Task History Calendar (directors) ─────────────────────────────────────────

const TASK_LOOKUP: Map<string, PharmacyTask> = new Map(TASKS.map((t) => [t.id, t]));

function TaskHistoryCalendar({ siteId }: { siteId: string }) {
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const history = loadSiteCompletions(siteId);

  // Build a Set of Date objects that have at least one completion
  const datesWithCompletions: Date[] = Object.keys(history).map((dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  });

  // Completions for the selected day
  const selectedDateKey = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
    : null;
  const selectedCompletions: TaskCompletion[] = selectedDateKey ? (history[selectedDateKey] ?? []) : [];

  const ROLE_LABEL: Record<string, string> = {
    data_entry_tech: "DE Tech",
    pv2_tech: "PV2 Tech",
    delivery_tech: "Delivery Tech",
    pharmacist_1: "Pharmacist 1",
    pharmacist_2: "Pharmacist 2",
    director: "Director",
    all_staff: "All Staff",
  };

  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div
      data-testid="task-history-calendar"
      className="bg-white border border-slate-200 rounded-md overflow-hidden"
    >
      {/* Panel header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
        <History className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="text-sm font-bold text-slate-700 flex-1">Task Completion History</span>
        <span className="text-xs text-slate-400">Click a highlighted day to view completions</span>
      </div>

      <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {/* Calendar */}
        <div className="sm:w-72 shrink-0">
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{ hasCompletions: datesWithCompletions }}
            modifiersClassNames={{
              hasCompletions: "has-completions",
            }}
            className="p-4"
            classNames={{
              day_today: "bg-accent text-accent-foreground font-semibold",
            }}
            components={{
              DayContent: ({ date }) => {
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                const count = history[key]?.length ?? 0;
                return (
                  <div className="relative flex items-center justify-center w-full h-full">
                    <span>{date.getDate()}</span>
                    {count > 0 && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-500" />
                    )}
                  </div>
                );
              },
            }}
          />
          {datesWithCompletions.length === 0 && (
            <p className="px-4 pb-4 text-xs text-slate-400 text-center">
              No historical completions recorded yet. Complete tasks and they will appear here.
            </p>
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0">
          {!selectedDate ? (
            <div className="flex flex-col items-center justify-center h-full py-10 px-6 text-center gap-2">
              <CalendarDays className="w-8 h-8 text-slate-200" />
              <p className="text-sm font-medium text-slate-400">Select a day on the calendar</p>
              <p className="text-xs text-slate-300">
                Days with a purple dot have recorded completions.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Day header */}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <p className="text-sm font-bold text-slate-800">{selectedDateLabel}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedCompletions.length === 0
                    ? "No completions recorded"
                    : `${selectedCompletions.length} task${selectedCompletions.length !== 1 ? "s" : ""} completed`}
                </p>
              </div>

              {/* Completion list */}
              {selectedCompletions.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-8 gap-2">
                  <p className="text-sm text-slate-400">No tasks were completed on this day.</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-72 divide-y divide-slate-50">
                  {selectedCompletions.map((c, i) => {
                    const task = TASK_LOOKUP.get(c.taskId);
                    const taskTitle = task?.title ?? c.taskId;
                    const roleLabel = ROLE_LABEL[c.taskRole] ?? c.taskRole;
                    const completedTime = new Date(c.completedAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    });
                    const completerProfile = getUserProfile(c.userEmail, "");
                    const displayName = completerProfile.name || c.userEmail;
                    return (
                      <div
                        key={`${c.taskId}-${i}`}
                        data-testid={`history-entry-${c.taskId}`}
                        className="flex items-start gap-3 px-4 py-3"
                      >
                        <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 leading-snug">{taskTitle}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {roleLabel}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">{displayName}</span>
                            {displayName !== c.userEmail && (
                              <span className="text-[10px] text-slate-300">{c.userEmail}</span>
                            )}
                            <span className="text-[10px] text-slate-300">{completedTime}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
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
  const [selectedRole, setSelectedRole] = useState<string>("pharmacist_1");
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

// ── Role badge colors for handoff designation ─────────────────────────────────
const ROLE_CHIP_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Staff" },
  { value: "data_entry_tech", label: "Data Entry Tech" },
  { value: "delivery_tech", label: "Delivery Tech" },
  { value: "pharmacist_1", label: "Pharmacist 1" },
  { value: "pharmacist_2", label: "Pharmacist 2" },
  { value: "pharmacy_director", label: "Director" },
];

function handoffRoleLabel(forRole: string): string {
  return ROLE_CHIP_OPTIONS.find((c) => c.value === forRole)?.label ?? "All Staff";
}

function HandoffRoleBadge({ forRole }: { forRole: string }) {
  const label = handoffRoleLabel(forRole);
  const colorMap: Record<string, string> = {
    all: "bg-indigo-100 text-indigo-700",
    data_entry_tech: "bg-sky-100 text-sky-700",
    delivery_tech: "bg-orange-100 text-orange-700",
    pharmacist_1: "bg-purple-100 text-purple-700",
    pharmacist_2: "bg-violet-100 text-violet-700",
    pharmacy_director: "bg-emerald-100 text-emerald-700",
  };
  const cls = colorMap[forRole] ?? "bg-indigo-100 text-indigo-700";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${cls}`} data-testid="handoff-role-badge">
      For: {label}
    </span>
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
  onToggle: (itemId: string, forRole: string) => void;
}) {
  const allDone = note.items.every((i) => i.completed);
  const forRole = note.forRole || "all";
  return (
    <div
      data-testid="custom-tasks-section"
      className="bg-white border border-indigo-200 rounded-md overflow-hidden"
    >
      <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2 flex-wrap">
        <ClipboardCheck className="w-4 h-4 text-indigo-600 shrink-0" />
        <span className="text-sm font-bold text-indigo-800">Handoff Tasks</span>
        <HandoffRoleBadge forRole={forRole} />
        <span className="text-xs text-indigo-500">
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
              onClick={() => onToggle(item.id, forRole)}
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

// ── Handoff Panel (write notes for a future date) ─────────────────────────────
function formatHandoffDate(dateKey: string, tomorrowKey: string): string {
  if (dateKey === tomorrowKey) return "Tomorrow";
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

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

  const [targetDate, setTargetDate] = useState(tomorrow);
  const [forRole, setForRole] = useState("all");

  function loadNote(date: string, role: string) {
    return loadHandoffNoteForRoleAndDate(siteId, date, role);
  }

  const existing = loadNote(targetDate, forRole);

  const [rawText, setRawText] = useState(existing?.rawText ?? "");
  const [items, setItems] = useState<HandoffItem[]>(existing?.items ?? []);
  const [newItemText, setNewItemText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(!!existing);
  const [error, setError] = useState("");

  // When the user picks a different date, load whatever was saved for that date+role
  const handleDateChange = (newDate: string) => {
    setTargetDate(newDate);
    const note = loadNote(newDate, forRole);
    setRawText(note?.rawText ?? "");
    setItems(note?.items ?? []);
    setSaved(!!note);
    setError("");
  };

  // When the user picks a different role, load whatever was saved for that date+role
  const handleRoleChange = (newRole: string) => {
    setForRole(newRole);
    const note = loadNote(targetDate, newRole);
    setRawText(note?.rawText ?? "");
    setItems(note?.items ?? []);
    setSaved(!!note);
    setError("");
  };

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
      id: `${siteId}-${targetDate}-${forRole}`,
      siteId,
      rawText,
      items,
      forDate: targetDate,
      forRole,
      createdAt: new Date().toISOString(),
      createdBy: authorName,
      createdByRole: authorRole,
    });
    setSaved(true);
  };

  const dateLabel = formatHandoffDate(targetDate, tomorrow);

  return (
    <div
      data-testid="handoff-panel"
      className="bg-white border border-slate-200 rounded-md overflow-hidden"
    >
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 flex-wrap">
        <ClipboardCheck className="w-4 h-4 text-purple-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800">Handoff Notes</p>
          <p className="text-xs text-slate-400">Schedule tasks for a future date</p>
        </div>
        {saved && items.length > 0 && (
          <span
            data-testid="handoff-saved-badge"
            className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md"
          >
            Saved for {dateLabel}
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* PHI Warning */}
        <div
          data-testid="handoff-phi-warning"
          className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-md px-4 py-3"
        >
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-red-700 leading-relaxed">
            <span className="uppercase tracking-wide">Critical:</span> Do not include patient PHI (names, DOB, address, or other identifiers) in handoff notes. Use <span className="font-bold">RX#</span> only to reference prescriptions.
          </p>
        </div>

        {/* Role designation chips */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            For who?
          </p>
          <div className="flex flex-wrap gap-1.5" data-testid="handoff-role-chips">
            {ROLE_CHIP_OPTIONS.map((chip) => {
              const isSelected = forRole === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  data-testid={`handoff-role-chip-${chip.value}`}
                  onClick={() => handleRoleChange(chip.value)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${
                    isSelected
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:text-purple-700"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date picker */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> Schedule for
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              data-testid="handoff-date-input"
              type="date"
              value={targetDate}
              min={tomorrow}
              onChange={(e) => e.target.value && handleDateChange(e.target.value)}
              className="text-sm rounded-md border border-slate-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300 text-slate-700"
            />
            <span className="text-xs text-slate-500 font-medium">{dateLabel}</span>
            {targetDate !== tomorrow && (
              <button
                data-testid="handoff-date-reset"
                onClick={() => handleDateChange(tomorrow)}
                className="text-xs text-purple-600 hover:text-purple-800 font-semibold"
              >
                Reset to tomorrow
              </button>
            )}
          </div>
        </div>

        {/* Raw text input */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
            What needs attention on {dateLabel}?
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
              Tasks for {dateLabel} ({items.length})
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
            Save for {dateLabel}
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
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">("all");
  const [showRoster, setShowRoster] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [animating, setAnimating] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<Map<string, TaskAssignment>>(new Map());
  const [assigningTask, setAssigningTask] = useState<PharmacyTask | null>(null);
  const [prioritizingTask, setPrioritizingTask] = useState<PharmacyTask | null>(null);
  const [activePriorities, setActivePriorities] = useState<TaskPriority[]>([]);
  const [priorityIds, setPriorityIds] = useState<Set<string>>(new Set());
  const [todayHandoffs, setTodayHandoffs] = useState<HandoffNote[]>([]);

  const siteId = urlSiteId ?? profile?.siteId ?? "1417";
  const isDir = isDirectorRole(profile?.role ?? "pharmacist_1");
  const isPharmDir = profile ? isPharmacyDirector(profile.role) : false;
  const canPrioritize = isDir && !isTechRole(profile?.role ?? "pharmacist_1");

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
    setTodayHandoffs(loadHandoffNotesForRole(siteId, getTodayDateKey(), profile.role));
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

  const handleHandoffToggle = useCallback((itemId: string, forRole: string) => {
    const today = getTodayDateKey();
    toggleHandoffItemComplete(siteId, today, itemId, forRole);
    if (profile) {
      setTodayHandoffs(loadHandoffNotesForRole(siteId, today, profile.role));
    }
  }, [siteId, profile]);

  if (!profile) return null;

  const showHandoff = !isRegionalOrAbove(profile.role) && !urlSiteId;

  const drillSite = urlSiteId
    ? (SITES.find((s) => s.id === urlSiteId) ?? (findStore(urlSiteId) ? { id: urlSiteId, name: findStore(urlSiteId)!.name, region: "" } : null))
    : null;
  const displaySiteName = drillSite?.name ?? profile.siteName;

  const extraRoles = profile.taskRoles as string[] | undefined;
  const visible = getVisibleTasks(frequency, profile.role, viewingRole, extraRoles);
  const filteredVisible = categoryFilter === "all"
    ? visible
    : visible.filter((t) => t.category === categoryFilter);
  const roleGroups = buildRoleGroups(filteredVisible, viewingRole, profile.role);
  const totalTasks = filteredVisible.length;
  const doneTasks = filteredVisible.filter((t) => completions.has(t.id)).length;
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

        {/* Category filter chips */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Filter className="w-3 h-3" /> Filter by Category
          </p>
          <div className="flex flex-wrap gap-2">
            {([
              { value: "all" as const, label: "All Categories" },
              { value: "operations" as const, label: "Operations" },
              { value: "achc" as const, label: "ACHC Compliance" },
              { value: "state_board" as const, label: "State Board" },
              { value: "retention" as const, label: "Retention" },
            ]).map((item) => {
              const isActive = categoryFilter === item.value;
              const catCfg = item.value !== "all" ? CATEGORY_CONFIG[item.value] : null;
              return (
                <button
                  key={item.value}
                  data-testid={`cat-filter-${item.value}`}
                  onClick={() => setCategoryFilter(item.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                    isActive
                      ? "border-purple-400 bg-purple-50 text-purple-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {item.label}
                  {catCfg && isActive && (
                    <span className="ml-1 opacity-60">·</span>
                  )}
                </button>
              );
            })}
          </div>
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
                { value: "pharmacist_1" as ViewingRole, label: "Pharmacist 1" },
                { value: "pharmacist_2" as ViewingRole, label: "Pharmacist 2" },
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

        {/* Director site overview cards (by role) */}
        {isDir && !readOnly && (
          <SiteOverviewPanel
            siteId={siteId}
            frequency={frequency}
            onSelectRole={setViewingRole}
            viewingRole={viewingRole}
          />
        )}

        {/* Director category performance overview */}
        {isDir && !readOnly && (
          <CategoryOverviewPanel
            siteId={siteId}
            frequency={frequency}
            categoryFilter={categoryFilter}
            onFilter={setCategoryFilter}
          />
        )}

        {/* Director staff roster + history */}
        {isDir && !readOnly && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Team Configuration
              </p>
              <div className="flex items-center gap-3">
                <button
                  data-testid="button-toggle-history"
                  onClick={() => { setShowHistory((v) => !v); setShowRoster(false); }}
                  className={`text-xs font-semibold flex items-center gap-1 transition-colors ${
                    showHistory
                      ? "text-purple-800"
                      : "text-purple-600 hover:text-purple-800"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  {showHistory ? "Hide History" : "History"}
                </button>
                <button
                  data-testid="button-toggle-roster"
                  onClick={() => { setShowRoster((v) => !v); setShowHistory(false); }}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                >
                  {showRoster ? "Hide" : "Configure Team"}
                </button>
              </div>
            </div>
            {showRoster && <StaffRosterPanel siteId={siteId} />}
            {showHistory && <TaskHistoryCalendar siteId={siteId} />}
          </div>
        )}

        {/* Handoff tasks from yesterday — daily view only, store users only */}
        {showHandoff && frequency === "daily" && todayHandoffs.map((note) => (
          <CustomTasksSection
            key={note.id}
            siteId={siteId}
            note={note}
            onToggle={handleHandoffToggle}
          />
        ))}

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
                siteId={siteId}
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
