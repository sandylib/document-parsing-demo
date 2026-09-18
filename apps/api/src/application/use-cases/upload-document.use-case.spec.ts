import { describe, expect, it, vi } from 'vitest';
import { UploadDocumentUseCase } from './upload-document.use-case.js';

const file = {
  originalname: 'policy.md',
  mimetype: 'text/markdown',
  size: 12,
  buffer: Buffer.from('# Policy'),
} as Express.Multer.File;

describe('UploadDocumentUseCase', () => {
  it('creates one status record and enqueues its identifiers', async () => {
    const documents = {
      registerUpload: vi.fn().mockResolvedValue({
        documentId: 'document-id',
        versionId: 'version-id',
        jobId: 'job-id',
        duplicate: false,
      }),
    };
    const jobs = { markEnqueueFailed: vi.fn() };
    const queue = { enqueue: vi.fn() };
    const storage = { put: vi.fn(), delete: vi.fn() };
    const useCase = new UploadDocumentUseCase(
      documents as never,
      jobs as never,
      queue as never,
      storage as never,
    );

    await useCase.execute({ file, visibility: 'public' });

    expect(documents.registerUpload).toHaveBeenCalledOnce();
    expect(queue.enqueue).toHaveBeenCalledWith({ jobId: 'job-id', versionId: 'version-id' });
  });

  it('does not enqueue duplicate work', async () => {
    const documents = {
      registerUpload: vi.fn().mockResolvedValue({
        documentId: 'document-id',
        versionId: 'version-id',
        jobId: 'job-id',
        duplicate: true,
      }),
    };
    const queue = { enqueue: vi.fn() };
    const storage = { put: vi.fn(), delete: vi.fn() };
    const useCase = new UploadDocumentUseCase(
      documents as never,
      { markEnqueueFailed: vi.fn() } as never,
      queue as never,
      storage as never,
    );

    await useCase.execute({ file, visibility: 'public' });

    expect(queue.enqueue).not.toHaveBeenCalled();
    expect(storage.delete).toHaveBeenCalledOnce();
  });
});
