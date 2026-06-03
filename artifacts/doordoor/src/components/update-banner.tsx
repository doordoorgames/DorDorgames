import { motion, AnimatePresence } from "framer-motion";

export function UpdateBanner({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position: "fixed",
            bottom: "88px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "rgba(8, 0, 18, 0.96)",
            border: "1px solid rgba(180, 0, 255, 0.35)",
            borderRadius: "4px",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 0 32px rgba(160, 0, 255, 0.25), 0 4px 16px rgba(0,0,0,0.7)",
            whiteSpace: "nowrap",
            backdropFilter: "blur(8px)",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              color: "rgba(220, 200, 255, 0.9)",
              fontFamily: "var(--font-sans)",
              letterSpacing: "0.06em",
            }}
          >
            Update available — refresh
          </span>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "rgba(160, 0, 255, 0.18)",
              border: "1px solid rgba(180, 0, 255, 0.5)",
              borderRadius: "2px",
              color: "#cc66ff",
              fontSize: "10px",
              padding: "4px 12px",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Refresh
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
