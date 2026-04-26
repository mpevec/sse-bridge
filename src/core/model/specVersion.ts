import { z, ZodError } from "zod";

// --- schema ---------------------------------------------------------------
export const SpecVersionSchema = z.literal("1.0");

// --- branded opaque type --------------------------------------------------
const Brand = Symbol("SpecVersion");
export type SpecVersion = "1.0" & {
    [Brand]: true;
};

// --- private constructor --------------------------------------------------
function create(raw: "1.0"): SpecVersion {
    return Object.freeze(raw) as SpecVersion;
}

// --- parse function (smart constructor) -----------------------------------
export function parseSpecVersion(
    input: unknown,
): { ok: true; value: SpecVersion } | { ok: false; errors: ZodError } {
    const result = SpecVersionSchema.safeParse(input);
    if (!result.success) return { ok: false, errors: result.error };
    return { ok: true, value: create(result.data) };
}
