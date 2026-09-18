# Domains Layer -- Detailed Examples

## What Belongs in Domains

The domains layer is the **data layer** -- it handles API communication, types, mappers, and React Query hooks. It contains **zero UI code**.

| Subdirectory | Contains | Purpose |
|-------------|----------|---------|
| `api/` | API functions | Call the backend via HTTP client |
| `types/` | TypeScript interfaces | Define data shapes |
| `mappers/` | Transformation functions | Convert API responses to app types |
| `utils/` | Domain-specific utilities | Helper functions for this domain |
| `hooks/queries/` | `useQuery` wrappers | Thin read hooks |
| `hooks/mutations/` | `useMutation` wrappers | Thin write hooks |
| `constants/` | Domain constants | Enum values, config |

## Domain Structure Example

```text
src/domains/orders/
├── api/
│   └── orders.api.ts
├── types/
│   └── orders.types.ts
├── mappers/
│   └── orders.mapper.ts
├── hooks/
│   ├── queries/
│   │   └── orders.ts
│   ├── mutations/
│   │   └── orders.ts
│   └── index.ts
└── index.ts
```

## API Functions

API functions use the shared HTTP client and return typed data:

```typescript
// domains/orders/api/orders.api.ts
import { httpClient } from '@/core/client';
import { OrderDto, CreateOrderDto, OrderDetailDto } from '../types/orders.types';

export const ordersApi = {
  getAll: async (): Promise<OrderDto[]> => {
    const response = await httpClient.get('/orders');
    return response.data;
  },

  getById: async (id: string): Promise<OrderDetailDto> => {
    const response = await httpClient.get(`/orders/${id}`);
    return response.data;
  },

  create: async (dto: CreateOrderDto): Promise<OrderDto> => {
    const response = await httpClient.post('/orders', dto);
    return response.data;
  },

  update: async (id: string, dto: Partial<OrderDetailDto>): Promise<OrderDto> => {
    const response = await httpClient.put(`/orders/${id}`, dto);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await httpClient.delete(`/orders/${id}`);
  },
};
```

## Types

Types define the shape of data flowing through the domain:

```typescript
// domains/orders/types/orders.types.ts
export interface OrderDto {
  id: string;
  name: string;
  status: OrderStatus;
  customerId: string;
  createdAt: string;
}

export interface OrderDetailDto extends OrderDto {
  items: OrderItemDto[];
  total: number;
  notes?: string;
}

export interface CreateOrderDto {
  name: string;
  customerId: string;
  items: CreateOrderItemDto[];
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
```

## Mappers

Mappers transform API responses into the shape the app expects:

```typescript
// domains/orders/mappers/orders.mapper.ts
import { OrderDto, OrderDetailDto } from '../types/orders.types';
import { ApiOrder } from '@/core/types';

export function toOrderDto(raw: ApiOrder): OrderDto {
  return {
    id: raw.id,
    name: raw.order_name,
    status: raw.current_status,
    customerId: raw.customer_id,
    createdAt: raw.created_at,
  };
}

export function toOrderDetailDto(raw: ApiOrder): OrderDetailDto {
  return {
    ...toOrderDto(raw),
    items: raw.line_items.map(toOrderItemDto),
    total: raw.total_amount,
    notes: raw.notes || undefined,
  };
}
```

## Query Hooks (Thin Wrappers)

Query hooks are thin `useQuery` wrappers -- they contain no UI logic:

```typescript
// domains/orders/hooks/queries/orders.ts
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../../api/orders.api';
import { QUERY_KEYS } from '@/core/constants';

export function useOrders(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.ORDERS.ALL,
    queryFn: () => ordersApi.getAll(),
    ...options,
  });
}

export function useOrderDetail(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.ORDERS.DETAIL(id),
    queryFn: () => ordersApi.getById(id),
    enabled: !!id && (options?.enabled !== false),
    ...options,
  });
}
```

## Mutation Hooks (Thin Wrappers)

```typescript
// domains/orders/hooks/mutations/orders.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../api/orders.api';
import { QUERY_KEYS } from '@/core/constants';
import { CreateOrderDto } from '../../types/orders.types';

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateOrderDto) => ordersApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDERS.ALL });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ordersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDERS.ALL });
    },
  });
}
```

## Barrel Exports

```typescript
// domains/orders/hooks/index.ts
export { useOrders, useOrderDetail } from './queries/orders';
export { useCreateOrder, useDeleteOrder } from './mutations/orders';

// domains/orders/index.ts
export { ordersApi } from './api/orders.api';
export { useOrders, useOrderDetail, useCreateOrder, useDeleteOrder } from './hooks';
export type { OrderDto, OrderDetailDto, CreateOrderDto, OrderStatus } from './types/orders.types';
```

## Rules

1. **No UI code** -- domains contain zero React components or JSX
2. **Thin hooks only** -- domain hooks are `useQuery`/`useMutation` wrappers with no business logic
3. **Import from core only** -- never import from `features/` or other `domains/`
4. **Barrel exports** -- all public API goes through `index.ts`
5. **Type exports** -- re-export types that features need
6. **Self-contained** -- each domain is an independent data silo
