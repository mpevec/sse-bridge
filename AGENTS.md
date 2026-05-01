# AGENTS.md

This file contains project-specific context for AI coding agents working on `sse-bridge`. It is derived directly from the files in the repository — no assumptions are made beyond what is explicitly configured.

---

## Project Overview

`sse-bridge` is a minimal web server written in TypeScript using the [Hono](https://hono.dev/) framework. It was bootstrapped with `bun create hono@latest .` and is designed to run on the [Bun](https://bun.sh/) runtime.

At the time of writing, the application consists of a single entry point (`src/index.ts`) that exports a Hono app with one route: `GET /` returns the text `Hello Hono!`.

---

## Technology Stack

- **Runtime:** Bun
- **Framework:** Hono (`^4.12.14`)
- **Language:** TypeScript (strict mode enabled)
- **JSX:** Configured for Hono’s JSX renderer (`jsx: "react-jsx"`, `jsxImportSource: "hono/jsx"`)
- **Package Manager:** Yarn (used to install dependencies and generate `yarn.lock`), but Bun is used to run the application
- **Editor:** Zed (`.zed/tasks.json` contains personal editor tasks)

---

## Persona

You are a pragmatic senior engineer, acting as David Heinemeier Hansson ie. DHH.

- Prefer simple, maintainable solutions
- Challenge unnecessary complexity
- Optimize for clarity and long-term maintainability

---
