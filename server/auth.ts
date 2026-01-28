import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || "development_secret_key_123";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: User): string {
  // Sign with minimal payload
  const payload = { 
    id: user.id, 
    username: user.username, 
    role: user.role //added the role so that doctor and patient can use the same login API
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}
