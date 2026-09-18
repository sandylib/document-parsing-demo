import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DocumentIngestionProcessor } from '../queue/document-ingestion.processor.js';
import { DOCUMENT_INGESTION_QUEUE } from '../queue/queue.constants.js';
import { redisConnection } from '../queue/redis-connection.js';
import { SharedApplicationModule } from './shared-application.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    SharedApplicationModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnection(config.get('REDIS_URL', 'redis://localhost:6379')),
      }),
    }),
    BullModule.registerQueue({ name: DOCUMENT_INGESTION_QUEUE }),
  ],
  providers: [DocumentIngestionProcessor],
})
export class WorkerModule {}
