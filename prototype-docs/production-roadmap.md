# Production evolution

The proposed design and acceptance gates are authoritative in the [interview solution design](../submission/solution-design.md). This roadmap describes work beyond the local prototype; it does not describe completed controls.

1. Confirm sources, owners, identity/policy semantics, workload, data handling and retention. Build and annotate a representative corpus and agree measurable acceptance criteria.
2. Deliver a bounded pilot with enterprise identity, current source permissions, malware checks, isolated parsing and protected object storage. These are prerequisites for real departmental content.
3. Add Word, selective OCR and layout/table handling, explicit quality gates and an auditable owner-review workflow. Evaluate extraction fidelity before choosing specialist services.
4. Add transactional outbox delivery, idempotent processing and controlled failed-work replay; test outages and duplicate delivery before scaling workers.
5. Implement effective dating, withdrawal and permission refresh independent of re-embedding, plus retention/deletion propagation and backup restore reconciliation.
6. Agree service/recovery targets and review capacity; exercise restoration, alerts, incident response and accessibility against Department requirements.
7. Expand sources and throughput from measured quality, cost and queue age. Add approximate vector indexes, reranking or specialist search only when evidence justifies them under access filters.
8. Require representative-corpus regression and provider/data-handling review before parser, OCR, chat or embedding changes.
