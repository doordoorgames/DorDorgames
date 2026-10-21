import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import foreheadRouter from "./games/forehead/routes";
import tfadhloonRouter from "./games/tfadhloon/routes/index.js";

const app: Express = express();
app.set("trust proxy", 1);
const allowedOrigins = (process.env["CLIENT_ORIGIN"] ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

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
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use((req, res, next) => {
  const unsafe = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  const hasSessionCookie = Boolean(req.headers.cookie?.includes("dordor_"));
  const origin = req.get("origin");
  if (unsafe && hasSessionCookie && (!origin || !allowedOrigins.includes(origin))) {
    res.status(403).json({ error: "Untrusted request origin" });
    return;
  }
  next();
});

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", router);
app.use("/forehead/api", foreheadRouter);
app.use("/tfadhloon/api", tfadhloonRouter);

export default app;
