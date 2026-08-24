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
// OTP lifecycle is managed by Twilio Verify — we only store user details here.
interface PendingRegistration {
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  expiresAt: number;
}

const pendingRegistrations = new Map<string, PendingRegistration>();
const OTP_TTL_MS = 10 * 60 * 1000;

export function storePendingRegistration(
  fullName: string,
  email: string,
  phone: string,
  passwordHash: string,
): void {
  pendingRegistrations.set(phone, {
    fullName,
    email,
    phone,
    passwordHash,
    expiresAt: Date.now() + OTP_TTL_MS,
  });
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
const JWT_EXPIRY = "7d";

function getJwtSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET environment variable is required for auth routes but is not set.",
    );
  }
  return secret;
}

interface JwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

export function signToken(hostId: string): string {
  return jwt.sign({ sub: hostId }, getJwtSecret(), { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch {
    return null;
  }
}

// ---- Auth middleware helpers ----
async function resolveHost(req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1]): Promise<Host | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload?.sub) {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
  const host = await store.hosts.get(payload.sub);
  if (!host) {
    res.status(401).json({ error: "Host account not found" });
    return null;
  }
  if (!host.phoneVerified) {
    res.status(403).json({ error: "Phone not verified" });
    return null;
  }
  return host;
}

/** JWT + phoneVerified — identity check only. Use for /auth/me. */
export const requireHostIdentity: RequestHandler = async (req, res, next) => {
  const host = await resolveHost(req, res);
  if (!host) return;
  req.hostAccount = host;
  next();
};

/** JWT + phoneVerified + remainingMinutes > 0 — use for room mutations. */
export const requireHost: RequestHandler = async (req, res, next) => {
  const host = await resolveHost(req, res);
  if (!host) return;
  if (host.remainingMinutes <= 0) {
    res.status(403).json({ error: "No hosting time remaining. Please purchase more time." });
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
