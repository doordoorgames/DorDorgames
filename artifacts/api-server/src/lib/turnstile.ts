const TURNSTILE_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TURNSTILE_SIGNUP_ACTION = "signup";

interface TurnstileResponse {
  success?: boolean;
  hostname?: string;
  action?: string;
}

export class TurnstileUnavailableError extends Error {
  constructor(message = "Turnstile verification is unavailable.") {
    super(message);
    this.name = "TurnstileUnavailableError";
  }
}

function configuration() {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const hostnames = new Set(
    (process.env.TURNSTILE_ALLOWED_HOSTNAMES ?? "")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!secret || hostnames.size === 0) {
    throw new TurnstileUnavailableError(
      "TURNSTILE_SECRET_KEY and TURNSTILE_ALLOWED_HOSTNAMES are required.",
    );
  }
  if (
    process.env.NODE_ENV === "production"
    && (hostnames.has("localhost") || hostnames.has("127.0.0.1"))
  ) {
    throw new TurnstileUnavailableError(
      "Production Turnstile hostnames cannot include local development hosts.",
    );
  }
  return { secret, hostnames };
}

export function assertTurnstileConfiguration(): void {
  if (process.env.NODE_ENV === "production") configuration();
}

export async function verifyTurnstileToken(
  token: unknown,
  remoteIp?: string,
): Promise<boolean> {
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return false;
  }
  const { secret, hostnames } = configuration();
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

  let response: Response;
  try {
    response = await fetch(TURNSTILE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new TurnstileUnavailableError();
  }
  if (!response.ok) throw new TurnstileUnavailableError();

  let result: TurnstileResponse;
  try {
    result = await response.json() as TurnstileResponse;
  } catch {
    throw new TurnstileUnavailableError();
  }
  return result.success === true
    && result.action === TURNSTILE_SIGNUP_ACTION
    && typeof result.hostname === "string"
    && hostnames.has(result.hostname.toLowerCase());
}
