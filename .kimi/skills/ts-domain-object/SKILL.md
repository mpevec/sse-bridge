---
name: branded-domain-object
description: Generate TypeScript domain objects using the branded opaque type + smart constructor pattern (Zod schema, private Symbol brand, Object.freeze, discriminated-union parse result). Use this skill whenever the user wants to create a new domain model, value object, entity, DTO, or "parse-don't-validate" type in a Bun/Hono/TypeScript project — especially when they provide a list of attributes with constraints, mention "branded types", "opaque types", "smart constructor", "Zod schema", "domain model", "DDD", or reference an existing domain file like Credentials.ts as the pattern to follow. Also trigger when the user says things like "make me a User/Email/Password/Money/OrderId type" in a TypeScript context, even without explicitly naming the pattern.
---

# Branded Domain Object Generator

Generate TypeScript domain objects that follow a strict "parse-don't-validate" pattern: a Zod schema defines the shape and constraints, a private `Symbol` brand makes the type opaque (preventing structural forgery), `Object.freeze` guarantees runtime immutability, and a `parseXxx` function returns a discriminated union so callers must handle both success and failure paths explicitly.

## When to apply this skill

Trigger when the user asks for a domain object, value object, entity, or "typed wrapper" in TypeScript and provides (or can provide) a list of attributes with constraints. Typical requests:

- "Create a `User` domain object with id, email, role"
- "Make me an `Email` branded type"
- "Generate a `Money` value object with amount and currency"
- "I need a domain model for `Proposal` with these fields: ..."

If the user gives you constraints in natural language ("email must be valid", "age between 0 and 150", "status is one of draft/submitted/approved"), translate those to Zod validators rather than asking them to write Zod themselves.

## What to produce

Two files per domain object, co-located (not in a separate `test/` tree):

```
<n>.ts        -- the domain object
<n>.test.ts   -- bun:test unit tests
```

The domain file follows the exact structure in `references/template.ts`. The test file follows `references/template.test.ts`. Do not deviate from the skeleton — the pattern's guarantees depend on every piece being present (schema, private brand Symbol, frozen constructor, discriminated union return).

## Workflow

### Step 1: Gather the attribute list

If the user hasn't given you a complete list, ask once, concisely. You need per attribute:

- **Name** (camelCase)
- **Type** (string, number, boolean, enum, nested object, array)
- **Constraints** (min/max length, regex, range, required/optional, etc.)
- **Error message** (optional — if not given, write a reasonable default)

If they give an informal list ("User has id, email, must be valid, and age ≥ 18"), infer reasonable Zod validators and state your assumptions in a one-line comment near the schema. Don't over-interrogate for small/obvious cases.

### Step 2: Pick the domain name

The user's chosen name becomes the type name (`PascalCase`), the file name (`kebab-case` or `camelCase` — match the project's existing convention), the parse function (`parseXxx`), and the Symbol description (the `PascalCase` name). Be consistent across all five appearances.

### Step 3: Generate the domain file

Read `references/template.ts` and substitute:

- `DOMAIN_NAME` → PascalCase type name (e.g., `User`, `Email`, `OrderId`)
- `DOMAIN_SCHEMA` content → the actual Zod object/primitive schema derived from the attributes

Keep the structure byte-for-byte identical outside those substitutions. In particular:

- The brand must be a module-private `Symbol(...)` declared with `const Brand = Symbol("DOMAIN_NAME")`. Never export it.
- The type must be explicit: `Readonly<{ /* fields */ }> & { [Brand]: true }`. Do not derive it from `z.infer<typeof Schema>`.
- The constructor must be a non-exported `create` function that calls `Object.freeze` and casts to the branded type. It takes the explicit raw shape, not `z.infer<typeof Schema>`.
- The parse function must return `{ ok: true; value: T } | { ok: false; errors: z.ZodError }` — a discriminated union on `ok`, not thrown exceptions, not `T | null`.

### Step 4: Generate the test file

Read `references/template.test.ts` and produce tests covering the four concerns the pattern guarantees:

1. **Success path** — valid input produces the branded type with the right field values
2. **Failure path** — invalid input produces structured errors (one test per constraint, plus one "multiple errors aggregated" test)
3. **Immutability** — `Object.isFrozen` holds, mutation throws `TypeError` in strict mode, two parses produce independent references
4. **Brand integrity** — one `@ts-expect-error` test proving a plain object can't be assigned to the branded type, and one test showing the parsed value is assignable without a cast

Use `bun:test` (not Vitest, not Jest). Import from `"bun:test"`. Tests live next to the source file, not in a mirrored `test/` directory.

### Step 5: Present the result

Show the two files in code blocks. Briefly explain:

- The three guarantees the pattern gives (opacity, immutability, explicit failure handling)
- How to run the tests: `bun test <n>`
- One line about the `@ts-expect-error` test being the critical one — if someone removes the brand, the typecheck fails

Do not pad with generic advice about DDD, Zod, or TypeScript. The user already knows.

## Translating constraints to Zod

Common mappings. Lean on these rather than reinventing:

| User says | Use |
|---|---|
| "required string" | `z.string().min(1, "...")` |
| "at least N characters" | `z.string().min(N, "...")` |
| "valid email" | `z.string().email("...")` (works in Zod 3 & 4) |
| "valid URL" | `z.string().url("...")` |
| "UUID" | `z.string().uuid("...")` |
| "positive integer" | `z.number().int().positive()` |
| "between X and Y" | `z.number().min(X).max(Y)` |
| "one of: a, b, c" | `z.enum(["a", "b", "c"])` |
| "optional" | `.optional()` on the field |
| "nullable" | `.nullable()` |
| "array of N+" | `z.array(T).min(N)` |
| "ISO date string" | `z.string().datetime()` |

Prefer the `.string().email()` / `.string().url()` / `.string().uuid()` forms — they work identically in Zod 3 and Zod 4. The top-level `z.email()` function only exists in Zod 4.

## Asserting errors in tests: use `issues`, not `flattenError`

In Zod 4, the return type of `z.flattenError(result.errors)` is **not** inferred from the schema — `fieldErrors` widens to `{}` and property access fails typecheck. This is a known Zod limitation ([issue #5029](https://github.com/colinhacks/zod/issues/5029)), not something a generic parameter fixes.

For tests, assert against the `issues` array directly. It's properly typed in both Zod 3 and Zod 4:

```ts
if (!result.ok) {
  const issue = result.errors.issues.find((i) => i.path[0] === "username");
  expect(issue?.message).toBe("Username can not be empty");
}
```

Benefits over `flattenError`:
- Works without type assertions or generics
- Exact-match assertions (`toBe`) instead of substring checks (`toContain`)
- Version-stable across Zod 3, Zod 4, and future releases
- The `path` array also supports nested schemas naturally (`path: ["address", "zip"]`)

**Application code** (not tests) can still use `z.flattenError()` if you need to return errors to a UI — cast the result to `z.inferFlattenedErrors<typeof Schema>` to get proper typing. But tests should use the narrower, more reliable `issues` approach.

## Example

**User request:**
> Create me a `UserProfile` domain object with:
> - id (UUID)
> - email (valid email)
> - displayName (1–50 chars)
> - age (integer, 13 or older, optional)
> - role ("admin" | "member" | "guest", defaults to "member")

**You produce** `user-profile.ts` using the template, substituting the schema:

```ts
const UserProfileSchema = z.object({
  id: z.string().uuid("Invalid user id"),
  email: z.string().email("Invalid email address"),
  displayName: z.string().min(1, "Display name required").max(50, "Display name too long"),
  age: z.number().int().min(13, "Must be 13 or older").optional(),
  role: z.enum(["admin", "member", "guest"]).default("member"),
});
```

...and the rest of the file follows the template exactly (Brand Symbol, Readonly intersection type, private `create`, exported `parseUserProfile`).

Then you produce `user-profile.test.ts` with:

- Success test with all fields populated
- Success test with `age` omitted (optional) and `role` defaulted
- One failure test per invalid field (bad UUID, bad email, empty displayName, 51-char displayName, age 12, unknown role) — using `issues.find(i => i.path[0] === "<field>")`
- One "multiple errors aggregated" test (check `issues.length` and each path appears)
- Three immutability tests
- Two brand-integrity tests (one `@ts-expect-error`, one positive assignment)

## Single-field value objects (branded primitives)

When a value object has exactly one field (e.g. `ApplicationId`, `Email`, `OrderId`), prefer a **branded primitive** over an object wrapper:

```ts
const ApplicationIdSchema = z.union(
  [z.literal("expair"), z.literal("simba")],
  { message: "Application id must be expair or simba" },
);

const Brand = Symbol("ApplicationId");
export type ApplicationId = ("expair" | "simba") & { [Brand]: true };

function create(raw: "expair" | "simba"): ApplicationId {
  return Object.freeze(raw) as ApplicationId;
}

export function parseApplicationId(
  input: unknown,
): { ok: true; value: ApplicationId } | { ok: false; errors: z.ZodError } {
  const result = ApplicationIdSchema.safeParse(input);
  if (!result.success) return { ok: false, errors: result.error };
  return { ok: true, value: create(result.data) };
}
```

Benefits over `{ value: ... }`:
- No wrapper object — the string IS the value
- No `result.value.value` double-access awkwardness
- Natural equality (`===` works)
- Fewer allocations

Test adaptations:
- `parseApplicationId("expair")` instead of `parseApplicationId({ value: "expair" })`
- `result.value` is the string directly
- Cast when asserting against plain literals: `expect(result.value as string).toBe("expair")`
- Use strict-mode string index assignment for the mutation test: `(s as any)[0] = "x"`
- Two parses of the same value are `toBe` equal (primitives are interned), not `not.toBe`

## Anti-patterns to avoid

- **Exporting the brand Symbol.** Kills opacity — external code can forge values. Keep it module-private.
- **Throwing on parse failure.** Breaks the pattern's explicit-failure contract. Always return the discriminated union.
- **Returning `T | null` or `T | undefined`.** Loses the error information. Use `{ ok: false; errors }`.
- **Omitting `Object.freeze`.** The `Readonly<>` type is compile-time only; without freeze, runtime mutation silently succeeds.
- **Using `flattenError` in tests.** Its Zod 4 return type isn't inferred from the schema; property access fails typecheck. Use `result.errors.issues.find(...)` instead.
- **Putting tests in a mirrored `test/` directory.** Co-locate. `bun:test` discovers `*.test.ts` anywhere.
- **Using `z.infer` in the type definition.** The domain type should be explicit and self-describing, not derived from the Zod schema. The schema validates; the type defines the domain model.
- **Generic test names like `"works"`.** Each test should read as an assertion about the pattern's guarantees.

## File naming

Match the project's convention. If unsure:
- `credentials.ts` + `credentials.test.ts` (single word, lowercase)
- `user-profile.ts` + `user-profile.test.ts` (multi-word, kebab-case)

Don't mix conventions across files.
