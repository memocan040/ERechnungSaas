import { apiClient } from './client';
import { Quote, QuoteFilters, QuoteStats, ApiResponse } from '@/types';

interface CreateQuoteData {
  customerId: string;
  issueDate: string;
  validUntil: string;
  notes?: string;
  termsConditions?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    taxRate?: number;
  }>;
}

export const quotesApi = {
  async getAll(filters: QuoteFilters = {}) {
    const response = await apiClient.get<Quote[]>('/quotes', filters as Record<string, string | number | boolean | undefined>);
    return {
      ...response,
      pagination: (response as ApiResponse<Quote[]> & { pagination?: { page: number; limit: number; total: number; totalPages: number } }).pagination,
    };
  },

  async getById(id: string) {
    return apiClient.get<Quote>(`/quotes/${id}`);
  },

  async getStats() {
    return apiClient.get<QuoteStats>('/quotes/stats');
  },

  async create(data: CreateQuoteData) {
    return apiClient.post<Quote>('/quotes', data);
  },

  async update(id: string, data: Partial<CreateQuoteData>) {
    return apiClient.put<Quote>(`/quotes/${id}`, data);
  },

  async updateStatus(id: string, status: Quote['status']) {
    return apiClient.patch<Quote>(`/quotes/${id}/status`, { status });
  },

  async convertToInvoice(id: string) {
    return apiClient.post<{ quote: Quote; invoiceId: string }>(`/quotes/${id}/convert`);
  },

  async delete(id: string) {
    return apiClient.delete(`/quotes/${id}`);
  },

  async downloadPdf(id: string, quoteNumber: string) {
    const blob = await apiClient.downloadBlob(`/quotes/${id}/pdf`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quoteNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
