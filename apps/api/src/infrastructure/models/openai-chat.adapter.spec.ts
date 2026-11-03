import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { OpenAiChatAdapter } from './openai-chat.adapter.js';

afterEach(() => vi.unstubAllGlobals());
describe('OpenAiChatAdapter', () => {
  it('maps provider SSE into neutral chat events', async () => {
    const fixture =
      'data: {"choices":[{"delta":{"content":"Grounded "},"finish_reason":null}]}\n\ndata: {"choices":[{"delta":{"content":"answer."},"finish_reason":"stop"}],"usage":{"prompt_tokens":20,"completion_tokens":2}}\n\ndata: [DONE]\n\n';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(fixture, { status: 200 })));
    const config = {
      get: (key: string, fallback: string) => (key === 'OPENAI_API_KEY' ? 'test' : fallback),
    } as ConfigService;
    const adapter = new OpenAiChatAdapter(config);
    const events = [];
    for await (const event of adapter.stream({ messages: [{ role: 'user', content: 'question' }] }))
      events.push(event);
    expect(events.filter((event) => event.type === 'text-delta')).toHaveLength(2);
    expect(events.some((event) => event.type === 'usage')).toBe(true);
    expect(events.at(-1)).toEqual({ type: 'completed', reason: 'stop' });
  });
});
