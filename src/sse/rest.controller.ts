import { Context } from "hono";
import { firehoseBroadcast } from "./core/service/firehose-broadcast";
import { logger } from "../logger";
import { CloudEvent, parseCloudEvent } from "./core/model/cloudEvent";
import { SSEStreamingApi, streamSSE } from "hono/streaming";
import { ApplicationId, parseApplicationId } from "./core/model/applicationId";
import { errorMessage } from "./errorMessage";
import { LogEvent } from "../shared/log-events";

/*
 - core (as Application Core)
    - model (domain models)
    - service (application services)
 - infra (as the right side ie. secondary adapters)
 - rest.controller.ts (as left side ie. primary adapters ie. controllers)
*/
export async function broadcastEvent(c: Context): Promise<any> {
    // Deps:
    const firehosePort = c.get("firehosePort");

    const rawBody = await c.req.json();

    const result = parseCloudEvent(rawBody);
    if (!result.ok) {
        logger.warn({
            action: LogEvent.CLOUD_EVENT_INVALID,
            reason: result.errors.issues,
        });
        return c.json({ error: result.errors.issues }, 400);
    }
    const event: CloudEvent = result.value;

    logger.info({
        action: LogEvent.EVENT_RECEIVED,
        id: event.id,
        type: event.type,
        source: event.source,
        traceId: event.traceid,
        appId: event.appid,
    });

    const stats = firehoseBroadcast(firehosePort, event);

    logger.info({
        action: LogEvent.BROADCAST_COMPLETE,
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

export async function openSSE(c: Context): Promise<any> {
    // Deps:
    const firehosePort = c.get("firehosePort");

    const rawAppId = c.req.param("appId");

    const parsed = parseApplicationId(rawAppId);
    if (!parsed.ok) {
        return c.text("Invalid appId", 400);
    }
    const applicationId: ApplicationId = parsed.value;

    return streamSSE(c, async (stream: SSEStreamingApi) => {
        logger.info({ action: LogEvent.SSE_OPEN, appId: applicationId });
        firehosePort.addStream(applicationId, stream);

        const heartbeat = setInterval(() => {
            try {
                stream.write(`: ping\n\n`);
            } catch (e) {
                logger.warn({
                    action: LogEvent.SSE_WRITE_FAILED,
                    appId: applicationId,
                    error: errorMessage(e),
                });

                firehosePort.cleanupStream(applicationId, stream);
            }
        }, 5_000);

        firehosePort.setStreamInterval(stream, heartbeat);

        // Client disconect
        stream.onAbort(() => {
            firehosePort.cleanupStream(applicationId, stream);

            logger.info({ action: LogEvent.SSE_CLOSE, appId: applicationId });
        });

        // This promise never resolves, keeping the function execution active
        // until the connection is aborted by the client or server.
        await new Promise((resolve) => {
            // The loop or promise stays here until onAbort triggers
        });
    });
}
