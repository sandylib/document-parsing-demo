---
name: feature-based-frontend
description: >-
  Guide Next.js/React projects using feature-based architecture with layered
  data flow (app, features, domains, core). Use when structuring frontends,
  adding new domains or features, setting up data fetching with React Query,
  or enforcing layer import rules.
---

# Feature-Based Frontend Architecture

## Layer Diagram

```text
┌─────────────────────────────────────────────────────┐
│                      app/                           │
│        (composition root — imports features/core)   │
│  ✅ Can import from: features/, core/               │
│  ❌ Cannot import from: domains/ directly           │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                   features/                         │
│        (ALL UI - React components/hooks)            │
│  ├── layout/     # App shell (importable by all)   │
│  ├── shared/     # Shared hooks/stores/components  │
│  └── [feature]/  # Feature-specific UI             │
│                                                     │
│  ✅ Can import from: domains/, core/                │
│  ✅ Can import from: features/layout, features/shared│
│  ❌ Cannot import from: other features/             │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                    domains/                         │
│     (Data layer - API, types, React Query hooks)    │
│  ✅ Can import from: core/                          │
│  ❌ Cannot import from: features/, other domains/   │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                      core/                          │
│              (Shared infrastructure)                │
│  ❌ Cannot import from: domains/, features/         │
└─────────────────────────────────────────────────────┘
```

---

## Directory Structure

```text
src/
├── app/                       # Next.js App Router (routes, composition root)
│   ├── layout.tsx            # Root layout
│   └── [locale]/             # Localized routes
│       ├── (main)/           # Route group: pages with sidebar
│       └── (standalone)/     # Route group: pages without sidebar
│
├── domains/                   # Data layers (API, types, mappers, React Query hooks)
│   └── orders/
│       ├── api/              # API calls using HTTP client
│       │   └── orders.api.ts
│       ├── types/            # TypeScript types
│       │   └── orders.types.ts
│       ├── mappers/          # Data transformation
│       │   └── orders.mapper.ts
│       ├── hooks/
│       │   ├── queries/      # useQuery hooks
│       │   │   └── orders.ts
│       │   ├── mutations/    # useMutation hooks
│       │   │   └── orders.ts
│       │   └── index.ts
│       └── index.ts          # Public exports
│
├── features/                  # UI features (React components, hooks, providers)
│   ├── layout/               # App shell (importable by all features)
│   ├── shared/               # Cross-feature hooks, stores, components
│   └── orders/               # Feature-specific UI
│       ├── ui/               # React components
│       ├── hooks/            # Feature-specific hooks
│       ├── stores/           # Zustand stores
│       ├── schemas/          # Zod validation schemas
│       └── index.ts
│
└── core/                      # Shared infrastructure
    ├── auth/                 # Token cache
    ├── client/               # HTTP client (authenticated)
    ├── config/               # API config, environment helpers
    ├── providers/            # React providers (Query, Theme)
    ├── types/                # Shared/generated TypeScript types
    ├── utils/                # Shared utilities
    ├── hooks/                # Shared React hooks
    └── constants/            # Shared constants (query keys, etc.)
```

---

## Adding a New Domain (Checklist)

Follow these 5 steps:

1. **Create domain directory** at `src/domains/<domain>/`
   - Add: `api/<domain>.api.ts` -- API functions using the HTTP client
   - Add: `types/<domain>.types.ts` -- TypeScript interfaces
   - Add: `hooks/queries/<domain>.ts` -- thin `useQuery` wrappers
   - Add: `hooks/mutations/<domain>.ts` -- thin `useMutation` wrappers

2. **Create barrel exports**
   - `hooks/index.ts` re-exports all hooks
   - `index.ts` re-exports public API

3. **Keep hooks thin**
   - Domain hooks are `useQuery`/`useMutation` wrappers ONLY
   - No UI logic, no component state, no side effects

4. **Import from core only**
   - Use `@/core/client` for the HTTP client
   - Use `@/core/constants` for query keys
   - Never import from `features/` or other `domains/`

5. **Test hooks and API functions**
   - Mock the HTTP client in API tests
   - Use React Query test utilities for hook tests

For detailed examples, see [references/domains-layer.md](references/domains-layer.md).

---

## Adding a New Feature (Checklist)

Follow these 4 steps:

1. **Create feature directory** at `src/features/<feature>/`
   - `ui/` -- React components
   - `hooks/` -- Feature-specific hooks (with business logic)
   - `stores/` -- Zustand stores (if needed)
   - `index.ts` -- Public exports

2. **Import data from domains**
   ```typescript
   import { useOrders, useCreateOrder } from '@/domains/orders';
   ```

3. **Respect feature boundaries**
   - Can import from: `@/domains/*`, `@/core/*`, `@/features/layout`, `@/features/shared`
   - Cannot import from: other `@/features/*`

4. **Export via barrel**
   - Only export what other layers need from `index.ts`
   - Internal components are not exported

For detailed examples, see [references/features-layer.md](references/features-layer.md).

---

## Import Rules (Enforcement Table)

| From \ To | app/ | features/ | domains/ | core/ |
|-----------|------|-----------|----------|-------|
| **app/** | -- | ✅ | ❌ (use feature hooks) | ✅ |
| **features/** | ❌ | layout/shared only | ✅ | ✅ |
| **domains/** | ❌ | ❌ | ❌ (no cross-domain) | ✅ |
| **core/** | ❌ | ❌ | ❌ | -- |

**Key rules:**
- `app/` uses feature hooks that wrap domain APIs (not domain APIs directly)
- Features never cross-import other features (except `layout/` and `shared/`)
- Domains are independent data silos -- no cross-domain imports
- Core is the foundation -- imported by everyone, imports nothing above it

---

## Component Standards

### Server vs Client Decision

```
Does this component need:
  - Event handlers (onClick, onChange)?
  - React hooks (useState, useEffect)?
  - Browser APIs (window, document)?
  - TanStack Query hooks?
  │
  ├── YES to any → Client Component ("use client")
  └── NO to all  → Server Component (default, no directive)
```

### Rules

1. **Server Components by default** -- only add `"use client"` when needed
2. **Composition over monoliths** -- break into small, focused components
3. **Props interfaces** -- define TypeScript interfaces for all props
4. **Single responsibility** -- each component has one clear purpose
5. **Colocation** -- keep related components in the same feature folder

---

## State Management

| State type | Tool | Where it lives |
|-----------|------|---------------|
| Server state | TanStack Query | `domains/<domain>/hooks/` |
| Local UI state | `useState` / `useReducer` | Feature component |
| Cross-feature state | Zustand store | `features/shared/stores/` |
| Form state | React Hook Form + Zod | Feature component |
| URL state | Next.js router | `app/` routes |

**Rule:** Prefer server state (TanStack Query) over client state. Only store what's necessary on the client.

---

## Data Fetching

Domain hooks are thin `useQuery`/`useMutation` wrappers:

```typescript
// domains/orders/hooks/queries/orders.ts
export function useOrders(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.ORDERS.ALL,
    queryFn: () => ordersApi.getAll(),
    ...options,
  });
}

// domains/orders/hooks/mutations/orders.ts
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateOrderDto) => ordersApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDERS.ALL });
    },
  });
}
```

Feature hooks add business logic on top:

```typescript
// features/orders/hooks/useOrderForm.ts
export function useOrderForm() {
  const { data: orders } = useOrders();
  const createOrder = useCreateOrder();
  const [step, setStep] = useState(0);

  // Business logic: validation, multi-step form, etc.
  return { orders, createOrder, step, setStep };
}
```

---

## Additional References

- [Layer Rules](references/layer-rules.md) -- import boundaries with enforcement examples
- [Domains Layer](references/domains-layer.md) -- API, types, mappers, thin hooks
- [Features Layer](references/features-layer.md) -- components, hooks, providers, stores
- [Testing Patterns](references/testing.md) -- Vitest, component tests, hook tests
