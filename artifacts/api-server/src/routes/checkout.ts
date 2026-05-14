import { Router, type IRouter } from "express";
import {
  ValidatePromoBody,
  ProcessPaymentBody,
} from "@workspace/api-zod";
import { store } from "../lib/store";

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

router.post("/checkout/pay", (req, res) => {
  const body = ProcessPaymentBody.parse(req.body);
  const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

  if (body.promoCode) {
    const code = body.promoCode.toUpperCase().trim();
    const isBuiltIn = store.isValidBuiltInPromo(code);
    const stored = store.promoCodes.get(code);
    const isValid = isBuiltIn || (stored?.active ?? false);

    if (isValid) {
      if (!isBuiltIn && stored) {
        store.promoCodes.incrementUsage(code);
      }
      res.json({
        success: true,
        free: true,
        message: "Promo code accepted. 3-hour host pass activated. No charge.",
        expiresAt,
      });
      return;
    }
  }

  req.log.info({ phone: body.phone }, "Simulated payment processed");
  res.json({
    success: true,
    free: false,
    message: "Payment of 2 KD processed (simulated). 3-hour host pass activated.",
    expiresAt,
  });
});

export default router;
