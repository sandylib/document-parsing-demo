import { Injectable } from '@nestjs/common';
import type { Visibility } from '../../core/knowledge.types.js';
import { GetSourceUseCase } from '../use-cases/get-source.use-case.js';
import { SearchKnowledgeUseCase } from '../use-cases/search-knowledge.use-case.js';

@Injectable()
export class ToolRegistryService {
  constructor(
    private readonly search: SearchKnowledgeUseCase,
    private readonly source: GetSourceUseCase,
  ) {}
  readonly definitions = [
    {
      name: 'search_knowledge',
      description: 'Search authorized current knowledge',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
    {
      name: 'get_source',
      description: 'Fetch an authorized source by evidence ID',
      inputSchema: {
        type: 'object',
        properties: { evidenceId: { type: 'string' } },
        required: ['evidenceId'],
      },
    },
  ];
  async execute(name: string, args: Record<string, unknown>, role: Visibility) {
    if (name === 'search_knowledge' && typeof args.query === 'string')
      return this.search.execute(args.query, role, 3);
    if (name === 'get_source' && typeof args.evidenceId === 'string')
      return this.source.execute(args.evidenceId, role);
    throw new Error('Unknown or invalid tool call');
  }
}
