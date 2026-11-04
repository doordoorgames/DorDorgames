import { Router, type IRouter } from "express";
import { ProcessPaymentBody } from "@workspace/api-zod";
import { requireHostIdentity } from "../lib/auth.js";
import { consumeRateLimit } from "../lib/accounts.js";
import { getPaymentPackage } from "../lib/payment-packages.js";
import { paymentStore, type PaymentOrder } from "../lib/payment-store.js";
import {
  createMyFatoorahPayment,
  getMyFatoorahPayment,
  kwdToFils,
  myFatoorahWebhook,
  paymentResultUrl,
  verifyMyFatoorahWebhookSignature,
  type MyFatoorahPaymentDetails,
} from "../lib/myfatoorah.js";

const router: IRouter = Router();

function publicOrder(order: PaymentOrder) {
  return {
    id: order.id,
    packageId: order.packageId,
    amountFils: order.amountFils,
    currency: order.currency,
    minutes: order.minutes,
    status: order.status,
    paymentMethod: order.paymentMethod,
    failureMessage: order.failureMessage,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
  };
}

async function reconcilePayment(
  order: PaymentOrder,
  details: MyFatoorahPaymentDetails,
): Promise<PaymentOrder> {
  if (details.Invoice.Id !== order.invoiceId) {
    throw new Error("MyFatoorah invoice does not match this order");
  }
  const amountFils = kwdToFils(details.Amount.ValueInBaseCurrency);
  if (
    details.Amount.BaseCurrency !== order.currency ||
    amountFils !== order.amountFils
  ) {
    throw new Error("MyFatoorah amount does not match this order");
  }
  const successful =
    details.Invoice.Status === "PAID" &&
    details.Transaction.Status === "SUCCESS";
  if (!successful) {
    if (details.Transaction.Status === "CANCELED") {
      return paymentStore.markGatewayStatus(order.id, "cancelled");
    }
    if (details.Transaction.Status === "FAILED") {
      return paymentStore.markGatewayStatus(order.id, "failed");
    }
    return order;
  }
  return paymentStore.fulfill({
    orderId: order.id,
    paymentId: details.Transaction.PaymentId,
    paymentMethod: details.Transaction.PaymentMethod,
  });
}

router.post("/checkout/validate-promo", (_req, res) => {
  res.json({
    valid: false,
    free: false,
    message: "Promo codes are unavailable during launch.",
  });
});

router.post("/checkout/pay", requireHostIdentity, async (req, res) => {
  const parsed = ProcessPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ success: false, message: "Choose a valid game pass." });
    return;
  }

  const host = req.hostAccount!;
  const selected = getPaymentPackage(parsed.data.packageId);
  if (!selected) {
    res
      .status(400)
      .json({ success: false, message: "This game pass is unavailable." });
    return;
  }

  const limit = await consumeRateLimit(`payment:${host.id}`, 5, 60);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    res.status(429).json({
      success: false,
      message: "Too many payment attempts. Please wait a minute.",
    });
    return;
  }

  const order = await paymentStore.create({
    hostId: host.id,
    packageId: selected.id,
    amountFils: selected.amountFils,
    minutes: selected.minutes,
  });

  try {
    const gateway = await createMyFatoorahPayment({
      amountFils: selected.amountFils,
    });
    await paymentStore.attachInvoice(order.id, gateway.invoiceId);
    req.log.info(
      { orderId: order.id, invoiceId: gateway.invoiceId },
      "MyFatoorah payment created",
    );
    res.status(201).json({
      success: true,
      orderId: order.id,
      paymentUrl: gateway.paymentUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Payment service is unavailable";
    await paymentStore.markFailed(order.id, message);
    req.log.error(
      { orderId: order.id, err: error, errorMessage: message },
      "Unable to create MyFatoorah payment",
    );
    const sandbox = process.env.MYFATOORAH_API_BASE_URL?.includes(
      "apitest.myfatoorah.com",
    );
    res.status(502).json({
      success: false,
      message: sandbox
        ? `Sandbox payment error: ${message}`
        : "The payment page could not be opened. Please try again.",
    });
  }
});

router.get(
  "/checkout/payments/:orderId",
  requireHostIdentity,
  async (req, res) => {
    const orderId = Array.isArray(req.params.orderId)
      ? req.params.orderId[0]
      : req.params.orderId;
    const order = await paymentStore.getByIdForHost(
      orderId,
      req.hostAccount!.id,
    );
    if (!order) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }
    res.json(publicOrder(order));
  },
);

router.get("/checkout/callback", async (req, res) => {
  const paymentId =
    typeof req.query.paymentId === "string" ? req.query.paymentId : "";
  if (!paymentId) {
    res.redirect(303, paymentResultUrl());
    return;
  }

  try {
    const details = await getMyFatoorahPayment(paymentId);
    const order = await paymentStore.getByInvoiceId(details.Invoice.Id);
    if (!order) {
      req.log.warn(
        { invoiceId: details.Invoice.Id },
        "Callback received for unknown invoice",
      );
      res.redirect(303, paymentResultUrl());
      return;
    }
    const reconciled = await reconcilePayment(order, details);
    req.log.info(
      { orderId: order.id, status: reconciled.status },
      "MyFatoorah callback reconciled",
    );
    res.redirect(303, paymentResultUrl(order.id));
  } catch (error) {
    req.log.error({ error }, "Unable to reconcile MyFatoorah callback");
    res.redirect(303, paymentResultUrl());
  }
});

router.post("/checkout/webhook", async (req, res) => {
  const parsed = myFatoorahWebhook.safeParse(req.body);
  if (
    !parsed.success ||
    parsed.data.Event.Code !== 1 ||
    parsed.data.Event.Name !== "PAYMENT_STATUS_CHANGED"
  ) {
    res.status(400).json({ error: "Unsupported webhook" });
    return;
  }
  const signature = req.get("myfatoorah-signature");
  if (!verifyMyFatoorahWebhookSignature(signature, parsed.data)) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  try {
    const details = await getMyFatoorahPayment(
      parsed.data.Data.Transaction.PaymentId,
    );
    const order = await paymentStore.getByInvoiceId(details.Invoice.Id);
    if (!order) {
      req.log.warn(
        { invoiceId: details.Invoice.Id },
        "Webhook received for unknown invoice",
      );
      res.sendStatus(200);
      return;
    }
    const reconciled = await reconcilePayment(order, details);
    req.log.info(
      { orderId: order.id, status: reconciled.status },
      "MyFatoorah webhook reconciled",
    );
    res.sendStatus(200);
  } catch (error) {
    req.log.error({ error }, "Unable to reconcile MyFatoorah webhook");
    res
      .status(503)
      .json({ error: "Payment verification is temporarily unavailable" });
  }
});

export default router;
