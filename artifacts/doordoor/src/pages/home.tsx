import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { GAMES_CONFIG } from "@/games-config";

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.3 },
  }),
};

export default function Home() {
  return (
    <Layout>
      <motion.div
        className="flex flex-col gap-8 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center space-y-4">
          <h1 className="font-mono text-2xl text-primary animate-glow-pulse mb-2">
            DOOR DOOR
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest arabic-text">
            Underground Gaming / ألعاب تحت الأرض
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {GAMES_CONFIG.map((game, i) => {
            const isComingSoon = game.status === "coming_soon";
            const hasUrl = game.externalUrl && game.externalUrl.startsWith("http");

            if (isComingSoon || !hasUrl) {
              return (
                <motion.div
                  key={game.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  data-testid={`card-game-${game.id}`}
                >
                  <div className="relative border-2 border-muted p-4 bg-background opacity-50 cursor-not-allowed">
                    <GameCardInner game={game} />
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <span className="font-mono text-muted-foreground text-xs">
                        COMING SOON &nbsp;/&nbsp;
                        <span className="arabic-text">قريباً</span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={game.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                data-testid={`card-game-${game.id}`}
              >
                <a
                  href={game.externalUrl}
                  className="block border-2 border-primary hover:border-accent hover:shadow-[0_0_18px_rgba(0,255,65,0.45)] p-4 transition-all duration-200 transform hover:scale-[1.02] bg-background cursor-pointer"
                >
                  <GameCardInner game={game} />
                </a>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </Layout>
  );
}

function GameCardInner({
  game,
}: {
  game: (typeof GAMES_CONFIG)[number];
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 bg-muted border border-border flex items-center justify-center flex-shrink-0">
        <span className="font-mono text-[10px] text-muted-foreground text-center leading-tight px-1 uppercase">
          {game.title.slice(0, 3)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-mono text-sm text-foreground mb-0.5 truncate uppercase tracking-wide">
          {game.title}
        </h3>
        <p className="arabic-text text-sm text-muted-foreground mb-2 truncate" dir="rtl">
          {game.titleAr}
        </p>
        <span className="inline-block px-2 py-0.5 bg-primary/20 text-primary text-[9px] font-mono border border-primary/50 uppercase">
          ACTIVE
        </span>
      </div>

      <div className="text-muted-foreground/40 font-mono text-xs flex-shrink-0">
        ▶
      </div>
    </div>
  );
}
