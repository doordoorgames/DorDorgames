import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import {
  useAuthSignupRequestOtp,
  useAuthSignupVerifyOtp,
  useAuthLogin,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type Mode = "signup" | "login";
type SignupStep = "details" | "otp";

export default function Host() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [signupStep, setSignupStep] = useState<SignupStep>("details");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const signupRequestOtp = useAuthSignupRequestOtp();
  const signupVerifyOtp = useAuthSignupVerifyOtp();
  const login = useAuthLogin();
  const { toast } = useToast();

  const inputClass =
    "w-full bg-background border-2 border-secondary text-foreground font-mono p-3 text-sm focus:outline-none focus:border-accent focus:shadow-[0_0_15px_rgba(0,206,209,0.4)] transition-all placeholder:text-muted/50";

  const handleSignupDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone || !password) return;

    signupRequestOtp.mutate(
      { data: { fullName, email, phone, password } },
      {
        onSuccess: () => {
          setSignupStep("otp");
          toast({
            title: "OTP SENT",
            description: `Check ${phone} — use any 4-digit code (simulated).`,
          });
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.error ||
            err?.message ||
            "Something went wrong";
          toast({ title: "ERROR", description: msg, variant: "destructive" });
        },
      },
    );
  };

  const handleSignupOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    signupVerifyOtp.mutate(
      { data: { phone, otp } },
      {
        onSuccess: (res) => {
          localStorage.setItem("host_token", res.token);
          toast({
            title: "WELCOME",
            description: `Account created. 60 minutes of hosting time granted.`,
          });
          setLocation("/host/dashboard");
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.error || err?.message || "Invalid OTP";
          toast({ title: "INVALID OTP", description: msg, variant: "destructive" });
        },
      },
    );
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !loginPassword) return;

    login.mutate(
      { data: { identifier: loginIdentifier, password: loginPassword } },
      {
        onSuccess: (res) => {
          localStorage.setItem("host_token", res.token);
          toast({ title: "WELCOME BACK", description: res.host.fullName });
          setLocation("/host/dashboard");
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.error ||
            err?.message ||
            "Invalid credentials";
          toast({ title: "LOGIN FAILED", description: msg, variant: "destructive" });
        },
      },
    );
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setSignupStep("details");
    setOtp("");
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[70vh]"
      >
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-2">
            <h1 className="font-mono text-3xl text-secondary animate-glow-pulse">
              HOST PORTAL
            </h1>
            <p className="arabic-text text-muted-foreground text-sm">
              بوابة المضيف
            </p>
          </div>

          <div className="flex border-2 border-muted">
            <button
              onClick={() => switchMode("login")}
              className={`flex-1 font-mono text-sm py-2 transition-all ${
                mode === "login"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              LOGIN
            </button>
            <button
              onClick={() => switchMode("signup")}
              className={`flex-1 font-mono text-sm py-2 transition-all ${
                mode === "signup"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              SIGN UP
            </button>
          </div>

          <AnimatePresence mode="wait">
            {mode === "login" && (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <input
                  type="text"
                  placeholder="EMAIL OR PHONE / الإيميل أو الهاتف"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className={inputClass}
                  autoComplete="username"
                />
                <input
                  type="password"
                  placeholder="PASSWORD / كلمة المرور"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className={inputClass}
                  autoComplete="current-password"
                />
                <button
                  type="submit"
                  disabled={login.isPending || !loginIdentifier || !loginPassword}
                  className="w-full bg-secondary text-secondary-foreground font-mono text-xl p-4 border-2 border-secondary hover:bg-transparent hover:text-secondary transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(0,255,65,0.4)]"
                >
                  {login.isPending ? "CHECKING..." : "LOGIN / دخول"}
                </button>
                <p className="text-center text-xs text-muted-foreground font-mono">
                  No account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="text-primary underline"
                  >
                    Sign up
                  </button>
                </p>
              </motion.form>
            )}

            {mode === "signup" && signupStep === "details" && (
              <motion.form
                key="signup-details"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleSignupDetails}
                className="space-y-4"
              >
                <div className="text-center space-y-1">
                  <p className="font-mono text-xs text-accent">
                    1 HOUR FREE TRIAL / ساعة مجانية
                  </p>
                </div>
                <input
                  type="text"
                  placeholder="FULL NAME / الاسم الكامل"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                  autoComplete="name"
                />
                <input
                  type="email"
                  placeholder="EMAIL / الإيميل"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  autoComplete="email"
                />
                <input
                  type="tel"
                  placeholder="PHONE / رقم الهاتف"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  autoComplete="tel"
                />
                <input
                  type="password"
                  placeholder="PASSWORD (min 8) / كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  autoComplete="new-password"
                />
                <button
                  type="submit"
                  disabled={
                    signupRequestOtp.isPending ||
                    !fullName ||
                    !email ||
                    !phone ||
                    !password
                  }
                  className="w-full bg-primary text-primary-foreground font-mono text-xl p-4 border-2 border-primary hover:bg-transparent hover:text-primary transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(255,0,255,0.4)]"
                >
                  {signupRequestOtp.isPending ? "SENDING OTP..." : "NEXT / التالي"}
                </button>
              </motion.form>
            )}

            {mode === "signup" && signupStep === "otp" && (
              <motion.form
                key="signup-otp"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSignupOtp}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <p className="font-mono text-xs text-muted-foreground">
                    OTP sent to{" "}
                    <span className="text-accent">{phone}</span>
                  </p>
                  <p className="font-mono text-xs text-muted-foreground/60">
                    (simulated — any 4-digit code works)
                  </p>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="w-full bg-background border-2 border-accent text-foreground font-mono p-4 text-center text-3xl tracking-[0.4em] focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(255,0,255,0.5)] transition-all"
                  maxLength={4}
                />
                <button
                  type="submit"
                  disabled={signupVerifyOtp.isPending || otp.length !== 4}
                  className="w-full bg-accent text-accent-foreground font-mono text-xl p-4 border-2 border-accent hover:bg-transparent hover:text-accent transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(0,206,209,0.5)]"
                >
                  {signupVerifyOtp.isPending ? "CREATING..." : "VERIFY / تحقق"}
                </button>
                <button
                  type="button"
                  onClick={() => setSignupStep("details")}
                  className="w-full text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </Layout>
  );
}
