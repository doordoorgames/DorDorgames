import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { getGameByRoute } from "@/games-config";

export default function GameLauncher() {
  const [location] = useLocation();
  const game = getGameByRoute(location);
  const [iframeReady, setIframeReady] = useState(false);

  // "redirect" mode — navigate user to external domain
  useEffect(() => {
    if (game?.launchMode === "redirect" && game.externalUrl) {
      window.location.replace(game.externalUrl);
    }
  }, [game]);

  // ── Game not found ──────────────────────────────────────────────────────────
  if (!game) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="font-mono text-destructive text-sm">GAME NOT FOUND</p>
        </div>
      </Layout>
    );
  }

  // ── Coming soon ─────────────────────────────────────────────────────────────
  if (game.launchMode === "coming_soon" || game.status === "coming_soon") {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <p className="font-mono text-xs text-primary/60 uppercase tracking-widest">
            Game Launcher
          </p>
          <h1 className="font-mono text-xl text-primary uppercase tracking-widest">
            {game.title}
          </h1>
          <p className="arabic-text text-base text-muted-foreground" dir="rtl">
            {game.titleAr}
          </p>
          <div className="border-2 border-dashed border-muted px-8 py-6 text-center">
            <span className="font-mono text-muted-foreground text-sm">
              COMING SOON
              <br />
              <span className="arabic-text block mt-2">قريباً</span>
            </span>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Redirect mode — show brief transition while useEffect fires ──────────────
  if (game.launchMode === "redirect") {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="font-mono text-primary text-sm animate-pulse">
            LAUNCHING...
          </div>
          <p className="text-xs font-mono text-muted-foreground">{game.title}</p>
        </div>
      </Layout>
    );
  }

  // ── Iframe mode — full-screen, URL stays on dordor.games ────────────────────
  if (game.launchMode === "iframe" && game.externalUrl) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#000",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Thin loading bar that disappears once iframe is ready */}
        {!iframeReady && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background:
                "linear-gradient(90deg, #ff00cc, #00ff41, #ff00cc)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.2s linear infinite",
              zIndex: 10000,
            }}
          />
        )}
        <iframe
          src={game.externalUrl}
          title={game.title}
          onLoad={() => setIframeReady(true)}
          style={{
            flex: 1,
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
          }}
          allow="fullscreen; accelerometer; gyroscope; camera; microphone"
          allowFullScreen
        />
      </div>
    );
  }

  // Fallback — no URL configured
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <p className="font-mono text-xs text-primary/60 uppercase tracking-widest">
          Game Launcher
        </p>
        <h1 className="font-mono text-xl text-primary uppercase tracking-widest">
          {game.title}
        </h1>
        <div className="border border-primary/30 px-8 py-6 text-center space-y-2">
          <p className="font-mono text-primary/70 text-xs uppercase">
            URL not configured
          </p>
          <p className="font-mono text-muted-foreground text-[10px]">
            Set externalUrl in games-config.ts to enable this game.
          </p>
        </div>
      </div>
    </Layout>
  );
}
