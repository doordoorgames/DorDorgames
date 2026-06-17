import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameConfig } from "@/games-config";

interface PasswordModalProps {
  game: GameConfig | null;
  onSuccess: (game: GameConfig) => void;
  onClose: () => void;
}

export function PasswordModal({ game, onSuccess, onClose }: PasswordModalProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!game) {
      setValue("");
      setError("");
    }
  }, [game]);

  function handleSubmit() {
    if (value.trim().toLowerCase() === "dor-dor") {
      if (game) onSuccess(game);
    } else {
      setError("Wrong password");
      setValue("");
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onClose();
  }

  return (
    <AnimatePresence>
      {game && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(0,0,0,0.82)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(8,0,18,0.99)",
              border: "1px solid rgba(130,50,200,0.3)",
              borderRadius: "4px",
              padding: "32px 24px 24px",
              width: "100%",
              maxWidth: "300px",
              boxShadow: "0 0 60px rgba(100,0,180,0.25), 0 8px 32px rgba(0,0,0,0.8)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ fontSize: "26px", marginBottom: "12px", opacity: 0.85 }}>🔒</div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "11px",
                  color: "rgba(190,150,255,0.9)",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                Private Access
              </div>
              <div
                className="arabic-text"
                style={{
                  fontFamily: "var(--font-arabic)",
                  fontSize: "13px",
                  color: "rgba(150,110,220,0.6)",
                  direction: "rtl",
                }}
              >
                {game.titleAr}
              </div>
            </div>

            <input
              autoFocus
              type="password"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              onKeyDown={handleKey}
              placeholder="Password"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${error ? "rgba(255,80,80,0.5)" : "rgba(130,50,200,0.35)"}`,
                borderRadius: "2px",
                padding: "11px 13px",
                color: "rgba(255,255,255,0.9)",
                fontFamily: "var(--font-sans)",
                fontSize: "14px",
                letterSpacing: "0.15em",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
            />

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "10px",
                    color: "rgba(255,90,90,0.85)",
                    letterSpacing: "0.08em",
                    marginTop: "7px",
                    textAlign: "center",
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleSubmit}
              style={{
                width: "100%",
                marginTop: "14px",
                padding: "11px",
                background: "rgba(110,0,200,0.2)",
                border: "1px solid rgba(130,50,200,0.4)",
                borderRadius: "2px",
                color: "rgba(195,155,255,0.9)",
                fontFamily: "var(--font-sans)",
                fontSize: "10px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = "rgba(110,0,200,0.35)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = "rgba(110,0,200,0.2)";
              }}
            >
              Enter
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
