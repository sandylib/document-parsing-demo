# Evaluation report

## Fixture set
The checked-in set contains a current public policy, its conflicting superseded version, a staff-only notice and three labelled questions. Parsing adapters also have unit fixtures for Markdown heading/list preservation.

## Previously recorded demo observations

These observations were recorded before the solution-design revision and were not rerun for it. They are not current production benchmarks. The automated script checks three search responses for expected substrings or an empty result; it does not measure Recall@k, answer faithfulness or citation correctness. Answering observations below are manual.
- Ingestion: duplicate upload returned the same PostgreSQL/BullMQ job identity without adding work; a second version atomically superseded version one.
- Queue migration: unit tests verify producer identifiers and processor error rethrow. A local API → BullMQ/Redis → worker → PostgreSQL run reached `ready`; SSE observed `processing` progress at 10, 25, 50, 85 and 100 before `completed`. BullMQ is configured for three attempts and worker concurrency one.
- Parsing: Markdown headings and lists preserve section paths; an earlier manual run reported a supplied two-page exercise PDF completing through PDF.js with page provenance (that PDF is not checked in, so this observation is not reproducible from the fixture set); seeded text files produced canonical blocks without warnings.
- Retrieval: 3/3 labelled checks passed. The current five-day answer was found; the superseded ten-day text was excluded.
- Authorization: public payroll retrieval returned zero results; staff retrieval returned the restricted notice.
- Answering: Qwen returned “five school days” with one server-issued citation. Public payroll chat refused before invoking Qwen and emitted no citation.
- MCP: an authenticated client discovered both read-only tools and invoked `search_knowledge`; an unauthenticated call returned 401.

These results demonstrate the architecture, not production-quality model evaluation. A production programme needs a larger representative corpus, document-owner review and separately calibrated thresholds.
