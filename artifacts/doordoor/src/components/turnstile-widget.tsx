import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export interface TurnstileWidgetHandle {
  reset: () => void;
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
}

const SCRIPT_ID = "cloudflare-turnstile-script";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onToken }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | undefined>(undefined);
    const [unavailable, setUnavailable] = useState(false);
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();

    useImperativeHandle(ref, () => ({
      reset() {
        onToken("");
        if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
      },
    }), [onToken]);

    useEffect(() => {
      if (!siteKey) {
        setUnavailable(true);
        return;
      }
      let disposed = false;
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

      const renderWidget = () => {
        if (disposed || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action: "signup",
          theme: "dark",
          size: "flexible",
          callback: (token: string) => {
            setUnavailable(false);
            onToken(token);
          },
          "expired-callback": () => {
            onToken("");
            if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
          },
          "error-callback": () => {
            onToken("");
            setUnavailable(true);
          },
        });
      };
      const handleError = () => {
        if (!disposed) {
          onToken("");
          setUnavailable(true);
        }
      };

      if (window.turnstile) {
        renderWidget();
      } else {
        if (!script) {
          script = document.createElement("script");
          script.id = SCRIPT_ID;
          script.src = SCRIPT_URL;
          script.async = true;
          script.defer = true;
          document.head.appendChild(script);
        }
        script.addEventListener("load", renderWidget);
        script.addEventListener("error", handleError);
      }

      return () => {
        disposed = true;
        script?.removeEventListener("load", renderWidget);
        script?.removeEventListener("error", handleError);
        if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = undefined;
      };
    }, [onToken, siteKey]);

    return (
      <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black/30 p-2">
        <div ref={containerRef} className="min-h-[65px] w-full" />
        {unavailable && (
          <p className="px-2 pb-1 text-center text-xs text-red-300">
            Security check unavailable. Please refresh and try again.
          </p>
        )}
      </div>
    );
  },
);
