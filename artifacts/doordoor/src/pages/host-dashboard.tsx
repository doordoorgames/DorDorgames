import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import {
  useListGames,
  useCreateRoom,
  useListRooms,
  useCloseRoom,
  useSwitchRoomGame,
  getGetRoomQueryKey,
  useGetRoom,
  useGetAuthMe,
  getGetAuthMeQueryKey,
  useAuthLogout,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { getGameByRoute } from "@/games-config";

function BuyTimeLink() {
  return (
    <Link href="/pricing" className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-accent/50 bg-accent/5 px-4 py-2 font-sans text-sm font-semibold text-accent hover:bg-accent/10">
      <span>
        Buy more time
        <span className="arabic-text block text-xs" lang="ar" dir="rtl">شراء وقت إضافي</span>
      </span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}

function formatCountdown(minutes: number): string {
  if (minutes <= 0) return "0m";
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

function formatSessionEnd(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function HostDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: host,
    isLoading: hostLoading,
    error: hostError,
  } = useGetAuthMe({
    query: {
      queryKey: getGetAuthMeQueryKey(),
      retry: false,
    },
  });

  const { data: games } = useListGames();
  const { data: rooms } = useListRooms();

  const createRoom = useCreateRoom();
  const closeRoom = useCloseRoom();
  const switchGame = useSwitchRoomGame();
  const logout = useAuthLogout();

  const activeRoom = rooms?.find((r) => r.hostPhone === host?.phone && r.open);
  const activeGameRoute = games?.find((game) => game.id === activeRoom?.activeGameId)?.route;
  const activeGame = activeGameRoute ? getGameByRoute(activeGameRoute) : undefined;

  const { data: roomData } = useGetRoom(activeRoom?.code || "", {
    query: {
      enabled: !!activeRoom?.code,
      refetchInterval: 5000,
      queryKey: getGetRoomQueryKey(activeRoom?.code || ""),
    },
  });

  const [selectedGameId, setSelectedGameId] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // While a room is active, remaining time is the room's real expiry (wall-clock
  // truth). A host's credit balance is fully spent the moment a room is created
  // (see POST /rooms), so it must never be used to gate access to an active room.
  const sessionEndsAt =
    activeRoom?.expiresAt ?? host?.activeSessionEndsAt ?? null;
  const sessionIsActive =
    !!sessionEndsAt && new Date(sessionEndsAt).getTime() > now;
  const roomMinutesLeft = sessionIsActive
    ? Math.max(0, Math.ceil((new Date(sessionEndsAt!).getTime() - now) / 60000))
    : null;
  const permanentTestAccess = host?.permanentTestAccess === true;
  const displayMinutes = permanentTestAccess ? Infinity : sessionIsActive
    ? (roomMinutesLeft ?? 0)
    : (host?.remainingMinutes ?? 0);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        queryClient.clear();
        setLocation("/");
      },
    });
  };

  useEffect(() => {
    if (hostError) {
      setLocation("/host");
    } else if (host && host.role !== "host") {
      setLocation("/account");
    }
  }, [host, hostError, setLocation]);

  if (hostLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="font-mono text-secondary animate-pulse">LOADING...</p>
        </div>
      </Layout>
    );
  }

  if (!host) return null;

  const isLowTime = displayMinutes <= 30;
  const isCriticalTime = displayMinutes <= 10 && displayMinutes > 0;
  const isNoTime = displayMinutes <= 0;
  const minutesDisplay = formatCountdown(displayMinutes);

  if (!activeRoom && isNoTime) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 px-4">
          <div className="border-2 border-destructive p-6 text-center space-y-3 w-full max-w-sm">
            <p className="font-mono text-destructive text-xl">
              NO TIME REMAINING
            </p>
            <p className="arabic-text text-muted-foreground text-sm">
              لا يوجد وقت استضافة
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              Your hosting time has run out. Purchase more to continue.
            </p>
          </div>
          <div className="w-full max-w-sm">
            {!permanentTestAccess && <BuyTimeLink />}
          </div>
          <button
            onClick={handleLogout}
            className="font-mono text-xs text-muted-foreground underline"
          >
            Log out
          </button>
        </div>
      </Layout>
    );
  }

  const handleStartRoom = () => {
    if (!selectedGameId) {
      toast({ title: "SELECT A GAME", variant: "destructive" });
      return;
    }
    if (displayMinutes <= 0) {
      toast({
        title: "NO TIME REMAINING",
        description: "Purchase more hosting time to start a session.",
        variant: "destructive",
      });
      return;
    }
    const selectedGame = games?.find((game) => game.id === selectedGameId);
    const playableGame = selectedGame?.route ? getGameByRoute(selectedGame.route) : undefined;
    if (!playableGame || playableGame.status !== "active" || playableGame.launchMode === "coming_soon") {
      toast({ title: "GAME UNAVAILABLE", description: "Please choose an available game.", variant: "destructive" });
      return;
    }
    createRoom.mutate(
      { data: { gameId: selectedGameId } },
      {
        onSuccess: () => {
          window.location.assign(playableGame.externalUrl);
        },
        onError: (err: any) => {
          const msg =
            err?.data?.error || err?.message || "Failed to create room";
          toast({ title: "ERROR", description: msg, variant: "destructive" });
        },
      },
    );
  };

  const handleCloseRoom = () => {
    if (activeRoom) {
      closeRoom.mutate({ code: activeRoom.code });
    }
  };

  const handleSwitchGame = (gameId: string) => {
    if (activeRoom) {
      switchGame.mutate({ code: activeRoom.code, data: { gameId } });
    }
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-w-0 space-y-5 px-4 pt-5 pb-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <h1 className="font-mono text-xl text-secondary">DASHBOARD</h1>
            <p className="text-xs text-muted-foreground arabic-text">
              لوحة التحكم
            </p>
            <p className="font-mono text-xs text-foreground/70 mt-1">
              {host.fullName}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <motion.div
              key={displayMinutes}
              animate={
                isCriticalTime
                  ? { scale: [1, 1.06, 1], opacity: [1, 0.7, 1] }
                  : {}
              }
              transition={
                isCriticalTime
                  ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                  : {}
              }
              className={`font-mono text-xs px-2 py-1 border ${
                isNoTime
                  ? "border-destructive text-destructive"
                  : isCriticalTime
                    ? "border-destructive text-destructive shadow-[0_0_8px_rgba(255,0,0,0.4)]"
                    : displayMinutes > 30
                      ? "border-accent text-accent"
                      : "border-yellow-500 text-yellow-500"
              }`}
            >
              {permanentTestAccess ? "UNLIMITED TEST ACCESS" : sessionIsActive && sessionEndsAt
                ? `SESSION ENDS AT ${formatSessionEnd(sessionEndsAt)}`
                : `⏱ ${minutesDisplay} AVAILABLE`}
            </motion.div>
            <button
              onClick={handleLogout}
              className="text-xs font-mono text-destructive border border-destructive px-2 py-1 hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              LOGOUT
            </button>
          </div>
        </div>

        {isLowTime && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {isNoTime && (
              <div className="border-2 border-destructive p-3 text-center mb-3">
                <p className="font-mono text-destructive text-sm">
                  NO HOSTING TIME REMAINING
                </p>
                <p className="text-xs text-muted-foreground arabic-text">
                  لا يوجد وقت استضافة متبقٍ
                </p>
              </div>
            )}
            {isCriticalTime && (
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="border border-destructive/70 bg-destructive/5 p-3 text-center mb-3"
              >
                <p className="font-mono text-destructive text-xs">
                  ⚠ CRITICAL — {minutesDisplay} remaining / وقت حرج
                </p>
              </motion.div>
            )}
            {!isNoTime && !isCriticalTime && (
              <div className="border border-yellow-500/50 bg-yellow-500/5 p-3 text-center mb-3">
                <p className="font-mono text-yellow-500 text-xs">
                  ⚠ LOW TIME — {minutesDisplay} remaining
                </p>
              </div>
            )}
          </motion.div>
        )}

        {!permanentTestAccess && <BuyTimeLink />}

        {activeRoom ? (
          <div className="space-y-8">
            <div className="border-2 border-primary p-6 bg-background relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />

              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="text-center">
                  <p className="text-muted-foreground font-mono text-xs mb-2">
                    ROOM CODE
                  </p>
                  <h2 className="text-5xl font-mono text-primary tracking-widest animate-glow-pulse">
                    {activeRoom.code}
                  </h2>
                </div>

                <div className="p-4 bg-white">
                  <QRCodeSVG
                    value={`${window.location.origin}/join/${activeRoom.code}`}
                    size={200}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                <div className="w-full space-y-2">
                  <p className="font-mono text-sm text-center text-muted-foreground">
                    CONNECTED PLAYERS: {roomData?.guests?.length || 0}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {roomData?.guests?.map((g, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-secondary/20 text-secondary border border-secondary/50 font-mono text-xs"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                {activeGame?.status === "active" && activeGame.launchMode !== "coming_soon" && (
                  <a
                    href={activeGame.externalUrl}
                    className="w-full text-center bg-primary text-primary-foreground border-2 border-primary py-3 font-mono hover:bg-transparent hover:text-primary transition-colors"
                  >
                    OPEN GAME / افتح اللعبة
                  </a>
                )}
                <button
                  onClick={handleCloseRoom}
                  disabled={closeRoom.isPending}
                  className="w-full mt-4 bg-destructive/10 text-destructive border-2 border-destructive py-3 font-mono hover:bg-destructive hover:text-white transition-colors"
                >
                  CLOSE ROOM / إغلاق الغرفة
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-mono text-secondary">
                SWITCH GAME / تغيير اللعبة
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {games
                  ?.filter((g) => g.status === "active")
                  .map((game) => (
                    <button
                      key={game.id}
                      onClick={() => handleSwitchGame(game.id)}
                      className={`p-3 border-2 font-mono text-xs text-left transition-all ${
                        activeRoom.activeGameId === game.id
                          ? "border-primary bg-primary/10 text-primary shadow-[0_0_10px_rgba(255,0,255,0.3)]"
                          : "border-muted text-muted-foreground hover:border-secondary"
                      }`}
                    >
                      {game.title}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="font-sans font-bold text-primary text-xl">Select a game</h2>
              <div className="grid grid-cols-1 gap-2">
                {games
                  ?.filter((g) => g.status === "active")
                  .map((game) => (
                    <div
                      key={game.id}
                      onClick={() => setSelectedGameId(game.id)}
                      className={`w-full text-start cursor-pointer rounded-lg border p-3 flex items-center gap-3 transition-all ${
                        selectedGameId === game.id
                          ? "border-secondary bg-secondary/10 shadow-[0_0_15px_rgba(0,255,65,0.3)]"
                          : "border-muted hover:border-muted-foreground"
                      }`}
                    >
                      <div className="w-10 h-10 shrink-0 bg-muted border border-border flex items-center justify-center">
                        {game.logoUrl ? (
                          <img
                            src={game.logoUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          "👾"
                        )}
                      </div>
                      <div>
                        <h3 className="font-sans text-sm font-semibold">{game.title}</h3>
                        <p className="arabic-text text-xs text-muted-foreground">
                          {game.titleAr}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <button
              onClick={handleStartRoom}
              disabled={
                createRoom.isPending || !selectedGameId || displayMinutes <= 0
              }
              className="w-full bg-primary text-primary-foreground font-mono text-xl p-4 border-2 border-primary hover:bg-transparent hover:text-primary transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(255,0,255,0.5)]"
            >
              {createRoom.isPending ? "STARTING..." : "START FUN / ابدأ المرح"}
            </button>
          </div>
        )}
      </motion.div>
    </Layout>
  );
}
