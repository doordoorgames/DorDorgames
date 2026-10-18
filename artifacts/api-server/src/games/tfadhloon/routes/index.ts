import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import configRouter  from "./config.js";
import gamesRouter   from "./games.js";
import adminRouter   from "./admin.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(gamesRouter);
router.use("/admin", adminRouter);

export default router;
