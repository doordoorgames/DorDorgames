import { createHash, randomBytes } from "node:crypto";
import { pool } from "@workspace/db";
import { store, type Host } from "./store.js";

export type AccountRole = "host" | "participant";

export interface Participant {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Account =
  | ({ role: "host" } & Host)
  | ({ role: "participant" } & Participant);

export interface PendingRegistration {
  role: AccountRole;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  expiresAt: string;
}

interface ParticipantRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

function rowToParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    passwordHash: row.password_hash,
    phoneVerified: row.phone_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s()-]/g, "");
}

export const participants = {
  async get(id: string): Promise<Participant | undefined> {
    const result = await pool.query<ParticipantRow>(
      "SELECT * FROM public.participants WHERE id = $1",
      [id],
    );
    return result.rows[0] ? rowToParticipant(result.rows[0]) : undefined;
  },

  async getByEmail(email: string): Promise<Participant | undefined> {
    const result = await pool.query<ParticipantRow>(
      "SELECT * FROM public.participants WHERE LOWER(email) = $1",
      [normalizeEmail(email)],
    );
    return result.rows[0] ? rowToParticipant(result.rows[0]) : undefined;
  },

  async getByPhone(phone: string): Promise<Participant | undefined> {
    const result = await pool.query<ParticipantRow>(
      "SELECT * FROM public.participants WHERE phone = $1",
      [normalizePhone(phone)],
    );
    return result.rows[0] ? rowToParticipant(result.rows[0]) : undefined;
  },

  async getByIdentifier(identifier: string): Promise<Participant | undefined> {
    return identifier.includes("@")
      ? this.getByEmail(identifier)
      : this.getByPhone(identifier);
  },

  async create(input: Omit<Participant, "id" | "createdAt" | "updatedAt">): Promise<Participant> {
    const result = await pool.query<ParticipantRow>(
      `INSERT INTO public.participants
        (full_name, email, phone, password_hash, phone_verified)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.fullName, normalizeEmail(input.email), normalizePhone(input.phone), input.passwordHash, input.phoneVerified],
    );
    return rowToParticipant(result.rows[0]);
  },

  async updateName(id: string, fullName: string): Promise<Participant | undefined> {
    const result = await pool.query<ParticipantRow>(
      `UPDATE public.participants
       SET full_name = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, fullName],
    );
    return result.rows[0] ? rowToParticipant(result.rows[0]) : undefined;
  },

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await pool.query(
      `UPDATE public.participants
       SET password_hash = $2, updated_at = NOW()
       WHERE id = $1`,
      [id, passwordHash],
    );
  },
};

export async function findAccount(role: AccountRole, id: string): Promise<Account | undefined> {
  if (role === "host") {
    const host = await store.hosts.get(id);
    return host ? { ...host, role } : undefined;
  }
  const participant = await participants.get(id);
  return participant ? { ...participant, role } : undefined;
}

export async function findAccountByIdentifier(
  role: AccountRole,
  identifier: string,
): Promise<Account | undefined> {
  const normalizedIdentifier = identifier.includes("@")
    ? normalizeEmail(identifier)
    : normalizePhone(identifier);
  if (role === "host") {
    const host = await store.hosts.getByIdentifier(normalizedIdentifier);
    return host ? { ...host, role } : undefined;
  }
  const participant = await participants.getByIdentifier(normalizedIdentifier);
  return participant ? { ...participant, role } : undefined;
}

export async function accountExists(email: string, phone: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const [hostEmail, hostPhone, participantEmail, participantPhone] = await Promise.all([
    store.hosts.getByEmail(normalizedEmail),
    store.hosts.getByPhone(normalizedPhone),
    participants.getByEmail(normalizedEmail),
    participants.getByPhone(normalizedPhone),
  ]);
  return Boolean(hostEmail || hostPhone || participantEmail || participantPhone);
}

export async function savePendingRegistration(input: PendingRegistration): Promise<void> {
  await pool.query(
    `INSERT INTO public.pending_registrations
      (phone, role, full_name, email, password_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (phone) DO UPDATE SET
       role = EXCLUDED.role,
       full_name = EXCLUDED.full_name,
       email = EXCLUDED.email,
       password_hash = EXCLUDED.password_hash,
       expires_at = EXCLUDED.expires_at,
       created_at = NOW()`,
    [normalizePhone(input.phone), input.role, input.fullName, normalizeEmail(input.email), input.passwordHash, input.expiresAt],
  );
}

export async function getPendingRegistration(phone: string): Promise<PendingRegistration | undefined> {
  await pool.query("DELETE FROM public.pending_registrations WHERE expires_at <= NOW()");
  const result = await pool.query<{
    role: AccountRole;
    full_name: string;
    email: string;
    phone: string;
    password_hash: string;
    expires_at: string;
  }>(
    `SELECT role, full_name, email, phone, password_hash, expires_at
     FROM public.pending_registrations
     WHERE phone = $1`,
    [normalizePhone(phone)],
  );
  const row = result.rows[0];
  return row
    ? {
        role: row.role,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        passwordHash: row.password_hash,
        expiresAt: row.expires_at,
      }
    : undefined;
}

export async function deletePendingRegistration(phone: string): Promise<void> {
  await pool.query("DELETE FROM public.pending_registrations WHERE phone = $1", [normalizePhone(phone)]);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function makeRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export interface SessionGrant {
  sessionId: string;
  refreshToken: string;
  accountId: string;
  role: AccountRole;
}

export async function createSession(
  accountId: string,
  role: AccountRole,
  userAgent: string | undefined,
): Promise<SessionGrant> {
  const refreshToken = makeRefreshToken();
  const result = await pool.query<{ id: string }>(
    `INSERT INTO public.auth_sessions
      (account_id, role, refresh_token_hash, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')
     RETURNING id`,
    [accountId, role, hashToken(refreshToken), userAgent?.slice(0, 500) ?? null],
  );
  return { sessionId: result.rows[0].id, refreshToken, accountId, role };
}

export async function rotateSession(cookieValue: string): Promise<SessionGrant | undefined> {
  const separator = cookieValue.indexOf(".");
  if (separator < 1) return undefined;
  const sessionId = cookieValue.slice(0, separator);
  const presentedToken = cookieValue.slice(separator + 1);
  if (!presentedToken) return undefined;

  const nextToken = makeRefreshToken();
  const result = await pool.query<{ account_id: string; role: AccountRole }>(
    `UPDATE public.auth_sessions
     SET refresh_token_hash = $3, last_used_at = NOW()
     WHERE id = $1
       AND refresh_token_hash = $2
       AND revoked_at IS NULL
       AND expires_at > NOW()
     RETURNING account_id, role`,
    [sessionId, hashToken(presentedToken), hashToken(nextToken)],
  );
  const row = result.rows[0];
  if (!row) {
    await pool.query(
      "UPDATE public.auth_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE id = $1",
      [sessionId],
    );
    return undefined;
  }
  return { sessionId, refreshToken: nextToken, accountId: row.account_id, role: row.role };
}

export async function sessionIsActive(
  sessionId: string,
  accountId: string,
  role: AccountRole,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM public.auth_sessions
     WHERE id = $1 AND account_id = $2 AND role = $3
       AND revoked_at IS NULL AND expires_at > NOW()`,
    [sessionId, accountId, role],
  );
  return result.rowCount === 1;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await pool.query(
    "UPDATE public.auth_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE id = $1",
    [sessionId],
  );
}

export async function revokeAllSessions(accountId: string, role: AccountRole): Promise<void> {
  await pool.query(
    `UPDATE public.auth_sessions SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE account_id = $1 AND role = $2 AND revoked_at IS NULL`,
    [accountId, role],
  );
}

export async function consumeRateLimit(
  rawKey: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const keyHash = hashToken(rawKey);
  const result = await pool.query<{ attempts: number; reset_at: string }>(
    `INSERT INTO public.auth_rate_limits (key_hash, attempts, reset_at)
     VALUES ($1, 1, NOW() + ($2::integer * INTERVAL '1 second'))
     ON CONFLICT (key_hash) DO UPDATE SET
       attempts = CASE
         WHEN public.auth_rate_limits.reset_at <= NOW() THEN 1
         ELSE public.auth_rate_limits.attempts + 1
       END,
       reset_at = CASE
         WHEN public.auth_rate_limits.reset_at <= NOW()
           THEN NOW() + ($2::integer * INTERVAL '1 second')
         ELSE public.auth_rate_limits.reset_at
       END
     RETURNING attempts, reset_at`,
    [keyHash, windowSeconds],
  );
  const row = result.rows[0];
  return {
    allowed: row.attempts <= maxAttempts,
    retryAfterSeconds: Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000)),
  };
}
