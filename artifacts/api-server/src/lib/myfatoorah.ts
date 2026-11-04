import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const createPaymentResponse = z.object({
  IsSuccess: z.boolean(),
  Message: z.string().optional().default(""),
  Data: z.object({
    InvoiceId: z.union([z.string(), z.number()]).transform(String),
    PaymentURL: z.string().url(),
  }),
});

const paymentDetailsResponse = z.object({
  IsSuccess: z.boolean(),
  Message: z.string().optional().default(""),
  Data: z.object({
    Invoice: z.object({
      Id: z.union([z.string(), z.number()]).transform(String),
      Status: z.string(),
    }),
    Transaction: z.object({
      Status: z.string(),
      PaymentId: z.string(),
      PaymentMethod: z.string().optional().default("UNKNOWN"),
    }),
    Amount: z.object({
      BaseCurrency: z.string(),
      ValueInBaseCurrency: z.union([z.string(), z.number()]).transform(String),
    }),
  }),
});

export const myFatoorahWebhook = z.object({
  Event: z.object({
    Code: z.number(),
    Name: z.string(),
  }),
  Data: z.object({
    Invoice: z.object({
      Id: z.union([z.string(), z.number()]).transform(String),
      Status: z.string(),
      ExternalIdentifier: z.string().nullish(),
    }),
    Transaction: z.object({
      Status: z.string(),
      PaymentId: z.string(),
    }),
  }),
});

export type MyFatoorahPaymentDetails = z.infer<
  typeof paymentDetailsResponse
>["Data"];

function configuration() {
  const token = process.env.MYFATOORAH_API_TOKEN?.trim();
  const baseUrl = process.env.MYFATOORAH_API_BASE_URL?.trim().replace(
    /\/+$/,
    "",
  );
  const appUrl = process.env.PAYMENT_APP_URL?.trim().replace(/\/+$/, "");
  const apiUrl = process.env.PAYMENT_API_URL?.trim().replace(/\/+$/, "");
  if (!token || !baseUrl || !appUrl || !apiUrl) {
    throw new Error("MyFatoorah payment configuration is incomplete");
  }
  if (
    !/^https:\/\//.test(baseUrl) ||
    !/^https:\/\//.test(appUrl) ||
    !/^https:\/\//.test(apiUrl)
  ) {
    throw new Error("MyFatoorah payment URLs must use HTTPS");
  }
  return { token, baseUrl, appUrl, apiUrl };
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const { token, baseUrl } = configuration();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(30_000),
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `MyFatoorah returned an unreadable response (${response.status})`,
    );
  }
  if (!response.ok) {
    const message = z
      .object({ Message: z.string().optional() })
      .safeParse(data);
    throw new Error(
      message.success && message.data.Message
        ? `MyFatoorah: ${message.data.Message}`
        : `MyFatoorah request failed (${response.status})`,
    );
  }
  return data;
}

export async function createMyFatoorahPayment(input: {
  amountFils: number;
  customer: { name: string; email: string; mobile: string };
}): Promise<{ invoiceId: string; paymentUrl: string }> {
  const { apiUrl } = configuration();
  const raw = await request("/v3/payments", {
    method: "POST",
    body: JSON.stringify({
      Order: { Amount: input.amountFils / 1_000 },
      Customer: {
        Name: input.customer.name,
        Email: input.customer.email,
        Mobile: input.customer.mobile,
      },
      IntegrationUrls: {
        Redirection: `${apiUrl}/api/checkout/callback`,
      },
      Language: "EN",
      OperationType: "PAY",
      NotificationOption: "LINK",
    }),
  });
  const parsed = createPaymentResponse.parse(raw);
  if (!parsed.IsSuccess)
    throw new Error(parsed.Message || "MyFatoorah rejected the payment");
  return {
    invoiceId: parsed.Data.InvoiceId,
    paymentUrl: parsed.Data.PaymentURL,
  };
}

export async function getMyFatoorahPayment(
  paymentId: string,
): Promise<MyFatoorahPaymentDetails> {
  const raw = await request(`/v3/payments/${encodeURIComponent(paymentId)}`);
  const parsed = paymentDetailsResponse.parse(raw);
  if (!parsed.IsSuccess)
    throw new Error(parsed.Message || "Unable to verify MyFatoorah payment");
  return parsed.Data;
}

export function kwdToFils(value: string): number | null {
  if (!/^\d+(?:\.\d{1,3})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const fils = Number(whole) * 1_000 + Number(fraction.padEnd(3, "0"));
  return Number.isSafeInteger(fils) ? fils : null;
}

export function paymentResultUrl(orderId?: string): string {
  const { appUrl } = configuration();
  return orderId
    ? `${appUrl}/payment-result?order=${encodeURIComponent(orderId)}`
    : `${appUrl}/payment-result`;
}

export function verifyMyFatoorahWebhookSignature(
  signature: string | undefined,
  payload: z.infer<typeof myFatoorahWebhook>,
): boolean {
  const secret = process.env.MYFATOORAH_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const signedData = [
    `Invoice.Id=${payload.Data.Invoice.Id}`,
    `Invoice.Status=${payload.Data.Invoice.Status}`,
    `Transaction.Status=${payload.Data.Transaction.Status}`,
    `Transaction.PaymentId=${payload.Data.Transaction.PaymentId}`,
    `Invoice.ExternalIdentifier=${payload.Data.Invoice.ExternalIdentifier ?? ""}`,
  ].join(",");
  const expected = createHmac("sha256", secret)
    .update(signedData, "utf8")
    .digest("base64");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
