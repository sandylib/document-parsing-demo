# ADR 0003: Provider-neutral AI contracts

Status: Accepted

Application-owned `ChatModel` and `EmbeddingModel` ports isolate provider request/response types. Ollama is the live demo adapter. OpenAI fixture conformance demonstrates a second shape; live OpenAI testing is optional.

OpenAI-compatible HTTP is an adapter implementation detail. Embedding profile changes trigger re-indexing.
