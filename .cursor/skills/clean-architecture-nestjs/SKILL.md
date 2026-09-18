---
name: clean-architecture-nestjs
description: >-
  Guide NestJS projects using hexagonal/clean architecture with ports and adapters,
  strategy/factory patterns, structured logging, and proper testing. Use when
  scaffolding NestJS services, adding new domains, refactoring to ports/adapters,
  or implementing polymorphic behavior with strategy pattern.
---

# Clean Architecture for NestJS

## Layer Dependency Direction

```text
           ┌─────────────────────────────────────┐
           │         PRESENTATION                │
           │  Controllers    Decorators    DTOs   │
           └─────────────────┬───────────────────┘
                             │ depends on
                             ▼
           ┌─────────────────────────────────────┐
           │          APPLICATION                │
           │  Use Cases (business logic only)    │
           │  Port Interfaces (contracts)        │
           │  Injection Tokens (DI symbols)      │
           │  Strategies (behavioural rules)     │
           │  Factories (payload construction)   │
           └──────────┬──────────────────────────┘
                      │ depends on ports (interfaces only)
                      ▼
           ┌─────────────────────────────────────┐
           │         INFRASTRUCTURE              │
           │  Repository Adapters (implement     │
           │    port interfaces)                 │
           │  HTTP Clients / ORM Adapters        │
           │  Mappers    Modules    Config       │
           └─────────────────────────────────────┘

           ┌─────────────────────────────────────┐
           │              SHARED                 │
           │  Constants    Types    Errors       │
           │  (Used by all layers)              │
           └─────────────────────────────────────┘
```

**Key rule:** Application defines port interfaces. Infrastructure implements them. Modules wire them together. Neither layer depends on the other directly.

---

## Directory Structure

```text
src/
├── core/                      # Domain entities, middleware
├── application/               # Application layer
│   ├── ports/                # Repository interfaces + DI tokens
│   ├── use-cases/            # Services (business logic only)
│   ├── strategies/           # Strategy pattern (kind-specific rules)
│   ├── factories/            # Factory pattern (payload construction)
│   └── types/                # Application-owned type unions
├── presentation/              # Presentation layer
│   └── web/
│       ├── controllers/      # HTTP controllers
│       ├── dto/              # Request/response DTOs
│       └── decorators/       # Custom decorators
├── infrastructure/            # Infrastructure layer
│   ├── adapters/             # HTTP clients, external services
│   ├── repositories/         # Port implementations (adapters)
│   ├── mappers/              # Raw data → DTO transformations
│   ├── modules/              # NestJS modules (composition roots)
│   └── config/               # Configuration providers
└── shared/                    # Cross-cutting concerns
    ├── constants/            # Constants organized by domain
    ├── errors/               # Shared error classes
    └── types/                # Shared interfaces
```

---

## Adding a New Domain (Checklist)

Follow these 7 steps in order:

1. **Define port interface** in `application/ports/<domain>.repository.ts`
   - Pure TypeScript interface, no infrastructure imports
   - Methods return DTOs or application-owned types

2. **Add DI token** in `application/ports/injection-tokens.ts`
   - `export const ORDERS_REPOSITORY = Symbol('ORDERS_REPOSITORY');`

3. **Export from barrel** in `application/ports/index.ts`

4. **Create adapter** in `infrastructure/repositories/<domain>-api.repository.ts`
   - HTTP upstream: extend base API repository class, use `loggedCall()`
   - Local DB (e.g. Prisma): implement port interface directly

5. **Create service** in `application/use-cases/<domain>.service.ts`
   - Inject port via `@Inject(TOKEN)` with port interface type
   - Never import from `infrastructure/`

6. **Create controller** in `presentation/web/controllers/<domain>/`
   - Handle HTTP concerns only, delegate to service

7. **Create module** in `infrastructure/modules/<domain>.module.ts`
   - Bind token to adapter: `{ provide: TOKEN, useClass: Adapter }`
   - Register in root module

---

## Port/Adapter Rules

1. Ports live in `application/ports/` -- pure interfaces with no infrastructure imports
2. Adapters live in `infrastructure/repositories/` -- implement port interfaces using concrete dependencies
3. HTTP adapters extend a base class with a `loggedCall()` helper for timing/logging boilerplate
4. Prisma/DB adapters implement the port interface directly (do NOT extend the HTTP base class)
5. Use-case services inject port tokens only -- never import infrastructure classes directly

---

## When to Use Strategy + Factory

**Decision tree:**

```
Does the domain have multiple variants that share a common interface
but differ in rules, constraints, or payload construction?
(e.g., notification channels: Email, SMS, Push)
  │
  ├── YES → Use Strategy + Factory
  │         ├── Strategy = channel/variant rules (required fields, constraints, retry policies)
  │         ├── Factory = payload construction (provider-specific payloads)
  │         └── Registry = resolves both by variant at runtime
  │
  └── NO → Standard service with port injection is sufficient
```

**Rules:**
- No `if/switch` on variant in services -- variant-specific logic lives in strategy/factory classes
- Strategies are pure rules (no dependencies, not `@Injectable()`)
- Factories handle payload construction, depend on their strategy for constraint rules
- Registry is the only `@Injectable()` -- resolves both by variant
- Adding a new variant = new strategy + new factory + register in registry (no service changes)

For detailed examples, see [references/strategy-factory.md](references/strategy-factory.md).

---

## Testing Rules

### Service Tests (mock ports)

```typescript
const mockRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};

const module = await Test.createTestingModule({
  providers: [
    OrdersService,
    { provide: ORDERS_REPOSITORY, useValue: mockRepository },
  ],
}).compile();
```

- Mock the port interface, not HTTP clients or ORM internals
- Test business logic in isolation
- Verify service orchestrates calls correctly

### Adapter Tests (mock infrastructure)

```typescript
const mockHttpClient = {
  instance: { get: jest.fn(), post: jest.fn() },
};

const module = await Test.createTestingModule({
  providers: [
    OrdersApiRepository,
    { provide: HttpClient, useValue: mockHttpClient },
  ],
}).compile();
```

- Mock the concrete dependency (HTTP client, Prisma client)
- Test URL construction, mapper invocations, error propagation
- Both layers tested independently

For more patterns, see [references/testing.md](references/testing.md).

---

## Error Handling

1. Define custom exception classes per domain
2. Use error constants from `shared/constants/errors/` -- no hardcoded messages
3. Preserve HTTP exception context (don't re-wrap `HttpException`)
4. Use appropriate HTTP status codes via constants

---

## Logging

1. Use a centralized logger provider with categorized logging
2. Categories: `http`, `auth`, `api`, `security`, `performance`
3. Include structured metadata: service name, response times, context
4. Environment-aware: console locally, structured JSON in production

For details, see [references/error-logging.md](references/error-logging.md).

---

## Naming Conventions

| Concern | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case with domain prefix | `orders-api.repository.ts` |
| Port interfaces | `<Domain>Repository` | `OrdersRepository` |
| Adapter classes | `<Domain>ApiRepository` | `OrdersApiRepository` |
| DI tokens | SCREAMING_SNAKE Symbol | `ORDERS_REPOSITORY` |
| Services | `<Domain>Service` | `OrdersService` |
| Controllers | `<Domain>Controller` | `OrdersController` |
| Constants | SCREAMING_SNAKE with domain grouping | `ORDERS.ROUTES.BASE` |

---

## Additional References

- [Ports and Adapters](references/ports-and-adapters.md) -- full examples with code
- [Strategy and Factory](references/strategy-factory.md) -- interfaces, registry, adding new kinds
- [Error Handling and Logging](references/error-logging.md) -- exception classes, logger patterns
- [Testing Patterns](references/testing.md) -- service tests, adapter tests, mocking strategies
