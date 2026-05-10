---
name: arch-ports-adapter
description: Apply Ports and Adapters (Hexagonal/Clean Architecture) to TypeScript/Hono projects. Use when creating a new feature/module, setting up folder structure, writing ports/adapters/services/controllers, or when the user mentions clean architecture, hexagonal architecture, ports and adapters, primary/secondary adapters, application core, or dependency rule. Also triggers when organizing code into core/infra layers or deciding where to place interfaces.
---

# Ports and Adapters (TypeScript/Hono)

## Folder Structure

Organize every feature/module as a self-contained unit. Flow goes left to right.

```
feature/
├── core/
│   ├── model/              # Domain models (see branded-domain-object skill)
│   ├── service/            # Application services (use cases)
│   └── *.port.ts           # Ports = interfaces for inward dependencies
├── infra/
│   └── *.adapter.ts        # Secondary adapters (implement ports)
└── *.controller.ts         # Primary adapters (entry points: HTTP, CLI, etc.)
```

Shared code lives in `src/shared/` (types, utilities, log events).

## Dependency Rule

Dependencies point inward. The `core` knows nothing about `infra` or `controllers`.

- **Port** (`*.port.ts`): An interface defined in core, implemented by infra.
- **Primary adapter** (`*.controller.ts`): Calls into core. Depends on core.
- **Secondary adapter** (`*.adapter.ts`): Implements a port. Depends on core.
- **Application service** (`core/service/*.ts`): Orchestrates the use case. Receives a port as an argument.

## Interface Rule

Only create interfaces when the dependency direction crosses a boundary **inward**.

- **Ports**: YES — the core defines an interface that infra implements. Core doesn't know about concrete adapters.
- **Application services**: NO — controllers call services directly. No interface needed for thin orchestration.
- **Controllers**: NO — they're entry points, nobody swaps controllers behind an interface.

When in doubt, default to no interface. Add one only when you need to invert a dependency.

## Flow (Left to Right)

```
Controller → Parse/Validate → Application Service → Port → Adapter → External World
```

1. **Controller** receives raw input, extracts dependencies from context, calls parse functions.
2. **Parse functions** (smart constructors) validate and return branded domain types.
3. **Application service** receives validated domain types and a port implementation, orchestrates the use case.
4. **Port** is the boundary — just an interface with method signatures.
5. **Adapter** implements the port, contains all framework/external logic.

## Dependency Injection

Inject adapters via Hono context middleware. Controllers retrieve them with `c.get("portName")`.

```typescript
// router.ts
const firehosePortDep = new Dependency(() => new HonoFirehoseAdapter());
const router = new Hono().use(firehosePortDep.middleware("firehosePort"));
```

```typescript
// controller.ts
const firehosePort = c.get("firehosePort");
const stats = firehoseBroadcast(firehosePort, event);
```

Application services receive ports as plain function arguments — no framework coupling.

## Naming Conventions

| Layer | Pattern | Example |
|-------|---------|---------|
| Port | `*.port.ts` | `firehose.port.ts` exports `FirehosePort` |
| Adapter | `*.adapter.ts` | `hono-firehose.adapter.ts` exports `HonoFirehoseAdapter` |
| Service | `*.ts` in `service/` | `firehose-broadcast.ts` exports `firehoseBroadcast` |
| Controller | `*.controller.ts` | `rest.controller.ts` exports `broadcastEvent` |
| Model | `*.ts` in `model/` | `cloudEvent.ts` exports `CloudEvent` + `parseCloudEvent` |

## Testing Strategy

- **Controller tests**: Mount controller with a stub adapter. Test validation, routing, HTTP status. Do not test the adapter.
- **Adapter tests**: Test concrete adapter in isolation. Mock external dependencies (streams, DB, HTTP clients). Test the full port contract.
- **Application services**: Skip if purely pass-through. Test only if they contain logic (conditionals, loops, multiple port calls).
- **Domain models**: Always test parse functions (happy paths + validation errors).

Stub adapter in controller tests:

```typescript
function stubAdapter(): FirehosePort & { addStream: () => void } {
    return {
        broadcast: () => ({ sent: 1, failed: 0 }),
        addStream: () => {},
    };
}
```

## Domain Models

Use branded opaque types + smart constructors with Zod. See the `branded-domain-object` skill for the full pattern.

Key rules:
- Models live in `core/model/`
- Never use raw primitives in service signatures
- Always parse at the boundary (controller), then pass validated types inward

## Rules of Thumb

1. If a file imports from `hono/*` or any framework, it belongs in `infra/` or `*.controller.ts`, never in `core/`.
2. If a function only calls a port method with no logic, it's fine as a thin application service.
3. Adapters can have extra methods not on the port (transport-specific lifecycle: `addStream`, `cleanupStream`). The port is the minimal contract.
4. One feature = one folder. Don't split ports and adapters across the codebase.
