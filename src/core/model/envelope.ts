import { z, ZodError } from "zod";
import { ApplicationId, parseApplicationId, ApplicationIdSchema } from "./applicationId";
import { SpecVersion, parseSpecVersion, SpecVersionSchema } from "./specVersion";

// CloudEvents spec v1.0 — required + extensions
const RawEnvelopeSchema = z.object({
    // ─── Required by CloudEvents spec ───────────────
    specversion: SpecVersionSchema,
    id: z.string().min(1, "id is required"), // unique event ID, for deduplication
    source: z.string().min(1, "source is required"), // e.g. app.module
    type: z.string().min(1, "type is required"), // e.g. "analysis.completed",

    // ─── Optional per spec, required for us ─────────
    time: z.iso.datetime("time must be a valid ISO 8601 datetime"), // ISO 8601, when the event occurred in source
    datacontenttype: z.literal("application/json"),

    // ─── Our extensions ────────────────────────────
    appid: ApplicationIdSchema,
    traceid: z.string().length(32, "traceid must be exactly 32 characters"),

    // ─── Payload ───────────────────────────────────
    data: z.record(z.string(), z.unknown()),
});

const Brand = Symbol("Envelope");
export type Envelope = Readonly<{
    specversion: SpecVersion;
    id: string;
    source: string;
    type: string;
    time: string;
    datacontenttype: "application/json";
    appid: ApplicationId;
    traceid: string;
    data: Record<string, unknown>;
    [Brand]: true;
}>;

function create(raw: Omit<Envelope, symbol>): Envelope {
    return Object.freeze({ ...raw, [Brand]: true }) as Envelope;
}

export function parseEnvelope(
    input: unknown,
): { ok: true; value: Envelope } | { ok: false; errors: z.ZodError } {
    const raw = RawEnvelopeSchema.safeParse(input);
    if (!raw.success) return { ok: false, errors: raw.error };

    const specResult = parseSpecVersion(raw.data.specversion);
    if (!specResult.ok) {
        const issues = specResult.errors.issues.map((issue) => ({
            ...issue,
            path: ["specversion", ...issue.path],
        }));
        return { ok: false, errors: new ZodError(issues) };
    }

    const appResult = parseApplicationId(raw.data.appid);
    if (!appResult.ok) {
        const issues = appResult.errors.issues.map((issue) => ({
            ...issue,
            path: ["appid", ...issue.path],
        }));
        return { ok: false, errors: new ZodError(issues) };
    }

    return { ok: true, value: create({ ...raw.data, specversion: specResult.value, appid: appResult.value }) };
}
