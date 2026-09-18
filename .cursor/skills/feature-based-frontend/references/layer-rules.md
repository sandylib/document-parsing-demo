# Layer Import Rules -- Detailed Examples

## The Four Layers

| Layer | Responsibility | Can import from |
|-------|---------------|-----------------|
| `app/` | Routes, composition root | `features/`, `core/` |
| `features/` | UI components, business hooks, stores | `domains/`, `core/`, `features/layout`, `features/shared` |
| `domains/` | API calls, types, mappers, React Query hooks | `core/` only |
| `core/` | Shared infrastructure | Nothing above it |

## Dependency Direction

Dependencies flow strictly downward:

```
app/ → features/ → domains/ → core/
```

Never upward. Never sideways between siblings (except the shared/layout exceptions).

## Feature Isolation

Features are independent modules. They cannot import from each other:

```typescript
// ❌ FORBIDDEN: Cross-feature import
import { OrderForm } from '@/features/orders';
// in features/products/ui/ProductPage.tsx

// ✅ ALLOWED: Import from shared
import { ErrorState } from '@/features/shared';

// ✅ ALLOWED: Import from layout
import { AppLayout } from '@/features/layout';
```

### Sharing Between Features

When two features need the same code:
1. If it's a hook or store → move to `features/shared/hooks/` or `features/shared/stores/`
2. If it's a UI component → move to `features/shared/ui/`
3. If it's data access → it belongs in `domains/`, which both features can import

## Domain Isolation

Domains are independent data silos. They cannot import from each other:

```typescript
// ❌ FORBIDDEN: Cross-domain import
import { UserDto } from '@/domains/users';
// in domains/orders/types/orders.types.ts

// ✅ ALLOWED: Import from core
import { httpClient } from '@/core/client';
import { QUERY_KEYS } from '@/core/constants';
```

If two domains share a type, move it to `core/types/`.

## App Layer Rules

The `app/` layer is the composition root. It wires features together without containing business logic:

```typescript
// ✅ CORRECT: app/ imports feature components
import { OrdersList } from '@/features/orders';
import { SearchProvider } from '@/core/providers';

export default function OrdersPage() {
  return (
    <SearchProvider>
      <OrdersList />
    </SearchProvider>
  );
}

// ❌ WRONG: app/ importing domain APIs directly
import { ordersApi } from '@/domains/orders';
// Use feature hooks that wrap domain APIs instead
```

## Core Layer Rules

Core is the foundation. It provides infrastructure but knows nothing about the app above it:

```typescript
// core/client/http-client.ts
// ✅ No imports from domains/ or features/
import { TokenCache } from '@/core/auth';
import { API_CONFIG } from '@/core/config';

export const httpClient = createHttpClient({
  baseURL: API_CONFIG.BASE_URL,
  getToken: () => TokenCache.getToken(),
});
```

## Enforcement

### ESLint Rules

Configure import restrictions:

```javascript
// eslint.config.js
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['@/features/*'], message: 'Domains cannot import from features' },
        { group: ['@/domains/*'], message: 'Core cannot import from domains' },
      ]
    }]
  }
}
```

### Code Review Checklist

- [ ] No cross-feature imports (except layout/shared)
- [ ] No cross-domain imports
- [ ] Core has zero imports from domains or features
- [ ] App uses feature hooks, not domain APIs directly
- [ ] New shared code goes in the correct location (features/shared vs core)
