import { hash as bcryptHash, compare as bcryptCompare, getRounds } from "bcryptjs";
import jwt from "jsonwebtoken";
import type { RequestHandler, Response } from "express";
import {
  findAccount,
  sessionIsActive,
  type Account,
  type AccountRole,
  type SessionGrant,
} from "./accounts.js";
import { isMockVerification } from "./twilio.js";

declare global {
  namespace Express {
    interface Request {
      account?: Account;
      hostAccount?: Extract<Account, { role: "host" }>;
      authSessionId?: string;
    }
  }
}

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
const JWT_ISSUER = "dordor.games";
const JWT_AUDIENCE = "dordor-web";
const production = process.env.NODE_ENV === "production";
const cookiePrefix = production ? "__Host-" : "";

export const ACCESS_COOKIE = `${cookiePrefix}dordor_access`;
export const REFRESH_COOKIE = `${cookiePrefix}dordor_refresh`;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge,
  };
}

function getJwtSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

interface JwtPayload {
  sub: string;
  sid: string;
  role: AccountRole;
  iat?: number;
  exp?: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcryptHash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptCompare(password, hash);
}

export function passwordNeedsRehash(hash: string): boolean {
  return getRounds(hash) < SALT_ROUNDS;
}

export function signAccessToken(accountId: string, role: AccountRole, sessionId: string): string {
  return jwt.sign({ sub: accountId, role, sid: sessionId }, getJwtSecret(), {
    algorithm: "HS256",
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER,
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
  });
}

function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
    }) as JwtPayload;
  } catch {
    return null;
  }
}

export function setSessionCookies(res: Response, grant: SessionGrant): void {
  res.cookie(
    ACCESS_COOKIE,
    signAccessToken(grant.accountId, grant.role, grant.sessionId),
    cookieOptions(ACCESS_TOKEN_EXPIRY_SECONDS * 1000),
  );
  res.cookie(
    REFRESH_COOKIE,
    `${grant.sessionId}.${grant.refreshToken}`,
    cookieOptions(REFRESH_TOKEN_EXPIRY_MS),
  );
}

export function clearSessionCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, cookieOptions(0));
  res.clearCookie(REFRESH_COOKIE, cookieOptions(0));
}

function requestToken(req: Parameters<RequestHandler>[0]): string | undefined {
  const cookieToken = req.cookies?.[ACCESS_COOKIE];
  if (typeof cookieToken === "string" && cookieToken) return cookieToken;
  const header = req.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}

async function resolveAccount(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
): Promise<Account | null> {
  const token = requestToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  const payload = verifyAccessToken(token);
  if (!payload?.sub || !payload.sid || !["host", "participant"].includes(payload.role)) {
    res.status(401).json({ error: "Invalid or expired session" });
    return null;
  }
  if (!(await sessionIsActive(payload.sid, payload.sub, payload.role))) {
    res.status(401).json({ error: "Session has ended" });
    return null;
  }
  const account = await findAccount(payload.role, payload.sub);
  if (!account || (!account.phoneVerified && !isMockVerification(account.phone))) {
    res.status(401).json({ error: "Account is unavailable" });
    return null;
  }
  req.account = account;
  req.authSessionId = payload.sid;
  return account;
}

export const requireAccount: RequestHandler = async (req, res, next) => {
  const account = await resolveAccount(req, res);
  if (!account) return;
  next();
};

export const requireHostIdentity: RequestHandler = async (req, res, next) => {
  const account = await resolveAccount(req, res);
  if (!account) return;
  if (account.role !== "host") {
    res.status(403).json({ error: "Host account required" });
    return;
  }
  req.hostAccount = account;
  next();
};

export const requireHost: RequestHandler = async (req, res, next) => {
  const account = await resolveAccount(req, res);
  if (!account) return;
  if (account.role !== "host") {
    res.status(403).json({ error: "Host account required" });
    return;
  }
  if (account.remainingMinutes <= 0) {
    res.status(403).json({ error: "No hosting time remaining. Please purchase more time." });
    return;
  }
  req.hostAccount = account;
  next();
};

export function safeAccount(account: Account) {
  const { passwordHash: _, ...safe } = account;
  return account.role === "participant"
    ? { ...safe, trialUsed: false, remainingMinutes: 0, fullAccess: false }
    : safe;
}
