import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { Visibility } from '../../core/knowledge.types.js';
import { PIPELINE_REVISION } from '../../core/knowledge.types.js';
import type {
  DocumentRepository,
  JobRepository,
  UploadReceipt,
} from '../ports/repositories.port.js';
import type { JobQueue } from '../ports/job-queue.port.js';
import type { ObjectStorage } from '../ports/object-storage.port.js';
import { DOCUMENT_REPOSITORY, JOB_QUEUE, JOB_REPOSITORY, OBJECT_STORAGE } from '../ports/tokens.js';

@Injectable()
export class UploadDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository,
    @Inject(JOB_REPOSITORY) private readonly jobs: JobRepository,
    @Inject(JOB_QUEUE) private readonly queue: JobQueue,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}
  async execute(input: {
    documentId?: string;
    title?: string;
    visibility: Visibility;
    file: Express.Multer.File;
  }) {
    if (!input.file || input.file.size === 0)
      throw new BadRequestException('A non-empty file is required');
    if (input.file.size > 10 * 1024 * 1024)
      throw new BadRequestException('File exceeds the 10 MB demo limit');
    const allowed = new Set(['application/pdf', 'text/plain', 'text/markdown']);
    if (!allowed.has(input.file.mimetype))
      throw new BadRequestException('Supported formats are PDF, Markdown and TXT');
    const checksum = createHash('sha256').update(input.file.buffer).digest('hex');
    const storageKey = `${randomUUID()}${extname(input.file.originalname).toLowerCase()}`;
    await this.storage.put(storageKey, input.file.buffer);
    let receipt: UploadReceipt;
    try {
      receipt = await this.documents.registerUpload({
        documentId: input.documentId,
        title: input.title?.trim() || input.file.originalname.replace(/\.[^.]+$/, ''),
        visibility: input.visibility,
        checksum,
        mimeType: input.file.mimetype,
        originalName: input.file.originalname,
        storageKey,
        pipelineRevision: PIPELINE_REVISION,
      });
    } catch (error) {
      await this.storage.delete(storageKey);
      throw error;
    }
    if (receipt.duplicate) {
      await this.storage.delete(storageKey);
      return receipt;
    }
    try {
      await this.queue.enqueue({ jobId: receipt.jobId, versionId: receipt.versionId });
      return receipt;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to enqueue document';
      await this.jobs.markEnqueueFailed(receipt.jobId, message);
      throw error;
    }
  }
}
