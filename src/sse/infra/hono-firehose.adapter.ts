import type { SSEStreamingApi } from "hono/streaming";
import type { SSEMessage } from "hono/streaming";
import type { ApplicationId } from "../core/model/applicationId";
import type { CloudEvent } from "../core/model/cloudEvent";
import type { BroadcastResult, FirehosePort } from "../core/firehose.port";
import { logger } from "../../logger";
import { errorMessage } from "../errorMessage";
import { LogEvent } from "../../shared/log-events";

export class HonoFirehoseAdapter implements FirehosePort {
    private streams = new Map<string, Set<SSEStreamingApi>>();
    private streamIntervals = new WeakMap<
        SSEStreamingApi,
        ReturnType<typeof setInterval>
    >();

    // Not exposed on port, just transport logic
    addStream(appId: string, stream: SSEStreamingApi): void {
        let set = this.streams.get(appId);
        if (!set) {
            set = new Set();
            this.streams.set(appId, set);
        }
        set.add(stream);
    }

    // Not exposed on port, just transport logic
    cleanupStream(appId: ApplicationId, stream: SSEStreamingApi): void {
        const hb = this.streamIntervals.get(stream);
        hb && clearInterval(hb);

        this.removeStream(appId, stream);
    }

    // Not exposed on port, just transport logic
    setStreamInterval(
        stream: SSEStreamingApi,
        interval: ReturnType<typeof setInterval>,
    ): void {
        this.streamIntervals.set(stream, interval);
    }

    broadcast(appId: ApplicationId, event: CloudEvent): BroadcastResult {
        let sent = 0;
        let failed = 0;

        const appStreams = this.streams.get(appId);

        if (!appStreams) {
            return { sent: 0, failed: 0 };
        }

        const message: SSEMessage = this.toSSEMessage(event);

        for (const stream of appStreams.values()) {
            try {
                stream.writeSSE(message);
                sent++;
            } catch (e) {
                failed++;

                this.cleanupStream(appId, stream);

                logger.warn({
                    action: LogEvent.SSE_WRITE_FAILED,
                    appId: appId,
                    error: errorMessage(e),
                });
            }
        }

        return { sent, failed };
    }

    private removeStream(appId: ApplicationId, stream: SSEStreamingApi): void {
        const set = this.streams.get(appId);
        if (set) {
            set.delete(stream);
            if (set.size === 0) {
                this.streams.delete(appId);
            }
        }
    }

    private toSSEMessage(cloudEvent: CloudEvent): SSEMessage {
        return {
            event: cloudEvent.type,
            id: cloudEvent.id,
            data: JSON.stringify({
                id: cloudEvent.id,
                type: cloudEvent.type,
                source: cloudEvent.source,
                // TODO: to be changed, cause parent is actually sse bridge.
                traceparent: cloudEvent.traceparent,
                time: cloudEvent.time,
                data: cloudEvent.data,
            }),
        };
    }
}
