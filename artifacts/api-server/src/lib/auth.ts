import { hash as bcryptHash, compare as bcryptCompare } from "bcryptjs";
import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { store, type Host } from "./store.js";

// ---- Express Request type augmentation ----
declare global {
  namespace Express {
    interface Request {
      hostAccount?: Host;
    }
  }
}

// ---- Pending registrations (in-memory, expire after 10 min) ----
interface PendingRegistration {
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  otp: string;
  expiresAt: number;
}

const pendingRegistrations = new Map<string, PendingRegistration>();
const OTP_TTL_MS = 10 * 60 * 1000;

export function createPendingRegistration(
  fullName: string,
  email: string,
  phone: string,
  passwordHash: string,
): { otp: string } {
  const otp = String(Math.floor(1000 + Math.random() * 9000));
  pendingRegistrations.set(phone, {
    fullName,
    email,
    phone,
    passwordHash,
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
  });
  return { otp };
}

export function getPendingRegistration(
  phone: string,
): PendingRegistration | undefined {
  const pr = pendingRegistrations.get(phone);
  if (!pr) return undefined;
  if (Date.now() > pr.expiresAt) {
    pendingRegistrations.delete(phone);
    return undefined;
  }
  return pr;
}

export function deletePendingRegistration(phone: string): void {
  pendingRegistrations.delete(phone);
}

// ---- Password helpers ----
const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcryptHash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcryptCompare(password, hash);
}

// ---- JWT helpers ----
if (!process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET environment variable is required but not set. Set it before starting the server.",
  );
}
const JWT_SECRET: string = process.env.SESSION_SECRET;
const JWT_EXPIRY = "7d";

interface JwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

export function signToken(hostId: string): string {
  return jwt.sign({ sub: hostId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// ---- Auth middleware ----
export const requireHost: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload?.sub) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  const host = store.hosts.get(payload.sub);
  if (!host) {
    res.status(401).json({ error: "Host account not found" });
    return;
  }
  if (!host.phoneVerified) {
    res.status(403).json({ error: "Phone not verified" });
    return;
  }
  req.hostAccount = host;
  next();
};

// ---- Safe host profile (strips passwordHash) ----
export function safeHost(host: Host) {
  const { passwordHash: _, ...safe } = host;
  return safe;
}
