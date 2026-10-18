import { Router, type IRouter, type Request, type Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseClient } from "../lib/supabase.js";

const router: IRouter = Router();

function passwordMatches(suppliedPassword: string | undefined): boolean {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword || !suppliedPassword) return false;

  const configured = Buffer.from(configuredPassword);
  const supplied = Buffer.from(suppliedPassword);
  return configured.length === supplied.length && timingSafeEqual(configured, supplied);
}

router.post("/verify", (req, res) => {
  const password = (req.body as { password?: string }).password;
  res.status(passwordMatches(password) ? 200 : 401).json({ valid: passwordMatches(password) });
});

router.use((req, res, next) => {
  const suppliedPassword = req.header("x-admin-password");
  if (!passwordMatches(suppliedPassword)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
});

function sendError(res: Response, status: number, message: string) {
  res.status(status).json({ error: message });
}

// ─── QUESTIONS ────────────────────────────────────────────────────────────────

router.get("/questions", async (req: Request, res: Response) => {
  const { language, category, type } = req.query as Record<string, string>;
  const db = getSupabaseClient();

  let query = db.from("questions").select("*").order("created_at", { ascending: false });
  if (language) query = query.eq("language", language);
  if (category) query = query.eq("category", category);
  if (type)     query = query.eq("type", type);

  const { data, error } = await query;
  if (error) { sendError(res, 500, error.message); return; }
  res.json(data);
});

router.post("/questions", async (req: Request, res: Response) => {
  const { text, options, language, category, type } = req.body as {
    text?: string; options?: string[]; language?: string; category?: string; type?: string;
  };

  if (!text || !options?.length || !language || !category || !type) {
    sendError(res, 400, "text, options, language, category, and type are required");
    return;
  }

  const db = getSupabaseClient();
  const { data, error } = await db.from("questions").insert({ text, options, language, category, type }).select().single();
  if (error) { sendError(res, 500, error.message); return; }
  res.status(201).json(data);
});

router.put("/questions/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body as Record<string, unknown>;
  const allowed = ["text", "options", "language", "category", "type"];
  const filtered: Record<string, unknown> = {};
  for (const k of allowed) { if (k in updates) filtered[k] = updates[k]; }

  const db = getSupabaseClient();
  const { error } = await db.from("questions").update(filtered).eq("id", id);
  if (error) { sendError(res, 500, error.message); return; }
  res.json({ updated: true });
});

router.delete("/questions/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getSupabaseClient();
  const { error } = await db.from("questions").delete().eq("id", id);
  if (error) { sendError(res, 500, error.message); return; }
  res.json({ deleted: true });
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

router.get("/categories", async (req: Request, res: Response) => {
  const { language } = req.query as Record<string, string>;
  const db = getSupabaseClient();

  let query = db.from("categories").select("*").order("name");
  if (language) query = query.eq("language", language);

  const { data, error } = await query;
  if (error) { sendError(res, 500, error.message); return; }
  res.json(data);
});

router.post("/categories", async (req: Request, res: Response) => {
  const { name, language } = req.body as { name?: string; language?: string };
  if (!name || !language) { sendError(res, 400, "name and language are required"); return; }

  const db = getSupabaseClient();
  const { data, error } = await db.from("categories").insert({ name, language }).select().single();
  if (error) {
    if (error.code === "23505") { sendError(res, 409, "Category already exists"); }
    else { sendError(res, 500, error.message); }
    return;
  }
  res.status(201).json(data);
});

router.delete("/categories/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getSupabaseClient();
  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) { sendError(res, 500, error.message); return; }
  res.json({ deleted: true });
});

// ─── ADS ──────────────────────────────────────────────────────────────────────

router.get("/ads", async (req: Request, res: Response) => {
  const { type } = req.query as Record<string, string>;
  const db = getSupabaseClient();

  let query = db.from("ads").select("*").order("created_at", { ascending: false });
  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) { sendError(res, 500, error.message); return; }
  res.json(data);
});

router.post("/ads", async (req: Request, res: Response) => {
  const { content, image_url, url, type, status } = req.body as {
    content?: string; image_url?: string; url?: string; type?: string; status?: string;
  };
  if (!type) { sendError(res, 400, "type is required (banner or sponsored)"); return; }

  const db = getSupabaseClient();
  const { data, error } = await db.from("ads").insert({
    content: content ?? "",
    image_url: image_url ?? "",
    url: url ?? "",
    type,
    status: status ?? "active",
  }).select().single();
  if (error) { sendError(res, 500, error.message); return; }
  res.status(201).json(data);
});

router.put("/ads/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body as Record<string, unknown>;
  const allowed = ["content", "image_url", "url", "type", "status"];
  const filtered: Record<string, unknown> = {};
  for (const k of allowed) { if (k in updates) filtered[k] = updates[k]; }

  const db = getSupabaseClient();
  const { error } = await db.from("ads").update(filtered).eq("id", id);
  if (error) { sendError(res, 500, error.message); return; }
  res.json({ updated: true });
});

router.delete("/ads/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getSupabaseClient();
  const { error } = await db.from("ads").delete().eq("id", id);
  if (error) { sendError(res, 500, error.message); return; }
  res.json({ deleted: true });
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────

router.get("/settings", async (_req: Request, res: Response) => {
  const db = getSupabaseClient();
  const { data, error } = await db.from("settings").select("*");
  if (error) { sendError(res, 500, error.message); return; }
  const obj: Record<string, string> = {};
  for (const row of data ?? []) obj[row.key] = row.value;
  res.json(obj);
});

router.put("/settings/:key", async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value } = req.body as { value?: string };
  if (value === undefined) { sendError(res, 400, "value is required"); return; }

  const db = getSupabaseClient();
  const { error } = await db.from("settings").upsert({ key, value });
  if (error) { sendError(res, 500, error.message); return; }
  res.json({ updated: true });
});

// ─── SUGGESTED QUESTIONS ─────────────────────────────────────────────────────

router.get("/suggestions", async (req: Request, res: Response) => {
  const { status } = req.query as Record<string, string>;
  const db = getSupabaseClient();

  let query = db.from("suggested_questions").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) { sendError(res, 500, error.message); return; }
  res.json(data);
});

router.patch("/suggestions/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body as { status?: string };
  if (!["pending", "approved", "rejected"].includes(status ?? "")) {
    sendError(res, 400, "status must be pending, approved, or rejected");
    return;
  }

  const db = getSupabaseClient();
  const { error } = await db.from("suggested_questions").update({ status }).eq("id", id);
  if (error) { sendError(res, 500, error.message); return; }
  res.json({ updated: true });
});

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

router.get("/stats", async (_req: Request, res: Response) => {
  const db = getSupabaseClient();

  const [qRes, adsRes, gamesRes, suggestRes] = await Promise.all([
    db.from("questions").select("*", { count: "exact", head: true }),
    db.from("ads").select("*", { count: "exact", head: true }).eq("status", "active"),
    db.from("games").select("*", { count: "exact", head: true }).neq("status", "ended"),
    db.from("suggested_questions").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  res.json({
    totalQuestions:     qRes.count ?? 0,
    activeAds:          adsRes.count ?? 0,
    activeGames:        gamesRes.count ?? 0,
    pendingSuggestions: suggestRes.count ?? 0,
  });
});

export default router;
