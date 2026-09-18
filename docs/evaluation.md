# Evaluation report

## Fixture set
The checked-in set contains a current public policy, its conflicting superseded version, a staff-only notice and three labelled questions. Parsing adapters also have unit fixtures for Markdown heading/list preservation.

## Results
- Ingestion: duplicate upload is idempotent; a second version atomically superseded version one; worker retries are bounded.
- Parsing: Markdown headings and lists preserve section paths; the supplied two-page exercise PDF completed through PDF.js with page provenance; seeded text files produced canonical blocks without warnings.
- Retrieval: 3/3 labelled checks passed. The current five-day answer was found; the superseded ten-day text was excluded.
- Authorization: public payroll retrieval returned zero results; staff retrieval returned the restricted notice.
- Answering: Qwen returned “five school days” with one server-issued citation. Public payroll chat refused before invoking Qwen and emitted no citation.
- MCP: an authenticated client discovered both read-only tools and invoked `search_knowledge`; an unauthenticated call returned 401.

These results demonstrate the architecture, not production-quality model evaluation. A production programme needs a larger representative corpus, document-owner review and separately calibrated thresholds.
