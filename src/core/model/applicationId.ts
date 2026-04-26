import { z, ZodError } from "zod";

// --- schema ---------------------------------------------------------------
export const ApplicationIdSchema = z.union(
  [z.literal("expair"), z.literal("simba")],
  { message: "Application id must be expair or simba" },
);

// --- branded opaque type --------------------------------------------------
const Brand = Symbol("ApplicationId");
export type ApplicationId = ("expair" | "simba") & {
  [Brand]: true;
};

// --- private constructor --------------------------------------------------
function create(raw: "expair" | "simba"): ApplicationId {
  return Object.freeze(raw) as ApplicationId;
}

// --- parse function (smart constructor) -----------------------------------
export function parseApplicationId(
  input: unknown,
): { ok: true; value: ApplicationId } | { ok: false; errors: ZodError } {
  const result = ApplicationIdSchema.safeParse(input);
  if (!result.success) return { ok: false, errors: result.error };
  return { ok: true, value: create(result.data) };
}
