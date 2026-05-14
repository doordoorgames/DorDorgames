import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useAdminLogin } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const adminLogin = useAdminLogin();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    adminLogin.mutate({ data: { username, password } }, {
      onSuccess: (res) => {
        if (res.token) {
          localStorage.setItem("admin_token", res.token);
          setLocation("/admin/dashboard");
        }
      },
      onError: (err: any) => {
        toast({ title: "ACCESS DENIED", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[70vh]"
      >
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-4">
            <h1 className="font-mono text-3xl text-destructive animate-glow-pulse">ADMIN SYS</h1>
            <p className="font-mono text-muted-foreground text-sm tracking-widest">UNAUTHORIZED ACCESS FORBIDDEN</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="USERNAME"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-background border-2 border-destructive text-destructive font-mono p-4 text-center text-xl focus:outline-none focus:shadow-[0_0_15px_rgba(255,0,0,0.5)] transition-all placeholder:text-destructive/30"
                />
              </div>
              
              <div>
                <input
                  type="password"
                  placeholder="PASSWORD"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border-2 border-destructive text-destructive font-mono p-4 text-center text-xl focus:outline-none focus:shadow-[0_0_15px_rgba(255,0,0,0.5)] transition-all placeholder:text-destructive/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={adminLogin.isPending}
              className="w-full bg-destructive text-destructive-foreground font-mono text-xl p-4 border-2 border-destructive hover:bg-transparent hover:text-destructive transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(255,0,0,0.5)]"
            >
              {adminLogin.isPending ? "AUTHENTICATING..." : "LOGIN"}
            </button>
          </form>
        </div>
      </motion.div>
    </Layout>
  );
}
