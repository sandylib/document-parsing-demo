import { Inject, Injectable } from '@nestjs/common';
import type { DocumentRepository } from '../ports/repositories.port.js';
import { DOCUMENT_REPOSITORY } from '../ports/tokens.js';

@Injectable()
export class ListDocumentsUseCase {
  constructor(@Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository) {}

  execute() {
    return this.documents.list();
  }
}
