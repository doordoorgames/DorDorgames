import { useRef } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { GAMES_CONFIG, type GameConfig } from "@/games-config";

// Static particles for hero background
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${8 + (i * 37 + i * i * 13) % 84}%`,
  size: 2 + (i % 3),
  duration: `${2.5 + (i % 5) * 0.8}s`,
  delay: `${(i * 0.4) % 3.5}s`,
  dx: `${(i % 2 === 0 ? 1 : -1) * (10 + (i * 7) % 25)}px`,
  color: i % 3 === 0 ? "#ff00ff" : i % 3 === 1 ? "#00ffff" : "#aa44ff",
}));

// City skyline buildings
const BUILDINGS = [
  { l: "0%", w: "7%", h: "38%" },
  { l: "7%", w: "4%", h: "56%" },
  { l: "11%", w: "9%", h: "30%" },
  { l: "21%", w: "5%", h: "65%" },
  { l: "27%", w: "3%", h: "42%" },
  { l: "31%", w: "8%", h: "28%" },
  { l: "40%", w: "4%", h: "72%" },
  { l: "45%", w: "7%", h: "50%" },
  { l: "53%", w: "3%", h: "38%" },
  { l: "57%", w: "9%", h: "62%" },
  { l: "67%", w: "5%", h: "44%" },
  { l: "73%", w: "6%", h: "55%" },
  { l: "80%", w: "4%", h: "36%" },
  { l: "85%", w: "8%", h: "68%" },
  { l: "94%", w: "6%", h: "40%" },
];

function HeroSection() {
  return (
    <div
      style={{
        position: "relative",
        height: "300px",
        overflow: "hidden",
        background: "linear-gradient(180deg, #08000f 0%, #0d0020 40%, #1a0035 100%)",
      }}
    >
      {/* Animated gradient overlay — city atmosphere */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 25% 40%, rgba(120,0,200,0.35) 0%, transparent 55%), radial-gradient(ellipse at 75% 30%, rgba(0,150,200,0.2) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(80,0,120,0.4) 0%, transparent 60%)",
          animation: "cityPulse 10s ease-in-out infinite",
          backgroundSize: "200% 200%",
        }}
      />

      {/* Glow orbs */}
      <div
        style={{
          position: "absolute",
          width: "280px",
          height: "280px",
          left: "-80px",
          top: "-60px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(180,0,255,0.18) 0%, transparent 65%)",
          filter: "blur(30px)",
          animation: "breathe 5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "220px",
          height: "220px",
          right: "-50px",
          bottom: "20px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,200,255,0.15) 0%, transparent 65%)",
          filter: "blur(25px)",
          animation: "breathe 7s ease-in-out infinite 1.5s",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "180px",
          height: "180px",
          left: "40%",
          top: "10px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,0,180,0.12) 0%, transparent 70%)",
          filter: "blur(20px)",
          animation: "breathe 6s ease-in-out infinite 3s",
        }}
      />

      {/* Particles */}
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            bottom: "30px",
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: "50%",
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            ["--duration" as string]: p.duration,
            ["--delay" as string]: p.delay,
            ["--dx" as string]: p.dx,
            animation: `particleDrift ${p.duration} ease-out ${p.delay} infinite`,
          }}
        />
      ))}

      {/* City skyline */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "100px",
          pointerEvents: "none",
        }}
      >
        {BUILDINGS.map((b, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: b.l,
              bottom: 0,
              width: b.w,
              height: b.h,
              background: `linear-gradient(to top, #0a000f, #140028)`,
              borderTop: "1px solid rgba(255,0,255,0.25)",
              animation: `buildingGlow ${2.5 + (i % 4) * 0.7}s ease-in-out infinite ${i * 0.2}s`,
            }}
          >
            {/* Windows */}
            {i % 2 === 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "20%",
                  left: "20%",
                  width: "30%",
                  height: "15%",
                  background: i % 4 === 0 ? "rgba(255,200,0,0.6)" : "rgba(0,200,255,0.5)",
                  boxShadow: i % 4 === 0 ? "0 0 6px rgba(255,200,0,0.8)" : "0 0 6px rgba(0,200,255,0.8)",
                  animation: `windowBlink ${6 + i}s ease-in-out infinite ${i * 0.5}s`,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Horizontal horizon glow */}
      <div
        style={{
          position: "absolute",
          bottom: "98px",
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent 0%, rgba(255,0,255,0.5) 30%, rgba(0,200,255,0.6) 70%, transparent 100%)",
          boxShadow: "0 0 20px rgba(180,0,255,0.4)",
        }}
      />

      {/* Rain streaks */}
      {[10, 22, 35, 50, 63, 77, 88].map((l, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${l}%`,
            top: 0,
            width: "1px",
            height: `${15 + (i % 4) * 10}px`,
            background: "linear-gradient(to bottom, transparent, rgba(150,200,255,0.15), transparent)",
            animation: `particleDrift ${1.5 + i * 0.3}s ease-in infinite ${i * 0.4}s`,
            ["--dx" as string]: "0px",
          }}
        />
      ))}

      {/* Hero content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: "50px",
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "9px",
            letterSpacing: "0.35em",
            color: "rgba(0,220,255,0.7)",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          Underground Gaming Network
        </div>

        <h1
          className="animate-neon-flicker"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "42px",
            lineHeight: 1,
            letterSpacing: "0.06em",
            color: "#ff00ff",
            textShadow: "0 0 20px #ff00ff, 0 0 50px #ff00ff88, 0 0 100px #ff00ff33",
            margin: "0 0 6px 0",
            fontWeight: "normal",
          }}
        >
          dordor.games
        </h1>

        <div
          className="arabic-text"
          style={{
            fontFamily: "var(--font-arabic)",
            fontSize: "14px",
            color: "rgba(0,220,255,0.75)",
            marginBottom: "20px",
          }}
          dir="rtl"
        >
          ألعاب تحت الأرض
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/join">
            <div
              style={{
                padding: "9px 22px",
                fontFamily: "var(--font-sans)",
                fontSize: "11px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#00ffff",
                border: "1px solid rgba(0,220,255,0.6)",
                background: "rgba(0,220,255,0.08)",
                cursor: "pointer",
                backdropFilter: "blur(8px)",
              }}
            >
              Join
            </div>
          </Link>
          <Link href="/host">
            <div
              style={{
                padding: "9px 22px",
                fontFamily: "var(--font-sans)",
                fontSize: "11px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#ff00ff",
                border: "1px solid rgba(255,0,255,0.6)",
                background: "rgba(255,0,255,0.12)",
                cursor: "pointer",
                backdropFilter: "blur(8px)",
                boxShadow: "0 0 15px rgba(255,0,255,0.2)",
              }}
            >
              Host
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function GameCard({ game, index }: { game: GameConfig; index: number }) {
  const isComingSoon = game.launchMode === "coming_soon";
  const isRedirect = game.launchMode === "redirect";

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
      whileHover={{ scale: isComingSoon ? 1 : 1.03 }}
      style={{
        position: "relative",
        aspectRatio: "1 / 1.1",
        background: game.bgGradient,
        overflow: "hidden",
        cursor: isComingSoon ? "not-allowed" : "pointer",
        border: `1px solid ${game.accentColor}33`,
        boxShadow: `0 0 20px ${game.accentColor}22, inset 0 0 20px rgba(0,0,0,0.4)`,
        transition: "box-shadow 0.3s ease, border-color 0.3s ease",
      }}
      onMouseEnter={(e) => {
        if (!isComingSoon) {
          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${game.accentColor}66, 0 0 60px ${game.accentColor}22, inset 0 0 20px rgba(0,0,0,0.4)`;
          (e.currentTarget as HTMLElement).style.borderColor = `${game.accentColor}88`;
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${game.accentColor}22, inset 0 0 20px rgba(0,0,0,0.4)`;
        (e.currentTarget as HTMLElement).style.borderColor = `${game.accentColor}33`;
      }}
    >
      {/* Background pattern — subtle grid lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Glow orb behind symbol */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${game.accentColor}44 0%, transparent 70%)`,
          filter: "blur(12px)",
          animation: "breathe 3s ease-in-out infinite",
        }}
      />

      {/* Symbol / icon */}
      <div
        style={{
          position: "absolute",
          top: "18%",
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: "36px",
          lineHeight: 1,
          color: game.accentColor,
          textShadow: `0 0 15px ${game.accentColor}, 0 0 30px ${game.accentColor}88`,
          filter: isComingSoon ? "brightness(0.4)" : "none",
          fontFamily: game.symbol === "?" ? "var(--font-display)" : "inherit",
          animation: isComingSoon ? "none" : "breathe 4s ease-in-out infinite",
        }}
      >
        {game.symbol}
      </div>

      {/* Corner accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "24px",
          height: "24px",
          borderTop: `2px solid ${game.accentColor}88`,
          borderRight: `2px solid ${game.accentColor}88`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "44%",
          left: 0,
          width: "16px",
          height: "16px",
          borderBottom: `2px solid ${game.accentColor}55`,
          borderLeft: `2px solid ${game.accentColor}55`,
        }}
      />

      {/* Bottom info panel */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "10px 10px 8px",
          background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "16px",
            letterSpacing: "0.06em",
            color: isComingSoon ? "rgba(255,255,255,0.3)" : "#ffffff",
            textShadow: isComingSoon ? "none" : `0 0 10px ${game.accentColor}66`,
            lineHeight: 1.1,
            marginBottom: "2px",
          }}
        >
          {game.title}
        </div>
        <div
          className="arabic-text"
          style={{
            fontFamily: "var(--font-arabic)",
            fontSize: "11px",
            color: isComingSoon ? "rgba(255,255,255,0.2)" : `${game.accentColor}cc`,
            direction: "rtl",
            textAlign: "right",
          }}
        >
          {game.titleAr}
        </div>

        {isRedirect && !isComingSoon && (
          <div
            style={{
              marginTop: "4px",
              fontSize: "7px",
              fontFamily: "var(--font-sans)",
              color: "rgba(255,200,0,0.7)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
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
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            paddingBottom: "30%",
          }}
        >
          <div
            style={{
              padding: "4px 10px",
              border: "1px solid rgba(255,255,255,0.15)",
              fontFamily: "var(--font-sans)",
              fontSize: "7px",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Coming Soon
          </div>
          <div
            className="arabic-text"
            style={{
              marginTop: "4px",
              fontSize: "9px",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            قريباً
          </div>
        </div>
      )}

      {/* Active game scan line animation */}
      {!isComingSoon && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: `linear-gradient(90deg, transparent, ${game.accentColor}, transparent)`,
            opacity: 0.6,
            animation: `shimmer 2s linear infinite`,
            backgroundSize: "200% 100%",
          }}
        />
      )}
    </motion.div>
  );

  if (isComingSoon) return cardContent;

  if (isRedirect) {
    return (
      <a href={game.externalUrl} target="_blank" rel="noopener noreferrer">
        {cardContent}
      </a>
    );
  }

  return <Link href={game.route}>{cardContent}</Link>;
}

export default function Home() {
  const activeGames = GAMES_CONFIG.filter((g) => g.launchMode !== "coming_soon");
  const comingSoonGames = GAMES_CONFIG.filter((g) => g.launchMode === "coming_soon");

  return (
    <Layout showHeader={false}>
      <HeroSection />

      {/* Games grid */}
      <div style={{ padding: "20px 14px 0" }}>
        {/* Section label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              height: "1px",
              flex: 1,
              background: "linear-gradient(90deg, rgba(255,0,255,0.5), transparent)",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "9px",
              color: "rgba(255,0,255,0.7)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
          >
            Live Games
          </span>
          <div
            style={{
              height: "1px",
              flex: 1,
              background: "linear-gradient(90deg, transparent, rgba(255,0,255,0.5))",
            }}
          />
        </div>

        {/* Active games — 2 col */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "24px",
          }}
        >
          {activeGames.map((game, i) => (
            <GameCard key={game.id} game={game} index={i} />
          ))}
        </div>

        {/* Coming soon section */}
        {comingSoonGames.length > 0 && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  height: "1px",
                  flex: 1,
                  background: "linear-gradient(90deg, rgba(100,100,120,0.4), transparent)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "9px",
                  color: "rgba(150,130,170,0.5)",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                }}
              >
                Coming Soon
              </span>
              <div
                style={{
                  height: "1px",
                  flex: 1,
                  background: "linear-gradient(90deg, transparent, rgba(100,100,120,0.4))",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              {comingSoonGames.map((game, i) => (
                <GameCard key={game.id} game={game} index={activeGames.length + i} />
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: "32px",
            paddingBottom: "12px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "13px",
              color: "rgba(255,0,255,0.2)",
              letterSpacing: "0.2em",
            }}
          >
            dordor.games
          </div>
          <div
            className="arabic-text"
            style={{ fontSize: "9px", color: "rgba(255,255,255,0.12)", marginTop: "4px" }}
          >
            ألعاب تحت الأرض
          </div>
        </div>
      </div>
    </Layout>
  );
}
