# Testing Patterns -- Detailed Examples

## Testing Philosophy

Each layer is tested independently by mocking its dependencies:

| Layer | What you test | What you mock |
|-------|--------------|---------------|
| Service (use-case) | Business logic, orchestration | Port interfaces |
| Repository adapter (HTTP) | URL construction, mapper calls, error handling | HTTP client |
| Repository adapter (Prisma) | Query construction, data mapping | Prisma client |
| Strategy | Behavioural rules | Nothing (pure logic) |
| Factory | Payload construction | Nothing (uses strategy) |

---

## Service Tests (Mock Ports)

Service tests mock the port interface -- not HTTP clients or ORM internals:

```typescript
// application/use-cases/__tests__/orders.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../orders.service';
import { ORDERS_REPOSITORY } from '../../ports/injection-tokens';
import { OrdersRepository } from '../../ports/orders.repository';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockRepository: jest.Mocked<OrdersRepository>;

  beforeEach(async () => {
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: ORDERS_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('getAllOrders', () => {
    it('should return all orders from the repository', async () => {
      const expected = [{ id: '1', name: 'Order 1', status: 'pending' }];
      mockRepository.findAll.mockResolvedValue(expected);

      const result = await service.getAllOrders();

      expect(result).toEqual(expected);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getOrderById', () => {
    it('should return the order matching the given ID', async () => {
      const expected = { id: '1', name: 'Order 1', status: 'pending' };
      mockRepository.findById.mockResolvedValue(expected);

      const result = await service.getOrderById('1');

      expect(result).toEqual(expected);
      expect(mockRepository.findById).toHaveBeenCalledWith('1');
    });
  });

  describe('createOrder', () => {
    it('should pass the DTO to the repository', async () => {
      const input = { name: 'New Order', customerId: 'c1' };
      const expected = { id: '2', ...input, status: 'pending' };
      mockRepository.create.mockResolvedValue(expected);

      const result = await service.createOrder(input);

      expect(result).toEqual(expected);
      expect(mockRepository.create).toHaveBeenCalledWith(input);
    });
  });
});
```

### Key Points

- Mock shape matches the port interface exactly
- No knowledge of HTTP clients, URLs, or database queries
- Tests verify business logic and orchestration only
- Easy to add new test cases without infrastructure setup

---

## HTTP Repository Adapter Tests

Adapter tests mock the concrete HTTP client and verify correct URL construction, mapper invocations, and error propagation:

```typescript
// infrastructure/repositories/__tests__/orders-api.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersApiRepository } from '../orders-api.repository';
import { HttpClient } from '../../adapters/http-client';
import { LoggerProvider } from '../../logging/logger.provider';

describe('OrdersApiRepository', () => {
  let repository: OrdersApiRepository;
  let mockHttpClient: { instance: { get: jest.Mock; post: jest.Mock } };
  let mockLogger: jest.Mocked<LoggerProvider>;

  beforeEach(async () => {
    mockHttpClient = {
      instance: {
        get: jest.fn(),
        post: jest.fn(),
        defaults: { baseURL: 'http://api.example.com' },
      },
    };

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersApiRepository,
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: LoggerProvider, useValue: mockLogger },
      ],
    }).compile();

    repository = module.get<OrdersApiRepository>(OrdersApiRepository);
  });

  describe('findAll', () => {
    it('should call the correct URL and return mapped DTOs', async () => {
      const apiResponse = { data: [{ id: '1', order_name: 'Test' }] };
      mockHttpClient.instance.get.mockResolvedValue(apiResponse);

      const result = await repository.findAll();

      expect(mockHttpClient.instance.get).toHaveBeenCalledWith(
        expect.stringContaining('/orders'),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', '1');
    });

    it('should return empty array when API returns no data', async () => {
      mockHttpClient.instance.get.mockResolvedValue({ data: null });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should propagate errors from the HTTP client', async () => {
      mockHttpClient.instance.get.mockRejectedValue(new Error('Network error'));

      await expect(repository.findAll()).rejects.toThrow('Network error');
    });
  });
});
```

---

## Prisma Repository Adapter Tests

```typescript
// infrastructure/repositories/__tests__/orders-prisma.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersPrismaRepository } from '../orders-prisma.repository';
import { PrismaAdapter } from '../../adapters/prisma.adapter';

describe('OrdersPrismaRepository', () => {
  let repository: OrdersPrismaRepository;
  let mockPrisma: { client: { order: any } };

  beforeEach(async () => {
    mockPrisma = {
      client: {
        order: {
          findMany: jest.fn(),
          findUniqueOrThrow: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersPrismaRepository,
        { provide: PrismaAdapter, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<OrdersPrismaRepository>(OrdersPrismaRepository);
  });

  describe('findAll', () => {
    it('should query with descending order and map results', async () => {
      const records = [{ id: '1', name: 'Order 1', createdAt: new Date() }];
      mockPrisma.client.order.findMany.mockResolvedValue(records);

      const result = await repository.findAll();

      expect(mockPrisma.client.order.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create with default status and return mapped DTO', async () => {
      const input = { name: 'New', customerId: 'c1' };
      const created = { id: '2', ...input, status: 'PENDING', createdAt: new Date() };
      mockPrisma.client.order.create.mockResolvedValue(created);

      const result = await repository.create(input);

      expect(mockPrisma.client.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'PENDING' }),
      });
      expect(result).toHaveProperty('id', '2');
    });
  });
});
```

---

## Strategy Tests

Strategies are pure logic -- no mocking needed:

```typescript
// application/strategies/__tests__/sms.strategy.spec.ts
import { SmsStrategy } from '../sms.strategy';
import { NotificationChannel } from '../notification-channel.strategy';

describe('SmsStrategy', () => {
  const strategy = new SmsStrategy();

  it('should return channel as SMS', () => {
    expect(strategy.channel).toBe(NotificationChannel.SMS);
  });

  it('should require phoneNumber and message fields', () => {
    const fields = strategy.getRequiredFields();
    expect(fields).toEqual(['phoneNumber', 'message']);
  });

  it('should limit content to 160 characters', () => {
    expect(strategy.getMaxContentLength()).toBe(160);
  });

  it('should not support rich content', () => {
    expect(strategy.supportsRichContent()).toBe(false);
  });

  it('should retry up to 2 times on timeout', () => {
    const policy = strategy.getRetryPolicy();
    expect(policy.maxAttempts).toBe(2);
    expect(policy.retryableErrors).toContain('TIMEOUT');
  });
});
```

---

## Factory Tests

```typescript
// application/factories/__tests__/sms-payload.factory.spec.ts
import { SmsPayloadFactory } from '../sms-payload.factory';
import { SmsStrategy } from '../../strategies/sms.strategy';

describe('SmsPayloadFactory', () => {
  const strategy = new SmsStrategy();
  const factory = new SmsPayloadFactory(strategy);

  describe('buildSendPayload', () => {
    it('should build a Twilio-compatible payload', () => {
      const input = {
        recipient: { phoneNumber: '+61400000000' },
        template: { subject: 'Alert', body: 'Your order has shipped' },
      };

      const result = factory.buildSendPayload(input);

      expect(result.provider).toBe('twilio');
      expect(result.body.To).toBe('+61400000000');
      expect(result.body.Body).toBe('Your order has shipped');
    });

    it('should truncate message to max content length', () => {
      const longMessage = 'A'.repeat(200);
      const input = {
        recipient: { phoneNumber: '+61400000000' },
        template: { subject: 'Alert', body: longMessage },
      };

      const result = factory.buildSendPayload(input);

      expect((result.body.Body as string).length).toBe(160);
    });
  });

  describe('buildBatchPayload', () => {
    it('should produce one payload per recipient', () => {
      const recipients = [
        { phoneNumber: '+61400000001' },
        { phoneNumber: '+61400000002' },
      ];
      const template = { subject: 'Alert', body: 'Hello' };

      const results = factory.buildBatchPayload(recipients, template);

      expect(results).toHaveLength(2);
      expect(results[0].body.To).toBe('+61400000001');
      expect(results[1].body.To).toBe('+61400000002');
    });
  });
});
```

---

## Test Organization

```text
src/
├── application/
│   ├── use-cases/
│   │   └── __tests__/
│   │       └── orders.service.spec.ts
│   ├── strategies/
│   │   └── __tests__/
│   │       ├── email.strategy.spec.ts
│   │       ├── sms.strategy.spec.ts
│   │       └── push.strategy.spec.ts
│   └── factories/
│       └── __tests__/
│           ├── email-payload.factory.spec.ts
│           ├── sms-payload.factory.spec.ts
│           └── push-payload.factory.spec.ts
└── infrastructure/
    └── repositories/
        └── __tests__/
            ├── orders-api.repository.spec.ts
            └── orders-prisma.repository.spec.ts
```

### Rules

1. Tests are co-located in `__tests__/` folders next to source files
2. File naming: `<source-file>.spec.ts`
3. Service tests mock port interfaces, not infrastructure
4. Adapter tests mock the concrete dependency (HTTP client or Prisma)
5. Strategy and factory tests need no mocking (pure logic)
6. Each `describe` block tests one public method
7. Test names describe the expected behavior, not the implementation
