import { Router, type IRouter } from "express";
import {
  CreateRoomBody,
  GetRoomParams,
  CloseRoomParams,
  SwitchRoomGameParams,
  SwitchRoomGameBody,
  JoinRoomParams,
  JoinRoomBody,
} from "@workspace/api-zod";
import { store } from "../lib/store";

const router: IRouter = Router();

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

router.post("/rooms", (req, res) => {
  const body = CreateRoomBody.parse(req.body);
  const game = store.games.get(body.gameId);
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  const room = store.rooms.create(body.hostPhone, body.gameId);
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
