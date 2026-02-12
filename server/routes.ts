import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { hashPassword, comparePassword, signToken, verifyToken } from "./auth";
import { sendEmail, emailTemplates } from "./lib/email";
import { 
  insertUserSchema,
  insertAvailabilitySchema, 
  insertAppointmentSchema, 
  insertPrescriptionSchema,
  insertMedicalRecordSchema,
  insertMessageSchema,
  users, 
  availabilities, 
  appointments, 
  prescriptions, 
  medicalRecords, 
  messages 
} from "@shared/schema";
import { eq, and, or, gte, lte, notExists, asc, inArray, sql } from "drizzle-orm";
import { db } from "./db";

// Middleware to extract user from JWT
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401);

  const user = verifyToken(token);
  if (!user) return res.sendStatus(403); // Invalid token

  req.user = user;
  next();
};

import multer from "multer";
import path from "path";
import express from "express";

const storage_multer = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage_multer });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Serve uploads as static files
  app.use('/uploads', express.static('uploads'));

  // === AUTH ===
  
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      
      const existing = await storage.getUserByUsername(input.username);
      if (existing) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(input.password);
      const user = await storage.createUser({ ...input, password: hashedPassword });
      
      const token = signToken(user);
      res.status(201).json({ token, user });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByUsername(input.username);
      
      if (!user || !(await comparePassword(input.password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = signToken(user);
      res.json({ token, user });
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.auth.me.path, authenticateToken, async (req, res) => {
    const user = await storage.getUser(req.user.id);
    if (!user) return res.sendStatus(401);
    res.json(user);
  });

  // === DOCTORS ===

  app.get(api.doctors.list.path, authenticateToken, async (req, res) => {
    const doctors = await storage.listDoctors();
    // Remove passwords
    const safeDoctors = doctors.map(({ password, ...rest }) => rest);
    res.json(safeDoctors);
  });

  app.get(api.doctors.get.path, authenticateToken, async (req, res) => {
    const doctor = await storage.getUser(Number(req.params.id));
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ message: "Doctor not found" });
    }
    const { password, ...safeDoctor } = doctor;
    res.json(safeDoctor);
  });

  // === AVAILABILITY ===

  app.get(api.availabilities.list.path, authenticateToken, async (req, res) => {
    const avail = await storage.getAvailability(Number(req.params.id));
    res.json(avail);
  });

  app.post(api.availabilities.create.path, authenticateToken, async (req, res) => {
    if (req.user.role !== "doctor") return res.sendStatus(403);
    
    try {
      const input = api.availabilities.create.input.parse(req.body);
      // Ensure doctor creates availability for themselves
      const avail = await storage.createAvailability({ ...input, doctorId: req.user.id });
      res.status(201).json(avail);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // === APPOINTMENTS ===

  app.get(api.appointments.list.path, authenticateToken, async (req, res) => {
    const appts = await storage.getAppointments(req.user.id, req.user.role as "patient" | "doctor");
    res.json(appts);
  });

  app.post(api.appointments.create.path, authenticateToken, async (req, res) => {
    if (req.user.role !== "patient") return res.status(403).json({ message: "Only patients can book appointments" });

    try {
      const input = api.appointments.create.input.parse(req.body);
      const appt = await storage.createAppointment({ 
        ...input, 
        patientId: req.user.id
      });

      // Send confirmation email
      const doctor = await storage.getUser(appt.doctorId);
      const patient = await storage.getUser(appt.patientId);
      if (patient?.email) {
        const template = emailTemplates.appointmentConfirmed(patient.name, doctor?.name || 'Doctor', new Date(appt.startTime).toLocaleString());
        await sendEmail({ to: patient.email, ...template });
      }

      res.status(201).json(appt);
    } catch (err: any) {
      if (err.message.includes("Doctor is not available")) {
        return res.status(400).json({ message: err.message });
      }
      // Drizzle unique constraint error usually has code 23505
      if (err.code === '23505') {
        return res.status(409).json({ message: "This slot is already booked" });
      }
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ message: "Failed to book appointment" });
    }
  });

  app.patch(api.appointments.cancel.path, authenticateToken, async (req, res) => {
    const id = Number(req.params.id);
    const appt = await storage.getAppointment(id);
    
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    
    // Check ownership
    if (appt.patientId !== req.user.id && appt.doctorId !== req.user.id) {
      return res.sendStatus(403);
    }

    const updated = await storage.updateAppointmentStatus(id, "cancelled");
    res.json(updated);
  });

  app.patch(api.appointments.reschedule.path, authenticateToken, async (req, res) => {
    if (req.user.role !== "patient") return res.status(403).json({ message: "Only patients can reschedule appointments" });

    const id = Number(req.params.id);
    try {
      const { startTime, endTime } = api.appointments.reschedule.input.parse(req.body);
      const updated = await storage.rescheduleAppointment(id, startTime, endTime);
      
      if (!updated) return res.status(404).json({ message: "Appointment not found" });
      res.json(updated);
    } catch (err: any) {
      if (err.message.includes("Doctor is not available")) {
        return res.status(400).json({ message: err.message });
      }
      if (err.code === '23505') {
        return res.status(409).json({ message: "This slot is already booked" });
      }
      res.status(500).json({ message: "Failed to reschedule appointment" });
    }
  });

  // === PRESCRIPTIONS ===
  app.get(api.appointments.prescriptions.list.path, authenticateToken, async (req, res) => {
    try {
      const list = await storage.getPrescriptions(req.user.id, req.user.role as "patient" | "doctor");
      res.json(list);
    } catch (err) {
      console.error("Fetch prescriptions error:", err);
      res.status(500).json({ message: "Failed to fetch prescriptions" });
    }
  });

  app.post(api.appointments.prescriptions.create.path, authenticateToken, async (req, res) => {
    if (req.user.role !== "doctor") return res.sendStatus(403);
    try {
      // Partial parse to validate incoming fields, then we'll add doctorId
      const prescriptionData = {
        ...req.body,
        doctorId: req.user.id
      };
      
      const input = insertPrescriptionSchema.parse(prescriptionData);
      const prescription = await storage.createPrescription(input);
      
      const patient = await storage.getUser(input.patientId);
      const doctor = await storage.getUser(req.user.id);
      if (patient?.email) {
        const template = emailTemplates.newPrescription(patient.name, doctor?.name || "Doctor");
        await sendEmail({ to: patient.email, ...template });
      }

      res.status(201).json(prescription);
    } catch (err) {
      console.error("Prescription error:", err);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // === MEDICAL RECORDS ===
  app.get(api.appointments.medicalRecords.list.path, authenticateToken, async (req, res) => {
    const patientId = req.user.role === "patient" ? req.user.id : Number(req.query.patientId);
    if (!patientId) return res.status(400).json({ message: "Patient ID required" });
    
    // In a real app, verify doctor-patient relationship here
    const list = await storage.getMedicalRecords(patientId);
    res.json(list);
  });

  app.post(api.appointments.medicalRecords.upload.path, authenticateToken, upload.single('file'), async (req, res) => {
    if (req.user.role !== "patient") return res.sendStatus(403);
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      
      const record = await storage.createMedicalRecord({
        patientId: req.user.id,
        fileName: req.body.fileName || req.file.originalname,
        fileType: req.file.mimetype,
        filePath: `/uploads/${req.file.filename}`
      });
      res.status(201).json(record);
    } catch (err) {
      console.error("Medical record error:", err);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // === MESSAGES ===
  app.get(api.appointments.messages.list.path, authenticateToken, async (req, res) => {
    const otherUserId = Number(req.params.otherUserId);
    const list = await storage.getMessages(req.user.id, otherUserId);
    res.json(list);
  });

  app.post(api.appointments.messages.send.path, authenticateToken, async (req, res) => {
    try {
      const input = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user.id
      });
      const message = await storage.createMessage(input);

      // Send message notification
      const receiver = await storage.getUser(input.receiverId);
      const sender = await storage.getUser(req.user.id);
      if (receiver?.email) {
        const template = emailTemplates.newMessage(sender?.name || "User");
        await sendEmail({ to: receiver.email, ...template });
      }

      res.status(201).json(message);
    } catch (err) {
      console.error("Message error:", err);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.appointments.messages.conversations.path, authenticateToken, async (req, res) => {
    try {
      if (req.user.role === 'patient') {
        const doctors = await storage.listDoctors();
        const safeDoctors = doctors.map(({ password, ...rest }: any) => rest);
        return res.json(safeDoctors);
      }

      // For doctors, list patients they have appointments with
      const results = await db.selectDistinct({
        id: users.id,
        username: users.username,
        role: users.role,
        name: users.name
      })
      .from(users)
      .innerJoin(appointments, eq(appointments.patientId, users.id))
      .where(eq(appointments.doctorId, req.user.id));
      
      res.json(results);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // === ANALYTICS ===
  app.get("/api/doctor/analytics", authenticateToken, async (req, res) => {
    if (req.user.role !== "doctor") return res.sendStatus(403);
    try {
      const appts = await storage.getAppointments(req.user.id, "doctor");
      
      const totalAppointments = appts.length;
      const completedAppointments = appts.filter(a => a.status === "confirmed").length;
      const cancelledAppointments = appts.filter(a => a.status === "cancelled").length;
      
      // Trends by day (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const trends = last7Days.map(day => {
        const count = appts.filter(a => new Date(a.startTime).toISOString().split('T')[0] === day).length;
        return { day, count };
      });

      res.json({
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        trends
      });
    } catch (err) {
      console.error("Analytics error:", err);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  return httpServer;
}
