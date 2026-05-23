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
  guessthecharacter: "/images/game-guess.jpg",
  doyouknowme: "/images/game-doyouknowme.png",
  tfadhloon: "/images/game-tfadhloon.jpg",
  charades: "/images/game-charades.png",
};

// Randomly placed blinking stars
const STARS = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  top: `${(i * 17 + i * i * 3) % 62}%`,
  left: `${(i * 29 + i * i * 7) % 96}%`,
  size: i % 5 === 0 ? 2.5 : i % 3 === 0 ? 2 : 1.5,
  duration: `${2.2 + (i * 0.37) % 3.8}s`,
  delay: `${(i * 0.53) % 5}s`,
  maxOpacity: 0.4 + (i % 4) * 0.15,
}));

function HeroSection() {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Full uncropped background image */}
      <img
        src="/images/hero-city.jpg"
        alt=""
        style={{ width: "100%", height: "auto", display: "block" }}
      />

      {/* Thin bottom edge fade to blend into game grid */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "60px",
          background: "linear-gradient(to bottom, transparent, #050508)",
          pointerEvents: "none",
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

      {/* Blinking star layer */}
      {STARS.map((s) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            borderRadius: "50%",
            background: "white",
            boxShadow: `0 0 ${s.size + 2}px rgba(255,255,255,0.8)`,
            animation: `starPulse ${s.duration} ease-in-out ${s.delay} infinite`,
            ["--star-max-opacity" as string]: s.maxOpacity,
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
          alignItems: "flex-start",
          justifyContent: "flex-end",
          paddingBottom: "20px",
          paddingLeft: "18px",
          zIndex: 10,
        }}
      >

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
