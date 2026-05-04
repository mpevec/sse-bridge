// we export only Log Events that we want to track in logs. For others there is no need.
export const LogEvent = {
    CLOUD_EVENT_INVALID: "cloudEvent.invalid",
    EVENT_RECEIVED: "event.received",
    BROADCAST_COMPLETE: "broadcast.complete",
    SSE_OPEN: "sse.open",
    SSE_WRITE_FAILED: "sse.write.failed",
    SSE_CLOSE: "sse.close",
} as const;
