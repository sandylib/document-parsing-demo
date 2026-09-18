# Ports and Adapters -- Detailed Examples

## Port Interface

Ports are pure TypeScript interfaces that define what data access the application layer needs. They live in `application/ports/` and have zero infrastructure imports.

```typescript
// application/ports/orders.repository.ts
import { OrderDto } from '../../presentation/web/dto/order.dto';
import { CreateOrderDto } from '../../presentation/web/dto/create-order.dto';

export interface OrdersRepository {
  findAll(): Promise<OrderDto[]>;
  findById(id: string): Promise<OrderDto>;
  create(dto: CreateOrderDto): Promise<OrderDto>;
  update(id: string, dto: Partial<OrderDto>): Promise<OrderDto>;
  delete(id: string): Promise<void>;
}
```

## Injection Token

Each port has a unique Symbol token for NestJS dependency injection:

```typescript
// application/ports/injection-tokens.ts
export const ORDERS_REPOSITORY = Symbol('ORDERS_REPOSITORY');
export const PRODUCTS_REPOSITORY = Symbol('PRODUCTS_REPOSITORY');
export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
```

## Barrel Export

Re-export everything from a single entry point:

```typescript
// application/ports/index.ts
export { OrdersRepository } from './orders.repository';
export { ProductsRepository } from './products.repository';
export { ORDERS_REPOSITORY, PRODUCTS_REPOSITORY } from './injection-tokens';
```

## HTTP API Adapter

For upstream API calls, extend a base class that provides logging and timing:

```typescript
// infrastructure/repositories/base-api.repository.ts
@Injectable()
export abstract class BaseApiRepository {
  constructor(
    protected readonly httpClient: HttpClient,
    protected readonly logger: LoggerProvider,
  ) {}

  protected get basePath(): string {
    return this.httpClient.instance.defaults.baseURL || '';
  }

  protected async loggedCall<T>(
    label: string,
    category: string,
    meta: Record<string, unknown>,
    fn: () => Promise<T>,
  ): Promise<T> {
    const start = Date.now();
    this.logger.info(`[START] ${label}`, category, meta);
    try {
      const result = await fn();
      const ms = Date.now() - start;
      this.logger.info(`[OK] ${label} (${ms}ms)`, category, { ...meta, ms });
      return result;
    } catch (error) {
      const ms = Date.now() - start;
      this.logger.error(`[FAIL] ${label} (${ms}ms)`, error, category, { ...meta, ms });
      throw error;
    }
  }
}
```

```typescript
// infrastructure/repositories/orders-api.repository.ts
@Injectable()
export class OrdersApiRepository
  extends BaseApiRepository
  implements OrdersRepository
{
  async findAll(): Promise<OrderDto[]> {
    const url = `${this.basePath}${ORDERS.UPSTREAM_API.ALL}`;

    return this.loggedCall('Fetching all orders', 'orders', { url }, async () => {
      const response = await this.httpClient.instance.get(url);
      return toOrderDtos(response?.data || []);
    });
  }

  async findById(id: string): Promise<OrderDto> {
    const url = `${this.basePath}${ORDERS.UPSTREAM_API.BY_ID(id)}`;

    return this.loggedCall('Fetching order by ID', 'orders', { url, id }, async () => {
      const response = await this.httpClient.instance.get(url);
      return toOrderDto(response.data);
    });
  }

  async create(dto: CreateOrderDto): Promise<OrderDto> {
    const url = `${this.basePath}${ORDERS.UPSTREAM_API.CREATE}`;

    return this.loggedCall('Creating order', 'orders', { url }, async () => {
      const response = await this.httpClient.instance.post(url, dto);
      return toOrderDto(response.data);
    });
  }
}
```

## Prisma/DB Adapter

For local database access, implement the port interface directly (no base class):

```typescript
// infrastructure/repositories/orders-prisma.repository.ts
@Injectable()
export class OrdersPrismaRepository implements OrdersRepository {
  constructor(private readonly prisma: PrismaAdapter) {}

  async findAll(): Promise<OrderDto[]> {
    const records = await this.prisma.client.order.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map(toOrderDto);
  }

  async findById(id: string): Promise<OrderDto> {
    const record = await this.prisma.client.order.findUniqueOrThrow({
      where: { id },
    });
    return toOrderDto(record);
  }

  async create(dto: CreateOrderDto): Promise<OrderDto> {
    const record = await this.prisma.client.order.create({
      data: { ...dto, status: 'PENDING' },
    });
    return toOrderDto(record);
  }
}
```

## Service (Consumes Port)

Services inject the port token and depend only on the interface:

```typescript
// application/use-cases/orders.service.ts
@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: OrdersRepository,
  ) {}

  async getAllOrders(): Promise<OrderDto[]> {
    return this.ordersRepository.findAll();
  }

  async getOrderById(id: string): Promise<OrderDto> {
    return this.ordersRepository.findById(id);
  }

  async createOrder(dto: CreateOrderDto): Promise<OrderDto> {
    return this.ordersRepository.create(dto);
  }
}
```

## Module Binding (Composition Root)

Modules wire tokens to adapter implementations. They contain no logic:

```typescript
// infrastructure/modules/orders.module.ts
@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    HttpClient,
    { provide: ORDERS_REPOSITORY, useClass: OrdersApiRepository },
  ],
})
export class OrdersModule {}
```

To swap implementations (e.g., from HTTP to Prisma):

```typescript
{ provide: ORDERS_REPOSITORY, useClass: OrdersPrismaRepository },
```

No service code changes required -- only the module binding.

## Two Adapter Types Summary

| Type | Extends | Uses | File naming | When to use |
|------|---------|------|-------------|-------------|
| HTTP API adapter | `BaseApiRepository` | `HttpClient` + `loggedCall()` | `<domain>-api.repository.ts` | Proxying upstream APIs |
| Prisma adapter | nothing (implements port) | `PrismaAdapter` | `<domain>-prisma.repository.ts` | Local database access |
