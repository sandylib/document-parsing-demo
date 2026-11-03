import { describe, expect, it, vi } from 'vitest';
import { AnswerQuestionUseCase } from './answer-question.use-case.js';
import type { ChatModel } from '../ports/model.port.js';

const model: ChatModel = {
  profile: 'fake',
  capabilities: { streaming: true, toolCalling: false, structuredOutput: true, contextLimit: 1000 },
  health: async () => true,
  async *stream() {
    yield { type: 'text-delta', text: 'Grounded answer' };
    yield { type: 'completed', reason: 'stop' };
  },
};
describe('AnswerQuestionUseCase', () => {
  it('refuses before model generation when retrieval has no evidence', async () => {
    const stream = vi.spyOn(model, 'stream');
    const useCase = new AnswerQuestionUseCase(
      { execute: vi.fn().mockResolvedValue([]) } as never,
      {} as never,
      model,
      { record: vi.fn() } as never,
    );
    const events = [];
    for await (const event of useCase.execute('unknown', 'public')) events.push(event);
    expect(events.at(-1)).toMatchObject({ type: 'message.completed', refused: true });
    expect(stream).not.toHaveBeenCalled();
  });
  it('streams server citations for retrieved evidence', async () => {
    const evidence = [
      {
        evidenceId: 'e1',
        chunkId: 'e1',
        documentId: 'd',
        versionId: 'v',
        title: 'Policy',
        text: 'Fact',
        sectionPath: ['A'],
        score: 0.1,
      },
    ];
    const useCase = new AnswerQuestionUseCase(
      { execute: vi.fn().mockResolvedValue(evidence) } as never,
      { definitions: [] } as never,
      model,
      { record: vi.fn() } as never,
    );
    const events = [];
    for await (const event of useCase.execute('known', 'public')) events.push(event);
    expect(events.some((event) => event.type === 'citation.available')).toBe(true);
    expect(events.some((event) => event.type === 'text.delta')).toBe(true);
  });
});
