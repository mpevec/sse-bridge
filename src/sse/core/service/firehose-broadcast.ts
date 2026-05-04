import type { CloudEvent } from "../model/cloudEvent";
import type { BroadcastResult, FirehosePort } from "../firehose.port";

// application service. We dont need interface for that cause direction of call is inside and thats okey.
// No tests written since its a simpl call and we do not need to test that call is called.
export function firehoseBroadcast(
    port: FirehosePort,
    event: CloudEvent,
): BroadcastResult {
    return port.broadcast(event.appid, event);
}
