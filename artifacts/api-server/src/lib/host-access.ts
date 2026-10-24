import { store, type Host } from "./store.js";
export { hasActiveSession } from "./session-time.js";
import { hasActiveSession } from "./session-time.js";

export const FREE_TRIAL_MINUTES = 30;
export const MAX_PAID_SESSION_MINUTES = 180;

export async function ensureHostSession(host: Host): Promise<Host | null> {
  if (hasActiveSession(host)) return host;
  if (host.remainingMinutes <= 0) return null;
  const activated = await store.hosts.activatePaidSession(host.id, MAX_PAID_SESSION_MINUTES);
  return activated && hasActiveSession(activated) ? activated : null;
}
