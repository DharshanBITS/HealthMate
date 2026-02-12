import { pgTable, text, serial, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["patient", "doctor"] }).notNull(), // 'patient' or 'doctor'
  name: text("name").notNull(),
  email: text("email"),
  specialization: text("specialization"), // Only for doctors
});

export const availabilities = pgTable("availabilities", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  isBooked: boolean("is_booked").default(false),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status", { enum: ["confirmed", "cancelled", "completed"] }).default("confirmed"),
  notes: text("notes"),
}, (t) => ({
  // Unique constraint to prevent double booking on the DB level
  uniqueBooking: uniqueIndex("unique_booking_idx").on(t.doctorId, t.startTime),
}));

export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  date: timestamp("date").defaultNow().notNull(),
  medicines: text("medicines").notNull(), // JSON string for list of medicines
  notes: text("notes"),
});

export const medicalRecords = pgTable("medical_records", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  isRead: boolean("is_read").default(false),
});

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  appointmentsAsPatient: many(appointments, { relationName: "patientAppointments" }),
  appointmentsAsDoctor: many(appointments, { relationName: "doctorAppointments" }),
  availabilities: many(availabilities),
  prescriptionsAsPatient: many(prescriptions, { relationName: "patientPrescriptions" }),
  prescriptionsAsDoctor: many(prescriptions, { relationName: "doctorPrescriptions" }),
  medicalRecords: many(medicalRecords),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  patient: one(users, {
    fields: [prescriptions.patientId],
    references: [users.id],
    relationName: "patientPrescriptions",
  }),
  doctor: one(users, {
    fields: [prescriptions.doctorId],
    references: [users.id],
    relationName: "doctorPrescriptions",
  }),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({ one }) => ({
  patient: one(users, {
    fields: [medicalRecords.patientId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(users, {
    fields: [appointments.patientId],
    references: [users.id],
    relationName: "patientAppointments",
  }),
  doctor: one(users, {
    fields: [appointments.doctorId],
    references: [users.id],
    relationName: "doctorAppointments",
  }),
}));

export const availabilitiesRelations = relations(availabilities, ({ one }) => ({
  doctor: one(users, {
    fields: [availabilities.doctorId],
    references: [users.id],
  }),
}));

// === SCHEMAS & TYPES ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertAvailabilitySchema = createInsertSchema(availabilities, {
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
}).omit({ id: true, isBooked: true });

export const insertAppointmentSchema = createInsertSchema(appointments, {
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
}).omit({ id: true, status: true });

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ id: true, date: true });
export const insertMedicalRecordSchema = createInsertSchema(medicalRecords).omit({ id: true, uploadDate: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, timestamp: true, isRead: true });

// Auth specific schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = insertUserSchema.extend({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;

export type Availability = typeof availabilities.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
