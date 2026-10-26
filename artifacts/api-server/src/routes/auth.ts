import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { store } from "../lib/store.js";
import { FREE_TRIAL_MINUTES, hasActiveSession } from "../lib/host-access.js";
import {
  accountExists,
  consumeRateLimit,
  createSession,
  deletePendingRegistration,
  findAccount,
  findAccountByIdentifier,
  getPendingRegistration,
  normalizeEmail,
  normalizePhone,
  participants,
  revokeAllSessions,
  revokeSession,
  rotateSession,
  savePendingRegistration,
} from "../lib/accounts.js";
import {
  REFRESH_COOKIE,
  clearSessionCookies,
  comparePassword,
  hashPassword,
  passwordNeedsRehash,
  requireAccount,
  requireHost,
  requireHostIdentity,
  safeAccount,
  setSessionCookies,
} from "../lib/auth.js";
import { sendVerification, checkVerification, isMockVerification } from "../lib/twilio.js";

const router: IRouter = Router();
const RoleSchema = z.enum(["host", "participant"]);
const PasswordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

const SignupRequestOtpSchema = z.object({
  role: z.literal("host"),
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().transform(normalizePhone).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, "Use international format, for example +96550000000")),
  password: PasswordSchema,
});

const SignupVerifyOtpSchema = z.object({
  phone: z.string().transform(normalizePhone),
  otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
});

const LoginSchema = z.object({
  role: RoleSchema,
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(72),
});

const ProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
});

const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: PasswordSchema,
});

function requestIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

async function enforceRateLimit(
  req: Request,
  res: Response,
  scope: string,
  identifier: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<boolean> {
  const limit = await consumeRateLimit(
    `${scope}:${requestIp(req)}:${identifier.toLowerCase()}`,
    maxAttempts,
    windowSeconds,
  );
  if (limit.allowed) return true;
  res.setHeader("Retry-After", String(limit.retryAfterSeconds));
  res.status(429).json({ error: "Too many attempts. Please try again later." });
  return false;
}

function refreshCookie(req: Request): string | undefined {
  const value = req.cookies?.[REFRESH_COOKIE];
  return typeof value === "string" && value ? value : undefined;
}

function refreshSessionId(req: Request): string | undefined {
  const value = refreshCookie(req);
  const separator = value?.indexOf(".") ?? -1;
  return separator > 0 ? value!.slice(0, separator) : undefined;
}

router.post("/auth/signup/request-otp", async (req, res) => {
  const result = SignupRequestOtpSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.issues.map((issue) => issue.message) });
    return;
  }
  const { role, fullName, password } = result.data;
  const email = normalizeEmail(result.data.email);
  const phone = normalizePhone(result.data.phone);

  if (!(await enforceRateLimit(req, res, "signup", phone, 5, 60 * 60))) return;
  if (await accountExists(email, phone)) {
    res.status(409).json({ error: "Email or phone is already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  try {
    await sendVerification(phone);
  } catch (error) {
    req.log.error({ error }, "Failed to send signup OTP");
    res.status(502).json({ error: "Failed to send OTP. Please try again." });
    return;
  }

  await savePendingRegistration({
    role,
    fullName,
    email,
    phone,
    passwordHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  res.json({ success: true, message: "Verification code sent" });
});

router.post("/auth/signup/verify-otp", async (req, res) => {
  const result = SignupVerifyOtpSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.issues.map((issue) => issue.message) });
    return;
  }
  const { phone, otp } = result.data;
  if (!(await enforceRateLimit(req, res, "verify", phone, 8, 15 * 60))) return;

  const pending = await getPendingRegistration(phone);
  if (!pending) {
    res.status(400).json({ error: "Signup expired. Please start again." });
    return;
  }

  let approved = false;
  try {
    approved = await checkVerification(phone, otp);
  } catch (error) {
    req.log.error({ error }, "OTP verification failed");
    res.status(502).json({ error: "Failed to verify OTP. Please try again." });
    return;
  }
  if (!approved) {
    res.status(400).json({ error: "Invalid or expired OTP" });
    return;
  }
  if (await accountExists(pending.email, pending.phone)) {
    await deletePendingRegistration(phone);
    res.status(409).json({ error: "Email or phone is already registered" });
    return;
  }

  try {
    const phoneVerified = !isMockVerification(phone);
    const trialStartedAt = new Date();
    const trialEndsAt = new Date(trialStartedAt.getTime() + FREE_TRIAL_MINUTES * 60 * 1000);
    const account = pending.role === "host"
      ? { ...await store.hosts.create({
          fullName: pending.fullName,
          email: pending.email,
          phone: pending.phone,
          passwordHash: pending.passwordHash,
          phoneVerified,
          trialUsed: true,
          remainingMinutes: 0,
          fullAccess: true,
          trialStartedAt: trialStartedAt.toISOString(),
          trialEndsAt: trialEndsAt.toISOString(),
          activeSessionEndsAt: trialEndsAt.toISOString(),
        }), role: "host" as const }
      : { ...await participants.create({
          fullName: pending.fullName,
          email: pending.email,
          phone: pending.phone,
          passwordHash: pending.passwordHash,
          phoneVerified,
        }), role: "participant" as const };

    await deletePendingRegistration(phone);
    const grant = await createSession(account.id, account.role, req.get("user-agent"));
    setSessionCookies(res, grant);
    res.status(201).json({ account: safeAccount(account) });
  } catch (error) {
    req.log.error({ error }, "Account creation failed");
    res.status(409).json({ error: "Unable to create account" });
  }
});

router.post("/auth/login", async (req, res) => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { role, identifier, password } = result.data;
  const normalizedIdentifier = identifier.includes("@")
    ? normalizeEmail(identifier)
    : normalizePhone(identifier);
  if (!(await enforceRateLimit(req, res, "login", `${role}:${normalizedIdentifier}`, 10, 15 * 60))) return;

  const account = await findAccountByIdentifier(role, normalizedIdentifier);
  const valid = account ? await comparePassword(password, account.passwordHash) : false;
  if (!account || !valid || (!account.phoneVerified && !isMockVerification(account.phone))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (passwordNeedsRehash(account.passwordHash)) {
    const passwordHash = await hashPassword(password);
    if (role === "host") await store.hosts.update(account.id, { passwordHash });
    else await participants.updatePassword(account.id, passwordHash);
  }

  const grant = await createSession(account.id, account.role, req.get("user-agent"));
  setSessionCookies(res, grant);
  res.json({ account: safeAccount(account) });
});

router.post("/auth/refresh", async (req, res) => {
  const cookie = refreshCookie(req);
  if (!cookie) {
    clearSessionCookies(res);
    res.status(401).json({ error: "Session expired" });
    return;
  }
  const grant = await rotateSession(cookie);
  if (!grant) {
    clearSessionCookies(res);
    res.status(401).json({ error: "Session expired" });
    return;
  }
  const account = await findAccount(grant.role, grant.accountId);
  if (!account) {
    await revokeSession(grant.sessionId);
    clearSessionCookies(res);
    res.status(401).json({ error: "Account is unavailable" });
    return;
  }
  setSessionCookies(res, grant);
  res.json({ account: safeAccount(account) });
});

router.get("/auth/me", requireAccount, (req, res) => {
  res.json(safeAccount(req.account!));
});

router.post("/auth/host-session/activate", requireHost, (req, res) => {
  res.json({ active: true, sessionEndsAt: req.hostSessionEndsAt });
});

router.get("/auth/host-session", requireHostIdentity, (req, res) => {
  const host = req.hostAccount!;
  res.json({ active: hasActiveSession(host), sessionEndsAt: host.activeSessionEndsAt });
});

router.patch("/auth/profile", requireAccount, async (req, res) => {
  const result = ProfileSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Full name must be between 2 and 80 characters" });
    return;
  }
  const account = req.account!;
  const updated = account.role === "host"
    ? await store.hosts.update(account.id, { fullName: result.data.fullName })
    : await participants.updateName(account.id, result.data.fullName);
  if (!updated) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json(safeAccount({ ...updated, role: account.role } as typeof account));
});

router.post("/auth/change-password", requireAccount, async (req, res) => {
  const result = PasswordChangeSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid password", details: result.error.issues.map((issue) => issue.message) });
    return;
  }
  const account = req.account!;
  if (!(await comparePassword(result.data.currentPassword, account.passwordHash))) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  const passwordHash = await hashPassword(result.data.newPassword);
  if (account.role === "host") await store.hosts.update(account.id, { passwordHash });
  else await participants.updatePassword(account.id, passwordHash);

  await revokeAllSessions(account.id, account.role);
  const grant = await createSession(account.id, account.role, req.get("user-agent"));
  setSessionCookies(res, grant);
  res.status(204).send();
});

router.post("/auth/logout", async (req, res) => {
  const sessionId = req.authSessionId ?? refreshSessionId(req);
  if (sessionId) await revokeSession(sessionId);
  clearSessionCookies(res);
  res.status(204).send();
});

router.post("/auth/logout-all", requireAccount, async (req, res) => {
  await revokeAllSessions(req.account!.id, req.account!.role);
  clearSessionCookies(res);
  res.status(204).send();
});

export default router;

