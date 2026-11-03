import { request } from '@/core/client/http';
import type { DocumentSummary, UploadReceipt } from '../types/documents.types';

export const documentsApi = {
  list: () => request<DocumentSummary[]>('/documents'),
  upload: (file: File, title: string, visibility: 'public' | 'staff', documentId?: string) => {
    const body = new FormData();
    body.append('file', file);
    body.append('title', title);
    body.append('visibility', visibility);
    if (documentId) body.append('documentId', documentId);
    return request<UploadReceipt>('/documents', { method: 'POST', body });
  },
};
