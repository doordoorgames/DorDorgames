import app from "./app";
import { logger } from "./lib/logger";
import { store } from "./lib/store";

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

sweepExpiredRooms();
const sweepTimer = setInterval(sweepExpiredRooms, SWEEP_INTERVAL_MS);

const server = app.listen(port, host, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ host, port }, "Server listening");
});

function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, "Shutting down server");
  clearInterval(sweepTimer);
  server.close((err) => {
    if (err) {
      logger.error({ err }, "Error closing server");
      process.exit(1);
    }

    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
