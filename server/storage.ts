import { db } from "./db";
import {
  users,
  type User, type InsertUser,
} from "@shared/schema";
import { eq, and, gte, lte, notExists } from "drizzle-orm";

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Doctor

  // Availability

  // Appointment
  getAppointments(userId: number, role: "patient" | "doctor"): Promise<(Appointment & { doctor?: User, patient?: User })[]>;
  createAppointment(appt: InsertAppointment): Promise<Appointment>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  updateAppointmentStatus(id: number, status: "cancelled" | "confirmed" | "completed"): Promise<Appointment | undefined>;
  rescheduleAppointment(id: number, startTime: Date, endTime: Date): Promise<Appointment | undefined>;


  // Prescriptions
  getPrescriptions(userId: number, role: "patient" | "doctor"): Promise<Prescription[]>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  getPrescription(id: number): Promise<Prescription | undefined>;
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  async listDoctors(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, "doctor"));
  }


}

export const storage = new DatabaseStorage();
