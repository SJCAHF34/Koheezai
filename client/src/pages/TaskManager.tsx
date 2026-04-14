import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "wouter";
import { useAuth } from "@/App";
import {
  getUserProfile,
  isDirectorRole,
  isRegionalOrAbove,
  isPharmacyDirector,
  isTechRole,
  isCPO,
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
import { findStore, findStoreRegion, STORE_REGIONS, ALL_STORES } from "@/lib/storeDirectory";
import {
  buildZeroSiteTrend,
  TREND_CATEGORIES,
  SPARKLINE_COLORS,
  PERIOD_CONFIG,
  type SiteTrend,
  type TrendPeriod,
} from "@/lib/trendData";
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
  loadUrgentTasks,
  loadUrgentTaskDetails,
  saveUrgentTask,
  removeUrgentTask,
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
  loadTaskCounter,
  saveTaskCounter,
  loadCustomTasks,
  saveCustomTask,
  deleteCustomTask,
  type TaskCompletion,
  type TaskAssignment,
  type TaskPriority,
  type HandoffNote,
  type HandoffItem,
  type RetentionRiskEntry,
  type StaffMember,
  type SiteRoster,
  type CustomTask,
} from "@/lib/taskStorage";
import type { RetentionPatient, RetentionIssueType, RetentionStatus, AttemptLogEntry } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Calendar } from "@/components/ui/calendar";
import {
  Check,
  UserPlus,
  X,
  ArrowLeft,
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
  TrendingUp,
  TrendingDown,
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
  Upload,
  FileUp,
  Tag,
  ExternalLink,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  { value: "biweekly", label: "Biweekly", sub: "Every other week" },
  { value: "monthly", label: "Monthly", sub: "This month" },
  { value: "quarterly", label: "Quarterly", sub: "This quarter" },
  { value: "one_time", label: "One-Time", sub: "Ad hoc tasks" },
];

type ViewingRole = TaskRole | "own" | "all";

function getVisibleTasks(
  frequency: TaskFrequency,
  userRole: UserRole,
  viewingRole: ViewingRole,
  extraRoles?: string[]
): PharmacyTask[] {
  const byFreq = TASKS.filter((t) => t.frequency === frequency && !t.hidden);
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
  isUrgentFromRegional,
  urgentMarkedBy,
  canMarkUrgent,
  canDeleteCustom,
  readOnly,
  siteId,
  highlighted,
  onToggle,
  onAssign,
  onPrioritize,
  onMarkUrgent,
  onDeleteCustom,
}: {
  task: PharmacyTask;
  completed: boolean;
  animating: boolean;
  assignment?: TaskAssignment;
  canAssign: boolean;
  canPrioritize: boolean;
  isPrioritized: boolean;
  isUrgentFromRegional: boolean;
  urgentMarkedBy?: string;
  canMarkUrgent: boolean;
  canDeleteCustom: boolean;
  readOnly?: boolean;
  siteId?: string;
  highlighted?: boolean;
  onToggle: (t: PharmacyTask) => void;
  onAssign: (t: PharmacyTask) => void;
  onPrioritize: (t: PharmacyTask) => void;
  onMarkUrgent: (t: PharmacyTask) => void;
  onDeleteCustom: (t: PharmacyTask) => void;
}) {
  const cat = CATEGORY_CONFIG[task.category];
  const today = getTodayDateKey();
  const resolvedSiteId = siteId ?? "unknown";

  // Counter state for tasks that track start/end of day counts
  const [counterStart, setCounterStart] = useState<string>(() => {
    if (!task.counterType) return "";
    const entry = loadTaskCounter(resolvedSiteId, task.id, today);
    return entry?.start !== undefined ? String(entry.start) : "";
  });
  const [counterEnd, setCounterEnd] = useState<string>(() => {
    if (!task.counterType) return "";
    const entry = loadTaskCounter(resolvedSiteId, task.id, today);
    return entry?.end !== undefined ? String(entry.end) : "";
  });
  // Tracks whether user tried to check without filling required counters
  const [counterBlocked, setCounterBlocked] = useState(false);
  // For custom task deletion: first click shows confirm state
  const [confirmDelete, setConfirmDelete] = useState(false);

  // True when all required counter fields are filled
  const counterReady = !task.counterType
    || (task.counterType === "end-only" ? counterEnd !== "" : counterStart !== "" && counterEnd !== "");

  function handleCounterChange(field: "start" | "end", raw: string) {
    const cleaned = raw.replace(/[^0-9]/g, "");
    if (field === "start") setCounterStart(cleaned);
    else setCounterEnd(cleaned);
    if (counterBlocked) setCounterBlocked(false);
    const entry = loadTaskCounter(resolvedSiteId, task.id, today) ?? { siteId: resolvedSiteId, taskId: task.id, date: today };
    saveTaskCounter({
      ...entry,
      [field]: cleaned === "" ? undefined : Number(cleaned),
    });
  }

  function handleToggle() {
    // Always allow unchecking; only block checking when counters aren't ready
    if (!completed && !counterReady) {
      setCounterBlocked(true);
      return;
    }
    setCounterBlocked(false);
    onToggle(task);
  }
  return (
    <div
      id={`task-row-${task.id}`}
      data-testid={`task-row-${task.id}`}
      className={`flex items-start gap-3 px-4 py-3 group transition-all duration-300 ${
        highlighted
          ? "bg-amber-50 ring-2 ring-inset ring-amber-400"
          : animating
          ? "bg-green-50"
          : completed
          ? "bg-green-50"
          : isUrgentFromRegional
          ? "bg-red-50"
          : "hover:bg-slate-50/70"
      }`}
    >
      <TaskCheckbox
        completed={completed}
        animating={animating}
        onClick={handleToggle}
        testId={`checkbox-${task.id}`}
        disabled={readOnly}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {(task.isUrgent || isUrgentFromRegional) && !completed && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 text-red-700">
              <AlertTriangle className="w-2.5 h-2.5" />
              {urgentMarkedBy ? `URGENT - ${urgentMarkedBy}` : "Urgent"}
            </span>
          )}
          {isPrioritized && !completed && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
              <Flag className="w-2.5 h-2.5" />
              Priority Alert
            </span>
          )}
          {task.isCustom && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200">
              <Tag className="w-2.5 h-2.5" />
              Custom
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

        {task.description && (() => {
          const lines = task.description.split("\n").map((l) => l.trim()).filter(Boolean);
          return lines.length > 1 ? (
            <ul className={`text-xs mt-1 space-y-0.5 ${completed ? "text-slate-300 line-through" : "text-slate-400"}`}>
              {lines.map((line, i) => (
                <li key={i} className="flex items-start gap-1 leading-relaxed">
                  <span className="shrink-0 select-none">•</span>
                  <span>{line.replace(/^[•\-]\s*/, "")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`text-xs mt-0.5 leading-relaxed ${completed ? "text-slate-300 line-through" : "text-slate-400"}`}>
              {task.description}
            </p>
          );
        })()}

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

        {task.url && (
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`link-task-url-${task.id}`}
            className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {task.urlLabel ?? "Open Link"}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {/* ── Day counters ────────────────────────────────────── */}
        {task.counterType && !readOnly && (
          <div className="mt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              {task.counterType === "start-end" && (
                <label className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${counterBlocked && counterStart === "" ? "text-red-500" : "text-slate-500"}`}>
                    Start
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={counterStart}
                    onChange={(e) => handleCounterChange("start", e.target.value)}
                    data-testid={`counter-start-${task.id}`}
                    className={`w-16 h-6 text-xs text-center rounded border bg-white text-slate-700 focus:outline-none focus:ring-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      counterBlocked && counterStart === ""
                        ? "border-red-400 focus:ring-red-400 focus:border-red-400"
                        : "border-slate-200 focus:ring-blue-400 focus:border-blue-400"
                    }`}
                    placeholder="—"
                  />
                </label>
              )}
              <label className="flex items-center gap-1.5">
                <span className={`text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${counterBlocked && counterEnd === "" ? "text-red-500" : "text-slate-500"}`}>
                  End
                </span>
                <input
                  type="number"
                  min={0}
                  value={counterEnd}
                  onChange={(e) => handleCounterChange("end", e.target.value)}
                  data-testid={`counter-end-${task.id}`}
                  className={`w-16 h-6 text-xs text-center rounded border bg-white text-slate-700 focus:outline-none focus:ring-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    counterBlocked && counterEnd === ""
                      ? "border-red-400 focus:ring-red-400 focus:border-red-400"
                      : "border-slate-200 focus:ring-blue-400 focus:border-blue-400"
                  }`}
                  placeholder="—"
                />
              </label>
            </div>
            {counterBlocked && (
              <p className="text-[10px] text-red-500 font-medium">
                {task.counterType === "end-only"
                  ? "Enter end of day count to complete this task."
                  : "Enter start and end of day counts to complete this task."}
              </p>
            )}
          </div>
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

      {/* Mark Urgent button — regional directors only */}
      {canMarkUrgent && !readOnly && (
        <button
          data-testid={`button-mark-urgent-${task.id}`}
          onClick={() => onMarkUrgent(task)}
          title={isUrgentFromRegional ? "Remove urgent flag" : "Mark as urgent for this store"}
          className={`shrink-0 p-1.5 rounded-md transition-colors ${
            isUrgentFromRegional
              ? "text-red-600 bg-red-50 visible"
              : "invisible group-hover:visible text-slate-400 hover:text-red-600 hover:bg-red-50"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
        </button>
      )}

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

      {/* Delete custom task button — directors only, custom tasks only */}
      {task.isCustom && canDeleteCustom && !readOnly && (
        confirmDelete ? (
          <button
            data-testid={`button-delete-custom-confirm-${task.id}`}
            onClick={() => { onDeleteCustom(task); setConfirmDelete(false); }}
            title="Confirm delete"
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-white bg-red-500 transition-colors"
            onBlur={() => setConfirmDelete(false)}
          >
            Delete?
          </button>
        ) : (
          <button
            data-testid={`button-delete-custom-${task.id}`}
            onClick={() => setConfirmDelete(true)}
            title="Delete this custom task"
            className="shrink-0 invisible group-hover:visible p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )
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
  urgentIds,
  urgentDetails,
  canAssign,
  canPrioritize,
  canMarkUrgent,
  canDeleteCustom,
  readOnly,
  siteId,
  highlightTaskId,
  onToggle,
  onAssign,
  onPrioritize,
  onMarkUrgent,
  onDeleteCustom,
}: {
  groupName: string;
  tasks: PharmacyTask[];
  completions: Set<string>;
  animating: Set<string>;
  assignments: Map<string, TaskAssignment>;
  priorities: Set<string>;
  urgentIds: Set<string>;
  urgentDetails: Map<string, string>;
  canAssign: boolean;
  canPrioritize: boolean;
  canMarkUrgent: boolean;
  canDeleteCustom: boolean;
  readOnly?: boolean;
  siteId?: string;
  highlightTaskId?: string | null;
  onToggle: (t: PharmacyTask) => void;
  onAssign: (t: PharmacyTask) => void;
  onPrioritize: (t: PharmacyTask) => void;
  onMarkUrgent: (t: PharmacyTask) => void;
  onDeleteCustom: (t: PharmacyTask) => void;
}) {
  const [open, setOpen] = useState(true);
  const done = tasks.filter((t) => completions.has(t.id)).length;
  const allDone = done === tasks.length;

  const sortedTasks = [...tasks].sort((a, b) => {
    const aUrgent = (a.isUrgent || urgentIds.has(a.id)) && !completions.has(a.id);
    const bUrgent = (b.isUrgent || urgentIds.has(b.id)) && !completions.has(b.id);
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;
    return 0;
  });

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
          {sortedTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              completed={completions.has(task.id)}
              animating={animating.has(task.id)}
              assignment={assignments.get(task.id)}
              canAssign={canAssign}
              canPrioritize={canPrioritize}
              isPrioritized={priorities.has(task.id)}
              isUrgentFromRegional={urgentIds.has(task.id)}
              urgentMarkedBy={urgentDetails.get(task.id)}
              canMarkUrgent={canMarkUrgent}
              canDeleteCustom={canDeleteCustom}
              readOnly={readOnly}
              siteId={siteId}
              highlighted={task.id === highlightTaskId}
              onToggle={onToggle}
              onAssign={onAssign}
              onPrioritize={onPrioritize}
              onMarkUrgent={onMarkUrgent}
              onDeleteCustom={onDeleteCustom}
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
  urgentIds,
  urgentDetails,
  canAssign,
  canPrioritize,
  canMarkUrgent,
  canDeleteCustom,
  readOnly,
  siteId,
  highlightTaskId,
  onToggle,
  onAssign,
  onPrioritize,
  onMarkUrgent,
  onDeleteCustom,
}: {
  role: TaskRole;
  groups: Array<{ groupName: string; tasks: PharmacyTask[] }>;
  completions: Set<string>;
  animating: Set<string>;
  assignments: Map<string, TaskAssignment>;
  priorities: Set<string>;
  urgentIds: Set<string>;
  urgentDetails: Map<string, string>;
  canAssign: boolean;
  canPrioritize: boolean;
  canMarkUrgent: boolean;
  canDeleteCustom: boolean;
  readOnly?: boolean;
  siteId?: string;
  highlightTaskId?: string | null;
  onToggle: (t: PharmacyTask) => void;
  onAssign: (t: PharmacyTask) => void;
  onPrioritize: (t: PharmacyTask) => void;
  onMarkUrgent: (t: PharmacyTask) => void;
  onDeleteCustom: (t: PharmacyTask) => void;
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
              urgentIds={urgentIds}
              urgentDetails={urgentDetails}
              canAssign={canAssign}
              canPrioritize={canPrioritize}
              canMarkUrgent={canMarkUrgent}
              canDeleteCustom={canDeleteCustom}
              readOnly={readOnly}
              highlightTaskId={highlightTaskId}
              onToggle={onToggle}
              onAssign={onAssign}
              onPrioritize={onPrioritize}
              onMarkUrgent={onMarkUrgent}
              onDeleteCustom={onDeleteCustom}
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

type RetentionGroup = "controllable" | "partially_controllable" | "non_controllable";

const GROUP_CONFIG: Record<RetentionGroup, { label: string; badgeBg: string; badgeText: string }> = {
  controllable: { label: "Controllable", badgeBg: "bg-green-100", badgeText: "text-green-800" },
  partially_controllable: { label: "Partially Controllable", badgeBg: "bg-yellow-100", badgeText: "text-yellow-800" },
  non_controllable: { label: "Non-Controllable", badgeBg: "bg-slate-100", badgeText: "text-slate-600" },
};

const ISSUE_CONFIG: Record<
  RetentionIssueType,
  { label: string; color: string; headerBg: string; borderColor: string; badgeBg: string; badgeText: string; group?: RetentionGroup; reasons: string[] }
> = {
  undesignated: {
    label: "Undesignated Queue",
    color: "slate",
    headerBg: "bg-slate-50 border-slate-200",
    borderColor: "border-slate-200",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-700",
    reasons: [],
  },
  appointment_lab: {
    label: "Appointment or Lab Issues",
    color: "orange",
    headerBg: "bg-orange-50 border-orange-200",
    borderColor: "border-orange-200",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-800",
    group: "controllable",
    reasons: ["Needs Appt", "MD Refusal", "PrEP Labs"],
  },
  communication_barriers: {
    label: "Communication Barriers",
    color: "red",
    headerBg: "bg-red-50 border-red-200",
    borderColor: "border-red-200",
    badgeBg: "bg-red-100",
    badgeText: "text-red-800",
    group: "controllable",
    reasons: ["Unable to Reach", "Can't Locate", "Left Message"],
  },
  transfer_out: {
    label: "Transfer out",
    color: "blue",
    headerBg: "bg-blue-50 border-blue-200",
    borderColor: "border-blue-200",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-800",
    group: "controllable",
    reasons: ["Left AHF", "Transferred Out to Competitor"],
  },
  insurance_coverage: {
    label: "Insurance or Coverage Issues",
    color: "yellow",
    headerBg: "bg-yellow-50 border-yellow-200",
    borderColor: "border-yellow-200",
    badgeBg: "bg-yellow-100",
    badgeText: "text-yellow-800",
    group: "partially_controllable",
    reasons: ["Insurance Expired", "ADAP Expired/Issue", "RW Expired"],
  },
  one_time_limited: {
    label: "One-Time or Limited Treatment Use",
    color: "purple",
    headerBg: "bg-purple-50 border-purple-200",
    borderColor: "border-purple-200",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-800",
    group: "non_controllable",
    reasons: ["PEP/PAP", "Off-Label PrEP (On Demand, Lifestyle Change)"],
  },
  insurance_restrictions: {
    label: "Insurance Restrictions",
    color: "amber",
    headerBg: "bg-amber-50 border-amber-200",
    borderColor: "border-amber-200",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    group: "non_controllable",
    reasons: ["ADAP (cannot participate)", "Mail Order", "Out of Network"],
  },
  patient_status_change: {
    label: "Patient Status Change",
    color: "teal",
    headerBg: "bg-teal-50 border-teal-200",
    borderColor: "border-teal-200",
    badgeBg: "bg-teal-100",
    badgeText: "text-teal-800",
    group: "non_controllable",
    reasons: ["Deceased", "Incarcerated", "Moved (no local AHF)"],
  },
  clinical_medication: {
    label: "Clinical or Medication-Specific Exceptions",
    color: "green",
    headerBg: "bg-green-50 border-green-200",
    borderColor: "border-green-200",
    badgeBg: "bg-green-100",
    badgeText: "text-green-800",
    group: "non_controllable",
    reasons: ["Med Surplus", "Injectables 6+ months (e.g., Sunlenca, Yetzugo)", "Clinical Trial"],
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
  retentionReason: string;
  // insurance
  bin: string;
  pcn: string;
  rxgrp: string;
  insuranceId: string;
  // location
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
  retentionReason: "",
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
  { day: 1, label: "Day 1 — Primary SMS to patient" },
  { day: 2, label: "Day 2 — Email to patient" },
  { day: 3, label: "Day 3 — Secondary SMS to patient" },
  { day: 4, label: "Day 4 — Email to case manager" },
];

function formatAttemptTs(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now.getTime() - 86400000).toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === todayStr) return `Today ${timeStr}`;
  if (d.toDateString() === yesterdayStr) return `Yesterday ${timeStr}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} · ${timeStr}`;
}

function PatientCard({
  patient,
  onUpdate,
}: {
  patient: RetentionPatient;
  onUpdate: (p: RetentionPatient) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loggingAttempt, setLoggingAttempt] = useState(false);
  const [attemptBy, setAttemptBy] = useState("");
  const [pendingCategory, setPendingCategory] = useState<RetentionIssueType | "">("");
  const [pendingReason, setPendingReason] = useState("");
  const today = getTodayDateKey();
  const days = daysSince(patient.dateAdded);

  async function logAttempt() {
    const by = attemptBy.trim().toUpperCase();
    if (!by) return;
    const entry: AttemptLogEntry = { ts: new Date().toISOString(), by };
    const updated: RetentionPatient = {
      ...patient,
      attemptCount: patient.attemptCount + 1,
      lastAttemptDate: today,
      attemptLog: [...(patient.attemptLog ?? []), entry],
    };
    setLoggingAttempt(false);
    setAttemptBy("");
    try {
      const saved = await apiUpdateRetentionPatient(updated);
      onUpdate(saved);
    } catch {
      onUpdate(updated);
    }
  }

  function startLogAttempt() {
    setLoggingAttempt(true);
    setAttemptBy("");
  }

  function cancelLogAttempt() {
    setLoggingAttempt(false);
    setAttemptBy("");
  }

  async function confirmCategorize() {
    if (!pendingCategory) return;
    const updated: RetentionPatient = { ...patient, issueType: pendingCategory, retentionReason: pendingReason };
    setPendingCategory("");
    setPendingReason("");
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

          {patient.issueType === "undesignated" && isActive && (
            <div className="p-2.5 rounded-md bg-slate-100 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 whitespace-nowrap flex-shrink-0">Categorize as:</span>
                <select
                  data-testid={`select-categorize-${patient.id}`}
                  value={pendingCategory}
                  onChange={(e) => { setPendingCategory(e.target.value as RetentionIssueType); setPendingReason(""); }}
                  className="flex-1 text-xs border border-slate-300 rounded-md px-2 py-1 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="" disabled>— Pick a category —</option>
                  <option value="appointment_lab">Appointment or Lab Issues</option>
                  <option value="communication_barriers">Communication Barriers</option>
                  <option value="transfer_out">Transfer out</option>
                  <option value="insurance_coverage">Insurance or Coverage Issues</option>
                  <option value="one_time_limited">One-Time or Limited Treatment Use</option>
                  <option value="insurance_restrictions">Insurance Restrictions</option>
                  <option value="patient_status_change">Patient Status Change</option>
                  <option value="clinical_medication">Clinical or Medication-Specific Exceptions</option>
                </select>
              </div>
              {pendingCategory && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 whitespace-nowrap flex-shrink-0">Reason:</span>
                  <select
                    data-testid={`select-categorize-reason-${patient.id}`}
                    value={pendingReason}
                    onChange={(e) => setPendingReason(e.target.value)}
                    className="flex-1 text-xs border border-slate-300 rounded-md px-2 py-1 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="">— Optional reason —</option>
                    {ISSUE_CONFIG[pendingCategory].reasons.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button
                    data-testid={`button-confirm-categorize-${patient.id}`}
                    onClick={confirmCategorize}
                    className="flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-md bg-slate-700 text-white hover-elevate"
                  >
                    Move
                  </button>
                </div>
              )}
            </div>
          )}

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
            {patient.retentionReason && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Tag className="w-3 h-3 flex-shrink-0 text-slate-400" />
                <span className="font-medium text-slate-500 w-20 flex-shrink-0">Reason:</span>
                <span data-testid={`text-reason-${patient.id}`}>{patient.retentionReason}</span>
              </div>
            )}

            {/* Insurance plan fields */}
            {(patient.issueType === "insurance_restrictions" || patient.issueType === "insurance_coverage") && (patient.bin || patient.pcn || patient.rxgrp || patient.insuranceId) && (
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

            {/* Location fields (transfer or status change) */}
            {(patient.issueType === "patient_status_change" || patient.issueType === "transfer_out") && (patient.city || patient.state || patient.zip) && (
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
            <div className="space-y-2 pt-1">
              {loggingAttempt ? (
                <div className="flex items-center gap-1.5">
                  <input
                    data-testid={`input-attempt-by-${patient.id}`}
                    autoFocus
                    type="text"
                    maxLength={4}
                    placeholder="Your initials"
                    value={attemptBy}
                    onChange={(e) => setAttemptBy(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === "Enter") logAttempt(); if (e.key === "Escape") cancelLogAttempt(); }}
                    className="w-28 px-2 py-1 rounded-md border border-slate-300 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 uppercase placeholder:normal-case placeholder:font-normal placeholder:text-slate-400"
                  />
                  <button
                    data-testid={`button-log-attempt-confirm-${patient.id}`}
                    onClick={logAttempt}
                    disabled={!attemptBy.trim()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-700 text-white disabled:opacity-40"
                  >
                    <History className="w-3 h-3" /> Log
                  </button>
                  <button
                    data-testid={`button-log-attempt-cancel-${patient.id}`}
                    onClick={cancelLogAttempt}
                    className="px-2 py-1 rounded-md text-xs text-slate-500 hover-elevate border border-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    data-testid={`button-log-attempt-${patient.id}`}
                    onClick={startLogAttempt}
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

              {(patient.attemptLog ?? []).length > 0 && (
                <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Attempt Log</p>
                  {[...(patient.attemptLog ?? [])].reverse().map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-slate-600">
                      <Clock className="w-3 h-3 flex-shrink-0 text-slate-400" />
                      <span>{formatAttemptTs(entry.ts)}</span>
                      <span className="font-bold text-slate-800">{entry.by}</span>
                    </div>
                  ))}
                </div>
              )}
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
        attemptLog: [],
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
        retentionReason: form.retentionReason.trim(),
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold uppercase tracking-wide ${cfg.badgeText}`}>{cfg.label}</span>
          {cfg.group && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${GROUP_CONFIG[cfg.group].badgeBg} ${GROUP_CONFIG[cfg.group].badgeText}`}>
              {GROUP_CONFIG[cfg.group].label}
            </span>
          )}
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

          {/* ── Reason dropdown (for categories that have approved reasons) ── */}
          {ISSUE_CONFIG[issueType].reasons.length > 0 && (
            <div>
              <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Reason (optional)</label>
              <select
                data-testid={`select-reason-${issueType}`}
                value={form.retentionReason}
                onChange={(e) => setForm((f) => ({ ...f, retentionReason: e.target.value }))}
                className="w-full text-xs rounded border border-slate-200 bg-white px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">— Select reason —</option>
                {ISSUE_CONFIG[issueType].reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}

          {/* ── Insurance fields: BIN / PCN / RXGRP / Member ID ── */}
          {(issueType === "insurance_restrictions" || issueType === "insurance_coverage") && (
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

          {/* ── AHF Pharmacy Live Search (transfer or status change) ── */}
          {(issueType === "patient_status_change" || issueType === "transfer_out") && (() => {
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

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function parseRetentionCsv(text: string): Array<{ initials: string; phone1: string; phone2: string; issueType: string }> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const headerCols = parseCsvLine(lines[0]).map((c) => c.toLowerCase().trim());
  const col = (name: string) => headerCols.findIndex((c) => c === name.toLowerCase());

  const isSSRS = headerCols.some((c) => c === "first name" || c === "first_name");
  if (isSSRS) {
    const firstNameIdx = col("first name");
    const lastNameIdx  = col("last name");
    const phonesIdx    = col("phones");
    const cellIdx      = col("cellphone");
    const workIdx      = col("work phone");
    const altIdx       = col("alt phone");
    const reasonIdx    = col("reason description");
    const categoryIdx  = col("category");
    const rows: Array<{ initials: string; phone1: string; phone2: string; issueType: string }> = [];
    for (let i = 1; i < lines.length; i++) {
      const c = parseCsvLine(lines[i]);
      const fn = (c[firstNameIdx] ?? "").trim();
      const ln = (c[lastNameIdx]  ?? "").trim();
      if (!fn && !ln) continue;
      const initials = ((fn[0] ?? "") + (ln[0] ?? "")).toUpperCase();
      if (!initials) continue;
      const phone1   = (phonesIdx >= 0 ? c[phonesIdx] : "") || (cellIdx >= 0 ? c[cellIdx] : "") || "";
      const phone2   = (workIdx   >= 0 ? c[workIdx]   : "") || (altIdx  >= 0 ? c[altIdx]  : "") || "";
      const issueType = (reasonIdx >= 0 ? c[reasonIdx] : "") || (categoryIdx >= 0 ? c[categoryIdx] : "") || "";
      rows.push({ initials, phone1: phone1.trim(), phone2: phone2.trim(), issueType: issueType.trim() });
    }
    return rows;
  }

  const start = headerCols.some((c) => c.includes("initials")) ? 1 : 0;
  const rows: Array<{ initials: string; phone1: string; phone2: string; issueType: string }> = [];
  for (let i = start; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    const initials = (c[0] ?? "").toUpperCase();
    if (!initials) continue;
    rows.push({ initials, phone1: c[1] ?? "", phone2: c[2] ?? "", issueType: c[3] ?? "undesignated" });
  }
  return rows;
}

function PatientRetentionTracker({ siteId }: { siteId: string }) {
  const [patients, setPatients] = useState<RetentionPatient[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<Array<{ initials: string; phone1: string; phone2: string; issueType: string }>>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    apiLoadRetentionPatients(siteId).then(setPatients);
  }, [siteId]);

  function refresh() {
    apiLoadRetentionPatients(siteId).then(setPatients);
  }

  const byType = (type: RetentionIssueType) => patients.filter((p) => p.issueType === type);

  function handleCsvChange(text: string) {
    setImportText(text);
    setImportPreview(parseRetentionCsv(text));
    setImportResult(null);
  }

  function readFileAsText(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => handleCsvChange(ev.target?.result as string ?? "");
    reader.readAsText(file);
  }

  function handleFileRead(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsText(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    readFileAsText(file);
  }

  async function handleImport() {
    if (importPreview.length === 0) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const result = await apiRequest<{ imported: number; skipped: number; errors: string[] }>(
        "/api/retention/import",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId, patients: importPreview }),
        }
      );
      setImportResult(result);
      if (result.imported > 0) refresh();
    } catch {
      setImportResult({ imported: 0, skipped: 0, errors: ["Request failed — check your session and try again."] });
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <div data-testid="patient-retention-tracker" className="mt-3 mb-1 space-y-3">
      <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200">
        <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          <span className="font-bold">PHI Notice:</span> Enter patient initials only — PHI integration pending Aptible setup.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Patient Retention Tracker</p>
        <button
          data-testid="button-import-ssrs"
          type="button"
          onClick={() => { setImportOpen(true); setImportText(""); setImportPreview([]); setImportResult(null); }}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover-elevate rounded px-2 py-1 border border-blue-200 bg-blue-50"
        >
          <FileUp className="w-3 h-3" />
          Import from SSRS
        </button>
      </div>

      {(["undesignated", "appointment_lab", "communication_barriers", "transfer_out", "insurance_coverage", "one_time_limited", "insurance_restrictions", "patient_status_change", "clinical_medication"] as RetentionIssueType[]).map((type) => (
        <RetentionSection
          key={type}
          issueType={type}
          patients={byType(type)}
          siteId={siteId}
          onPatientsChange={refresh}
        />
      ))}

      <RetentionRiskPanel siteId={siteId} patients={patients} />

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            data-testid="dialog-import-ssrs"
            className="bg-white rounded-md shadow-lg w-full max-w-lg mx-4 p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-bold text-slate-800">Import from SSRS Report</p>
              </div>
              <button type="button" onClick={() => setImportOpen(false)} className="text-slate-400 hover-elevate rounded px-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Accepts SSRS exports or a manual CSV with columns: <span className="font-mono font-semibold">Initials, Primary Phone, Secondary Phone</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Imported patients land in the Undesignated Queue — categorize them from there.</p>
            </div>

            <div className="space-y-2">
              <div
                data-testid="dropzone-import-csv"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-md px-4 py-5 cursor-pointer transition-colors ${dragOver ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
              >
                <FileUp className={`w-5 h-5 ${dragOver ? "text-blue-500" : "text-slate-400"}`} />
                <p className="text-xs text-slate-500 font-medium">
                  Drag & drop a CSV file here, or
                  <label className="ml-1 text-blue-600 cursor-pointer underline underline-offset-2">
                    browse
                    <input
                      data-testid="input-import-csv-file"
                      type="file"
                      accept=".csv,text/csv"
                      className="sr-only"
                      onChange={handleFileRead}
                    />
                  </label>
                </p>
                {importText && <p className="text-[10px] text-green-600 font-semibold">{importPreview.length} rows loaded</p>}
              </div>
              <p className="text-[10px] text-slate-400">or paste CSV below</p>
              <textarea
                data-testid="input-import-csv-text"
                className="w-full text-xs font-mono border border-slate-200 rounded-md p-2 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder={"Initials,Primary Phone,Secondary Phone,Issue Type\nJD,555-1234,555-5678,communication_barriers"}
                value={importText}
                onChange={(e) => handleCsvChange(e.target.value)}
              />
            </div>

            {importPreview.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-700">Preview ({importPreview.length} rows)</p>
                <div className="border border-slate-200 rounded-md overflow-auto max-h-36">
                  <table className="w-full text-[10px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-2 py-1 font-semibold text-slate-600">Initials</th>
                        <th className="text-left px-2 py-1 font-semibold text-slate-600">Phone 1</th>
                        <th className="text-left px-2 py-1 font-semibold text-slate-600">Phone 2</th>
                        <th className="text-left px-2 py-1 font-semibold text-slate-600">Issue Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                          <td className="px-2 py-1 font-mono font-bold text-slate-800">{row.initials}</td>
                          <td className="px-2 py-1 text-slate-600">{row.phone1 || "—"}</td>
                          <td className="px-2 py-1 text-slate-600">{row.phone2 || "—"}</td>
                          <td className="px-2 py-1 text-slate-500">Undesignated</td>
                        </tr>
                      ))}
                      {importPreview.length > 10 && (
                        <tr><td colSpan={4} className="px-2 py-1 text-slate-400 italic">+{importPreview.length - 10} more…</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importResult && (
              <div className={`rounded-md px-3 py-2 text-xs ${importResult.errors.length > 0 ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"}`}>
                <p className="font-semibold">
                  {importResult.imported} imported · {importResult.skipped} already existed
                </p>
                {importResult.errors.map((e, i) => <p key={i} className="mt-0.5">{e}</p>)}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="text-xs text-slate-500 hover-elevate rounded px-3 py-1.5 border border-slate-200"
              >
                Close
              </button>
              <button
                data-testid="button-import-csv-confirm"
                type="button"
                onClick={handleImport}
                disabled={importPreview.length === 0 || importLoading}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md px-3 py-1.5 disabled:opacity-40"
              >
                {importLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Import {importPreview.length > 0 ? `${importPreview.length} patients` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RetentionRiskPanel({ siteId, patients }: { siteId: string; patients: RetentionPatient[] }) {
  const date = getTodayDateKey();
  const existing = loadRetentionRisk(siteId, date);
  const [controllable, setControllable] = useState(String(existing?.controllable ?? ""));
  const [partial, setPartial] = useState(String(existing?.partiallyControllable ?? ""));
  const [nonControllable, setNonControllable] = useState(String(existing?.nonControllable ?? ""));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const active = patients.filter((p) => p.status === "active" && p.issueType !== "undesignated");
    const ctrl = active.filter((p) => ISSUE_CONFIG[p.issueType]?.group === "controllable").length;
    const part = active.filter((p) => ISSUE_CONFIG[p.issueType]?.group === "partially_controllable").length;
    const nonCtrl = active.filter((p) => ISSUE_CONFIG[p.issueType]?.group === "non_controllable").length;
    setControllable(String(ctrl));
    setPartial(String(part));
    setNonControllable(String(nonCtrl));
  }, [patients]);

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

// ── Store Performance Panel helpers ──────────────────────────────────────────

function perfTextColor(pct: number) {
  return pct >= 80 ? "text-green-600" : pct >= 65 ? "text-amber-600" : pct >= 50 ? "text-orange-500" : "text-red-500";
}

function perfBarColor(pct: number) {
  return pct >= 80 ? "bg-green-500" : pct >= 65 ? "bg-amber-400" : pct >= 50 ? "bg-orange-400" : "bg-red-400";
}

function perfTierLabel(pct: number) {
  if (pct >= 80) return { label: "Top", bg: "bg-green-50 text-green-700 border-green-200" };
  if (pct >= 65) return { label: "Good", bg: "bg-amber-50 text-amber-700 border-amber-200" };
  if (pct >= 50) return { label: "At Risk", bg: "bg-orange-50 text-orange-700 border-orange-200" };
  return { label: "Critical", bg: "bg-red-50 text-red-600 border-red-200" };
}

function PerfSparkline({ data, color = "#8b5cf6", width = 120, height = 36 }: { data: number[]; color?: string; width?: number; height?: number }) {
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
  const areaPoints = [`${pts[0][0]},${height - pad}`, ...pts.map(([x, y]) => `${x},${y}`), `${pts[pts.length - 1][0]},${height - pad}`].join(" ");
  const last = pts[pts.length - 1];
  const gradId = `pg-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline points={polyPoints} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={color} />
    </svg>
  );
}

function PerfTrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-green-500" />;
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

const PERF_CAT_ORDER: TaskCategory[] = ["achc", "state_board", "retention", "operations"];

// Patch the last (today) data-point in a simulated trend with real completion rates.
// Returns the trend unchanged if no real data exists (all pct === 0).
function patchTrendTodayWithRealData(
  trend: SiteTrend,
  catStats: Record<string, { done: number; total: number; pct: number }>
): SiteTrend {
  const hasReal = TREND_CATEGORIES.some((cat) => (catStats[cat]?.pct ?? 0) > 0);
  if (!hasReal) return trend;
  const categories = { ...trend.categories } as typeof trend.categories;
  for (const cat of TREND_CATEGORIES) {
    const realPct = catStats[cat]?.pct ?? 0;
    const oldDays = trend.categories[cat].days;
    const newDays = [...oldDays.slice(0, -1), { ...oldDays[oldDays.length - 1], pct: realPct }];
    const allPcts = newDays.map((d) => d.pct);
    const avg7d = Math.round(allPcts.reduce((s, v) => s + v, 0) / allPcts.length);
    categories[cat] = { ...trend.categories[cat], days: newDays, avg7d };
  }
  const overallAvg = Math.round(
    TREND_CATEGORIES.reduce((s, cat) => s + categories[cat].avg7d, 0) / TREND_CATEGORIES.length
  );
  const todayAvg = Math.round(
    TREND_CATEGORIES.reduce(
      (s, cat) => s + categories[cat].days[categories[cat].days.length - 1].pct,
      0
    ) / TREND_CATEGORIES.length
  );
  return { ...trend, categories, overallAvg, todayAvg };
}

// Responsive SVG sparkline — scales to 100% container width
function ResponsivePerfSparkline({ data, color = "#8b5cf6", height = 48 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const vw = 200;
  const pad = 4;
  const innerW = vw - pad * 2;
  const innerH = height - pad * 2;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * innerW;
    const y = pad + innerH - (v / 100) * innerH;
    return [x, y] as [number, number];
  });
  const polyPoints = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const areaPoints = [`${pts[0][0]},${height - pad}`, ...pts.map(([x, y]) => `${x},${y}`), `${pts[pts.length - 1][0]},${height - pad}`].join(" ");
  const last = pts[pts.length - 1];
  const gradId = `rsg-${color.replace(/[^a-z0-9]/gi, "")}`;
  // Convert last point to percentage so the CSS dot stays circular despite non-uniform SVG scaling
  const lastXPct = (last[0] / vw) * 100;
  const lastYPct = (last[1] / height) * 100;
  return (
    <div className="relative" style={{ height: `${height}px` }}>
      <svg
        viewBox={`0 0 ${vw} ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: `${height}px`, display: "block" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#${gradId})`} />
        <polyline points={polyPoints} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div
        style={{
          position: "absolute",
          left: `${lastXPct}%`,
          top: `${lastYPct}%`,
          transform: "translate(-50%, -50%)",
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: color,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

const TREND_PERIODS: Array<{ id: TrendPeriod; label: string }> = [
  { id: "7d",  label: "Weekly"    },
  { id: "30d", label: "Monthly"   },
  { id: "6m",  label: "Quarterly" },
  { id: "1y",  label: "Yearly"    },
];

// Category mini-card — clickable to expand the drill-down panel
function CategoryMiniCard({
  cat,
  trend7d,
  onClick,
  isExpanded,
}: {
  cat: TaskCategory;
  trend7d: SiteTrend;
  onClick?: () => void;
  isExpanded?: boolean;
}) {
  const cfg = CATEGORY_CONFIG[cat];
  const color = SPARKLINE_COLORS[cat];
  const catTrend = trend7d.categories[cat];
  const sparkData = catTrend.days.map((d) => d.pct);
  const latestPct = sparkData[sparkData.length - 1] ?? catTrend.avg7d;
  const shortName = cfg.label.replace(" Compliance", "").replace(" Metrics", "").toUpperCase();
  return (
    <div
      data-testid={`cat-mini-card-${cat}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={`bg-white border border-slate-200 rounded-md p-4 transition-all ${onClick ? "cursor-pointer hover-elevate" : ""}`}
      style={isExpanded ? { outline: `2px solid ${color}`, outlineOffset: "-2px" } : undefined}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-bold tracking-wide" style={{ color }}>
          {shortName}
        </p>
        <div className="flex items-center gap-1">
          <PerfTrendIcon trend={catTrend.trend} />
          {onClick && (isExpanded
            ? <ChevronUp className="w-3 h-3 text-slate-400" />
            : <ChevronDown className="w-3 h-3 text-slate-400" />
          )}
        </div>
      </div>
      <div className="flex items-end gap-2 mb-3">
        <p className={`text-2xl font-bold ${perfTextColor(catTrend.avg7d)}`}>{catTrend.avg7d}%</p>
        <p className="text-[11px] text-slate-400 mb-0.5">7d avg</p>
      </div>
      <ResponsivePerfSparkline data={sparkData} color={color} height={48} />
      <p className="text-[11px] text-slate-400 mt-2">
        Latest: <span className={`font-semibold ${perfTextColor(latestPct)}`}>{latestPct}%</span>
      </p>
    </div>
  );
}

// Frequency label map used in drill-down task list
const FREQ_LABEL: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  one_time: "One-Time",
};
const FREQ_ORDER = ["daily", "weekly", "biweekly", "monthly", "quarterly", "one_time"];

// Expanded drill-down panel — shows all 4 periods for a single category + tasks list
function CategoryDrillDownPanel({
  cat,
  buildTrend,
  onClose,
  siteId,
}: {
  cat: TaskCategory;
  buildTrend: (period: TrendPeriod) => SiteTrend;
  onClose: () => void;
  siteId: string;
}) {
  const [activePeriod, setActivePeriod] = useState<TrendPeriod>("7d");
  const trend = useMemo(() => buildTrend(activePeriod), [buildTrend, activePeriod]);
  const catTrend = trend.categories[cat];
  const cfg = CATEGORY_CONFIG[cat];
  const color = SPARKLINE_COLORS[cat];
  const sparkData = catTrend.days.map((d) => d.pct);
  const latestPct = sparkData[sparkData.length - 1] ?? 0;
  const highPct = Math.max(...sparkData);
  const lowPct = Math.min(...sparkData);
  const periodLabel = PERIOD_CONFIG[activePeriod].label;
  // x-axis: show first, midpoint, last labels
  const days = catTrend.days;
  const midIdx = Math.floor(days.length / 2);
  const xLabels = [
    days[0]?.label ?? "",
    days[midIdx]?.label ?? "",
    days[days.length - 1]?.label ?? "",
  ];

  // Build task list: all tasks in this category, grouped by frequency, with completion status
  const tasksByFreq = useMemo(() => {
    const catTasks = TASKS.filter((t) => t.category === cat);
    const groups: { freq: string; label: string; tasks: { task: PharmacyTask; done: boolean }[] }[] = [];
    for (const freq of FREQ_ORDER) {
      const freqTasks = catTasks.filter((t) => t.frequency === freq);
      if (freqTasks.length === 0) continue;
      const comps = loadCompletions(siteId, freq as any);
      groups.push({
        freq,
        label: FREQ_LABEL[freq] ?? freq,
        tasks: freqTasks.map((task) => ({ task, done: comps.has(task.id) })),
      });
    }
    return groups;
  }, [cat, siteId]);

  const totalTasks = tasksByFreq.reduce((s, g) => s + g.tasks.length, 0);
  const doneTasks = tasksByFreq.reduce((s, g) => s + g.tasks.filter((t) => t.done).length, 0);

  return (
    <div
      data-testid={`cat-drill-panel-${cat}`}
      className="bg-white border rounded-md p-5 mt-3"
      style={{ borderColor: color }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-bold" style={{ color }}>{cfg.label}</p>
          <p className="text-xs text-slate-400">
            Performance trend &middot; {trend.siteName} &middot; {periodLabel}
          </p>
        </div>
        <button
          data-testid="button-close-trend-panel"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 bg-slate-50 border border-slate-100 rounded-md p-1 mb-5">
        {TREND_PERIODS.map((p) => (
          <button
            key={p.id}
            data-testid={`period-tab-${p.id}`}
            onClick={() => setActivePeriod(p.id)}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold transition-all ${
              activePeriod === p.id ? "text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
            style={activePeriod === p.id ? { backgroundColor: color } : undefined}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: "Period Avg", value: catTrend.avg7d },
          { label: "Latest",    value: latestPct       },
          { label: "High",      value: highPct         },
          { label: "Low",       value: lowPct          },
        ].map(({ label, value }) => (
          <div key={label} className="text-center border border-slate-100 rounded-md py-2.5 px-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-lg font-bold ${perfTextColor(value)}`}>{value}%</p>
          </div>
        ))}
      </div>

      {/* Trend badge */}
      <div className="flex items-center gap-1.5 mb-3">
        <PerfTrendIcon trend={catTrend.trend} />
        <span className="text-xs text-slate-500 capitalize">{catTrend.trend} trend over {periodLabel.toLowerCase()}</span>
      </div>

      {/* Large sparkline */}
      <ResponsivePerfSparkline data={sparkData} color={color} height={80} />

      {/* X-axis labels */}
      <div className="flex justify-between mt-1 px-0.5">
        {xLabels.map((lbl, i) => (
          <p key={i} className="text-[10px] text-slate-400">{lbl}</p>
        ))}
      </div>

      {/* ── Task list ─────────────────────────────────────────────── */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            Tasks in this category
          </p>
          <span className="text-xs text-slate-400">
            {doneTasks}/{totalTasks} completed this period
          </span>
        </div>

        {tasksByFreq.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No tasks assigned to this category.</p>
        ) : (
          <div className="space-y-4">
            {tasksByFreq.map(({ freq, label: freqLabel, tasks }) => {
              const groupDone = tasks.filter((t) => t.done).length;
              return (
                <div key={freq}>
                  {/* Frequency group header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
                      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
                    >
                      {freqLabel}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {groupDone}/{tasks.length}
                    </span>
                  </div>

                  {/* Tasks */}
                  <div className="space-y-1.5">
                    {tasks.map(({ task, done }) => (
                      <div
                        key={task.id}
                        data-testid={`drill-task-${task.id}`}
                        className="flex items-start gap-2.5 px-3 py-2 rounded-md bg-slate-50 border border-slate-100"
                      >
                        <div
                          className={`mt-0.5 flex-shrink-0 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                            done
                              ? "border-green-500 bg-green-500"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {done && (
                            <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 8 8">
                              <path d="M1.5 4l2 2 3-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium leading-snug ${done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                            {task.taskGroup ?? task.title}
                          </p>
                          {task.taskGroup && task.title !== task.taskGroup && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{task.title}</p>
                          )}
                        </div>
                        {task.isUrgent && (
                          <span className="flex-shrink-0 text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5 uppercase tracking-wide">
                            Urgent
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

type PerfCatStats = Record<string, { done: number; total: number; pct: number }>;

function StorePerformancePanel({
  trend7d,
  catStats,
}: {
  trend7d: SiteTrend;
  catStats: PerfCatStats;
}) {
  const completedCount = TREND_CATEGORIES.reduce((s, cat) => s + (catStats[cat]?.done ?? 0), 0);
  const totalCount = TREND_CATEGORIES.reduce((s, cat) => s + (catStats[cat]?.total ?? 0), 0);
  const hasRealData = TREND_CATEGORIES.some((cat) => (catStats[cat]?.pct ?? 0) > 0);
  const todayPct = hasRealData
    ? Math.round(TREND_CATEGORIES.reduce((s, cat) => s + (catStats[cat]?.pct ?? 0), 0) / TREND_CATEGORIES.length)
    : trend7d.todayAvg;
  const avg7d = trend7d.overallAvg;
  const tier = perfTierLabel(avg7d);

  return (
    <div data-testid="store-perf-panel" className="space-y-4">
      <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-purple-600" />
        Store Performance
      </h2>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div data-testid="kpi-today" className="bg-white border border-slate-200 rounded-md px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Today's Rate</p>
          <p className={`text-3xl font-bold ${perfTextColor(todayPct)}`}>{todayPct}%</p>
          <p className="text-xs text-slate-400 mt-0.5">avg across 4 categories</p>
        </div>
        <div data-testid="kpi-7d" className="bg-white border border-slate-200 rounded-md px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">7-Day Average</p>
          <p className={`text-3xl font-bold ${perfTextColor(avg7d)}`}>{avg7d}%</p>
          <p className="text-xs text-slate-400 mt-0.5">rolling compliance</p>
        </div>
        <div data-testid="kpi-tasks" className="bg-white border border-slate-200 rounded-md px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tasks Today</p>
          <p className="text-3xl font-bold text-slate-900">{completedCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">of {totalCount} tasks done</p>
        </div>
        <div data-testid="kpi-tier" className="bg-white border border-slate-200 rounded-md px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Compliance Tier</p>
          <span className={`inline-block mt-1 text-xs font-bold px-2.5 py-1 rounded-full border ${tier.bg}`}>
            {tier.label}
          </span>
          <p className="text-xs text-slate-400 mt-1.5">based on 7d avg</p>
        </div>
      </div>

    </div>
  );
}

// ── Create Task Modal ─────────────────────────────────────────────────────────

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(120, "Max 120 characters"),
  description: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "one_time"] as const),
  role: z.enum(["data_entry_tech", "pv2_tech", "delivery_tech", "pharmacist_1", "pharmacist_2", "director", "all_staff"] as const),
  category: z.enum(["operations", "achc", "state_board", "retention"] as const),
  taskGroup: z.string(),
});
type CreateTaskFormValues = z.infer<typeof createTaskSchema>;

function CreateTaskModal({
  open,
  siteId,
  profile,
  onClose,
  onCreated,
}: {
  open: boolean;
  siteId: string;
  profile: { email: string; name: string; role: string };
  onClose: () => void;
  onCreated: (task: PharmacyTask) => void;
}) {
  const form = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      frequency: "daily",
      role: "all_staff",
      category: "operations",
      taskGroup: "Custom Tasks",
    },
  });

  function handleSubmit(values: CreateTaskFormValues) {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const roleAbbr =
      profile.role === "chief_pharmacy_officer" ? "CPO"
      : profile.role === "regional_pharmacy_director" ? "RPD"
      : "PD";
    const customTask: CustomTask = {
      id,
      siteId,
      title: values.title,
      description: values.description || undefined,
      role: values.role,
      frequency: values.frequency,
      category: values.category,
      taskGroup: values.taskGroup || "Custom Tasks",
      createdBy: `${profile.name} ${roleAbbr}`,
      createdByRole: profile.role,
      createdAt: new Date().toISOString(),
    };
    saveCustomTask(customTask);
    const asPharmacyTask: PharmacyTask = { ...customTask, isCustom: true };
    onCreated(asPharmacyTask);
    form.reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-600" />
            Create Custom Task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-title">Title <span className="text-red-500">*</span></Label>
            <Input
              id="ct-title"
              data-testid="input-create-task-title"
              placeholder="e.g. Review daily log sheet"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-desc">Description <span className="text-slate-400 font-normal text-xs">(optional)</span></Label>
            <Textarea
              id="ct-desc"
              data-testid="input-create-task-description"
              placeholder="Brief instructions or context..."
              rows={2}
              className="resize-none text-sm"
              {...form.register("description")}
            />
          </div>

          {/* Frequency + Role row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select
                value={form.watch("frequency")}
                onValueChange={(v) => form.setValue("frequency", v as TaskFrequency)}
              >
                <SelectTrigger data-testid="select-create-task-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="one_time">One-Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned Role</Label>
              <Select
                value={form.watch("role")}
                onValueChange={(v) => form.setValue("role", v as TaskRole)}
              >
                <SelectTrigger data-testid="select-create-task-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_staff">All Staff</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="pharmacist_1">Pharmacist 1</SelectItem>
                  <SelectItem value="pharmacist_2">Pharmacist 2</SelectItem>
                  <SelectItem value="data_entry_tech">DE Tech</SelectItem>
                  <SelectItem value="pv2_tech">PV2 Tech</SelectItem>
                  <SelectItem value="delivery_tech">Delivery Tech</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category + Task Group row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.watch("category")}
                onValueChange={(v) => form.setValue("category", v as TaskCategory)}
              >
                <SelectTrigger data-testid="select-create-task-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="achc">ACHC Compliance</SelectItem>
                  <SelectItem value="state_board">State Board</SelectItem>
                  <SelectItem value="retention">Retention</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-group">Task Group</Label>
              <Input
                id="ct-group"
                data-testid="input-create-task-group"
                placeholder="Custom Tasks"
                {...form.register("taskGroup")}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" data-testid="button-create-task-submit">Create Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TaskManager() {
  const { user } = useAuth();
  const profile = user ? getUserProfile(user.email, user.name) : null;

  // Optional URL params from regional dashboard drill-down or trouble-spot click-through
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const rawUrlSiteId = searchParams.get("siteId");
  const rawHighlightId = searchParams.get("highlight") ?? null;
  // Find the highlighted task so we can seed the correct frequency tab
  const highlightedTask = rawHighlightId ? TASKS.find((t) => t.id === rawHighlightId) ?? null : null;

  // Regional/CPO directors can drill into any site via URL param and retain full access.
  const isRegionalDir = profile ? isRegionalOrAbove(profile.role) : false;
  const knownSiteIds = new Set(SITES.map((s) => s.id));
  // Accept any siteId that is in the SITES list OR found in the full store directory
  const effectiveRawSiteId =
    rawUrlSiteId && (knownSiteIds.has(rawUrlSiteId) || !!findStore(rawUrlSiteId))
      ? rawUrlSiteId
      : null;
  const urlSiteId =
    effectiveRawSiteId && isRegionalDir ? effectiveRawSiteId : null;
  const readOnly = false;

  const [frequency, setFrequency] = useState<TaskFrequency>(
    highlightedTask ? highlightedTask.frequency : "daily"
  );
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(rawHighlightId);
  const [expandedCat, setExpandedCat] = useState<TaskCategory | null>(null);
  const [viewingRole, setViewingRole] = useState<ViewingRole>(
    isRegionalOrAbove(profile?.role ?? "pharmacist_1") && !!urlSiteId ? "all" : "own"
  );
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
  const [urgentIds, setUrgentIds] = useState<Set<string>>(new Set());
  const [urgentDetails, setUrgentDetails] = useState<Map<string, string>>(new Map());
  const [todayHandoffs, setTodayHandoffs] = useState<HandoffNote[]>([]);
  const [customTasks, setCustomTasks] = useState<PharmacyTask[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const siteId = urlSiteId ?? profile?.siteId ?? "1417";
  const isDir = isDirectorRole(profile?.role ?? "pharmacist_1");
  const isPharmDir = profile ? isPharmacyDirector(profile.role) : false;
  const canPrioritize = isDir && !isTechRole(profile?.role ?? "pharmacist_1");
  const canMarkUrgent = isRegionalDir && !!urlSiteId;
  // PD can always create/delete custom tasks for their own store.
  // RPD/CPO can only do so when drilled into a specific store via URL param.
  const canCreateTask = isPharmDir || (isRegionalDir && !!urlSiteId);
  const canDeleteCustom = canCreateTask;

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
    setUrgentIds(loadUrgentTasks(siteId));
    setUrgentDetails(loadUrgentTaskDetails(siteId));
    // Load today's handoff tasks and purge stale entries
    purgeStaleHandoffNotes();
    setTodayHandoffs(loadHandoffNotesForRole(siteId, getTodayDateKey(), profile.role));
    // Load custom tasks for this site
    const rawCustom = loadCustomTasks(siteId);
    setCustomTasks(rawCustom.map((ct) => ({ ...ct, isCustom: true } as PharmacyTask)));
  }, [frequency, siteId, profile?.email, viewingRole]);

  // Scroll to and highlight the task coming from a trouble-spot click-through
  useEffect(() => {
    if (!highlightTaskId) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`task-row-${highlightTaskId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      // Auto-clear highlight after 4 s
      const clear = setTimeout(() => setHighlightTaskId(null), 4000);
      return () => clearTimeout(clear);
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightTaskId]);

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

  const handleMarkUrgent = useCallback((task: PharmacyTask) => {
    if (!profile || !urlSiteId) return;
    const isCurrentlyUrgent = urgentIds.has(task.id);
    if (isCurrentlyUrgent) {
      removeUrgentTask(urlSiteId, task.id);
      setUrgentIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
      setUrgentDetails((prev) => {
        const next = new Map(prev);
        next.delete(task.id);
        return next;
      });
    } else {
      const roleAbbr =
        profile.role === "chief_pharmacy_officer" ? "CPO"
        : profile.role === "regional_pharmacy_director" ? "RPD"
        : "PD";
      const markerLabel = `${profile.name} ${roleAbbr}`;
      saveUrgentTask(urlSiteId, task.id, markerLabel);
      setUrgentIds((prev) => new Set([...prev, task.id]));
      setUrgentDetails((prev) => new Map([...prev, [task.id, markerLabel]]));
    }
  }, [profile, urlSiteId, urgentIds]);

  const handleDeleteCustom = useCallback((task: PharmacyTask) => {
    if (!task.isCustom) return;
    deleteCustomTask(siteId, task.id);
    setCustomTasks((prev) => prev.filter((t) => t.id !== task.id));
  }, [siteId]);

  // ── Store performance data — always computed (hooks must be unconditional) ──
  const drillStoreInfo = findStore(siteId);
  const drillStoreRegion = findStoreRegion(siteId);
  const perfTrend7d: SiteTrend = useMemo(() => {
    // All roles and scopes start from 0% — no simulated baseline data
    const label = urlSiteId
      ? (drillStoreInfo?.name ?? siteId)
      : profile && isCPO(profile.role)
        ? "National"
        : profile && isRegionalOrAbove(profile.role) && !isCPO(profile.role)
          ? (STORE_REGIONS.find((r) => r.region === profile.region)?.region ?? profile.region ?? "Region")
          : (drillStoreInfo?.name ?? siteId);
    const region = urlSiteId ? (drillStoreRegion?.region ?? "") : "";
    return buildZeroSiteTrend(siteId, label, region, "7d");
  }, [urlSiteId, siteId, drillStoreInfo?.name, drillStoreRegion?.region, profile?.role, profile?.region]);

  // Real task-completion data for today — recomputes live as tasks are checked off
  const perfCatStats = useMemo(() => {
    const comps = loadCompletions(siteId, "daily");
    const dailyTasks = TASKS.filter((t) => t.frequency === "daily");
    const stats: Record<string, { done: number; total: number; pct: number }> = {};
    for (const cat of TREND_CATEGORIES) {
      const catTasks = dailyTasks.filter((t) => t.category === cat);
      const done = catTasks.filter((t) => comps.has(t.id)).length;
      stats[cat] = {
        done,
        total: catTasks.length,
        pct: catTasks.length > 0 ? Math.round((done / catTasks.length) * 100) : 0,
      };
    }
    return stats;
  }, [siteId, completions]);

  // Scope-aware trend builder — all periods start from 0%, patches "today" with real completion data
  const buildTrendForScope = useCallback((period: TrendPeriod): SiteTrend => {
    const label = urlSiteId
      ? (drillStoreInfo?.name ?? siteId)
      : profile && isCPO(profile.role)
        ? "National"
        : profile && isRegionalOrAbove(profile.role) && !isCPO(profile.role)
          ? (STORE_REGIONS.find((r) => r.region === profile.region)?.region ?? profile.region ?? "Region")
          : (drillStoreInfo?.name ?? siteId);
    const region = urlSiteId ? (drillStoreRegion?.region ?? "") : "";
    const zeroed = buildZeroSiteTrend(siteId, label, region, period);
    return patchTrendTodayWithRealData(zeroed, perfCatStats);
  }, [urlSiteId, siteId, drillStoreInfo?.name, drillStoreRegion?.region, profile?.role, profile?.region, perfCatStats]);

  // Live trend: simulated baseline with today's real completion rate patched in
  const perfTrendLive = useMemo(
    () => patchTrendTodayWithRealData(perfTrend7d, perfCatStats),
    [perfTrend7d, perfCatStats]
  );

  if (!profile) return null;

  const showHandoff = !isRegionalOrAbove(profile.role) && !urlSiteId;

  const drillSite = urlSiteId
    ? (SITES.find((s) => s.id === urlSiteId) ?? (findStore(urlSiteId) ? { id: urlSiteId, name: findStore(urlSiteId)!.name, region: "" } : null))
    : null;
  const displaySiteName = drillSite?.name ?? profile.siteName;

  const extraRoles = profile.taskRoles as string[] | undefined;
  const baseVisible = getVisibleTasks(frequency, profile.role, viewingRole, extraRoles);
  // Merge in custom tasks that match the current frequency and role view.
  // Mirror getVisibleTasks semantics exactly: director tasks are only visible
  // to directors; non-directors see only their assigned role(s) + all_staff.
  const extraRoleSet = new Set<string>(extraRoles ?? []);
  const relevantCustom = customTasks.filter((ct) => {
    if (ct.frequency !== frequency) return false;
    if (viewingRole === "all") return true;
    if (viewingRole === "own") {
      if (isDir) {
        // Directors in "own" view: their director tasks + all_staff
        return ct.role === "director" || ct.role === "all_staff";
      } else {
        // Non-directors: primary role + any extra assigned roles + all_staff (never director)
        return ct.role === profile.role || extraRoleSet.has(ct.role) || ct.role === "all_staff";
      }
    }
    // Specific role view (director drilling into a staff role)
    return ct.role === (viewingRole as string) || ct.role === "all_staff";
  });
  const visible = [...baseVisible, ...relevantCustom];
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
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Back to dashboard link when drilling into a store */}
          {isRegionalDir && urlSiteId && (
            <Link
              href={isCPO(profile.role) ? "/app/tasks/national" : "/app/tasks/regional"}
              data-testid="link-back-to-regional"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-purple-700 transition-colors mb-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {isCPO(profile.role) ? "Back to National Dashboard" : "Back to Regional Dashboard"}
            </Link>
          )}
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

          {/* Category performance mini-cards — clickable to expand drill-down */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {PERF_CAT_ORDER.map((cat) => (
              <CategoryMiniCard
                key={cat}
                cat={cat}
                trend7d={perfTrendLive}
                onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
                isExpanded={expandedCat === cat}
              />
            ))}
          </div>

          {/* Drill-down panel — appears below mini-cards when one is selected */}
          {expandedCat && (
            <CategoryDrillDownPanel
              cat={expandedCat}
              buildTrend={buildTrendForScope}
              onClose={() => setExpandedCat(null)}
              siteId={siteId}
            />
          )}

          {/* ── My Store Dashboard banner — Director/Regional/CPO only ── */}
          {/* CPO/RPD: only show when NOT already in drill-in mode (avoids circular link) */}
          {isDirectorRole(profile.role) &&
            siteId !== "ALL" &&
            (!isRegionalOrAbove(profile.role) || !urlSiteId) && (
            <Link
              href={
                isRegionalOrAbove(profile.role)
                  ? `/app/tasks?siteId=${siteId}`
                  : `/app/store/${siteId}`
              }
              data-testid="link-store-dashboard-banner"
              className="flex items-center gap-3 mt-4 bg-white border border-slate-200 rounded-md px-4 py-3 hover-elevate group transition-all"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-md bg-purple-50 flex items-center justify-center">
                <LayoutGrid className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  My Store Dashboard
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-slate-900">{displaySiteName}</p>
                  <span className={`text-sm font-bold ${
                    perfTrendLive.overallAvg >= 80
                      ? "text-green-600"
                      : perfTrendLive.overallAvg >= 65
                      ? "text-amber-600"
                      : "text-red-500"
                  }`}>
                    {perfTrendLive.overallAvg}% 7d avg
                  </span>
                </div>
              </div>
              <span className="text-sm font-semibold text-purple-600 group-hover:text-purple-800 whitespace-nowrap flex items-center gap-1 transition-colors">
                View dashboard
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* ── Store Performance Panel — shown when CPO/Regional drills into a store ── */}
        {isRegionalDir && urlSiteId && (
          <StorePerformancePanel trend7d={perfTrendLive} catStats={perfCatStats} />
        )}

        {/* Frequency tabs + New Task button */}

        {/* Mobile layout: row 1 = Daily/Weekly/Biweekly, row 2 = Monthly/Quarterly/One-Time + Create Task */}
        <div className="flex flex-col gap-1.5 sm:hidden">
          <div className="flex gap-1 bg-white border border-slate-100 rounded-md p-1">
            {FREQUENCY_TABS.slice(0, 3).map((tab) => (
              <button
                key={tab.value}
                data-testid={`freq-tab-${tab.value}`}
                onClick={() => setFrequency(tab.value)}
                className={`flex-1 px-2 py-2 rounded text-sm font-semibold transition-all ${
                  frequency === tab.value
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-white border border-slate-100 rounded-md p-1 flex-1">
              {FREQUENCY_TABS.slice(3).map((tab) => (
                <button
                  key={tab.value}
                  data-testid={`freq-tab-${tab.value}`}
                  onClick={() => setFrequency(tab.value)}
                  className={`flex-1 px-2 py-2 rounded text-sm font-semibold transition-all ${
                    frequency === tab.value
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {canCreateTask && (
              <Button
                data-testid="button-new-task"
                onClick={() => setShowCreateModal(true)}
                className="shrink-0 gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Create Task
              </Button>
            )}
          </div>
        </div>

        {/* Desktop layout: all tabs + button in one row */}
        <div className="hidden sm:flex sm:items-center gap-3">
          <div className="flex gap-1 bg-white border border-slate-100 rounded-md p-1 flex-1">
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
          {canCreateTask && (
            <Button
              data-testid="button-new-task"
              onClick={() => setShowCreateModal(true)}
              className="shrink-0 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Task
            </Button>
          )}
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

        {/* Director role-view selector — visible for all directors including CPO/RPD drilling into a store */}
        {isDir && !readOnly && (
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              View tasks for
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "own" as ViewingRole, label: isRegionalDir && urlSiteId ? "Director" : "My Tasks" },
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

        {/* Staff roster / history — hidden when regional is viewing a specific store */}
        {isDir && !readOnly && !(isRegionalDir && urlSiteId) && (
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
                urgentIds={urgentIds}
                urgentDetails={urgentDetails}
                canAssign={isDir}
                canPrioritize={canPrioritize}
                canMarkUrgent={canMarkUrgent}
                canDeleteCustom={canDeleteCustom}
                readOnly={readOnly}
                siteId={siteId}
                highlightTaskId={highlightTaskId}
                onToggle={toggleCompletion}
                onAssign={setAssigningTask}
                onPrioritize={setPrioritizingTask}
                onMarkUrgent={handleMarkUrgent}
                onDeleteCustom={handleDeleteCustom}
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

      {/* Create custom task modal */}
      {canCreateTask && profile && (
        <CreateTaskModal
          open={showCreateModal}
          siteId={siteId}
          profile={{ email: profile.email, name: profile.name, role: profile.role }}
          onClose={() => setShowCreateModal(false)}
          onCreated={(task) => setCustomTasks((prev) => [...prev, task])}
        />
      )}
    </div>
  );
}
