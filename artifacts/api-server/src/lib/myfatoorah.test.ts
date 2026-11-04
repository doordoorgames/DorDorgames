import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  kwdToFils,
  myFatoorahWebhook,
  verifyMyFatoorahWebhookSignature,
} from "./myfatoorah.js";

test("converts KWD decimal values to integer fils", () => {
  assert.equal(kwdToFils("2"), 2_000);
  assert.equal(kwdToFils("6.5"), 6_500);
  assert.equal(kwdToFils("10.025"), 10_025);
  assert.equal(kwdToFils("2.0001"), null);
  assert.equal(kwdToFils("not-money"), null);
});

test("verifies the documented MyFatoorah payment webhook signature order", () => {
  const previous = process.env.MYFATOORAH_WEBHOOK_SECRET;
  process.env.MYFATOORAH_WEBHOOK_SECRET = "test-secret";
  try {
    const payload = myFatoorahWebhook.parse({
      Event: { Code: 1, Name: "PAYMENT_STATUS_CHANGED" },
      Data: {
        Invoice: {
          Id: "6409988",
          Status: "PAID",
          ExternalIdentifier: "order-1",
        },
        Transaction: { Status: "SUCCESS", PaymentId: "payment-1" },
      },
    });
    const signedData =
      "Invoice.Id=6409988,Invoice.Status=PAID,Transaction.Status=SUCCESS,Transaction.PaymentId=payment-1,Invoice.ExternalIdentifier=order-1";
    const signature = createHmac("sha256", "test-secret")
      .update(signedData)
      .digest("base64");
    assert.equal(verifyMyFatoorahWebhookSignature(signature, payload), true);
    assert.equal(
      verifyMyFatoorahWebhookSignature(`${signature}x`, payload),
      false,
    );
  } finally {
    if (previous === undefined) delete process.env.MYFATOORAH_WEBHOOK_SECRET;
    else process.env.MYFATOORAH_WEBHOOK_SECRET = previous;
  }
});
