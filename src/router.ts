import { Hono } from "hono";
import * as restController from "./sse/rest.controller";
import { HonoFirehoseAdapter } from "./sse/infra/hono-firehose.adapter";
import { Dependency } from "hono-simple-di";

// TODO: how to test? Comparing to Elixir. Cause I need to have a mock version of HonoFirehoseAdapter..
// But in general I need to test HonoFirehoseAdapter in isolation.
export function sseRoutes() {
    // Deps
    const firehosePortDep = new Dependency(() => new HonoFirehoseAdapter());

    const router = new Hono().use(firehosePortDep.middleware("firehosePort"));

    // Routes
    router.post("/", async (c) => restController.broadcastEvent(c));
    router.get("/:appId", (c) => restController.openSSE(c));

    return router;
}
