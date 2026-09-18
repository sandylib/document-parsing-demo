# Testing Patterns -- Detailed Examples

## Testing Strategy

| Layer | Tool | Test type | Co-location |
|-------|------|-----------|-------------|
| Domain hooks | Vitest + React Query utils | Unit | `domains/<domain>/__tests__/` |
| Domain API functions | Vitest | Unit | `domains/<domain>/__tests__/` |
| Feature components | Vitest + Testing Library | Component | `features/<feature>/__tests__/` |
| Feature hooks | Vitest + renderHook | Unit | `features/<feature>/__tests__/` |
| E2E flows | Playwright | Integration | `e2e/tests/` |

---

## Domain Hook Tests

Use `@tanstack/react-query` test utilities with a wrapper provider:

```typescript
// domains/orders/__tests__/useOrders.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrders } from '../hooks/queries/orders';
import { ordersApi } from '../api/orders.api';
import { vi } from 'vitest';

vi.mock('../api/orders.api');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useOrders', () => {
  it('should fetch and return orders', async () => {
    const mockOrders = [{ id: '1', name: 'Order 1', status: 'pending' }];
    vi.mocked(ordersApi.getAll).mockResolvedValue(mockOrders);

    const { result } = renderHook(() => useOrders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockOrders);
  });

  it('should handle errors', async () => {
    vi.mocked(ordersApi.getAll).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOrders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });
});
```

---

## Domain API Function Tests

Mock the HTTP client directly:

```typescript
// domains/orders/__tests__/orders.api.test.ts
import { ordersApi } from '../api/orders.api';
import { httpClient } from '@/core/client';
import { vi } from 'vitest';

vi.mock('@/core/client', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ordersApi', () => {
  describe('getAll', () => {
    it('should call GET /orders and return data', async () => {
      const mockResponse = { data: [{ id: '1', name: 'Order 1' }] };
      vi.mocked(httpClient.get).mockResolvedValue(mockResponse);

      const result = await ordersApi.getAll();

      expect(httpClient.get).toHaveBeenCalledWith('/orders');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('create', () => {
    it('should call POST /orders with the DTO', async () => {
      const dto = { name: 'New Order', customerId: 'c1', items: [] };
      const mockResponse = { data: { id: '2', ...dto, status: 'pending' } };
      vi.mocked(httpClient.post).mockResolvedValue(mockResponse);

      const result = await ordersApi.create(dto);

      expect(httpClient.post).toHaveBeenCalledWith('/orders', dto);
      expect(result).toEqual(mockResponse.data);
    });
  });
});
```

---

## Feature Component Tests

Test components from the user's perspective using Testing Library:

```typescript
// features/orders/__tests__/OrdersList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrdersList } from '../ui/OrdersList';
import { useOrders } from '@/domains/orders';
import { vi } from 'vitest';

vi.mock('@/domains/orders');

const mockOrders = [
  { id: '1', name: 'Order Alpha', status: 'pending', customerId: 'c1', createdAt: '2024-01-01' },
  { id: '2', name: 'Order Beta', status: 'completed', customerId: 'c2', createdAt: '2024-01-02' },
];

describe('OrdersList', () => {
  beforeEach(() => {
    vi.mocked(useOrders).mockReturnValue({
      data: mockOrders,
      isLoading: false,
      error: null,
    } as any);
  });

  it('should render all orders', () => {
    render(<OrdersList />);

    expect(screen.getByText('Order Alpha')).toBeInTheDocument();
    expect(screen.getByText('Order Beta')).toBeInTheDocument();
  });

  it('should filter orders by search term', async () => {
    render(<OrdersList />);
    const user = userEvent.setup();

    const searchInput = screen.getByRole('textbox', { name: /search/i });
    await user.type(searchInput, 'Alpha');

    expect(screen.getByText('Order Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Order Beta')).not.toBeInTheDocument();
  });

  it('should show error state when fetch fails', () => {
    vi.mocked(useOrders).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any);

    render(<OrdersList />);

    expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
  });

  it('should show loading skeleton initially', () => {
    vi.mocked(useOrders).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<OrdersList />);

    expect(screen.getByTestId('orders-skeleton')).toBeInTheDocument();
  });
});
```

---

## Feature Hook Tests

Test hooks that contain business logic:

```typescript
// features/orders/__tests__/useOrderFilters.test.ts
import { renderHook, act } from '@testing-library/react';
import { useOrderFilters } from '../hooks/useOrderFilters';

const mockOrders = [
  { id: '1', name: 'Alpha Order', status: 'pending' },
  { id: '2', name: 'Beta Order', status: 'completed' },
  { id: '3', name: 'Gamma Order', status: 'pending' },
];

describe('useOrderFilters', () => {
  it('should return all orders when no filters applied', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    expect(result.current.filtered).toHaveLength(3);
  });

  it('should filter by status', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    act(() => {
      result.current.setFilter.setStatusFilter('pending');
    });

    expect(result.current.filtered).toHaveLength(2);
    expect(result.current.filtered.every(o => o.status === 'pending')).toBe(true);
  });

  it('should filter by search term (case-insensitive)', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    act(() => {
      result.current.setFilter.setSearchTerm('alpha');
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].name).toBe('Alpha Order');
  });

  it('should combine status and search filters', () => {
    const { result } = renderHook(() => useOrderFilters(mockOrders));

    act(() => {
      result.current.setFilter.setStatusFilter('pending');
      result.current.setFilter.setSearchTerm('gamma');
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].name).toBe('Gamma Order');
  });

  it('should handle undefined orders gracefully', () => {
    const { result } = renderHook(() => useOrderFilters(undefined));

    expect(result.current.filtered).toEqual([]);
  });
});
```

---

## Test Setup

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Test Setup File

```typescript
// src/test-setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

---

## Rules

1. **Test behavior, not implementation** -- test what users see and do
2. **Mock at boundaries** -- mock domain hooks in component tests, mock HTTP client in API tests
3. **Co-locate tests** -- `__tests__/` folder next to source files
4. **File naming** -- `<source>.test.ts` or `<source>.test.tsx`
5. **No snapshot tests** for logic -- use assertions
6. **Test error and loading states** -- not just the happy path
7. **Use `userEvent`** over `fireEvent` for realistic interactions
8. **Accessibility** -- include `getByRole` queries to verify accessibility
