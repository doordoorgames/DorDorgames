import { useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useListGames } from "@workspace/api-client-react";

export default function GameLauncher() {
  const [location] = useLocation();
  // slug = route path without leading slash, e.g. "/flash" → "flash"
  const slug = location.replace(/^\//, "");

  const { data: games, isLoading } = useListGames();
  const game = games?.find((g) => g.slug === slug);

  const hasUrl = game?.externalUrl && game.externalUrl.startsWith("http");

  useEffect(() => {
    if (game && hasUrl && game.externalUrl) {
      window.location.replace(game.externalUrl);
    }
  }, [game, hasUrl]);

  // Still loading from API
  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="font-mono text-primary text-sm animate-pulse">LOADING...</div>
        </div>
      </Layout>
    );
  }

  // Game not found in API
  if (!game) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="font-mono text-destructive text-sm">GAME NOT FOUND</p>
        </div>
      </Layout>
    );
  }

  // Coming Soon
  if (game.status === "coming_soon") {
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

  // Active but URL not set yet
  if (!hasUrl) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <p className="font-mono text-xs text-primary/60 uppercase tracking-widest">Game Launcher</p>
          <h1 className="font-mono text-xl text-primary uppercase tracking-widest">{game.title}</h1>
          <p className="arabic-text text-base text-muted-foreground" dir="rtl">{game.titleAr}</p>
          <div className="border border-primary/30 px-8 py-6 text-center space-y-2">
            <p className="font-mono text-primary/70 text-xs uppercase">Active — URL not configured</p>
            <p className="font-mono text-muted-foreground text-[10px]">
              Set the external URL in the admin panel to enable this game.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Has URL — show brief redirect message while window.location.replace fires
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="font-mono text-primary text-sm animate-pulse">LAUNCHING...</div>
        <p className="text-xs font-mono text-muted-foreground">{game.title}</p>
      </div>
    </Layout>
  );
}
