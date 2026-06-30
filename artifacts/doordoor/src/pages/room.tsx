import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Layout } from "@/components/layout";
import { useGetRoom, getGetRoomQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";

export default function RoomView() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const code = params.code || "";
  const [sessionEnded, setSessionEnded] = useState(false);

  const { data: room, isLoading, error } = useGetRoom(code, {
    query: {
      enabled: !!code && !sessionEnded,
      refetchInterval: 3000,
      queryKey: getGetRoomQueryKey(code),
      retry: false,
    }
  });

  useEffect(() => {
    if (!error) return;
    const status = (error as { status?: number }).status;
    if (status === 404) {
      setSessionEnded(true);
    } else {
      setLocation("/");
    }
  }, [error, setLocation]);

  if (isLoading && !room) {
    return (
      <Layout>
        <div className="flex justify-center p-8">
          <div className="text-primary font-mono animate-pulse">CONNECTING...</div>
        </div>
      </Layout>
    );
  }

  if (sessionEnded) {
    return (
      <Layout>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center"
        >
          <div className="text-6xl">⏱</div>
          <h1 className="font-mono text-2xl text-primary animate-glow-pulse tracking-widest">
            SESSION ENDED
          </h1>
          <p className="font-mono text-sm text-muted-foreground">
            انتهت الجلسة
          </p>
          <p className="font-mono text-xs text-muted-foreground max-w-xs">
            The host's time ran out and this room has been closed.
          </p>
          <button
            onClick={() => setLocation("/")}
            className="mt-4 font-mono text-sm border border-primary text-primary px-6 py-3 hover:bg-primary hover:text-background transition-all"
          >
            BACK TO ARCADE / العودة
          </button>
        </motion.div>
      </Layout>
    );
  }

  if (!room) {
    return null;
  }

  return (
    <Layout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="text-center space-y-2 border-b border-border pb-4">
          <p className="text-muted-foreground font-mono text-xs">CONNECTED TO</p>
          <h1 className="text-2xl font-mono text-primary animate-glow-pulse tracking-widest">{room.code}</h1>
        </div>

        <div className="border-2 border-accent p-6 bg-accent/5 shadow-[0_0_20px_rgba(0,206,209,0.2)]">
          <div className="text-center space-y-4">
            <h2 className="font-mono text-sm text-accent">CURRENT GAME</h2>
            <div className="w-24 h-24 mx-auto bg-muted border-2 border-accent">
              {room.activeGame?.logoUrl ? (
                <img src={room.activeGame.logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">👾</div>
              )}
            </div>
            <div>
              <h3 className="font-mono text-xl text-foreground">{room.activeGame?.title}</h3>
              <p className="arabic-text text-muted-foreground mt-2">{room.activeGame?.titleAr}</p>
            </div>
          </div>
        </div>

        {room.activeGame?.route && (
          <div className="text-center">
            <a 
              href={room.activeGame.route} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block w-full bg-secondary text-secondary-foreground font-mono text-xl p-4 border-2 border-secondary hover:bg-transparent hover:text-secondary transition-all shadow-[0_0_10px_rgba(0,255,65,0.5)]"
            >
              PLAY NOW / العب الآن
            </a>
          </div>
        )}

        <div className="space-y-4">
          <h4 className="font-mono text-xs text-muted-foreground">PLAYERS ({room.guests?.length})</h4>
          <div className="grid grid-cols-2 gap-2">
            {room.guests?.map((guest, i) => (
              <div key={i} className="bg-background border border-border p-2 font-mono text-xs text-center truncate">
                {guest}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </Layout>
  );
}
