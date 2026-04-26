import { Hono } from "hono";
import { streamSSE, SSEStreamingApi } from "hono/streaming";
import pino from "pino";
import { ApplicationId, parseApplicationId } from "./core/model/applicationId";
import { Envelope, parseEnvelope } from "./core/model/envelope";
import { serializeSSE, toSSEMessage } from "./sse-event";
import { errorMessage } from "./core/util/errorMessage";
import type { SSEMessage } from "hono/streaming";

export const logger = pino({
    level: "info",
    base: {
        service: "sse-bridge",
        pid: process.pid,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level(label) {
            return { level: label }; // "info" not 30
        },
    },
});

const streams = new Map<string, Set<SSEStreamingApi>>();
const streamIntervals = new WeakMap<
    SSEStreamingApi,
    ReturnType<typeof setInterval>
>();

function addStream(appId: string, stream: SSEStreamingApi): void {
    let set = streams.get(appId);
    if (!set) {
        set = new Set();
        streams.set(appId, set);
    }
    set.add(stream);
}

function removeStream(appId: ApplicationId, stream: SSEStreamingApi): void {
    const set = streams.get(appId);
    if (set) {
        set.delete(stream);
        if (set.size === 0) {
            streams.delete(appId);
        }
    }
}

function cleanupStream(appId: ApplicationId, stream: SSEStreamingApi): void {
    const hb = streamIntervals.get(stream);
    hb && clearInterval(hb);

    removeStream(appId, stream);
}

const app = new Hono();

app.get("/", (c) => {
    return c.text("Hello Hono!");
});

// TODO: should be split into another domain? so you can then mount it like: app.route('/', health);
app.get("/health/live", (c) => {
    return c.json({ status: "ok", uptime: process.uptime() });
});

// posting events
app.post("/events", async (c) => {
    let rawBody = await c.req.json();

    const result = parseEnvelope(rawBody);

    if (!result.ok) {
        logger.warn({
            action: "envelope.invalid",
            reason: result.errors.issues,
        });
        return c.json({ error: result.errors.issues }, 400);
    }

    const event: Envelope = result.value;

    logger.info({
        action: "event.received",
        id: event.id,
        type: event.type,
        source: event.source,
        traceId: event.traceid,
        appId: event.appid,
    });

    const stats = broadcast(event);

    logger.info({
        action: "broadcast.complete",
        id: event.id,
        type: event.type,
        source: event.source,
        traceId: event.traceid,
        appId: event.appid,
        sent: stats.sent,
        failed: stats.failed,
    });

    return c.status(202);
});

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

// todo: move to other layer
function broadcast(event: Envelope): { sent: number; failed: number } {
    // otel span attributes for this event to be sent
    /* In the future:
    span.setAttributes({
      'sse.broadcast.sent': stats.sent,
      'sse.broadcast.filtered': stats.filtered,
      'sse.broadcast.failed': stats.failed,
    });
    */
    let sent = 0;
    let failed = 0;

    const appStreams = streams.get(event.appid);

    // no channel, no broadcast
    if (!appStreams) {
        return { sent: 0, failed: 0 };
    }

    const message: SSEMessage = toSSEMessage(event);

    for (const stream of appStreams.values()) {
        try {
            stream.writeSSE(message);
            sent++;
        } catch (e) {
            failed++;

            cleanupStream(event.appid, stream);

            logger.warn({
                action: "sse.write.failed",
                appId: event.appid,
                error: errorMessage(e),
            });
        }
    }

    return { sent, failed };
}

const server = Bun.serve({
    fetch: app.fetch,
    port: 8088,
    idleTimeout: 0, // disables idle timeout for SSE
});

logger.info({ port: server.port }, "Server started and listening");

// pgrep -f "bun run src/index.ts" | xargs kill -TERM
// or
// docker stop ...
// Possible feature is to send SSE to clients that we are closing the shop
process.on("SIGTERM", async () => {
    logger.info({ action: "process.SIGMTERM.received" });
    await server.stop();
    process.exit(0);
});
