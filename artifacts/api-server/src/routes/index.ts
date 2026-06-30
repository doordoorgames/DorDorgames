import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gamesRouter from "./games";
import roomsRouter from "./rooms";
import hostsRouter from "./hosts";
import checkoutRouter from "./checkout";
import adminRouter from "./admin";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(gamesRouter);
router.use(roomsRouter);
router.use(hostsRouter);
router.use(checkoutRouter);
router.use(adminRouter);

export default router;
