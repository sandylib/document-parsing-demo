import { Inject, Injectable } from '@nestjs/common';
import type { Visibility } from '../../core/knowledge.types.js';
import type { RetrievalRepository } from '../ports/repositories.port.js';
import { RETRIEVAL_REPOSITORY } from '../ports/tokens.js';
@Injectable()
export class GetSourceUseCase {
  constructor(@Inject(RETRIEVAL_REPOSITORY) private readonly retrieval: RetrievalRepository) {}
  execute(id: string, role: Visibility) { return this.retrieval.getEvidence(id, role); }
}
