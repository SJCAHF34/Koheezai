import { taskRoleMatches, TASKS } from "./taskData";
import type { TaskFrequency, TaskRole, TaskCategory, PharmacyTask } from "./taskData";

const COMPLETIONS_KEY = "koheez_task_completions";
const TASK_OVERRIDES_KEY = "koheez_task_overrides";

// ── Built-in task overrides ──────────────────────────────────────────────────
// Directors can edit ANY task, including the built-in (predefined) ones.
// Edits to built-in tasks are stored here as overrides keyed by task id and
// applied to the in-memory TASKS array so every consumer sees them.

export interface TaskOverride {
  title?: string;
  description?: string;
  frequency?: TaskFrequency;
  category?: TaskCategory;
  taskGroup?: string;
}

export function loadTaskOverrides(): Record<string, TaskOverride> {
  try {
    const raw = localStorage.getItem(TASK_OVERRIDES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, TaskOverride>)
      : {};
  } catch {
    return {};
  }
}

export function applyTaskOverridesToMemory(): void {
  const overrides = loadTaskOverrides();
  for (const task of TASKS) {
    const o = overrides[task.id];
    if (!o) continue;
    if (o.title !== undefined) task.title = o.title;
    if (o.description !== undefined) task.description = o.description;
    if (o.frequency !== undefined) task.frequency = o.frequency;
    if (o.category !== undefined) task.category = o.category;
    if (o.taskGroup !== undefined) task.taskGroup = o.taskGroup;
  }
}

export function saveTaskOverride(taskId: string, override: TaskOverride): void {
  const all = loadTaskOverrides();
  all[taskId] = { ...all[taskId], ...override };
  try {
    localStorage.setItem(TASK_OVERRIDES_KEY, JSON.stringify(all));
  } catch { /* ignore quota errors */ }
  applyTaskOverridesToMemory();
}

// Apply persisted overrides as soon as this module loads in the browser.
if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
  applyTaskOverridesToMemory();
}
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
  /** ISO timestamp updated on every write (check or uncheck). Used by the
   *  server merge to determine which device's version of a record is most
   *  recent (LWW). Falls back to completedAt for legacy records. */
  updatedAt?: string;
  /** True when the user unchecked this task. The record is kept as a
   *  tombstone so the uncheck propagates through server-side LWW merge
   *  and prevents a stale "checked" copy from another device resurrecting it. */
  deleted?: boolean;
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

export function getPeriodKey(frequency: TaskFrequency, date?: Date): string {
  const now = date ?? new Date();
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
  if (frequency === "biweekly") {
    // Biweekly periods anchored to Monday 2026-04-13 (first due date)
    const ref = new Date(2026, 3, 13);
    const today = new Date(y, m - 1, d);
    const daysSinceRef = Math.floor((today.getTime() - ref.getTime()) / 86400000);
    const weeksSinceRef = Math.floor(Math.max(0, daysSinceRef) / 7);
    const biweeklyNum = Math.floor(weeksSinceRef / 2);
    const periodStart = new Date(ref.getTime() + biweeklyNum * 14 * 86400000);
    const py = periodStart.getFullYear();
    const pm = periodStart.getMonth() + 1;
    const pd = periodStart.getDate();
    return `${py}-BW${pad(pm)}${pad(pd)}`;
  }
  if (frequency === "monthly") return `${y}-${pad(m)}`;
  if (frequency === "quarterly") return `${y}-Q${Math.ceil(m / 3)}`;
  if (frequency === "biannual") return `${y}-${m <= 6 ? "H1" : "H2"}`;
  if (frequency === "annual") return `${y}`;
  if (frequency === "one_time") return "one-time";
  return `${y}-${pad(m)}-${pad(d)}`;
}

function readCompletions(): TaskCompletion[] {
  try {
    const raw = localStorage.getItem(COMPLETIONS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? (parsed as TaskCompletion[]) : [];
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
  roleFilter?: string,
  date?: Date
): Set<string> {
  const period = getPeriodKey(frequency, date);
  const all = readCompletions();
  const filtered = all.filter(
    (c) =>
      !c.deleted &&
      c.siteId === siteId &&
      c.period === period &&
      (roleFilter == null || taskRoleMatches(c.taskRole, roleFilter))
  );
  return new Set(filtered.map((c) => c.taskId));
}

export function loadCompletionsForSite(
  siteId: string,
  frequency: TaskFrequency,
  date?: Date
): TaskCompletion[] {
  const period = getPeriodKey(frequency, date);
  return readCompletions().filter((c) => !c.deleted && c.siteId === siteId && c.period === period);
}

export function loadAllSiteCompletions(
  frequency: TaskFrequency
): Record<string, Set<string>> {
  const period = getPeriodKey(frequency);
  const all = readCompletions();
  const bySite: Record<string, Set<string>> = {};
  for (const c of all) {
    if (!c.deleted && c.period === period) {
      if (!bySite[c.siteId]) bySite[c.siteId] = new Set();
      bySite[c.siteId].add(c.taskId);
    }
  }
  return bySite;
}

/**
 * Returns all daily completions for a site across all dates, grouped by
 * YYYY-MM-DD date string. Used by the director history calendar.
 * When siteId is "ALL", returns completions across every site.
 */
export function loadSiteCompletions(
  siteId: string
): Record<string, TaskCompletion[]> {
  const all = readCompletions();
  const filtered = (siteId === "ALL" ? all : all.filter((c) => c.siteId === siteId))
    .filter((c) => !c.deleted);
  const byDate: Record<string, TaskCompletion[]> = {};
  for (const c of filtered) {
    // Only include daily completions — they have YYYY-MM-DD period keys
    if (/^\d{4}-\d{2}-\d{2}$/.test(c.period)) {
      if (!byDate[c.period]) byDate[c.period] = [];
      byDate[c.period].push(c);
    }
  }
  return byDate;
}

/** Alias kept for backwards-compat; prefer `loadSiteCompletions`. */
export const loadSiteCompletionsHistory = loadSiteCompletions;

export function saveCompletion(
  taskId: string,
  taskRole: string,
  siteId: string,
  userEmail: string,
  userRole: string,
  frequency: TaskFrequency,
  date?: Date
): void {
  const period = getPeriodKey(frequency, date);
  const now = new Date().toISOString();
  const all = readCompletions().filter(
    (c) => !(c.taskId === taskId && c.siteId === siteId && c.period === period)
  );
  all.push({
    taskId,
    taskRole,
    completedAt: now,
    updatedAt: now,
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
  frequency: TaskFrequency,
  date?: Date
): void {
  // Write a tombstone (deleted: true) instead of removing the record so the
  // uncheck propagates through the server-side LWW merge and prevents a stale
  // "checked" copy from another device from resurrecting this completion.
  const period = getPeriodKey(frequency, date);
  const now = new Date().toISOString();
  const all = readCompletions();
  const existing = all.find(
    (c) => c.taskId === taskId && c.siteId === siteId && c.period === period
  );
  if (!existing) return; // nothing to uncheck
  const rest = all.filter(
    (c) => !(c.taskId === taskId && c.siteId === siteId && c.period === period)
  );
  rest.push({ ...existing, deleted: true, updatedAt: now });
  writeCompletions(rest);
}

// ── Assignments ────────────────────────────────────────────────────────────

function readAssignments(): TaskAssignment[] {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? (parsed as TaskAssignment[]) : [];
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
    const parsed: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? (parsed as TaskPriority[]) : [];
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

// ── Regional Urgent Tasks ──────────────────────────────────────────────────

export interface UrgentTask {
  siteId: string;
  taskId: string;
  markedBy: string;
  markedAt: string;
}

const URGENT_KEY = "koheez_urgent_tasks";

function readUrgentTasks(): UrgentTask[] {
  try {
    const raw = localStorage.getItem(URGENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? (parsed as UrgentTask[]) : [];
  } catch {
    return [];
  }
}

function writeUrgentTasks(tasks: UrgentTask[]): void {
  try {
    localStorage.setItem(URGENT_KEY, JSON.stringify(tasks));
  } catch {}
}

export function loadUrgentTasks(siteId: string): Set<string> {
  return new Set(
    readUrgentTasks()
      .filter((t) => t.siteId === siteId)
      .map((t) => t.taskId)
  );
}

export function loadUrgentTaskDetails(siteId: string): Map<string, string> {
  return new Map(
    readUrgentTasks()
      .filter((t) => t.siteId === siteId)
      .map((t) => [t.taskId, t.markedBy])
  );
}

export function saveUrgentTask(siteId: string, taskId: string, markedBy: string): void {
  const all = readUrgentTasks().filter(
    (t) => !(t.taskId === taskId && t.siteId === siteId)
  );
  all.push({ siteId, taskId, markedBy, markedAt: new Date().toISOString() });
  writeUrgentTasks(all);
}

export function removeUrgentTask(siteId: string, taskId: string): void {
  writeUrgentTasks(
    readUrgentTasks().filter((t) => !(t.taskId === taskId && t.siteId === siteId))
  );
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
  forRole: string;
  createdAt: string;
  createdBy: string;
  createdByRole: string;
}

function readHandoffNotes(): HandoffNote[] {
  try {
    const raw = localStorage.getItem(HANDOFF_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? (parsed as HandoffNote[]) : [];
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

/** @deprecated Pre-role semantics: returns first match by (siteId, date) ignoring forRole.
 *  Use loadHandoffNoteForRoleAndDate or loadHandoffNotesForRole for role-aware flows. */
export function loadHandoffForDate(siteId: string, date: string): HandoffNote | null {
  return readHandoffNotes().find((n) => n.siteId === siteId && n.forDate === date) ?? null;
}

export function loadHandoffNoteForRoleAndDate(siteId: string, date: string, forRole: string): HandoffNote | null {
  const resolved = forRole || "all";
  return readHandoffNotes().find(
    (n) => n.siteId === siteId && n.forDate === date && (n.forRole || "all") === resolved
  ) ?? null;
}

export function loadHandoffNotesForRole(siteId: string, date: string, userRole: string): HandoffNote[] {
  const notes = readHandoffNotes().filter((n) => n.siteId === siteId && n.forDate === date);
  const isDir = userRole === "pharmacy_director";
  if (isDir) return notes.filter((n) => n.items.length > 0);
  return notes.filter((n) => {
    const nr = n.forRole || "all";
    return (nr === userRole || nr === "all") && n.items.length > 0;
  });
}

export function saveHandoffNote(note: HandoffNote): void {
  const forRole = note.forRole || "all";
  // Handoff notes are only ever meant to schedule tasks for a future date —
  // the panel that creates them defaults its target date to "tomorrow" once,
  // at mount. If that panel stays open across a midnight rollover (common in
  // a 24/7 pharmacy), its stale "tomorrow" string can silently become
  // *today's* date. Saving at that point would blindly overwrite today's
  // already-in-progress handoff note — including any checkboxes staff have
  // already completed — with whatever was typed for "tomorrow". Guard
  // against that here, in the one place notes are persisted, so no caller
  // can ever clobber the live note for today (or the past).
  const today = getTodayDateKey();
  const safeForDate = note.forDate <= today ? getTomorrowDateKey() : note.forDate;
  const all = readHandoffNotes().filter(
    (n) => !(n.siteId === note.siteId && n.forDate === safeForDate && (n.forRole || "all") === forRole)
  );
  all.push({ ...note, forDate: safeForDate, forRole });
  writeHandoffNotes(all);
}

export function toggleHandoffItemComplete(siteId: string, date: string, itemId: string, forRole: string): void {
  const resolved = forRole || "all";
  const all = readHandoffNotes().map((n) => {
    if (n.siteId !== siteId || n.forDate !== date || (n.forRole || "all") !== resolved) return n;
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

// ── ACHC Workbook ───────────────────────────────────────────────────────────

const WORKBOOK_KEY = "koheez_achc_workbook";

export type WorkbookStatus = "not_started" | "in_progress" | "submitted";

export type WorkbookItemStatus = "complete" | "in_progress" | "gap" | "na" | "";

export interface WorkbookItemResponse {
  itemId: string;
  status: WorkbookItemStatus;
  notes: string;
}

export interface WorkbookSectionResponse {
  sectionId: string;
  items: WorkbookItemResponse[];
  sectionNotes: string;
}

export interface WorkbookRecord {
  siteId: string;
  quarter: string;
  sections: WorkbookSectionResponse[];
  status: WorkbookStatus;
  submittedBy?: string;
  submittedAt?: string;
  lastUpdatedAt: string;
}

export function getCurrentQuarter(): string {
  const now = new Date();
  const y = now.getFullYear();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${y}-Q${q}`;
}

function readWorkbooks(): WorkbookRecord[] {
  try {
    const raw = localStorage.getItem(WORKBOOK_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? (parsed as WorkbookRecord[]) : [];
  } catch {
    return [];
  }
}

function writeWorkbooks(records: WorkbookRecord[]): void {
  try {
    localStorage.setItem(WORKBOOK_KEY, JSON.stringify(records));
  } catch {}
}

export function loadWorkbook(siteId: string, quarter: string): WorkbookRecord | null {
  return readWorkbooks().find((r) => r.siteId === siteId && r.quarter === quarter) ?? null;
}

export function saveWorkbook(record: WorkbookRecord): void {
  const all = readWorkbooks().filter(
    (r) => !(r.siteId === record.siteId && r.quarter === record.quarter)
  );
  all.push({ ...record, lastUpdatedAt: new Date().toISOString() });
  writeWorkbooks(all);
}

export function submitWorkbook(siteId: string, quarter: string, submittedBy: string): void {
  const all = readWorkbooks().map((r) => {
    if (r.siteId !== siteId || r.quarter !== quarter) return r;
    return {
      ...r,
      status: "submitted" as WorkbookStatus,
      submittedBy,
      submittedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };
  });
  writeWorkbooks(all);
}

export function getWorkbookStatus(siteId: string, quarter: string): WorkbookStatus {
  const record = loadWorkbook(siteId, quarter);
  return record?.status ?? "not_started";
}

// ── Retention Risk Report ────────────────────────────────────────────────────

const RETENTION_RISK_KEY = "koheez_retention_risk";

export interface RetentionRiskEntry {
  siteId: string;
  date: string;
  controllable: number;
  partiallyControllable: number;
  nonControllable: number;
  updatedAt: string;
}

function readRetentionRisk(): RetentionRiskEntry[] {
  try {
    const raw = localStorage.getItem(RETENTION_RISK_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? (parsed as RetentionRiskEntry[]) : [];
  } catch {
    return [];
  }
}

export function loadRetentionRisk(siteId: string, date: string): RetentionRiskEntry | null {
  return readRetentionRisk().find((r) => r.siteId === siteId && r.date === date) ?? null;
}

export function saveRetentionRisk(entry: RetentionRiskEntry): void {
  try {
    const all = readRetentionRisk().filter(
      (r) => !(r.siteId === entry.siteId && r.date === entry.date)
    );
    all.push({ ...entry, updatedAt: new Date().toISOString() });
    localStorage.setItem(RETENTION_RISK_KEY, JSON.stringify(all));
  } catch {}
}

// ── Staff Roster ─────────────────────────────────────────────────────────────

const STAFF_ROSTER_KEY = "koheez_staff_roster";

export interface RoleAssignment {
  role: string;
  startDate?: string; // YYYY-MM-DD inclusive
  endDate?: string;   // YYYY-MM-DD inclusive
}

export interface StaffMember {
  id: string;
  name: string;
  roles: string[];                   // all roles — kept for backward compat
  roleAssignments?: RoleAssignment[]; // per-role date bounds; authoritative when present
}

export interface SiteRoster {
  siteId: string;
  members: StaffMember[];
}

/** Returns the roles that are active for a member on a given date (YYYY-MM-DD).
 *  Falls back to the flat `roles` array when no roleAssignments are present. */
export function getActiveRoles(member: StaffMember, todayDate?: string): string[] {
  const today = todayDate ?? getTodayDateKey();
  if (!member.roleAssignments || member.roleAssignments.length === 0) {
    return member.roles;
  }
  return member.roleAssignments
    .filter((ra) => {
      if (ra.startDate && today < ra.startDate) return false;
      if (ra.endDate && today > ra.endDate) return false;
      return true;
    })
    .map((ra) => ra.role);
}

function readRosters(): SiteRoster[] {
  try {
    const raw = localStorage.getItem(STAFF_ROSTER_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? (parsed as SiteRoster[]) : [];
  } catch {
    return [];
  }
}

const DEFAULT_ROSTERS: Record<string, SiteRoster> = {
  "1417": {
    siteId: "1417",
    members: [
      { id: "s1417-001", name: "Seth Collins",    roles: ["director"] },
      { id: "s1417-007", name: "Walid Mohammad",  roles: ["director"] },
      { id: "s1417-002", name: "Debbie Nguyen",  roles: ["pharmacist_1"] },
      { id: "s1417-006", name: "Uyen-Vy Nguyen", roles: ["pharmacist_1"] },
      { id: "s1417-003", name: "Claire Wood",    roles: ["data_entry_tech"] },
      { id: "s1417-004", name: "Pairiss Wilcox", roles: ["data_entry_tech"] },
      { id: "s1417-005", name: "Anh Do",         roles: ["data_entry_tech"] },
    ],
  },
};

// ── CQI-QRE Meeting ──────────────────────────────────────────────────────────
// CQI meeting records are now stored server-side (see server/storage.ts and the
// /api/cqi routes) so the same record is shared across every user at a site —
// directors edit it, and technicians / staff pharmacists view it read-only and
// sign attendance. Types are re-exported from the shared schema for convenience.
export type { CQIAttendee, CQIMeetingRecord } from "@shared/schema";

// ── Roster ──────────────────────────────────────────────────────────────────

export function loadRoster(siteId: string): SiteRoster {
  return readRosters().find((r) => r.siteId === siteId) ?? DEFAULT_ROSTERS[siteId] ?? { siteId, members: [] };
}

/** Returns the name of the site's director (Pharmacist-in-Charge) from the
 *  roster, or "" when no director is configured. If multiple directors are
 *  active, the first one in the roster is used. */
export function getSiteDirectorName(siteId: string, todayDate?: string): string {
  const roster = loadRoster(siteId);
  const director = roster.members.find((m) =>
    getActiveRoles(m, todayDate).includes("director"),
  );
  return director?.name ?? "";
}

/** Returns the names of roster members whose given role is active on the
 *  given date (defaults to today). Respects date-bounded role assignments —
 *  expired or future assignments are excluded. */
export function getRoleCoverageNames(siteId: string, role: string, todayDate?: string): string[] {
  const roster = loadRoster(siteId);
  return roster.members
    .filter((m) => getActiveRoles(m, todayDate).includes(role))
    .map((m) => m.name);
}

export function saveRoster(roster: SiteRoster): void {
  try {
    const all = readRosters().filter((r) => r.siteId !== roster.siteId);
    all.push(roster);
    localStorage.setItem(STAFF_ROSTER_KEY, JSON.stringify(all));
  } catch {}
}

// ── ACHC Document Vault ──────────────────────────────────────────────────────

const FOUNDATION_DOCS_KEY = "koheez_achc_foundation_docs";
const STORE_DOCS_KEY = "koheez_achc_store_docs";

/** A foundation-wide document record: template info + optional URL or uploaded file set by CPO/RPD */
export interface FoundationDocRecord {
  id: string;
  itemId: string;
  label: string;
  description: string;
  /** Either an https URL or a `data:` URL produced by an inline file upload. */
  url: string;
  /** Original filename when the source is an uploaded file. */
  fileName?: string;
  /** MIME type when the source is an uploaded file. */
  fileType?: string;
  addedBy: string;
  addedAt: string;
}

/** A store-specific document record attached by a Pharmacy Director */
export interface StoreDocRecord {
  id: string;
  siteId: string;
  itemId: string;
  label: string;
  /** Either an https URL or a `data:` URL produced by an inline file upload. */
  url: string;
  /** Original filename when the source is an uploaded file. */
  fileName?: string;
  /** MIME type when the source is an uploaded file. */
  fileType?: string;
  uploadedBy: string;
  uploadedAt: string;
}

function readFoundationDocs(): FoundationDocRecord[] {
  try {
    const raw = localStorage.getItem(FOUNDATION_DOCS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? (parsed as FoundationDocRecord[]) : [];
  } catch {
    return [];
  }
}

function writeFoundationDocs(docs: FoundationDocRecord[]): void {
  try {
    localStorage.setItem(FOUNDATION_DOCS_KEY, JSON.stringify(docs));
  } catch {}
}

/** Load all foundation-wide doc records (globally, not per-site). */
export function loadFoundationDocs(): FoundationDocRecord[] {
  return readFoundationDocs();
}

/** Validate URL scheme as http(s) or a data: URL produced by an inline file upload. */
function isHttpUrlFd(url: string): boolean {
  if (/^data:/i.test(url)) return true;
  try { return /^https?:\/\//i.test(new URL(url).href); } catch { return false; }
}

/** Save (upsert) a single foundation doc record by id. Rejects non-http(s) URLs. */
export function saveFoundationDoc(doc: FoundationDocRecord): void {
  if (!isHttpUrlFd(doc.url)) return;
  const all = readFoundationDocs().filter((d) => d.id !== doc.id);
  all.push({ ...doc, addedAt: new Date().toISOString() });
  writeFoundationDocs(all);
}

/** Save (replace) the full collection of foundation doc records. Plural alias for bulk ops. */
export function saveFoundationDocs(docs: FoundationDocRecord[]): void {
  writeFoundationDocs(
    docs
      .filter((d) => isHttpUrlFd(d.url))
      .map((d) => ({ ...d, addedAt: d.addedAt || new Date().toISOString() }))
  );
}

/** Remove a foundation doc record by id (reverts URL to blank). */
export function removeFoundationDocUrl(id: string): void {
  writeFoundationDocs(readFoundationDocs().filter((d) => d.id !== id));
}

function readStoreDocs(): StoreDocRecord[] {
  try {
    const raw = localStorage.getItem(STORE_DOCS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? (parsed as StoreDocRecord[]) : [];
  } catch {
    return [];
  }
}

function writeStoreDocs(docs: StoreDocRecord[]): void {
  try {
    localStorage.setItem(STORE_DOCS_KEY, JSON.stringify(docs));
  } catch {}
}

/** Load all store-specific doc records for a given siteId. */
export function loadStoreDocs(siteId: string): StoreDocRecord[] {
  return readStoreDocs().filter((d) => d.siteId === siteId);
}

/** Validate URL scheme as http(s) or a data: URL produced by an inline file upload. */
function isHttpUrl(url: string): boolean {
  if (/^data:/i.test(url)) return true;
  try { return /^https?:\/\//i.test(new URL(url).href); } catch { return false; }
}

/** Save (upsert) a store-specific doc record by id. Rejects non-http(s) URLs. */
export function saveStoreDoc(doc: StoreDocRecord): void {
  if (!isHttpUrl(doc.url)) return;
  const all = readStoreDocs().filter((d) => d.id !== doc.id);
  all.push({ ...doc, uploadedAt: new Date().toISOString() });
  writeStoreDocs(all);
}

/** Save (replace) all store docs for a given site. Plural alias for bulk ops. Rejects non-http(s) URLs. */
export function saveStoreDocs(siteId: string, docs: StoreDocRecord[]): void {
  const others = readStoreDocs().filter((d) => d.siteId !== siteId);
  const valid = docs.filter((d) => isHttpUrl(d.url)).map((d) => ({ ...d, uploadedAt: d.uploadedAt || new Date().toISOString() }));
  writeStoreDocs([...others, ...valid]);
}

/** Remove a store-specific doc record by id. */
export function removeStoreDoc(id: string): void {
  writeStoreDocs(readStoreDocs().filter((d) => d.id !== id));
}

// ── Task Counters ─────────────────────────────────────────────────────────────

const COUNTERS_KEY = "koheez_task_counters";

export interface TaskCounterEntry {
  siteId: string;
  taskId: string;
  date: string;
  start?: number;
  end?: number;
}

function readCounters(): TaskCounterEntry[] {
  try {
    const raw = localStorage.getItem(COUNTERS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? (parsed as TaskCounterEntry[]) : [];
  } catch {
    return [];
  }
}

function writeCounters(entries: TaskCounterEntry[]): void {
  try {
    localStorage.setItem(COUNTERS_KEY, JSON.stringify(entries));
  } catch {}
}

export function loadTaskCounter(siteId: string, taskId: string, date: string): TaskCounterEntry | null {
  return readCounters().find((e) => e.siteId === siteId && e.taskId === taskId && e.date === date) ?? null;
}

export function saveTaskCounter(entry: TaskCounterEntry): void {
  const all = readCounters().filter(
    (e) => !(e.siteId === entry.siteId && e.taskId === entry.taskId && e.date === entry.date)
  );
  all.push(entry);
  writeCounters(all);
}

/** Load all counter entries for a given site on a given date (YYYY-MM-DD). */
export function loadCountersForSite(siteId: string, date: string): TaskCounterEntry[] {
  return readCounters().filter((e) => e.siteId === siteId && e.date === date);
}

// ── Custom Tasks ─────────────────────────────────────────────────────────────

const CUSTOM_TASKS_KEY = "koheez_custom_tasks";

export type CustomTaskScope = "site" | "regional" | "national";

export interface CustomTask {
  id: string;
  siteId: string;
  scope: CustomTaskScope;
  region?: string;
  selectedStore?: string;
  title: string;
  description?: string;
  role: TaskRole;
  assignedToLabel?: string;
  frequency: TaskFrequency;
  category: TaskCategory;
  taskGroup: string;
  createdBy: string;
  createdByRole: string;
  createdAt: string;
  dueDate?: string;
  /** Which weekdays (0=Sun … 6=Sat) the task recurs on for weekly/biweekly tasks */
  daysOfWeek?: number[];
  /** When true, a monthly task is due on the last business day of each month */
  lastBusinessDayOfMonth?: boolean;
}

function readCustomTasks(): CustomTask[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TASKS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? (parsed as CustomTask[]) : [];
  } catch {
    return [];
  }
}

function writeCustomTasks(tasks: CustomTask[]): void {
  try {
    localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(tasks));
  } catch {}
}

export function loadCustomTasks(siteId: string, region?: string): CustomTask[] {
  return readCustomTasks().filter((t) => {
    const scope = t.scope ?? "site";
    if (scope === "national") return true;
    if (scope === "regional") return !!region && t.region === region;
    return t.siteId === siteId;
  });
}

export function saveCustomTask(task: CustomTask): void {
  const all = readCustomTasks().filter((t) => t.id !== task.id);
  all.push(task);
  writeCustomTasks(all);
}

export function deleteCustomTask(taskId: string): void {
  writeCustomTasks(readCustomTasks().filter((t) => t.id !== taskId));
}

/**
 * Load custom tasks for the Task Tracker with role-based filtering.
 * - CPO (isCpo=true): returns all custom tasks across all scopes.
 * - RPD (isCpo=false): returns national tasks + regional tasks for their region
 *   + site tasks whose store is within their region.
 *
 * @param isCpo         Whether the caller is a Chief Pharmacy Officer.
 * @param userRegion    The RPD's assigned region name (ignored when isCpo=true).
 * @param regionStoreIds Set of store IDs that belong to the RPD's region (ignored when isCpo=true).
 */
export function loadAllCustomTasksForRole(
  isCpo: boolean,
  userRegion?: string,
  regionStoreIds?: Set<string>
): CustomTask[] {
  const all = readCustomTasks();
  if (isCpo) return all;
  return all.filter((t) => {
    // Treat missing/legacy scope as "site" for backward compatibility
    const scope = t.scope ?? "site";
    if (scope === "national") return true;
    if (scope === "regional") return !!userRegion && t.region === userRegion;
    // site
    const id = t.selectedStore || t.siteId;
    return !!regionStoreIds && regionStoreIds.has(id);
  });
}

/** Return every raw completion record (for cross-store tracker view).
 *  Tombstoned (deleted) records are excluded so callers see only active checks. */
export function loadAllCompletionsRaw(): TaskCompletion[] {
  return readCompletions().filter((c) => !c.deleted);
}

// ── Deleted Custom Tasks (soft-delete bin) ────────────────────────────────────

const DELETED_TASKS_KEY = "koheez_deleted_custom_tasks";

export interface DeletedCustomTask extends CustomTask {
  deletedAt: string;
  deletedBy: string;
}

function readDeletedTasks(): DeletedCustomTask[] {
  try {
    const raw = localStorage.getItem(DELETED_TASKS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? (parsed as DeletedCustomTask[]) : [];
  } catch {
    return [];
  }
}

function writeDeletedTasks(tasks: DeletedCustomTask[]): void {
  try {
    localStorage.setItem(DELETED_TASKS_KEY, JSON.stringify(tasks));
  } catch {}
}

/** Move a task from the active list into the deleted-tasks bin. */
export function softDeleteCustomTask(taskId: string, deletedBy: string): void {
  const all = readCustomTasks();
  const task = all.find((t) => t.id === taskId);
  if (!task) return;
  writeCustomTasks(all.filter((t) => t.id !== taskId));
  const existing = readDeletedTasks().filter((t) => t.id !== taskId);
  existing.push({ ...task, deletedAt: new Date().toISOString(), deletedBy });
  writeDeletedTasks(existing);
}

/** Move a task from the deleted bin back into the active list. */
export function reinstateCustomTask(taskId: string): void {
  const all = readDeletedTasks();
  const task = all.find((t) => t.id === taskId);
  if (!task) return;
  writeDeletedTasks(all.filter((t) => t.id !== taskId));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deletedAt: _da, deletedBy: _db, ...restored } = task;
  saveCustomTask(restored);
}

/** Permanently remove a task from the deleted bin. */
export function purgeDeletedTask(taskId: string): void {
  writeDeletedTasks(readDeletedTasks().filter((t) => t.id !== taskId));
}

// ── Task due dates ───────────────────────────────────────────────────────────

/** Task IDs that should display the 22nd of the month as their due date. */
const TWENTY_SECOND_TASKS = new Set(["del-d-011", "del-d-012", "dir-d-003"]);

/**
 * Returns a formatted due-date string for a task, or null if no due date
 * should be shown (e.g. plain daily tasks with no special deadline).
 *
 * Rules:
 *  - del-d-011 (AR Report) and del-d-012 (Not Scanned Report) → 22nd of month
 *  - All other non-daily tasks → last day of the current month
 *  - All other daily tasks and one_time tasks → null (no badge shown)
 */
export function getTaskDueDate(taskId: string, frequency: TaskFrequency, now?: Date): string | null {
  const today = now ?? new Date();
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-indexed

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (TWENTY_SECOND_TASKS.has(taskId)) {
    return fmt(new Date(y, m, 22));
  }

  if (frequency === "daily" || frequency === "one_time") return null;

  // Last day of current month for all other non-daily frequencies.
  return fmt(new Date(y, m + 1, 0));
}

// ── Due-date-driven recurrence engine ──────────────────────────────────────
// Every non-daily task carries a concrete due date (YYYY-MM-DD). Recurring
// tasks (weekly/biweekly/monthly/quarterly/biannual) use that due date as an
// *anchor* — the weekday (weekly/biweekly) or day-of-month (monthly and
// longer) it repeats on — while completions continue to be tracked per
// period (via getPeriodKey) so a task automatically becomes "due again" once
// its next period starts, without ever needing to rewrite storage.

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Biweekly anchor Monday used elsewhere by getPeriodKey. */
const BIWEEKLY_ANCHOR = new Date(2026, 3, 13); // 2026-04-13 (Monday)

function getRecurrencePeriodStart(frequency: TaskFrequency, date: Date): Date {
  const d = toDateOnly(date);
  switch (frequency) {
    case "weekly": {
      const sunday = new Date(d);
      sunday.setDate(d.getDate() - d.getDay());
      return sunday;
    }
    case "biweekly": {
      const diffDays = Math.floor((d.getTime() - BIWEEKLY_ANCHOR.getTime()) / 86400000);
      const periods = Math.floor(diffDays / 14);
      const start = new Date(BIWEEKLY_ANCHOR);
      start.setDate(BIWEEKLY_ANCHOR.getDate() + periods * 14);
      return start;
    }
    case "monthly":
      return new Date(d.getFullYear(), d.getMonth(), 1);
    case "quarterly": {
      const qStartMonth = Math.floor(d.getMonth() / 3) * 3;
      return new Date(d.getFullYear(), qStartMonth, 1);
    }
    case "biannual": {
      const hStartMonth = d.getMonth() < 6 ? 0 : 6;
      return new Date(d.getFullYear(), hStartMonth, 1);
    }
    default:
      return d;
  }
}

/**
 * Returns a sensible default due date (YYYY-MM-DD) for a task of the given
 * frequency, used to prefill the create-task form. Recurring cadences
 * default to the end of the current period; daily/one-time default to today.
 */
export function computeDefaultDueDate(frequency: TaskFrequency, from?: Date): string {
  const today = toDateOnly(from ?? new Date());
  switch (frequency) {
    case "daily":
    case "one_time":
      return formatDateOnly(today);
    case "weekly": {
      const start = getRecurrencePeriodStart("weekly", today);
      return formatDateOnly(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
    }
    case "biweekly": {
      const start = getRecurrencePeriodStart("biweekly", today);
      return formatDateOnly(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 13));
    }
    case "monthly":
      return formatDateOnly(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    case "quarterly": {
      const start = getRecurrencePeriodStart("quarterly", today);
      return formatDateOnly(new Date(start.getFullYear(), start.getMonth() + 3, 0));
    }
    case "biannual": {
      const start = getRecurrencePeriodStart("biannual", today);
      return formatDateOnly(new Date(start.getFullYear(), start.getMonth() + 6, 0));
    }
    case "annual":
      return `${today.getFullYear()}-03-31`;
    default:
      return formatDateOnly(today);
  }
}

/**
 * Effective due date for a task (YYYY-MM-DD): the task's own due date if
 * set, otherwise a computed default. This lets legacy/built-in tasks that
 * predate this feature behave sensibly without hand-editing every record.
 */
export function getEffectiveDueDate(
  task: { dueDate?: string; frequency: TaskFrequency },
  now?: Date
): string {
  return task.dueDate || computeDefaultDueDate(task.frequency, now);
}

/**
 * Computes the date (within the period containing `referenceDate`) that a
 * recurring task's due-date anchor falls on. E.g. a weekly task anchored to
 * "due on Wednesday" resolves to this week's Wednesday.
 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Returns the last Monday–Friday of the given month. */
function computeLastBusinessDay(year: number, month: number): Date {
  let d = new Date(year, month + 1, 0); // last calendar day
  while (d.getDay() === 0 || d.getDay() === 6) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  }
  return d;
}

export function occurrenceDateForPeriod(
  frequency: TaskFrequency,
  anchorDueDate: string,
  referenceDate: Date,
  opts?: { daysOfWeek?: number[]; lastBusinessDayOfMonth?: boolean }
): Date {
  const anchor = toDateOnly(parseDateOnly(anchorDueDate));
  const ref = toDateOnly(referenceDate);
  switch (frequency) {
    case "weekly":
    case "biweekly": {
      // If specific days-of-week are configured, find the most recently passed
      // one in the current period (or the first upcoming if none have passed).
      if (opts?.daysOfWeek && opts.daysOfWeek.length > 0) {
        const periodStart = getRecurrencePeriodStart(frequency, ref);
        let best: Date | null = null;
        for (const dow of opts.daysOfWeek) {
          const offset = (dow - periodStart.getDay() + 7) % 7;
          const candidate = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate() + offset);
          if (candidate.getTime() <= ref.getTime()) {
            if (!best || candidate.getTime() > best.getTime()) best = candidate;
          }
        }
        if (best) return best;
        // All days are still upcoming — return the earliest one
        const periodStart2 = getRecurrencePeriodStart(frequency, ref);
        const sorted = [...opts.daysOfWeek].sort((a, b) => a - b);
        const offset = (sorted[0] - periodStart2.getDay() + 7) % 7;
        return new Date(periodStart2.getFullYear(), periodStart2.getMonth(), periodStart2.getDate() + offset);
      }
      // Weekday-based anchor: fixed-length periods (7 or 14 days), so the
      // anchor's offset-within-period (in days) is stable across periods —
      // apply it to the current reference period's start.
      const anchorPeriodStart = getRecurrencePeriodStart(frequency, anchor);
      const offsetDays = Math.round((anchor.getTime() - anchorPeriodStart.getTime()) / 86400000);
      const refPeriodStart = getRecurrencePeriodStart(frequency, ref);
      return new Date(refPeriodStart.getFullYear(), refPeriodStart.getMonth(), refPeriodStart.getDate() + offsetDays);
    }
    case "monthly": {
      if (opts?.lastBusinessDayOfMonth) {
        return computeLastBusinessDay(ref.getFullYear(), ref.getMonth());
      }
      const monthsDiff = (ref.getFullYear() - anchor.getFullYear()) * 12 + (ref.getMonth() - anchor.getMonth());
      const targetMonthIndex = anchor.getMonth() + monthsDiff;
      const targetYear = anchor.getFullYear() + Math.floor(targetMonthIndex / 12);
      const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
      const day = Math.min(anchor.getDate(), daysInMonth(targetYear, targetMonth));
      return new Date(targetYear, targetMonth, day);
    }
    case "quarterly":
    case "biannual": {
      if (opts?.lastBusinessDayOfMonth) {
        // Last business day of the last month of the current period
        const stepMonths = frequency === "quarterly" ? 3 : 6;
        const periodStart = getRecurrencePeriodStart(frequency, ref);
        const lastMonthOfPeriod = new Date(periodStart.getFullYear(), periodStart.getMonth() + stepMonths - 1, 1);
        return computeLastBusinessDay(lastMonthOfPeriod.getFullYear(), lastMonthOfPeriod.getMonth());
      }
      const stepMonths = frequency === "quarterly" ? 3 : 6;
      const monthsDiff = (ref.getFullYear() - anchor.getFullYear()) * 12 + (ref.getMonth() - anchor.getMonth());
      const periods = Math.floor(monthsDiff / stepMonths);
      const targetMonthIndex = anchor.getMonth() + periods * stepMonths;
      const targetYear = anchor.getFullYear() + Math.floor(targetMonthIndex / 12);
      const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
      const day = Math.min(anchor.getDate(), daysInMonth(targetYear, targetMonth));
      return new Date(targetYear, targetMonth, day);
    }
    default:
      return anchor;
  }
}

/**
 * True when a task should be considered "due" as of `referenceDate` — either
 * its anchor day has arrived for the current period, or it's overdue and
 * still incomplete. `isCompletedForCurrentPeriod` should reflect whether the
 * task has already been completed for whatever period `referenceDate` falls
 * in (daily tasks are always due; one-time tasks never recur).
 */
export function isTaskDueOn(
  task: { dueDate?: string; frequency: TaskFrequency; daysOfWeek?: number[]; lastBusinessDayOfMonth?: boolean },
  referenceDate: Date,
  isCompletedForCurrentPeriod: boolean
): boolean {
  const ref = toDateOnly(referenceDate);
  if (task.frequency === "daily") return true;
  const effectiveDue = getEffectiveDueDate(task, ref);
  const firstDue = parseDateOnly(effectiveDue);
  if (task.frequency === "one_time") {
    if (isCompletedForCurrentPeriod) return false;
    return firstDue.getTime() <= ref.getTime();
  }
  if (task.frequency === "annual") {
    if (isCompletedForCurrentPeriod) return false;
    return ref.getFullYear() >= firstDue.getFullYear();
  }
  // Recurring tasks never surface before their first configured due date —
  // the anchor only starts repeating once its initial occurrence has passed.
  if (ref.getTime() < firstDue.getTime()) return false;
  if (isCompletedForCurrentPeriod) return false;

  // ── daysOfWeek: task is due on any of the specified weekdays each period ──
  if (task.daysOfWeek && task.daysOfWeek.length > 0 &&
      (task.frequency === "weekly" || task.frequency === "biweekly")) {
    const periodStart = getRecurrencePeriodStart(task.frequency, ref);
    for (const dow of task.daysOfWeek) {
      const offset = (dow - periodStart.getDay() + 7) % 7;
      const candidate = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate() + offset);
      if (candidate.getTime() <= ref.getTime()) return true;
    }
    return false;
  }

  // ── lastBusinessDayOfMonth ────────────────────────────────────────────────
  if (task.lastBusinessDayOfMonth && task.frequency === "monthly") {
    const lbd = computeLastBusinessDay(ref.getFullYear(), ref.getMonth());
    return lbd.getTime() <= ref.getTime();
  }

  const occurrence = occurrenceDateForPeriod(task.frequency, effectiveDue, ref, {
    daysOfWeek: task.daysOfWeek,
    lastBusinessDayOfMonth: task.lastBusinessDayOfMonth,
  });
  return occurrence.getTime() <= ref.getTime();
}

// ── Sub-item completions ─────────────────────────────────────────────────────
// Tracks per-day completion state for mini checkboxes within a task.

const SUB_ITEMS_KEY = "koheez_task_sub_items";

export interface SubItemCompletion {
  siteId: string;
  taskId: string;
  item: string;
  date: string; // YYYY-MM-DD
  /** ISO timestamp of last write (check or uncheck); used for LWW server merge. */
  updatedAt?: string;
  /** Tombstone marker: true when this sub-item was unchecked. Filtered out on read. */
  deleted?: boolean;
}

function readSubItems(): SubItemCompletion[] {
  try {
    const raw = localStorage.getItem(SUB_ITEMS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SubItemCompletion[]) : [];
  } catch {
    return [];
  }
}

function writeSubItems(items: SubItemCompletion[]): void {
  try {
    localStorage.setItem(SUB_ITEMS_KEY, JSON.stringify(items));
  } catch {}
}

/** Returns the set of completed sub-item labels for a task on a given date. */
export function loadSubItemCompletions(siteId: string, taskId: string, date: string): Set<string> {
  return new Set(
    readSubItems()
      .filter((s) => !s.deleted && s.siteId === siteId && s.taskId === taskId && s.date === date)
      .map((s) => s.item)
  );
}

/** Toggle a sub-item on/off for a task on a given date. */
export function toggleSubItemCompletion(siteId: string, taskId: string, item: string, date: string): boolean {
  const all = readSubItems();
  const now = new Date().toISOString();
  // Only treat non-deleted records as "currently checked".
  const activeIdx = all.findIndex(
    (s) => !s.deleted && s.siteId === siteId && s.taskId === taskId && s.item === item && s.date === date
  );
  if (activeIdx >= 0) {
    // Currently checked → uncheck: replace with tombstone so the LWW merge
    // on the server propagates the deletion even against an older checked copy.
    const existing = all[activeIdx];
    all.splice(activeIdx, 1, { ...existing, deleted: true, updatedAt: now });
    writeSubItems(all);
    return false;
  }
  // Currently unchecked → check: remove any existing tombstone for this key
  // (re-check after uncheck) then push a fresh active record.
  const tombstoneIdx = all.findIndex(
    (s) => s.siteId === siteId && s.taskId === taskId && s.item === item && s.date === date
  );
  if (tombstoneIdx >= 0) all.splice(tombstoneIdx, 1);
  all.push({ siteId, taskId, item, date, updatedAt: now });
  writeSubItems(all);
  return true;
}

/** Load deleted tasks with the same role-based filtering used for active tasks. */
export function loadDeletedCustomTasksForRole(
  isCpo: boolean,
  userRegion?: string,
  regionStoreIds?: Set<string>
): DeletedCustomTask[] {
  const all = readDeletedTasks();
  if (isCpo) return all;
  return all.filter((t) => {
    const scope = t.scope ?? "site";
    if (scope === "national") return true;
    if (scope === "regional") return !!userRegion && t.region === userRegion;
    const id = t.selectedStore || t.siteId;
    return !!regionStoreIds && regionStoreIds.has(id);
  });
}

// ── Task Spreadsheet Forms (Excel import → editable form) ───────────────────
// A directors-uploaded .xlsx file attached to a task is parsed client-side
// into plain sheets/headers/rows and stored here so it can be reopened,
// edited inline, and re-exported as PDF/CSV/Excel later.

export type SpreadsheetCellType = "text" | "number" | "date";

export interface SpreadsheetSheet {
  name: string;
  headers: string[];
  /** Best-guess type per column, used only to format inputs — values are
   *  always stored as strings so editing never loses precision/formatting. */
  columnTypes: SpreadsheetCellType[];
  /** rows[i][j] corresponds to headers[j] */
  rows: string[][];
}

export interface TaskSpreadsheetForm {
  taskId: string;
  siteId: string;
  fileName: string;
  sheets: SpreadsheetSheet[];
  uploadedAt: string;
  updatedAt: string;
  uploadedBy: string;
}

const SPREADSHEET_FORMS_KEY = "koheez_task_spreadsheets";

function readSpreadsheetForms(): TaskSpreadsheetForm[] {
  try {
    const raw = localStorage.getItem(SPREADSHEET_FORMS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as TaskSpreadsheetForm[]) : [];
  } catch {
    return [];
  }
}

function writeSpreadsheetForms(forms: TaskSpreadsheetForm[]): void {
  try {
    localStorage.setItem(SPREADSHEET_FORMS_KEY, JSON.stringify(forms));
  } catch { /* ignore quota errors */ }
}

export function loadSpreadsheetForm(taskId: string, siteId: string): TaskSpreadsheetForm | null {
  return readSpreadsheetForms().find((f) => f.taskId === taskId && f.siteId === siteId) ?? null;
}

export function saveSpreadsheetForm(form: TaskSpreadsheetForm): void {
  const all = readSpreadsheetForms().filter(
    (f) => !(f.taskId === form.taskId && f.siteId === form.siteId)
  );
  all.push({ ...form, updatedAt: new Date().toISOString() });
  writeSpreadsheetForms(all);
}

export function deleteSpreadsheetForm(taskId: string, siteId: string): void {
  writeSpreadsheetForms(
    readSpreadsheetForms().filter((f) => !(f.taskId === taskId && f.siteId === siteId))
  );
}

export function hasSpreadsheetForm(taskId: string, siteId: string): boolean {
  return readSpreadsheetForms().some((f) => f.taskId === taskId && f.siteId === siteId);
}

/** Returns the set of task ids (for a given site) that have an attached spreadsheet form. */
export function loadSpreadsheetFormTaskIds(siteId: string): Set<string> {
  return new Set(
    readSpreadsheetForms().filter((f) => f.siteId === siteId).map((f) => f.taskId)
  );
}

// ── Due-today summaries (used by the Schedule Assistant chat) ──────────────

export interface DueTaskSummary {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  frequency: TaskFrequency;
  taskGroup: string;
  dueDate: string;
  isUrgent?: boolean;
  isOverdue: boolean;
}

/**
 * Returns every task (built-in + custom) assigned to `role` that is due on
 * `date` — i.e. daily tasks, plus any non-daily task whose recurrence has
 * reached its current period (or is overdue and still incomplete), mirroring
 * the Daily queue merge logic used in TaskManager.
 */
export function getDueTasksForToday(
  role: TaskRole | string,
  siteId: string,
  region: string | undefined,
  date: Date = new Date()
): DueTaskSummary[] {
  const builtIn = TASKS.filter((t) => !t.hidden && taskRoleMatches(t.role, role as string));
  const custom = loadCustomTasks(siteId, region).filter((t) => taskRoleMatches(t.role, role as string));
  const all: PharmacyTask[] = [...builtIn, ...custom];
  const completionsByFreq = new Map<TaskFrequency, Set<string>>();
  const ref = toDateOnly(date);
  const result: DueTaskSummary[] = [];
  for (const t of all) {
    if (!completionsByFreq.has(t.frequency)) {
      completionsByFreq.set(t.frequency, loadCompletions(siteId, t.frequency, undefined, date));
    }
    const completed = completionsByFreq.get(t.frequency)!.has(t.id);
    if (!isTaskDueOn(t, date, completed)) continue;
    const effectiveDue = getEffectiveDueDate(t, date);
    result.push({
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      frequency: t.frequency,
      taskGroup: t.taskGroup,
      dueDate: effectiveDue,
      isUrgent: t.isUrgent,
      isOverdue: t.frequency !== "daily" && parseDateOnly(effectiveDue).getTime() < ref.getTime(),
    });
  }
  return result;
}
