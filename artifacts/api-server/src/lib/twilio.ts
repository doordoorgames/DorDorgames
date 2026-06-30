import twilio from "twilio";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

export const twilioConfigured =
  Boolean(ACCOUNT_SID) && Boolean(AUTH_TOKEN) && Boolean(VERIFY_SERVICE_SID);

const client = twilioConfigured
  ? twilio(ACCOUNT_SID!, AUTH_TOKEN!)
  : null;

/**
 * Send a verification code to the given phone number via Twilio Verify.
 * When Twilio is not configured, operates in simulation mode (any 6-digit code works).
 */
export async function sendVerification(phone: string): Promise<void> {
  if (!client || !VERIFY_SERVICE_SID) {
    return;
  }
  await client.verify.v2
    .services(VERIFY_SERVICE_SID)
    .verifications.create({ to: phone, channel: "sms" });
}

/**
 * Check whether the provided code is valid for the given phone number.
 * Returns true if approved, false if incorrect/expired.
 * When Twilio is not configured, accepts any 6-digit code (simulation mode).
 */
export async function checkVerification(
  phone: string,
  code: string,
): Promise<boolean> {
  if (!client || !VERIFY_SERVICE_SID) {
    return /^\d{6}$/.test(code);
  }
  const check = await client.verify.v2
    .services(VERIFY_SERVICE_SID)
    .verificationChecks.create({ to: phone, code });
  return check.status === "approved";
}
