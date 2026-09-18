import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './infrastructure/modules/worker.module.js';

const app = await NestFactory.createApplicationContext(WorkerModule, {
  logger: ['log', 'error', 'warn'],
});

const shutdown = async () => {
  await app.close();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
