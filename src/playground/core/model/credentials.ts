import { z } from "zod";

// schema
const CredentialsSchema = z.object({
    username: z.string().min(1, "Username can not be empty"),
    password: z.string().min(8, "Password must be at least 8 chars long"),
});

// branded opaque type
const Brand = Symbol("Credentials");
export type Credentials = Readonly<{
    username: string;
    password: string;
    [Brand]: true;
}>;

// private constructor
function create(raw: { username: string; password: string }): Credentials {
    return Object.freeze({ ...raw, [Brand]: true }) as Credentials;
}

export function parseCredentials(
    input: unknown,
): { ok: true; value: Credentials } | { ok: false; errors: z.ZodError } {
    const result = CredentialsSchema.safeParse(input);
    if (!result.success) return { ok: false, errors: result.error };
    return { ok: true, value: create(result.data) };
}
