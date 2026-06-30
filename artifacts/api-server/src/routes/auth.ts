import { Router, type IRouter } from "express";
import { z } from "zod";
import { store } from "../lib/store.js";
import {
  getPendingRegistration,
  deletePendingRegistration,
  storePendingRegistration,
  hashPassword,
  comparePassword,
  signToken,
  requireHost,
  safeHost,
} from "../lib/auth.js";
import { sendVerification, checkVerification } from "../lib/twilio.js";

const router: IRouter = Router();

const SignupRequestOtpSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(7, "Invalid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const SignupVerifyOtpSchema = z.object({
  phone: z.string().min(1),
  otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
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

  try {
    await sendVerification(phone);
  } catch (err: any) {
    req.log.error({ phone, err: err?.message }, "Failed to send Twilio OTP");
    res.status(502).json({ error: "Failed to send OTP. Please try again." });
    return;
  }

  storePendingRegistration(fullName, email, phone, passwordHash);
  req.log.info({ phone }, "Signup OTP sent via Twilio Verify");

  res.json({
    success: true,
    message: `OTP sent to ${phone}`,
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
      error: "No pending registration found. Please start signup again.",
    });
    return;
  }

  let approved: boolean;
  try {
    approved = await checkVerification(phone, otp);
  } catch (err: any) {
    req.log.error({ phone, err: err?.message }, "Twilio verify check failed");
    res.status(502).json({ error: "Failed to verify OTP. Please try again." });
    return;
  }

  if (!approved) {
    res.status(400).json({ error: "Invalid or expired OTP." });
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
