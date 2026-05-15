import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ─────────────────────────────────────────────────────────────────────────────
// Game reverse proxy
//
// The Replit global proxy routes /flash, /yesno, /bomb, /reactor to this API
// server (configured in artifact.toml). We transparently forward every request
// for those paths to the upstream game host so the browser URL always stays on
// dordor.games and window.location.origin is correct for QR-code generation.
// ─────────────────────────────────────────────────────────────────────────────
const GAME_UPSTREAM = "https://flash-billboard.replit.app";

const PROXIED_GAME_PATHS = ["/flash", "/yesno", "/bomb", "/reactor"];

// Mounted at root so Express does NOT strip the path prefix — the full path
// (e.g. /flash, /flash/assets/foo.js) is forwarded as-is to the upstream.
const gameProxy = createProxyMiddleware({
  target: GAME_UPSTREAM,
  changeOrigin: true,
  // Function filter: match the path exactly OR any sub-path
  pathFilter: (pathname: string) =>
    PROXIED_GAME_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    ),
  on: {
    error(err, _req, res) {
      logger.error({ err }, "Game proxy error");
      if (res && "status" in res) {
        (res as express.Response)
          .status(502)
          .send("Game temporarily unavailable");
      }
    },
    proxyReq(proxyReq, req) {
      logger.info({ upstream: proxyReq.path, method: req.method }, "Game proxy forwarding");
    },
  },
});

app.use(gameProxy);

export default app;
