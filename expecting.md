The scenario
The Department is developing an AI-powered knowledge base to help students, teachers and corporate staff access information such as processes, policies, guidelines, notices and other departmental documentation.

The document parsing capability needs to take documents from different sources and transform them into a form that is AI-ready.

Areas I would recommend considering
When preparing your solution, think about:

Requirements and assumptions – What types of documents and sources are involved? What does “AI-ready” actually mean?

End-to-end architecture – For example, ingestion → validation → parsing/OCR → structure extraction → normalisation/enrichment → validation → AI-ready output → storage/indexing.

Different document types – PDFs, Word documents, scanned documents, tables, images, multi-column layouts and poorly formatted documents.

Document structure and context – How will you preserve headings, sections, tables, lists and relationships rather than simply extracting flat text?

AI/RAG considerations – Metadata, semantic/structure-aware chunking, embeddings/vectorisation where appropriate, source traceability and citations.

Quality and validation – How will you identify parsing errors, low-confidence results and information loss? Consider automated validation, confidence scoring, retries and human review where appropriate.

Security – Authentication, authorisation, document-level permissions, sensitive information, auditability and ensuring users cannot retrieve information they are not authorised to access.

Document versions – How will the system distinguish current documents from superseded policies or guidelines?

Scalability and operations – Processing failures, retries, monitoring, logging, throughput, performance and cost.

Testing – How would you create a representative document set and measure the quality and accuracy of the parsing capability?

Engineering trade-offs – Explain why you would choose particular technologies or approaches and what alternatives you considered.

One important point
I wouldn't focus too heavily on trying to select the “perfect” technology stack.

For example, rather than simply saying “I would use [technology] for document parsing”, explain why you would use it, what problem it solves, what its limitations are and how you would validate that it works against the Department's documents.

The panel will be looking for senior engineering judgement — architecture, data quality, security, failure handling, scalability, testing and trade-offs — as well as your understanding of the AI/RAG implications.

Suggested structure
You could structure the submission along these lines:

Executive Summary

Assumptions & Requirements

Proposed Architecture

Document Processing Flow

AI-Ready Representation

Quality & Validation

Security Considerations

Scalability & Operations

Key Technical Decisions & Trade-offs

Risks & Future Considerations

A clear architecture diagram would also be useful if it helps explain your thinking.

Use of AI
The Department has specifically confirmed that AI tools can be used as part of the exercise.

If you use AI, just include a short declaration covering:

Which AI tools you used

How you used them

How you reviewed and validated the output

I'd recommend being transparent about this and demonstrating that AI assisted your workflow but that the architecture, engineering decisions and validation remain your own.

Final tip
Don't feel that you need to make the solution overly complicated or use as much AI terminology as possible.

The strongest approach is to demonstrate that you can take an open-ended problem, identify the important engineering considerations, make sensible decisions, explain the trade-offs and design something that could realistically operate in a production environment.

Good luck with the preparation, and feel free to reach out if you want to talk through the exercise before the interview.