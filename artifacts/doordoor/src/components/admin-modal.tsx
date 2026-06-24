import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AdminModalProps {
  visible: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export function AdminModal({ visible, onSuccess, onClose }: AdminModalProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) {
      setValue("");
      setError("");
    }
  }, [visible]);

  function handleSubmit() {
    if (value.trim().toLowerCase() === "doordoor") {
      setValue("");
      setError("");
      onSuccess();
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
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
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
              border: "1px solid rgba(255,0,255,0.15)",
              borderRadius: "4px",
              padding: "32px 24px 24px",
              width: "100%",
              maxWidth: "300px",
              boxShadow: "0 0 60px rgba(200,0,200,0.12), 0 8px 32px rgba(0,0,0,0.8)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ fontSize: "22px", marginBottom: "12px", opacity: 0.7 }}>⬡</div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "10px",
                  color: "rgba(255,0,255,0.5)",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                System Access
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "8px",
                  color: "rgba(255,255,255,0.12)",
                  letterSpacing: "0.15em",
                }}
              >
                Internal · Restricted
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
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${error ? "rgba(255,80,80,0.5)" : "rgba(255,0,255,0.2)"}`,
                borderRadius: "2px",
                padding: "11px 13px",
                color: "rgba(255,255,255,0.85)",
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
                background: "rgba(180,0,180,0.12)",
                border: "1px solid rgba(255,0,255,0.2)",
                borderRadius: "2px",
                color: "rgba(255,0,255,0.6)",
                fontFamily: "var(--font-sans)",
                fontSize: "10px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = "rgba(180,0,180,0.22)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = "rgba(180,0,180,0.12)";
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
