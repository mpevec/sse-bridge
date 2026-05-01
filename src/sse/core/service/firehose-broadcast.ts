import type { CloudEvent } from "../model/cloudEvent";
import type { BroadcastResult, FirehosePort } from "../firehose.port";

// application service. We dont need interface for that cause direction of call is inside and thats okey.
export function firehoseBroadcast(
    port: FirehosePort,
    event: CloudEvent,
): BroadcastResult {
    return port.broadcast(event.appid, event);
}
