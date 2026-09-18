# Production evolution

The demo deliberately proves boundaries before infrastructure breadth.

1. Validate the canonical schema and quality thresholds against a representative departmental corpus and document owners.
2. Add source connectors, malware scanning, object storage and source ACL synchronization.
3. Isolate parser workers and add DOCX, OCR, layout/table and multilingual adapters selected from measured quality.
4. Scale BullMQ worker concurrency and Redis availability from measured throughput; reassess queue technology only if operational evidence justifies it.
5. Integrate enterprise identity, document-level policy, retention/legal hold and security monitoring.
6. Add dashboards, alerts, dead-letter operations, backups and disaster recovery.
7. Introduce HNSW, reranking or a specialized search service only from recall/latency evidence under authorization filters.
8. Run provider conformance and prompt/retrieval evaluation before any chat or embedding model change.
