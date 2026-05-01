# Plan-First Protocol

**Trigger:** Any request to write, change, refactor, or extend code.

**Rule:** Never touch code before the plan is approved.

## Phase 1 — Plan

Output exactly these four blocks, nothing more:

**Goal:** one sentence restating what the user wants.

**Files:** bullet list of files to create/modify/delete. Mark each `NEW`, `EDIT`, or `DELETE`.

**Changes:** bullet list. One bullet per file. Each bullet ≤ 15 words describing the change (function added, logic replaced, signature updated). No code.

**Risks:** bullet list of side effects, breaking changes, or missing info. If none, write `None`. If blockers exist, list questions here and stop.

End with one line:
`Approve? (yes / revise / cancel)`

Then **STOP**. Do not write code, do not explain further, do not preview diffs.

## Phase 2 — Execute

Only trigger on `yes`, `proceed`, `go`, `ok`, or equivalent affirmative.

- On `revise`: produce a new Phase 1 plan. Do not code.
- On `cancel`: acknowledge in one line. Do not code.
- On ambiguity: treat as `revise`.

When executing: produce diffs only for files listed in the approved plan. Do not expand scope. If execution reveals the plan is wrong, stop and return to Phase 1.

## Hard Constraints

- No code in Phase 1. Ever.
- No plan re-statement in Phase 2. Just the diffs.
- Token budget for Phase 1: aim for under 200 tokens.
- Skip this protocol only for: typo fixes, single-line config changes, or when the user explicitly says "just do it" / "skip plan".
