import { useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { getGameByRoute } from "@/games-config";

export default function GameLauncher() {
  const [location] = useLocation();
  const game = getGameByRoute(location);

  const hasRealUrl =
    game?.externalUrl &&
    game.externalUrl.startsWith("http");

  useEffect(() => {
    if (hasRealUrl && game?.externalUrl) {
      window.location.replace(game.externalUrl);
    }
  }, [hasRealUrl, game?.externalUrl]);

  if (!game) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="font-mono text-destructive text-sm">GAME NOT FOUND</p>
        </div>
      </Layout>
    );
  }

  if (game.status === "coming_soon" || !hasRealUrl) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <p className="font-mono text-xs text-primary/60 uppercase tracking-widest">Game Launcher</p>
          <h1 className="font-mono text-xl text-primary uppercase tracking-widest">{game.title}</h1>
          <p className="arabic-text text-base text-muted-foreground" dir="rtl">{game.titleAr}</p>
          <div className="border-2 border-dashed border-muted px-8 py-6 text-center">
            <span className="font-mono text-muted-foreground text-sm">
              COMING SOON<br />
              <span className="arabic-text block mt-2">قريباً</span>
            </span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="font-mono text-primary text-sm animate-pulse">LOADING...</div>
        <p className="text-xs font-mono text-muted-foreground">Redirecting to {game.title}</p>
      </div>
    </Layout>
  );
}
