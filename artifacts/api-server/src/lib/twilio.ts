import twilio from "twilio";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;
const MOCK_PHONE = process.env.OTP_MOCK_PHONE;
const MOCK_CODE = process.env.OTP_MOCK_CODE;
const MOCK_ALL = process.env.OTP_MOCK_ALL === "true";
const MOCK_UNTIL = process.env.OTP_MOCK_UNTIL;

if (MOCK_PHONE && !/^\+[1-9]\d{7,14}$/.test(MOCK_PHONE)) {
  throw new Error("OTP_MOCK_PHONE must be an international phone number.");
}
if (MOCK_CODE && !/^\d{6}$/.test(MOCK_CODE)) {
  throw new Error("OTP_MOCK_CODE must be exactly 6 digits.");
}
if (
  MOCK_ALL &&
  (!MOCK_CODE || !MOCK_UNTIL || Number.isNaN(Date.parse(MOCK_UNTIL)))
) {
  throw new Error(
    "OTP_MOCK_ALL requires OTP_MOCK_CODE and a valid OTP_MOCK_UNTIL date.",
  );
}
if (!MOCK_ALL && Boolean(MOCK_PHONE) !== Boolean(MOCK_CODE)) {
  throw new Error(
    "OTP_MOCK_PHONE and OTP_MOCK_CODE must be configured together.",
  );
}

export const twilioConfigured =
  Boolean(ACCOUNT_SID) && Boolean(AUTH_TOKEN) && Boolean(VERIFY_SERVICE_SID);

const client = twilioConfigured ? twilio(ACCOUNT_SID!, AUTH_TOKEN!) : null;

export function isMockVerification(phone: string): boolean {
  if (!MOCK_CODE) return false;
  if (MOCK_ALL) return Date.now() < Date.parse(MOCK_UNTIL!);
  return phone === MOCK_PHONE;
}

function requireTwilio(): void {
  if (!client || !VERIFY_SERVICE_SID) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID.",
    );
  }
}

/**
 * Send a verification code to the given phone number via Twilio Verify.
 * Throws if Twilio credentials are not configured.
 */
export async function sendVerification(phone: string): Promise<void> {
  if (isMockVerification(phone)) return;
  requireTwilio();
  await client!.verify.v2
    .services(VERIFY_SERVICE_SID!)
    .verifications.create({ to: phone, channel: "sms" });
}

/**
 * Check whether the provided code is valid for the given phone number.
 * Returns true if approved, false if incorrect/expired.
 * Throws if Twilio credentials are not configured.
 */
export async function checkVerification(
  phone: string,
  code: string,
): Promise<boolean> {
  if (isMockVerification(phone)) return code === MOCK_CODE;
  requireTwilio();
  const check = await client!.verify.v2
    .services(VERIFY_SERVICE_SID!)
    .verificationChecks.create({ to: phone, code });
  return check.status === "approved";
}
