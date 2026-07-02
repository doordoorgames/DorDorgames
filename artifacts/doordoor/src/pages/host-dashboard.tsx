import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
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
  useProcessPayment,
  useValidatePromo,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";

function BuyTimePanel({
  onSuccess,
  open,
  onOpenChange,
  phone,
}: {
  onSuccess: (remainingMinutes?: number) => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  phone: string;
}) {
  const { toast } = useToast();
  const [promoInput, setPromoInput] = useState("");
  const [promoValidated, setPromoValidated] = useState<{ valid: boolean; message: string } | null>(null);

  const validatePromo = useValidatePromo();
  const processPayment = useProcessPayment();

  const handleValidatePromo = () => {
    if (!promoInput.trim()) return;
    validatePromo.mutate(
      { data: { code: promoInput.trim() } },
      {
        onSuccess: (data) => {
          setPromoValidated({ valid: data.valid, message: data.message || (data.valid ? "Valid promo!" : "Invalid promo code") });
        },
        onError: () => {
          setPromoValidated({ valid: false, message: "Failed to validate promo code" });
        },
      },
    );
  };

  const handlePay = (promoCode?: string) => {
    processPayment.mutate(
      { data: { phone: phone || "unknown", ...(promoCode ? { promoCode } : {}) } },
      {
        onSuccess: (data) => {
          if (data.success) {
            toast({
              title: data.free ? "PROMO APPLIED!" : "PAYMENT SUCCESS",
              description: data.message,
            });
            onOpenChange(false);
            setPromoInput("");
            setPromoValidated(null);
            onSuccess(data.remainingMinutes);
          }
        },
        onError: (err: any) => {
          const msg = err?.data?.error || err?.message || "Payment failed";
          toast({ title: "PAYMENT FAILED", description: msg, variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="border-2 border-accent/60 bg-accent/5">
      <button
        onClick={() => onOpenChange(!open)}
        className="w-full flex items-center justify-between p-4 font-mono text-sm text-accent hover:bg-accent/10 transition-colors"
      >
        <span>+ BUY MORE TIME / شراء وقت إضافي</span>
        <span className="text-lg">{open ? "▲" : "▼"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              <div className="text-center space-y-1 py-2 border-t border-border">
                <p className="font-mono text-xs text-muted-foreground">3-HOUR HOSTING PASS</p>
                <p className="font-mono text-3xl text-accent">2 KD</p>
                <p className="arabic-text text-xs text-muted-foreground">تصفح لمدة 3 ساعات</p>
              </div>

              <div className="space-y-2">
                <p className="font-mono text-xs text-muted-foreground">PROMO CODE / كود خصم</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value.toUpperCase());
                      setPromoValidated(null);
                    }}
                    placeholder="DOORDOOR"
                    className="flex-1 bg-background border border-border font-mono text-sm px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={handleValidatePromo}
                    disabled={!promoInput.trim() || validatePromo.isPending}
                    className="font-mono text-xs px-3 py-2 border border-accent text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-50"
                  >
                    {validatePromo.isPending ? "..." : "CHECK"}
                  </button>
                </div>

                {promoValidated && (
                  <p className={`font-mono text-xs ${promoValidated.valid ? "text-secondary" : "text-destructive"}`}>
                    {promoValidated.valid ? "✓ " : "✗ "}{promoValidated.message}
                  </p>
                )}

                {promoValidated?.valid && (
                  <button
                    onClick={() => handlePay(promoInput.trim())}
                    disabled={processPayment.isPending}
                    className="w-full py-3 bg-secondary/10 border-2 border-secondary text-secondary font-mono text-sm hover:bg-secondary hover:text-black transition-colors disabled:opacity-50"
                  >
                    {processPayment.isPending ? "ACTIVATING..." : "APPLY PROMO — FREE / مجاناً"}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <p className="font-mono text-xs text-muted-foreground">OR / أو</p>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button
                onClick={() => handlePay()}
                disabled={processPayment.isPending}
                className="w-full py-3 bg-primary/10 border-2 border-primary text-primary font-mono text-sm hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 shadow-[0_0_8px_rgba(255,0,255,0.2)]"
              >
                {processPayment.isPending ? "PROCESSING..." : "PAY 2 KD (SIMULATED) / دفع 2 KD"}
              </button>

              <p className="font-mono text-xs text-muted-foreground text-center">
                Payment is simulated — no real charge
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatCountdown(minutes: number): string {
  if (minutes <= 0) return "0m";
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

export default function HostDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
  const [buyTimeOpen, setBuyTimeOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // While a room is active, remaining time is the room's real expiry (wall-clock
  // truth). A host's credit balance is fully spent the moment a room is created
  // (see POST /rooms), so it must never be used to gate access to an active room.
  const roomMinutesLeft = activeRoom
    ? Math.max(0, Math.ceil((new Date(activeRoom.expiresAt).getTime() - now) / 60000))
    : null;
  const displayMinutes = activeRoom ? (roomMinutesLeft ?? 0) : (host?.remainingMinutes ?? 0);

  useEffect(() => {
    if (activeRoom && displayMinutes <= 0 && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setBuyTimeOpen(true);
    }
    if (displayMinutes > 0) {
      autoOpenedRef.current = false;
    }
  }, [activeRoom, displayMinutes]);

  const handleLogout = () => {
    localStorage.removeItem("host_token");
    setLocation("/");
  };

  useEffect(() => {
    if (!token) {
      setLocation("/host");
      return;
    }
    if (hostError) {
      localStorage.removeItem("host_token");
      setLocation("/host");
    }
  }, [token, hostError, setLocation]);

  const handleBuyTimeSuccess = (remainingMinutes?: number) => {
    queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
    if (remainingMinutes !== undefined) {
      autoOpenedRef.current = false;
      queryClient.setQueryData(getGetAuthMeQueryKey(), (old: any) =>
        old ? { ...old, remainingMinutes } : old,
      );
    }
  };

  if (!token || hostLoading) {
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="border-2 border-destructive p-6 text-center space-y-3 w-full max-w-sm">
            <p className="font-mono text-destructive text-xl">NO TIME REMAINING</p>
            <p className="arabic-text text-muted-foreground text-sm">لا يوجد وقت استضافة</p>
            <p className="font-mono text-xs text-muted-foreground">
              Your hosting time has run out. Purchase more to continue.
            </p>
          </div>
          <div className="w-full max-w-sm">
            <BuyTimePanel
              open={buyTimeOpen}
              onOpenChange={setBuyTimeOpen}
              phone={host?.phone ?? ""}
              onSuccess={handleBuyTimeSuccess}
            />
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
    createRoom.mutate(
      { data: { gameId: selectedGameId } },
      {
        onSuccess: () => {
          toast({ title: "ROOM CREATED" });
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
              ⏱ {minutesDisplay} left
            </motion.div>
            <button
              onClick={() => setBuyTimeOpen((v) => !v)}
              className="text-xs font-mono text-accent border border-accent/60 px-2 py-1 hover:bg-accent hover:text-black transition-colors"
            >
              + BUY TIME
            </button>
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
                <p className="font-mono text-destructive text-sm">NO HOSTING TIME REMAINING</p>
                <p className="text-xs text-muted-foreground arabic-text">لا يوجد وقت استضافة متبقٍ</p>
              </div>
            )}
            {isCriticalTime && (
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
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

        <BuyTimePanel
          open={buyTimeOpen}
          onOpenChange={setBuyTimeOpen}
          phone={host?.phone ?? ""}
          onSuccess={handleBuyTimeSuccess}
        />

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
                displayMinutes <= 0
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
