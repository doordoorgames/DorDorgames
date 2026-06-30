import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import {
  useGetAdminStats,
  useListRooms,
  useCloseRoom,
  useListPromoCodes,
  useCreatePromoCode,
  useDeletePromoCode,
  useListGames,
  useCreateGame,
  useUpdateGame,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import type { PromoCodeInput } from "@workspace/api-client-react";

const inputCls =
  "w-full bg-background border border-destructive/50 text-foreground font-mono p-2 text-sm focus:outline-none focus:border-destructive placeholder:text-muted-foreground/40";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("admin_token");
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"games" | "rooms" | "promo">("games");
  const [newPromo, setNewPromo] = useState<Partial<PromoCodeInput>>({ code: "", active: true });
  const [newGame, setNewGame] = useState({ title: "", titleAr: "", slug: "" });

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const { data: stats } = useGetAdminStats({ request: authHeader });
  const { data: rooms, refetch: refetchRooms } = useListRooms({ request: authHeader });
  const { data: promos, refetch: refetchPromos } = useListPromoCodes({ request: authHeader });
  const { data: games, refetch: refetchGames } = useListGames();

  const closeRoom = useCloseRoom();
  const createPromo = useCreatePromoCode();
  const deletePromo = useDeletePromoCode();
  const createGame = useCreateGame();
  const updateGame = useUpdateGame();

  useEffect(() => {
    if (!token) setLocation("/admin");
  }, [token, setLocation]);

  if (!token) return null;

  const isDomainMisconfigured =
    typeof window !== "undefined" &&
    window.location.hostname.includes("replit.app");

  const handleCloseRoom = (code: string) => {
    if (confirm("FORCE CLOSE ROOM?")) {
      closeRoom.mutate({ code }, { onSuccess: () => refetchRooms() });
    }
  };

  const handleCreatePromo = () => {
    if (!newPromo.code) return;
    createPromo.mutate(
      { data: newPromo as PromoCodeInput },
      {
        onSuccess: () => {
          toast({ title: "PROMO CREATED" });
          refetchPromos();
          setNewPromo({ code: "", active: true });
        },
      },
    );
  };

  const handleDeletePromo = (code: string) => {
    if (confirm("DELETE PROMO?")) {
      deletePromo.mutate({ code }, { onSuccess: () => refetchPromos() });
    }
  };

  const handleCreateGame = () => {
    if (!newGame.title || !newGame.slug) return;
    createGame.mutate(
      {
        data: {
          title: newGame.title,
          titleAr: newGame.titleAr || newGame.title,
          slug: newGame.slug,
          status: "active",
          visible: true,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "GAME CREATED" });
          refetchGames();
          setNewGame({ title: "", titleAr: "", slug: "" });
        },
        onError: (err: any) => {
          toast({ title: "ERROR", description: err.message, variant: "destructive" });
        },
      },
    );
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "coming_soon" : "active";
    updateGame.mutate(
      { id, data: { status: nextStatus } },
      {
        onSuccess: () => {
          toast({ title: `STATUS → ${nextStatus.toUpperCase().replace("_", " ")}` });
          refetchGames();
        },
        onError: (err: any) => {
          toast({ title: "ERROR", description: err.message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <Layout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-8">
        {isDomainMisconfigured && (
          <div className="border border-yellow-500 bg-yellow-500/10 px-3 py-2 text-yellow-400 font-mono text-[10px] leading-snug">
            ⚠ CUSTOM DOMAIN NOT CONNECTED — you are on a replit.app URL. Game
            proxy routes and QR codes will not work correctly until dordor.games
            is pointing to this deployment.
          </div>
        )}

        <div className="flex items-center justify-between border-b border-destructive pb-4">
          <h1 className="font-mono text-xl text-destructive animate-flicker">ADMIN_OS</h1>
          <button
            onClick={() => {
              localStorage.removeItem("admin_token");
              setLocation("/admin");
            }}
            className="text-xs font-mono text-destructive border border-destructive px-2 py-1 hover:bg-destructive hover:text-destructive-foreground"
          >
            LOGOUT
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "TOTAL GAMES", value: stats.totalGames },
              { label: "ACTIVE ROOMS", value: stats.activeRooms },
              { label: "TOTAL GUESTS", value: stats.totalGuests },
              { label: "ACTIVE GAMES", value: stats.activeGames },
            ].map((s) => (
              <div key={s.label} className="border border-destructive p-3 bg-destructive/10 text-center">
                <p className="text-[10px] font-mono text-destructive mb-1">{s.label}</p>
                <p className="text-xl font-mono text-destructive">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["games", "rooms", "promo"] as const).map((tab) => (
            <button
              key={tab}
              className={`flex-1 py-2 font-mono text-xs ${
                activeTab === tab
                  ? "text-destructive border-b-2 border-destructive"
                  : "text-muted-foreground"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ── GAMES TAB ── */}
        {activeTab === "games" && (
          <div className="space-y-4">
            {/* Create game form */}
            <div className="border border-destructive p-4 space-y-3 bg-background">
              <h3 className="font-mono text-sm text-destructive">ADD GAME</h3>
              <input
                type="text"
                placeholder="Title (English)"
                value={newGame.title}
                onChange={(e) => setNewGame({ ...newGame, title: e.target.value })}
                className={inputCls}
                data-testid="game-title-input"
              />
              <input
                type="text"
                placeholder="Title (Arabic)"
                value={newGame.titleAr}
                onChange={(e) => setNewGame({ ...newGame, titleAr: e.target.value })}
                className={inputCls}
              />
              <input
                type="text"
                placeholder="Slug (e.g. my-game)"
                value={newGame.slug}
                onChange={(e) =>
                  setNewGame({ ...newGame, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                }
                className={inputCls}
                data-testid="game-slug-input"
              />
              <button
                onClick={handleCreateGame}
                disabled={createGame.isPending || !newGame.title || !newGame.slug}
                className="w-full bg-destructive text-destructive-foreground font-mono text-sm py-2 hover:bg-transparent hover:text-destructive border border-destructive transition-colors disabled:opacity-40"
                data-testid="create-game-button"
              >
                {createGame.isPending ? "CREATING..." : "CREATE GAME"}
              </button>
            </div>

            {/* Game list */}
            {games?.map((game) => {
              const isActive = game.status === "active";

              return (
                <div key={game.id} className="border border-border p-4 space-y-3" data-testid={`game-row-${game.slug}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h4 className="font-mono text-sm truncate">{game.title}</h4>
                      <p className="arabic-text text-xs text-muted-foreground truncate" dir="rtl">
                        {game.titleAr}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1 border flex-shrink-0 ${
                        isActive
                          ? "text-primary border-primary"
                          : "text-muted-foreground border-muted-foreground"
                      }`}
                      data-testid={`game-status-${game.slug}`}
                    >
                      {game.status}
                    </span>
                  </div>

                  {game.route && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-muted-foreground/60 uppercase flex-shrink-0">
                        ROUTE
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">{game.route}</span>
                    </div>
                  )}

                  <button
                    onClick={() => handleToggleStatus(game.id, game.status)}
                    disabled={updateGame.isPending}
                    className={`w-full py-1 border text-[10px] font-mono transition-colors disabled:opacity-40 ${
                      isActive
                        ? "border-muted-foreground text-muted-foreground hover:bg-muted-foreground/10"
                        : "border-primary text-primary hover:bg-primary/10"
                    }`}
                    data-testid={`toggle-status-${game.slug}`}
                  >
                    {isActive ? "SET COMING SOON" : "SET ACTIVE"}
                  </button>
                </div>
              );
            })}

            {(!games || games.length === 0) && (
              <p className="text-center text-xs font-mono text-muted-foreground py-8">NO GAMES</p>
            )}
          </div>
        )}

        {/* ── ROOMS TAB ── */}
        {activeTab === "rooms" && (
          <div className="space-y-4">
            {rooms?.map((room) => (
              <div key={room.code} className="border border-border p-4 space-y-3">
                <div className="flex justify-between">
                  <h4 className="font-mono text-sm text-primary">{room.code}</h4>
                  <span className="text-[10px] font-mono text-muted-foreground">{room.hostPhone}</span>
                </div>
                <p className="text-xs font-mono text-muted-foreground">
                  GAME: {room.activeGame?.title || room.activeGameId}
                </p>
                <p className="text-xs font-mono text-muted-foreground">GUESTS: {room.guests.length}</p>
                <button
                  onClick={() => handleCloseRoom(room.code)}
                  className="w-full py-1 border border-destructive text-destructive text-[10px] font-mono hover:bg-destructive/10"
                >
                  FORCE CLOSE
                </button>
              </div>
            ))}
            {(!rooms || rooms.length === 0) && (
              <p className="text-center text-xs font-mono text-muted-foreground py-8">NO ACTIVE ROOMS</p>
            )}
          </div>
        )}

        {/* ── PROMO TAB ── */}
        {activeTab === "promo" && (
          <div className="space-y-6">
            <div className="space-y-3 border border-destructive p-4 bg-background">
              <h3 className="font-mono text-sm text-destructive">ADD PROMO CODE</h3>
              <input
                type="text"
                placeholder="Code (e.g. VIP2024)"
                value={newPromo.code}
                onChange={(e) =>
                  setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })
                }
                className={`${inputCls} uppercase`}
              />
              <button
                onClick={handleCreatePromo}
                className="w-full bg-destructive text-destructive-foreground font-mono text-sm py-2 hover:bg-transparent hover:text-destructive border border-destructive transition-colors"
              >
                CREATE PROMO
              </button>
            </div>

            <div className="space-y-4">
              {promos?.map((promo) => (
                <div
                  key={promo.id}
                  className="border border-border p-4 flex justify-between items-center"
                >
                  <div>
                    <h4 className="font-mono text-sm text-accent">{promo.code}</h4>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                      USES: {promo.usageCount}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeletePromo(promo.code)}
                    className="py-1 px-3 border border-destructive text-destructive text-[10px] font-mono hover:bg-destructive/10"
                  >
                    DELETE
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </Layout>
  );
}
