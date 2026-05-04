import type { ApplicationId } from "./model/applicationId";
import type { CloudEvent } from "./model/cloudEvent";

export interface BroadcastResult {
    readonly sent: number;
    readonly failed: number;
}

export interface FirehosePort {
    broadcast(appId: ApplicationId, event: CloudEvent): BroadcastResult;
}
