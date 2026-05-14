import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useListGames, useCreateRoom, useListRooms, useCloseRoom, useSwitchRoomGame, getGetRoomQueryKey, useGetRoom } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";

export default function HostDashboard() {
  const [, setLocation] = useLocation();
  const phone = localStorage.getItem("host_phone");
  const { toast } = useToast();

  const { data: games } = useListGames();
  const { data: rooms } = useListRooms();
  
  const createRoom = useCreateRoom();
  const closeRoom = useCloseRoom();
  const switchGame = useSwitchRoomGame();

  const activeRoom = rooms?.find(r => r.hostPhone === phone && r.open);

  const { data: roomData } = useGetRoom(activeRoom?.code || "", {
    query: {
      enabled: !!activeRoom?.code,
      refetchInterval: 5000,
      queryKey: getGetRoomQueryKey(activeRoom?.code || "")
    }
  });

  const [selectedGameId, setSelectedGameId] = useState("");

  useEffect(() => {
    if (!phone) {
      setLocation("/host");
    }
  }, [phone, setLocation]);

  if (!phone) return null;

  const handleStartRoom = () => {
    if (!selectedGameId) {
      toast({ title: "SELECT A GAME", variant: "destructive" });
      return;
    }
    createRoom.mutate({ data: { hostPhone: phone, gameId: selectedGameId } }, {
      onSuccess: () => {
        toast({ title: "ROOM CREATED" });
      }
    });
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-8">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="font-mono text-xl text-secondary">DASHBOARD</h1>
            <p className="text-xs text-muted-foreground arabic-text">لوحة التحكم</p>
          </div>
          <button 
            onClick={() => { localStorage.removeItem("host_phone"); setLocation("/"); }}
            className="text-xs font-mono text-destructive border border-destructive px-2 py-1 hover:bg-destructive hover:text-destructive-foreground"
          >
            LOGOUT
          </button>
        </div>

        {activeRoom ? (
          <div className="space-y-8">
            <div className="border-2 border-primary p-6 bg-background relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />
              
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="text-center">
                  <p className="text-muted-foreground font-mono text-xs mb-2">ROOM CODE</p>
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
                  <p className="font-mono text-sm text-center text-muted-foreground">CONNECTED GUESTS: {roomData?.guests?.length || 0}</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {roomData?.guests?.map((g, i) => (
                      <span key={i} className="px-2 py-1 bg-secondary/20 text-secondary border border-secondary/50 font-mono text-xs">
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
              <h3 className="font-mono text-secondary">SWITCH GAME / تغيير اللعبة</h3>
              <div className="grid grid-cols-2 gap-4">
                {games?.filter(g => g.status === 'active').map(game => (
                  <button
                    key={game.id}
                    onClick={() => handleSwitchGame(game.id)}
                    className={`p-3 border-2 font-mono text-xs text-left transition-all ${activeRoom.activeGameId === game.id ? 'border-primary bg-primary/10 text-primary shadow-[0_0_10px_rgba(255,0,255,0.3)]' : 'border-muted text-muted-foreground hover:border-secondary'}`}
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
                {games?.filter(g => g.status === 'active').map(game => (
                  <div 
                    key={game.id}
                    onClick={() => setSelectedGameId(game.id)}
                    className={`cursor-pointer border-2 p-4 flex items-center gap-4 transition-all ${selectedGameId === game.id ? 'border-secondary bg-secondary/10 shadow-[0_0_15px_rgba(0,255,65,0.3)]' : 'border-muted hover:border-muted-foreground'}`}
                  >
                    <div className="w-12 h-12 bg-muted border border-border flex items-center justify-center">
                      {game.logoUrl ? <img src={game.logoUrl} alt="" className="w-full h-full object-cover"/> : "👾"}
                    </div>
                    <div>
                      <h3 className="font-mono text-sm">{game.title}</h3>
                      <p className="arabic-text text-xs text-muted-foreground">{game.titleAr}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartRoom}
              disabled={createRoom.isPending || !selectedGameId}
              className="w-full bg-primary text-primary-foreground font-mono text-xl p-4 border-2 border-primary hover:bg-transparent hover:text-primary transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(255,0,255,0.5)]"
            >
              START FUN / ابدأ المرح
            </button>
          </div>
        )}
      </motion.div>
    </Layout>
  );
}
