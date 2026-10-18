const configuredApiOrigin = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "");

export const apiBaseUrl = `${configuredApiOrigin ?? ""}/forehead`;

export function backendUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

export function websocketUrl(path = "/ws") {
  const origin = configuredApiOrigin ?? window.location.origin;
  const websocketOrigin = origin.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
  return `${websocketOrigin}/forehead${path}`;
}
