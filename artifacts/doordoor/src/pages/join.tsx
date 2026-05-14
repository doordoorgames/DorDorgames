import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Layout } from "@/components/layout";
import { useJoinRoom } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Join() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const initialCode = params.code || "";
  
  const [code, setCode] = useState(initialCode);
  const [nickname, setNickname] = useState("");
  
  const joinRoom = useJoinRoom();
  const { toast } = useToast();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !nickname) {
      toast({ title: "ERROR", description: "ENTER CODE AND NICKNAME", variant: "destructive" });
      return;
    }
    
    joinRoom.mutate({ code, data: { nickname } }, {
      onSuccess: () => {
        setLocation(`/room/${code}`);
      },
      onError: (err: any) => {
        toast({ 
          title: "ACCESS DENIED", 
          description: err.message || "Failed to join room", 
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex flex-col items-center justify-center min-h-[70vh]"
      >
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-4">
            <h1 className="font-mono text-3xl text-primary animate-glow-pulse">JOIN ROOM</h1>
            <p className="arabic-text text-muted-foreground text-sm">انضم إلى الغرفة</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-6">
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="ROOM CODE / رمز الغرفة"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-background border-2 border-primary text-foreground font-mono p-4 text-center text-2xl uppercase focus:outline-none focus:border-accent focus:shadow-[0_0_15px_rgba(0,255,65,0.5)] transition-all placeholder:text-muted/50"
                  maxLength={6}
                />
              </div>
              
              <div>
                <input
                  type="text"
                  placeholder="NICKNAME / الاسم المستعار"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-background border-2 border-primary text-foreground font-mono p-4 text-center text-xl focus:outline-none focus:border-accent focus:shadow-[0_0_15px_rgba(0,255,65,0.5)] transition-all placeholder:text-muted/50"
                  maxLength={15}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={joinRoom.isPending}
              className="w-full bg-primary text-primary-foreground font-mono text-xl p-4 border-2 border-primary hover:bg-transparent hover:text-primary transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(255,0,255,0.5)]"
            >
              {joinRoom.isPending ? "CONNECTING..." : "ENTER / دخول"}
            </button>
          </form>
        </div>
      </motion.div>
    </Layout>
  );
}
