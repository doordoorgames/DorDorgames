import { ReactNode } from "react";
import { Link } from "wouter";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center w-full crt-vignette font-sans">
      <div className="w-full max-w-[430px] min-h-screen bg-card relative shadow-[0_0_50px_rgba(255,0,255,0.1)] border-x border-border animate-flicker flex flex-col">
        {/* Header */}
        <header className="p-4 border-b border-border flex items-center justify-between z-10 bg-background/80 backdrop-blur">
          <Link href="/" className="font-mono text-primary text-sm hover:text-accent transition-colors shadow-glow-sm">
            DOORDOOR
          </Link>
          <div className="flex gap-4">
            <Link href="/join" className="text-xs font-mono text-secondary hover:text-accent uppercase">
              Join
            </Link>
            <Link href="/host" className="text-xs font-mono text-primary hover:text-accent uppercase">
              Host
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 relative z-10 overflow-y-auto overflow-x-hidden p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
