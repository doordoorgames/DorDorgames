import { Router, type IRouter, type Request, type Response } from "express";
import { getSupabaseClient } from "../lib/supabase.js";

const router: IRouter = Router();

// ─── helpers ────────────────────────────────────────────────────────────────

function generateGameCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function sendError(res: Response, status: number, message: string) {
  res.status(status).json({ error: message });
}

type PlayableQuestion = {
  id: string;
  text: string;
  options: string[];
};

function questionLanguage(gameLanguage: unknown): "arabic" | "english" {
  return gameLanguage === "en" ? "english" : "arabic";
}

async function loadOnePlayableQuestion(
  db: ReturnType<typeof getSupabaseClient>,
  gameLanguage: unknown,
  category: string,
  excludedIds: string[] = [],
): Promise<PlayableQuestion | null> {
  let countQuery = db
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("language", questionLanguage(gameLanguage))
    .eq("category", category);
  if (excludedIds.length) countQuery = countQuery.not("id", "in", `(${excludedIds.join(",")})`);

  const { count, error: countError } = await countQuery;
  if (countError) throw new Error(countError.message);
  if (!count) return null;

  const offset = Math.floor(Math.random() * count);
  let questionQuery = db
    .from("questions")
    .select("id, text, options")
    .eq("language", questionLanguage(gameLanguage))
    .eq("category", category);
  if (excludedIds.length) questionQuery = questionQuery.not("id", "in", `(${excludedIds.join(",")})`);

  const { data, error } = await questionQuery.range(offset, offset).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id || typeof data.text !== "string" || !Array.isArray(data.options) || data.options.length === 0) return null;
  return data as PlayableQuestion;
}

// ─── CREATE GAME ─────────────────────────────────────────────────────────────

router.post("/games", async (req: Request, res: Response) => {
  const { hostName, language, code: clientCode } = req.body as {
    hostName?: string; language?: string; code?: string;
  };
  if (!hostName?.trim()) {
    sendError(res, 400, "hostName is required");
    return;
  }

  const db = getSupabaseClient();
  // Use the client-provided code so Firebase and Supabase always share the same room key.
  const code = clientCode?.trim() || generateGameCode();
  const gameLang = language === "en" ? "en" : "ar";

  const { error: gameErr } = await db.from("games").insert({
    code,
    host: hostName.trim(),
    status: "lobby",
    player_order: [hostName.trim()],
    game_language: gameLang,
  });

  if (gameErr) {
    sendError(res, 500, gameErr.message);
    return;
  }

  const { error: playerErr } = await db.from("players").insert({
    game_code: code,
    name: hostName.trim(),
    is_host: true,
    is_ready: true,
  });

  if (playerErr) {
    sendError(res, 500, playerErr.message);
    return;
  }
  res.status(201).json({ code });
});

// ─── GET GAME ────────────────────────────────────────────────────────────────

router.get("/games/:code", async (req: Request, res: Response) => {
  const { code } = req.params;
  const db = getSupabaseClient();

  const { data, error } = await db
    .from("games")
    .select("*, players(*)")
    .eq("code", code)
    .single();

  if (error || !data) {
    sendError(res, 404, "Game not found");
    return;
  }

  const { data: round, error: roundError } = await db
    .from("game_rounds")
    .select("*")
    .eq("game_code", code)
    .maybeSingle();

  if (roundError) {
    sendError(res, 500, roundError.message);
    return;
  }

  res.json({ ...data, current_round: round ?? null });
});

// ─── JOIN GAME ───────────────────────────────────────────────────────────────

router.post("/games/:code/join", async (req: Request, res: Response) => {
  const { code } = req.params;
  const { playerName } = req.body as { playerName?: string };

  if (!playerName?.trim()) {
    sendError(res, 400, "playerName is required");
    return;
  }

  const db = getSupabaseClient();

  const { data: game, error: gameErr } = await db
    .from("games")
    .select("status, player_order")
    .eq("code", code)
    .single();

  if (gameErr || !game) {
    sendError(res, 404, "Game not found");
    return;
  }

  if (game.status !== "lobby") {
    sendError(res, 409, "Game already started");
    return;
  }

  const { data: settingsRow } = await db
    .from("settings")
    .select("value")
    .eq("key", "max_players")
    .single();
  const maxPlayers = parseInt(settingsRow?.value ?? "101", 10);

  const { count } = await db
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("game_code", code);

  if ((count ?? 0) >= maxPlayers) {
    sendError(res, 409, "Game is full");
    return;
  }

  const name = playerName.trim();
  const { error: insertErr } = await db.from("players").insert({
    game_code: code,
    name,
    is_host: false,
    is_ready: true,
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      sendError(res, 409, "Name already taken in this game");
    } else {
      sendError(res, 500, insertErr.message);
    }
    return;
  }

  const newOrder: string[] = [...(game.player_order as string[]), name];
  await db.from("games").update({ player_order: newOrder }).eq("code", code);
  res.json({ joined: true, code });
});

// ─── UPDATE GAME SETTINGS (host only) ────────────────────────────────────────

router.patch("/games/:code", async (req: Request, res: Response) => {
  const { code } = req.params;
  const updates = req.body as Record<string, unknown>;
  const db = getSupabaseClient();

  const allowed = [
    "question_limit", "selected_category", "category_language",
    "game_language", "status",
    "question_distribution_mode",
  ];
  const filtered: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in updates) filtered[k] = updates[k];
  }

  if (Object.keys(filtered).length === 0) {
    sendError(res, 400, "No valid fields to update");
    return;
  }

  const { error } = await db.from("games").update(filtered).eq("code", code);
  if (error) {
    sendError(res, 500, error.message);
    return;
  }
  res.json({ updated: true });
});

// ─── START GAME (host only) ──────────────────────────────────────────────────

router.post("/games/:code/start", async (req: Request, res: Response) => {
  const { code } = req.params;
  const db = getSupabaseClient();

  let gameResult = await db.from("games")
    .select("selected_category, game_language, question_limit, status, question_distribution_mode")
    .eq("code", code)
    .single();

  // Keep room creation/gameplay available while an older database deployment is
  // catching up. Once the migration exists, the real room setting is used.
  if (gameResult.error && /question_distribution_mode|schema cache/i.test(gameResult.error.message)) {
    const legacyResult = await db.from("games")
      .select("selected_category, game_language, question_limit, status")
      .eq("code", code)
      .single();
    gameResult = {
      ...legacyResult,
      data: legacyResult.data ? { ...legacyResult.data, question_distribution_mode: "same" } : null,
    } as typeof gameResult;
  }

  const [{ data: game, error: gameError }, { data: players, error: playerError }] =
    await Promise.all([
      Promise.resolve(gameResult),
      db.from("players")
        .select("name, is_host")
        .eq("game_code", code),
    ]);

  if (gameError || !game) {
    sendError(res, 404, "Game not found");
    return;
  }
  if (playerError || !players) {
    sendError(res, 500, "Could not fetch players");
    return;
  }
  if (game.status !== "lobby") {
    sendError(res, 409, "Game already started");
    return;
  }
  if (players.length < 2) {
    sendError(res, 400, "At least 2 players required");
    return;
  }
  if (!game.selected_category) {
    sendError(res, 400, "A category must be selected before starting");
    return;
  }

  let question: PlayableQuestion | null;
  try {
    question = await loadOnePlayableQuestion(
      db,
      game.game_language,
      game.selected_category,
    );
  } catch (error) {
    sendError(res, 500, error instanceof Error ? error.message : "Could not load the first question");
    return;
  }
  if (!question) {
    sendError(res, 400, "No playable questions found for the selected category");
    return;
  }

  const host = players.find((player) => player.is_host)?.name;
  if (!host) {
    sendError(res, 500, "Host player not found");
    return;
  }
  const playerOrder = [
    host,
    ...players.filter((player) => !player.is_host).map((player) => player.name),
  ];
  const { error: roundError } = await db.from("game_rounds").upsert({
    game_code: code,
    round_number: 1,
    action_number: 1,
    question: question.text,
    question_id: question.id,
    options: question.options,
    selected_player: playerOrder[0],
    selected_answers: {},
    notifications: {},
    points_awarded: false,
  }, { onConflict: "game_code" });

  if (roundError) {
    sendError(res, 500, roundError.message);
    return;
  }

  const { error: updateError } = await db.from("games").update({
    status: "playing",
    player_order: playerOrder,
    round_target_players: playerOrder,
    round_count: 1,
    action_number: 1,
    total_question_count: 1,
    used_question_ids: [question.id],
    served_question_ids: game.question_distribution_mode === "same"
      ? Object.fromEntries(playerOrder.map((name) => [name, [question.id]]))
      : { [playerOrder[0]!]: [question.id] },
    game_start_time: Date.now(),
  }).eq("code", code);

  if (updateError) {
    sendError(res, 500, updateError.message);
    return;
  }

  const { error: pointsError } = await db
    .from("players")
    .update({ points: 0, is_ready: true })
    .eq("game_code", code);

  if (pointsError) {
    sendError(res, 500, pointsError.message);
    return;
  }
  res.json({
    started: true,
    status: "playing",
    currentRound: {
      round_number: 1,
      action_number: 1,
      question: question.text,
      question_id: question.id,
      options: question.options,
      selected_player: playerOrder[0],
    },
  });
});

router.get("/games/:code/round", async (req: Request, res: Response) => {
  const { code } = req.params;
  const db = getSupabaseClient();
  const { data, error } = await db
    .from("game_rounds")
    .select("*")
    .eq("game_code", code)
    .single();

  if (error || !data) {
    sendError(res, 404, "Round not found");
    return;
  }
  res.json(data);
});

router.post("/games/:code/next", async (req: Request, res: Response) => {
  const { code } = req.params;
  const db = getSupabaseClient();
  const { data, error } = await db.rpc("advance_tfadhloon_turn", { p_game_code: code });
  if (error) {
    const status = /not active|not complete|already advanced/i.test(error.message) ? 409 : 500;
    sendError(res, status, error.message);
    return;
  }
  res.json(data);
});

// ─── SUBMIT ANSWER ────────────────────────────────────────────────────────────

router.post("/games/:code/submit", async (req: Request, res: Response) => {
  const { code } = req.params;
  const { playerName, answer, roundNumber, actionNumber, questionId } = req.body as {
    playerName?: string; answer?: string; roundNumber?: number; actionNumber?: number; questionId?: string;
  };

  if (!playerName || answer === undefined || !roundNumber || !actionNumber || !questionId) {
    sendError(res, 400, "playerName, answer, roundNumber, actionNumber, and questionId are required");
    return;
  }

  const db = getSupabaseClient();

  const { data, error } = await db.rpc("submit_tfadhloon_answer", {
    p_game_code: code,
    p_player_name: playerName,
    p_answer: answer,
    p_round_number: roundNumber,
    p_action_number: actionNumber,
    p_question_id: questionId,
  });
  if (error) {
    sendError(res, /stale|already submitted|wait for/i.test(error.message) ? 409 : 500, error.message);
    return;
  }
  res.json(data);
});

// ─── AWARD POINTS (host triggers after all submit) ────────────────────────────

router.post("/games/:code/award-points", async (req: Request, res: Response) => {
  const { code } = req.params;
  const db = getSupabaseClient();
  const { data, error } = await db.rpc("award_tfadhloon_points", { p_game_code: code });
  if (error) {
    sendError(res, /not all players/i.test(error.message) ? 409 : 500, error.message);
    return;
  }
  res.json(data);
});

// ─── END GAME ────────────────────────────────────────────────────────────────

router.post("/games/:code/end", async (req: Request, res: Response) => {
  const { code } = req.params;
  const db = getSupabaseClient();

  const { data: players, error: pErr } = await db
    .from("players")
    .select("name, points")
    .eq("game_code", code);

  if (pErr || !players) {
    sendError(res, 500, "Could not fetch players");
    return;
  }

  let maxScore = -1;
  const winners: string[] = [];
  const finalScores: Record<string, number> = {};

  for (const p of players) {
    finalScores[p.name] = p.points;
    if (p.points > maxScore) { maxScore = p.points; winners.length = 0; winners.push(p.name); }
    else if (p.points === maxScore) winners.push(p.name);
  }

  const winner = winners.length === 1 ? winners[0] : `Tie: ${winners.join(", ")}`;

  await db.from("games").update({ status: "ended", winner, final_scores: finalScores }).eq("code", code);
  res.json({ ended: true, winner, finalScores });
});

// ─── REMOVE PLAYER (host only) ───────────────────────────────────────────────

router.delete("/games/:code/players/:playerName", async (req: Request, res: Response) => {
  const { code, playerName } = req.params;
  const db = getSupabaseClient();

  await db.from("players").delete().eq("game_code", code).eq("name", playerName);

  const { data: game } = await db.from("games").select("player_order").eq("code", code).single();
  if (game) {
    const newOrder = (game.player_order as string[]).filter((p) => p !== playerName);
    await db.from("games").update({ player_order: newOrder }).eq("code", code);
  }
  res.json({ removed: true });
});

// ─── SUBMIT SUGGESTED QUESTIONS ───────────────────────────────────────────────

router.post("/games/:code/suggest", async (req: Request, res: Response) => {
  const { code } = req.params;
  const { categoryName, questions, suggestedBy, language } = req.body as {
    categoryName?: string; questions?: unknown[]; suggestedBy?: string; language?: string;
  };

  if (!categoryName || !questions?.length || !suggestedBy) {
    sendError(res, 400, "categoryName, questions, and suggestedBy are required");
    return;
  }

  const db = getSupabaseClient();
  const { error } = await db.from("suggested_questions").insert({
    category_name: categoryName,
    questions,
    suggested_by: suggestedBy,
    game_code: code,
    language: language ?? "ar",
    status: "pending",
  });

  if (error) { sendError(res, 500, error.message); return; }

  res.status(201).json({ submitted: true });
});

export default router;
