import type { Job } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentIngestionJob } from '../../application/ports/job-queue.port.js';
import { DocumentIngestionProcessor } from './document-ingestion.processor.js';

function job(overrides: Partial<Job<DocumentIngestionJob>> = {}): Job<DocumentIngestionJob> {
  return {
    id: 'job-id',
    name: 'process-document',
    data: { jobId: 'job-id', versionId: 'version-id' },
    attemptsMade: 0,
    opts: { attempts: 3 },
    updateProgress: vi.fn(),
    ...overrides,
  } as unknown as Job<DocumentIngestionJob>;
}

describe('DocumentIngestionProcessor', () => {
  it('delegates identifiers and progress to the application use case', async () => {
    const processDocument = { execute: vi.fn().mockResolvedValue(undefined) };
    const jobs = {
      markProcessing: vi.fn(),
      updateProgress: vi.fn(),
      recordAttemptFailure: vi.fn(),
    };
    const processor = new DocumentIngestionProcessor(processDocument as never, jobs as never);
    const queuedJob = job();

    await processor.process(queuedJob);

    expect(jobs.markProcessing).toHaveBeenCalledWith('job-id', 1);
    expect(processDocument.execute).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-id', versionId: 'version-id' }),
    );
  });

  it('records the attempt and rethrows so BullMQ retries', async () => {
    const failure = new Error('embedding unavailable');
    const processDocument = { execute: vi.fn().mockRejectedValue(failure) };
    const jobs = {
      markProcessing: vi.fn(),
      updateProgress: vi.fn(),
      recordAttemptFailure: vi.fn(),
    };
    const processor = new DocumentIngestionProcessor(processDocument as never, jobs as never);

    await expect(processor.process(job())).rejects.toThrow('embedding unavailable');
    expect(jobs.recordAttemptFailure).toHaveBeenCalledWith(
      'job-id',
      1,
      'embedding unavailable',
      false,
    );
  });

  it('marks PostgreSQL failed when the final BullMQ attempt fails', async () => {
    const failure = new Error('parser failed');
    const processDocument = { execute: vi.fn().mockRejectedValue(failure) };
    const jobs = {
      markProcessing: vi.fn(),
      updateProgress: vi.fn(),
      recordAttemptFailure: vi.fn(),
    };
    const processor = new DocumentIngestionProcessor(processDocument as never, jobs as never);

    await expect(processor.process(job({ attemptsMade: 2 }))).rejects.toThrow('parser failed');
    expect(jobs.recordAttemptFailure).toHaveBeenCalledWith(
      'job-id',
      3,
      'parser failed',
      true,
    );
  });
});
