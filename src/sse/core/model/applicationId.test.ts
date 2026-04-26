import { describe, test, expect } from "bun:test";
import { parseApplicationId, type ApplicationId } from "./applicationId";

describe("parseApplicationId", () => {
  describe("success path", () => {
    test("accepts expair as valid id", () => {
      const result = parseApplicationId("expair");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value as string).toBe("expair");
      }
    });

    test("accepts simba as valid id", () => {
      const result = parseApplicationId("simba");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value as string).toBe("simba");
      }
    });
  });

  describe("failure path", () => {
    test("rejects invalid id with structured error", () => {
      const result = parseApplicationId("UNKNOWN");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find((i) => i.path.length === 0);
        expect(issue?.message).toBe("Application id must be expair or simba");
      }
    });

    test("rejects missing input", () => {
      const result = parseApplicationId(undefined);
      expect(result.ok).toBe(false);
    });

    test("rejects non-string input", () => {
      expect(parseApplicationId(null).ok).toBe(false);
      expect(parseApplicationId(undefined).ok).toBe(false);
      expect(parseApplicationId(42).ok).toBe(false);
      expect(parseApplicationId({}).ok).toBe(false);
    });

    test("aggregates union errors in a single parse", () => {
      const result = parseApplicationId("UNKNOWN");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.issues.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("immutability", () => {
    test("returned value is frozen", () => {
      const result = parseApplicationId("expair");
      if (!result.ok) throw new Error("fixture failed");

      expect(Object.isFrozen(result.value)).toBe(true);
    });

    test("mutation attempts throw in strict mode", () => {
      const result = parseApplicationId("expair");
      if (!result.ok) throw new Error("fixture failed");

      expect(() => {
        "use strict";
        const s = result.value;
        (s as any)[0] = "x";
      }).toThrow(TypeError);
    });

    test("two parses of identical input produce equal values", () => {
      const a = parseApplicationId("simba");
      const b = parseApplicationId("simba");
      if (!a.ok || !b.ok) throw new Error("fixture failed");

      expect(a.value).toBe(b.value);
      expect(a.value).toEqual(b.value);
    });
  });

  describe("brand integrity", () => {
    test("plain string cannot be assigned to ApplicationId (compile-time)", () => {
      // @ts-expect-error — plain string lacks the private Symbol brand
      const _fake: ApplicationId = "expair";
      expect(true).toBe(true);
    });

    test("parsed value is assignable to ApplicationId without casts", () => {
      const result = parseApplicationId("simba");
      if (!result.ok) throw new Error("fixture failed");

      const typed: ApplicationId = result.value;
      expect(typed).toBeDefined();
    });
  });
});
