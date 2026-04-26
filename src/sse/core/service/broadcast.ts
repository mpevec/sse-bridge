import { SSEStreamingApi } from "hono/streaming";
import type { SSEMessage } from "hono/streaming";
import { logger } from "../../../core/logger";
import { ApplicationId } from "../model/applicationId";
import { Envelope } from "../model/envelope";
import { toSSEMessage } from "../../sse-event";
import { errorMessage } from "../util/errorMessage";

const streams = new Map<string, Set<SSEStreamingApi>>();
export const streamIntervals = new WeakMap<
    SSEStreamingApi,
    ReturnType<typeof setInterval>
>();

export function addStream(appId: string, stream: SSEStreamingApi): void {
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

export function cleanupStream(
    appId: ApplicationId,
    stream: SSEStreamingApi,
): void {
    const hb = streamIntervals.get(stream);
    hb && clearInterval(hb);

    removeStream(appId, stream);
}

// Goal: deliver an Envelope (cloud event to all SSE subscribers of an ApplicationId)
export function firehoseBroadcast(event: Envelope): {
    sent: number;
    failed: number;
} {
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
