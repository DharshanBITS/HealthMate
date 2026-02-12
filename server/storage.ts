import { db } from "./db";
import { 
  users, availabilities, appointments, prescriptions, medicalRecords, messages,
  type User, type InsertUser, 
  type Availability, type InsertAvailability,
  type Appointment, type InsertAppointment,
  type Prescription, type InsertPrescription,
  type MedicalRecord, type InsertMedicalRecord,
  type Message, type InsertMessage
} from "@shared/schema";
import { eq, and, or, gte, lte, notExists, asc, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Doctor
  listDoctors(): Promise<User[]>;
  
  // Availability
  getAvailability(doctorId: number): Promise<Availability[]>;
  createAvailability(avail: InsertAvailability): Promise<Availability>;
  
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

  // Medical Records
  getMedicalRecords(patientId: number): Promise<MedicalRecord[]>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  getMedicalRecord(id: number): Promise<MedicalRecord | undefined>;

  // Messages
  getMessages(userId: number, otherUserId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getConversations(userId: number): Promise<User[]>;
}

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

  async getAvailability(doctorId: number): Promise<Availability[]> {
    // Return availabilities that don't have a confirmed appointment for the same doctor and start time
    // For testing/seed purposes, let's loosen the time check to include today
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return db.select()
      .from(availabilities)
      .where(and(
        eq(availabilities.doctorId, doctorId),
        gte(availabilities.endTime, now),
        notExists(
          db.select()
            .from(appointments)
            .where(and(
              eq(appointments.doctorId, availabilities.doctorId),
              eq(appointments.startTime, availabilities.startTime),
              eq(appointments.status, "confirmed")
            ))
        )
      ));
  }

  async createAvailability(avail: InsertAvailability): Promise<Availability> {
    const [newAvail] = await db.insert(availabilities).values(avail).returning();
    return newAvail;
  }

  async getAppointments(userId: number, role: "patient" | "doctor"): Promise<(Appointment & { doctor?: User, patient?: User })[]> {
    if (role === "patient") {
      const results = await db.select({
        appointment: appointments,
        doctor: users
      })
      .from(appointments)
      .innerJoin(users, eq(appointments.doctorId, users.id))
      .where(eq(appointments.patientId, userId));
      
      return results.map(r => ({ ...r.appointment, doctor: r.doctor }));
    } else {
      const results = await db.select({
        appointment: appointments,
        patient: users
      })
      .from(appointments)
      .innerJoin(users, eq(appointments.patientId, users.id))
      .where(eq(appointments.doctorId, userId));

      return results.map(r => ({ ...r.appointment, patient: r.patient }));
    }
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appt] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appt;
  }

  async createAppointment(appt: InsertAppointment): Promise<Appointment> {
    return await db.transaction(async (tx) => {
      const availBlocks = await tx.select().from(availabilities)
        .where(and(
          eq(availabilities.doctorId, appt.doctorId),
          lte(availabilities.startTime, appt.startTime),
          gte(availabilities.endTime, appt.endTime)
        ));
        
      if (availBlocks.length === 0) {
        throw new Error("Doctor is not available at this time");
      }

      const [newAppt] = await tx.insert(appointments).values(appt).returning();
      return newAppt;
    });
  }

  async updateAppointmentStatus(id: number, status: "cancelled" | "confirmed" | "completed"): Promise<Appointment | undefined> {
    const [updated] = await db.update(appointments)
      .set({ status })
      .where(eq(appointments.id, id))
      .returning();
    return updated;
  }

  async rescheduleAppointment(id: number, startTime: Date, endTime: Date): Promise<Appointment | undefined> {
    return await db.transaction(async (tx) => {
      const [appt] = await tx.select().from(appointments).where(eq(appointments.id, id));
      if (!appt) return undefined;

      // Check doctor availability
      const availBlocks = await tx.select().from(availabilities)
        .where(and(
          eq(availabilities.doctorId, appt.doctorId),
          lte(availabilities.startTime, startTime),
          gte(availabilities.endTime, endTime)
        ));
        
      if (availBlocks.length === 0) {
        throw new Error("Doctor is not available at this time");
      }

      // Check for conflicts excluding current appointment
      const [updated] = await tx.update(appointments)
        .set({ startTime, endTime, status: "confirmed" })
        .where(eq(appointments.id, id))
        .returning();
      return updated;
    });
  }

  // Prescription implementation
  async getPrescriptions(userId: number, role: "patient" | "doctor"): Promise<any[]> {
    if (role === "doctor") {
      const results = await db.select({
        prescription: prescriptions,
        patient: users
      })
      .from(prescriptions)
      .innerJoin(users, eq(prescriptions.patientId, users.id))
      .where(eq(prescriptions.doctorId, userId));
      
      return results.map(r => ({ ...r.prescription, patient: r.patient }));
    } else {
      const results = await db.select({
        prescription: prescriptions,
        doctor: users
      })
      .from(prescriptions)
      .innerJoin(users, eq(prescriptions.doctorId, users.id))
      .where(eq(prescriptions.patientId, userId));

      return results.map(r => ({ ...r.prescription, doctor: r.doctor }));
    }
  }

  async createPrescription(p: InsertPrescription): Promise<Prescription> {
    const [newP] = await db.insert(prescriptions).values(p).returning();
    return newP;
  }

  async getPrescription(id: number): Promise<Prescription | undefined> {
    const [p] = await db.select().from(prescriptions).where(eq(prescriptions.id, id));
    return p;
  }

  // Medical Record implementation
  async getMedicalRecords(patientId: number): Promise<MedicalRecord[]> {
    return db.select().from(medicalRecords).where(eq(medicalRecords.patientId, patientId));
  }

  async createMedicalRecord(r: InsertMedicalRecord): Promise<MedicalRecord> {
    const [newR] = await db.insert(medicalRecords).values(r).returning();
    return newR;
  }

  async getMedicalRecord(id: number): Promise<MedicalRecord | undefined> {
    const [r] = await db.select().from(medicalRecords).where(eq(medicalRecords.id, id));
    return r;
  }

  // Messaging implementation
  async getMessages(userId: number, otherUserId: number): Promise<Message[]> {
    return db.select().from(messages).where(
      or(
        and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
        and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
      )
    ).orderBy(asc(messages.timestamp));
  }

  async createMessage(m: InsertMessage): Promise<Message> {
    const [newM] = await db.insert(messages).values(m).returning();
    return newM;
  }

  async getConversations(userId: number): Promise<User[]> {
    const sentTo = db.select({ id: messages.receiverId }).from(messages).where(eq(messages.senderId, userId));
    const receivedFrom = db.select({ id: messages.senderId }).from(messages).where(eq(messages.receiverId, userId));
    
    const results = await db.execute(sql`
      SELECT id, username, role, name, specialization, email FROM ${users} 
      WHERE id IN (
        SELECT receiver_id FROM ${messages} WHERE sender_id = ${userId}
        UNION
        SELECT sender_id FROM ${messages} WHERE receiver_id = ${userId}
      )
    `);

    return results.rows as User[];
  }
}

export const storage = new DatabaseStorage();
