import { Router, type IRouter } from "express";
import {
  ValidatePromoBody,
  ProcessPaymentBody,
} from "@workspace/api-zod";
import { store } from "../lib/store.js";
import { verifyToken } from "../lib/auth.js";

const router: IRouter = Router();

async function resolveHostFromRequest(req: Parameters<typeof router.post>[1] extends (req: infer R, ...args: never[]) => unknown ? R : never): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload?.sub) return null;
  const host = await store.hosts.get(payload.sub);
  if (!host?.phoneVerified) return null;
  return host.id;
}

router.post("/checkout/validate-promo", (req, res) => {
  const body = ValidatePromoBody.parse(req.body);
  const code = body.code.toUpperCase().trim();

  const isBuiltIn = store.isValidBuiltInPromo(code);
  const stored = store.promoCodes.get(code);
  const isValid = isBuiltIn || (stored?.active ?? false);

  if (!isValid) {
    res.json({ valid: false, free: false, message: "Invalid or expired promo code" });
    return;
  }

  res.json({
    valid: true,
    free: true,
    message: "Promo code applied! Your 3-hour pass is free.",
  });
});

router.post("/checkout/pay", async (req, res) => {
  const body = ProcessPaymentBody.parse(req.body);
  const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  const MINUTES_PER_PASS = 180;

  const hostId = await resolveHostFromRequest(req as any);

  const creditHost = async (id: string) => {
    const updated = await store.hosts.addTime(id, MINUTES_PER_PASS);
    return updated?.remainingMinutes;
  };

  if (body.promoCode) {
    const code = body.promoCode.toUpperCase().trim();
    const isBuiltIn = store.isValidBuiltInPromo(code);
    const stored = store.promoCodes.get(code);
    const isValid = isBuiltIn || (stored?.active ?? false);

    if (isValid) {
      if (!isBuiltIn && stored) {
        store.promoCodes.incrementUsage(code);
      }
      const remainingMinutes = hostId ? await creditHost(hostId) : undefined;
      req.log.info({ hostId, promo: code }, "Promo checkout — time credited");
      res.json({
        success: true,
        free: true,
        message: "Promo code accepted. 3-hour host pass activated. No charge.",
        expiresAt,
        ...(remainingMinutes !== undefined ? { remainingMinutes } : {}),
      });
      return;
    }
  }

  const remainingMinutes = hostId ? await creditHost(hostId) : undefined;
  req.log.info({ phone: body.phone, hostId }, "Simulated payment processed");
  res.json({
    success: true,
    free: false,
    message: "Payment of 2 KD processed (simulated). 3-hour host pass activated.",
    expiresAt,
    ...(remainingMinutes !== undefined ? { remainingMinutes } : {}),
  });
});

export default router;
