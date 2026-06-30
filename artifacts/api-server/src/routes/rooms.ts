import { Router, type IRouter } from "express";
import {
  GetRoomParams,
  CloseRoomParams,
  SwitchRoomGameParams,
  SwitchRoomGameBody,
  JoinRoomParams,
  JoinRoomBody,
} from "@workspace/api-zod";
import { z } from "zod";
import { store } from "../lib/store.js";
import { requireHost } from "../lib/auth.js";

const router: IRouter = Router();

const CreateRoomBody = z.object({
  gameId: z.string(),
});

function roomWithGame(room: ReturnType<typeof store.rooms.get>) {
  if (!room) return undefined;
  const game = store.games.get(room.activeGameId);
  return { ...room, activeGame: game ?? null };
}

router.get("/rooms", (_req, res) => {
  const rooms = store.rooms.list().map((r) => {
    const game = store.games.get(r.activeGameId);
    return { ...r, activeGame: game ?? null };
  });
  res.json(rooms);
});

router.post("/rooms", requireHost, (req, res) => {
  const bodyResult = CreateRoomBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "gameId is required" });
    return;
  }
  const { gameId } = bodyResult.data;
  const host = req.hostAccount!;

  if (host.remainingMinutes <= 0) {
    res.status(403).json({
      error: "No hosting time remaining. Please purchase more time.",
    });
    return;
  }

  const game = store.games.get(gameId);
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  const roomMinutes = Math.min(host.remainingMinutes, 180);
  store.hosts.deductTime(host.id, roomMinutes);

  const room = store.rooms.create(host.phone, gameId, roomMinutes);
  res.status(201).json(roomWithGame(room));
});

router.get("/rooms/:code", (req, res) => {
  const { code } = GetRoomParams.parse(req.params);
  const room = store.rooms.get(code);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.json(roomWithGame(room));
});

router.delete("/rooms/:code", (req, res) => {
  const { code } = CloseRoomParams.parse(req.params);
  const closed = store.rooms.close(code);
  if (!closed) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.status(204).send();
});

router.patch("/rooms/:code/game", (req, res) => {
  const { code } = SwitchRoomGameParams.parse(req.params);
  const body = SwitchRoomGameBody.parse(req.body);
  const game = store.games.get(body.gameId);
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  const room = store.rooms.update(code, { activeGameId: body.gameId });
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.json(roomWithGame(room));
});

router.post("/rooms/:code/join", (req, res) => {
  const { code } = JoinRoomParams.parse(req.params);
  const body = JoinRoomBody.parse(req.body);
  const room = store.rooms.addGuest(code, body.nickname);
  if (!room) {
    res.status(404).json({ error: "Room not found or closed" });
    return;
  }
  res.json(roomWithGame(room));
});

export default router;
