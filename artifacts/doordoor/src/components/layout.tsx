import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { BottomNav } from "./bottom-nav";

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  headerTitle?: string;
}

export function Layout({ children, showHeader = true, headerTitle }: LayoutProps) {
  const [location] = useLocation();
  const isHome = location === "/";

  return (
    <div
      style={{
        minHeight: "100%",
        height: "100%",
        background: "#080808",
        display: "flex",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: "#080808",
          boxShadow: "0 0 60px rgba(120,0,180,0.12)",
        }}
      >
        {/* Top header — hidden on home, shown on inner pages */}
        {showHeader && !isHome && (
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              background: "rgba(8,8,8,0.92)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderBottom: "1px solid rgba(180,0,255,0.15)",
            }}
          >
            <Link href="/">
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "18px",
                  letterSpacing: "0.06em",
                  color: "#ff00ff",
                  textShadow: "0 0 12px #ff00ff88",
                  cursor: "pointer",
                }}
              >
                dordor.games
              </span>
            </Link>
            {headerTitle && (
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "10px",
                  color: "rgba(200,180,220,0.6)",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                }}
              >
                {headerTitle}
              </span>
            )}
          </header>
        )}

        {/* Scrollable main area */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            paddingBottom: "100px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
