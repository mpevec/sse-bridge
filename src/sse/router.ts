import { Hono } from "hono";
import * as restController from "./core/rest.controller";

// TODO: check if location is fine
// sub-router pattern
const router = new Hono();

router.post("/", async (c) => restController.broadcastEvent(c));

export { router as sseRouter };
