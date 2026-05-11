import pino from "pino";
import { trace } from "@opentelemetry/api";

export const logger = pino({
    // todo: TO BE CHECKED
    mixin() {
        const ctx = trace.getActiveSpan()?.spanContext();
        return ctx ? { trace_id: ctx.traceId, span_id: ctx.spanId } : {};
    },
    level: "info",
    base: {
        service: "sse-bridge",
        pid: process.pid,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level(label) {
            return { level: label }; // "info" not 30
        },
    },
});
