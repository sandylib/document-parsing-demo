import { Body, Controller, Headers, Inject, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthorizationPolicy } from '../../application/ports/authorization.port.js';
import { AUTHORIZATION_POLICY } from '../../application/ports/tokens.js';
import { AnswerQuestionUseCase } from '../../application/use-cases/answer-question.use-case.js';
import { ChatDto } from './dto.js';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly answer: AnswerQuestionUseCase,
    @Inject(AUTHORIZATION_POLICY) private readonly auth: AuthorizationPolicy,
  ) {}
  @Post() async chat(
    @Body() body: ChatDto,
    @Headers('x-demo-role') role: string | undefined,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const controller = new AbortController();
    res.on('close', () => controller.abort());
    for await (const event of this.answer.execute(
      body.question,
      this.auth.roleFrom(role),
      controller.signal,
    )) {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    }
    res.end();
  }
}
