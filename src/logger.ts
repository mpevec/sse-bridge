import pino from "pino";
import { trace } from "@opentelemetry/api";
import { SERVICE_NAME } from "./config";

export const logger = pino({
    // in case we have otel context available, we also add these to the log for correlation
    mixin() {
        const ctx = trace.getActiveSpan()?.spanContext();
        return ctx
            ? {
                  trace_id: ctx.traceId,
                  span_id: ctx.spanId,
                  trace_flags: ctx.traceFlags,
              }
            : {};
    },
    level: "info",
    base: {
        service: SERVICE_NAME,
        pid: process.pid,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level(label) {
            return { level: label }; // "info" not 30
        },
    },
});
