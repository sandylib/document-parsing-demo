import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { DocumentIngestionJob } from '../../application/ports/job-queue.port.js';
import type { JobRepository } from '../../application/ports/repositories.port.js';
import { JOB_REPOSITORY } from '../../application/ports/tokens.js';
import { ProcessDocumentUseCase } from '../../application/use-cases/process-document.use-case.js';
import { DOCUMENT_INGESTION_QUEUE, PROCESS_DOCUMENT_JOB } from './queue.constants.js';

@Injectable()
@Processor(DOCUMENT_INGESTION_QUEUE, { concurrency: 1, maxStalledCount: 1 })
export class DocumentIngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentIngestionProcessor.name);

  constructor(
    private readonly processDocument: ProcessDocumentUseCase,
    @Inject(JOB_REPOSITORY) private readonly jobs: JobRepository,
  ) {
    super();
  }

  async process(job: Job<DocumentIngestionJob>): Promise<void> {
    if (job.name !== PROCESS_DOCUMENT_JOB || job.id !== job.data.jobId || !job.data.versionId) {
      throw new Error('Invalid document-ingestion job');
    }

    const attempt = job.attemptsMade + 1;
    await this.jobs.markProcessing(job.data.jobId, attempt);
    try {
      await this.processDocument.execute({
        jobId: job.data.jobId,
        versionId: job.data.versionId,
        reportProgress: async (progress) => {
          await Promise.all([
            job.updateProgress(progress),
            this.jobs.updateProgress(job.data.jobId, progress),
          ]);
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Document processing failed';
      const attempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 1;
      const terminal = attempt >= attempts;
      await this.jobs.recordAttemptFailure(job.data.jobId, attempt, message, terminal);
      this.logger.error(
        JSON.stringify({
          event: 'ingestion.attempt-failed',
          jobId: job.data.jobId,
          versionId: job.data.versionId,
          attempt,
          terminal,
          message,
        }),
      );
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  async recordTerminalWorkerFailure(
    job: Job<DocumentIngestionJob> | undefined,
    error: Error,
  ): Promise<void> {
    if (!job?.data?.jobId) return;
    const attempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 1;
    const exhaustedAttempts = job.attemptsMade >= attempts;
    const exhaustedStalls = error.message.includes('stalled more than allowable limit');
    if (!exhaustedAttempts && !exhaustedStalls) return;
    await this.jobs.recordAttemptFailure(
      job.data.jobId,
      Math.max(1, job.attemptsMade),
      error.message,
      true,
    );
  }
}
