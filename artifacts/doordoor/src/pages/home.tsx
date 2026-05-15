import { useState, useRef } from "react";
import { Link } from "wouter";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { GAMES_CONFIG, type GameConfig } from "@/games-config";
import { BottomNav } from "@/components/bottom-nav";

// Map game IDs to generated artwork
const GAME_IMAGES: Record<string, string> = {
  flash: "/images/game-flash.png",
  bomb: "/images/game-bomb.png",
  forehead: "/images/game-forehead.png",
  yesno: "/images/game-yesno.png",
  "movie-radar": "/images/game-movie-radar.png",
  "fun-challenges": "/images/game-fun-challenges.png",
};

// Rain streaks for hero
const RAIN_STREAKS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${(i * 23 + i * i * 7) % 98}%`,
  height: `${40 + (i % 5) * 15}px`,
  duration: `${0.8 + (i % 6) * 0.2}s`,
  delay: `${(i * 0.15) % 2.5}s`,
  opacity: 0.1 + (i % 4) * 0.05,
}));

// Sakura petals
const SAKURA = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  startX: `${10 + (i * 41) % 80}%`,
  size: 4 + (i % 3) * 2,
  duration: `${5 + (i % 5) * 1.5}s`,
  delay: `${(i * 0.8) % 5}s`,
  drift: `${(i % 2 === 0 ? 30 : -30) + (i % 3) * 10}px`,
}));

function HeroSection() {
  return (
    <div
      style={{
        position: "relative",
        height: "42vh",
        minHeight: "220px",
        maxHeight: "320px",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Anime city silhouette image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url('/images/hero-silhouette.png')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      />

      {/* Bottom gradient fade into app background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(5,5,8,0.25) 0%, rgba(5,5,8,0.1) 30%, rgba(5,5,8,0.5) 70%, #050508 100%)",
        }}
      />

      {/* Top vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 0%, transparent 40%, rgba(5,5,8,0.6) 100%)",
        }}
      />

      {/* Subtle purple atmospheric haze */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 20% 60%, rgba(100,0,180,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 40%, rgba(0,150,200,0.1) 0%, transparent 50%)",
          mixBlendMode: "screen",
        }}
      />

      {/* Rain streaks */}
      {RAIN_STREAKS.map((r) => (
        <div
          key={r.id}
          style={{
            position: "absolute",
            left: r.left,
            top: "-10px",
            width: "1px",
            height: r.height,
            background: `linear-gradient(to bottom, transparent, rgba(180,220,255,${r.opacity}), transparent)`,
            animation: `particleDrift ${r.duration} linear ${r.delay} infinite`,
            ["--dx" as string]: "2px",
          }}
        />
      ))}

      {/* Sakura petals */}
      {SAKURA.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: p.startX,
            top: "-10px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: "rgba(255,180,210,0.6)",
            borderRadius: "50% 0 50% 0",
            boxShadow: "0 0 4px rgba(255,150,200,0.4)",
            animation: `particleDrift ${p.duration} ease-in-out ${p.delay} infinite`,
            ["--dx" as string]: p.drift,
          }}
        />
      ))}

      {/* CRT noise grain overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />

      {/* Hero text content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: "20px",
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ textAlign: "center", marginBottom: "10px" }}
        >
          <div
            className="animate-neon-flicker"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "34px",
              letterSpacing: "0.08em",
              color: "#ff00ff",
              textShadow:
                "0 0 15px #ff00ff, 0 0 35px #ff00ff66, 0 0 70px #ff00ff33",
              lineHeight: 1,
            }}
          >
            dordor.games
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "9px",
              letterSpacing: "0.4em",
              color: "rgba(0,220,255,0.6)",
              marginTop: "5px",
              textTransform: "uppercase",
            }}
          >
            ゲームを始めよう · Underground Gaming
          </div>
        </motion.div>

      </div>
    </div>
  );
}

function GameCard({
  game,
  index,
}: {
  game: GameConfig;
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-60, 60], [4, -4]);
  const rotateY = useTransform(x, [-60, 60], [-4, 4]);

  const imageUrl = GAME_IMAGES[game.id];
  const isComingSoon = game.launchMode === "coming_soon";
  const isRedirect = game.launchMode === "redirect";

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current || isComingSoon) return;
    const rect = cardRef.current.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const cardInner = (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06 + 0.2, duration: 0.4, ease: "easeOut" }}
      style={{
        rotateX: isComingSoon ? 0 : rotateX,
        rotateY: isComingSoon ? 0 : rotateY,
        transformStyle: "preserve-3d",
        position: "relative",
        aspectRatio: "3 / 4",
        overflow: "hidden",
        cursor: isComingSoon ? "not-allowed" : "pointer",
        border: `1px solid ${game.accentColor}${isComingSoon ? "1a" : "33"}`,
        boxShadow: isComingSoon
          ? "none"
          : `0 4px 24px rgba(0,0,0,0.6), 0 0 20px ${game.accentColor}18`,
        borderRadius: "2px",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={
        isComingSoon
          ? {}
          : { scale: 1.03, boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 30px ${game.accentColor}40` }
      }
      whileTap={isComingSoon ? {} : { scale: 0.98 }}
    >
      {/* Artwork background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: imageUrl
            ? `url('${imageUrl}') center top / cover no-repeat`
            : game.bgGradient,
          filter: isComingSoon ? "brightness(0.3) saturate(0.4)" : "none",
          transition: "filter 0.3s ease",
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

      {/* Bottom info gradient */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "55%",
          background: `linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, transparent 100%)`,
        }}
      />

      {/* Accent glow edge at bottom */}
      {!isComingSoon && (
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
      )}

      {/* Top corner bracket */}
      {!isComingSoon && (
        <>
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
        </>
      )}

      {/* Scan-line shimmer on active */}
      {!isComingSoon && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(0,0,0,0.08) 3px,
              rgba(0,0,0,0.08) 4px
            )`,
            pointerEvents: "none",
          }}
        />
      )}

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
            color: isComingSoon ? "rgba(255,255,255,0.2)" : "#ffffff",
            textShadow: isComingSoon
              ? "none"
              : `0 1px 8px rgba(0,0,0,0.8), 0 0 20px ${game.accentColor}44`,
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
            color: isComingSoon
              ? "rgba(255,255,255,0.1)"
              : `${game.accentColor}bb`,
            marginTop: "2px",
            direction: "rtl",
            textAlign: "right",
            textShadow: "none",
          }}
        >
          {game.titleAr}
        </div>

        {isRedirect && (
          <div
            style={{
              marginTop: "4px",
              fontSize: "7px",
              fontFamily: "var(--font-sans)",
              color: "rgba(255,200,80,0.65)",
              letterSpacing: "0.12em",
            }}
          >
            ↗ External
          </div>
        )}
      </div>

      {/* Coming soon overlay */}
      {isComingSoon && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: "28%",
          }}
        >
          <div
            style={{
              padding: "3px 10px",
              border: "1px solid rgba(255,255,255,0.1)",
              fontFamily: "var(--font-sans)",
              fontSize: "7px",
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Coming Soon
          </div>
        </div>
      )}
    </motion.div>
  );

  if (isComingSoon) return cardInner;
  if (isRedirect)
    return (
      <a href={game.externalUrl} target="_blank" rel="noopener noreferrer">
        {cardInner}
      </a>
    );
  return <Link href={game.route}>{cardInner}</Link>;
}

export default function Home() {
  const activeGames = GAMES_CONFIG.filter((g) => g.launchMode !== "coming_soon");
  const comingSoonGames = GAMES_CONFIG.filter((g) => g.launchMode === "coming_soon");

  return (
    <div
      style={{
        minHeight: "100dvh",
        maxWidth: "430px",
        margin: "0 auto",
        background: "#050508",
      }}
    >
      <HeroSection />

      {/* Game launcher — scrolls naturally with the page */}
      <div
        style={{
          paddingBottom: "80px",
        }}
      >
        {/* Section header */}
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
              background: "linear-gradient(90deg, rgba(255,0,255,0.4), transparent)",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "8px",
              color: "rgba(255,0,255,0.6)",
              letterSpacing: "0.35em",
              textTransform: "uppercase",
            }}
          >
            Game Launcher
          </span>
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(255,0,255,0.4))",
            }}
          />
        </div>

        {/* Active games grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            padding: "0 12px",
          }}
        >
          {activeGames.map((game, i) => (
            <GameCard key={game.id} game={game} index={i} />
          ))}
        </div>

        {/* Coming soon */}
        {comingSoonGames.length > 0 && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "16px 14px 10px",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: "linear-gradient(90deg, rgba(100,80,120,0.3), transparent)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "8px",
                  color: "rgba(130,110,150,0.4)",
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                }}
              >
                Coming Soon
              </span>
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: "linear-gradient(90deg, transparent, rgba(100,80,120,0.3))",
                }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                padding: "0 12px",
              }}
            >
              {comingSoonGames.map((game, i) => (
                <GameCard key={game.id} game={game} index={activeGames.length + i} />
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
