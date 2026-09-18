# ADR 0002: PostgreSQL and pgvector

Status: Accepted for demo

Use PostgreSQL for metadata, versions, jobs, blocks, chunks, full-text search and embeddings. Start with exact cosine search and introduce HNSW only after measurement.

This keeps filtering and provenance close to vectors. It is not a permanent rejection of a specialized search service at larger scale.
