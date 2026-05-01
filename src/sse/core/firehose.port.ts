import { SSEStreamingApi } from "hono/streaming";
import type { ApplicationId } from "./model/applicationId";
import type { CloudEvent } from "./model/cloudEvent";

export interface BroadcastResult {
    readonly sent: number;
    readonly failed: number;
}

export interface FirehosePort {
    broadcast(appId: ApplicationId, event: CloudEvent): BroadcastResult;
    addStream(appId: ApplicationId, stream: SSEStreamingApi): void;
    cleanupStream(appId: ApplicationId, stream: SSEStreamingApi): void;
    setStreamInterval(
        stream: SSEStreamingApi,
        interval: ReturnType<typeof setInterval>,
    ): void;
}
