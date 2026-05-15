import { describe, test, expect } from "bun:test";
import { Hono } from "hono";
import { broadcastEvent, openSSE } from "./rest.controller";
import { BASE_PATH } from "../config";

function stubAdapter() {
    return {
        broadcast: () => ({ sent: 1, failed: 0 }),
        addStream: () => {},
        cleanupStream: () => {},
        setStreamInterval: () => {},
    };
}

function mountController(handler: (c: any) => Promise<any>) {
    const app = new Hono().basePath(BASE_PATH);
    app.use((c: any, next: any) => {
        c.set("firehosePort", stubAdapter());
        return next();
    });
    return { app, register: (method: string, path: string) => app.on(method, path, handler) };
}

describe("broadcastEvent sad paths", () => {
    test("POST returns 400 for invalid CloudEvent shape", async () => {
        const { app, register } = mountController(broadcastEvent);
        register("POST", "/");

        const res = await app.request("/", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ garbage: true }),
        });

        expect(res.status).toBe(400);
    });

    test("POST returns 400 for missing required CloudEvent fields", async () => {
        const { app, register } = mountController(broadcastEvent);
        register("POST", "/");

        const res = await app.request("/", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: "only-id" }),
        });

        expect(res.status).toBe(400);
    });
});

describe("openSSE sad paths", () => {
    test("GET returns 400 for invalid appId", async () => {
        const { app, register } = mountController(openSSE);
        register("GET", "/:appId");

        const res = await app.request("/invalid-app-id");

        expect(res.status).toBe(400);
    });
});
