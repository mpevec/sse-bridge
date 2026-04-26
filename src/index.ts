import { Hono } from "hono";
import { streamSSE, SSEStreamingApi } from "hono/streaming";
import {
    ApplicationId,
    parseApplicationId,
} from "./sse/core/model/applicationId";
import { errorMessage } from "./sse/core/util/errorMessage";
import { logger } from "./core/logger";
import {
    addStream,
    cleanupStream,
    streamIntervals,
} from "./sse/core/service/broadcast";
import { sseRouter } from "./sse/router";

const app = new Hono();

app.get("/", (c) => {
    return c.text("Hello Hono!");
});

// TODO: should be split into another domain? so you can then mount it like: app.route('/', health);
app.get("/health/live", (c) => {
    return c.json({ status: "ok", uptime: process.uptime() });
});

app.route("/events", sseRouter);

app.get("/events/:appId", (c) => {
    const rawAppId = c.req.param("appId");
    const parsed = parseApplicationId(rawAppId);
    if (!parsed.ok) {
        return c.text("Invalid appId", 400);
    }
    const applicationId: ApplicationId = parsed.value;

    return streamSSE(c, async (stream: SSEStreamingApi) => {
        logger.info({ action: "sse.open", appId: applicationId });
        addStream(applicationId, stream);

        const heartbeat = setInterval(() => {
            try {
                stream.write(`: ping\n\n`);
            } catch (e) {
                logger.warn({
                    action: "sse.write.failed",
                    appId: applicationId,
                    error: errorMessage(e),
                });

                cleanupStream(applicationId, stream);
            }
        }, 5_000);

        streamIntervals.set(stream, heartbeat);

        // Client disconect
        stream.onAbort(() => {
            cleanupStream(applicationId, stream);

            logger.info({ action: "sse.close", appId: applicationId });
        });

        // This promise never resolves, keeping the function execution active
        // until the connection is aborted by the client or server.
        await new Promise((resolve) => {
            // The loop or promise stays here until onAbort triggers
        });
    });
});

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
