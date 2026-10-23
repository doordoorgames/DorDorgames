import { Router, type IRouter } from "express";
import {
  ValidatePromoBody,
  ProcessPaymentBody,
} from "@workspace/api-zod";
import { store } from "../lib/store.js";
import { requireHostIdentity } from "../lib/auth.js";

const router: IRouter = Router();

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

router.post("/checkout/pay", requireHostIdentity, async (req, res) => {
  const body = ProcessPaymentBody.parse(req.body);
  const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  const MINUTES_PER_PASS = 180;

  const hostId = req.hostAccount!.id;

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
      const remainingMinutes = await creditHost(hostId);
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

    res.status(400).json({
      success: false,
      free: false,
      message: "Invalid or expired promo code",
    });
    return;
  }

  res.status(503).json({
    success: false,
    free: false,
    message: "Payment gateway is not active yet.",
  });
});

export default router;
