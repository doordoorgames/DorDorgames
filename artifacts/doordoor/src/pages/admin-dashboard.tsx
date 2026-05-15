import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import {
  useGetAdminStats,
  useListGames,
  useCreateGame,
  useUpdateGame,
  useDeleteGame,
  useListRooms,
  useCloseRoom,
  useListPromoCodes,
  useCreatePromoCode,
  useDeletePromoCode,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { GameInput, PromoCodeInput } from "@workspace/api-client-react/src/generated/api.schemas";

const inputCls =
  "w-full bg-background border border-destructive/50 text-foreground font-mono p-2 text-sm focus:outline-none focus:border-destructive placeholder:text-muted-foreground/40";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("admin_token");
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"games" | "rooms" | "promo">("games");
  const [editingUrlId, setEditingUrlId] = useState<string | null>(null);
  const [editingUrlValue, setEditingUrlValue] = useState("");

  const [newGame, setNewGame] = useState<Partial<GameInput>>({
    title: "",
    titleAr: "",
    slug: "",
    status: "active",
    visible: true,
    externalUrl: "",
  });
  const [newPromo, setNewPromo] = useState<Partial<PromoCodeInput>>({ code: "", active: true });

  const { data: stats } = useGetAdminStats({
    request: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: games, refetch: refetchGames } = useListGames();
  const { data: rooms, refetch: refetchRooms } = useListRooms({
    request: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: promos, refetch: refetchPromos } = useListPromoCodes({
    request: { headers: { Authorization: `Bearer ${token}` } },
  });

  const createGame = useCreateGame();
  const updateGame = useUpdateGame();
  const deleteGame = useDeleteGame();
  const closeRoom = useCloseRoom();
  const createPromo = useCreatePromoCode();
  const deletePromo = useDeletePromoCode();

  useEffect(() => {
    if (!token) setLocation("/admin");
  }, [token, setLocation]);

  if (!token) return null;

  const handleCreateGame = () => {
    if (!newGame.title || !newGame.slug || !newGame.titleAr) return;
    createGame.mutate(
      { data: newGame as GameInput },
      {
        onSuccess: () => {
          toast({ title: "GAME CREATED" });
          refetchGames();
          setNewGame({ title: "", titleAr: "", slug: "", status: "active", visible: true, externalUrl: "" });
        },
      },
    );
  };

  const handleToggleStatus = (id: string, current: string) => {
    updateGame.mutate(
      { id, data: { status: current === "active" ? "coming_soon" : "active" } },
      { onSuccess: () => refetchGames() },
    );
  };

  const handleSaveUrl = (id: string) => {
    updateGame.mutate(
      { id, data: { externalUrl: editingUrlValue.trim() } },
      {
        onSuccess: () => {
          toast({ title: "URL SAVED" });
          refetchGames();
          setEditingUrlId(null);
          setEditingUrlValue("");
        },
      },
    );
  };

  const handleDeleteGame = (id: string) => {
    if (confirm("DELETE GAME?")) {
      deleteGame.mutate({ id }, { onSuccess: () => refetchGames() });
    }
  };

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

  return (
    <Layout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-8">
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
              className={`flex-1 py-2 font-mono text-xs ${activeTab === tab ? "text-destructive border-b-2 border-destructive" : "text-muted-foreground"}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ── GAMES TAB ── */}
        {activeTab === "games" && (
          <div className="space-y-6">
            {/* Add Game Form */}
            <div className="space-y-3 border border-destructive p-4 bg-background">
              <h3 className="font-mono text-sm text-destructive">ADD NEW GAME</h3>
              <input
                type="text"
                placeholder="Title (English)"
                value={newGame.title}
                onChange={(e) => setNewGame({ ...newGame, title: e.target.value })}
                className={inputCls}
              />
              <input
                type="text"
                placeholder="العنوان بالعربي"
                value={newGame.titleAr}
                onChange={(e) => setNewGame({ ...newGame, titleAr: e.target.value })}
                className={`${inputCls} text-right`}
                dir="rtl"
              />
              <input
                type="text"
                placeholder="Slug (e.g. flash)"
                value={newGame.slug}
                onChange={(e) =>
                  setNewGame({ ...newGame, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                }
                className={inputCls}
              />
              <input
                type="url"
                placeholder="External URL (https://...)"
                value={newGame.externalUrl ?? ""}
                onChange={(e) => setNewGame({ ...newGame, externalUrl: e.target.value })}
                className={inputCls}
              />
              <button
                onClick={handleCreateGame}
                className="w-full bg-destructive text-destructive-foreground font-mono text-sm py-2 hover:bg-transparent hover:text-destructive border border-destructive transition-colors"
              >
                CREATE GAME
              </button>
            </div>

            {/* Game List */}
            <div className="space-y-4">
              {games?.map((game) => (
                <div key={game.id} className="border border-border p-4 space-y-3">
                  {/* Title + status */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h4 className="font-mono text-sm truncate">{game.title}</h4>
                      <p className="text-[10px] text-muted-foreground font-mono">{game.slug}</p>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1 border flex-shrink-0 ${
                        game.status === "active"
                          ? "text-primary border-primary"
                          : "text-muted-foreground border-muted-foreground"
                      }`}
                    >
                      {game.status}
                    </span>
                  </div>

                  {/* External URL row */}
                  {editingUrlId === game.id ? (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={editingUrlValue}
                        onChange={(e) => setEditingUrlValue(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 bg-background border border-primary text-foreground font-mono p-1 text-xs focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveUrl(game.id)}
                        className="px-2 py-1 bg-primary text-primary-foreground font-mono text-[10px] hover:bg-primary/80"
                      >
                        SAVE
                      </button>
                      <button
                        onClick={() => { setEditingUrlId(null); setEditingUrlValue(""); }}
                        className="px-2 py-1 border border-muted-foreground text-muted-foreground font-mono text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-2 cursor-pointer group"
                      onClick={() => {
                        setEditingUrlId(game.id);
                        setEditingUrlValue(game.externalUrl ?? "");
                      }}
                    >
                      <span className="text-[9px] font-mono text-muted-foreground/60 uppercase flex-shrink-0">
                        URL
                      </span>
                      <span
                        className={`text-[10px] font-mono truncate flex-1 group-hover:text-accent transition-colors ${
                          game.externalUrl ? "text-accent" : "text-muted-foreground/40 italic"
                        }`}
                      >
                        {game.externalUrl || "not set — tap to edit"}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground/40 flex-shrink-0">✎</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleStatus(game.id, game.status)}
                      className="flex-1 py-1 border border-border text-[10px] font-mono hover:bg-white/5"
                    >
                      {game.status === "active" ? "SET COMING SOON" : "SET ACTIVE"}
                    </button>
                    <button
                      onClick={() => handleDeleteGame(game.id)}
                      className="flex-1 py-1 border border-destructive text-destructive text-[10px] font-mono hover:bg-destructive/10"
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
                onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
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
                <div key={promo.id} className="border border-border p-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-mono text-sm text-accent">{promo.code}</h4>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">USES: {promo.usageCount}</p>
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
