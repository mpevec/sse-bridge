// @ts-nocheck
// Template for a branded domain object following the
// "parse-don't-validate" smart-constructor pattern.
//
// Substitute:
//   DOMAIN_NAME  → PascalCase type name (e.g. Credentials, UserProfile)
//   DOMAIN_SCHEMA content → actual Zod schema derived from attributes
//
// Everything else stays structurally identical — the pattern's guarantees
// depend on the brand Symbol being module-private, the constructor being
// non-exported, and the parse function returning a discriminated union.

import { z } from "zod";

// --- schema ---------------------------------------------------------------
const DOMAIN_NAMESchema = z.object({
    // TODO: replace with actual attributes.
    // Each field should carry a human-readable error message as the second arg
    // to its validator so flatten().fieldErrors returns useful strings.
    exampleField: z.string().min(1, "Example field can not be empty"),
});

// --- branded opaque type --------------------------------------------------
// The Symbol is module-private (not exported) so no external code can forge
// a value of this type structurally. The Readonly<> gives compile-time
// immutability; Object.freeze in create() gives runtime immutability.
//
// The type is explicit — not derived from z.infer — so the domain model is
// self-describing and not entangled with the validator.
const Brand = Symbol("DOMAIN_NAME");
export type DOMAIN_NAME = Readonly<{
    // TODO: replace with actual attributes matching the schema above.
    exampleField: string;
    [Brand]: true;
}>;

// --- private constructor --------------------------------------------------
// Not exported. The only way to obtain a DOMAIN_NAME is through parseDOMAIN_NAME.
// Takes the explicit raw shape, not z.infer<typeof Schema>.
function create(raw: { exampleField: string }): DOMAIN_NAME {
    return Object.freeze({ ...raw, [Brand]: true }) as DOMAIN_NAME;
}

// --- parse function (smart constructor) -----------------------------------
// Returns a discriminated union on `ok` so callers must handle both paths
// explicitly. Never throws; never returns null.
export function parseDOMAIN_NAME(
    input: unknown,
): { ok: true; value: DOMAIN_NAME } | { ok: false; errors: z.ZodError } {
    const result = DOMAIN_NAMESchema.safeParse(input);
    if (!result.success) return { ok: false, errors: result.error };
    return { ok: true, value: create(result.data) };
}
