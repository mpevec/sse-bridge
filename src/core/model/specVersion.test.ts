import { describe, test, expect } from "bun:test";
import { parseSpecVersion, type SpecVersion } from "./specVersion";

describe("parseSpecVersion", () => {
    describe("success path", () => {
        test("accepts 1.0 as valid version", () => {
            const result = parseSpecVersion("1.0");

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value as string).toBe("1.0");
            }
        });
    });

    describe("failure path", () => {
        test("rejects invalid version with structured error", () => {
            const result = parseSpecVersion("0.3");

            expect(result.ok).toBe(false);
            if (!result.ok) {
                const issue = result.errors.issues.find(
                    (i) => i.path.length === 0,
                );
                expect(issue?.message).toBe('Invalid input: expected "1.0"');
            }
        });

        test("rejects missing input", () => {
            const result = parseSpecVersion(undefined);
            expect(result.ok).toBe(false);
        });

        test("rejects non-string input", () => {
            expect(parseSpecVersion(null).ok).toBe(false);
            expect(parseSpecVersion(undefined).ok).toBe(false);
            expect(parseSpecVersion(42).ok).toBe(false);
            expect(parseSpecVersion({}).ok).toBe(false);
        });
    });

    describe("immutability", () => {
        test("returned value is frozen", () => {
            const result = parseSpecVersion("1.0");
            if (!result.ok) throw new Error("fixture failed");

            expect(Object.isFrozen(result.value)).toBe(true);
        });

        test("mutation attempts throw in strict mode", () => {
            const result = parseSpecVersion("1.0");
            if (!result.ok) throw new Error("fixture failed");

            expect(() => {
                "use strict";
                const s = result.value;
                (s as any)[0] = "x";
            }).toThrow(TypeError);
        });

        test("two parses of identical input produce equal values", () => {
            const a = parseSpecVersion("1.0");
            const b = parseSpecVersion("1.0");
            if (!a.ok || !b.ok) throw new Error("fixture failed");

            expect(a.value).toBe(b.value);
            expect(a.value).toEqual(b.value);
        });
    });

    describe("brand integrity", () => {
        test("plain string cannot be assigned to SpecVersion (compile-time)", () => {
            // @ts-expect-error — plain string lacks the private Symbol brand
            const _fake: SpecVersion = "1.0";
            expect(true).toBe(true);
        });

        test("parsed value is assignable to SpecVersion without casts", () => {
            const result = parseSpecVersion("1.0");
            if (!result.ok) throw new Error("fixture failed");

            const typed: SpecVersion = result.value;
            expect(typed).toBeDefined();
        });
    });
});
