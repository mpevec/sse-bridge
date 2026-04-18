import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import pino from "pino";

const logger = pino();

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/events", (c) => {
  return streamSSE(c, async (stream) => {
    stream.writeSSE({ data: "Hello from SSE!" });

    let pingId = 0;
    while (true) {
      await stream.sleep(5_000);
      stream.writeSSE({ data: `Ping ${++pingId}`, event: "ping" });
    }
  });
});

const server = Bun.serve({
  fetch: app.fetch,
  port: 8088,
});

logger.info({ port: server.port }, "Server started and listening");
