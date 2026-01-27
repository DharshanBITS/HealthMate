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


  return httpServer;
}
