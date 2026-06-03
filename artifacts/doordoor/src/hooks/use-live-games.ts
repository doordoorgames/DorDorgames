import { useState, useEffect, useRef, useCallback } from "react";
import { GAMES_CONFIG, type GameConfig } from "@/games-config";

const POLL_INTERVAL = 30_000;

function fingerprint(games: GameConfig[]): string {
  return games
    .map((g) => `${g.id}|${g.title}|${g.titleAr}|${g.route}|${g.status}|${g.launchMode}|${g.imageUrl ?? ""}`)
    .join("~");
}

export type LiveGamesResult = {
  games: GameConfig[];
  updateAvailable: boolean;
};

export function useLiveGames(): LiveGamesResult {
  const [games, setGames] = useState<GameConfig[]>(GAMES_CONFIG);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const fpRef = useRef(fingerprint(GAMES_CONFIG));
  const versionRef = useRef<string | null>(null);

  const base = import.meta.env.BASE_URL ?? "/";

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch(`${base}games.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data: GameConfig[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) return;
      const fp = fingerprint(data);
      if (fp !== fpRef.current) {
        fpRef.current = fp;
        setGames(data);
      }
    } catch {
      // network error — silent
    }
  }, [base]);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch(`${base}version.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const { v } = await res.json();
      const vStr = String(v);
      if (versionRef.current === null) {
        versionRef.current = vStr;
      } else if (vStr !== versionRef.current) {
        setUpdateAvailable(true);
      }
    } catch {
      // silent
    }
  }, [base]);

  useEffect(() => {
    fetchGames();
    checkVersion();

    const id = setInterval(() => {
      fetchGames();
      checkVersion();
    }, POLL_INTERVAL);

    return () => clearInterval(id);
  }, [fetchGames, checkVersion]);

  return { games, updateAvailable };
}
