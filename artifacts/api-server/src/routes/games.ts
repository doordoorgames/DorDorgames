import { Router, type IRouter } from "express";
import {
  CreateGameBody,
  GetGameParams,
  UpdateGameParams,
  UpdateGameBody,
  DeleteGameParams,
} from "@workspace/api-zod";
import { store } from "../lib/store";

const router: IRouter = Router();

router.get("/games", (req, res) => {
  const games = store.games.list().filter((g) => g.visible);
  res.json(games);
});

router.post("/games", (req, res) => {
  const body = CreateGameBody.parse(req.body);
  const game = store.games.create({
    slug: body.slug,
    title: body.title,
    titleAr: body.titleAr,
    description: body.description ?? null,
    descriptionAr: body.descriptionAr ?? null,
    logoUrl: body.logoUrl ?? null,
    status: (body.status as "active" | "coming_soon") ?? "active",
    visible: body.visible ?? true,
    pricingText: body.pricingText ?? null,
    route: body.route ?? null,
  });
  res.status(201).json(game);
});

router.get("/games/:id", (req, res) => {
  const { id } = GetGameParams.parse(req.params);
  const game = store.games.get(id);
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  res.json(game);
});

router.patch("/games/:id", (req, res) => {
  const { id } = UpdateGameParams.parse(req.params);
  const body = UpdateGameBody.parse(req.body);
  const game = store.games.update(id, {
    ...(body.title !== undefined && { title: body.title }),
    ...(body.titleAr !== undefined && { titleAr: body.titleAr }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.descriptionAr !== undefined && { descriptionAr: body.descriptionAr }),
    ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
    ...(body.status !== undefined && { status: body.status as "active" | "coming_soon" }),
    ...(body.visible !== undefined && { visible: body.visible }),
    ...(body.pricingText !== undefined && { pricingText: body.pricingText }),
    ...(body.route !== undefined && { route: body.route }),
  });
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  res.json(game);
});

router.delete("/games/:id", (req, res) => {
  const { id } = DeleteGameParams.parse(req.params);
  const deleted = store.games.delete(id);
  if (!deleted) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  res.status(204).send();
});

export default router;
