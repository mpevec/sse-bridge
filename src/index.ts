import { Hono } from "hono";
import { logger } from "./logger";
import { sseRoutes } from "./router";

const app = new Hono();

app.get("/health/live", (c) =>
    c.json({ status: "ok", uptime: process.uptime() }),
);

app.route("/events", sseRoutes());

const server = Bun.serve({
    fetch: app.fetch,
    port: 8088,
    idleTimeout: 0, // disables idle timeout for SSE
});

logger.info({ port: server.port }, "Server started and listening");

// pgrep -f "bun run src/index.ts" | xargs kill -TERM
// docker stop ...
// or
// Possible feature is to send SSE to clients that we are closing the shop
process.on("SIGTERM", async () => {
    logger.info({ action: "process.SIGMTERM.received" });
    await server.stop();
    process.exit(0);
});
