import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { JobQueue } from '../../application/ports/job-queue.port.js';
import { JOB_QUEUE } from '../../application/ports/tokens.js';

@Controller('documents')
export class IngestionEventsController {
  constructor(@Inject(JOB_QUEUE) private readonly queue: JobQueue) {}

  @Get('events')
  events(@Res() response: Response): void {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();

    const unsubscribe = this.queue.subscribe((event) => {
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 15_000);
    response.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  }
}
