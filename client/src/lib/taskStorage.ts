import type { TaskFrequency } from "./taskData";

const COMPLETIONS_KEY = "koheez_task_completions";
const ASSIGNMENTS_KEY = "koheez_task_assignments";

export interface TaskCompletion {
  taskId: string;
  completedAt: string;
  period: string;
  siteId: string;
  userEmail: string;
  userRole: string;
}

export interface TaskAssignment {
  taskId: string;
  assignedToRole: string;
  note: string;
  assignedBy: string;
  assignedAt: string;
  siteId: string;
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

export function loadCompletions(siteId: string, frequency: TaskFrequency): Set<string> {
  const period = getPeriodKey(frequency);
  const all = readCompletions();
  const filtered = all.filter((c) => c.siteId === siteId && c.period === period);
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
  siteId: string,
  userEmail: string,
  userRole: string,
  frequency: TaskFrequency
): void {
  const period = getPeriodKey(frequency);
  const all = readCompletions().filter(
    (c) => !(c.taskId === taskId && c.siteId === siteId && c.period === period)
  );
  all.push({ taskId, completedAt: new Date().toISOString(), period, siteId, userEmail, userRole });
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
