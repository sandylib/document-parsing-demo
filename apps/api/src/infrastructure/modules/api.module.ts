import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadDocumentUseCase } from '../../application/use-cases/upload-document.use-case.js';
import { McpController } from '../../presentation/mcp/mcp.controller.js';
import { ChatController } from '../../presentation/web/chat.controller.js';
import { DocumentsController } from '../../presentation/web/documents.controller.js';
import { HealthController } from '../../presentation/web/health.controller.js';
import { IngestionEventsController } from '../../presentation/web/ingestion-events.controller.js';
import { BullMqProducerModule } from './bullmq-producer.module.js';
import { SharedApplicationModule } from './shared-application.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    SharedApplicationModule,
    BullMqProducerModule,
  ],
  controllers: [
    HealthController,
    DocumentsController,
    IngestionEventsController,
    ChatController,
    McpController,
  ],
  providers: [UploadDocumentUseCase],
})
export class ApiModule {}
