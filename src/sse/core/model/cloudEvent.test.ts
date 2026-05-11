import { describe, test, expect } from "bun:test";
import { parseCloudEvent, type CloudEvent } from "./cloudEvent";

function validFixture(overrides?: Record<string, unknown>) {
  return {
    specversion: "1.0" as const,
    id: "evt-123",
    source: "app.ranker",
    type: "analysis.completed",
    time: "2024-01-15T09:30:00.000Z",
    datacontenttype: "application/json" as const,
    appid: "expair",
    traceparent: "00-abcd1234abcd1234abcd1234abcd1234-b7ad6b7169203331-01",
    data: { score: 42 },
    ...overrides,
  };
}

describe("parseCloudEvent", () => {
  describe("success path", () => {
    test("accepts valid CloudEvent input and returns ok discriminant", () => {
      const result = parseCloudEvent(validFixture());

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("evt-123");
        expect(result.value.source).toBe("app.ranker");
        expect(result.value.type).toBe("analysis.completed");
        expect(result.value.appid as string).toBe("expair");
        expect(result.value.traceparent).toBe("00-abcd1234abcd1234abcd1234abcd1234-b7ad6b7169203331-01");
        expect(result.value.data).toEqual({ score: 42 });
      }
    });

    test("strips unknown properties (Zod default behaviour)", () => {
      const result = parseCloudEvent(validFixture({ unknownExtra: "should be dropped" }));

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).not.toHaveProperty("unknownExtra");
      }
    });
  });

  describe("failure path", () => {
    test("rejects invalid specversion", () => {
      const result = parseCloudEvent(validFixture({ specversion: "0.3" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "specversion");
        expect(issue?.message).toBe('Invalid input: expected "1.0"');
      }
    });

    test("rejects empty id", () => {
      const result = parseCloudEvent(validFixture({ id: "" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "id");
        expect(issue?.message).toBe("id is required");
      }
    });

    test("rejects empty source", () => {
      const result = parseCloudEvent(validFixture({ source: "" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "source");
        expect(issue?.message).toBe("source is required");
      }
    });

    test("rejects empty type", () => {
      const result = parseCloudEvent(validFixture({ type: "" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "type");
        expect(issue?.message).toBe("type is required");
      }
    });

    test("rejects invalid time", () => {
      const result = parseCloudEvent(validFixture({ time: "not-a-date" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "time");
        expect(issue?.message).toBe("time must be a valid ISO 8601 datetime");
      }
    });

    test("rejects invalid datacontenttype", () => {
      const result = parseCloudEvent(validFixture({ datacontenttype: "text/plain" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find(
          (i) => i.path[0] === "datacontenttype",
        );
        expect(issue?.message).toBe('Invalid input: expected "application/json"');
      }
    });

    test("rejects invalid appid", () => {
      const result = parseCloudEvent(validFixture({ appid: "" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "appid");
        expect(issue?.message).toBe("Application id must be expair or simba");
      }
    });

    test("rejects invalid traceparent", () => {
      const result = parseCloudEvent(validFixture({ traceparent: "tooshort" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "traceparent");
        expect(issue?.message).toBe("traceparent must be a valid W3C trace context");
      }
    });

    test("rejects traceparent with wrong version", () => {
      const result = parseCloudEvent(
        validFixture({ traceparent: "01-abcd1234abcd1234abcd1234abcd1234-b7ad6b7169203331-01" }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "traceparent");
        expect(issue?.message).toBe("traceparent must be a valid W3C trace context");
      }
    });

    test("rejects non-object data", () => {
      const result = parseCloudEvent(validFixture({ data: "not-an-object" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "data");
        expect(issue?.message).toBe("Invalid input: expected record, received string");
      }
    });

    test("rejects missing required fields", () => {
      const result = parseCloudEvent({});
      expect(result.ok).toBe(false);
    });

    test("rejects non-object input", () => {
      expect(parseCloudEvent(null).ok).toBe(false);
      expect(parseCloudEvent(undefined).ok).toBe(false);
      expect(parseCloudEvent("not an object").ok).toBe(false);
      expect(parseCloudEvent(42).ok).toBe(false);
    });

    test("aggregates multiple field errors in a single parse", () => {
      const result = parseCloudEvent(
        validFixture({
          id: "",
          source: "",
          traceparent: "short",
        }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const paths = result.errors.issues.map((i) => i.path[0]);
        expect(paths).toContain("id");
        expect(paths).toContain("source");
        expect(paths).toContain("traceparent");
      }
    });
  });

  describe("immutability", () => {
    test("returned value is frozen", () => {
      const result = parseCloudEvent(validFixture());
      if (!result.ok) throw new Error("fixture failed");

      expect(Object.isFrozen(result.value)).toBe(true);
    });

    test("mutation attempts throw in strict mode", () => {
      const result = parseCloudEvent(validFixture());
      if (!result.ok) throw new Error("fixture failed");

      expect(() => {
        (result.value as { id: string }).id = "mutated";
      }).toThrow(TypeError);
    });

    test("two parses of identical input produce independent instances", () => {
      const a = parseCloudEvent(validFixture());
      const b = parseCloudEvent(validFixture());
      if (!a.ok || !b.ok) throw new Error("fixture failed");

      expect(a.value).not.toBe(b.value);
      expect(a.value).toEqual(b.value);
    });
  });

  describe("brand integrity", () => {
    test("structural object cannot be assigned to CloudEvent (compile-time)", () => {
      // @ts-expect-error — plain object lacks the private Symbol brand
      const _fake: CloudEvent = validFixture();
      expect(true).toBe(true);
    });

    test("parsed value is assignable to CloudEvent without casts", () => {
      const result = parseCloudEvent(validFixture());
      if (!result.ok) throw new Error("fixture failed");

      const typed: CloudEvent = result.value;
      expect(typed).toBeDefined();
    });
  });
});
