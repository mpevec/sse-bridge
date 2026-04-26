import { Context, Hono } from "hono";
import {
    addStream,
    firehoseBroadcast,
    cleanupStream,
    streamIntervals,
} from "./service/broadcast";
import { logger } from "../../core/logger";
import { Envelope, parseEnvelope } from "./model/envelope";
import { ApplicationId, parseApplicationId } from "./model/applicationId";
import { stream, streamSSE } from "hono/streaming";
import { SSEStreamingApi } from "hono/streaming";
import { errorMessage } from "./util/errorMessage";

/*
router.get("/:appId", (c) => {
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
*/

export async function broadcastEvent(c: Context): Promise<any> {
    const rawBody = await c.req.json();

    // TODO: rename to cloude event
    const result = parseEnvelope(rawBody);
    if (!result.ok) {
        logger.warn({
            action: "envelope.invalid",
            reason: result.errors.issues,
        });
        return c.json({ error: result.errors.issues }, 400);
    }
    const event: Envelope = result.value;

    // app service definira kaj rabi in definira interface, infra pa ga implementira
    logger.info({
        action: "event.received",
        id: event.id,
        type: event.type,
        source: event.source,
        traceId: event.traceid,
        appId: event.appid,
    });
    const stats = firehoseBroadcast(event);
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

    return c.body(null, 202);
}
