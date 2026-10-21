import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import Room from "@/pages/room";
import LanguageSelect from "@/pages/language-select";
import ModeSelect from "@/pages/mode-select";
import CyberpunkBackground from "@/components/CyberpunkBackground";
import { LanguageProvider } from "@/context/LanguageContext";
import { setBaseUrl } from "@workspace/forehead-api-client-react";
import { apiBaseUrl } from "@/lib/backend";

setBaseUrl(apiBaseUrl);

const queryClient = new QueryClient();

function AccountGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    window.location.pathname.startsWith("/admin") ? "ready" : "loading",
  );

  useEffect(() => {
    if (status === "ready") return undefined;
    const controller = new AbortController();
    const authOrigin = apiBaseUrl.replace(/\/forehead$/, "");
    const request = (path: string, method = "GET") => fetch(`${authOrigin}${path}`, {
      method,
      credentials: "include",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    void (async () => {
      try {
        let response = await request("/api/auth/me");
        if (response.status === 401) {
          const refresh = await request("/api/auth/refresh", "POST");
          if (refresh.ok) response = await request("/api/auth/me");
        }
        if (response.status === 401 || response.status === 403) {
          const accountUrl = `https://www.dordor.games/account?returnTo=${encodeURIComponent(window.location.href)}`;
          window.location.replace(accountUrl);
          return;
        }
        if (!response.ok) throw new Error(`Account verification returned ${response.status}`);
        (window as typeof window & { DordorAccount?: unknown }).DordorAccount = await response.json();
        setStatus("ready");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setStatus("error");
      }
    })();
    return () => controller.abort();
  }, [status]);

  if (status === "loading") return <div className="min-h-screen grid place-items-center text-white">Verifying account...</div>;
  if (status === "error") return <div className="min-h-screen grid place-items-center text-white text-center p-6"><div><p>Unable to verify your account.</p><button className="mt-4 underline" onClick={() => setStatus("loading")}>Try again</button></div></div>;
  return children;
}

const hostedModePaths: Record<string, string> = {
  "guessyourword.dordor.games": "/forehead",
  "guessthecharacter.dordor.games": "/character",
  "charades.dordor.games": "/charades",
};

const hostedModeTitles: Record<string, string> = {
  "guessyourword.dordor.games": "Guess Your Word",
  "guessthecharacter.dordor.games": "Guess the Character",
  "charades.dordor.games": "Charades",
};

function getHostedModePath() {
  return hostedModePaths[window.location.hostname.toLowerCase()] ?? null;
}

function getPageTitle(location: string) {
  const hostname = window.location.hostname.toLowerCase();
  if (hostedModeTitles[hostname]) return hostedModeTitles[hostname];
  if (location.startsWith("/character")) return "Guess the Character";
  if (location.startsWith("/charades")) return "Charades";
  return "Guess Your Word";
}

function Router() {
  const [location] = useLocation();
  const hostedModePath = getHostedModePath();
  const roomCode = location.startsWith('/room/') ? location.split('/room/')[1]?.toUpperCase() : null;
  const isCharadesRoom = !!roomCode && sessionStorage.getItem(`fg_roomMode_${roomCode}`) === 'charades';
  const showCyberpunk = !location.startsWith('/character') && !location.startsWith('/charades') && !isCharadesRoom;

  useEffect(() => {
    document.title = getPageTitle(location);
  }, [location]);

  return (
    <>
      {showCyberpunk && <CyberpunkBackground />}
      <Switch>
        <Route path="/">{() => <LanguageSelect nextPath={hostedModePath ?? "/mode"} />}</Route>
        <Route path="/mode">{() => hostedModePath ? <Redirect to={hostedModePath} /> : <ModeSelect />}</Route>
        <Route path="/forehead">{() => <Home mode="forehead" />}</Route>
        <Route path="/character">{() => <Home mode="character" />}</Route>
        <Route path="/charades">{() => <Home mode="charades" />}</Route>
        <Route path="/home">{() => <Redirect to={hostedModePath ?? "/mode"} />}</Route>
        <Route path="/admin" component={Admin} />
        <Route path="/room/:code" component={Room} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AccountGate><Router /></AccountGate>
            </WouterRouter>
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

export default App;
