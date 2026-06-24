import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { GAMES_CONFIG, type GameConfig } from "@/games-config";
import { BottomNav } from "@/components/bottom-nav";

function ShelvedGameCard({ game, index }: { game: GameConfig; index: number }) {
  const imageUrl = game.imageUrl;

  function handleClick() {
    if (game.externalUrl) {
      window.location.href = game.externalUrl;
    }
  }

  return (
    <div onClick={handleClick} style={{ cursor: "pointer" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.07 + 0.1, duration: 0.4, ease: "easeOut" }}
        whileHover={{
          scale: 1.03,
          boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 30px ${game.accentColor}40`,
        }}
        whileTap={{ scale: 0.98 }}
        style={{
          position: "relative",
          aspectRatio: "3 / 4",
          overflow: "hidden",
          border: `1px solid ${game.accentColor}33`,
          boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 20px ${game.accentColor}18`,
          borderRadius: "2px",
        }}
      >
        {/* Artwork */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: imageUrl
              ? `url('${imageUrl}') center top / cover no-repeat`
              : game.bgGradient,
          }}
        />

        {/* Depth vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 30%, transparent 30%, rgba(0,0,0,0.4) 100%)",
          }}
        />

        {/* Bottom gradient */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "55%",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, transparent 100%)",
          }}
        />

        {/* Accent glow edge */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: `linear-gradient(90deg, transparent, ${game.accentColor}, transparent)`,
            opacity: 0.7,
          }}
        />

        {/* Corner bracket */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            width: "16px",
            height: "16px",
            borderTop: `1px solid ${game.accentColor}88`,
            borderRight: `1px solid ${game.accentColor}88`,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            width: "16px",
            height: "16px",
            borderTop: `1px solid ${game.accentColor}44`,
            borderLeft: `1px solid ${game.accentColor}44`,
          }}
        />

        {/* Game info */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "12px 10px 10px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "17px",
              letterSpacing: "0.07em",
              color: "#ffffff",
              textShadow: `0 1px 8px rgba(0,0,0,0.8), 0 0 20px ${game.accentColor}44`,
              lineHeight: 1.1,
            }}
          >
            {game.title}
          </div>
          <div
            className="arabic-text"
            style={{
              fontFamily: "var(--font-arabic)",
              fontSize: "10px",
              color: `${game.accentColor}bb`,
              marginTop: "2px",
              direction: "rtl",
              textAlign: "right",
            }}
          >
            {game.titleAr}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ShelvedGames() {
  const [, navigate] = useLocation();
  const shelvedGames = GAMES_CONFIG.filter((g) => g.privateTest && !g.hidden);

  return (
    <div
      style={{
        minHeight: "100dvh",
        maxWidth: "430px",
        margin: "0 auto",
        background: "#050508",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 16px 0",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "2px",
            padding: "5px 10px",
            color: "rgba(255,255,255,0.3)",
            fontFamily: "var(--font-sans)",
            fontSize: "8px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "8px",
            color: "rgba(255,0,255,0.4)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          Internal Testing
        </div>
      </div>

      {/* Section divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "14px 14px 10px",
        }}
      >
        <div
          style={{
            flex: 1,
            height: "1px",
            background: "linear-gradient(90deg, rgba(255,0,255,0.3), transparent)",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "8px",
            color: "rgba(255,0,255,0.5)",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
          }}
        >
          Shelved Games
        </span>
        <div
          style={{
            flex: 1,
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(255,0,255,0.3))",
          }}
        />
      </div>

      {/* Games grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          padding: "0 12px 100px",
        }}
      >
        {shelvedGames.map((game, i) => (
          <ShelvedGameCard key={game.id} game={game} index={i} />
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
