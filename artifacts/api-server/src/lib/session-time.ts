export function hasActiveSession(
  host: { activeSessionEndsAt: string | null },
  now = Date.now(),
): boolean {
  return !!host.activeSessionEndsAt && new Date(host.activeSessionEndsAt).getTime() > now;
}
