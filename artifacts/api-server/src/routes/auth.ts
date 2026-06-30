import { Router, type IRouter } from "express";
import { z } from "zod";
import { store } from "../lib/store.js";
import {
  createPendingRegistration,
  getPendingRegistration,
  deletePendingRegistration,
  hashPassword,
  comparePassword,
  signToken,
  requireHost,
  safeHost,
} from "../lib/auth.js";

const router: IRouter = Router();

const SignupRequestOtpSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(7, "Invalid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const SignupVerifyOtpSchema = z.object({
  phone: z.string().min(1),
  otp: z.string().regex(/^\d{4}$/, "OTP must be exactly 4 digits"),
});

const LoginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});

router.post("/auth/signup/request-otp", async (req, res) => {
  const result = SignupRequestOtpSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "Invalid input",
      details: result.error.issues.map((i) => i.message),
    });
    return;
  }
  const { fullName, email, phone, password } = result.data;

  const byPhone = store.hosts.getByPhone(phone);
  if (byPhone?.phoneVerified) {
    res.status(409).json({ error: "Phone number is already registered" });
    return;
  }

  const byEmail = store.hosts.getByEmail(email);
  if (byEmail?.phoneVerified) {
    res.status(409).json({ error: "Email address is already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const { otp } = createPendingRegistration(fullName, email, phone, passwordHash);

  req.log.info({ phone, otp }, "Signup OTP generated (simulated)");

  res.json({
    success: true,
    message: `OTP sent to ${phone} (simulated — use any 4-digit code)`,
  });
});

router.post("/auth/signup/verify-otp", async (req, res) => {
  const result = SignupVerifyOtpSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "Invalid input",
      details: result.error.issues.map((i) => i.message),
    });
    return;
  }
  const { phone, otp } = result.data;

  const pending = getPendingRegistration(phone);
  if (!pending) {
    res.status(400).json({
      error: "No pending registration found for this phone, or the OTP has expired. Please start signup again.",
    });
    return;
  }

  const existingVerified = store.hosts.getByPhone(phone);
  if (existingVerified?.phoneVerified) {
    deletePendingRegistration(phone);
    res.status(409).json({ error: "Phone number is already registered" });
    return;
  }

  const host = store.hosts.create({
    fullName: pending.fullName,
    email: pending.email,
    phone: pending.phone,
    passwordHash: pending.passwordHash,
    phoneVerified: true,
    trialUsed: true,
    remainingMinutes: 60,
  });

  deletePendingRegistration(phone);
  req.log.info({ hostId: host.id, phone }, "Host account created — 60-min free trial granted");

  const token = signToken(host.id);
  res.status(201).json({ token, host: safeHost(host) });
});

router.post("/auth/login", async (req, res) => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { identifier, password } = result.data;

  const host = store.hosts.getByIdentifier(identifier);
  if (!host) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await comparePassword(password, host.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!host.phoneVerified) {
    res.status(403).json({
      error: "Phone not verified. Please complete the signup OTP step first.",
    });
    return;
  }

  const token = signToken(host.id);
  req.log.info({ hostId: host.id }, "Host logged in");
  res.json({ token, host: safeHost(host) });
});

router.get("/auth/me", requireHost, (req, res) => {
  res.json(safeHost(req.hostAccount!));
});

export default router;
