import { Layout } from "@/components/layout";
import { useListGames, getListGamesQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";

export default function Home() {
  const { data: games, isLoading } = useListGames();

  return (
    <Layout>
      <div className="flex flex-col gap-8 py-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <h1 className="font-mono text-2xl text-primary animate-glow-pulse mb-2">DOOR DOOR</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest arabic-text">
            Underground Gaming / ألعاب تحت الأرض
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="text-primary font-mono animate-pulse">LOADING...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {games?.map((game) => (
              <div
                key={game.id}
                className={`relative border-2 ${game.status === 'active' ? 'border-primary hover:border-accent hover:shadow-[0_0_15px_rgba(0,255,65,0.5)]' : 'border-muted'} p-4 transition-all duration-300 transform hover:scale-[1.02] bg-background`}
              >
                {game.status === 'coming_soon' && (
                  <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-muted">
                    <span className="font-mono text-muted-foreground text-sm text-center">
                      COMING SOON
                      <br/>
                      <span className="arabic-text block mt-2">قريباً</span>
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  {game.logoUrl ? (
                    <div className="w-16 h-16 bg-muted border border-border flex-shrink-0">
                      <img src={game.logoUrl} alt={game.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-muted border border-border flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">👾</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-mono text-sm text-foreground mb-1 truncate">{game.title}</h3>
                    <h4 className="arabic-text text-sm text-muted-foreground mb-2 truncate">{game.titleAr}</h4>
                    {game.status === 'active' && (
                      <span className="inline-block px-2 py-1 bg-primary/20 text-primary text-[10px] font-mono border border-primary/50">
                        ACTIVE
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}