import pino from "pino";

export const logger = pino({
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
