import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  createMyFatoorahPayment,
  kwdToFils,
  myFatoorahWebhook,
  verifyMyFatoorahWebhookSignature,
} from "./myfatoorah.js";

test("creates a hosted card payment using the V3 request contract", async () => {
  const previousFetch = globalThis.fetch;
  const previousEnvironment = {
    token: process.env.MYFATOORAH_API_TOKEN,
    baseUrl: process.env.MYFATOORAH_API_BASE_URL,
    appUrl: process.env.PAYMENT_APP_URL,
    apiUrl: process.env.PAYMENT_API_URL,
  };
  process.env.MYFATOORAH_API_TOKEN = "test-token";
  process.env.MYFATOORAH_API_BASE_URL = "https://apitest.myfatoorah.com";
  process.env.PAYMENT_APP_URL = "https://www.dordor.games";
  process.env.PAYMENT_API_URL = "https://api.example.com";

  let requestBody: unknown;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        IsSuccess: true,
        Message: "",
        Data: {
          InvoiceId: "invoice-1",
          PaymentURL: "https://demo.myfatoorah.com/payment-1",
        },
      }),
      { status: 201, headers: { "content-type": "application/json" } },
    );
  };

  try {
    await createMyFatoorahPayment({
      amountFils: 2_000,
      customer: {
        name: "Test Host",
        email: "host@example.com",
        mobile: "+96550000000",
      },
    });
    assert.deepEqual(requestBody, {
      PaymentMethod: "CARD",
      Order: { Amount: 2 },
      Customer: {
        Name: "Test Host",
        Email: "host@example.com",
        Mobile: "+96550000000",
      },
      IntegrationUrls: {
        Redirection: "https://api.example.com/api/checkout/callback",
      },
      Language: "EN",
      OperationType: "PAY",
      NotificationOption: "LINK",
    });

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          IsSuccess: false,
          Message: null,
          ValidationErrors: [
            { Name: "Customer.Mobile", Error: "Invalid mobile number" },
          ],
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    await assert.rejects(
      createMyFatoorahPayment({
        amountFils: 2_000,
        customer: {
          name: "Test Host",
          email: "host@example.com",
          mobile: "+96550000000",
        },
      }),
      /MyFatoorah: Customer\.Mobile: Invalid mobile number/,
    );
  } finally {
    globalThis.fetch = previousFetch;
    const restore = (name: string, value: string | undefined) => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    };
    restore("MYFATOORAH_API_TOKEN", previousEnvironment.token);
    restore("MYFATOORAH_API_BASE_URL", previousEnvironment.baseUrl);
    restore("PAYMENT_APP_URL", previousEnvironment.appUrl);
    restore("PAYMENT_API_URL", previousEnvironment.apiUrl);
  }
});

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
