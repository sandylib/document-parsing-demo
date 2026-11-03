'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { API_URL } from '@/core/config';
import { documentsApi } from '../api/documents.api';

export function useDocuments() {
  return useQuery({ queryKey: ['documents'], queryFn: documentsApi.list });
}
export function useUploadDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      title,
      visibility,
      documentId,
    }: {
      file: File;
      title: string;
      visibility: 'public' | 'staff';
      documentId?: string;
    }) => documentsApi.upload(file, title, visibility, documentId),
    onSuccess: () => client.invalidateQueries({ queryKey: ['documents'] }),
  });
}
export function useIngestionEvents() {
  const client = useQueryClient();
  useEffect(() => {
    const events = new EventSource(`${API_URL}/documents/events`);
    events.onmessage = () => {
      void client.invalidateQueries({ queryKey: ['documents'] });
    };
    return () => events.close();
  }, [client]);
}
