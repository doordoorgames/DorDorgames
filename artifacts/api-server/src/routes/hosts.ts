import { Router, type IRouter } from "express";
import {
  RequestOtpBody,
  VerifyOtpBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const hostSessions = new Map<
  string,
  { phone: string; active: boolean; expiresAt: string | null }
>();

router.post("/hosts/request-otp", (req, res) => {
  const body = RequestOtpBody.parse(req.body);
  req.log.info({ phone: body.phone }, "OTP requested (simulated)");
  res.json({
    success: true,
    message: `OTP sent to ${body.phone} (simulated — use any 4-digit code)`,
  });
});

router.post("/hosts/verify-otp", (req, res) => {
  const body = VerifyOtpBody.parse(req.body);
  const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  hostSessions.set(body.phone, {
    phone: body.phone,
    active: true,
    expiresAt,
  });
  req.log.info({ phone: body.phone }, "Host OTP verified (simulated)");
  res.json({
    phone: body.phone,
    active: true,
    expiresAt,
  });
});

router.get("/hosts/session", (req, res) => {
  const phone = req.query["phone"] as string | undefined;
  if (!phone) {
    res.json({ phone: "", active: false, expiresAt: null });
    return;
  }
  const session = hostSessions.get(phone);
  if (!session) {
    res.json({ phone, active: false, expiresAt: null });
    return;
  }
  const now = new Date().toISOString();
  const active = session.active && (session.expiresAt ?? "") > now;
  res.json({ ...session, active });
});

export default router;
