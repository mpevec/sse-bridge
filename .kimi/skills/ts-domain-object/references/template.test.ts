// Test template for a branded domain object.
//
// Covers four concerns that the pattern guarantees:
//   1. Success path   — valid input produces the branded type
//   2. Failure path   — invalid input produces structured errors
//   3. Immutability   — Object.freeze actually holds
//   4. Brand integrity — opaque type can't be forged structurally
//
// Substitute:
//   DOMAIN_NAME      → PascalCase type name
//   domain-name      → kebab/camel filename matching the source file
//   parseDOMAIN_NAME → parse function name
//
// Why we use `result.errors.issues.find(...)` instead of `flattenError`:
// In Zod 4, `z.flattenError()`'s return type is not inferred from the
// schema — `fieldErrors` widens to `{}` and property access fails typecheck.
// This is a known Zod limitation (colinhacks/zod#5029). The `issues` array
// is properly typed in both Zod 3 and Zod 4 and supports exact-match
// assertions via `toBe` rather than substring checks via `toContain`.
//
// The @ts-expect-error test in the "brand integrity" block is the most
// important one: if someone removes the brand Symbol, the branded type
// collapses to a plain structural type and this file fails to typecheck.
// Run `bun tsc --noEmit` in CI alongside `bun test` to catch it.

import { describe, test, expect } from "bun:test";
import { parseDOMAIN_NAME, type DOMAIN_NAME } from "./domain-name";

describe("parseDOMAIN_NAME", () => {
  describe("success path", () => {
    test("accepts valid input and returns ok discriminant", () => {
      const result = parseDOMAIN_NAME({
        // TODO: valid fixture matching schema
        exampleField: "valid value",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.exampleField).toBe("valid value");
      }
    });

    // TODO: add boundary tests (min/max lengths, inclusive ranges, etc.)

    test("strips unknown properties (Zod default behaviour)", () => {
      const result = parseDOMAIN_NAME({
        exampleField: "valid value",
        unknownExtra: "should be dropped",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).not.toHaveProperty("unknownExtra");
      }
    });
  });

  describe("failure path", () => {
    test("rejects invalid field with structured error", () => {
      const result = parseDOMAIN_NAME({ exampleField: "" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const issue = result.errors.issues.find(
          (i) => i.path[0] === "exampleField",
        );
        expect(issue?.message).toBe("Example field can not be empty");
      }
    });

    // TODO: add one failure test per constraint (bad format, out of range, etc.)
    // Pattern:
    //   const issue = result.errors.issues.find((i) => i.path[0] === "<fieldName>");
    //   expect(issue?.message).toBe("<expected message>");

    test("rejects missing required fields", () => {
      const result = parseDOMAIN_NAME({});
      expect(result.ok).toBe(false);
    });

    test("rejects non-object input", () => {
      expect(parseDOMAIN_NAME(null).ok).toBe(false);
      expect(parseDOMAIN_NAME(undefined).ok).toBe(false);
      expect(parseDOMAIN_NAME("not an object").ok).toBe(false);
      expect(parseDOMAIN_NAME(42).ok).toBe(false);
    });

    test("aggregates multiple field errors in a single parse", () => {
      // TODO: build an input that violates two or more constraints at once,
      // then assert one issue exists per violating field.
      const result = parseDOMAIN_NAME({ exampleField: "" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const paths = result.errors.issues.map((i) => i.path[0]);
        expect(paths).toContain("exampleField");
      }
    });
  });

  describe("immutability (Rule 1: branded opaque types)", () => {
    test("returned value is frozen", () => {
      const result = parseDOMAIN_NAME({ exampleField: "valid value" });
      if (!result.ok) throw new Error("fixture failed");

      expect(Object.isFrozen(result.value)).toBe(true);
    });

    test("mutation attempts throw in strict mode", () => {
      const result = parseDOMAIN_NAME({ exampleField: "valid value" });
      if (!result.ok) throw new Error("fixture failed");

      // Bun runs ESM in strict mode, so mutating a frozen object throws.
      expect(() => {
        (result.value as { exampleField: string }).exampleField = "mutated";
      }).toThrow(TypeError);
    });

    test("two parses of identical input produce independent instances", () => {
      const a = parseDOMAIN_NAME({ exampleField: "valid value" });
      const b = parseDOMAIN_NAME({ exampleField: "valid value" });
      if (!a.ok || !b.ok) throw new Error("fixture failed");

      expect(a.value).not.toBe(b.value); // different references
      expect(a.value).toEqual(b.value); // same shape
    });
  });

  describe("brand integrity", () => {
    test("structural object cannot be assigned to DOMAIN_NAME (compile-time)", () => {
      // This is a type-level assertion. If someone removes the brand Symbol,
      // this file fails to typecheck — which IS the guarantee we want.
      // @ts-expect-error — plain object lacks the private Symbol brand
      const _fake: DOMAIN_NAME = { exampleField: "x" };
      expect(true).toBe(true); // runtime no-op; the test is `@ts-expect-error`
    });

    test("parsed value is assignable to DOMAIN_NAME without casts", () => {
      const result = parseDOMAIN_NAME({ exampleField: "valid value" });
      if (!result.ok) throw new Error("fixture failed");

      const typed: DOMAIN_NAME = result.value; // must compile
      expect(typed).toBeDefined();
    });
  });
});
