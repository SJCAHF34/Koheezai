import type { TaskFrequency, TaskRole, TaskCategory } from "./taskData";

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
  if (frequency === "one_time") return "one-time";
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

/**
 * Returns all daily completions for a site across all dates, grouped by
 * YYYY-MM-DD date string. Used by the director history calendar.
 * When siteId is "ALL", returns completions across every site.
 */
export function loadSiteCompletions(
  siteId: string
): Record<string, TaskCompletion[]> {
  const all = readCompletions();
  const filtered = siteId === "ALL" ? all : all.filter((c) => c.siteId === siteId);
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
    return raw ? (JSON.parse(raw) as UrgentTask[]) : [];
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
  const all = readHandoffNotes().filter(
    (n) => !(n.siteId === note.siteId && n.forDate === note.forDate && (n.forRole || "all") === forRole)
  );
  all.push({ ...note, forRole });
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
    return raw ? (JSON.parse(raw) as WorkbookRecord[]) : [];
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
    return raw ? (JSON.parse(raw) as RetentionRiskEntry[]) : [];
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

export interface StaffMember {
  id: string;
  name: string;
  roles: string[];
}

export interface SiteRoster {
  siteId: string;
  members: StaffMember[];
}

function readRosters(): SiteRoster[] {
  try {
    const raw = localStorage.getItem(STAFF_ROSTER_KEY);
    return raw ? (JSON.parse(raw) as SiteRoster[]) : [];
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

const CQI_MEETINGS_KEY = "koheez_cqi_meetings";

export interface CQIAttendee {
  id: string;
  userEmail: string;
  printName: string;
  signatureName: string;
  role: string;
  signedAt: string;
}

export interface CQIMeetingRecord {
  siteId: string;
  quarter: string;
  pharmacyLocation: string;
  pic: string;
  selectedQuarter: "Q1" | "Q2" | "Q3" | "Q4" | "Other" | "";
  otherDate: string;
  safetyChecks: {
    fireExtinguisher: boolean;
    smokeDetector: boolean;
    evacuationPlan: boolean;
  };
  agendaItems: {
    regulatoryUpdates: boolean;
    workflowUpdates: boolean;
    qreIssues: boolean;
    policyUpdates: boolean;
    qmcMeetingMinutes: boolean;
  };
  qreIssues: string;
  actionPlan: string;
  attendees: CQIAttendee[];
  status: "not_started" | "in_progress" | "submitted";
  lastUpdatedAt: string;
  submittedBy?: string;
  submittedAt?: string;
}

function readCQIMeetings(): CQIMeetingRecord[] {
  try {
    const raw = localStorage.getItem(CQI_MEETINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function loadCQIMeeting(siteId: string, quarter: string): CQIMeetingRecord | null {
  return readCQIMeetings().find((r) => r.siteId === siteId && r.quarter === quarter) ?? null;
}

export function saveCQIMeeting(record: CQIMeetingRecord): void {
  try {
    const all = readCQIMeetings().filter(
      (r) => !(r.siteId === record.siteId && r.quarter === record.quarter)
    );
    all.push({ ...record, lastUpdatedAt: new Date().toISOString() });
    localStorage.setItem(CQI_MEETINGS_KEY, JSON.stringify(all));
  } catch {}
}

// ── Roster ──────────────────────────────────────────────────────────────────

export function loadRoster(siteId: string): SiteRoster {
  return readRosters().find((r) => r.siteId === siteId) ?? DEFAULT_ROSTERS[siteId] ?? { siteId, members: [] };
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

/** A foundation-wide document record: template info + optional URL set by CPO/RPD */
export interface FoundationDocRecord {
  id: string;
  itemId: string;
  label: string;
  description: string;
  url: string;
  addedBy: string;
  addedAt: string;
}

/** A store-specific document record attached by a Pharmacy Director */
export interface StoreDocRecord {
  id: string;
  siteId: string;
  itemId: string;
  label: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

function readFoundationDocs(): FoundationDocRecord[] {
  try {
    const raw = localStorage.getItem(FOUNDATION_DOCS_KEY);
    return raw ? (JSON.parse(raw) as FoundationDocRecord[]) : [];
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

/** Validate URL scheme as http(s) only. Returns false for javascript:, data:, etc. */
function isHttpUrlFd(url: string): boolean {
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
    return raw ? (JSON.parse(raw) as StoreDocRecord[]) : [];
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

/** Validate URL scheme as http(s) only. Returns false for javascript:, data:, etc. */
function isHttpUrl(url: string): boolean {
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
    return raw ? (JSON.parse(raw) as TaskCounterEntry[]) : [];
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
}

function readCustomTasks(): CustomTask[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TASKS_KEY);
    return raw ? (JSON.parse(raw) as CustomTask[]) : [];
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
