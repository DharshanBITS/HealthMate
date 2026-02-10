import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { hashPassword, comparePassword, signToken, verifyToken } from "./auth";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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
        patientId: req.user.id,
        status: "confirmed"
      });
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
    return httpServer;
  }
