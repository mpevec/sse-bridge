import { describe, test, expect } from "bun:test";
import { parseCredentials, type Credentials } from "./credentials";

describe("parseCredentials", () => {
  describe("success path", () => {
    test("accepts valid credentials and returns ok discriminant", () => {
      const result = parseCredentials({
        username: "thiro",
        password: "supersecret",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.username).toBe("thiro");
        expect(result.value.password).toBe("supersecret");
      }
    });

    test("strips unknown properties (Zod default behaviour)", () => {
      const result = parseCredentials({
        username: "thiro",
        password: "supersecret",
        role: "admin", // not in schema
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).not.toHaveProperty("role");
      }
    });
  });

  describe("failure path", () => {
    test("rejects empty username with structured error", () => {
      const result = parseCredentials({
        username: "",
        password: "supersecret",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find(
          (i) => i.path[0] === "username",
        );
        expect(issue?.message).toBe("Username can not be empty");
      }
    });

    test("rejects password shorter than 8 characters", () => {
      const result = parseCredentials({
        username: "thiro",
        password: "abc123",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find(
          (i) => i.path[0] === "password",
        );
        expect(issue?.message).toBe("Password must be at least 8 chars long");
      }
    });

    test("rejects missing fields", () => {
      const result = parseCredentials({});
      expect(result.ok).toBe(false);
    });
  });

  describe("immutability (Rule 1: branded opaque types)", () => {
    test("returned Credentials is frozen", () => {
      const result = parseCredentials({
        username: "thiro",
        password: "supersecret",
      });
      if (!result.ok) throw new Error("fixture failed");

      expect(Object.isFrozen(result.value)).toBe(true);
    });

    test("mutation attempts throw in strict mode", () => {
      const result = parseCredentials({
        username: "thiro",
        password: "supersecret",
      });
      if (!result.ok) throw new Error("fixture failed");

      // Bun runs ESM in strict mode, so mutating a frozen object throws.
      expect(() => {
        (result.value as { username: string }).username = "attacker";
      }).toThrow(TypeError);
    });

    test("two parses of identical input produce independent instances", () => {
      const a = parseCredentials({
        username: "thiro",
        password: "supersecret",
      });
      const b = parseCredentials({
        username: "thiro",
        password: "supersecret",
      });
      if (!a.ok || !b.ok) throw new Error("fixture failed");

      expect(a.value).not.toBe(b.value); // different references
      expect(a.value).toEqual(b.value); // same shape
    });
  });

  describe("brand integrity", () => {
    test("structural object cannot be assigned to Credentials (compile-time)", () => {
      // This block is a type-level assertion. If someone removes the brand,
      // this file will fail to typecheck — which is the actual guarantee.
      // @ts-expect-error — plain object lacks the private Symbol brand
      const _fake: Credentials = { username: "x", password: "yyyyyyyy" };
      expect(true).toBe(true); // runtime no-op; the test is `@ts-expect-error`
    });

    test("parsed value is assignable to Credentials without casts", () => {
      const result = parseCredentials({
        username: "thiro",
        password: "supersecret",
      });
      if (!result.ok) throw new Error("fixture failed");

      const typed: Credentials = result.value; // must compile
      expect(typed).toBeDefined();
    });
  });
});
