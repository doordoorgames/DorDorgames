import { Redirect, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { getGameByRoute } from "@/games-config";

export default function GameLauncher() {
  const [location] = useLocation();
  const game = getGameByRoute(location);

  if (!game) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="font-mono text-destructive text-sm">GAME NOT FOUND</p>
        </div>
      </Layout>
    );
  }

  return <Redirect to={`/pricing?game=${encodeURIComponent(game.id)}`} />;
}
