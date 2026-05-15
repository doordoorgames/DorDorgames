import { useLocation, Link } from "wouter";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Home",
    labelAr: "الرئيسية",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
  },
  {
    href: "/join",
    label: "Join",
    labelAr: "انضم",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="1" />
        <path d="M8 12h8M14 8l4 4-4 4" />
      </svg>
    ),
  },
  {
    href: "/host",
    label: "Host",
    labelAr: "استضف",
    isMain: true,
    icon: (_active: boolean) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    href: "/join",
    label: "Room",
    labelAr: "الغرفة",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="1" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
  },
  {
    href: "/admin",
    label: "Admin",
    labelAr: "إدارة",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21a8 8 0 10-16 0" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "430px",
        zIndex: 9000,
        padding: "0 12px 12px 12px",
      }}
    >
      <div
        className="glass-panel"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "8px 0 6px 0",
          borderRadius: "20px",
          border: "1px solid rgba(255,0,255,0.2)",
          boxShadow: "0 0 30px rgba(255,0,255,0.1), 0 -4px 20px rgba(0,0,0,0.5)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;

          if (item.isMain) {
            return (
              <Link key={item.href + item.label} href={item.href}>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #ff00ff, #8800ff)",
                    boxShadow: "0 0 20px rgba(255,0,255,0.6), 0 0 40px rgba(255,0,255,0.3)",
                    color: "#fff",
                    marginTop: "-18px",
                    cursor: "pointer",
                    border: "2px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {item.icon(true)}
                </div>
              </Link>
            );
          }

          return (
            <Link key={item.href + item.label} href={item.href}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "3px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  color: isActive ? "#ff00ff" : "rgba(200,180,220,0.5)",
                  transition: "color 0.2s",
                  filter: isActive ? "drop-shadow(0 0 6px #ff00ff)" : "none",
                  minWidth: "44px",
                }}
              >
                {item.icon(isActive)}
                <span
                  style={{
                    fontSize: "8px",
                    fontFamily: "var(--font-sans)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
