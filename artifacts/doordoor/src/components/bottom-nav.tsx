import React from "react";
import { useLocation, Link } from "wouter";

type NavItem = {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactElement;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
  },
  {
    href: "/host",
    label: "Host",
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    href: "/admin",
    label: "Admin",
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21a8 8 0 10-16 0" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "430px",
        padding: "0 12px 10px",
        zIndex: 9000,
        pointerEvents: "none",
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "0 8px",
          height: "52px",
          background: "rgba(10,8,20,0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(180,0,255,0.12)",
          borderRadius: "16px",
          boxShadow: "0 -4px 30px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.04) inset",
          pointerEvents: "all",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? location === "/"
              : location.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "3px",
                  padding: "6px 16px",
                  cursor: "pointer",
                  color: isActive ? "#cc44ff" : "rgba(180,160,200,0.4)",
                  filter: isActive
                    ? "drop-shadow(0 0 5px rgba(200,60,255,0.6))"
                    : "none",
                  transition: "color 0.2s ease, filter 0.2s ease",
                  userSelect: "none",
                }}
              >
                {item.icon(isActive)}
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "7px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    lineHeight: 1,
                    opacity: isActive ? 1 : 0.6,
                  }}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
