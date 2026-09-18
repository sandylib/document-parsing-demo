# Features Layer -- Detailed Examples

## What Belongs in Features

The features layer contains **all UI code** -- React components, hooks with business logic, providers, and stores. Each feature is an independent module.

| Subdirectory | Contains | Purpose |
|-------------|----------|---------|
| `ui/` | React components | Visual presentation and interaction |
| `hooks/` | Feature hooks | Business logic, state orchestration |
| `stores/` | Zustand stores | Feature-scoped global state |
| `providers/` | Context providers | Feature-scoped React context |
| `schemas/` | Zod schemas | Form validation |
| `utils/` | Feature utilities | Helper functions |
| `constants/` | Feature constants | Config, step definitions |

## Feature Structure Example

```text
src/features/orders/
├── ui/
│   ├── OrdersList.tsx
│   ├── OrderDetail.tsx
│   ├── CreateOrderForm.tsx
│   ├── form-sections/
│   │   ├── CustomerSection.tsx
│   │   └── ItemsSection.tsx
│   └── dialogs/
│       ├── DeleteOrderDialog.tsx
│       └── CancelOrderDialog.tsx
├── hooks/
│   ├── useOrderForm.ts
│   └── useOrderFilters.ts
├── stores/
│   └── orderFormStore.ts
├── schemas/
│   └── order.schema.ts
├── utils/
│   └── orderStatus.ts
└── index.ts
```

## Components

### Server Components (Default)

Use server components when the component just renders data without interactivity:

```typescript
// features/orders/ui/OrderDetail.tsx
import { OrderHeader } from './OrderHeader';
import { OrderItems } from './OrderItems';

interface OrderDetailProps {
  orderId: string;
}

export default async function OrderDetail({ orderId }: OrderDetailProps) {
  return (
    <div className="space-y-6">
      <OrderHeader orderId={orderId} />
      <OrderItems orderId={orderId} />
    </div>
  );
}
```

### Client Components

Add `"use client"` only when the component needs interactivity:

```typescript
// features/orders/ui/OrdersList.tsx
"use client";

import { useOrders } from '@/domains/orders';
import { useOrderFilters } from '../hooks/useOrderFilters';
import { ErrorState } from '@/features/shared';

export function OrdersList() {
  const { data: orders, isLoading, error } = useOrders();
  const { filtered, filters, setFilter } = useOrderFilters(orders);

  if (error) return <ErrorState error={error} />;
  if (isLoading) return <OrdersSkeleton />;

  return (
    <div>
      <OrderFilters filters={filters} onChange={setFilter} />
      <OrdersTable orders={filtered} />
    </div>
  );
}
```

### Composition Pattern

Break complex views into focused components:

```typescript
// features/orders/ui/CreateOrderForm.tsx
"use client";

import { CustomerSection } from './form-sections/CustomerSection';
import { ItemsSection } from './form-sections/ItemsSection';
import { useOrderForm } from '../hooks/useOrderForm';

export function CreateOrderForm() {
  const { form, onSubmit, isSubmitting } = useOrderForm();

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <CustomerSection form={form} />
      <ItemsSection form={form} />
      <SubmitButton loading={isSubmitting} />
    </form>
  );
}
```

## Feature Hooks (Business Logic)

Feature hooks combine domain data with UI state and business logic:

```typescript
// features/orders/hooks/useOrderForm.ts
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateOrder } from '@/domains/orders';
import { orderSchema, OrderFormValues } from '../schemas/order.schema';
import { useRouter } from 'next/navigation';

export function useOrderForm() {
  const router = useRouter();
  const createOrder = useCreateOrder();

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { items: [{ name: '', quantity: 1 }] },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await createOrder.mutateAsync(values);
    router.push('/orders');
  });

  return {
    form,
    onSubmit,
    isSubmitting: createOrder.isPending,
  };
}
```

```typescript
// features/orders/hooks/useOrderFilters.ts
import { useState, useMemo } from 'react';
import { OrderDto, OrderStatus } from '@/domains/orders';

export function useOrderFilters(orders: OrderDto[] | undefined) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders
      .filter(o => statusFilter === 'all' || o.status === statusFilter)
      .filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [orders, statusFilter, searchTerm]);

  return {
    filtered,
    filters: { status: statusFilter, search: searchTerm },
    setFilter: { setStatusFilter, setSearchTerm },
  };
}
```

## Zustand Stores

For cross-component state within a feature:

```typescript
// features/orders/stores/orderFormStore.ts
import { create } from 'zustand';

interface OrderFormState {
  currentStep: number;
  isDirty: boolean;
  setStep: (step: number) => void;
  markDirty: () => void;
  reset: () => void;
}

export const useOrderFormStore = create<OrderFormState>((set) => ({
  currentStep: 0,
  isDirty: false,
  setStep: (step) => set({ currentStep: step }),
  markDirty: () => set({ isDirty: true }),
  reset: () => set({ currentStep: 0, isDirty: false }),
}));
```

For state shared across multiple features, use `features/shared/stores/`:

```typescript
// features/shared/stores/notificationStore.ts
import { create } from 'zustand';

interface NotificationState {
  message: string | null;
  type: 'success' | 'error' | 'info';
  show: (message: string, type: 'success' | 'error' | 'info') => void;
  dismiss: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  message: null,
  type: 'info',
  show: (message, type) => set({ message, type }),
  dismiss: () => set({ message: null }),
}));
```

## The `shared/` Feature

Cross-feature code lives in `features/shared/`:

```text
features/shared/
├── ui/
│   ├── ErrorState/
│   │   └── ErrorState.tsx
│   ├── ProcessingOverlay.tsx
│   └── LanguageSwitcher.tsx
├── hooks/
│   ├── useRegionFilter.ts
│   └── useResourceTracking.ts
├── stores/
│   └── notificationStore.ts
└── index.ts
```

Rules for shared:
- Only put code here if 2+ features need it
- Don't preemptively make things shared -- start in a feature, move when needed
- Shared components are presentational (receive data via props)

## The `layout/` Feature

The layout feature contains the app shell:

```text
features/layout/
├── ui/
│   ├── AppLayout.tsx
│   ├── Sidebar.tsx
│   └── Header.tsx
└── index.ts
```

All features can import from `features/layout/` -- it's the app skeleton.

## Barrel Exports

Only export what other layers need:

```typescript
// features/orders/index.ts
export { OrdersList } from './ui/OrdersList';
export { OrderDetail } from './ui/OrderDetail';
export { CreateOrderForm } from './ui/CreateOrderForm';
export { useOrderForm } from './hooks/useOrderForm';
```

Internal components (form sections, dialogs) are NOT exported -- they're implementation details.

## Rules

1. **All UI code lives here** -- no React components in domains or core
2. **Features are independent** -- no cross-feature imports (except layout/shared)
3. **Feature hooks have business logic** -- unlike thin domain hooks
4. **Compose domain hooks** -- features combine multiple domain hooks into one feature hook
5. **Barrel exports** -- only export what other layers need
6. **Start in a feature, move to shared when needed** -- don't preemptively share
