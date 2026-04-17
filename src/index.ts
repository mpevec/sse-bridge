import { Hono } from "hono";
import pino from "pino";

const logger = pino();

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

const server = Bun.serve({
  fetch: app.fetch,
  port: 8088,
});

logger.info({ port: server.port }, "Server started and listening");
