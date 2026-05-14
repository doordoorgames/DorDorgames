import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useRequestOtp, useVerifyOtp, useValidatePromo, useProcessPayment } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Host() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"phone" | "otp" | "payment">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [promoCode, setPromoCode] = useState("");
  
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const validatePromo = useValidatePromo();
  const processPayment = useProcessPayment();
  const { toast } = useToast();

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    
    requestOtp.mutate({ data: { phone } }, {
      onSuccess: () => {
        setStep("otp");
        toast({ title: "OTP SENT", description: "Check your phone for the code." });
      },
      onError: (err: any) => {
        toast({ title: "ERROR", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    
    verifyOtp.mutate({ data: { phone, otp } }, {
      onSuccess: (session) => {
        localStorage.setItem("host_phone", phone);
        setStep("payment");
      },
      onError: (err: any) => {
        toast({ title: "INVALID OTP", description: err.message, variant: "destructive" });
      }
    });
  };

  const handlePromoCheck = () => {
    if (!promoCode) return;
    validatePromo.mutate({ data: { code: promoCode } }, {
      onSuccess: (res) => {
        if (res.valid) {
          toast({ title: "PROMO APPLIED", description: res.message });
        } else {
          toast({ title: "INVALID PROMO", description: res.message || "Promo code is invalid", variant: "destructive" });
        }
      },
      onError: (err: any) => {
        toast({ title: "ERROR", description: err.message, variant: "destructive" });
      }
    });
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processPayment.mutate({ data: { phone, promoCode: promoCode || undefined } }, {
      onSuccess: (res) => {
        if (res.success) {
          toast({ title: "PAYMENT SUCCESSFUL", description: "Welcome Host." });
          setLocation("/host/dashboard");
        } else {
          toast({ title: "PAYMENT FAILED", description: res.message, variant: "destructive" });
        }
      },
      onError: (err: any) => {
        toast({ title: "ERROR", description: err.message, variant: "destructive" });
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
            <h1 className="font-mono text-3xl text-secondary animate-glow-pulse">HOST PORTAL</h1>
            <p className="arabic-text text-muted-foreground text-sm">بوابة المضيف</p>
          </div>

          {step === "phone" && (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div>
                <input
                  type="tel"
                  placeholder="PHONE / رقم الهاتف"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-background border-2 border-secondary text-foreground font-mono p-4 text-center text-xl focus:outline-none focus:border-accent focus:shadow-[0_0_15px_rgba(0,255,65,0.5)] transition-all placeholder:text-muted/50"
                />
              </div>
              <button
                type="submit"
                disabled={requestOtp.isPending}
                className="w-full bg-secondary text-secondary-foreground font-mono text-xl p-4 border-2 border-secondary hover:bg-transparent hover:text-secondary transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(0,255,65,0.5)]"
              >
                {requestOtp.isPending ? "SENDING..." : "NEXT / التالي"}
              </button>
            </form>
          )}
          
          {step === "otp" && (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div>
                <input
                  type="text"
                  placeholder="OTP / رمز التحقق"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-background border-2 border-accent text-foreground font-mono p-4 text-center text-2xl tracking-widest focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(255,0,255,0.5)] transition-all placeholder:text-muted/50"
                  maxLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={verifyOtp.isPending}
                className="w-full bg-accent text-accent-foreground font-mono text-xl p-4 border-2 border-accent hover:bg-transparent hover:text-accent transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(0,206,209,0.5)]"
              >
                {verifyOtp.isPending ? "VERIFYING..." : "VERIFY / تحقق"}
              </button>
            </form>
          )}

          {step === "payment" && (
            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="border-2 border-muted p-4 space-y-2 text-center">
                  <h3 className="font-mono text-foreground">SESSION PASS / تصريح الجلسة</h3>
                  <p className="text-2xl font-mono text-secondary">25 SAR</p>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="PROMO CODE"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-background border-2 border-muted text-foreground font-mono p-3 text-center uppercase focus:outline-none focus:border-primary transition-all placeholder:text-muted/50"
                  />
                  <button
                    type="button"
                    onClick={handlePromoCheck}
                    disabled={validatePromo.isPending || !promoCode}
                    className="bg-muted text-muted-foreground font-mono px-4 border-2 border-muted hover:border-primary hover:text-primary transition-all disabled:opacity-50"
                  >
                    CHECK
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={processPayment.isPending}
                className="w-full bg-primary text-primary-foreground font-mono text-xl p-4 border-2 border-primary hover:bg-transparent hover:text-primary transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(255,0,255,0.5)]"
              >
                {processPayment.isPending ? "PROCESSING..." : "PAY / الدفع"}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </Layout>
  );
}
