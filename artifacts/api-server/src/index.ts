import app from "./app";
import { createServer } from "node:http";
import { ensureDatabaseSchema, pool } from "@workspace/db";
import { logger } from "./lib/logger";
import { store } from "./lib/store";
import {
  setupWebSocketServer,
  shutdownForeheadGameServer,
} from "./games/forehead/ws/gameServer";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const host = "0.0.0.0";
const SWEEP_INTERVAL_MS = 60_000;

function sweepExpiredRooms() {
  const closed = store.rooms.closeExpired();
  if (closed > 0) {
    logger.info({ count: closed }, "Swept expired rooms");
  }
}

const server = createServer(app);
const wss = setupWebSocketServer(server);
let sweepTimer: ReturnType<typeof setInterval> | undefined;
let shuttingDown = false;

async function start() {
  await ensureDatabaseSchema();
  sweepExpiredRooms();
  sweepTimer = setInterval(sweepExpiredRooms, SWEEP_INTERVAL_MS);

  server.listen(port, host, () => {
    logger.info({ host, port }, "Server listening");
  });
}

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Shutting down server");
  if (sweepTimer) clearInterval(sweepTimer);

  try {
    await shutdownForeheadGameServer(wss);
    await new Promise<void>((resolve, reject) => {
      if (!server.listening) return resolve();
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await pool.end();
    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Error closing server resources");
    process.exit(1);
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start().catch(async (error) => {
  logger.error({ error }, "Server startup failed");
  await pool.end().catch((poolError) => {
    logger.error({ poolError }, "Error closing database pool after startup failure");
  });
  process.exit(1);
});
