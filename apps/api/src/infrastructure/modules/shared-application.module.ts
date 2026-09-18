import { Module } from '@nestjs/common';
import type { ChatModel, EmbeddingModel } from '../../application/ports/model.port.js';
import {
  ANSWER_RUN_REPOSITORY,
  AUTHORIZATION_POLICY,
  CHAT_MODEL,
  DOCUMENT_PARSERS,
  DOCUMENT_REPOSITORY,
  EMBEDDING_MODEL,
  JOB_REPOSITORY,
  OBJECT_STORAGE,
  RETRIEVAL_REPOSITORY,
} from '../../application/ports/tokens.js';
import { ChunkerService } from '../../application/services/chunker.service.js';
import { ToolRegistryService } from '../../application/services/tool-registry.service.js';
import { AnswerQuestionUseCase } from '../../application/use-cases/answer-question.use-case.js';
import { GetSourceUseCase } from '../../application/use-cases/get-source.use-case.js';
import { ListDocumentsUseCase } from '../../application/use-cases/list-documents.use-case.js';
import { ProcessDocumentUseCase } from '../../application/use-cases/process-document.use-case.js';
import { SearchKnowledgeUseCase } from '../../application/use-cases/search-knowledge.use-case.js';
import { DemoAuthorizationPolicy } from '../auth/demo-authorization.policy.js';
import { PostgresService } from '../database/postgres.service.js';
import { OllamaChatAdapter } from '../models/ollama-chat.adapter.js';
import { OllamaEmbeddingAdapter } from '../models/ollama-embedding.adapter.js';
import { OpenAiChatAdapter } from '../models/openai-chat.adapter.js';
import { OpenAiEmbeddingAdapter } from '../models/openai-embedding.adapter.js';
import { PdfDocumentParser } from '../parsers/pdf-document.parser.js';
import { TextDocumentParser } from '../parsers/text-document.parser.js';
import { PostgresKnowledgeRepository } from '../repositories/postgres-knowledge.repository.js';
import { LocalObjectStorageAdapter } from '../storage/local-object-storage.adapter.js';
import { ConfigService } from '@nestjs/config';

const exportedProviders = [
  PostgresService,
  DOCUMENT_REPOSITORY,
  JOB_REPOSITORY,
  RETRIEVAL_REPOSITORY,
  ANSWER_RUN_REPOSITORY,
  OBJECT_STORAGE,
  EMBEDDING_MODEL,
  CHAT_MODEL,
  AUTHORIZATION_POLICY,
  ProcessDocumentUseCase,
  ListDocumentsUseCase,
  SearchKnowledgeUseCase,
  GetSourceUseCase,
  AnswerQuestionUseCase,
];

@Module({
  providers: [
    PostgresService,
    PostgresKnowledgeRepository,
    LocalObjectStorageAdapter,
    PdfDocumentParser,
    TextDocumentParser,
    OllamaChatAdapter,
    OllamaEmbeddingAdapter,
    OpenAiChatAdapter,
    OpenAiEmbeddingAdapter,
    DemoAuthorizationPolicy,
    ChunkerService,
    ToolRegistryService,
    ProcessDocumentUseCase,
    ListDocumentsUseCase,
    SearchKnowledgeUseCase,
    GetSourceUseCase,
    AnswerQuestionUseCase,
    { provide: DOCUMENT_REPOSITORY, useExisting: PostgresKnowledgeRepository },
    { provide: JOB_REPOSITORY, useExisting: PostgresKnowledgeRepository },
    { provide: RETRIEVAL_REPOSITORY, useExisting: PostgresKnowledgeRepository },
    { provide: ANSWER_RUN_REPOSITORY, useExisting: PostgresKnowledgeRepository },
    { provide: OBJECT_STORAGE, useExisting: LocalObjectStorageAdapter },
    {
      provide: EMBEDDING_MODEL,
      useFactory: (
        config: ConfigService,
        ollama: OllamaEmbeddingAdapter,
        openai: OpenAiEmbeddingAdapter,
      ): EmbeddingModel =>
        config.get('EMBEDDING_PROVIDER', 'ollama') === 'openai' ? openai : ollama,
      inject: [ConfigService, OllamaEmbeddingAdapter, OpenAiEmbeddingAdapter],
    },
    {
      provide: CHAT_MODEL,
      useFactory: (
        config: ConfigService,
        ollama: OllamaChatAdapter,
        openai: OpenAiChatAdapter,
      ): ChatModel => (config.get('CHAT_PROVIDER', 'ollama') === 'openai' ? openai : ollama),
      inject: [ConfigService, OllamaChatAdapter, OpenAiChatAdapter],
    },
    { provide: AUTHORIZATION_POLICY, useExisting: DemoAuthorizationPolicy },
    {
      provide: DOCUMENT_PARSERS,
      useFactory: (pdf: PdfDocumentParser, text: TextDocumentParser) => [pdf, text],
      inject: [PdfDocumentParser, TextDocumentParser],
    },
  ],
  exports: exportedProviders,
})
export class SharedApplicationModule {}
