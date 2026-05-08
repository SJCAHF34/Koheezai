import {
  type RetentionPatient,
  type PharmacyHours,
  type StaffScheduleDefault,
  type ScheduleEntry,
  type ScheduleSubmission,
  type AppNotification,
  type QaAuditWorkbook,
  type UpsertQaAuditWorkbook,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface QaAuditEvidenceFile {
  id: string;
  fileName: string;
  fileType: string;
  uploadedBy: string;
  uploadedAt: string;
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

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.hours = new Map();
    this.scheduleDefaults = new Map();
    this.scheduleEntries = new Map();
    this.submissions = new Map();
    this.notifications = new Map();
    this.qaAuditWorkbooks = new Map();
    this.qaAuditEvidence = new Map();
    this.seedSchedulingExamples();
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
    return Array.from(this.scheduleEntries.values()).filter(
      (e) =>
        e.siteId === siteId && e.date >= fromDate && e.date <= toDate,
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
    return record;
  }

  async getQaAuditEvidence(id: string): Promise<QaAuditEvidenceFile | undefined> {
    return this.qaAuditEvidence.get(id);
  }
}

export const storage = new MemStorage();
