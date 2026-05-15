import { describe, test, expect } from "bun:test";
import { Hono } from "hono";
import { sseRoutes } from "../router";
import { BASE_PATH } from "../config";

function validCloudEvent(overrides?: Record<string, unknown>) {
    return {
        specversion: "1.0",
        id: "evt-123",
        source: "app.ranker",
        type: "analysis.completed",
        time: "2024-01-15T09:30:00.000Z",
        datacontenttype: "application/json",
        appid: "expair",
        traceparent: "00-abcd1234abcd1234abcd1234abcd1234-b7ad6b7169203331-01",
        data: { score: 42 },
        ...overrides,
    };
}

describe("SSE integration", () => {
    test("happy path: posted CloudEvent is received by SSE subscriber", async () => {
        const app = new Hono().basePath(BASE_PATH);
        app.route("/events", sseRoutes());

        // We need it to signal SSE connection to be closed. Basically for cleanup of the test.
        const controller = new AbortController();

        // 1. Open SSE connection
        const sseRes = await app.request(`${BASE_PATH}/events/expair`, {
            signal: controller.signal,
        });
        expect(sseRes.status).toBe(200);
        expect(sseRes.headers.get("content-type")).toMatch(
            /text\/event-stream/,
        );

        const reader = sseRes.body!.getReader();

        // 2. POST a CloudEvent
        const postRes = await app.request(`${BASE_PATH}/events`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(validCloudEvent()),
        });
        expect(postRes.status).toBe(202);

        // 3. Read from SSE stream (or we read or timeout happens and ends the await)
        const { value } = await Promise.race([
            reader.read(),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("SSE read timeout")), 2000),
            ),
        ]);

        const text = new TextDecoder().decode(value);

        // 4. Assert event data is in the stream
        expect(text).toContain("event: analysis.completed");
        expect(text).toContain("id: evt-123");
        expect(text).toContain('"type":"analysis.completed"');

        // 5. Cleanup: abort connection to trigger onAbort and clear intervals
        controller.abort();
        await reader.cancel();
    });
});
