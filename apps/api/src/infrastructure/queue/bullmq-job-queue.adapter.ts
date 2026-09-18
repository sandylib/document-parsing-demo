import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'node:events';
import { Queue, QueueEvents } from 'bullmq';
import type {
  DocumentIngestionJob,
  IngestionQueueEvent,
  IngestionQueueListener,
  JobQueue,
} from '../../application/ports/job-queue.port.js';
import { DOCUMENT_INGESTION_QUEUE, PROCESS_DOCUMENT_JOB } from './queue.constants.js';
import { redisConnection } from './redis-connection.js';

@Injectable()
export class BullMqJobQueueAdapter implements JobQueue, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BullMqJobQueueAdapter.name);
  private readonly emitter = new EventEmitter();
  private readonly queueEvents: QueueEvents;

  constructor(
    @InjectQueue(DOCUMENT_INGESTION_QUEUE) private readonly queue: Queue<DocumentIngestionJob>,
    config: ConfigService,
  ) {
    this.queueEvents = new QueueEvents(DOCUMENT_INGESTION_QUEUE, {
      connection: redisConnection(config.get('REDIS_URL', 'redis://localhost:6379')),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.queueEvents.waitUntilReady();
    this.queueEvents.on('waiting', ({ jobId }) => this.emit({ jobId, status: 'queued' }));
    this.queueEvents.on('active', ({ jobId }) => this.emit({ jobId, status: 'processing' }));
    this.queueEvents.on('progress', ({ jobId, data }) =>
      this.emit({
        jobId,
        status: 'processing',
        progress: typeof data === 'number' ? data : undefined,
      }),
    );
    this.queueEvents.on('completed', ({ jobId }) =>
      this.emit({ jobId, status: 'completed', progress: 100 }),
    );
    this.queueEvents.on('failed', ({ jobId, failedReason }) =>
      this.emit({ jobId, status: 'failed', error: failedReason }),
    );
    this.queueEvents.on('stalled', ({ jobId }) => this.emit({ jobId, status: 'stalled' }));
  }

  async enqueue(job: DocumentIngestionJob): Promise<void> {
    await this.queue.add(PROCESS_DOCUMENT_JOB, job, {
      jobId: job.jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: { age: 3_600, count: 100 },
      removeOnFail: { age: 86_400, count: 100 },
    });
  }

  subscribe(listener: IngestionQueueListener): () => void {
    this.emitter.on('ingestion', listener);
    return () => this.emitter.off('ingestion', listener);
  }

  async health(): Promise<boolean> {
    try {
      await this.queue.getJobCounts('waiting', 'active', 'delayed', 'failed');
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.emitter.removeAllListeners();
    await this.queueEvents.close();
  }

  private emit(event: IngestionQueueEvent): void {
    this.logger.debug(JSON.stringify({ event: 'ingestion.queue-event', ...event }));
    this.emitter.emit('ingestion', event);
  }
}
