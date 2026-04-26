import { describe, test, expect } from "bun:test";
import { parseEnvelope, type Envelope } from "./envelope";

function validFixture(overrides?: Record<string, unknown>) {
  return {
    specversion: "1.0" as const,
    id: "evt-123",
    source: "app.ranker",
    type: "analysis.completed",
    time: "2024-01-15T09:30:00.000Z",
    datacontenttype: "application/json" as const,
    appid: "expair",
    traceid: "abcd1234abcd1234abcd1234abcd1234",
    data: { score: 42 },
    ...overrides,
  };
}

describe("parseEnvelope", () => {
  describe("success path", () => {
    test("accepts valid CloudEvent input and returns ok discriminant", () => {
      const result = parseEnvelope(validFixture());

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("evt-123");
        expect(result.value.source).toBe("app.ranker");
        expect(result.value.type).toBe("analysis.completed");
        expect(result.value.appid as string).toBe("expair");
        expect(result.value.traceid).toBe("abcd1234abcd1234abcd1234abcd1234");
        expect(result.value.data).toEqual({ score: 42 });
      }
    });

    test("strips unknown properties (Zod default behaviour)", () => {
      const result = parseEnvelope(validFixture({ unknownExtra: "should be dropped" }));

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).not.toHaveProperty("unknownExtra");
      }
    });
  });

  describe("failure path", () => {
    test("rejects invalid specversion", () => {
      const result = parseEnvelope(validFixture({ specversion: "0.3" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "specversion");
        expect(issue?.message).toBe('Invalid input: expected "1.0"');
      }
    });

    test("rejects empty id", () => {
      const result = parseEnvelope(validFixture({ id: "" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "id");
        expect(issue?.message).toBe("id is required");
      }
    });

    test("rejects empty source", () => {
      const result = parseEnvelope(validFixture({ source: "" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "source");
        expect(issue?.message).toBe("source is required");
      }
    });

    test("rejects empty type", () => {
      const result = parseEnvelope(validFixture({ type: "" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "type");
        expect(issue?.message).toBe("type is required");
      }
    });

    test("rejects invalid time", () => {
      const result = parseEnvelope(validFixture({ time: "not-a-date" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "time");
        expect(issue?.message).toBe("time must be a valid ISO 8601 datetime");
      }
    });

    test("rejects invalid datacontenttype", () => {
      const result = parseEnvelope(validFixture({ datacontenttype: "text/plain" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find(
          (i) => i.path[0] === "datacontenttype",
        );
        expect(issue?.message).toBe('Invalid input: expected "application/json"');
      }
    });

    test("rejects invalid appid", () => {
      const result = parseEnvelope(validFixture({ appid: "" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "appid");
        expect(issue?.message).toBe("Application id must be expair or simba");
      }
    });

    test("rejects traceid shorter than 32 chars", () => {
      const result = parseEnvelope(validFixture({ traceid: "tooshort" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "traceid");
        expect(issue?.message).toBe("traceid must be exactly 32 characters");
      }
    });

    test("rejects traceid longer than 32 chars", () => {
      const result = parseEnvelope(
        validFixture({ traceid: "abcd1234abcd1234abcd1234abcd1234x" }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "traceid");
        expect(issue?.message).toBe("traceid must be exactly 32 characters");
      }
    });

    test("rejects non-object data", () => {
      const result = parseEnvelope(validFixture({ data: "not-an-object" }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path[0] === "data");
        expect(issue?.message).toBe("Invalid input: expected record, received string");
      }
    });

    test("rejects missing required fields", () => {
      const result = parseEnvelope({});
      expect(result.ok).toBe(false);
    });

    test("rejects non-object input", () => {
      expect(parseEnvelope(null).ok).toBe(false);
      expect(parseEnvelope(undefined).ok).toBe(false);
      expect(parseEnvelope("not an object").ok).toBe(false);
      expect(parseEnvelope(42).ok).toBe(false);
    });

    test("aggregates multiple field errors in a single parse", () => {
      const result = parseEnvelope(
        validFixture({
          id: "",
          source: "",
          traceid: "short",
        }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const paths = result.errors.issues.map((i) => i.path[0]);
        expect(paths).toContain("id");
        expect(paths).toContain("source");
        expect(paths).toContain("traceid");
      }
    });
  });

  describe("immutability", () => {
    test("returned value is frozen", () => {
      const result = parseEnvelope(validFixture());
      if (!result.ok) throw new Error("fixture failed");

      expect(Object.isFrozen(result.value)).toBe(true);
    });

    test("mutation attempts throw in strict mode", () => {
      const result = parseEnvelope(validFixture());
      if (!result.ok) throw new Error("fixture failed");

      expect(() => {
        (result.value as { id: string }).id = "mutated";
      }).toThrow(TypeError);
    });

    test("two parses of identical input produce independent instances", () => {
      const a = parseEnvelope(validFixture());
      const b = parseEnvelope(validFixture());
      if (!a.ok || !b.ok) throw new Error("fixture failed");

      expect(a.value).not.toBe(b.value);
      expect(a.value).toEqual(b.value);
    });
  });

  describe("brand integrity", () => {
    test("structural object cannot be assigned to Envelope (compile-time)", () => {
      // @ts-expect-error — plain object lacks the private Symbol brand
      const _fake: Envelope = validFixture();
      expect(true).toBe(true);
    });

    test("parsed value is assignable to Envelope without casts", () => {
      const result = parseEnvelope(validFixture());
      if (!result.ok) throw new Error("fixture failed");

      const typed: Envelope = result.value;
      expect(typed).toBeDefined();
    });
  });
});
