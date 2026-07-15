import {
  type RetentionPatient,
  type PharmacyHours,
  type StaffScheduleDefault,
  type ScheduleEntry,
  type ScheduleSubmission,
  type AppNotification,
  type QaAuditWorkbook,
  type UpsertQaAuditWorkbook,
  type QaAuditTask,
  type AuditLogEntry,
  type CQIMeetingRecord,
  type CQIAttendee,
  type UpsertCqiMeeting,
  type CqiMeetingSummary,
  type StaffTimeOffBalance,
} from "@shared/schema";
import {
  cqiMeetingsTable,
  auditLogsTable,
  retentionPatientsTable,
  pharmacyHoursTable,
  staffScheduleDefaultsTable,
  staffTimeOffBalancesTable,
  scheduleEntriesTable,
  scheduleSubmissionsTable,
  notificationsTable,
  qaWorkbooksTable,
  qaEvidenceTable,
  qaTasksTable,
  clientStoreTable,
  adpWorkerMappingsTable,
  adpSyncStatusTable,
  adpSyncHistoryTable,
  type AdpWorkerMapping,
  type AdpSyncStatus,
  type AdpSyncHistoryEntry,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "./db";

// File-backed persistence for QA Audit data so workbooks, evidence and
// follow-up tasks survive process restarts. Stored as JSON next to the
// project root in `.local/qa-audit-state.json`. Evidence buffers are
// base64-encoded for serialization. (Postgres migration is tracked as
// follow-up task #62.)
const QA_PERSIST_PATH = resolve(process.cwd(), ".local", "qa-audit-state.json");
interface QaPersistShape {
  workbooks: Array<[string, QaAuditWorkbook]>;
  evidence: Array<[string, Omit<QaAuditEvidenceFile, "data"> & { dataB64: string }]>;
  tasks: Array<[string, QaAuditTask]>;
}

// File-backed persistence for the HIPAA access audit log so entries survive
// process restarts. Kept as a flat JSON array, capped to the most recent
// AUDIT_LOG_CAP entries to bound file size.
const AUDIT_PERSIST_PATH = resolve(process.cwd(), ".local", "audit-log-state.json");
const AUDIT_LOG_CAP = 10000;

// File-backed persistence for CQI-QRE quarterly meeting records so they survive
// process restarts and are shared across every user at a site.
const CQI_PERSIST_PATH = resolve(process.cwd(), ".local", "cqi-meeting-state.json");

export interface QaAuditEvidenceFile {
  id: string;
  fileName: string;
  fileType: string;
  uploadedBy: string;
  uploadedAt: string;
  siteId: string;
  year: string;
  data: Buffer;
}

export interface User {
  id: string;
  username: string;
  password: string;
}

export type InsertUser = Omit<User, "id">;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getPatients(siteId: string): Promise<RetentionPatient[]>;
  getPatient(id: string): Promise<RetentionPatient | undefined>;
  getAllActivePatients(): Promise<RetentionPatient[]>;
  addPatient(p: Omit<RetentionPatient, "id">): Promise<RetentionPatient>;
  updatePatient(p: RetentionPatient): Promise<RetentionPatient>;
  deletePatient(id: string): Promise<void>;

  // ── Scheduling ─────────────────────────────────────────────────────────
  getPharmacyHours(siteId: string): Promise<PharmacyHours | undefined>;
  upsertPharmacyHours(h: Omit<PharmacyHours, "updatedAt">): Promise<PharmacyHours>;

  getStaffScheduleDefaults(siteId: string): Promise<StaffScheduleDefault[]>;
  upsertStaffScheduleDefault(
    d: Omit<StaffScheduleDefault, "updatedAt">,
  ): Promise<StaffScheduleDefault>;
  deleteStaffScheduleDefault(siteId: string, staffId: string): Promise<void>;

  getScheduleEntries(
    siteId: string,
    fromDate: string,
    toDate: string,
  ): Promise<ScheduleEntry[]>;
  upsertScheduleEntry(
    e: Omit<ScheduleEntry, "id" | "updatedAt">,
  ): Promise<ScheduleEntry>;
  deleteScheduleEntry(
    siteId: string,
    staffId: string,
    date: string,
  ): Promise<void>;

  // ── Time-Off Balances ─────────────────────────────────────────────────
  getTimeOffBalances(siteId: string, year: number): Promise<StaffTimeOffBalance[]>;
  upsertTimeOffBalance(b: Omit<StaffTimeOffBalance, "updatedAt">): Promise<StaffTimeOffBalance>;

  // ── Schedule Submissions & Notifications ──────────────────────────────
  createScheduleSubmission(
    s: Omit<ScheduleSubmission, "id" | "submittedAt" | "status">,
  ): Promise<ScheduleSubmission>;
  getScheduleSubmission(id: string): Promise<ScheduleSubmission | undefined>;
  getScheduleSubmissionsForSite(siteId: string): Promise<ScheduleSubmission[]>;
  getScheduleSubmissionsForRegion(region: string): Promise<ScheduleSubmission[]>;
  getLatestSubmissionForWeek(
    siteId: string,
    weekStart: string,
  ): Promise<ScheduleSubmission | undefined>;
  reviewScheduleSubmission(
    id: string,
    status: "approved" | "changes_requested",
    reviewer: { email: string; name: string },
    note?: string,
  ): Promise<ScheduleSubmission | undefined>;

  addNotification(
    n: Omit<AppNotification, "id" | "createdAt" | "read">,
  ): Promise<AppNotification>;
  getNotifications(toEmail: string): Promise<AppNotification[]>;
  markNotificationRead(id: string, toEmail: string): Promise<void>;
  markAllNotificationsRead(toEmail: string): Promise<void>;

  // ── QA Audit Workbooks ────────────────────────────────────────────────
  listQaAuditWorkbooks(year?: string): Promise<QaAuditWorkbook[]>;
  getQaAuditWorkbook(siteId: string, year: string): Promise<QaAuditWorkbook | undefined>;
  upsertQaAuditWorkbook(
    data: UpsertQaAuditWorkbook,
    user: { email: string; name: string },
  ): Promise<QaAuditWorkbook>;
  submitQaAuditWorkbook(
    siteId: string,
    year: string,
    user: { email: string; name: string },
  ): Promise<QaAuditWorkbook | undefined>;
  addQaAuditEvidence(
    file: Omit<QaAuditEvidenceFile, "id" | "uploadedAt">,
  ): Promise<QaAuditEvidenceFile>;
  getQaAuditEvidence(id: string): Promise<QaAuditEvidenceFile | undefined>;

  addQaAuditTask(t: Omit<QaAuditTask, "id" | "createdAt">): Promise<QaAuditTask>;
  listQaAuditTasksForUser(email: string): Promise<QaAuditTask[]>;
  getQaAuditTask(id: string): Promise<QaAuditTask | undefined>;
  completeQaAuditTask(id: string, user: { email: string; name: string }): Promise<QaAuditTask | undefined>;
  setQaAuditResponseTaskId(siteId: string, year: string, itemId: string, taskId: string): Promise<void>;

  // ── CQI-QRE Quarterly Meetings ─────────────────────────────────────────
  getCqiMeeting(siteId: string, quarter: string): Promise<CQIMeetingRecord | undefined>;
  listCqiMeetings(siteId: string): Promise<CqiMeetingSummary[]>;
  upsertCqiMeeting(
    data: UpsertCqiMeeting,
    user: { email: string; name: string },
  ): Promise<CQIMeetingRecord>;
  signCqiMeeting(
    siteId: string,
    quarter: string,
    attendee: Omit<CQIAttendee, "id" | "signedAt">,
    base: { siteName?: string; pharmacyLocation?: string },
  ): Promise<CQIMeetingRecord>;

  // ── Access audit log (HIPAA) ───────────────────────────────────────────
  addAuditLog(entry: Omit<AuditLogEntry, "id">): Promise<AuditLogEntry>;
  listAuditLogs(limit?: number): Promise<AuditLogEntry[]>;

  // ── Client store (server-side backing for browser localStorage) ────────
  getClientStores(siteId: string): Promise<Array<{ storeKey: string; value: unknown; updatedAt: string }>>;
  setClientStore(siteId: string, storeKey: string, value: unknown): Promise<void>;

  // ── ADP Workforce Now integration ─────────────────────────────────────
  getAdpWorkerMappings(siteId: string): Promise<AdpWorkerMapping[]>;
  upsertAdpWorkerMapping(m: Omit<AdpWorkerMapping, "updatedAt">): Promise<AdpWorkerMapping>;
  deleteAdpWorkerMapping(siteId: string, adpWorkerId: string): Promise<void>;
  getAdpSyncStatus(siteId: string): Promise<AdpSyncStatus | undefined>;
  setAdpSyncStatus(siteId: string, status: Omit<AdpSyncStatus, "updatedAt">): Promise<AdpSyncStatus>;
  getAdpMappedSiteIds(): Promise<string[]>;
  addAdpSyncHistory(entry: Omit<AdpSyncHistoryEntry, "id">): Promise<AdpSyncHistoryEntry>;
  getAdpSyncHistory(siteId: string, limit?: number): Promise<AdpSyncHistoryEntry[]>;
}

function entryKey(siteId: string, staffId: string, date: string) {
  return `${siteId}|${staffId}|${date}`;
}
function defaultKey(siteId: string, staffId: string) {
  return `${siteId}|${staffId}`;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private patients: Map<string, RetentionPatient>;
  private hours: Map<string, PharmacyHours>;
  private scheduleDefaults: Map<string, StaffScheduleDefault>;
  private scheduleEntries: Map<string, ScheduleEntry>;
  private submissions: Map<string, ScheduleSubmission>;
  private notifications: Map<string, AppNotification>;
  private qaAuditWorkbooks: Map<string, QaAuditWorkbook>;
  private qaAuditEvidence: Map<string, QaAuditEvidenceFile>;
  private qaAuditTasks: Map<string, QaAuditTask>;
  private cqiMeetings: Map<string, CQIMeetingRecord>;
  private auditLogs: AuditLogEntry[];
  private clientStores: Map<string, { value: unknown; updatedAt: string }>;
  private timeOffBalances: Map<string, StaffTimeOffBalance>;

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.hours = new Map();
    this.scheduleDefaults = new Map();
    this.scheduleEntries = new Map();
    this.submissions = new Map();
    this.timeOffBalances = new Map();
    this.notifications = new Map();
    this.qaAuditWorkbooks = new Map();
    this.qaAuditEvidence = new Map();
    this.qaAuditTasks = new Map();
    this.cqiMeetings = new Map();
    this.auditLogs = [];
    this.clientStores = new Map();
    this.loadQaPersistedState();
    this.loadAuditPersistedState();
    this.loadCqiPersistedState();
    this.seedSchedulingExamples();
  }

  // ── Access audit log persistence ─────────────────────────────────────────
  private loadAuditPersistedState(): void {
    try {
      if (!existsSync(AUDIT_PERSIST_PATH)) return;
      const raw = readFileSync(AUDIT_PERSIST_PATH, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) this.auditLogs = data as AuditLogEntry[];
    } catch (err) {
      console.warn("[audit-log] failed to load persisted state:", err);
    }
  }

  private persistAuditState(): void {
    try {
      const dir = dirname(AUDIT_PERSIST_PATH);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(AUDIT_PERSIST_PATH, JSON.stringify(this.auditLogs));
    } catch (err) {
      console.warn("[audit-log] failed to persist state:", err);
    }
  }

  async addAuditLog(entry: Omit<AuditLogEntry, "id">): Promise<AuditLogEntry> {
    const full: AuditLogEntry = { id: randomUUID(), ...entry };
    this.auditLogs.push(full);
    if (this.auditLogs.length > AUDIT_LOG_CAP) {
      this.auditLogs = this.auditLogs.slice(-AUDIT_LOG_CAP);
    }
    this.persistAuditState();
    return full;
  }

  async listAuditLogs(limit = 500): Promise<AuditLogEntry[]> {
    // Most recent first.
    return this.auditLogs.slice(-limit).reverse();
  }

  // Tiny first-load seed for site 1417 so the page isn't empty on first visit.
  private seedSchedulingExamples() {
    const now = new Date().toISOString();
    this.hours.set("1417", {
      siteId: "1417",
      weekdays: [
        null, // Sun closed
        { open: "08:00", close: "18:00" }, // Mon
        { open: "08:00", close: "18:00" }, // Tue
        { open: "08:00", close: "18:00" }, // Wed
        { open: "08:00", close: "18:00" }, // Thu
        { open: "08:00", close: "18:00" }, // Fri
        null, // Sat closed
      ],
      holidayClosures: [],
      updatedAt: now,
    });
    this.hours.set("1310", {
      siteId: "1310",
      weekdays: [
        null, // Sun closed
        { open: "08:30", close: "17:30" }, // Mon
        { open: "08:30", close: "17:30" }, // Tue
        { open: "08:30", close: "17:30" }, // Wed
        { open: "08:30", close: "17:30" }, // Thu
        { open: "08:30", close: "17:30" }, // Fri
        null, // Sat closed
      ],
      holidayClosures: [],
      updatedAt: now,
    });
    const seedDefault = (
      staffId: string,
      staffName: string,
      shift: { start: string; end: string },
    ) => {
      this.scheduleDefaults.set(defaultKey("1417", staffId), {
        siteId: "1417",
        staffId,
        staffName,
        weekdays: [
          null,
          shift,
          shift,
          shift,
          shift,
          shift,
          null,
        ],
        updatedAt: now,
      });
    };
    seedDefault("s1417-001", "Seth Collins", { start: "09:00", end: "17:00" });
    seedDefault("s1417-002", "Debbie Nguyen", { start: "08:00", end: "16:00" });
    seedDefault("s1417-005", "Anh Do", { start: "08:00", end: "16:00" });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getPatients(siteId: string): Promise<RetentionPatient[]> {
    return Array.from(this.patients.values()).filter((p) => p.siteId === siteId);
  }

  async getPatient(id: string): Promise<RetentionPatient | undefined> {
    return this.patients.get(id);
  }

  async getAllActivePatients(): Promise<RetentionPatient[]> {
    return Array.from(this.patients.values()).filter(
      (p) => p.sequenceActive && !p.outreachComplete && p.status === "active"
    );
  }

  async addPatient(p: Omit<RetentionPatient, "id">): Promise<RetentionPatient> {
    const id = `rp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const patient: RetentionPatient = { ...p, id };
    this.patients.set(id, patient);
    return patient;
  }

  async updatePatient(p: RetentionPatient): Promise<RetentionPatient> {
    this.patients.set(p.id, p);
    return p;
  }

  async deletePatient(id: string): Promise<void> {
    this.patients.delete(id);
  }

  // ── Scheduling ─────────────────────────────────────────────────────────

  async getPharmacyHours(siteId: string): Promise<PharmacyHours | undefined> {
    return this.hours.get(siteId);
  }

  async upsertPharmacyHours(
    h: Omit<PharmacyHours, "updatedAt">,
  ): Promise<PharmacyHours> {
    const record: PharmacyHours = { ...h, updatedAt: new Date().toISOString() };
    this.hours.set(h.siteId, record);
    return record;
  }

  async getStaffScheduleDefaults(
    siteId: string,
  ): Promise<StaffScheduleDefault[]> {
    return Array.from(this.scheduleDefaults.values()).filter(
      (d) => d.siteId === siteId,
    );
  }

  async upsertStaffScheduleDefault(
    d: Omit<StaffScheduleDefault, "updatedAt">,
  ): Promise<StaffScheduleDefault> {
    const record: StaffScheduleDefault = {
      ...d,
      updatedAt: new Date().toISOString(),
    };
    this.scheduleDefaults.set(defaultKey(d.siteId, d.staffId), record);
    return record;
  }

  async deleteStaffScheduleDefault(
    siteId: string,
    staffId: string,
  ): Promise<void> {
    this.scheduleDefaults.delete(defaultKey(siteId, staffId));
  }

  async getScheduleEntries(
    siteId: string,
    fromDate: string,
    toDate: string,
  ): Promise<ScheduleEntry[]> {
    // Include multi-day entries that START before fromDate but END within or beyond it.
    return Array.from(this.scheduleEntries.values()).filter(
      (e) =>
        e.siteId === siteId &&
        e.date <= toDate &&
        (e.endDate ?? e.date) >= fromDate,
    );
  }

  async upsertScheduleEntry(
    e: Omit<ScheduleEntry, "id" | "updatedAt">,
  ): Promise<ScheduleEntry> {
    const id = entryKey(e.siteId, e.staffId, e.date);
    const record: ScheduleEntry = {
      ...e,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.scheduleEntries.set(id, record);
    return record;
  }

  async deleteScheduleEntry(
    siteId: string,
    staffId: string,
    date: string,
  ): Promise<void> {
    this.scheduleEntries.delete(entryKey(siteId, staffId, date));
  }

  // ── Time-Off Balances ─────────────────────────────────────────────────

  async getTimeOffBalances(siteId: string, year: number): Promise<StaffTimeOffBalance[]> {
    const yearStr = String(year);
    return Array.from(this.timeOffBalances.values()).filter(
      (b) => b.siteId === siteId && b.year === year,
    );
  }

  async upsertTimeOffBalance(b: Omit<StaffTimeOffBalance, "updatedAt">): Promise<StaffTimeOffBalance> {
    const key = `${b.siteId}|${b.staffId}|${b.year}`;
    const record: StaffTimeOffBalance = { ...b, updatedAt: new Date().toISOString() };
    this.timeOffBalances.set(key, record);
    return record;
  }

  // ── Schedule Submissions ─────────────────────────────────────────────

  async createScheduleSubmission(
    s: Omit<ScheduleSubmission, "id" | "submittedAt" | "status">,
  ): Promise<ScheduleSubmission> {
    const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record: ScheduleSubmission = {
      ...s,
      id,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
    this.submissions.set(id, record);
    return record;
  }

  async getScheduleSubmission(id: string): Promise<ScheduleSubmission | undefined> {
    return this.submissions.get(id);
  }

  async getScheduleSubmissionsForSite(siteId: string): Promise<ScheduleSubmission[]> {
    return Array.from(this.submissions.values())
      .filter((s) => s.siteId === siteId)
      .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  }

  async getScheduleSubmissionsForRegion(region: string): Promise<ScheduleSubmission[]> {
    return Array.from(this.submissions.values())
      .filter((s) => s.region === region)
      .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  }

  async getLatestSubmissionForWeek(
    siteId: string,
    weekStart: string,
  ): Promise<ScheduleSubmission | undefined> {
    return Array.from(this.submissions.values())
      .filter((s) => s.siteId === siteId && s.weekStart === weekStart)
      .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))[0];
  }

  async reviewScheduleSubmission(
    id: string,
    status: "approved" | "changes_requested",
    reviewer: { email: string; name: string },
    note?: string,
  ): Promise<ScheduleSubmission | undefined> {
    const existing = this.submissions.get(id);
    if (!existing) return undefined;
    const updated: ScheduleSubmission = {
      ...existing,
      status,
      reviewedByEmail: reviewer.email,
      reviewedByName: reviewer.name,
      reviewedAt: new Date().toISOString(),
      reviewNote: note,
    };
    this.submissions.set(id, updated);
    return updated;
  }

  // ── Notifications ────────────────────────────────────────────────────

  async addNotification(
    n: Omit<AppNotification, "id" | "createdAt" | "read">,
  ): Promise<AppNotification> {
    const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record: AppNotification = {
      ...n,
      id,
      createdAt: new Date().toISOString(),
      read: false,
    };
    this.notifications.set(id, record);
    return record;
  }

  async getNotifications(toEmail: string): Promise<AppNotification[]> {
    const lc = toEmail.toLowerCase();
    return Array.from(this.notifications.values())
      .filter((n) => n.toEmail.toLowerCase() === lc)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async markNotificationRead(id: string, toEmail: string): Promise<void> {
    const n = this.notifications.get(id);
    if (n && n.toEmail.toLowerCase() === toEmail.toLowerCase()) {
      this.notifications.set(id, { ...n, read: true });
    }
  }

  async markAllNotificationsRead(toEmail: string): Promise<void> {
    const lc = toEmail.toLowerCase();
    for (const [id, n] of Array.from(this.notifications.entries())) {
      if (n.toEmail.toLowerCase() === lc && !n.read) {
        this.notifications.set(id, { ...n, read: true });
      }
    }
  }

  // ── QA Audit Workbooks ────────────────────────────────────────────────

  async listQaAuditWorkbooks(year?: string): Promise<QaAuditWorkbook[]> {
    const all = Array.from(this.qaAuditWorkbooks.values());
    return year ? all.filter((w) => w.year === year) : all;
  }

  async getQaAuditWorkbook(siteId: string, year: string): Promise<QaAuditWorkbook | undefined> {
    return this.qaAuditWorkbooks.get(`${siteId}|${year}`);
  }

  async upsertQaAuditWorkbook(
    data: UpsertQaAuditWorkbook,
    user: { email: string; name: string },
  ): Promise<QaAuditWorkbook> {
    const key = `${data.siteId}|${data.year}`;
    const existing = this.qaAuditWorkbooks.get(key);
    if (existing && existing.status === "submitted") {
      return existing;
    }
    const reviewed = data.responses.filter((r) => !!r.status).length;
    const status =
      reviewed === 0 ? "not_started" : "in_progress";
    const now = new Date().toISOString();
    const record: QaAuditWorkbook = {
      siteId: data.siteId,
      siteName: data.siteName,
      region: data.region ?? "",
      year: data.year,
      responses: data.responses,
      status,
      submittedByEmail: existing?.submittedByEmail,
      submittedByName: existing?.submittedByName,
      submittedAt: existing?.submittedAt,
      lastUpdatedAt: now,
      lastUpdatedByEmail: user.email,
      lastUpdatedByName: user.name,
    };
    this.qaAuditWorkbooks.set(key, record);
    this.persistQaState();
    return record;
  }

  async submitQaAuditWorkbook(
    siteId: string,
    year: string,
    user: { email: string; name: string },
  ): Promise<QaAuditWorkbook | undefined> {
    const key = `${siteId}|${year}`;
    const existing = this.qaAuditWorkbooks.get(key);
    if (!existing) return undefined;
    const now = new Date().toISOString();
    const updated: QaAuditWorkbook = {
      ...existing,
      status: "submitted",
      submittedByEmail: user.email,
      submittedByName: user.name,
      submittedAt: now,
      lastUpdatedAt: now,
      lastUpdatedByEmail: user.email,
      lastUpdatedByName: user.name,
    };
    this.qaAuditWorkbooks.set(key, updated);
    this.persistQaState();
    return updated;
  }

  async addQaAuditEvidence(
    file: Omit<QaAuditEvidenceFile, "id" | "uploadedAt">,
  ): Promise<QaAuditEvidenceFile> {
    const id = `qae-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record: QaAuditEvidenceFile = {
      ...file,
      id,
      uploadedAt: new Date().toISOString(),
    };
    this.qaAuditEvidence.set(id, record);
    this.persistQaState();
    return record;
  }

  async getQaAuditEvidence(id: string): Promise<QaAuditEvidenceFile | undefined> {
    return this.qaAuditEvidence.get(id);
  }

  async addQaAuditTask(
    t: Omit<QaAuditTask, "id" | "createdAt">,
  ): Promise<QaAuditTask> {
    const id = `qat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record: QaAuditTask = { ...t, id, createdAt: new Date().toISOString() };
    this.qaAuditTasks.set(id, record);
    this.persistQaState();
    return record;
  }

  async listQaAuditTasksForUser(email: string): Promise<QaAuditTask[]> {
    const lc = email.toLowerCase();
    return Array.from(this.qaAuditTasks.values())
      .filter((t) => t.assignedToEmail.toLowerCase() === lc)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async getQaAuditTask(id: string): Promise<QaAuditTask | undefined> {
    return this.qaAuditTasks.get(id);
  }

  async completeQaAuditTask(
    id: string,
    user: { email: string; name: string },
  ): Promise<QaAuditTask | undefined> {
    const t = this.qaAuditTasks.get(id);
    if (!t) return undefined;
    const updated: QaAuditTask = {
      ...t,
      completedAt: new Date().toISOString(),
      completedByEmail: user.email,
    };
    this.qaAuditTasks.set(id, updated);
    this.persistQaState();
    return updated;
  }

  private loadQaPersistedState(): void {
    try {
      if (!existsSync(QA_PERSIST_PATH)) return;
      const raw = readFileSync(QA_PERSIST_PATH, "utf-8");
      const data = JSON.parse(raw) as Partial<QaPersistShape>;
      if (data.workbooks) {
        for (const [k, v] of data.workbooks) this.qaAuditWorkbooks.set(k, v);
      }
      if (data.evidence) {
        for (const [k, v] of data.evidence) {
          const { dataB64, ...rest } = v as any;
          this.qaAuditEvidence.set(k, { ...rest, data: Buffer.from(dataB64, "base64") });
        }
      }
      if (data.tasks) {
        for (const [k, v] of data.tasks) this.qaAuditTasks.set(k, v);
      }
    } catch (err) {
      console.warn("[qa-audit] failed to load persisted state:", err);
    }
  }

  private persistQaState(): void {
    try {
      const dir = dirname(QA_PERSIST_PATH);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const shape: QaPersistShape = {
        workbooks: Array.from(this.qaAuditWorkbooks.entries()),
        evidence: Array.from(this.qaAuditEvidence.entries()).map(([k, v]) => [
          k,
          {
            id: v.id,
            fileName: v.fileName,
            fileType: v.fileType,
            uploadedBy: v.uploadedBy,
            uploadedAt: v.uploadedAt,
            siteId: v.siteId,
            year: v.year,
            dataB64: v.data.toString("base64"),
          },
        ]),
        tasks: Array.from(this.qaAuditTasks.entries()),
      };
      writeFileSync(QA_PERSIST_PATH, JSON.stringify(shape));
    } catch (err) {
      console.warn("[qa-audit] failed to persist state:", err);
    }
  }

  async setQaAuditResponseTaskId(
    siteId: string,
    year: string,
    itemId: string,
    taskId: string,
  ): Promise<void> {
    const key = `${siteId}|${year}`;
    const wb = this.qaAuditWorkbooks.get(key);
    if (!wb) return;
    const responses = wb.responses.map((r) =>
      r.itemId === itemId ? { ...r, taskCreatedId: taskId } : r,
    );
    this.qaAuditWorkbooks.set(key, {
      ...wb,
      responses,
      lastUpdatedAt: new Date().toISOString(),
    });
    this.persistQaState();
  }

  // ── CQI-QRE Quarterly Meetings ─────────────────────────────────────────

  private cqiKey(siteId: string, quarter: string): string {
    return `${siteId}|${quarter}`;
  }

  protected computeCqiStatus(r: CQIMeetingRecord): CQIMeetingRecord["status"] {
    if (r.status === "submitted") return "submitted";
    const hasAny =
      r.selectedQuarter !== "" ||
      r.pharmacyLocation.trim() !== "" ||
      r.pic.trim() !== "" ||
      Object.values(r.safetyChecks).some(Boolean) ||
      Object.values(r.agendaItems).some(Boolean) ||
      r.qreIssues.trim() !== "" ||
      r.actionPlan.trim() !== "" ||
      r.attendees.length > 0;
    return hasAny ? "in_progress" : "not_started";
  }

  protected emptyCqiMeeting(
    siteId: string,
    quarter: string,
    base: { siteName?: string; pharmacyLocation?: string },
  ): CQIMeetingRecord {
    return {
      siteId,
      quarter,
      siteName: base.siteName ?? "",
      pharmacyLocation: base.pharmacyLocation ?? "",
      pic: "",
      selectedQuarter: "",
      otherDate: "",
      safetyChecks: { fireExtinguisher: false, smokeDetector: false, evacuationPlan: false },
      agendaItems: {
        regulatoryUpdates: false,
        workflowUpdates: false,
        qreIssues: false,
        policyUpdates: false,
        qmcMeetingMinutes: false,
      },
      qreIssues: "",
      actionPlan: "",
      attendees: [],
      status: "not_started",
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  async getCqiMeeting(siteId: string, quarter: string): Promise<CQIMeetingRecord | undefined> {
    return this.cqiMeetings.get(this.cqiKey(siteId, quarter));
  }

  async listCqiMeetings(siteId: string): Promise<CqiMeetingSummary[]> {
    return Array.from(this.cqiMeetings.values())
      .filter((rec) => rec.siteId === siteId)
      .map((rec) => ({
        quarter: rec.quarter,
        status: rec.status,
        pic: rec.pic,
        lastUpdatedAt: rec.lastUpdatedAt,
      }))
      // Newest quarter first (keys are "YYYY-Q#", so a descending sort works).
      .sort((a, b) => b.quarter.localeCompare(a.quarter));
  }

  async upsertCqiMeeting(
    data: UpsertCqiMeeting,
    _user: { email: string; name: string },
  ): Promise<CQIMeetingRecord> {
    const key = this.cqiKey(data.siteId, data.quarter);
    const existing = this.cqiMeetings.get(key);
    const record: CQIMeetingRecord = {
      ...data,
      // Attendees and submission metadata are preserved across director edits.
      attendees: existing?.attendees ?? [],
      submittedBy: existing?.submittedBy,
      submittedAt: existing?.submittedAt,
      status: existing?.status ?? "not_started",
      lastUpdatedAt: new Date().toISOString(),
    };
    record.status = this.computeCqiStatus(record);
    this.cqiMeetings.set(key, record);
    this.persistCqiState();
    return record;
  }

  async signCqiMeeting(
    siteId: string,
    quarter: string,
    attendee: Omit<CQIAttendee, "id" | "signedAt">,
    base: { siteName?: string; pharmacyLocation?: string },
  ): Promise<CQIMeetingRecord> {
    const key = this.cqiKey(siteId, quarter);
    const record = this.cqiMeetings.get(key) ?? this.emptyCqiMeeting(siteId, quarter, base);
    // One signature per user — ignore duplicates.
    const already = record.attendees.some(
      (a) => a.userEmail.toLowerCase() === attendee.userEmail.toLowerCase(),
    );
    if (!already) {
      const full: CQIAttendee = {
        ...attendee,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        signedAt: new Date().toISOString(),
      };
      record.attendees = [...record.attendees, full];
    }
    record.lastUpdatedAt = new Date().toISOString();
    record.status = this.computeCqiStatus(record);
    this.cqiMeetings.set(key, record);
    this.persistCqiState();
    return record;
  }

  private loadCqiPersistedState(): void {
    try {
      if (!existsSync(CQI_PERSIST_PATH)) return;
      const raw = readFileSync(CQI_PERSIST_PATH, "utf-8");
      const data = JSON.parse(raw) as Array<[string, CQIMeetingRecord]>;
      if (Array.isArray(data)) {
        for (const [k, v] of data) this.cqiMeetings.set(k, v);
      }
    } catch (err) {
      console.warn("[cqi-meeting] failed to load persisted state:", err);
    }
  }

  private persistCqiState(): void {
    try {
      const dir = dirname(CQI_PERSIST_PATH);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(CQI_PERSIST_PATH, JSON.stringify(Array.from(this.cqiMeetings.entries())));
    } catch (err) {
      console.warn("[cqi-meeting] failed to persist state:", err);
    }
  }

  // ── Client store ───────────────────────────────────────────────────────

  async getClientStores(siteId: string): Promise<Array<{ storeKey: string; value: unknown; updatedAt: string }>> {
    const prefix = `${siteId}|`;
    return Array.from(this.clientStores.entries())
      .filter(([k]) => k.startsWith(prefix))
      .map(([k, v]) => ({
        storeKey: k.slice(prefix.length),
        value: v.value,
        updatedAt: v.updatedAt,
      }));
  }

  async setClientStore(siteId: string, storeKey: string, value: unknown): Promise<void> {
    this.clientStores.set(`${siteId}|${storeKey}`, { value, updatedAt: new Date().toISOString() });
  }

  // ── ADP Workforce Now (in-memory) ─────────────────────────────────────

  protected adpMappings: Map<string, AdpWorkerMapping> = new Map();
  protected adpSyncStatuses: Map<string, AdpSyncStatus> = new Map();
  protected adpSyncHistory: AdpSyncHistoryEntry[] = [];

  async getAdpWorkerMappings(siteId: string): Promise<AdpWorkerMapping[]> {
    return Array.from(this.adpMappings.values()).filter((m) => m.siteId === siteId);
  }

  async upsertAdpWorkerMapping(m: Omit<AdpWorkerMapping, "updatedAt">): Promise<AdpWorkerMapping> {
    const record: AdpWorkerMapping = { ...m, updatedAt: new Date().toISOString() };
    this.adpMappings.set(`${m.siteId}|${m.adpWorkerId}`, record);
    return record;
  }

  async deleteAdpWorkerMapping(siteId: string, adpWorkerId: string): Promise<void> {
    this.adpMappings.delete(`${siteId}|${adpWorkerId}`);
  }

  async getAdpSyncStatus(siteId: string): Promise<AdpSyncStatus | undefined> {
    return this.adpSyncStatuses.get(siteId);
  }

  async setAdpSyncStatus(siteId: string, status: Omit<AdpSyncStatus, "updatedAt">): Promise<AdpSyncStatus> {
    const record: AdpSyncStatus = { ...status, updatedAt: new Date().toISOString() };
    this.adpSyncStatuses.set(siteId, record);
    return record;
  }

  async getAdpMappedSiteIds(): Promise<string[]> {
    return [...new Set(Array.from(this.adpMappings.values()).map((m) => m.siteId))];
  }

  async addAdpSyncHistory(entry: Omit<AdpSyncHistoryEntry, "id">): Promise<AdpSyncHistoryEntry> {
    const record: AdpSyncHistoryEntry = { ...entry, id: randomUUID() };
    this.adpSyncHistory.push(record);
    // Keep only the 50 most recent in memory to bound growth.
    if (this.adpSyncHistory.length > 50) {
      this.adpSyncHistory = this.adpSyncHistory.slice(-50);
    }
    return record;
  }

  async getAdpSyncHistory(siteId: string, limit = 10): Promise<AdpSyncHistoryEntry[]> {
    const cap = Math.min(limit, 10);
    return this.adpSyncHistory
      .filter((e) => e.siteId === siteId)
      .slice(-cap)
      .reverse();
  }
}

// ── PostgreSQL-backed storage ──────────────────────────────────────────────
// Extends MemStorage but overrides the shared, server-side records that must
// survive restarts/redeploys — the CQI-QRE quarterly meetings (including
// attendee signatures) and the HIPAA access audit log — so they read and write
// to PostgreSQL instead of in-memory maps and `.local` JSON files. Everything
// else (scheduling, QA audit, notifications, patients) keeps the inherited
// in-memory behavior, which is out of scope for this change.
export class DbStorage extends MemStorage {
  private rowToCqiRecord(row: typeof cqiMeetingsTable.$inferSelect): CQIMeetingRecord {
    return {
      siteId: row.siteId,
      quarter: row.quarter,
      siteName: row.siteName,
      pharmacyLocation: row.pharmacyLocation,
      pic: row.pic,
      selectedQuarter: row.selectedQuarter,
      otherDate: row.otherDate,
      safetyChecks: row.safetyChecks,
      agendaItems: row.agendaItems,
      qreIssues: row.qreIssues,
      actionPlan: row.actionPlan,
      attendees: row.attendees,
      status: row.status,
      lastUpdatedAt: row.lastUpdatedAt,
      submittedBy: row.submittedBy ?? undefined,
      submittedAt: row.submittedAt ?? undefined,
    };
  }

  private recordToRow(r: CQIMeetingRecord): typeof cqiMeetingsTable.$inferInsert {
    return {
      siteId: r.siteId,
      quarter: r.quarter,
      siteName: r.siteName,
      pharmacyLocation: r.pharmacyLocation,
      pic: r.pic,
      selectedQuarter: r.selectedQuarter,
      otherDate: r.otherDate,
      safetyChecks: r.safetyChecks,
      agendaItems: r.agendaItems,
      qreIssues: r.qreIssues,
      actionPlan: r.actionPlan,
      attendees: r.attendees,
      status: r.status,
      lastUpdatedAt: r.lastUpdatedAt,
      submittedBy: r.submittedBy ?? null,
      submittedAt: r.submittedAt ?? null,
    };
  }

  // Read-modify-write a single CQI meeting atomically. Two staff signing the
  // same meeting at nearly the same time would otherwise race and overwrite each
  // other's signatures. We first ensure the row exists (no-op insert), then lock
  // it with SELECT ... FOR UPDATE so the mutate/write happens serially.
  private async withLockedCqi(
    siteId: string,
    quarter: string,
    base: { siteName?: string; pharmacyLocation?: string },
    mutate: (current: CQIMeetingRecord) => CQIMeetingRecord,
  ): Promise<CQIMeetingRecord> {
    return db.transaction(async (tx) => {
      await tx
        .insert(cqiMeetingsTable)
        .values(this.recordToRow(this.emptyCqiMeeting(siteId, quarter, base)))
        .onConflictDoNothing();
      const rows = await tx
        .select()
        .from(cqiMeetingsTable)
        .where(
          and(
            eq(cqiMeetingsTable.siteId, siteId),
            eq(cqiMeetingsTable.quarter, quarter),
          ),
        )
        .for("update")
        .limit(1);
      const current = this.rowToCqiRecord(rows[0]);
      const next = mutate(current);
      const row = this.recordToRow(next);
      await tx
        .insert(cqiMeetingsTable)
        .values(row)
        .onConflictDoUpdate({
          target: [cqiMeetingsTable.siteId, cqiMeetingsTable.quarter],
          set: row,
        });
      return next;
    });
  }

  override async getCqiMeeting(
    siteId: string,
    quarter: string,
  ): Promise<CQIMeetingRecord | undefined> {
    const rows = await db
      .select()
      .from(cqiMeetingsTable)
      .where(
        and(
          eq(cqiMeetingsTable.siteId, siteId),
          eq(cqiMeetingsTable.quarter, quarter),
        ),
      )
      .limit(1);
    return rows[0] ? this.rowToCqiRecord(rows[0]) : undefined;
  }

  override async listCqiMeetings(siteId: string): Promise<CqiMeetingSummary[]> {
    const rows = await db
      .select({
        quarter: cqiMeetingsTable.quarter,
        status: cqiMeetingsTable.status,
        pic: cqiMeetingsTable.pic,
        lastUpdatedAt: cqiMeetingsTable.lastUpdatedAt,
      })
      .from(cqiMeetingsTable)
      .where(eq(cqiMeetingsTable.siteId, siteId));
    // Newest quarter first (keys are "YYYY-Q#", so a descending sort works).
    return rows.sort((a, b) => b.quarter.localeCompare(a.quarter));
  }

  override async upsertCqiMeeting(
    data: UpsertCqiMeeting,
    _user: { email: string; name: string },
  ): Promise<CQIMeetingRecord> {
    return this.withLockedCqi(
      data.siteId,
      data.quarter,
      { siteName: data.siteName, pharmacyLocation: data.pharmacyLocation },
      (current) => {
        const record: CQIMeetingRecord = {
          ...data,
          // Attendees and submission metadata are preserved across director edits.
          attendees: current.attendees,
          submittedBy: current.submittedBy,
          submittedAt: current.submittedAt,
          status: current.status,
          lastUpdatedAt: new Date().toISOString(),
        };
        record.status = this.computeCqiStatus(record);
        return record;
      },
    );
  }

  override async signCqiMeeting(
    siteId: string,
    quarter: string,
    attendee: Omit<CQIAttendee, "id" | "signedAt">,
    base: { siteName?: string; pharmacyLocation?: string },
  ): Promise<CQIMeetingRecord> {
    return this.withLockedCqi(siteId, quarter, base, (record) => {
      // One signature per user — ignore duplicates.
      const already = record.attendees.some(
        (a) => a.userEmail.toLowerCase() === attendee.userEmail.toLowerCase(),
      );
      if (!already) {
        const full: CQIAttendee = {
          ...attendee,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          signedAt: new Date().toISOString(),
        };
        record.attendees = [...record.attendees, full];
      }
      record.lastUpdatedAt = new Date().toISOString();
      record.status = this.computeCqiStatus(record);
      return record;
    });
  }

  override async addAuditLog(
    entry: Omit<AuditLogEntry, "id">,
  ): Promise<AuditLogEntry> {
    const full: AuditLogEntry = { id: randomUUID(), ...entry };
    await db.insert(auditLogsTable).values({
      id: full.id,
      at: full.at,
      actorEmail: full.actorEmail,
      actorName: full.actorName,
      role: full.role,
      action: full.action,
      resource: full.resource,
      method: full.method,
      path: full.path,
    });
    return full;
  }

  override async listAuditLogs(limit = 500): Promise<AuditLogEntry[]> {
    // Most recent first.
    const rows = await db
      .select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.seq))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      at: r.at,
      actorEmail: r.actorEmail,
      actorName: r.actorName,
      role: r.role,
      action: r.action,
      resource: r.resource,
      method: r.method,
      path: r.path,
    }));
  }

  // ── Retention patients (DB-backed) ─────────────────────────────────────

  override async getPatients(siteId: string): Promise<RetentionPatient[]> {
    const rows = await db
      .select()
      .from(retentionPatientsTable)
      .where(eq(retentionPatientsTable.siteId, siteId));
    return rows.map((r) => r.record);
  }

  override async getPatient(id: string): Promise<RetentionPatient | undefined> {
    const rows = await db
      .select()
      .from(retentionPatientsTable)
      .where(eq(retentionPatientsTable.id, id))
      .limit(1);
    return rows[0]?.record;
  }

  override async getAllActivePatients(): Promise<RetentionPatient[]> {
    const rows = await db.select().from(retentionPatientsTable);
    return rows
      .map((r) => r.record)
      .filter((p) => p.sequenceActive && !p.outreachComplete && p.status === "active");
  }

  override async addPatient(p: Omit<RetentionPatient, "id">): Promise<RetentionPatient> {
    const id = `rp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const patient: RetentionPatient = { ...p, id };
    await db.insert(retentionPatientsTable).values({
      id,
      siteId: patient.siteId,
      record: patient,
    });
    return patient;
  }

  override async updatePatient(p: RetentionPatient): Promise<RetentionPatient> {
    await db
      .insert(retentionPatientsTable)
      .values({ id: p.id, siteId: p.siteId, record: p })
      .onConflictDoUpdate({
        target: retentionPatientsTable.id,
        set: { siteId: p.siteId, record: p },
      });
    return p;
  }

  override async deletePatient(id: string): Promise<void> {
    await db.delete(retentionPatientsTable).where(eq(retentionPatientsTable.id, id));
  }

  // ── Scheduling (DB-backed) ─────────────────────────────────────────────

  override async getPharmacyHours(siteId: string): Promise<PharmacyHours | undefined> {
    const rows = await db
      .select()
      .from(pharmacyHoursTable)
      .where(eq(pharmacyHoursTable.siteId, siteId))
      .limit(1);
    return rows[0]?.record;
  }

  override async upsertPharmacyHours(
    h: Omit<PharmacyHours, "updatedAt">,
  ): Promise<PharmacyHours> {
    const record: PharmacyHours = { ...h, updatedAt: new Date().toISOString() };
    await db
      .insert(pharmacyHoursTable)
      .values({ siteId: h.siteId, record })
      .onConflictDoUpdate({ target: pharmacyHoursTable.siteId, set: { record } });
    return record;
  }

  override async getStaffScheduleDefaults(siteId: string): Promise<StaffScheduleDefault[]> {
    const rows = await db
      .select()
      .from(staffScheduleDefaultsTable)
      .where(eq(staffScheduleDefaultsTable.siteId, siteId));
    return rows.map((r) => r.record);
  }

  override async upsertStaffScheduleDefault(
    d: Omit<StaffScheduleDefault, "updatedAt">,
  ): Promise<StaffScheduleDefault> {
    const record: StaffScheduleDefault = { ...d, updatedAt: new Date().toISOString() };
    await db
      .insert(staffScheduleDefaultsTable)
      .values({ siteId: d.siteId, staffId: d.staffId, record })
      .onConflictDoUpdate({
        target: [staffScheduleDefaultsTable.siteId, staffScheduleDefaultsTable.staffId],
        set: { record },
      });
    return record;
  }

  override async deleteStaffScheduleDefault(siteId: string, staffId: string): Promise<void> {
    await db
      .delete(staffScheduleDefaultsTable)
      .where(
        and(
          eq(staffScheduleDefaultsTable.siteId, siteId),
          eq(staffScheduleDefaultsTable.staffId, staffId),
        ),
      );
  }

  override async getScheduleEntries(
    siteId: string,
    fromDate: string,
    toDate: string,
  ): Promise<ScheduleEntry[]> {
    // Proper overlap query: fetch entries whose start date is on or before toDate
    // AND whose effective end date (endDate if present, else date) is on or after fromDate.
    // Since Drizzle/Postgres cannot query inside JSONB fields without a generated column,
    // we fetch all entries up to toDate and filter in app code for end-date overlap.
    // We also include entries starting up to 365 days before fromDate to cover very long
    // multi-day blocks (e.g. extended medical leave).
    const lookback = new Date(fromDate);
    lookback.setDate(lookback.getDate() - 365);
    const ly = lookback.getFullYear();
    const lm = String(lookback.getMonth() + 1).padStart(2, "0");
    const ld = String(lookback.getDate()).padStart(2, "0");
    const lookbackKey = `${ly}-${lm}-${ld}`;
    const rows = await db
      .select()
      .from(scheduleEntriesTable)
      .where(
        and(
          eq(scheduleEntriesTable.siteId, siteId),
          gte(scheduleEntriesTable.date, lookbackKey),
          lte(scheduleEntriesTable.date, toDate),
        ),
      );
    // True overlap: entry [date, endDate] ∩ [fromDate, toDate] must be non-empty.
    return rows
      .map((r) => r.record)
      .filter((e) => (e.endDate ?? e.date) >= fromDate);
  }

  override async upsertScheduleEntry(
    e: Omit<ScheduleEntry, "id" | "updatedAt">,
  ): Promise<ScheduleEntry> {
    const id = entryKey(e.siteId, e.staffId, e.date);
    const record: ScheduleEntry = { ...e, id, updatedAt: new Date().toISOString() };
    await db
      .insert(scheduleEntriesTable)
      .values({ id, siteId: e.siteId, date: e.date, record })
      .onConflictDoUpdate({ target: scheduleEntriesTable.id, set: { record } });
    return record;
  }

  override async deleteScheduleEntry(siteId: string, staffId: string, date: string): Promise<void> {
    await db
      .delete(scheduleEntriesTable)
      .where(eq(scheduleEntriesTable.id, entryKey(siteId, staffId, date)));
  }

  // ── Time-Off Balances (DB-backed) ─────────────────────────────────────

  override async getTimeOffBalances(siteId: string, year: number): Promise<StaffTimeOffBalance[]> {
    const yearStr = String(year);
    const rows = await db
      .select()
      .from(staffTimeOffBalancesTable)
      .where(
        and(
          eq(staffTimeOffBalancesTable.siteId, siteId),
          eq(staffTimeOffBalancesTable.year, yearStr),
        ),
      );
    return rows.map((r) => r.record);
  }

  override async upsertTimeOffBalance(b: Omit<StaffTimeOffBalance, "updatedAt">): Promise<StaffTimeOffBalance> {
    const yearStr = String(b.year);
    const record: StaffTimeOffBalance = { ...b, updatedAt: new Date().toISOString() };
    await db
      .insert(staffTimeOffBalancesTable)
      .values({ siteId: b.siteId, staffId: b.staffId, year: yearStr, record })
      .onConflictDoUpdate({
        target: [
          staffTimeOffBalancesTable.siteId,
          staffTimeOffBalancesTable.staffId,
          staffTimeOffBalancesTable.year,
        ],
        set: { record },
      });
    return record;
  }

  // ── Schedule submissions (DB-backed) ───────────────────────────────────

  override async createScheduleSubmission(
    s: Omit<ScheduleSubmission, "id" | "submittedAt" | "status">,
  ): Promise<ScheduleSubmission> {
    const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record: ScheduleSubmission = {
      ...s,
      id,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
    await db.insert(scheduleSubmissionsTable).values({
      id,
      siteId: record.siteId,
      region: record.region ?? "",
      weekStart: record.weekStart,
      submittedAt: record.submittedAt,
      record,
    });
    return record;
  }

  override async getScheduleSubmission(id: string): Promise<ScheduleSubmission | undefined> {
    const rows = await db
      .select()
      .from(scheduleSubmissionsTable)
      .where(eq(scheduleSubmissionsTable.id, id))
      .limit(1);
    return rows[0]?.record;
  }

  override async getScheduleSubmissionsForSite(siteId: string): Promise<ScheduleSubmission[]> {
    const rows = await db
      .select()
      .from(scheduleSubmissionsTable)
      .where(eq(scheduleSubmissionsTable.siteId, siteId))
      .orderBy(desc(scheduleSubmissionsTable.submittedAt));
    return rows.map((r) => r.record);
  }

  override async getScheduleSubmissionsForRegion(region: string): Promise<ScheduleSubmission[]> {
    const rows = await db
      .select()
      .from(scheduleSubmissionsTable)
      .where(eq(scheduleSubmissionsTable.region, region))
      .orderBy(desc(scheduleSubmissionsTable.submittedAt));
    return rows.map((r) => r.record);
  }

  override async getLatestSubmissionForWeek(
    siteId: string,
    weekStart: string,
  ): Promise<ScheduleSubmission | undefined> {
    const rows = await db
      .select()
      .from(scheduleSubmissionsTable)
      .where(
        and(
          eq(scheduleSubmissionsTable.siteId, siteId),
          eq(scheduleSubmissionsTable.weekStart, weekStart),
        ),
      )
      .orderBy(desc(scheduleSubmissionsTable.submittedAt))
      .limit(1);
    return rows[0]?.record;
  }

  override async reviewScheduleSubmission(
    id: string,
    status: "approved" | "changes_requested",
    reviewer: { email: string; name: string },
    note?: string,
  ): Promise<ScheduleSubmission | undefined> {
    return db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(scheduleSubmissionsTable)
        .where(eq(scheduleSubmissionsTable.id, id))
        .for("update")
        .limit(1);
      const existing = rows[0]?.record;
      if (!existing) return undefined;
      const updated: ScheduleSubmission = {
        ...existing,
        status,
        reviewedByEmail: reviewer.email,
        reviewedByName: reviewer.name,
        reviewedAt: new Date().toISOString(),
        reviewNote: note,
      };
      await tx
        .update(scheduleSubmissionsTable)
        .set({ record: updated })
        .where(eq(scheduleSubmissionsTable.id, id));
      return updated;
    });
  }

  // ── Notifications (DB-backed) ──────────────────────────────────────────

  override async addNotification(
    n: Omit<AppNotification, "id" | "createdAt" | "read">,
  ): Promise<AppNotification> {
    const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record: AppNotification = {
      ...n,
      id,
      createdAt: new Date().toISOString(),
      read: false,
    };
    await db.insert(notificationsTable).values({
      id,
      toEmail: record.toEmail.toLowerCase(),
      createdAt: record.createdAt,
      record,
    });
    return record;
  }

  override async getNotifications(toEmail: string): Promise<AppNotification[]> {
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.toEmail, toEmail.toLowerCase()))
      .orderBy(desc(notificationsTable.createdAt));
    return rows.map((r) => r.record);
  }

  override async markNotificationRead(id: string, toEmail: string): Promise<void> {
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, id))
      .limit(1);
    const n = rows[0]?.record;
    if (n && n.toEmail.toLowerCase() === toEmail.toLowerCase()) {
      await db
        .update(notificationsTable)
        .set({ record: { ...n, read: true } })
        .where(eq(notificationsTable.id, id));
    }
  }

  override async markAllNotificationsRead(toEmail: string): Promise<void> {
    const lc = toEmail.toLowerCase();
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.toEmail, lc));
    for (const row of rows) {
      if (!row.record.read) {
        await db
          .update(notificationsTable)
          .set({ record: { ...row.record, read: true } })
          .where(eq(notificationsTable.id, row.id));
      }
    }
  }

  // ── QA Audit workbooks / evidence / tasks (DB-backed) ─────────────────

  // Read-modify-write a workbook atomically (same pattern as withLockedCqi):
  // ensure the row exists, lock it, then mutate and write back serially so
  // concurrent saves don't overwrite each other.
  private async withLockedQaWorkbook(
    siteId: string,
    year: string,
    seed: QaAuditWorkbook,
    mutate: (current: QaAuditWorkbook) => QaAuditWorkbook | undefined,
  ): Promise<QaAuditWorkbook | undefined> {
    return db.transaction(async (tx) => {
      await tx
        .insert(qaWorkbooksTable)
        .values({ siteId, year, record: seed })
        .onConflictDoNothing();
      const rows = await tx
        .select()
        .from(qaWorkbooksTable)
        .where(and(eq(qaWorkbooksTable.siteId, siteId), eq(qaWorkbooksTable.year, year)))
        .for("update")
        .limit(1);
      const current = rows[0]?.record;
      if (!current) return undefined;
      const next = mutate(current);
      if (!next) return current;
      await tx
        .update(qaWorkbooksTable)
        .set({ record: next })
        .where(and(eq(qaWorkbooksTable.siteId, siteId), eq(qaWorkbooksTable.year, year)));
      return next;
    });
  }

  override async listQaAuditWorkbooks(year?: string): Promise<QaAuditWorkbook[]> {
    const rows = year
      ? await db.select().from(qaWorkbooksTable).where(eq(qaWorkbooksTable.year, year))
      : await db.select().from(qaWorkbooksTable);
    return rows.map((r) => r.record);
  }

  override async getQaAuditWorkbook(
    siteId: string,
    year: string,
  ): Promise<QaAuditWorkbook | undefined> {
    const rows = await db
      .select()
      .from(qaWorkbooksTable)
      .where(and(eq(qaWorkbooksTable.siteId, siteId), eq(qaWorkbooksTable.year, year)))
      .limit(1);
    return rows[0]?.record;
  }

  override async upsertQaAuditWorkbook(
    data: UpsertQaAuditWorkbook,
    user: { email: string; name: string },
  ): Promise<QaAuditWorkbook> {
    const now = new Date().toISOString();
    const reviewed = data.responses.filter((r) => !!r.status).length;
    const fresh: QaAuditWorkbook = {
      siteId: data.siteId,
      siteName: data.siteName,
      region: data.region ?? "",
      year: data.year,
      responses: data.responses,
      status: reviewed === 0 ? "not_started" : "in_progress",
      lastUpdatedAt: now,
      lastUpdatedByEmail: user.email,
      lastUpdatedByName: user.name,
    };
    const result = await this.withLockedQaWorkbook(
      data.siteId,
      data.year,
      fresh,
      (existing) => {
        // Submitted workbooks are locked — return undefined to keep them as-is.
        if (existing.status === "submitted") return undefined;
        return {
          ...fresh,
          submittedByEmail: existing.submittedByEmail,
          submittedByName: existing.submittedByName,
          submittedAt: existing.submittedAt,
        };
      },
    );
    return result ?? fresh;
  }

  override async submitQaAuditWorkbook(
    siteId: string,
    year: string,
    user: { email: string; name: string },
  ): Promise<QaAuditWorkbook | undefined> {
    const existing = await this.getQaAuditWorkbook(siteId, year);
    if (!existing) return undefined;
    const now = new Date().toISOString();
    return this.withLockedQaWorkbook(siteId, year, existing, (current) => ({
      ...current,
      status: "submitted",
      submittedByEmail: user.email,
      submittedByName: user.name,
      submittedAt: now,
      lastUpdatedAt: now,
      lastUpdatedByEmail: user.email,
      lastUpdatedByName: user.name,
    }));
  }

  override async setQaAuditResponseTaskId(
    siteId: string,
    year: string,
    itemId: string,
    taskId: string,
  ): Promise<void> {
    const existing = await this.getQaAuditWorkbook(siteId, year);
    if (!existing) return;
    await this.withLockedQaWorkbook(siteId, year, existing, (current) => ({
      ...current,
      responses: current.responses.map((r) =>
        r.itemId === itemId ? { ...r, taskCreatedId: taskId } : r,
      ),
      lastUpdatedAt: new Date().toISOString(),
    }));
  }

  override async addQaAuditEvidence(
    file: Omit<QaAuditEvidenceFile, "id" | "uploadedAt">,
  ): Promise<QaAuditEvidenceFile> {
    const id = `qae-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record: QaAuditEvidenceFile = {
      ...file,
      id,
      uploadedAt: new Date().toISOString(),
    };
    await db.insert(qaEvidenceTable).values({
      id,
      siteId: record.siteId,
      year: record.year,
      fileName: record.fileName,
      fileType: record.fileType,
      uploadedBy: record.uploadedBy,
      uploadedAt: record.uploadedAt,
      dataB64: record.data.toString("base64"),
    });
    return record;
  }

  override async getQaAuditEvidence(id: string): Promise<QaAuditEvidenceFile | undefined> {
    const rows = await db
      .select()
      .from(qaEvidenceTable)
      .where(eq(qaEvidenceTable.id, id))
      .limit(1);
    const r = rows[0];
    if (!r) return undefined;
    return {
      id: r.id,
      siteId: r.siteId,
      year: r.year,
      fileName: r.fileName,
      fileType: r.fileType,
      uploadedBy: r.uploadedBy,
      uploadedAt: r.uploadedAt,
      data: Buffer.from(r.dataB64, "base64"),
    };
  }

  override async addQaAuditTask(t: Omit<QaAuditTask, "id" | "createdAt">): Promise<QaAuditTask> {
    const id = `qat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record: QaAuditTask = { ...t, id, createdAt: new Date().toISOString() };
    await db.insert(qaTasksTable).values({
      id,
      assignedToEmail: record.assignedToEmail.toLowerCase(),
      createdAt: record.createdAt,
      record,
    });
    return record;
  }

  override async listQaAuditTasksForUser(email: string): Promise<QaAuditTask[]> {
    const rows = await db
      .select()
      .from(qaTasksTable)
      .where(eq(qaTasksTable.assignedToEmail, email.toLowerCase()))
      .orderBy(desc(qaTasksTable.createdAt));
    return rows.map((r) => r.record);
  }

  override async getQaAuditTask(id: string): Promise<QaAuditTask | undefined> {
    const rows = await db.select().from(qaTasksTable).where(eq(qaTasksTable.id, id)).limit(1);
    return rows[0]?.record;
  }

  override async completeQaAuditTask(
    id: string,
    user: { email: string; name: string },
  ): Promise<QaAuditTask | undefined> {
    const existing = await this.getQaAuditTask(id);
    if (!existing) return undefined;
    const updated: QaAuditTask = {
      ...existing,
      completedAt: new Date().toISOString(),
      completedByEmail: user.email,
    };
    await db.update(qaTasksTable).set({ record: updated }).where(eq(qaTasksTable.id, id));
    return updated;
  }

  // ── Client store (DB-backed) ───────────────────────────────────────────

  override async getClientStores(
    siteId: string,
  ): Promise<Array<{ storeKey: string; value: unknown; updatedAt: string }>> {
    const rows = await db
      .select()
      .from(clientStoreTable)
      .where(eq(clientStoreTable.siteId, siteId));
    return rows.map((r) => ({ storeKey: r.storeKey, value: r.value, updatedAt: r.updatedAt }));
  }

  override async setClientStore(siteId: string, storeKey: string, value: unknown): Promise<void> {
    const updatedAt = new Date().toISOString();
    await db
      .insert(clientStoreTable)
      .values({ siteId, storeKey, value, updatedAt })
      .onConflictDoUpdate({
        target: [clientStoreTable.siteId, clientStoreTable.storeKey],
        set: { value, updatedAt },
      });
  }

  // ── One-time boot migration ────────────────────────────────────────────
  // Backfills the database from the legacy in-memory/file state the first
  // time the server boots with these tables empty:
  //  - QA audit workbooks/evidence/tasks from `.local/qa-audit-state.json`
  //    (loaded into the inherited MemStorage maps by the constructor).
  //  - The site 1417 scheduling seed (hours + staff defaults) so the
  //    scheduling page isn't empty on first visit.
  async init(): Promise<void> {
    try {
      const [wbCount] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(qaWorkbooksTable);
      if (wbCount.n === 0) {
        // MemStorage's constructor already loaded `.local/qa-audit-state.json`
        // into the in-memory maps — copy them into the database.
        const memWorkbooks = await super.listQaAuditWorkbooks();
        for (const wb of memWorkbooks) {
          await db
            .insert(qaWorkbooksTable)
            .values({ siteId: wb.siteId, year: wb.year, record: wb })
            .onConflictDoNothing();
        }
        for (const [, ev] of Array.from((this as any).qaAuditEvidence.entries()) as Array<
          [string, QaAuditEvidenceFile]
        >) {
          await db
            .insert(qaEvidenceTable)
            .values({
              id: ev.id,
              siteId: ev.siteId,
              year: ev.year,
              fileName: ev.fileName,
              fileType: ev.fileType,
              uploadedBy: ev.uploadedBy,
              uploadedAt: ev.uploadedAt,
              dataB64: ev.data.toString("base64"),
            })
            .onConflictDoNothing();
        }
        for (const [, t] of Array.from((this as any).qaAuditTasks.entries()) as Array<
          [string, QaAuditTask]
        >) {
          await db
            .insert(qaTasksTable)
            .values({
              id: t.id,
              assignedToEmail: t.assignedToEmail.toLowerCase(),
              createdAt: t.createdAt,
              record: t,
            })
            .onConflictDoNothing();
        }
        if (memWorkbooks.length > 0) {
          console.log(`[storage] migrated ${memWorkbooks.length} QA workbook(s) to PostgreSQL`);
        }
      }

      // Seed 1417 scheduling data (hours + staff defaults) if none exist yet.
      const [hoursCount] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(pharmacyHoursTable);
      if (hoursCount.n === 0) {
        const memHours = await super.getPharmacyHours("1417");
        if (memHours) await this.upsertPharmacyHours(memHours);
        const memDefaults = await super.getStaffScheduleDefaults("1417");
        for (const d of memDefaults) await this.upsertStaffScheduleDefault(d);
      }
    } catch (err) {
      console.error("[storage] init/backfill failed:", err);
    }
  }

  // ── ADP Workforce Now (DB-backed) ─────────────────────────────────────

  override async getAdpWorkerMappings(siteId: string): Promise<AdpWorkerMapping[]> {
    const rows = await db
      .select()
      .from(adpWorkerMappingsTable)
      .where(eq(adpWorkerMappingsTable.siteId, siteId));
    return rows.map((r) => r.record);
  }

  override async upsertAdpWorkerMapping(
    m: Omit<AdpWorkerMapping, "updatedAt">,
  ): Promise<AdpWorkerMapping> {
    const record: AdpWorkerMapping = { ...m, updatedAt: new Date().toISOString() };
    await db
      .insert(adpWorkerMappingsTable)
      .values({ siteId: m.siteId, adpWorkerId: m.adpWorkerId, record })
      .onConflictDoUpdate({
        target: [adpWorkerMappingsTable.siteId, adpWorkerMappingsTable.adpWorkerId],
        set: { record },
      });
    return record;
  }

  override async deleteAdpWorkerMapping(siteId: string, adpWorkerId: string): Promise<void> {
    await db
      .delete(adpWorkerMappingsTable)
      .where(
        and(
          eq(adpWorkerMappingsTable.siteId, siteId),
          eq(adpWorkerMappingsTable.adpWorkerId, adpWorkerId),
        ),
      );
  }

  override async getAdpSyncStatus(siteId: string): Promise<AdpSyncStatus | undefined> {
    const rows = await db
      .select()
      .from(adpSyncStatusTable)
      .where(eq(adpSyncStatusTable.siteId, siteId))
      .limit(1);
    return rows[0]?.record;
  }

  override async setAdpSyncStatus(
    siteId: string,
    status: Omit<AdpSyncStatus, "updatedAt">,
  ): Promise<AdpSyncStatus> {
    const record: AdpSyncStatus = { ...status, updatedAt: new Date().toISOString() };
    await db
      .insert(adpSyncStatusTable)
      .values({ siteId, record })
      .onConflictDoUpdate({ target: adpSyncStatusTable.siteId, set: { record } });
    return record;
  }

  override async getAdpMappedSiteIds(): Promise<string[]> {
    const rows = await db.selectDistinct({ siteId: adpWorkerMappingsTable.siteId }).from(adpWorkerMappingsTable);
    return rows.map((r) => r.siteId);
  }

  override async addAdpSyncHistory(entry: Omit<AdpSyncHistoryEntry, "id">): Promise<AdpSyncHistoryEntry> {
    const id = randomUUID();
    const record: AdpSyncHistoryEntry = { ...entry, id };
    await db.insert(adpSyncHistoryTable).values({
      id,
      siteId: entry.siteId,
      runAt: entry.runAt,
      result: entry.result,
      message: entry.message,
    });
    // Prune old rows — keep only the 10 most recent per site.
    try {
      const kept = await db
        .select({ id: adpSyncHistoryTable.id })
        .from(adpSyncHistoryTable)
        .where(eq(adpSyncHistoryTable.siteId, entry.siteId))
        .orderBy(desc(adpSyncHistoryTable.runAt))
        .limit(10);
      const keptIds = kept.map((r) => r.id);
      if (keptIds.length === 10) {
        await db
          .delete(adpSyncHistoryTable)
          .where(
            and(
              eq(adpSyncHistoryTable.siteId, entry.siteId),
              sql`${adpSyncHistoryTable.id} NOT IN (${sql.join(keptIds.map((k) => sql`${k}`), sql`, `)})`,
            ),
          );
      }
    } catch {
      // Pruning is best-effort; don't fail the sync if it errors.
    }
    return record;
  }

  override async getAdpSyncHistory(siteId: string, limit = 10): Promise<AdpSyncHistoryEntry[]> {
    const cap = Math.min(limit, 10);
    const rows = await db
      .select()
      .from(adpSyncHistoryTable)
      .where(eq(adpSyncHistoryTable.siteId, siteId))
      .orderBy(desc(adpSyncHistoryTable.runAt))
      .limit(cap);
    return rows.map((r) => ({
      id: r.id,
      siteId: r.siteId,
      runAt: r.runAt,
      result: r.result,
      message: r.message,
    }));
  }
}

export const storage: IStorage = new DbStorage();
