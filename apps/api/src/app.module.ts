import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { ChatModel, EmbeddingModel } from './application/ports/model.port.js';
import { AnswerQuestionUseCase } from './application/use-cases/answer-question.use-case.js';
import { GetSourceUseCase } from './application/use-cases/get-source.use-case.js';
import { ListDocumentsUseCase } from './application/use-cases/list-documents.use-case.js';
import { ProcessNextJobUseCase } from './application/use-cases/process-next-job.use-case.js';
import { SearchKnowledgeUseCase } from './application/use-cases/search-knowledge.use-case.js';
import { UploadDocumentUseCase } from './application/use-cases/upload-document.use-case.js';
import { ChunkerService } from './application/services/chunker.service.js';
import { ToolRegistryService } from './application/services/tool-registry.service.js';
import { ANSWER_RUN_REPOSITORY, AUTHORIZATION_POLICY, CHAT_MODEL, DOCUMENT_PARSERS, DOCUMENT_REPOSITORY, EMBEDDING_MODEL, JOB_REPOSITORY, OBJECT_STORAGE, RETRIEVAL_REPOSITORY } from './application/ports/tokens.js';
import { DemoAuthorizationPolicy } from './infrastructure/auth/demo-authorization.policy.js';
import { PostgresService } from './infrastructure/database/postgres.service.js';
import { OllamaChatAdapter } from './infrastructure/models/ollama-chat.adapter.js';
import { OllamaEmbeddingAdapter } from './infrastructure/models/ollama-embedding.adapter.js';
import { OpenAiChatAdapter } from './infrastructure/models/openai-chat.adapter.js';
import { OpenAiEmbeddingAdapter } from './infrastructure/models/openai-embedding.adapter.js';
import { PdfDocumentParser } from './infrastructure/parsers/pdf-document.parser.js';
import { TextDocumentParser } from './infrastructure/parsers/text-document.parser.js';
import { PostgresKnowledgeRepository } from './infrastructure/repositories/postgres-knowledge.repository.js';
import { LocalObjectStorageAdapter } from './infrastructure/storage/local-object-storage.adapter.js';
import { ChatController } from './presentation/web/chat.controller.js';
import { DocumentsController } from './presentation/web/documents.controller.js';
import { HealthController } from './presentation/web/health.controller.js';
import { McpController } from './presentation/mcp/mcp.controller.js';
@Module({
  imports:[ConfigModule.forRoot({isGlobal:true,envFilePath:['../../.env','.env']})],
  controllers:[HealthController,DocumentsController,ChatController,McpController],
  providers:[PostgresService,PostgresKnowledgeRepository,LocalObjectStorageAdapter,PdfDocumentParser,TextDocumentParser,OllamaChatAdapter,OllamaEmbeddingAdapter,OpenAiChatAdapter,OpenAiEmbeddingAdapter,DemoAuthorizationPolicy,ChunkerService,ToolRegistryService,UploadDocumentUseCase,ListDocumentsUseCase,ProcessNextJobUseCase,SearchKnowledgeUseCase,GetSourceUseCase,AnswerQuestionUseCase,
    {provide:DOCUMENT_REPOSITORY,useExisting:PostgresKnowledgeRepository},{provide:JOB_REPOSITORY,useExisting:PostgresKnowledgeRepository},{provide:RETRIEVAL_REPOSITORY,useExisting:PostgresKnowledgeRepository},{provide:ANSWER_RUN_REPOSITORY,useExisting:PostgresKnowledgeRepository},{provide:OBJECT_STORAGE,useExisting:LocalObjectStorageAdapter},
    {provide:EMBEDDING_MODEL,useFactory:(config:ConfigService,ollama:OllamaEmbeddingAdapter,openai:OpenAiEmbeddingAdapter):EmbeddingModel=>config.get('EMBEDDING_PROVIDER','ollama')==='openai'?openai:ollama,inject:[ConfigService,OllamaEmbeddingAdapter,OpenAiEmbeddingAdapter]},
    {provide:CHAT_MODEL,useFactory:(config:ConfigService,ollama:OllamaChatAdapter,openai:OpenAiChatAdapter):ChatModel=>config.get('CHAT_PROVIDER','ollama')==='openai'?openai:ollama,inject:[ConfigService,OllamaChatAdapter,OpenAiChatAdapter]},
    {provide:AUTHORIZATION_POLICY,useExisting:DemoAuthorizationPolicy},{provide:DOCUMENT_PARSERS,useFactory:(pdf:PdfDocumentParser,text:TextDocumentParser)=>[pdf,text],inject:[PdfDocumentParser,TextDocumentParser]}],
})
export class AppModule {}
