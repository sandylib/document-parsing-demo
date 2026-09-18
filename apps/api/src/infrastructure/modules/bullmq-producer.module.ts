import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JOB_QUEUE } from '../../application/ports/tokens.js';
import { BullMqJobQueueAdapter } from '../queue/bullmq-job-queue.adapter.js';
import { DOCUMENT_INGESTION_QUEUE } from '../queue/queue.constants.js';
import { redisConnection } from '../queue/redis-connection.js';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnection(config.get('REDIS_URL', 'redis://localhost:6379')),
      }),
    }),
    BullModule.registerQueue({ name: DOCUMENT_INGESTION_QUEUE }),
  ],
  providers: [
    BullMqJobQueueAdapter,
    { provide: JOB_QUEUE, useExisting: BullMqJobQueueAdapter },
  ],
  exports: [JOB_QUEUE],
})
export class BullMqProducerModule {}
