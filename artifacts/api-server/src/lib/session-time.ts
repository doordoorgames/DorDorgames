export function hasActiveSession(
  host: { activeSessionEndsAt: string | null; permanentTestAccess?: boolean },
  now = Date.now(),
): boolean {
  return host.permanentTestAccess === true || !!host.activeSessionEndsAt && new Date(host.activeSessionEndsAt).getTime() > now;
}
