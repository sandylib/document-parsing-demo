# Strategy and Factory Patterns -- Detailed Examples

## When to Use

Use strategy + factory when your domain has multiple "variants" that share a common interface but differ in:
- What fields or configuration each variant requires
- How payloads are constructed for external providers
- What validation rules or constraints apply
- What retry/delivery behaviour is expected

## Strategy Interface

Strategies define channel-specific rules -- they answer "what are the constraints for this channel?"

```typescript
// application/strategies/notification-channel.strategy.ts
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

export interface NotificationChannelStrategy {
  readonly channel: NotificationChannel;
  getRequiredFields(): string[];
  getMaxContentLength(): number;
  supportsRichContent(): boolean;
  getRetryPolicy(): RetryPolicy;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  retryableErrors: string[];
}
```

| Method | Purpose |
|--------|---------|
| `getRequiredFields` | Returns the fields the channel needs in the send payload (e.g., email needs `to`, `subject`, `body`). |
| `getMaxContentLength` | Maximum character length for the message body. SMS = 160, push = 256, email = unlimited. |
| `supportsRichContent` | Whether the channel supports HTML, images, or formatting. |
| `getRetryPolicy` | Channel-specific retry behaviour (attempts, backoff, which errors are retryable). |

## Strategy Implementations

```typescript
// application/strategies/email.strategy.ts
export class EmailStrategy implements NotificationChannelStrategy {
  readonly channel = NotificationChannel.EMAIL;

  getRequiredFields(): string[] {
    return ['to', 'subject', 'body'];
  }

  getMaxContentLength(): number {
    return Infinity;
  }

  supportsRichContent(): boolean {
    return true;
  }

  getRetryPolicy(): RetryPolicy {
    return { maxAttempts: 3, backoffMs: 5000, retryableErrors: ['RATE_LIMIT', 'TIMEOUT'] };
  }
}

// application/strategies/sms.strategy.ts
export class SmsStrategy implements NotificationChannelStrategy {
  readonly channel = NotificationChannel.SMS;

  getRequiredFields(): string[] {
    return ['phoneNumber', 'message'];
  }

  getMaxContentLength(): number {
    return 160;
  }

  supportsRichContent(): boolean {
    return false;
  }

  getRetryPolicy(): RetryPolicy {
    return { maxAttempts: 2, backoffMs: 10000, retryableErrors: ['TIMEOUT'] };
  }
}

// application/strategies/push.strategy.ts
export class PushStrategy implements NotificationChannelStrategy {
  readonly channel = NotificationChannel.PUSH;

  getRequiredFields(): string[] {
    return ['deviceToken', 'title', 'body'];
  }

  getMaxContentLength(): number {
    return 256;
  }

  supportsRichContent(): boolean {
    return false;
  }

  getRetryPolicy(): RetryPolicy {
    return { maxAttempts: 1, backoffMs: 0, retryableErrors: [] };
  }
}
```

## Factory Interface

Factories handle payload construction -- they answer "how do I build a valid payload for this channel's provider?"

```typescript
// application/factories/notification-payload.factory.ts
export interface NotificationPayloadFactory {
  readonly channel: NotificationChannel;
  buildSendPayload(input: SendNotificationInput): ProviderPayload;
  buildBatchPayload(recipients: Recipient[], template: NotificationTemplate): ProviderPayload[];
}

export interface SendNotificationInput {
  recipient: Recipient;
  template: NotificationTemplate;
  metadata?: Record<string, unknown>;
}

export interface ProviderPayload {
  provider: string;
  endpoint: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}
```

## Factory Implementations

```typescript
// application/factories/email-payload.factory.ts
export class EmailPayloadFactory implements NotificationPayloadFactory {
  readonly channel = NotificationChannel.EMAIL;

  constructor(private readonly strategy: EmailStrategy) {}

  buildSendPayload(input: SendNotificationInput): ProviderPayload {
    const { recipient, template, metadata } = input;

    return {
      provider: 'ses',
      endpoint: '/v2/email/outbound-emails',
      headers: { 'Content-Type': 'application/json' },
      body: {
        destination: { toAddresses: [recipient.email] },
        content: {
          subject: { data: template.subject },
          body: this.strategy.supportsRichContent()
            ? { html: { data: template.body } }
            : { text: { data: template.body } },
        },
        tags: metadata ? Object.entries(metadata).map(([k, v]) => ({ name: k, value: String(v) })) : [],
      },
    };
  }

  buildBatchPayload(recipients: Recipient[], template: NotificationTemplate): ProviderPayload[] {
    return recipients.map((recipient) =>
      this.buildSendPayload({ recipient, template }),
    );
  }
}

// application/factories/sms-payload.factory.ts
export class SmsPayloadFactory implements NotificationPayloadFactory {
  readonly channel = NotificationChannel.SMS;

  constructor(private readonly strategy: SmsStrategy) {}

  buildSendPayload(input: SendNotificationInput): ProviderPayload {
    const { recipient, template } = input;
    const maxLength = this.strategy.getMaxContentLength();
    const message = template.body.slice(0, maxLength);

    return {
      provider: 'twilio',
      endpoint: '/2010-04-01/Messages.json',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: {
        To: recipient.phoneNumber,
        Body: message,
        MessagingServiceSid: 'MSG_SERVICE_ID',
      },
    };
  }

  buildBatchPayload(recipients: Recipient[], template: NotificationTemplate): ProviderPayload[] {
    return recipients.map((recipient) =>
      this.buildSendPayload({ recipient, template }),
    );
  }
}

// application/factories/push-payload.factory.ts
export class PushPayloadFactory implements NotificationPayloadFactory {
  readonly channel = NotificationChannel.PUSH;

  constructor(private readonly strategy: PushStrategy) {}

  buildSendPayload(input: SendNotificationInput): ProviderPayload {
    const { recipient, template } = input;
    const maxLength = this.strategy.getMaxContentLength();

    return {
      provider: 'fcm',
      endpoint: '/v1/projects/my-project/messages:send',
      headers: { 'Content-Type': 'application/json' },
      body: {
        message: {
          token: recipient.deviceToken,
          notification: {
            title: template.subject,
            body: template.body.slice(0, maxLength),
          },
          data: template.customData || {},
        },
      },
    };
  }

  buildBatchPayload(recipients: Recipient[], template: NotificationTemplate): ProviderPayload[] {
    return recipients.map((recipient) =>
      this.buildSendPayload({ recipient, template }),
    );
  }
}
```

## Registry

The registry is the only `@Injectable()` -- it resolves strategies and factories by channel at runtime:

```typescript
// application/strategies/notification-channel.registry.ts
@Injectable()
export class NotificationChannelRegistry {
  private readonly strategies = new Map<NotificationChannel, NotificationChannelStrategy>();
  private readonly factories = new Map<NotificationChannel, NotificationPayloadFactory>();

  constructor() {
    const emailStrategy = new EmailStrategy();
    const smsStrategy = new SmsStrategy();
    const pushStrategy = new PushStrategy();

    this.strategies.set(NotificationChannel.EMAIL, emailStrategy);
    this.strategies.set(NotificationChannel.SMS, smsStrategy);
    this.strategies.set(NotificationChannel.PUSH, pushStrategy);

    this.factories.set(NotificationChannel.EMAIL, new EmailPayloadFactory(emailStrategy));
    this.factories.set(NotificationChannel.SMS, new SmsPayloadFactory(smsStrategy));
    this.factories.set(NotificationChannel.PUSH, new PushPayloadFactory(pushStrategy));
  }

  resolveStrategy(channel: NotificationChannel): NotificationChannelStrategy {
    const strategy = this.strategies.get(channel);
    if (!strategy) throw new Error(`No strategy registered for channel: ${channel}`);
    return strategy;
  }

  resolveFactory(channel: NotificationChannel): NotificationPayloadFactory {
    const factory = this.factories.get(channel);
    if (!factory) throw new Error(`No factory registered for channel: ${channel}`);
    return factory;
  }
}
```

## Usage in Services

```typescript
// application/use-cases/notification.service.ts
@Injectable()
export class NotificationService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
    private readonly registry: NotificationChannelRegistry,
  ) {}

  async send(channel: NotificationChannel, input: SendNotificationInput): Promise<void> {
    const strategy = this.registry.resolveStrategy(channel);
    const factory = this.registry.resolveFactory(channel);

    // Validate required fields
    const requiredFields = strategy.getRequiredFields();
    this.validateFields(input.recipient, requiredFields);

    // Build provider-specific payload
    const payload = factory.buildSendPayload(input);

    // Send with channel-specific retry policy
    const retryPolicy = strategy.getRetryPolicy();
    await this.sendWithRetry(payload, retryPolicy);
  }

  async sendBatch(
    channel: NotificationChannel,
    recipients: Recipient[],
    template: NotificationTemplate,
  ): Promise<void> {
    const factory = this.registry.resolveFactory(channel);
    const payloads = factory.buildBatchPayload(recipients, template);

    for (const payload of payloads) {
      await this.notificationRepository.enqueue(payload);
    }
  }

  private async sendWithRetry(payload: ProviderPayload, policy: RetryPolicy): Promise<void> {
    let attempt = 0;
    while (attempt < policy.maxAttempts) {
      try {
        await this.notificationRepository.dispatch(payload);
        return;
      } catch (error) {
        attempt++;
        if (attempt >= policy.maxAttempts || !this.isRetryable(error, policy)) {
          throw error;
        }
        await this.delay(policy.backoffMs * attempt);
      }
    }
  }
}
```

## Adding a New Channel

To add a new channel (e.g., WhatsApp):

1. Add enum value: `WHATSAPP = 'whatsapp'` in `NotificationChannel`
2. Create `whatsapp.strategy.ts` implementing `NotificationChannelStrategy`
3. Create `whatsapp-payload.factory.ts` implementing `NotificationPayloadFactory`
4. Register both in `NotificationChannelRegistry` constructor
5. Add tests for the new strategy and factory
6. **No changes needed in `NotificationService` or controllers** -- the registry resolves automatically

## Rules

1. No `if/switch` on channel in services -- all channel-specific logic lives in strategy/factory classes
2. Strategies are pure rules -- no dependencies, not `@Injectable()`
3. Factories handle all payload construction -- never build provider payloads inline in services
4. Each factory depends on its strategy for constraint rules (content length, rich content support)
5. Registry is the only `@Injectable()` -- it wires strategies and factories together
6. Adding a new channel never requires modifying existing service code
7. Service orchestrates the flow (validate → build → send) without knowing channel details
