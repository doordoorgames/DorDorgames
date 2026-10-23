import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  getGetAuthMeQueryKey,
  useAuthLogin,
  useAuthLogout,
  useAuthLogoutAll,
  useAuthSignupRequestOtp,
  useAuthSignupVerifyOtp,
  useChangeAuthPassword,
  useGetAuthMe,
  useUpdateAuthProfile,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";

type Role = "host" | "participant";
type Mode = "login" | "signup";

const inputClass =
  "w-full bg-black/45 border border-white/20 text-white p-3.5 text-sm focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_18px_rgba(34,211,238,0.25)] transition-all placeholder:text-white/35 rounded-xl";

function errorMessage(error: any, fallback: string) {
  return error?.data?.details?.[0] || error?.data?.error || error?.message || fallback;
}

function requestedReturnTo(): string | null {
  const value = new URLSearchParams(window.location.search).get("returnTo");
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    const trustedHost = url.hostname === "dordor.games" || url.hostname.endsWith(".dordor.games");
    return url.protocol === "https:" && trustedHost ? url.href : null;
  } catch {
    return null;
  }
}

export function AccountPortal({ initialRole }: { initialRole: Role }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [role, setRole] = useState<Role>(initialRole);
  const [mode, setMode] = useState<Mode>("login");
  const [otpStep, setOtpStep] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const me = useGetAuthMe({
    query: {
      queryKey: getGetAuthMeQueryKey(),
      retry: false,
      refetchOnWindowFocus: false,
    },
  });
  const login = useAuthLogin();
  const requestOtp = useAuthSignupRequestOtp();
  const verifyOtp = useAuthSignupVerifyOtp();
  const updateProfile = useUpdateAuthProfile();
  const changePassword = useChangeAuthPassword();
  const logout = useAuthLogout();
  const logoutAll = useAuthLogoutAll();
  const returnTo = requestedReturnTo();

  const continueAfterAuth = (accountRole: Role) => {
    const destination = returnTo ?? (accountRole === "host" ? "/host/dashboard" : "/account");
    if (/^https:\/\//.test(destination)) window.location.assign(destination);
    else setLocation(destination);
  };

  useEffect(() => {
    if (me.data) setProfileName(me.data.fullName);
    if (me.data && returnTo) {
      continueAfterAuth(me.data.role);
    } else if (initialRole === "host" && me.data?.role === "host") {
      setLocation("/host/dashboard");
    }
  }, [initialRole, me.data, returnTo, setLocation]);

  const refreshProfile = async () => {
    await queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
  };

  const submitLogin = (event: React.FormEvent) => {
    event.preventDefault();
    login.mutate(
      { data: { role, identifier, password } },
      {
        onSuccess: async ({ account }) => {
          await refreshProfile();
          toast({ title: "WELCOME BACK", description: account.fullName });
          continueAfterAuth(account.role);
        },
        onError: (error) => toast({ title: "LOGIN FAILED", description: errorMessage(error, "Invalid credentials"), variant: "destructive" }),
      },
    );
  };

  const submitSignup = (event: React.FormEvent) => {
    event.preventDefault();
    requestOtp.mutate(
      { data: { role, fullName, email, phone, password } },
      {
        onSuccess: () => setOtpStep(true),
        onError: (error) => toast({ title: "SIGNUP FAILED", description: errorMessage(error, "Please check your details"), variant: "destructive" }),
      },
    );
  };

  const submitOtp = (event: React.FormEvent) => {
    event.preventDefault();
    verifyOtp.mutate(
      { data: { phone, otp } },
      {
        onSuccess: async ({ account }) => {
          await refreshProfile();
          toast({ title: "ACCOUNT READY", description: account.role === "host" ? "Your 60-minute host trial is active." : "Your player profile is ready." });
          continueAfterAuth(account.role);
        },
        onError: (error) => toast({ title: "INVALID CODE", description: errorMessage(error, "Try the latest verification code"), variant: "destructive" }),
      },
    );
  };

  const performLogout = (all = false) => {
    const mutation = all ? logoutAll : logout;
    mutation.mutate(undefined, {
      onSuccess: async () => {
        queryClient.clear();
        setMode("login");
        setLocation("/");
      },
    });
  };

  if (me.isLoading) {
    return <Layout><div className="min-h-[65vh] grid place-items-center font-mono text-cyan-300 animate-pulse">RESTORING SESSION...</div></Layout>;
  }

  if (me.data) {
    const account = me.data;
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center py-8">
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg border border-fuchsia-400/45 bg-black/70 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(217,70,239,0.16)]">
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-mono tracking-[0.28em] text-cyan-300">DORDOR ID</p>
                <h1 className="text-3xl font-black text-white mt-2">{account.fullName}</h1>
                <p className="text-white/50 text-sm mt-1">{account.email}</p>
              </div>
              <span className="px-3 py-1 rounded-full border border-fuchsia-300/60 text-fuchsia-200 text-xs font-bold uppercase">{account.role}</span>
            </div>

            <div className="grid gap-3 text-sm mb-6">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4"><span className="text-white/45">Phone</span><p className="text-white mt-1">{account.phone}</p></div>
              {account.role === "host" && <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/5 p-4"><span className="text-white/45">Hosting time</span><p className="text-cyan-200 text-xl font-black mt-1">{account.remainingMinutes} minutes</p></div>}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {account.role === "host" && <button onClick={() => setLocation("/host/dashboard")} className="rounded-xl bg-fuchsia-500 text-white font-bold py-3 px-4 hover:bg-fuchsia-400">HOST DASHBOARD</button>}
              <button onClick={() => setEditingProfile((value) => !value)} className="rounded-xl border border-cyan-300/50 text-cyan-200 font-bold py-3 px-4 hover:bg-cyan-300/10">EDIT PROFILE</button>
              <button onClick={() => setChangingPassword((value) => !value)} className="rounded-xl border border-white/20 text-white font-bold py-3 px-4 hover:bg-white/10">CHANGE PASSWORD</button>
              <button onClick={() => performLogout(false)} className="rounded-xl border border-red-400/40 text-red-300 font-bold py-3 px-4 hover:bg-red-400/10">LOG OUT</button>
            </div>

            <AnimatePresence>
              {editingProfile && <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-5 pt-5 border-t border-white/10 space-y-3" onSubmit={(event) => {
                event.preventDefault();
                updateProfile.mutate({ data: { fullName: profileName } }, { onSuccess: async () => { await refreshProfile(); setEditingProfile(false); toast({ title: "PROFILE UPDATED" }); }, onError: (error) => toast({ title: "UPDATE FAILED", description: errorMessage(error, "Try again"), variant: "destructive" }) });
              }}>
                <input className={inputClass} value={profileName} onChange={(event) => setProfileName(event.target.value)} autoComplete="name" />
                <button className="w-full rounded-xl bg-cyan-300 text-black font-black py-3 disabled:opacity-50" disabled={updateProfile.isPending || profileName.trim().length < 2}>SAVE NAME</button>
              </motion.form>}

              {changingPassword && <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-5 pt-5 border-t border-white/10 space-y-3" onSubmit={(event) => {
                event.preventDefault();
                changePassword.mutate({ data: { currentPassword, newPassword } }, { onSuccess: () => { setChangingPassword(false); setCurrentPassword(""); setNewPassword(""); toast({ title: "PASSWORD CHANGED", description: "Other devices were logged out." }); }, onError: (error) => toast({ title: "PASSWORD NOT CHANGED", description: errorMessage(error, "Check your current password"), variant: "destructive" }) });
              }}>
                <input type="password" className={inputClass} placeholder="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
                <input type="password" className={inputClass} placeholder="New password (10+ characters, letter + number)" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
                <button className="w-full rounded-xl bg-fuchsia-500 text-white font-black py-3 disabled:opacity-50" disabled={changePassword.isPending}>UPDATE PASSWORD</button>
              </motion.form>}
            </AnimatePresence>

            <button onClick={() => performLogout(true)} className="w-full mt-7 text-xs text-white/35 hover:text-red-300">Log out all devices</button>
          </motion.section>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center py-8">
        <motion.section initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md border border-fuchsia-400/45 bg-black/70 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-[0_0_55px_rgba(217,70,239,0.18)]">
          <div className="text-center mb-7">
            <p className="text-xs font-mono tracking-[0.3em] text-cyan-300">ONE ACCOUNT · EVERY GAME</p>
            <h1 className="text-3xl font-black text-white mt-3">{mode === "login" ? "Welcome back" : "Create your Dordor ID"}</h1>
            <p className="text-white/45 text-sm mt-2">{role === "host" ? "Host rooms and manage your play time" : "Sign in to enter and play every game"}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl mb-4">
            {(["participant", "host"] as Role[]).map((value) => <button key={value} type="button" onClick={() => { setRole(value); setOtpStep(false); }} className={`rounded-xl py-2.5 text-sm font-bold transition ${role === value ? "bg-fuchsia-500 text-white" : "text-white/50 hover:text-white"}`}>{value === "participant" ? "PLAYER / لاعب" : "HOST / مضيف"}</button>)}
          </div>
          <div className="grid grid-cols-2 border-b border-white/10 mb-6">
            {(["login", "signup"] as Mode[]).map((value) => <button key={value} type="button" onClick={() => { setMode(value); setOtpStep(false); }} className={`py-3 text-sm font-bold uppercase border-b-2 transition ${mode === value ? "border-cyan-300 text-cyan-200" : "border-transparent text-white/40"}`}>{value}</button>)}
          </div>

          {mode === "login" ? (
            <form onSubmit={submitLogin} className="space-y-3">
              <input className={inputClass} placeholder="Email or phone" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" />
              <input type="password" className={inputClass} placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
              <button className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-black py-3.5 shadow-[0_8px_30px_rgba(217,70,239,0.28)] disabled:opacity-50" disabled={login.isPending || !identifier || !password}>{login.isPending ? "SIGNING IN..." : "SIGN IN / دخول"}</button>
            </form>
          ) : otpStep ? (
            <form onSubmit={submitOtp} className="space-y-4">
              <p className="text-center text-sm text-white/55">Enter the six-digit code sent to <span className="text-cyan-200">{phone}</span></p>
              <input className={`${inputClass} text-center text-3xl tracking-[0.35em]`} inputMode="numeric" placeholder="000000" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" />
              <button className="w-full rounded-xl bg-cyan-300 text-black font-black py-3.5 disabled:opacity-50" disabled={verifyOtp.isPending || otp.length !== 6}>{verifyOtp.isPending ? "VERIFYING..." : "VERIFY & CONTINUE"}</button>
              <button type="button" onClick={() => setOtpStep(false)} className="w-full text-sm text-white/45">Change details</button>
            </form>
          ) : (
            <form onSubmit={submitSignup} className="space-y-3">
              <input className={inputClass} placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" />
              <input type="email" className={inputClass} placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
              <input type="tel" className={inputClass} placeholder="Phone (+965...)" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
              <input type="password" className={inputClass} placeholder="Password (10+ characters, letter + number)" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
              <button className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-black py-3.5 disabled:opacity-50" disabled={requestOtp.isPending}>{requestOtp.isPending ? "SENDING CODE..." : "CREATE ACCOUNT"}</button>
            </form>
          )}

        </motion.section>
      </div>
    </Layout>
  );
}
