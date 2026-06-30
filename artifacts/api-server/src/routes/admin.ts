import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import {
  AdminLoginBody,
  CreatePromoCodeBody,
  DeletePromoCodeParams,
} from "@workspace/api-zod";
import { store } from "../lib/store";

const router: IRouter = Router();

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin999";
const ADMIN_TOKEN = "doordoor-admin-token-2024";

function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_TOKEN}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.post("/admin/login", (req, res) => {
  const body = AdminLoginBody.parse(req.body);
  if (
    body.username === ADMIN_USERNAME &&
    body.password === ADMIN_PASSWORD
  ) {
    req.log.info("Admin logged in");
    res.json({ token: ADMIN_TOKEN, success: true });
    return;
  }
  res.status(401).json({ error: "Invalid credentials" });
});

router.get("/admin/stats", requireAdminAuth, (_req, res) => {
  const games = store.games.list();
  const rooms = store.rooms.list();
  const totalGuests = rooms.reduce((sum, r) => sum + r.guests.length, 0);
  res.json({
    totalGames: games.length,
    activeGames: games.filter((g) => g.status === "active").length,
    activeRooms: rooms.length,
    totalGuests,
  });
});

router.get("/admin/promo-codes", requireAdminAuth, (_req, res) => {
  res.json(store.promoCodes.list());
});

router.post("/admin/promo-codes", requireAdminAuth, (req, res) => {
  const body = CreatePromoCodeBody.parse(req.body);
  const pc = store.promoCodes.create({
    code: body.code,
    active: body.active ?? true,
  });
  res.status(201).json(pc);
});

router.delete("/admin/promo-codes/:code", requireAdminAuth, (req, res) => {
  const { code } = DeletePromoCodeParams.parse(req.params);
  const deleted = store.promoCodes.delete(code);
  if (!deleted) {
    res.status(404).json({ error: "Promo code not found" });
    return;
  }
  res.status(204).send();
});

export default router;
