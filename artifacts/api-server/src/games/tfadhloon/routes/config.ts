import { Router, type IRouter } from "express";

const router: IRouter = Router();

/**
 * GET /api/config
 * Returns the public Supabase URL and anon key so that browser-side
 * game pages can initialise the Supabase JS client themselves.
 * The anon key is intentionally public — it is scoped by Row Level Security.
 * The service role key is NEVER returned here.
 */
router.get("/config", (_req, res) => {
  const rawUrl  = process.env["SUPABASE_URL"];
  const anonKey = process.env["SUPABASE_ANON_KEY"];

  if (!rawUrl || !anonKey) {
    res.status(503).json({
      error: "Supabase not configured. Please add SUPABASE_URL and SUPABASE_ANON_KEY secrets in Replit.",
    });
    return;
  }

  // Normalise URL in case user included a path suffix
  const url = rawUrl.replace(/\/(rest|auth|storage|realtime)(\/.*)?$/, "").replace(/\/$/, "");

  res.json({ url, anonKey });
});

export default router;
