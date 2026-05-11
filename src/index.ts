import "./telemetry";
import { Hono } from "hono";
import { logger } from "./logger";
import { sseRoutes } from "./router";
import { httpInstrumentationMiddleware } from "@hono/otel";
import { trace } from "@opentelemetry/api";

const app = new Hono();

const tracer = trace.getTracer("sse-bridge");

export const otelMw = httpInstrumentationMiddleware({
    serviceName: "sse-bridge",
    serviceVersion: "0.0.0",
});
// Short-lived routes get the middleware
app.use("/health/live", otelMw);

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
