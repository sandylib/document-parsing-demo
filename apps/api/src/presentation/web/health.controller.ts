import { Controller, Get, Inject } from '@nestjs/common';
import type { ChatModel, EmbeddingModel } from '../../application/ports/model.port.js';
import { CHAT_MODEL, EMBEDDING_MODEL } from '../../application/ports/tokens.js';
import { PostgresService } from '../../infrastructure/database/postgres.service.js';
@Controller('health')
export class HealthController {
  constructor(private readonly db:PostgresService,@Inject(CHAT_MODEL)private readonly chat:ChatModel,@Inject(EMBEDDING_MODEL)private readonly embedding:EmbeddingModel){}
  @Get() async health(){let database=false;try{await this.db.query('SELECT 1');database=true}catch{}const [chat,embedding]=await Promise.all([this.chat.health(),this.embedding.health()]);return{status:database?'ok':'degraded',checks:{database,chat,embedding}}}
}
