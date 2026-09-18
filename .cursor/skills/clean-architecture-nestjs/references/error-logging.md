# Error Handling and Logging -- Detailed Examples

## Error Handling

### Custom Exception Classes

Define domain-specific exceptions that map to HTTP status codes:

```typescript
// shared/errors/external-api-http.error.ts
export class ExternalApiHttpError extends HttpException {
  constructor(
    message: string,
    statusCode: number,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message, statusCode);
  }
}

// shared/errors/external-api-unavailable.error.ts
export class ExternalApiUnavailableError extends HttpException {
  constructor(service: string) {
    super(
      API_ERROR_MESSAGES.SERVICE_UNAVAILABLE(service),
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

// shared/errors/authentication.error.ts
export class AuthenticationError extends HttpException {
  constructor(message?: string) {
    super(
      message || AUTH_ERROR_MESSAGES.UNAUTHORIZED,
      HttpStatus.UNAUTHORIZED,
    );
  }
}
```

### Error Constants

All error messages live in constants -- no hardcoded strings:

```typescript
// shared/constants/errors/api-errors.constants.ts
export const API_ERROR_MESSAGES = {
  SERVICE_UNAVAILABLE: (service: string) =>
    `${service} service is currently unavailable`,
  REQUEST_TIMEOUT: (service: string) =>
    `Request to ${service} timed out`,
  INVALID_RESPONSE: (endpoint: string) =>
    `Invalid response from ${endpoint}`,
} as const;

// shared/constants/errors/auth-errors.constants.ts
export const AUTH_ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentication required',
  TOKEN_EXPIRED: 'Authentication token has expired',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this action',
} as const;

// shared/constants/errors/validation-errors.constants.ts
export const VALIDATION_ERROR_MESSAGES = {
  REQUIRED_FIELD: (field: string) => `${field} is required`,
  INVALID_FORMAT: (field: string, expected: string) =>
    `${field} must be in ${expected} format`,
} as const;
```

### Exception Filter

A global filter catches unhandled exceptions and returns consistent responses:

```typescript
// infrastructure/filters/http-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerProvider) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.message
      : 'Internal server error';

    this.logger.error('Unhandled exception', exception, 'http', {
      path: request.url,
      method: request.method,
      status,
    });

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### Rules

1. Never re-wrap `HttpException` -- preserve the original context
2. All error messages come from constants in `shared/constants/errors/`
3. Use appropriate HTTP status codes via `HttpStatus` enum
4. Include context metadata when throwing (for logging)
5. Domain-specific exceptions extend `HttpException`

---

## Structured Logging

### Logger Provider

A centralized logger with categorized, structured output:

```typescript
// infrastructure/logging/logger.provider.ts
@Injectable()
export class LoggerProvider {
  private readonly serviceName: string;
  private readonly environment: string;

  constructor(private readonly config: AppConfigProvider) {
    this.serviceName = config.serviceName;
    this.environment = config.environment;
  }

  info(message: string, category: string, meta?: Record<string, unknown>): void {
    this.log('info', message, category, meta);
  }

  warn(message: string, category: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, category, meta);
  }

  error(
    message: string,
    error: unknown,
    category: string,
    meta?: Record<string, unknown>,
  ): void {
    this.log('error', message, category, {
      ...meta,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  private log(
    level: string,
    message: string,
    category: string,
    meta?: Record<string, unknown>,
  ): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      service: this.serviceName,
      message,
      ...meta,
    };

    if (this.environment === 'local') {
      console.log(JSON.stringify(entry, null, 2));
    } else {
      console.log(JSON.stringify(entry));
    }
  }
}
```

### Logging Categories

| Category | Use for |
|----------|---------|
| `http` | Incoming request/response logging |
| `auth` | Authentication events (login, token refresh, failures) |
| `api` | Outbound API calls to upstream services |
| `security` | Security events (unauthorized access, rate limiting) |
| `performance` | Timing, slow queries, resource usage |
| `database` | Database operations, connection events |

### Usage in Repository Adapters

The `loggedCall()` helper on `BaseApiRepository` handles all API logging automatically:

```typescript
async findAll(): Promise<OrderDto[]> {
  const url = `${this.basePath}/orders`;

  return this.loggedCall('Fetching all orders', 'api', { url }, async () => {
    const response = await this.httpClient.instance.get(url);
    return toOrderDtos(response.data);
  });
}
```

This produces structured logs:
```json
{"timestamp":"...","level":"info","category":"api","message":"[START] Fetching all orders","url":"/orders"}
{"timestamp":"...","level":"info","category":"api","message":"[OK] Fetching all orders (45ms)","url":"/orders","ms":45}
```

### Usage in Services

Services use the logger for business-level events:

```typescript
@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: OrdersRepository,
    private readonly logger: LoggerProvider,
  ) {}

  async processOrder(id: string): Promise<void> {
    this.logger.info('Processing order', 'orders', { orderId: id });
    // ... business logic
    this.logger.info('Order processed successfully', 'orders', { orderId: id });
  }
}
```

### Environment Control

- **Local** (`ENVIRONMENT=local`): Pretty-printed JSON to console
- **Deployed** (`ENVIRONMENT=deployed`): Single-line JSON for log aggregation services

### Rules

1. Always use the logger provider -- never raw `console.log`
2. Include a category with every log call
3. Include relevant metadata (IDs, URLs, timing)
4. Error logs must include the error object and stack trace
5. Use `loggedCall()` in repository adapters -- don't manually log API calls
6. Log at appropriate levels: `info` for normal flow, `warn` for recoverable issues, `error` for failures
