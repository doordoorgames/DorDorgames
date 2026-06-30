import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";

export default function HostDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const token = localStorage.getItem("host_token");

  const {
    data: host,
    isLoading: hostLoading,
    error: hostError,
  } = useGetAuthMe({
    query: {
      queryKey: getGetAuthMeQueryKey(),
      enabled: !!token,
      retry: false,
    },
  });

  const { data: games } = useListGames();
  const { data: rooms } = useListRooms();

  const createRoom = useCreateRoom();
  const closeRoom = useCloseRoom();
  const switchGame = useSwitchRoomGame();

  const activeRoom = rooms?.find(
    (r) => r.hostPhone === host?.phone && r.open,
  );

  const { data: roomData } = useGetRoom(activeRoom?.code || "", {
    query: {
      enabled: !!activeRoom?.code,
      refetchInterval: 5000,
      queryKey: getGetRoomQueryKey(activeRoom?.code || ""),
    },
  });

  const [selectedGameId, setSelectedGameId] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("host_token");
    setLocation("/");
  };

  const isNoTimeError =
    hostError &&
    (hostError as any)?.response?.status === 403 &&
    ((hostError as any)?.response?.data?.error as string)?.includes(
      "No hosting time",
    );

  useEffect(() => {
    if (!token) {
      setLocation("/host");
      return;
    }
    if (hostError && !isNoTimeError) {
      localStorage.removeItem("host_token");
      setLocation("/host");
    }
  }, [token, hostError, isNoTimeError, setLocation]);

  if (!token || (hostLoading && !isNoTimeError)) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="font-mono text-secondary animate-pulse">LOADING...</p>
        </div>
      </Layout>
    );
  }

  if (isNoTimeError) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="border-2 border-destructive p-6 text-center space-y-3 w-full max-w-sm">
            <p className="font-mono text-destructive text-xl">NO TIME REMAINING</p>
            <p className="arabic-text text-muted-foreground text-sm">لا يوجد وقت استضافة</p>
            <p className="font-mono text-xs text-muted-foreground">
              Your hosting time has run out. Purchase more to continue.
            </p>
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

  if (!host) return null;

  const handleStartRoom = () => {
    if (!selectedGameId) {
      toast({ title: "SELECT A GAME", variant: "destructive" });
      return;
    }
    if (host.remainingMinutes <= 0) {
      toast({
        title: "NO TIME REMAINING",
        description: "Purchase more hosting time to start a session.",
        variant: "destructive",
      });
      return;
    }
    createRoom.mutate(
      { data: { gameId: selectedGameId } },
      {
        onSuccess: () => {
          toast({ title: "ROOM CREATED" });
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.error || err?.message || "Failed to create room";
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

  const minutesDisplay =
    host.remainingMinutes >= 60
      ? `${Math.floor(host.remainingMinutes / 60)}h ${host.remainingMinutes % 60}m`
      : `${host.remainingMinutes}m`;

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-8 pb-8"
      >
        <div className="flex items-start justify-between border-b border-border pb-4">
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
            <div
              className={`font-mono text-xs px-2 py-1 border ${
                host.remainingMinutes > 0
                  ? "border-accent text-accent"
                  : "border-destructive text-destructive"
              }`}
            >
              ⏱ {minutesDisplay} left
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-mono text-destructive border border-destructive px-2 py-1 hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              LOGOUT
            </button>
          </div>
        </div>

        {host.remainingMinutes <= 0 && !activeRoom && (
          <div className="border-2 border-destructive p-4 text-center space-y-2">
            <p className="font-mono text-destructive text-sm">
              NO HOSTING TIME REMAINING
            </p>
            <p className="text-xs text-muted-foreground arabic-text">
              لا يوجد وقت استضافة متبقٍ
            </p>
          </div>
        )}

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
                    CONNECTED GUESTS: {roomData?.guests?.length || 0}
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
              <h2 className="font-mono text-primary text-xl">SELECT GAME</h2>
              <div className="grid grid-cols-1 gap-4">
                {games
                  ?.filter((g) => g.status === "active")
                  .map((game) => (
                    <div
                      key={game.id}
                      onClick={() => setSelectedGameId(game.id)}
                      className={`cursor-pointer border-2 p-4 flex items-center gap-4 transition-all ${
                        selectedGameId === game.id
                          ? "border-secondary bg-secondary/10 shadow-[0_0_15px_rgba(0,255,65,0.3)]"
                          : "border-muted hover:border-muted-foreground"
                      }`}
                    >
                      <div className="w-12 h-12 bg-muted border border-border flex items-center justify-center">
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
                        <h3 className="font-mono text-sm">{game.title}</h3>
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
                createRoom.isPending ||
                !selectedGameId ||
                host.remainingMinutes <= 0
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
