import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { getGameByRoute } from "@/games-config";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

export default function GameLauncher() {
  const [location] = useLocation();
  const game = getGameByRoute(location);
  const [iframeError, setIframeError] = useState(false);
  const [launched, setLaunched] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const hasRealUrl =
    game?.externalUrl &&
    game.externalUrl !== "PASTE_URL_HERE" &&
    game.externalUrl.startsWith("http");

  function handleLaunch() {
    if (!game) return;
    if (hasRealUrl && !iframeError) {
      setLaunched(true);
    } else if (hasRealUrl) {
      window.open(game.externalUrl, "_blank", "noopener,noreferrer");
    } else {
      window.open("about:blank", "_blank");
    }
  }

  function handleIframeLoad() {
    // iframe loaded ok — nothing to do
  }

  function handleIframeError() {
    setIframeError(true);
    setLaunched(false);
  }

  if (!game) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="font-mono text-destructive text-sm">GAME NOT FOUND</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex flex-col gap-6 py-6"
      >
        {/* Game header */}
        <div className="text-center space-y-2">
          <div className="inline-block px-3 py-1 border border-primary/40 text-[10px] font-mono text-primary/70 mb-2">
            GAME LAUNCHER
          </div>
          <h1 className="font-mono text-xl text-primary animate-glow-pulse uppercase tracking-widest">
            {game.title}
          </h1>
          <p
            className="arabic-text text-base text-muted-foreground"
            dir="rtl"
          >
            {game.titleAr}
          </p>
          {game.description && (
            <p className="text-xs text-muted-foreground font-mono max-w-xs mx-auto">
              {game.description}
            </p>
          )}
        </div>

        {/* Status badge */}
        {game.status === "coming_soon" ? (
          <div className="border-2 border-dashed border-muted p-6 text-center">
            <span className="font-mono text-muted-foreground text-sm">
              COMING SOON
              <br />
              <span className="arabic-text block mt-2">قريباً</span>
            </span>
          </div>
        ) : (
          <>
            {/* Launch button */}
            {!launched && (
              <div className="flex flex-col items-center gap-3">
                <button
                  data-testid="button-launch-game"
                  onClick={handleLaunch}
                  className="w-full max-w-sm py-4 font-mono text-sm uppercase tracking-widest border-2 border-primary text-primary hover:bg-primary hover:text-background transition-all duration-200 shadow-[0_0_12px_rgba(255,0,255,0.3)] hover:shadow-[0_0_24px_rgba(255,0,255,0.6)] active:scale-95"
                >
                  {hasRealUrl ? "LAUNCH GAME" : "COMING SOON"}
                </button>
                {hasRealUrl && (
                  <button
                    data-testid="button-open-new-tab"
                    onClick={() =>
                      window.open(
                        game.externalUrl,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                    className="text-xs font-mono text-muted-foreground hover:text-accent underline underline-offset-4 transition-colors"
                  >
                    open in new tab ↗
                  </button>
                )}
                {!hasRealUrl && (
                  <p className="text-[10px] font-mono text-muted-foreground/50">
                    URL not configured — edit games-config.ts
                  </p>
                )}
              </div>
            )}

            {/* Iframe embed */}
            {launched && hasRealUrl && !iframeError && (
              <div className="flex flex-col gap-3">
                <div className="relative border-2 border-primary/50 shadow-[0_0_20px_rgba(255,0,255,0.15)] overflow-hidden bg-black">
                  {/* Scanline overlay inside iframe container */}
                  <div
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{
                      background:
                        "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)",
                    }}
                  />
                  <iframe
                    ref={iframeRef}
                    src={game.externalUrl}
                    title={game.title}
                    className="w-full"
                    style={{ height: "65vh", border: "none" }}
                    allow="fullscreen"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    data-testid="iframe-game"
                  />
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    data-testid="button-fullscreen"
                    onClick={() =>
                      window.open(
                        game.externalUrl,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                    className="px-4 py-2 text-[10px] font-mono border border-accent text-accent hover:bg-accent/10 transition-colors uppercase tracking-widest"
                  >
                    Fullscreen ↗
                  </button>
                  <button
                    data-testid="button-close-launcher"
                    onClick={() => setLaunched(false)}
                    className="px-4 py-2 text-[10px] font-mono border border-muted-foreground/40 text-muted-foreground hover:border-destructive hover:text-destructive transition-colors uppercase tracking-widest"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Iframe blocked fallback */}
            {iframeError && (
              <div className="border border-destructive/40 p-4 text-center space-y-3">
                <p className="text-xs font-mono text-destructive">
                  IFRAME BLOCKED BY GAME SERVER
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  This game cannot be embedded. Open it in a new tab instead.
                </p>
                <button
                  data-testid="button-open-tab-fallback"
                  onClick={() =>
                    window.open(
                      game.externalUrl,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  className="px-6 py-3 font-mono text-xs border-2 border-accent text-accent hover:bg-accent/10 transition-colors uppercase tracking-widest"
                >
                  Open in New Tab ↗
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </Layout>
  );
}
