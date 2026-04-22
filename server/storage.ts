import {
  type RetentionPatient,
  type PharmacyHours,
  type StaffScheduleDefault,
  type ScheduleEntry,
} from "@shared/schema";
import { randomUUID } from "crypto";

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

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.hours = new Map();
    this.scheduleDefaults = new Map();
    this.scheduleEntries = new Map();
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
}

export const storage = new MemStorage();
