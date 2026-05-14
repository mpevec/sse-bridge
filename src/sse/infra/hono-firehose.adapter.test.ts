import { describe, test, expect } from "bun:test";
import type { SSEMessage, SSEStreamingApi } from "hono/streaming";
import { HonoFirehoseAdapter } from "./hono-firehose.adapter";
import { parseApplicationId, type ApplicationId } from "../core/model/applicationId";
import { parseCloudEvent, type CloudEvent } from "../core/model/cloudEvent";

function makeAppId(raw: string): ApplicationId {
    const result = parseApplicationId(raw);
    if (!result.ok) throw new Error(`invalid appId fixture: ${raw}`);
    return result.value;
}

function makeCloudEvent(appid: string = "expair"): CloudEvent {
    const result = parseCloudEvent({
        specversion: "1.0",
        id: "evt-123",
        source: "app.ranker",
        type: "analysis.completed",
        time: "2024-01-15T09:30:00.000Z",
        datacontenttype: "application/json",
        appid,
        traceparent: "00-abcd1234abcd1234abcd1234abcd1234-b7ad6b7169203331-01",
        data: { score: 42 },
    });
    if (!result.ok) throw new Error("invalid cloudEvent fixture");
    return result.value;
}

function mockStream(): { stream: SSEStreamingApi; messages: SSEMessage[] } {
    const messages: SSEMessage[] = [];
    const stream = {
        writeSSE: (msg: SSEMessage) => messages.push(msg),
    } as unknown as SSEStreamingApi;
    return { stream, messages };
}

function failingStream(): SSEStreamingApi {
    return {
        writeSSE: () => {
            throw new Error("stream broken");
        },
    } as unknown as SSEStreamingApi;
}

describe("HonoFirehoseAdapter", () => {
    test("broadcast returns zero counts when no streams registered", () => {
        const adapter = new HonoFirehoseAdapter();
        const result = adapter.broadcast(makeAppId("expair"), makeCloudEvent());

        expect(result.sent).toBe(0);
        expect(result.failed).toBe(0);
    });

    test("broadcast sends to all registered streams for matching appId", () => {
        const adapter = new HonoFirehoseAdapter();
        const { stream: s1, messages: m1 } = mockStream();
        const { stream: s2, messages: m2 } = mockStream();

        adapter.addStream("expair", s1);
        adapter.addStream("expair", s2);

        const result = adapter.broadcast(makeAppId("expair"), makeCloudEvent());

        expect(result.sent).toBe(2);
        expect(result.failed).toBe(0);
        expect(m1).toHaveLength(1);
        expect(m2).toHaveLength(1);
    });

    test("broadcast skips streams registered under a different appId", () => {
        const adapter = new HonoFirehoseAdapter();
        const { stream: s1, messages: m1 } = mockStream();
        const { stream: s2, messages: m2 } = mockStream();

        adapter.addStream("expair", s1);
        adapter.addStream("simba", s2);

        const result = adapter.broadcast(makeAppId("expair"), makeCloudEvent("expair"));

        expect(result.sent).toBe(1);
        expect(m1).toHaveLength(1);
        expect(m2).toHaveLength(0);
    });

    test("broadcast formats CloudEvent into SSE message", () => {
        const adapter = new HonoFirehoseAdapter();
        const { stream, messages } = mockStream();
        adapter.addStream("expair", stream);

        adapter.broadcast(makeAppId("expair"), makeCloudEvent());

        const msg = messages[0];
        expect(msg.event).toBe("analysis.completed");
        expect(msg.id).toBe("evt-123");
        expect(msg.data).toContain('"type":"analysis.completed"');
        expect(msg.data).toContain("evt-123");
    });

    test("broadcast counts failure and cleans up stream on write error", () => {
        const adapter = new HonoFirehoseAdapter();
        const broken = failingStream();
        const { stream: good, messages } = mockStream();

        adapter.addStream("expair", broken);
        adapter.addStream("expair", good);

        const event = makeCloudEvent();
        const result = adapter.broadcast(makeAppId("expair"), event);

        expect(result.sent).toBe(1);
        expect(result.failed).toBe(1);
        expect(messages).toHaveLength(1);

        // Broken stream should have been removed from registry
        const result2 = adapter.broadcast(makeAppId("expair"), event);
        expect(result2.sent).toBe(1);
        expect(result2.failed).toBe(0);
    });

    test("cleanupStream removes stream from future broadcasts", () => {
        const adapter = new HonoFirehoseAdapter();
        const { stream, messages } = mockStream();

        adapter.addStream("expair", stream);
        adapter.cleanupStream(makeAppId("expair"), stream);

        const result = adapter.broadcast(makeAppId("expair"), makeCloudEvent());

        expect(result.sent).toBe(0);
        expect(result.failed).toBe(0);
        expect(messages).toHaveLength(0);
    });
});
