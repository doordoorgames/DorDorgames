import twilio from "twilio";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

const twilioConfigured =
  Boolean(ACCOUNT_SID) && Boolean(AUTH_TOKEN) && Boolean(VERIFY_SERVICE_SID);

const client = twilioConfigured
  ? twilio(ACCOUNT_SID!, AUTH_TOKEN!)
  : null;

/**
 * Send a verification code to the given phone number via Twilio Verify.
 * Throws if Twilio is not configured or the send fails.
 */
export async function sendVerification(phone: string): Promise<void> {
  if (!client || !VERIFY_SERVICE_SID) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID.",
    );
  }
  await client.verify.v2
    .services(VERIFY_SERVICE_SID)
    .verifications.create({ to: phone, channel: "sms" });
}

/**
 * Check whether the provided code is valid for the given phone number.
 * Returns true if approved, false if incorrect/expired.
 * Throws if Twilio is not configured or the check itself fails.
 */
export async function checkVerification(
  phone: string,
  code: string,
): Promise<boolean> {
  if (!client || !VERIFY_SERVICE_SID) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID.",
    );
  }
  const check = await client.verify.v2
    .services(VERIFY_SERVICE_SID)
    .verificationChecks.create({ to: phone, code });
  return check.status === "approved";
}

export { twilioConfigured };
