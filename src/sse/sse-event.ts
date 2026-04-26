import type { Envelope } from "./core/model/envelope";
import type { SSEMessage } from "hono/streaming";

// Its not a domain interface but infrastructure, so we do not need to parse it.
// We already trust Envelope, since its domain.
export function toSSEMessage(cloudEvent: Envelope): SSEMessage {
    return {
        event: cloudEvent.type,
        id: cloudEvent.id,
        data: JSON.stringify({
            id: cloudEvent.id,
            type: cloudEvent.type,
            source: cloudEvent.source,
            traceId: cloudEvent.traceid,
            time: cloudEvent.time,
            data: cloudEvent.data,
        }),
    };
}

export function serializeSSE(msg: SSEMessage): string {
    return `event: ${msg.event}\nid: ${msg.id}\ndata: ${msg.data}\n\n`;
}
