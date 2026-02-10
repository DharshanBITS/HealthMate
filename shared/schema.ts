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
  specialization: text("specialization"), // Only for doctors
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

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  appointmentsAsPatient: many(appointments, { relationName: "patientAppointments" }),
  appointmentsAsDoctor: many(appointments, { relationName: "doctorAppointments" }),
  availabilities: many(availabilities),
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


// === SCHEMAS & TYPES ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertAppointmentSchema = createInsertSchema(appointments, {
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
}).omit({ id: true, status: true });



// Auth specific schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  isRead: boolean("is_read").default(false),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

