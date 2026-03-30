import type { TaskFrequency } from "./taskData";

const COMPLETIONS_KEY = "koheez_task_completions";
const ASSIGNMENTS_KEY = "koheez_task_assignments";
const PRIORITIES_KEY = "koheez_task_priorities";

export interface TaskCompletion {
  taskId: string;
  taskRole: string;
  completedAt: string;
  period: string;
  siteId: string;
  userEmail: string;
  userRole: string;
}

export interface TaskAssignment {
  taskId: string;
  assignedToRole: string;
  assignedToName?: string;
  note: string;
  assignedBy: string;
  assignedAt: string;
  siteId: string;
}

export interface TaskPriority {
  taskId: string;
  taskTitle: string;
  siteId: string;
  note: string;
  prioritizedBy: string;
  prioritizedByRole: string;
  prioritizedAt: string;
  dismissed: boolean;
}

export function getPeriodKey(frequency: TaskFrequency): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();

  if (frequency === "daily") return `${y}-${pad(m)}-${pad(d)}`;
  if (frequency === "weekly") {
    const startOfYear = new Date(y, 0, 1);
    const week = Math.ceil(
      ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
    );
    return `${y}-W${pad(week)}`;
  }
  if (frequency === "monthly") return `${y}-${pad(m)}`;
  if (frequency === "quarterly") return `${y}-Q${Math.ceil(m / 3)}`;
  return `${y}-${pad(m)}-${pad(d)}`;
}

function readCompletions(): TaskCompletion[] {
  try {
    const raw = localStorage.getItem(COMPLETIONS_KEY);
    return raw ? (JSON.parse(raw) as TaskCompletion[]) : [];
  } catch {
    return [];
  }
}

function writeCompletions(completions: TaskCompletion[]): void {
  try {
    localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
  } catch {}
}

export function loadCompletions(
  siteId: string,
  frequency: TaskFrequency,
  roleFilter?: string
): Set<string> {
  const period = getPeriodKey(frequency);
  const all = readCompletions();
  const filtered = all.filter(
    (c) =>
      c.siteId === siteId &&
      c.period === period &&
      (roleFilter == null || c.taskRole === roleFilter || c.taskRole === "all_staff")
  );
  return new Set(filtered.map((c) => c.taskId));
}

export function loadCompletionsForSite(
  siteId: string,
  frequency: TaskFrequency
): TaskCompletion[] {
  const period = getPeriodKey(frequency);
  return readCompletions().filter((c) => c.siteId === siteId && c.period === period);
}

export function loadAllSiteCompletions(
  frequency: TaskFrequency
): Record<string, Set<string>> {
  const period = getPeriodKey(frequency);
  const all = readCompletions();
  const bySite: Record<string, Set<string>> = {};
  for (const c of all) {
    if (c.period === period) {
      if (!bySite[c.siteId]) bySite[c.siteId] = new Set();
      bySite[c.siteId].add(c.taskId);
    }
  }
  return bySite;
}

export function saveCompletion(
  taskId: string,
  taskRole: string,
  siteId: string,
  userEmail: string,
  userRole: string,
  frequency: TaskFrequency
): void {
  const period = getPeriodKey(frequency);
  const all = readCompletions().filter(
    (c) => !(c.taskId === taskId && c.siteId === siteId && c.period === period)
  );
  all.push({
    taskId,
    taskRole,
    completedAt: new Date().toISOString(),
    period,
    siteId,
    userEmail,
    userRole,
  });
  writeCompletions(all);
}

export function removeCompletion(
  taskId: string,
  siteId: string,
  frequency: TaskFrequency
): void {
  const period = getPeriodKey(frequency);
  writeCompletions(
    readCompletions().filter(
      (c) => !(c.taskId === taskId && c.siteId === siteId && c.period === period)
    )
  );
}

// ── Assignments ────────────────────────────────────────────────────────────

function readAssignments(): TaskAssignment[] {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    return raw ? (JSON.parse(raw) as TaskAssignment[]) : [];
  } catch {
    return [];
  }
}

export function loadAssignments(siteId: string): TaskAssignment[] {
  return readAssignments().filter((a) => a.siteId === siteId);
}

export function saveAssignment(assignment: TaskAssignment): void {
  try {
    const all = readAssignments().filter(
      (a) => !(a.taskId === assignment.taskId && a.siteId === assignment.siteId)
    );
    all.push(assignment);
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(all));
  } catch {}
}

export function removeAssignment(taskId: string, siteId: string): void {
  try {
    localStorage.setItem(
      ASSIGNMENTS_KEY,
      JSON.stringify(readAssignments().filter((a) => !(a.taskId === taskId && a.siteId === siteId)))
    );
  } catch {}
}

// ── Task Priorities / Alerts ───────────────────────────────────────────────

function readPriorities(): TaskPriority[] {
  try {
    const raw = localStorage.getItem(PRIORITIES_KEY);
    return raw ? (JSON.parse(raw) as TaskPriority[]) : [];
  } catch {
    return [];
  }
}

function writePriorities(priorities: TaskPriority[]): void {
  try {
    localStorage.setItem(PRIORITIES_KEY, JSON.stringify(priorities));
  } catch {}
}

export function loadPriorities(siteId: string): TaskPriority[] {
  return readPriorities().filter((p) => p.siteId === siteId && !p.dismissed);
}

export function savePriority(priority: TaskPriority): void {
  const all = readPriorities().filter(
    (p) => !(p.taskId === priority.taskId && p.siteId === priority.siteId)
  );
  all.push(priority);
  writePriorities(all);
}

export function dismissPriority(taskId: string, siteId: string): void {
  writePriorities(
    readPriorities().map((p) =>
      p.taskId === taskId && p.siteId === siteId ? { ...p, dismissed: true } : p
    )
  );
}

export function removePriority(taskId: string, siteId: string): void {
  writePriorities(
    readPriorities().filter((p) => !(p.taskId === taskId && p.siteId === siteId))
  );
}

export function hasPriority(taskId: string, siteId: string): boolean {
  return readPriorities().some((p) => p.taskId === taskId && p.siteId === siteId && !p.dismissed);
}

// ── Handoff Notes ──────────────────────────────────────────────────────────

const HANDOFF_KEY = "koheez_handoff_notes";

export interface HandoffItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface HandoffNote {
  id: string;
  siteId: string;
  rawText: string;
  items: HandoffItem[];
  forDate: string;
  createdAt: string;
  createdBy: string;
  createdByRole: string;
}

function readHandoffNotes(): HandoffNote[] {
  try {
    const raw = localStorage.getItem(HANDOFF_KEY);
    return raw ? (JSON.parse(raw) as HandoffNote[]) : [];
  } catch {
    return [];
  }
}

function writeHandoffNotes(notes: HandoffNote[]): void {
  try {
    localStorage.setItem(HANDOFF_KEY, JSON.stringify(notes));
  } catch {}
}

export function getTomorrowDateKey(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getTodayDateKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function loadHandoffForDate(siteId: string, date: string): HandoffNote | null {
  return readHandoffNotes().find((n) => n.siteId === siteId && n.forDate === date) ?? null;
}

export function saveHandoffNote(note: HandoffNote): void {
  const all = readHandoffNotes().filter(
    (n) => !(n.siteId === note.siteId && n.forDate === note.forDate)
  );
  all.push(note);
  writeHandoffNotes(all);
}

export function toggleHandoffItemComplete(siteId: string, date: string, itemId: string): void {
  const all = readHandoffNotes().map((n) => {
    if (n.siteId !== siteId || n.forDate !== date) return n;
    return {
      ...n,
      items: n.items.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ),
    };
  });
  writeHandoffNotes(all);
}

export function purgeStaleHandoffNotes(): void {
  const today = getTodayDateKey();
  writeHandoffNotes(readHandoffNotes().filter((n) => n.forDate >= today));
}
