import { AskKnowledgeBase } from '@/features/ask-knowledge-base';
import { DocumentLibrary } from '@/features/document-library';
import { DocumentUpload } from '@/features/document-upload';

export default function Home() {
  return (
    <main>
      <header className="hero">
        <div className="heroCopy">
          <span className="eyebrow">Department knowledge · local architecture demo</span>
          <h1>Evidence before answers.</h1>
          <p>
            Documents become structured, versioned knowledge. Every answer is grounded in
            authorised, current evidence with server-verified citations.
          </p>
        </div>
        <div className="architecture">
          <span>NEXT.JS</span>
          <i>REST / SSE</i>
          <span>NESTJS</span>
          <i>PORTS</i>
          <span>POSTGRES + OLLAMA</span>
        </div>
      </header>
      <div className="grid">
        <DocumentUpload />
        <DocumentLibrary />
        <AskKnowledgeBase />
      </div>
      <footer>
        <span>Deterministic parsing</span>
        <span>Policy-controlled retrieval</span>
        <span>Read-only MCP</span>
      </footer>
    </main>
  );
}
