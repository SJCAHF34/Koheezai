import { type RetentionPatient } from "@shared/schema";
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
  getAllActivePatients(): Promise<RetentionPatient[]>;
  addPatient(p: Omit<RetentionPatient, "id">): Promise<RetentionPatient>;
  updatePatient(p: RetentionPatient): Promise<RetentionPatient>;
  deletePatient(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private patients: Map<string, RetentionPatient>;

  constructor() {
    this.users = new Map();
    this.patients = new Map();
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
}

export const storage = new MemStorage();
